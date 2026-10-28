(function () {
// Life for code-drawn characters: every value is a pure function of t (seconds), so frames render in any order.
// Tested blind on 23 Oct 2026: wide shot, close-up and medium shot; the version with these won all three.
// Idea credit: rossark0's rossark-motion-skill (MIT). This implementation is our own.
//
//   <script src="life.js"></script>   then   const { flow, blinkLid, eyesLead, settle } = window.Life;
//   const pitch = flow(KEYS.pitch, t);                 // a pose chain that never stops dead or overshoots
//   const lid   = blinkLid(t, [1.52, 4.52, 7.05]);     // 0 open .. 1 shut; put blinks where the head turns
//   const gaze  = eyesLead(KEYS.look, t);              // eyes arrive about 0.1 s before the head
//   const fore  = armBend + settle(KEYS.upperArm, t);  // a child limb trails its parent, no wobble

const easeIO = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// Monotone cubic through [[time, value], ...]: keeps moving through a pose, never overshoots.
function flow(keys, t) {
  const n = keys.length;
  if (t <= keys[0][0]) return keys[0][1];
  if (t >= keys[n - 1][0]) return keys[n - 1][1];
  const x = keys.map(k => k[0]), y = keys.map(k => k[1]), d = [], m = [];
  for (let i = 0; i < n - 1; i++) d.push((y[i + 1] - y[i]) / (x[i + 1] - x[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  let i = 0; while (t > x[i + 1]) i++;
  const h = x[i + 1] - x[i], u = (t - x[i]) / h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * y[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * y[i + 1] + (u3 - u2) * h * m[i + 1];
}

// Lid closure for blinks starting at the given times: close 110 ms, hold 40 ms, open 190 ms.
// Render at 60 fps or keep blinks at least this long: shorter ones flicker at 30 fps.
function blinkLid(t, times) {
  let lid = 0;
  for (const b of times) {
    const u = t - b;
    if (u >= 0 && u < 0.11) lid = Math.max(lid, easeIO(u / 0.11));
    else if (u >= 0.11 && u < 0.15) lid = 1;
    else if (u >= 0.15 && u < 0.34) lid = Math.max(lid, Math.pow(1 - (u - 0.15) / 0.19, 3));
  }
  return lid;
}

// The same keys as the head, read a little ahead, so the eyes get there first.
const eyesLead = (keys, t, lead = 0.1) => flow(keys, t + lead);

// Follow-through as a delayed copy of the parent: add this to the child's own angle.
// It trails the parent and catches up without the wobble a spring would add.
const settle = (parentKeys, t, delay = 0.09, strength = 0.45) => strength * (flow(parentKeys, t - delay) - flow(parentKeys, t));

const api = { flow, blinkLid, eyesLead, settle };
if (typeof window !== 'undefined') window.Life = api;
if (typeof module !== 'undefined') module.exports = api;
})();
