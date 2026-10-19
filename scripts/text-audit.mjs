#!/usr/bin/env node
// scripts/text-audit.mjs : measure every word a canvas film puts on screen, instead of eyeballing it.
//
//   node <skill>/scripts/text-audit.mjs [film.html] [--step 0.1] [--ignore "regex"] [--json out.json]
//
// Run it from the film's folder, on the stills gate and again before the reviewer. It loads the film in headless Chrome,
// records every fillText / strokeText the page makes while it draws each sampled frame (text, size on screen, where, how
// opaque), joins the samples into "this text was on screen from A to B", and checks what a phone viewer can actually take in:
//
//   SMALL   text held 0.6 s or more that is too small at phone width.  FAIL under about 6.7 px on a 360 px wide phone (3.3 %
//           of the height of a 16:9 frame), WARN under about 8.7 px (4.3 %). Measured on the phone, so a tall 9:16 frame is
//           judged by the same eye. Captions pass easily; chips, tags, counters and menus fail.
//   FLASH   a caption or card (3.5 % of the height or more) that is not up long enough to read: it needs 0.4 s + 0.2 s a
//           word. A payoff that lands just before a cut.
//           A line typed letter by letter in one place (a prompt) counts as one piece, from its first letter.
//           A film shown inside the film (a small player replaying earlier scenes) is not text to read: the page sets
//           window.TEXT_AUDIT_SKIP = true while it draws that inner picture, and the audit leaves those draws out.
//   EDGE    text that sits partly out of the frame for 0.8 s or more (unless it is huge type, 20 % of the height or more,
//           cropped on purpose). Text flying in or out does not count.
//   PINNED  small text parked in a corner zone for 6 s or more in total: a label, a counter, a name. A film is not a page.
//   LONG    one big line (5 % of the height or more) held more than 6 s: the frame may have become a slide.
//   FACE    text over a face, when the film exposes window.FACES = (t) => [[x, y, w, h], ...] in canvas pixels.
//   BROKEN  a value that failed to compute, printed on screen for any length of time: NaN, undefined, Infinity or
//           [object Object] as a word (a counter whose start was shifted to -1.1 showed "NaN" for a whole beat). FAIL.
//           A lone "null" as a word is a WARN.
//   OVERLAP two different texts printed on top of each other for 0.3 s or more (a label over a label, a caption over a
//           number). It counts when the overlap covers a fifth of the smaller text's width and a quarter of its height, so
//           a descender touching the next line or two words crossing in a transition pass. The same text drawn twice (an
//           outline, a glow, a counter changing its value) and two single letters (a rolling digit) are left alone. A FAIL
//           needs the two to sit still on each other; one moving across the other, or a huge word across small text (it is
//           sometimes the design), is a WARN.
//
// Exit 1 when there is a FAIL. WARN lines are leads: look at each one and either fix it or say why it stays.
// Limits: it sees text drawn with fillText/strokeText only (not words inside pictures or SVGs), it does not know about clip
// regions or about something painted over the text later (so text hidden by a mask can still show up as an OVERLAP), it
// does not see text over drawings, and it reads size, not contrast. Text meant as texture can be
// skipped with --ignore.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); if (i < 0) return def; const v = args[i + 1]; args.splice(i, 2); return v; };
const STEP = Number(opt('step', 0.1)), IGNORE = opt('ignore', null), JSON_OUT = opt('json', null);
const film = path.resolve(args[0] || 'film.html');
if (!fs.existsSync(film)) { console.error(`text-audit: no film at ${film}\nusage: node text-audit.mjs [film.html] [--step 0.1] [--ignore "regex"] [--json out.json]`); process.exit(2); }
const SELF = fileURLToPath(import.meta.url);
const loadChromium = () => {
  for (const r of [process.env.PLAYWRIGHT_NODE_MODULES, path.join(path.dirname(film), 'node_modules'), path.join(process.cwd(), 'node_modules'), path.join(path.dirname(SELF), 'node_modules')].filter(Boolean)) {
    try { return createRequire(path.join(r, 'x.cjs'))('playwright-core').chromium; } catch { /* next */ } }
  try { return createRequire(SELF)('playwright-core').chromium; } catch { /* fall through */ }
  console.error('text-audit: playwright-core not found. Run it from the film project folder (new-canvas-project.sh installs it there), or set PLAYWRIGHT_NODE_MODULES.'); process.exit(2);
};
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.mp4': 'video/mp4', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
const serve = (root) => new Promise((res) => { const srv = http.createServer((req, rs) => {
  // only files inside the film folder: a neighbour folder whose name starts the same way is refused too
  let p = ''; try { p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)); } catch {}
  if ((p !== root && !p.startsWith(root + path.sep)) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rs.writeHead(404); return rs.end(); }
  rs.writeHead(200, { 'content-type': TYPES[path.extname(p).toLowerCase()] || 'application/octet-stream' }); fs.createReadStream(p).pipe(rs); });
  srv.listen(0, '127.0.0.1', () => res({ srv, url: `http://127.0.0.1:${srv.address().port}` })); });

