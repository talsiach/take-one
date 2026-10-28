// Adapted from anidoodle (github.com/alexgreensh/anidoodle), Apache License 2.0, Copyright 2026 Alex Greenshpun
//
// RENDER QUALITY GATE for take-one films (film.html exposing window.renderFrame(t), a pure
// function of time t in seconds, seeded randomness only). Run it BEFORE showing the user anything.
//
//   node gate.mjs <film.html> [--duration S] [--samples 12] [--mp4 out.mp4] [--holds "1.5-3,10-12"] [--cuts "4.5,9"] [--footage "13-18.5@30"]
//   node gate.mjs --self-test
//
//   1 DETERMINISM  ~12 sampled frames (0, last, evenly spread) drawn forward on one COLD page,
//                  then in REVERSE on a warmed page. md5 of the pixels must match; PSNR > 45 dB
//                  is accepted as a fallback (GPU anti-aliasing wobbles a little). On failure it
//                  runs the poisoning diagnosis: the bad frame is redrawn cold, then after each
//                  other sample frame in a fresh page, and the frame that changes it is NAMED
//                  ("ORDER-DEPENDENT: drawing frame X first changes frame Y" = a stale cache or
//                  state one frame leaves behind for the next).
//   2 CONTRACT     a static scan of film.html plus every local <script src> it loads, comments
//                  stripped: Math.random, Date.now, new Date, performance.now, canvas .filter
//                  effects, localStorage, and any seed derived from a clock all FAIL. Exemptions,
//                  because they are part of this skill's own contract: a clock on the same line as
//                  requestAnimationFrame or navigator.webdriver (the browser preview loop; timing
//                  belongs to hosts), and `.filter = 'none'` (the per-frame reset from pipeline.md).
//                  fetch()/new Image/OffscreenCanvas are WARNED with their lines: legal for asset
//                  setup that finishes before READY, never in the draw path.
//   3 DEAD AIR     only with --mp4 (the gate only READS the file): frames decoded small (270 px)
//                  and grey; a pixel counts as changed above 4/255. Identical consecutive frames
//                  FAIL, and so does any half-second window whose max changed area is under 0.5%,
//                  unless inside declared holds (--holds in seconds, or window.HOLDS = [[a,b],...]).
//   4 POPS         only with --mp4: the mean frame difference of every frame against the median of its
//                  6 neighbours (3 each side). A frame that jumps more than 3x its neighbours (and more
//                  than 2/255 on average) is a pop: a hard cut, a one-frame flash, a flood that reads as a
//                  flash, an element that appears with no ease. Each is LISTED with its time. Intentional
//                  cuts are declared (--cuts "4.5,9" in seconds, or window.CUTS = [4.5, 9]) and pass;
//                  every undeclared spike FAILS, so it gets explained or fixed.
//                  Footage that plays inside the film at a lower frame rate than the film (a 30 fps clip in a
//                  60 fps film) holds each of its frames for two or more of ours, so every new footage frame
//                  would read as a pop. Declare it: window.FOOTAGE = [[from, to, fps], ...] (seconds, the clip's
//                  own frame rate) or --footage "13-18.5@30". Inside those ranges the change is measured once per
//                  footage frame; cuts inside the footage are still found and still need declaring.
//
// Duration: --duration, else window.FILM_DURATION, else window.DURATION, else 30 s with a note.
// Dependencies: ffmpeg + ffprobe on PATH. playwright-core is resolved from, in order:
//   $PLAYWRIGHT_NODE_MODULES (a node_modules dir), a node_modules symlink beside this script
//   (scripts/node_modules -> any project's node_modules that has playwright-core),
//   ./node_modules of the cwd (the film project's own install), then normal resolution.
// Env: W/H viewport (default 1920x1080; H > W adds ?portrait=1), GATE_TMP for scratch files.
// Exit: 0 pass, 1 fail, 2 could not run.
import { createHash } from 'node:crypto';
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const SELF = fileURLToPath(import.meta.url);
const VAL = new Set(['duration', 'samples', 'mp4', 'holds', 'cuts', 'footage']);
const pos = [], opt = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) opt[a.slice(2)] = VAL.has(a.slice(2)) ? process.argv[++i] : true; else pos.push(a); }
const W = Number(process.env.W || 1920), H = Number(process.env.H || 1080);
const SAMPLES = Math.max(4, Number(opt.samples ?? 12));
const TMP = path.join(process.env.GATE_TMP || os.tmpdir(), `gate-${process.pid}`);
// Metal is the Mac's graphics engine: ask for it on a Mac only, every other system keeps Chrome's own choice
const GPU = process.platform === 'darwin' ? ['--use-angle=metal', '--ignore-gpu-blocklist'] : ['--ignore-gpu-blocklist'];

