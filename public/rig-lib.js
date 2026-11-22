// Shared helpers for the rig lab: easing, springs, 2-bone IK, seamless tapered limbs, noise.
(() => {
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const ink = '#422b28';
  const ease = {
    linear: t => t,
    smooth: t => t * t * (3 - 2 * t),
    inOut: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    out: t => 1 - Math.pow(1 - t, 3),
    in: t => t * t * t,
    backOut: t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  };
  const seg = (t, a, b, fn = ease.inOut) => fn(clamp((t - a) / (b - a), 0, 1));

  // Keyframe track: [[time, value, easeName?], ...]; value may be a number or array.
  function track(keys, t) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1, e] = keys[i];
      const [t0, v0] = keys[i - 1];
      if (t <= t1) {
        const k = (ease[e] || ease.inOut)((t - t0) / (t1 - t0));
        return Array.isArray(v0) ? v0.map((x, j) => mix(x, v1[j], k)) : mix(v0, v1, k);
      }
    }
    return keys[keys.length - 1][1];
  }

  // Damped spring that chases a target: gives overshoot + settle instead of linear blends.
  class Spring {
    constructor(value = 0, freq = 3, damp = .55) { this.x = value; this.v = 0; this.f = freq; this.z = damp; }
    step(target, dt) {
      const w = TAU * this.f;
      const n = Math.max(1, Math.ceil(dt / (1 / 240)));
      const h = dt / n;
      for (let i = 0; i < n; i++) {
        this.v += (w * w * (target - this.x) - 2 * this.z * w * this.v) * h;
        this.x += this.v * h;
      }
      return this.x;
    }
  }
  class Spring2 {
    constructor(x = 0, y = 0, f = 3, z = .55) { this.a = new Spring(x, f, z); this.b = new Spring(y, f, z); }
    step(x, y, dt) { return [this.a.step(x, dt), this.b.step(y, dt)]; }
    get x() { return this.a.x; } get y() { return this.b.x; }
  }

  // Analytic two-bone IK. The middle joint (elbow / knee) folds toward the pole point, so it can
  // never flip to the wrong side. minReach (fraction of full length) limits how far the limb folds.
  function ik(ax, ay, tx, ty, l1, l2, pole = 1, minReach = 0) {
    let dx = tx - ax, dy = ty - ay;
    let d = Math.hypot(dx, dy) || 1e-6;
    const max = (l1 + l2) * .9995, min = Math.max(Math.abs(l1 - l2) + .5, (l1 + l2) * minReach);
    if (d > max) { dx *= max / d; dy *= max / d; d = max; }
    if (d < min) { dx *= min / d; dy *= min / d; d = min; }
    const base = Math.atan2(dy, dx);
    const inner = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const sol = sgn => { const a = base - sgn * inner; return { mx: ax + Math.cos(a) * l1, my: ay + Math.sin(a) * l1, ex: ax + dx, ey: ay + dy }; };
    if (typeof pole === 'number') return sol(pole);
    const A = sol(1), B = sol(-1);
    const da = Math.hypot(A.mx - pole[0], A.my - pole[1]), db = Math.hypot(B.mx - pole[0], B.my - pole[1]);
    return da <= db ? A : B;
  }

  // Catmull-Rom sample through control points.
  function spline(points, per = 10) {
    const out = [];
    const p = [points[0], ...points, points[points.length - 1]];
    for (let i = 1; i < p.length - 2; i++) {
      for (let s = 0; s < per; s++) {
        const t = s / per, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p[i - 1][0], p[i][0], p[i + 1][0], p[i + 2][0]), f(p[i - 1][1], p[i][1], p[i + 1][1], p[i + 2][1])]);
      }
    }
    out.push(points[points.length - 1]);
    return out;
  }

  // A seamless, tapered limb along a smooth centre line: one outline, one fill, no joint discs.
  // o.open: 'start' leaves the root end unstroked so the limb melts into the torso.
  // o.cuff: flat, slightly flared end (sleeve hem / trouser hem) instead of a round cap.
  function tube(ctx, points, w0, w1, fill, stroke = ink, lw = 2, from = 0, to = 1, per = 10, o = {}) {
    const all = spline(points, per);
    const a = Math.floor(from * (all.length - 1)), b = Math.ceil(to * (all.length - 1));
    const pts = all.slice(a, b + 1);
    if (pts.length < 2) return;
    const left = [], right = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[Math.max(0, i - 1)], n = pts[Math.min(pts.length - 1, i + 1)];
      let dx = n[0] - p[0], dy = n[1] - p[1];
      const l = Math.hypot(dx, dy) || 1;
      dx /= l; dy /= l;
      const u = (a + i) / (all.length - 1);
      const k = i / (pts.length - 1);
      const flare = o.cuff ? 1 + .14 * Math.pow(k, 4) : 1;
      const w = mix(w0, w1, u) / 2 * (1 + .05 * Math.sin(u * Math.PI)) * flare;
      left.push([pts[i][0] - dy * w, pts[i][1] + dx * w]);
      right.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
    }
    const cap = (c, side) => {
      const r = Math.hypot(side[0] - c[0], side[1] - c[1]);
      const a0 = Math.atan2(side[1] - c[1], side[0] - c[0]);
      const out = [];
      for (let k = 1; k < 8; k++) out.push([c[0] + Math.cos(a0 - Math.PI * k / 8) * r, c[1] + Math.sin(a0 - Math.PI * k / 8) * r]);
      return out;
    };
    const endCap = o.cuff ? [] : cap(pts[pts.length - 1], left.at(-1));
    const startCap = o.open === 'start' ? [] : cap(pts[0], right[0]);
    const body = [...left, ...endCap, ...right.slice().reverse()];
    const path = (list, close) => { ctx.beginPath(); ctx.moveTo(list[0][0], list[0][1]); for (const q of list) ctx.lineTo(q[0], q[1]); if (close) ctx.closePath(); };
    if (fill) { path([...body, ...startCap], true); ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) {
      ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (o.open === 'start') path(body, false); else path([...body, ...startCap], true);
      ctx.stroke();
    }
    return pts;
  }

  const P = (ctx, d, fill, stroke, lw = 1.6) => {
    const s = new Path2D(d);
    if (fill) { ctx.fillStyle = fill; ctx.fill(s); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(s); }
  };
  const E = (ctx, x, y, rx, ry, fill, stroke, lw = 1, rot = 0) => {
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), rot, 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  };
  const poly = (ctx, pts, fill, stroke, lw = 1.6, close = true) => {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (close) ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
  };
  const closedSpline = (pts, per = 8) => {
    const n = pts.length, out = [];
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      for (let s = 0; s < per; s++) {
        const t = s / per, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    return out;
  };
  const smoothPoly = (ctx, pts, fill, stroke, lw = 1.8) => poly(ctx, closedSpline(pts), fill, stroke, lw);
  const shade = (hex, amt) => {
    const v = parseInt(hex.slice(1), 16);
    return '#' + [16, 8, 0].map(s => clamp(((v >> s) & 255) + amt, 0, 255).toString(16).padStart(2, '0')).join('');
  };
  const grad = (ctx, x0, y0, x1, y1, stops) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    return g;
  };
  const rng = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  // Cheap smooth 1D value noise.
  const hash = n => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
  const noise = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return mix(hash(i), hash(i + 1), u) * 2 - 1; };
  const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

  globalThis.Lab = { TAU, clamp, mix, ink, ease, seg, track, Spring, Spring2, ik, spline, tube, P, E, poly, smoothPoly, shade, grad, rng, noise, rot };
})();