const { srv, url } = await serve(path.dirname(film));
const browser = await loadChromium().launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
// record every text draw: what, how big on screen, where, how opaque
await page.addInitScript(() => {
  window.__TXT = [];
  for (const fn of ['fillText', 'strokeText']) {
    const orig = CanvasRenderingContext2D.prototype[fn];
    CanvasRenderingContext2D.prototype[fn] = function (text, x, y, ...rest) {
      try {
        const s = String(text); if (s.trim() && window.__TXT_ON && !window.TEXT_AUDIT_SKIP) {
          const m = this.measureText(s), tr = this.getTransform(), px = parseFloat((/(\d+(?:\.\d+)?)px/.exec(this.font) || [0, 0])[1]);
          const cs = [[x - m.actualBoundingBoxLeft, y - m.actualBoundingBoxAscent], [x + m.actualBoundingBoxRight, y - m.actualBoundingBoxAscent], [x + m.actualBoundingBoxRight, y + m.actualBoundingBoxDescent], [x - m.actualBoundingBoxLeft, y + m.actualBoundingBoxDescent]]
            .map(([a, b]) => [tr.a * a + tr.c * b + tr.e, tr.b * a + tr.d * b + tr.f]);
          const xs = cs.map((c) => c[0]), ys = cs.map((c) => c[1]);
          window.__TXT.push({ s, px: px * Math.hypot(tr.c, tr.d), a: this.globalAlpha, x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) });
        }
      } catch { /* never break the film's own drawing */ }
      return orig.call(this, text, x, y, ...rest);
    };
  }
});
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(url + '/' + path.basename(film));
await page.waitForFunction(() => typeof window.renderFrame === 'function' && window.READY === true, null, { timeout: 120000 });
const info = await page.evaluate(() => { const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0]; return { W: c.width, H: c.height, D: window.FILM_DURATION, cuts: window.CUTS || [], faces: typeof window.FACES === 'function' }; });
const { W, H, D } = info, n = Math.floor(D / STEP);
const samples = await page.evaluate(async ({ n, STEP }) => { const out = [];
  for (let i = 0; i <= n; i++) { const t = Math.min(i * STEP, window.FILM_DURATION - 1e-3); window.__TXT = []; window.__TXT_ON = true; await window.renderFrame(t); window.__TXT_ON = false;
    out.push({ t, txt: window.__TXT, faces: typeof window.FACES === 'function' ? window.FACES(t) : null }); }
  return out; }, { n, STEP });
await browser.close(); srv.close();