let fails = 0, checks = 0;
const say = (ok, label, detail = '') => { checks++; if (!ok) fails++; console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '   ' + detail : ''}`); };
const note = (label, detail = '') => console.log(`  ----  ${label}${detail ? '   ' + detail : ''}`);
const head = (n, t) => console.log(`\n${n}. ${t}\n${'-'.repeat(58)}`);
const fmt = (t) => String(+t.toFixed(2));
const md5 = (b) => createHash('md5').update(b).digest('hex');

const loadChromium = () => {
  const roots = [process.env.PLAYWRIGHT_NODE_MODULES, path.join(path.dirname(SELF), 'node_modules'), path.join(process.cwd(), 'node_modules')].filter(Boolean);
  for (const r of roots) { try { return createRequire(path.join(r, 'x.cjs'))('playwright-core').chromium; } catch { /* next */ } }
  try { return createRequire(SELF)('playwright-core').chromium; } catch { /* fall through */ }
  console.error('gate: playwright-core not found. Run the gate from a film project folder (new-canvas-project.sh installs it there), or run "npm install" once in the skill folder, or set PLAYWRIGHT_NODE_MODULES=/path/to/node_modules.');
  process.exit(2);
};

// tiny static server: canvas reading local images needs http, not file:// (taint)
const TYPES = { '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2' };
const serve = (root) => new Promise((res) => {
  const base = path.resolve(root);
  const srv = http.createServer((req, r) => {
    // only files inside the film folder: a path that climbs out of it with ../ is refused
    let p = ''; try { p = path.join(base, decodeURIComponent(req.url.split('?')[0])); } catch {}
    if (p !== base && !p.startsWith(base + path.sep)) { r.writeHead(403); r.end(); return; }
    fs.readFile(p, (e, d) => { if (e) { r.writeHead(req.url === '/favicon.ico' ? 204 : 404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(p).toLowerCase()] || 'application/octet-stream' }); r.end(d); });
  }).listen(0, '127.0.0.1', () => res({ srv, url: `http://127.0.0.1:${srv.address().port}` }));
});

// ---------------------------------------------------------------- browser sessions
const openFilm = async (browser, url) => {
  const errs = [], page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.location()?.url ?? '')) errs.push(m.text()); }); // a favicon 404 is harmless (pipeline.md)
  await page.goto(url);
  await page.waitForFunction(() => typeof window.renderFrame === 'function' && window.READY === true, null, { timeout: 120000 });
  // stop any preview loop so it cannot race our draws; the gate drives renderFrame itself
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
  await page.waitForTimeout(50);
  return { page, errs };
};
const drawPng = async (page, t) => Buffer.from(await page.evaluate(async (t) => {
  await window.renderFrame(t);
  const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0];
  return c.toDataURL('image/png').split(',')[1];
}, t), 'base64');

const psnr = (a, b) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', a, '-i', b, '-lavfi', 'psnr=stats_file=-', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = (r.stdout + r.stderr).match(/psnr_avg:([0-9.]+|inf)/);
  return m ? (m[1] === 'inf' ? Infinity : Number(m[1])) : NaN;
};

