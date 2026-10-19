#!/usr/bin/env node
// scripts/plate-audit.mjs : measure how every big picture in a canvas film is drawn, so a soft shot is found before a person sees it.
//
//   node <skill>/scripts/plate-audit.mjs [film.html] [--step 0.1] [--min-area 0.2] [--json out.json]
//
// Run it from the film's folder before the reviewer, next to text-audit.mjs. It loads the film in headless Chrome, records every
// drawImage the page makes while it draws each sampled frame, and keeps the big ones (a picture covering a fifth of the frame or
// more: a photo, a video frame, a plate). Then it checks the two things that quietly soften footage:
//
//   UPSCALE  a picture drawn bigger than its own pixels. A 1080p clip pushed to 1.3x shows 1478 of its pixels across 1920: faces
//            go soft and text drawn on top looks pasted. WARN above 1.12x held 0.5 s or more, FAIL at 1.2x or more.
//            A gentle push-in to about 1.1x passes; one that ends at 1.15x is a WARN to look at; a "closer shot" made by
//            zooming the same clip is usually a FAIL.
//   BLEND    two different frames of the same clip laid over each other at the same place, one of them see-through: slow motion
//            made by mixing frames. Faces get a ghost outline and smear. WARN when it lasts 0.25 s or more. Play the clip at 1x,
//            hold clean frames instead of mixing them, or end the shot earlier.
//
// What counts as the same clip: frames from one folder (assets/seq/<clip>/f012.jpg) or one video file. SVG pictures are left out
// (they stay sharp at any size), and so are small pictures (icons, tiles in a wall, logos).
// Pictures drawn onto an off-screen canvas that is at least half the frame are measured against that canvas, on the
// assumption that the layer is later drawn about 1:1. Exit 1 when there is a FAIL; WARN lines are leads to look at.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); if (i < 0) return def; const v = args[i + 1]; args.splice(i, 2); return v; };
const STEP = Number(opt('step', 0.1)), MIN_AREA = Number(opt('min-area', 0.2)), JSON_OUT = opt('json', null);
const film = path.resolve(args[0] || 'film.html');
if (!fs.existsSync(film)) { console.error(`plate-audit: no film at ${film}\nusage: node plate-audit.mjs [film.html] [--step 0.1] [--min-area 0.2] [--json out.json]`); process.exit(2); }
const SELF = fileURLToPath(import.meta.url);
const loadChromium = () => {
  for (const r of [process.env.PLAYWRIGHT_NODE_MODULES, path.join(path.dirname(film), 'node_modules'), path.join(process.cwd(), 'node_modules'), path.join(path.dirname(SELF), 'node_modules')].filter(Boolean)) {
    try { return createRequire(path.join(r, 'x.cjs'))('playwright-core').chromium; } catch { /* next */ } }
  try { return createRequire(SELF)('playwright-core').chromium; } catch { /* fall through */ }
  console.error('plate-audit: playwright-core not found. Run it from the film project folder (new-canvas-project.sh installs it there), or set PLAYWRIGHT_NODE_MODULES.'); process.exit(2);
};
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.mp4': 'video/mp4', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
const serve = (root) => new Promise((res) => { const srv = http.createServer((req, rs) => {
  // only files inside the film folder (symlinked asset folders inside it are followed)
  let p = ''; try { p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)); } catch {}
  if ((p !== root && !p.startsWith(root + path.sep)) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rs.writeHead(404); return rs.end(); }
  rs.writeHead(200, { 'content-type': TYPES[path.extname(p).toLowerCase()] || 'application/octet-stream' }); fs.createReadStream(p).pipe(rs); });
  srv.listen(0, '127.0.0.1', () => res({ srv, url: `http://127.0.0.1:${srv.address().port}` })); });