// join samples into intervals per text (a gap of more than two steps starts a new one)
const ign = IGNORE ? new RegExp(IGNORE, 'i') : null, runs = new Map(), done = [];
for (const smp of samples) {
  const seen = new Map();
  for (const d of smp.txt) { if (d.a < 0.5 || d.px < 1 || (ign && ign.test(d.s))) continue; if (d.x1 < 0 || d.x0 > W || d.y1 < 0 || d.y0 > H) continue;
    const k = d.s.replace(/\d+/g, '#').replace(/[.\u2026\s]+$/, ''); /* "3 of 8" and "4 of 8", "Working." and "Working..." are one piece of text */ const cur = seen.get(k); if (!cur || d.px > cur.px) seen.set(k, d); }
  for (const [k, d] of seen) { let r = runs.get(k);
    if (r && smp.t - r.t1 > STEP * 2.5) { done.push(r); r = null; }
    if (!r) { r = { s: d.s, t0: smp.t, t1: smp.t, minPx: d.px, maxPx: d.px, box: d, faceHit: false, edge: 0, corner: 0, sizes: [] }; runs.set(k, r); }
    r.t1 = smp.t; r.s = d.s; r.sizes.push(d.px); r.minPx = Math.min(r.minPx, d.px); r.maxPx = Math.max(r.maxPx, d.px); r.box = d;
    const out = Math.max(0, -d.x0) + Math.max(0, d.x1 - W) + Math.max(0, -d.y0) + Math.max(0, d.y1 - H); if (out > 0.02 * W) r.edge += STEP;
    const cx = (d.x0 + d.x1) / 2 / W, cy = (d.y0 + d.y1) / 2 / H; if ((cx < 0.2 || cx > 0.8) && (cy < 0.14 || cy > 0.86)) r.corner += STEP;
    if (smp.faces) for (const [fx, fy, fw, fh] of smp.faces) if (d.x0 < fx + fw && d.x1 > fx && d.y0 < fy + fh && d.y1 > fy) r.faceHit = true;
  }
}
done.push(...runs.values());
// typed text: a line that grows letter by letter in one place (a prompt being typed) is one piece of text, read from its first letter
done.sort((a, b) => a.t0 - b.t0);
for (let i = 0; i < done.length; i++) { const a = done[i]; if (!a) continue;
  for (let j = i + 1; j < done.length; j++) { const b = done[j]; if (!b) continue; if (b.t0 - a.t1 > STEP * 2.5) break;
    if (b.s.length > a.s.length && b.s.startsWith(a.s.trimEnd()) && Math.abs(b.box.x0 - a.box.x0) < 0.01 * W && Math.abs(b.box.y0 - a.box.y0) < 0.02 * H) {
      b.t0 = a.t0; b.sizes.push(...a.sizes); b.edge += a.edge; b.corner += a.corner; b.faceHit = b.faceHit || a.faceHit; done[i] = null; break; } } }