// ---------------------------------------------------------------- 1. determinism, two ways round
const determinism = async (browser, base, film) => {
  head(1, 'DETERMINISM  the same t, drawn two different ways, is the same frame');
  const url = base + '/' + film + (H > W ? '?portrait=1' : '');
  const s1 = await openFilm(browser, url); // COLD: no draws before the forward pass
  let D = opt.duration ? Number(opt.duration) : await s1.page.evaluate(() => window.FILM_DURATION ?? window.DURATION ?? null);
  if (D == null) { D = 30; note('no --duration and no window.FILM_DURATION/DURATION', 'sampling t in [0, 30]'); }
  const pageHolds = await s1.page.evaluate(() => (Array.isArray(window.HOLDS) ? window.HOLDS : null));
  const pageCuts = await s1.page.evaluate(() => (Array.isArray(window.CUTS) ? window.CUTS : null));
  const pageFootage = await s1.page.evaluate(() => (Array.isArray(window.FOOTAGE) ? window.FOOTAGE : null));
  const GRID = 30, lastT = Math.max(0, D - 1 / GRID);
  const times = [...new Set(Array.from({ length: SAMPLES }, (_, i) => Math.round((lastT * i) / (SAMPLES - 1) * GRID) / GRID))];
  const p1 = [], h1 = [];
  for (const t of times) { const png = await drawPng(s1.page, t); p1.push(png); h1.push(md5(png)); } // forward, cold
  await s1.page.close();

  const s2 = await openFilm(browser, url); // WARMED: draw mid + last before the reversed pass
  await drawPng(s2.page, times[times.length >> 1]); await drawPng(s2.page, times[times.length - 1]);
  const p2 = new Array(times.length), h2 = new Array(times.length);
  for (let i = times.length - 1; i >= 0; i--) { const png = await drawPng(s2.page, times[i]); p2[i] = png; h2[i] = md5(png); } // reversed
  await s2.page.close();

  const same = times.filter((_, i) => h1[i] === h2[i]).length;
  if (same === times.length) say(true, `${times.length} sampled frames hash-identical, cold-forward vs warmed-reverse`, `t ${fmt(times[0])}..${fmt(times[times.length - 1])}s`);
  else {
    fs.mkdirSync(TMP, { recursive: true });
    let worst = Infinity;
    for (let i = 0; i < times.length; i++) {
      if (h1[i] === h2[i]) continue;
      const a = path.join(TMP, `a-t${fmt(times[i])}.png`), b = path.join(TMP, `b-t${fmt(times[i])}.png`);
      fs.writeFileSync(a, p1[i]); fs.writeFileSync(b, p2[i]);
      const v = psnr(a, b); worst = Math.min(worst, v);
      console.log(`        t=${fmt(times[i])}s: hashes differ, PSNR ${v === Infinity ? 'inf' : v.toFixed(2)} dB   (pngs in ${TMP}, removed if this check passes)`);
    }
    say(worst > 45, `${times.length - same} differing frame(s) within PSNR tolerance (> 45 dB)`, `min PSNR ${worst === Infinity ? 'inf' : worst.toFixed(2)} dB`);
    // the comparison pictures are only worth keeping when the check fails: 80 passing runs once left 2 GB behind and filled a disk
    if (worst > 45) fs.rmSync(TMP, { recursive: true, force: true });
    // POISONING DIAGNOSIS. A failure is only useful if it says WHERE to look: redraw the bad
    // frame cold, then after each other sample frame in a fresh page, and name the poisoner.
    const bad = times.find((_, i) => h1[i] !== h2[i]);
    const coldHash = async (pre) => { const s = await openFilm(browser, url); if (pre != null) await drawPng(s.page, pre); const h = md5(await drawPng(s.page, bad)); await s.page.close(); return h; };
    const c1 = await coldHash(null), c2 = await coldHash(null);
    if (c1 !== c2) console.log(worst > 45
      ? `        DIAGNOSIS: t=${fmt(bad)}s differs even cold-vs-cold, but far above 45 dB: GPU raster\n                   wobble (a few anti-aliased pixels), not an ordering bug. Within tolerance.`
      : `        DIAGNOSIS: t=${fmt(bad)}s is NONDETERMINISTIC even cold-vs-cold: unseeded randomness\n                   (Math.random or a clock) in the draw path, not an ordering bug.`);
    else {
      const culprits = [];
      for (const pre of times.filter((t) => t !== bad)) if ((await coldHash(pre)) !== c1) culprits.push(pre);
      console.log(culprits.length
        ? `        DIAGNOSIS: ORDER-DEPENDENT: drawing frame t=${culprits.map(fmt).join('s, t=')}s first changes frame t=${fmt(bad)}s.\n                   That is a stale cache (a key that does not name everything the pixels\n                   depend on) or state one frame leaves behind for the next.${worst > 45 ? '\n                   (Above 45 dB the difference is invisible: a note, not a failure.)' : ''}`
        : `        DIAGNOSIS: t=${fmt(bad)}s is stable within a session; the difference is between sessions\n                   (a load-time random, or GPU raster wobble; see the PSNR above).`);
    }
  }
  if (s1.errs.length || s2.errs.length) say(false, 'no console errors while drawing', [...new Set([...s1.errs, ...s2.errs])].slice(0, 3).join(' | '));
  else say(true, 'no console errors while drawing');
  return { D, pageHolds, pageCuts, pageFootage };
};