const { srv, url } = await serve(path.dirname(film));
const browser = await loadChromium().launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
// record every big raster draw: which picture, its own pixel size, how big it lands, where, how opaque
await page.addInitScript((MIN_AREA) => {
  window.__IMG = [];
  const orig = CanvasRenderingContext2D.prototype.drawImage;
  const srcOf = (im) => {
    if (typeof HTMLImageElement !== 'undefined' && im instanceof HTMLImageElement) { const s = im.currentSrc || im.src || ''; return { id: s, w: im.naturalWidth, h: im.naturalHeight, svg: /\.svg(\?|#|$)|^data:image\/svg/i.test(s) }; }
    if (typeof HTMLVideoElement !== 'undefined' && im instanceof HTMLVideoElement) return { id: im.currentSrc || im.src || 'video', w: im.videoWidth, h: im.videoHeight, video: true };
    if (typeof ImageBitmap !== 'undefined' && im instanceof ImageBitmap) { if (!im.__pid) im.__pid = 'bitmap#' + Math.random().toString(36).slice(2, 8); return { id: im.__pid, w: im.width, h: im.height }; }
    return null;   // canvases are layers the film drew itself: measured where their own content was drawn
  };
  CanvasRenderingContext2D.prototype.drawImage = function (im, ...a) {
    try {
      if (window.__IMG_ON && !window.PLATE_AUDIT_SKIP) {
        const s = srcOf(im);
        if (s && !s.svg && s.w > 0) {
          let sx = 0, sy = 0, sw = s.w, sh = s.h, dx, dy, dw, dh;
          if (a.length === 2) { [dx, dy] = a; dw = s.w; dh = s.h; } else if (a.length === 4) { [dx, dy, dw, dh] = a; } else if (a.length === 8) { [sx, sy, sw, sh, dx, dy, dw, dh] = a; }
          const tr = this.getTransform(), kx = Math.hypot(tr.a, tr.b), ky = Math.hypot(tr.c, tr.d);
          const cw = this.canvas.width, ch = this.canvas.height, main = window.__MAIN_W || cw;
          const layer = cw >= 0.5 * main;   // the frame itself or a big off-screen layer
          const ow = Math.abs(dw) * kx, oh = Math.abs(dh) * ky, area = (ow * oh) / (cw * ch);
          if (layer && area >= MIN_AREA && Math.abs(sw) > 0) {
            const x0 = tr.a * dx + tr.c * dy + tr.e, y0 = tr.b * dx + tr.d * dy + tr.f;
            window.__IMG.push({ id: s.id, up: Math.max(ow / Math.abs(sw), oh / Math.abs(sh)), a: this.globalAlpha, area, x0, y0, x1: x0 + ow, y1: y0 + oh, onMain: cw === main });
          }
        }
      }
    } catch { /* never break the film's own drawing */ }
    return orig.call(this, im, ...a);
  };
}, MIN_AREA);
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(url + '/' + path.basename(film));
await page.waitForFunction(() => typeof window.renderFrame === 'function' && window.READY === true, null, { timeout: 120000 });
const info = await page.evaluate(() => { const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0]; window.__MAIN_W = c.width; return { W: c.width, H: c.height, D: window.FILM_DURATION }; });
const { W, H, D } = info, n = Math.floor(D / STEP);
const samples = await page.evaluate(async ({ n, STEP }) => { const out = [];
  for (let i = 0; i <= n; i++) { const t = Math.min(i * STEP, window.FILM_DURATION - 1e-3); window.__IMG = []; window.__IMG_ON = true; await window.renderFrame(t); window.__IMG_ON = false; out.push({ t, img: window.__IMG }); }
  return out; }, { n, STEP });
await browser.close(); srv.close();

// a clip is a folder of frames or one file: assets/seq/walk/f012.jpg and f013.jpg are the same clip
const clipOf = (id) => { let p = id; try { p = decodeURIComponent(new URL(id, 'http://x').pathname); } catch {} return /\/f?\d{2,}\.(jpe?g|png|webp)$/i.test(p) ? p.replace(/[^/]+$/, '') : p; };
const nameOf = (c) => c.replace(/\/$/, '').split('/').slice(-2).join('/');
const f = (t) => t.toFixed(1), finds = [];
// UPSCALE: per clip, the stretches where it is drawn bigger than its pixels (largest draw of that clip in each sample)
const up = new Map(), upDone = [];
for (const smp of samples) {
  const best = new Map();
  for (const d of smp.img) { const c = clipOf(d.id); if (d.a < 0.5) continue; const b = best.get(c); if (!b || d.up > b.up) best.set(c, d); }
  for (const [c, d] of best) {
    let r = up.get(c);
    if (r && smp.t - r.t1 > STEP * 2.5) { upDone.push(r); r = null; }
    if (d.up <= 1.12) continue;
    if (!r) { r = { clip: c, t0: smp.t, t1: smp.t, max: d.up, fail: 0 }; up.set(c, r); }
    r.t1 = smp.t; r.max = Math.max(r.max, d.up); if (d.up >= 1.2) r.fail += STEP;
  }
}
upDone.push(...up.values());
for (const r of upDone) { const held = r.t1 - r.t0 + STEP; if (held < 0.5) continue;
  finds.push({ sev: r.fail >= 0.5 ? 'FAIL' : 'WARN', rule: 'UPSCALE', t0: r.t0, t1: r.t1, clip: nameOf(r.clip), why: `drawn up to ${r.max.toFixed(2)}x its own pixels${r.fail >= 0.5 ? ` (1.2x or more for ${f(r.fail)} s): soft` : ''}` }); }
// BLEND: two different frames of one clip at the same place in the same sample, the upper one see-through
const bl = new Map(), blDone = [];
for (const smp of samples) {
  const byClip = new Map(); for (const d of smp.img) { const c = clipOf(d.id); if (!byClip.has(c)) byClip.set(c, []); byClip.get(c).push(d); }
  const hit = new Set();
  for (const [c, ds] of byClip) for (let i = 0; i < ds.length; i++) for (let j = i + 1; j < ds.length; j++) {
    const u = ds[i], v = ds[j]; if (u.id === v.id) continue;
    const ix = Math.max(0, Math.min(u.x1, v.x1) - Math.max(u.x0, v.x0)), iy = Math.max(0, Math.min(u.y1, v.y1) - Math.max(u.y0, v.y0));
    const inter = ix * iy, uni = (u.x1 - u.x0) * (u.y1 - u.y0) + (v.x1 - v.x0) * (v.y1 - v.y0) - inter;
    if (uni > 0 && inter / uni > 0.8 && ((v.a > 0.05 && v.a < 0.95) || (u.a > 0.05 && u.a < 0.95))) hit.add(c);
  }
  for (const c of new Set([...bl.keys(), ...hit])) { let r = bl.get(c);
    if (r && smp.t - r.t1 > STEP * 2.5) { blDone.push(r); bl.delete(c); r = null; }
    if (!hit.has(c)) continue;
    if (!r) { r = { clip: c, t0: smp.t, t1: smp.t }; bl.set(c, r); } r.t1 = smp.t; }
}
blDone.push(...bl.values());
for (const r of blDone) { const held = r.t1 - r.t0 + STEP; if (held >= 0.25) finds.push({ sev: 'WARN', rule: 'BLEND', t0: r.t0, t1: r.t1, clip: nameOf(r.clip), why: `two frames of one clip mixed for ${f(held)} s: slow motion by blending ghosts faces` }); }
finds.sort((a, b) => (a.sev === b.sev ? a.t0 - b.t0 : a.sev === 'FAIL' ? -1 : 1));
const fails = finds.filter((x) => x.sev === 'FAIL').length, warns = finds.length - fails;
const clips = new Set(samples.flatMap((s) => s.img.map((d) => clipOf(d.id))));
console.log(`PLATE AUDIT   ${path.basename(film)}   ${W}x${H}, ${f(D)} s, a sample every ${STEP} s, ${clips.size} big pictures or clips`);
if (errs.length) console.log('  page errors while drawing: ' + errs.slice(0, 3).join(' | '));
if (!clips.size) console.log('  no picture covering a fifth of the frame was drawn: nothing to measure (a code-only film?)');
for (const x of finds) console.log(`  ${x.sev}  ${x.rule.padEnd(7)} ${(f(x.t0) + '-' + f(x.t1) + ' s').padEnd(15)} ${x.clip.padEnd(34)} ${x.why}`);
console.log(fails ? `PLATE AUDIT: FAIL   ${fails} to fix, ${warns} to look at` : warns ? `PLATE AUDIT: PASS with ${warns} to look at` : 'PLATE AUDIT: PASS');
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ film: path.basename(film), W, H, D, step: STEP, finds }, null, 1));
process.exit(fails ? 1 : 0);