done.splice(0, done.length, ...done.filter(Boolean));
const words = (s) => s.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const pct = (px) => (px / H * 100).toFixed(1) + '% H', phone = (px) => (px * 360 / W).toFixed(1) + ' px on a phone';
const f = (t) => t.toFixed(1), q = (s) => '"' + (s.length > 48 ? s.slice(0, 45) + '...' : s) + '"';
const finds = [], add = (sev, rule, r, why) => finds.push({ sev, rule, t0: r.t0, t1: r.t1, text: r.s, why });
const pinned = new Map();
for (const r of done) { const held = r.t1 - r.t0 + STEP, w = words(r.s); if (!w) continue;
  r.sizes.sort((a, b) => a - b); r.minPx = r.sizes[Math.floor(r.sizes.length / 2)];   // its size once it has settled (the middle one), not while it flies in
  const nearEnd = r.t1 >= D - STEP * 1.5;                                   // still up on the last frame: not a flash
  // judged by its size on a phone 360 px wide, whatever the frame's shape. The two lines are what 3.3 % and 4.3 % of the height
  // come to in a 16:9 frame (6.7 and 8.7 px), so a wide film is judged exactly as before; a tall film is no longer failed for
  // text that is 22 px on the phone (the old rule measured against a frame height of 1920)
  if (held >= 0.6) { const ph = r.minPx * 360 / W; if (ph < 6.6825) add('FAIL', 'SMALL', r, `${pct(r.minPx)}, ${phone(r.minPx)}`); else if (ph < 8.7075) add('WARN', 'SMALL', r, `${pct(r.minPx)}, ${phone(r.minPx)}`); }
  const need = 0.4 + 0.2 * w; if (held < need && !nearEnd && r.minPx / H >= 0.035) add(held < need * 0.6 ? 'FAIL' : 'WARN', 'FLASH', r, `${w} word${w > 1 ? 's' : ''} up for ${f(held)} s, needs about ${f(need)} s`);
  if (r.edge >= 0.8 && r.maxPx / H < 0.2) add('WARN', 'EDGE', r, `partly out of the frame for ${f(r.edge)} s`);
  if (r.faceHit) add('FAIL', 'FACE', r, 'sits on a face');
  if (/(^|[^\p{L}])(NaN|undefined|Infinity)([^\p{L}]|$)|\[object [A-Za-z]+\]/u.test(r.s)) add('FAIL', 'BROKEN', r, 'a value that failed to compute is on screen');
  else if (/(^|[^\p{L}])null([^\p{L}]|$)/u.test(r.s)) add('WARN', 'BROKEN', r, '"null" on screen: a missing value?');
  if (r.maxPx / H < 0.05 && r.corner > 0) pinned.set(r.s, (pinned.get(r.s) || 0) + r.corner);
  if (held > 6 && w >= 2 && r.minPx / H >= 0.05) add('WARN', 'LONG', r, `held ${f(held)} s: the same frame for too long?`);
}
// OVERLAP: within each sample, every pair of different visible texts; a pair that keeps overlapping for 0.3 s is reported once
const key = (s) => s.replace(/\d+/g, '#').replace(/[.\u2026\s]+$/, ''), pairs = new Map(), crossed = [];
for (const smp of samples) {
  const vis = smp.txt.filter((d) => d.a >= 0.5 && d.px >= 1 && !(ign && ign.test(d.s)) && d.x1 > 0 && d.x0 < W && d.y1 > 0 && d.y0 < H);
  for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) {
    const u = vis[i], v = vis[j], ku = key(u.s), kv = key(v.s);
    if (ku === kv) continue;                                                  // the same text twice: an outline, a glow, a counter
    if (u.s.trim().length < 2 && v.s.trim().length < 2) continue;             // two single letters: a rolling digit, a letter flying in
    const sm = (u.x1 - u.x0) * (u.y1 - u.y0) <= (v.x1 - v.x0) * (v.y1 - v.y0) ? u : v, lg = sm === u ? v : u;
    const ow = Math.min(u.x1, v.x1) - Math.max(u.x0, v.x0), oh = Math.min(u.y1, v.y1) - Math.max(u.y0, v.y0);
    if (ow < 0.2 * (sm.x1 - sm.x0) || oh < 0.25 * (sm.y1 - sm.y0)) continue;
    const big = lg.y1 - lg.y0 >= 3 * (sm.y1 - sm.y0);                         // a huge word across small text
    const rx = (sm.x0 + sm.x1 - lg.x0 - lg.x1) / 2, ry = (sm.y0 + sm.y1 - lg.y0 - lg.y1) / 2;   // where one sits on the other
    const k = [ku, kv].sort().join('\n'); let r = pairs.get(k);
    if (r && smp.t - r.t1 > STEP * 2.5) { crossed.push(r); r = null; }
    if (!r) { r = { s: lg.s, over: sm.s, t0: smp.t, t1: smp.t, big, still: STEP, rx, ry }; pairs.set(k, r); }
    else if (Math.abs(rx - r.rx) < 4 && Math.abs(ry - r.ry) < 4) r.still += STEP;   // still in the same place on each other
    r.t1 = smp.t; r.big = r.big && big; r.rx = rx; r.ry = ry;
  }
}
// a FAIL needs the two to sit still on each other for 0.3 s; one passing across the other (a coin flying over a line) is a WARN
for (const r of [...crossed, ...pairs.values()]) { const held = r.t1 - r.t0 + STEP, moving = r.still < 0.3 - 1e-6;
  if (held >= 0.3) add(r.big || moving ? 'WARN' : 'FAIL', 'OVERLAP', r, `overlaps ${q(r.over)} for ${f(held)} s${r.big ? ' (a huge word across small text: on purpose?)' : moving ? ' (one moves across the other)' : ''}`); }
for (const [s, sec] of pinned) if (sec >= 6) finds.push({ sev: 'WARN', rule: 'PINNED', t0: 0, t1: D, text: s, why: `small text in a corner for ${f(sec)} s in all` });
finds.sort((a, b) => (a.sev === b.sev ? a.t0 - b.t0 : a.sev === 'FAIL' ? -1 : 1));
const fails = finds.filter((x) => x.sev === 'FAIL').length, warns = finds.length - fails;
console.log(`TEXT AUDIT   ${path.basename(film)}   ${W}x${H}, ${f(D)} s, a sample every ${STEP} s, ${done.length} pieces of text${info.faces ? '' : '   (no window.FACES: the face check did not run)'}`);
if (errs.length) console.log('  page errors while drawing: ' + errs.slice(0, 3).join(' | '));
for (const x of finds) console.log(`  ${x.sev}  ${x.rule.padEnd(7)} ${(f(x.t0) + '-' + f(x.t1) + ' s').padEnd(15)} ${q(x.text).padEnd(52)} ${x.why}`);
console.log(fails ? `TEXT AUDIT: FAIL   ${fails} to fix, ${warns} to look at` : warns ? `TEXT AUDIT: PASS with ${warns} to look at` : 'TEXT AUDIT: PASS');
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ film: path.basename(film), W, H, D, step: STEP, finds, texts: done.map((r) => ({ text: r.s, t0: r.t0, t1: r.t1, minPx: r.minPx, maxPx: r.maxPx })) }, null, 1));
process.exit(fails ? 1 : 0);