// ---------------------------------------------------------------- 2. the contract, statically
// preserve line numbers: block/HTML comments become newlines, line comments are cut per line
const strip = (s) => s.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' ')).replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:"'`])\/\/.*$/gm, '$1');
const CLOCK_HOST_OK = /requestAnimationFrame|navigator\.webdriver/; // the preview loop; timing belongs to hosts
const RULES = [
  { re: /Math\.random/, label: 'Math.random', fix: 'use a seeded rng(i)' },
  { re: /\bDate\.now\b/, label: 'Date.now', clock: true },
  { re: /\bnew Date\b/, label: 'new Date', clock: true },
  { re: /performance\.now/, label: 'performance.now', clock: true },
  { re: /\.filter\s*=(?!=)(?!\s*['"`]none)/, label: "canvas .filter effect (non-'none' assignment)", fix: "only .filter='none' (the reset) is allowed" },
  { re: /\blocalStorage\b/, label: 'localStorage' },
];
const WARN_RULES = [
  { re: /\bfetch\s*\(/, label: 'fetch()' },
  { re: /\bnew Image\b/, label: 'new Image' },
  { re: /\bOffscreenCanvas\b/, label: 'OffscreenCanvas' },
];
const contractScan = (filmPath) => {
  head(2, 'CONTRACT  the draw path cannot reach a clock, chance or storage');
  const html = fs.readFileSync(filmPath, 'utf8');
  const files = [[filmPath, html]];
  for (const m of html.matchAll(/<script[^>]*\bsrc=["']([^"':]+)["']/g)) {
    const p = path.join(path.dirname(filmPath), m[1]);
    if (fs.existsSync(p)) files.push([p, fs.readFileSync(p, 'utf8')]);
  }
  const hits = [], warns = [], hostClocks = []; let rngSites = 0; const badSeeds = [];
  for (const [f, raw] of files) {
    const rel = path.basename(f), lines = strip(raw).split('\n');
    lines.forEach((line, i) => {
      for (const r of RULES) if (r.re.test(line)) {
        if (r.clock && CLOCK_HOST_OK.test(line)) { hostClocks.push(`${rel}:${i + 1} ${r.label}`); continue; }
        hits.push(`${rel}:${i + 1}: ${r.label}${r.fix ? ` (${r.fix})` : ''}`);
      }
      for (const r of WARN_RULES) if (r.re.test(line)) warns.push(`${rel}:${i + 1}: ${r.label}`);
      if (/\b(seed|rng)\w*\s*[=(][^;\n]{0,60}?(Date\.now|performance\.now|new Date)/i.test(line)) badSeeds.push(`${rel}:${i + 1}`);
      rngSites += (line.match(/\b(rng|rnd|rand|hash\d?)\s*\(/g) ?? []).length;
    });
  }
  say(hits.length === 0, `no forbidden call in ${files.length} file(s) (${files.map(([f]) => path.basename(f)).join(', ')})`, hits.slice(0, 8).join(' | '));
  say(badSeeds.length === 0, `randomness is seeded: ${rngSites} rng()/rand()/hash() call sites`, badSeeds.length ? `seed derived from a clock at ${badSeeds.join(', ')}` : 'no seed derived from a clock');
  if (hostClocks.length) note('host clock in the preview loop (allowed)', hostClocks.slice(0, 4).join(' | '));
  if (warns.length) note(`warn: ${warns.length} setup-time load(s): legal only before READY, never in the draw path`, warns.slice(0, 6).join(' | '));
};

// ---------------------------------------------------------------- 3. dead air, on the real MP4
const parseHolds = (s) => (s ? s.split(',').map((r) => r.split('-').map(Number)) : []);
const changedSeries = async (mp4) => {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate', '-of', 'json', mp4], { encoding: 'utf8' })).streams[0];
  const [num, den] = j.r_frame_rate.split('/').map(Number), fps = num / (den || 1);
  const w = 270, h = Math.max(2, Math.round((j.height * w) / j.width / 2) * 2);
  const ff = spawn('ffmpeg', ['-v', 'error', '-i', mp4, '-vf', `scale=${w}:${h}:flags=area,format=gray`, '-f', 'rawvideo', '-']);
  const chunks = []; ff.stdout.on('data', (d) => chunks.push(d));
  await new Promise((res, rej) => { ff.on('close', (c) => (c ? rej(new Error('ffmpeg decode failed')) : res())); });
  const buf = Buffer.concat(chunks), size = w * h, n = Math.floor(buf.length / size);
  const changed = [0], diff = [0]; // changed[f] = fraction of pixels that moved > 4/255 between frame f-1 and f; diff[f] = mean |delta| in 0..255
  for (let f = 1; f < n; f++) {
    let c = 0, sum = 0; const a = (f - 1) * size, b = f * size;
    for (let i = 0; i < size; i++) { const d = Math.abs(buf[a + i] - buf[b + i]); sum += d; if (d > 4) c++; }
    changed.push(c / size); diff.push(sum / size);
  }
  // stillness is judged over a fixed slice of time (1/30 s), not one frame: the same film must get the same answer at 30 and at 60 fps
  const step = Math.max(1, Math.round(fps / 30)), moved = [];
  for (let f = 0; f < n; f++) {
    if (f < step) { moved.push(changed[f] || 0); continue; }
    let c = 0; const a = (f - step) * size, b = f * size;
    for (let i = 0; i < size; i++) if (Math.abs(buf[a + i] - buf[b + i]) > 4) c++;
    moved.push(c / size);
  }
  return { changed, moved, step, diff, fps, n };
};
const deadAir = async (s, holds) => {
  head(3, 'DEAD AIR  something visibly moves in every half second');
  const { fps, n } = s, changed = s.moved;   // per 1/30 s, see changedSeries
  const inHold = (f) => holds.some(([a, b]) => f / fps >= a - 1e-6 && f / fps <= b + 1e-6);
  if (holds.length) note(`declared holds: ${holds.map(([a, b]) => `${a}-${b}s`).join(', ')}`);
  const still = []; for (let f = s.step; f < n; f++) if (changed[f] === 0 && !(inHold(f) && inHold(f - 1))) still.push(f);
  say(still.length === 0, 'no unexplained identical frames 1/30 s apart', still.length ? `frames ${still.slice(0, 12).join(', ')}${still.length > 12 ? ` +${still.length - 12} more` : ''} (t≈${(still[0] / fps).toFixed(2)}s on)` : `${n} frames at ${fps} fps`);
  const win = Math.max(2, Math.round(fps / 2)), flat = [];
  for (let f = 1; f + win <= n; f++) {
    let m = 0; for (let k = f; k < f + win; k++) m = Math.max(m, changed[k]);
    if (m < 0.005 && !Array.from({ length: win }, (_, k) => f + k).every(inHold)) flat.push(f);
  }
  const merged = []; flat.forEach((f) => { const l = merged[merged.length - 1]; if (l && f <= l[1]) l[1] = f + win; else merged.push([f, f + win]); });
  say(merged.length === 0, `no ${win}-frame (half-second) window under 0.5% changed area`, merged.map(([a, b]) => `${(a / fps).toFixed(2)}-${(b / fps).toFixed(2)}s`).join(', ') || 'none');
  const mv = changed.slice(1).sort((a, b) => a - b);
  note(`${n} frames measured`, `median changed ${((mv[mv.length >> 1] ?? 0) * 100).toFixed(2)}%  min ${((mv[0] ?? 0) * 100).toFixed(2)}%`);
};

// ---------------------------------------------------------------- 4. pops, on the real MP4
const popScan = (diff, fps, n) => {
  const spikes = [];
  for (let f = 1; f < n; f++) {
    const nb = []; for (let k = f - 3; k <= f + 3; k++) if (k !== f && k >= 1 && k < n) nb.push(diff[k]);
    nb.sort((a, b) => a - b);
    const ref = Math.max(0.5, nb.length ? (nb[(nb.length - 1) >> 1] + nb[nb.length >> 1]) / 2 : 0);
    if (diff[f] > 2 && diff[f] > 3 * ref) spikes.push({ f, t: f / fps, ratio: diff[f] / ref, d: diff[f] });
  }
  return spikes;
};
// footage at a lower frame rate: each of its frames is held for `hold` of ours, so the change is taken once per footage frame (a sliding max)
const footageDiff = (diff, fps, n, footage) => {
  const out = diff.slice();
  for (const [a, b, ffps] of footage) { const hold = Math.round(fps / ffps); if (!(hold > 1)) continue;
    for (let f = Math.max(1, Math.ceil(a * fps)); f < Math.min(n, Math.floor(b * fps)); f++) { let m = 0; for (let k = f - hold + 1; k <= f; k++) if (k >= 1) m = Math.max(m, diff[k]); out[f] = m; } }
  return out;
};
const pops = (s, cuts, footage = []) => {
  head(4, 'POPS  no frame jumps 3x more than its neighbours unless it is a declared cut');
  const { fps, n } = s, diff = footage.length ? footageDiff(s.diff, fps, n, footage) : s.diff, spikes = popScan(diff, fps, n);
  if (footage.length) note(`declared footage: ${footage.map(([a, b, r]) => `${a}-${b}s at ${r} fps`).join(', ')}`);
  if (cuts.length) note(`declared cuts: ${cuts.map((c) => `${c}s`).join(', ')}`);
  const inFoot = (f) => footage.find(([a, b]) => f / fps >= a && f / fps < b);
  const declared = (sp) => { const ft = inFoot(sp.f), tol = ft ? Math.round(fps / ft[2]) + 0.01 : 1.01; return cuts.some((c) => Math.abs(c * fps - sp.f) <= tol); }; // the cut frame, one either side (one footage frame either side inside footage)
  const line = (sp) => `t=${sp.t.toFixed(2)}s (frame ${sp.f}, ${sp.ratio.toFixed(1)}x neighbours, mean diff ${sp.d.toFixed(1)}/255)`;
  const ok = spikes.filter(declared), bad = spikes.filter((sp) => !declared(sp));
  ok.forEach((sp) => note('declared cut', line(sp)));
  bad.forEach((sp) => console.log(`        pop  ${line(sp)}`));
  say(bad.length === 0, `no undeclared frame-difference spikes (> 3x neighbours)`, bad.length ? `${bad.length} pop(s): explain each as a cut (--cuts / window.CUTS) or fix it (ease it, stretch the flood, carry an element across)` : `${spikes.length} spike(s), all declared cuts`);
};

// ---------------------------------------------------------------- run
const run = async () => {
  const filmPath = path.resolve(pos[0] ?? '');
  if (!pos[0] || !fs.existsSync(filmPath)) { console.error('usage: node gate.mjs <film.html> [--duration S] [--samples 12] [--mp4 out.mp4] [--holds "1-3,10-12"] [--cuts "4.5,9"]\n       node gate.mjs --self-test'); process.exit(2); }
  console.log(`QUALITY GATE   ${filmPath}   viewport ${W}x${H}`);
  const chromium = loadChromium();
  const { srv, url } = await serve(path.dirname(filmPath));
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: GPU });
  try {
    const { pageHolds, pageCuts, pageFootage } = await determinism(browser, url, path.basename(filmPath));
    contractScan(filmPath);
    const mp4 = opt.mp4 && path.resolve(opt.mp4);
    let s = null;
    if (mp4 && !fs.existsSync(mp4)) say(false, 'an MP4 to measure', `${mp4} not found`);
    else if (mp4) { try { s = await changedSeries(mp4); } catch (e) { say(false, 'decode MP4', e.message); } }
    if (s) {
      await deadAir(s, parseHolds(opt.holds).concat(!opt.holds && pageHolds ? pageHolds : []));
      const footage = opt.footage ? String(opt.footage).split(',').map((x) => { const m = x.trim().match(/^([\d.]+)-([\d.]+)@([\d.]+)$/); if (!m) throw new Error(`--footage wants "from-to@fps", got "${x}"`); return [Number(m[1]), Number(m[2]), Number(m[3])]; }) : (pageFootage ?? []);
      pops(s, opt.cuts ? String(opt.cuts).split(',').map(Number) : (pageCuts ?? []), footage);
    } else for (const [k, t] of [[3, 'DEAD AIR  something visibly moves in every half second'], [4, 'POPS  no frame jumps 3x more than its neighbours unless it is a declared cut']]) { head(k, t); note('skipped: no --mp4 given', 'run again with --mp4 after export'); }
  } finally { await browser.close(); srv.close(); }
  console.log(`\n${'='.repeat(58)}\nGATE: ${fails ? `FAIL   ${fails} of ${checks} checks failed` : `PASS   ${checks}/${checks} checks`}`);
  process.exit(fails ? 1 : 0);
};

// ---------------------------------------------------------------- --self-test
// Tiny fixture films that MUST fail (math-random, order-dependent-cache, dead-loop, pop) and runs
// that MUST pass (the dead film with its hold declared, the pop declared as a cut), proving the gate catches each.
const FIX = {
  'math-random.html': `for(let i=0;i<120;i++){g.fillStyle='#fc0';g.fillRect(Math.random()*470,Math.random()*260,6,6)}`,
  'order-cache.html': `if(window.__warm==null)window.__warm=Math.round(t*2); /* stale: remembers the first t drawn */
    g.fillStyle='hsl('+(window.__warm*47%360)+',60%,35%)';g.fillRect(0,0,480,60);
    g.fillStyle='#fff';g.fillRect(20+t*100,120,40,40);`,
  'dead.html': `const T=Math.min(t,1);g.fillStyle='#e8b84b';g.beginPath();g.arc(40+T*380,135,24,0,7);g.fill();`,
  'pop.html': `g.fillStyle='#e8b84b';g.beginPath();g.arc(40+t*130,135,24,0,7);g.fill();
    if(t>=1.5){g.fillStyle='#f4f1ea';g.fillRect(260,10,200,90);} /* a card that appears with no ease: a pop */`,
};
const fixture = (body) => `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">
<canvas id="c" width="480" height="270"></canvas><script>
const g=document.getElementById('c').getContext('2d');window.FILM_DURATION=3;
window.renderFrame=t=>{g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.fillStyle='#081018';g.fillRect(0,0,480,270);
${body}};
window.READY=true;
</` + `script></body></html>`;

const renderFixtureMp4 = async (chromium, dir, film, mp4, fps, seconds) => {
  const { srv, url } = await serve(dir);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 480, height: 270 } });
  await page.goto(url + '/' + film);
  await page.waitForFunction(() => typeof window.renderFrame === 'function' && window.READY === true);
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'fast', '-crf', '14', '-pix_fmt', 'yuv420p', mp4], { stdio: ['pipe', 'ignore', 'inherit'] });
  for (let i = 0; i < fps * seconds; i++) {
    const png = await drawPng(page, i / fps);
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r)); await browser.close(); srv.close();
};

const selfTest = async () => {
  const chromium = loadChromium();
  const dir = fs.mkdtempSync(path.join(process.env.GATE_TMP || os.tmpdir(), 'gate-selftest-'));
  for (const [name, body] of Object.entries(FIX)) fs.writeFileSync(path.join(dir, name), fixture(body));
  const mp4 = path.join(dir, 'dead.mp4'), popMp4 = path.join(dir, 'pop.mp4');
  console.log(`SELF-TEST  fixtures in ${dir}`);
  await renderFixtureMp4(chromium, dir, 'dead.html', mp4, 12, 3);
  await renderFixtureMp4(chromium, dir, 'pop.html', popMp4, 12, 3);
  const gate = (args) => spawnSync(process.execPath, [SELF, ...args], { encoding: 'utf8', env: { ...process.env, W: '480', H: '270' } });
  const cases = [
    ['math-random must FAIL (unseeded randomness caught by scan + determinism)', [path.join(dir, 'math-random.html'), '--samples', '6'],
      (r) => r.status !== 0 && /Math\.random/.test(r.stdout) && /NONDETERMINISTIC|min PSNR/.test(r.stdout)],
    ['order-dependent-cache must FAIL and the poisoning frame must be NAMED', [path.join(dir, 'order-cache.html'), '--samples', '6'],
      (r) => r.status !== 0 && /ORDER-DEPENDENT: drawing frame/.test(r.stdout)],
    ['dead-loop mp4 must FAIL dead air', [path.join(dir, 'dead.html'), '--mp4', mp4],
      (r) => r.status !== 0 && /FAIL {2}no unexplained identical frames/.test(r.stdout)],
    ['the same film with its hold declared must PASS', [path.join(dir, 'dead.html'), '--mp4', mp4, '--holds', '1-3'],
      (r) => r.status === 0 && /GATE: PASS/.test(r.stdout)],
    ['an un-eased card appearing at 1.5 s must FAIL pops, listed at its time', [path.join(dir, 'pop.html'), '--mp4', popMp4],
      (r) => r.status !== 0 && /pop {2}t=1\.50s/.test(r.stdout) && /FAIL {2}no undeclared frame-difference spikes/.test(r.stdout)],
    ['the same pop declared as a cut must PASS', [path.join(dir, 'pop.html'), '--mp4', popMp4, '--cuts', '1.5'],
      (r) => r.status === 0 && /declared cut/.test(r.stdout) && /GATE: PASS/.test(r.stdout)],
  ];
  let wrong = 0;
  for (const [name, args, expect] of cases) {
    const r = gate(args), ok = expect(r);
    if (!ok) { wrong++; console.log(r.stdout); }
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  }
  console.log(`SELF-TEST: ${wrong ? 'FAIL' : 'PASS'}`);
  process.exit(wrong ? 1 : 0);
};

(opt['self-test'] ? selfTest() : run()).catch((e) => { console.error(`\ngate crashed: ${e.message}`); process.exit(2); });
