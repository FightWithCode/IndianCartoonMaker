// Parametric faces: per-character "face DNA" + a FACS-style control layer (expressions and visemes both drive it).
// Head local space: origin at the face centre, character faces +x (3/4 view), skull top ~ -56, chin ~ +44.
(() => {
  const { clamp, mix, ink, P, E, poly, spline, shade, grad, tube, noise } = Lab;

  const closed = (pts, per = 8) => {
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

  // ---- Face DNA presets. Every field is optional; these are archetypes that a story can tweak per character.
  const base = {
    skullW: 40, top: -57, back: -44, jawW: .78, chin: 44, chinX: 16, cheek: .45, double: 0, faceLen: 1,
    eyeY: -3, eyeSize: 1, eyeGap: 25, eyeShape: .66, lid: 0, lash: 0, bags: 0, iris: '#3a2620',
    browW: 3.4, browArch: .25, browY: -15, browColor: '#272226', bushy: 0,
    noseLen: 1, noseW: 1, noseType: 'straight',
    mouthY: 23, mouthW: 12, lips: .3, lipColor: null, gap: false,
    wrinkle: 0, sag: 0, blush: 0, stubble: 0,
    hair: 'crop', hairColor: '#252326', moustache: null, beard: null, beardColor: null,
    bindi: false, noseStud: false, earring: false, tilak: null, glasses: false,
    ear: 1, expressGain: 1, blinkRate: 1, headScale: 1,
  };
  const archetypes = {
    child: { skullW: 39, top: -52, jawW: .72, chin: 38, chinX: 13, cheek: .85, eyeY: 0, eyeSize: 1.06, eyeGap: 24, eyeShape: .78,
      browW: 2.6, browY: -12, noseLen: .7, noseType: 'button', mouthY: 22, mouthW: 10, lips: .3, blush: .45, hair: 'tuft', expressGain: 1.25 },
    youngWoman: { skullW: 39, jawW: .62, chin: 43, chinX: 15, cheek: .55, eyeSize: 1.12, eyeShape: .6, lash: 1, browW: 2.6, browArch: .55,
      noseLen: .85, noseW: .85, mouthW: 11.5, lips: .75, lipColor: '#9a4848', hair: 'bun', bindi: true, noseStud: true, earring: true },
    adultMan: { skullW: 41, jawW: .92, chin: 46, chinX: 17, cheek: .3, eyeSize: .98, eyeShape: .58, browW: 4.2, browArch: .12, noseLen: 1.08, noseW: 1.1,
      mouthW: 13, lips: .25, stubble: .45, hair: 'crop' },
    seth: { skullW: 47, back: -48, jawW: 1, chin: 50, chinX: 16, cheek: 1, double: 1, eyeSize: .8, eyeShape: .5, lid: .35, browW: 4.6, browArch: .5,
      noseLen: 1.05, noseW: 1.3, noseType: 'broad', mouthW: 12, lips: .45, moustache: 'curl', hair: 'turban', expressGain: 1.15, tilak: 'red' },
    elderWoman: { skullW: 38, jawW: .66, chin: 45, chinX: 15, cheek: .1, eyeSize: .9, eyeShape: .5, lid: .55, bags: 1, browW: 2, browColor: '#8b8480',
      noseLen: 1.05, noseType: 'hook', mouthW: 11, lips: .1, gap: true, wrinkle: 1, sag: .8, hair: 'greyBun', hairColor: '#b9b3ad',
      bindi: true, earring: true, expressGain: .8, blinkRate: .7 },
    elderMan: { skullW: 39, faceLen: 1.03, jawW: .74, chin: 46, chinX: 15, cheek: .1, eyeSize: .88, eyeShape: .5, lid: .5, bags: .9, browW: 4.4, browArch: .12,
      browColor: '#d8d3cb', bushy: .6, noseLen: 1.12, noseType: 'hook', mouthW: 11.5, lips: .1, wrinkle: .9, sag: .55, hair: 'crop', hairColor: '#c9c4bd',
      expressGain: .8, blinkRate: .7 },
    sage: { skullW: 38, faceLen: 1.06, jawW: .7, chin: 47, chinX: 15, cheek: 0, eyeSize: .85, eyeShape: .48, lid: .7, bags: 1, browW: 5.4, browArch: .1,
      browColor: '#eeeae2', bushy: 1, noseLen: 1.15, noseType: 'hook', mouthW: 11, lips: .1, wrinkle: 1, sag: .6,
      hair: 'jata', hairColor: '#e5e0d6', moustache: 'droop', beard: 'long', beardColor: '#f1eee8', tilak: 'tripund', expressGain: .7, blinkRate: .6 },
  };
  const dna = (type, over = {}) => ({ ...base, ...(archetypes[type] || {}), ...over });

  // ---- Expression controls (0..1). Expressions, visemes and gestures are all summed into this one set.
  const C0 = { smile: 0, frown: 0, jaw: 0, wide: 0, pucker: 0, closed: 0, teeth: 0, tongue: 0, lowerIn: 0, sneer: 0, press: 0,
    browIn: 0, browDown: 0, browUp: 0, browAsym: 0, lidUp: 0, lidDown: 0, squint: 0, cheek: 0, smirk: 0, gazeX: .55, gazeY: 0, blink: 0 };
  const expressions = {
    neutral: {},
    happy: { smile: .85, squint: .35, cheek: .6, browUp: .15, jaw: .1, teeth: .6 },
    laugh: { smile: 1, jaw: .6, squint: .9, cheek: 1, teeth: 1, browUp: .3 },
    sad: { browIn: 1, frown: .8, lidDown: .45, gazeY: .55, press: .2, gazeX: .2 },
    angry: { browDown: 1, frown: .45, lidUp: .3, sneer: .7, teeth: .7, jaw: .14, squint: .2 },
    surprised: { browUp: 1, lidUp: 1, jaw: .62, pucker: .3 },
    worried: { browIn: .85, browUp: .25, frown: .4, press: .55, lidUp: .25, gazeX: .1 },
    scared: { browIn: .7, browUp: .75, lidUp: 1, jaw: .3, wide: .75, teeth: .7, gazeX: -.2 },
    sly: { smirk: 1, squint: .55, browDown: .3, browAsym: .6, gazeX: .9 },
    thinking: { browAsym: 1, press: .5, smirk: .25, gazeX: -.2, gazeY: -.7 },
    disgust: { sneer: 1, squint: .45, frown: .55, browDown: .5, smirk: -.4 },
  };
  const blend = (...layers) => {
    const out = { ...C0 };
    for (const [ctl, w = 1] of layers) for (const k in ctl) out[k] = (out[k] ?? 0) + (ctl[k] - (k === 'gazeX' ? C0.gazeX : 0)) * w;
    return out;
  };

  // ---- Drawing ----------------------------------------------------------------------------
  function outline(d, c) {
    const jawDrop = c.jaw * 5.5;
    const L = d.faceLen, top = d.top * L, chin = d.chin * L + jawDrop + d.sag * 2;
    const w = d.skullW, ch = d.cheek;
    return closed([
      [2, top], [w * .74, top * .8], [w * .9, top * .38], [w * .92 + 1, -10], [w * .9 + ch * 5, 10],
      [d.chinX + 13 + ch * 7, chin - 13 + d.double * 2], [d.chinX + 1, chin], [d.chinX - 13 - d.double * 4, chin - 1 + d.double * 5],
      [-w * .55 * d.jawW - 6, chin * .62], [-w * .92, 14], [d.back, -16], [-w * .8, top * .78],
    ]);
  }

  function eye(ctx, x, y, sx, d, c, far, t) {
    const s = d.eyeSize;
    const ew = 8.6 * s, eh = ew * d.eyeShape;
    const open = clamp(1 - c.blink - d.lid * .28 - c.squint * .38 - c.lidDown * .4 + c.lidUp * .38, 0, 1.4);
    const lower = clamp(c.squint * .5 + c.cheek * .22 + d.bags * .05, 0, .8);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx, 1);
    const inner = far ? -1 : 1; // inner corner side (toward nose) for the slant
    const lx = -ew, rx = ew, ly = inner < 0 ? -1 : .6, ry = inner < 0 ? .6 : -1;
    const topY = -eh * 2 * open, botY = eh * 1.7 * (1 - lower);
    const shape = new Path2D(`M${lx} ${ly} Q0 ${topY} ${rx} ${ry} Q0 ${botY} ${lx} ${ly}Z`);
    if (open > .06) {
      ctx.fillStyle = '#fbf5ea';
      ctx.fill(shape);
      ctx.save();
      ctx.clip(shape);
      const gx = clamp(c.gazeX, -1, 1) * ew * .42, gy = clamp(c.gazeY, -1, 1) * eh * .45 + (1 - open) * 1.5;
      const ir = eh * (d.eyeShape > .8 ? .98 : 1.08);
      E(ctx, gx, gy, ir * .9, ir, shade(d.iris, -18));
      E(ctx, gx, gy + ir * .12, ir * .74, ir * .82, d.iris);
      E(ctx, gx, gy + ir * .42, ir * .5, ir * .32, shade(d.iris, 26));
      E(ctx, gx, gy, ir * .46, ir * .5, '#140c0b');
      E(ctx, gx + ir * .35, gy - ir * .4, ir * .26, ir * .26, 'rgba(255,255,255,.95)');
      E(ctx, gx - ir * .35, gy + ir * .35, ir * .12, ir * .12, 'rgba(255,255,255,.6)');
      // upper lid shadow
      ctx.fillStyle = 'rgba(60,30,25,.18)';
      ctx.fillRect(-ew, topY / 2 - 4, ew * 2, 5);
      ctx.restore();
    }
    // upper lid line (thicker = stronger read at small sizes)
    const lidY = open > .06 ? topY : eh * .55;
    P(ctx, `M${lx - 1} ${ly + .5} Q0 ${lidY} ${rx + 1} ${ry}`, null, '#24181a', 2.5 + d.lash * .8);
    if (d.lash) { const ox = far ? rx : lx, oy = far ? ry : ly, dir = far ? 1 : -1; P(ctx, `M${ox} ${oy} q${dir * 4} -1 ${dir * 6} -4 M${ox - dir * 2} ${oy - 2} q${dir * 3} -2 ${dir * 4} -6`, null, '#24181a', 1.5); }
    if (open > .06) P(ctx, `M${lx + 2} ${ly + 1} Q0 ${botY} ${rx - 2} ${ry + 1}`, null, 'rgba(70,40,35,.45)', 1);
    // crease
    if (d.eyeSize < 1.25) P(ctx, `M${lx + 1} ${ly - 3} Q0 ${Math.min(lidY, -eh) - 5 - c.lidUp * 2} ${rx - 1} ${ry - 3}`, null, shade('#7a4a3a', 0) + '88', 1.1);
    if (d.bags > 0) P(ctx, `M${lx + 2} ${botY + 3} Q0 ${botY + 7} ${rx - 1} ${ry + 3}`, null, 'rgba(80,45,35,.45)', 1.1);
    if (d.wrinkle > 0 || c.cheek > .6) {
      const o = far ? rx : lx, dir = far ? 1 : -1, a = clamp(d.wrinkle * .6 + c.cheek * .4 * (d.wrinkle + .3), 0, 1);
      if (a > .15) P(ctx, `M${o + dir * 2} ${-1} l${dir * 5} -3 M${o + dir * 2} ${2} l${dir * 6} 1 M${o + dir * 1} ${5} l${dir * 5} 4`, null, `rgba(80,45,35,${.5 * a})`, 1);
    }
    ctx.restore();
  }

  function brow(ctx, x, y, sx, d, c, far) {
    const s = d.eyeSize * .9 + .1;
    const inUp = c.browIn * 6.5, down = c.browDown * 5.5, up = c.browUp * 7 + (far ? c.browAsym * 6 : -c.browAsym * 1.5);
    const innerX = far ? -10 * s : 10 * s, outerX = far ? 12 * s : -12 * s;
    const innerY = y - up - inUp + down * 1.2, outerY = y - up + 1 + down * .1 - inUp * .25;
    const mid = [(innerX + outerX) / 2, (innerY + outerY) / 2 - 2.6 - d.browArch * 4 + c.browIn * 1.5 + down * .2];
    ctx.save();
    ctx.translate(x, 0);
    ctx.scale(sx, 1);
    const pts = [[outerX, outerY], mid, [innerX, innerY + down * .4]];
    tube(ctx, pts, d.browW * .55, d.browW * (1.1 + d.bushy * .4), d.browColor, d.bushy ? shade(d.browColor, -60) : null, 1);
    if (d.bushy) for (let i = 0; i < 6; i++) P(ctx, `M${mix(outerX, innerX, i / 5)} ${mix(outerY, innerY, i / 5) - 1} l${far ? 3 : -3} ${-3 - (i % 2) * 2}`, null, d.browColor, 1.6);
    ctx.restore();
  }

  function nose(ctx, d, c, skin) {
    const L = d.noseLen, W = d.noseW, x = 19, top = d.eyeY + 2, tip = d.eyeY + 18 * L + (d.noseType === 'button' ? -2 : 0);
    const dark = shade(skin, -48);
    if (d.noseType === 'button') {
      P(ctx, `M${x - 2} ${tip - 5} Q${x + 5} ${tip - 2} ${x + 1} ${tip + 2}`, null, dark, 1.6);
      E(ctx, x + 2, tip - 3, 2.6, 2.2, 'rgba(255,255,255,.25)');
      return;
    }
    const hook = d.noseType === 'hook' ? 3 : 0;
    P(ctx, `M${x - 2} ${top + 2} Q${x + 5 + hook} ${mix(top, tip, .5)} ${x + 7} ${tip - 4}`, null, 'rgba(90,45,35,.12)', 4);
    P(ctx, `M${x - 6} ${top} Q${x + 2 + hook} ${mix(top, tip, .55)} ${x + 5 + hook * .4} ${tip - 1 + hook * .5}`, null, shade(skin, -26), 1.3);
    P(ctx, `M${x + 5} ${tip - 1 + hook * .5} Q${x + 3} ${tip + 4} ${x - 2} ${tip + 3} Q${x - 6 * W} ${tip + 4 + c.sneer} ${x - 8 * W} ${tip - 1 - c.sneer * 2}`, null, dark, 1.7);
    E(ctx, x - 1, tip + 1.2, 2.1 * W, 1.1, shade(skin, -60));
    E(ctx, x + 2, tip - 4, 2.4, 2, 'rgba(255,255,255,.22)');
    if (d.noseStud) E(ctx, x - 6, tip - 1, 1.5, 1.5, '#f2d27a', '#8a6420', .6);
  }

  function mouth(ctx, d, c, skin) {
    const mx = 15, my = d.mouthY * d.faceLen + c.jaw * 1.5;
    const mw = d.mouthW * (1 + c.wide * .28 - c.pucker * .42 + c.smile * .16 - c.press * .1);
    const smirk = c.smirk;
    const lc = [mx - mw * 1.05, my - c.smile * 5 + c.frown * 5 - smirk * .5 + c.wide * .5];
    const rc = [mx + mw * .82, my - c.smile * 5 + c.frown * 5 - smirk * 4.5 + c.wide * .5];
    const open = c.closed > .5 ? 0 : clamp(c.jaw * 15 * (1 - c.closed) - c.press * 2, 0, 18);
    const lipCol = d.lipColor || shade(skin, -34);
    const upperY = my - 1.5 - c.sneer * 2.2 + c.pucker * 1;
    if (c.pucker > .45 && open > 1.5) {
      const rx = mw * .5, ry = open * .55 + 2.5;
      E(ctx, mx, my + open * .4, rx + 2.8, ry + 2.8, lipCol, ink, 1.2);
      E(ctx, mx, my + open * .4, rx, ry, '#4a2121');
      return { lc, rc, my };
    }
    if (open > 1.2) {
      const bot = my + open * 1.15 + c.frown * 1.5;
      const cav = new Path2D(`M${lc[0]} ${lc[1]} Q${mx} ${upperY - (c.smile - c.frown) * 1.2} ${rc[0]} ${rc[1]} Q${mx + 1} ${bot + 2} ${lc[0]} ${lc[1]}Z`);
      ctx.fillStyle = '#4a2121';
      ctx.fill(cav);
      ctx.save();
      ctx.clip(cav);
      if (c.teeth > .05) {
        ctx.fillStyle = '#fbf6ea';
        ctx.fillRect(lc[0] - 2, upperY - 6, rc[0] - lc[0] + 4, 6 + 5 * c.teeth);
        if (d.gap) { ctx.fillStyle = '#4a2121'; ctx.fillRect(mx + 2, upperY - 2, 3.5, 6 + 5 * c.teeth); }
        if (c.lowerIn > .2) { ctx.fillStyle = shade(lipCol, 10); ctx.fillRect(lc[0], upperY + 3 + 3 * c.teeth, rc[0] - lc[0], 8); }
      }
      if (c.tongue > .1 || open > 9) E(ctx, mx + 1, bot - 1 - c.tongue * 3, mw * .55, 3 + c.tongue * 2.5, '#c06a62');
      ctx.restore();
      ctx.lineWidth = 1.3 + d.lips * .8;
      ctx.strokeStyle = d.lipColor ? shade(d.lipColor, -30) : '#5b302b';
      ctx.stroke(cav);
      if (d.lips > .3) P(ctx, `M${lc[0] + 3} ${lc[1] + 2} Q${mx} ${bot + 4 + d.lips * 3} ${rc[0] - 3} ${rc[1] + 2}`, null, lipCol, 1.5 + d.lips * 2);
    } else {
      const mid = my + c.smile * 3.2 - c.frown * 3.4 + c.press * .5;
      if (d.lips > .3) {
        P(ctx, `M${lc[0] + 2} ${lc[1]} Q${mx} ${mid - 3.5 - d.lips * 2} ${rc[0] - 2} ${rc[1]} Q${mx} ${mid} ${lc[0] + 2} ${lc[1]}Z`, lipCol);
        P(ctx, `M${lc[0] + 3} ${lc[1] + .5} Q${mx} ${mid + 5 + d.lips * 3} ${rc[0] - 3} ${rc[1] + .5} Q${mx} ${mid} ${lc[0] + 3} ${lc[1] + .5}Z`, shade(lipCol, 12));
      }
      P(ctx, `M${lc[0]} ${lc[1]} Q${mx - mw * .3} ${mid + .6} ${mx} ${mid} Q${mx + mw * .35} ${mid + .6} ${rc[0]} ${rc[1]}`, null, '#5b302b', 2 - c.press * .3);
      if (d.lips > .3) E(ctx, mx + 1, mid + 3.2 + d.lips * 1.5, mw * .3, 1.1, 'rgba(255,235,225,.35)');
      P(ctx, `M${mx - 1} ${my - 9} Q${mx} ${my - 5} ${mx - 1} ${my - 3}`, null, 'rgba(90,45,35,.18)', 1.2);
      if (!d.lipColor) P(ctx, `M${mx - 4} ${mid + 5 + c.press} Q${mx + 1} ${mid + 7} ${mx + 5} ${mid + 5}`, null, shade(skin, -30), 1.1);
    }
    // smile / age lines
    if (c.smile > .35 || d.wrinkle > .3) {
      const a = clamp(Math.max(c.smile - .3, 0) * 1.4 + d.wrinkle * .55, 0, 1);
      P(ctx, `M${mx + 15} ${d.eyeY + 18 * d.noseLen + 2} Q${rc[0] + 6} ${my - 2} ${rc[0] + 3} ${rc[1] + 5}`, null, `rgba(90,45,35,${.5 * a})`, 1.3);
      P(ctx, `M${mx - 6} ${d.eyeY + 18 * d.noseLen + 3} Q${lc[0] - 6} ${my - 2} ${lc[0] - 3} ${lc[1] + 6}`, null, `rgba(90,45,35,${.45 * a})`, 1.3);
    }
    if (c.smile > .5 || c.cheek > .5) E(ctx, lc[0] - 1, lc[1] - 1, 1.6, 1.6, shade(skin, -30));
    return { lc, rc, my };
  }

  function hairBack(ctx, d, c, t) {
    const col = d.hairColor, dk = shade(col, -22);
    if (d.hair === 'bun' || d.hair === 'greyBun') {
      E(ctx, -40, -24, 17, 18, col, ink, 1.8);
      P(ctx, 'M-52 -30 Q-46 -12 -32 -14', null, shade(col, 25), 1.4);
    }
    if (d.hair === 'braid') {
      E(ctx, -40, -26, 13, 14, col, ink, 1.6);
      const sw = noise(t * .8) * 2;
      for (let i = 0; i < 6; i++) E(ctx, -44 + sw * i * .2, -10 + i * 11, 7 - i * .5, 7, col, ink, 1.2);
      P(ctx, `M${-46 + sw} 56 l4 8 l4 -8`, '#c2402f');
    }
    if (d.hair === 'jata') {
      for (let i = 0; i < 4; i++) {
        const sway = noise(t * .6 + i) * 3;
        P(ctx, `M${-34 - i * 3} -20 Q${-46 - i * 4 + sway} 20 ${-40 - i * 5 + sway * 2} ${62 + i * 6} l5 2 Q${-36 - i * 4 + sway} 20 ${-26 - i * 3} -18Z`, col, shade(col, -55), 1.1);
      }
    }
  }

  function hairFront(ctx, d, c, t, skin) {
    const col = d.hairColor, light = shade(col, 30), L = d.faceLen, top = d.top * L;
    if (d.hair === 'braid') d = { ...d, hair: 'bun' };
    if (d.hair === 'topi') {
      P(ctx, `M${d.back + 3} -8 Q${d.back - 2} ${top * .5} -20 ${top * .62} L${d.skullW * .8} ${top * .55} Q${d.skullW * .95} ${top * .4} ${d.skullW * .86} ${top * .3} Q0 ${top * .36} -26 -6 Z`, col, ink, 1.6);
      P(ctx, `M${d.back - 2} ${top * .55} Q${d.back} ${top - 8} 4 ${top - 6} Q${d.skullW + 2} ${top - 2} ${d.skullW + 4} ${top * .52} Q4 ${top * .4} ${d.back - 2} ${top * .55}Z`, '#f3eee2', ink, 2);
      P(ctx, `M${d.back + 4} ${top * .7} Q4 ${top * .62} ${d.skullW} ${top * .66}`, null, '#cfc6b0', 1.6);
      return;
    }
    if (d.hair === 'bald') {
      P(ctx, `M${d.back + 2} 4 Q${d.back - 2} -14 ${d.back + 6} -24 L-24 -10 Q-28 0 -26 8Z`, col, ink, 1.3);
      P(ctx, `M-22 ${top + 6} Q0 ${top - 2} 20 ${top + 6}`, null, 'rgba(255,255,255,.22)', 3);
      return;
    }
    if (d.hair === 'crop' || d.hair === 'tuft') {
      P(ctx, `M${d.back + 3} -8 Q${d.back - 3} ${top * .6} ${-20} ${top - 3} Q8 ${top - 9} ${d.skullW * .72} ${top * .78} Q${d.skullW * .95} ${top * .55} ${d.skullW * .86} ${top * .3}
        Q${d.skullW * .6} ${top * .5} ${d.skullW * .25} ${top * .55} Q${0} ${top * .38} ${-18} ${top * .52} Q${-26} ${-10} ${-30} 4 Q${-34} -6 ${d.back + 3} -8Z`, col, ink, 1.8);
      P(ctx, `M-16 ${top + 4} Q6 ${top - 2} 24 ${top * .78}`, null, light, 1.6);
      if (d.hair === 'tuft') P(ctx, `M0 ${top - 4} q4 -12 12 -10 q-6 2 -5 9 M8 ${top - 3} q8 -8 14 -3`, col, ink, 1.6);
      // sideburn
      P(ctx, `M-27 -6 L-24 10 L-21 -4Z`, col);
    } else if (d.hair === 'bun' || d.hair === 'greyBun') {
      P(ctx, `M${d.back + 2} 0 Q${d.back - 4} ${top * .7} ${-12} ${top - 2} Q14 ${top - 6} ${d.skullW * .76} ${top * .74} Q${d.skullW * .97} ${top * .45} ${d.skullW * .9} ${top * .14}
        Q${d.skullW * .62} ${top * .52} ${8} ${top * .66} Q${-10} ${top * .55} ${-22} ${top * .3} Q${-28} -4 ${-30} 8 Q${-36} 0 ${d.back + 2} 0Z`, col, ink, 1.8);
      P(ctx, `M8 ${top * .66} Q${2} ${top * .78} ${-2} ${top * .9}`, null, shade(col, 35), 1.2); // parting
      P(ctx, `M-2 ${top * .6} Q14 ${top * .7} ${d.skullW * .7} ${top * .6}`, null, light, 1.2);
      if (d.hair === 'greyBun') P(ctx, `M-26 ${top * .5} Q-10 ${top * .8} 4 ${top * .7}`, null, shade(col, -30), 1);
    } else if (d.hair === 'turban') {
      const tc = d.turbanColor || '#d9a531', td = shade(tc, -55);
      P(ctx, `M${d.back - 4} 0 Q${d.back - 10} ${top * .8} ${-8} ${top - 12} Q${d.skullW} ${top - 14} ${d.skullW + 6} ${top * .42} Q${d.skullW * .7} ${top * .28} ${8} ${top * .35} Q${-20} ${top * .32} ${-30} ${-2} Z`, tc, ink, 2.2);
      for (let i = 0; i < 4; i++) P(ctx, `M${d.back - 2 + i * 2} ${-4 - i * 12} Q${0} ${top * .3 - i * 10} ${d.skullW + 4 - i * 2} ${top * .4 - i * 9}`, null, td, 2);
      P(ctx, `M-6 ${top * .35} Q-4 ${top - 4} 4 ${top - 18} l4 10 Z`, '#f3ead0', '#9a8a60', 1);
      E(ctx, 2, top * .42, 4, 4, '#c42f45', '#7a1d2c', .8);
    } else if (d.hair === 'jata') {
      P(ctx, `M${d.back + 2} -4 Q${d.back - 2} ${top * .7} -10 ${top - 2} Q14 ${top - 6} ${d.skullW * .7} ${top * .8} Q${d.skullW * .9} ${top * .5} ${d.skullW * .86} ${top * .34} Q${d.skullW * .5} ${top * .6} -10 ${top * .55} Q-26 -10 -30 6Z`, col, shade(col, -55), 1.6);
      ctx.save(); ctx.translate(2, top - 10);
      E(ctx, 0, 0, 22, 14, col, shade(col, -55), 1.6); E(ctx, 0, -10, 15, 10, shade(col, -8), shade(col, -55), 1.4); E(ctx, 0, -18, 8, 6, col, shade(col, -55), 1.2);
      ctx.restore();
    }
  }

  function facialHair(ctx, d, c, m, skin, back) {
    if (!m) return;
    const col = d.beardColor || d.hairColor;
    if (back && d.beard === 'long') {
      P(ctx, `M-28 6 Q-30 40 -10 70 Q6 96 22 ${84 + c.jaw * 4} Q34 60 ${d.skullW * .88} 18 Q30 30 ${m.rc[0]} ${m.my + 6} Q${15} ${m.my + 12} ${m.lc[0]} ${m.my + 5} Q-12 24 -28 6Z`, col, shade(col, -45), 1.6);
      for (let i = 0; i < 6; i++) P(ctx, `M${-14 + i * 7} ${40 + (i % 2) * 6} q2 18 ${-1 + i} 30`, null, shade(col, -25), 1.1);
    }
    if (back && d.beard === 'short') {
      P(ctx, `M-26 4 Q-24 34 ${d.chinX - 6} ${d.chin + 10 + c.jaw * 5} Q${d.chinX + 14} ${d.chin + 6} ${d.skullW * .86} 14 Q30 28 ${m.rc[0] + 2} ${m.my + 5} Q15 ${m.my + 12} ${m.lc[0] - 2} ${m.my + 4} Q-8 22 -26 4Z`, col, shade(col, -45), 1.4);
      for (let i = 0; i < 5; i++) P(ctx, `M${-14 + i * 8} ${28 + (i % 2) * 5} q2 7 1 12`, null, shade(col, -22), 1);
    }
    if (back) return;
    if (d.moustache === 'thin') {
      P(ctx, `M${m.lc[0] - 2} ${m.lc[1] - 3} Q15 ${m.my - 8} ${m.rc[0] + 2} ${m.rc[1] - 3} Q15 ${m.my - 4} ${m.lc[0] - 2} ${m.lc[1] - 3}Z`, '#221c1e', null);
    }
    if (d.stubble) {
      ctx.save();
      ctx.globalAlpha = d.stubble * .2;
      P(ctx, `M-26 4 Q-22 32 ${d.chinX} ${d.chin + c.jaw * 5.5} Q${d.chinX + 16} ${d.chin - 10} ${d.skullW * .9} 12 Q30 22 ${m.rc[0] + 2} ${m.my} Q15 ${m.my + 10} ${m.lc[0] - 2} ${m.my} Q-8 18 -26 4Z`, '#3a2a28');
      ctx.restore();
    }
    if (d.moustache === 'curl') {
      P(ctx, `M${m.lc[0] - 8} ${m.lc[1] - 6} q-6 -2 -6 -8 q4 6 10 4 Q${15} ${m.my - 10} ${m.rc[0] + 2} ${m.rc[1] - 4} q8 -2 10 -10 q2 9 -8 13 Q${15} ${m.my - 2} ${m.lc[0] - 8} ${m.lc[1] - 6}Z`, '#221c1e', ink, 1);
    } else if (d.moustache === 'droop') {
      P(ctx, `M${m.lc[0] - 4} ${m.lc[1] + 10} Q${m.lc[0] - 3} ${m.my - 8} 15 ${m.my - 7} Q${m.rc[0] + 5} ${m.my - 8} ${m.rc[0] + 4} ${m.rc[1] + 10} Q${m.rc[0]} ${m.my - 1} 15 ${m.my - 2} Q${m.lc[0]} ${m.my - 1} ${m.lc[0] - 4} ${m.lc[1] + 10}Z`, col, shade(col, -45), 1);
    }
  }

  // Draws a head. c = controls (already blended). t = time for hair motion.
  function head(ctx, d, c, skin, t = 0, opts = {}) {
    c = { ...C0, ...c };
    const g = d.expressGain;
    for (const k of ['smile', 'frown', 'browIn', 'browDown', 'browUp', 'squint', 'sneer', 'cheek', 'smirk', 'lidUp']) c[k] = clamp(c[k] * g, -1, 1.3);
    ctx.save();
    ctx.scale(d.headScale, d.headScale);
    hairBack(ctx, d, c, t);
    const shape = outline(d, c);
    const sk = shade(skin, 18), sd = shade(skin, -22);
    poly(ctx, shape, grad(ctx, 30, -50, -30, 40, [sk, skin, sd]), ink, 2.1);
    // ear
    const ex = -d.skullW * .58, ey = d.eyeY + 9;
    E(ctx, ex, ey, 6.5 * d.ear, 9.5 * d.ear, skin, ink, 1.5);
    P(ctx, `M${ex - 2} ${ey - 4} Q${ex + 3} ${ey - 5} ${ex + 2} ${ey + 3}`, null, sd, 1.4);
    P(ctx, `M${ex - 3} ${ey - 7} Q${ex - 5} ${ey} ${ex - 1} ${ey + 6}`, null, shade(skin, -12), 1.1);
    if (d.earring) E(ctx, ex + 1, ey + 11, 2.6, 2.6, '#f2d27a', '#8a6420', .7);
    // jaw shadow + cheek warmth
    ctx.save();
    ctx.clip(new Path2D('M' + shape.map(p => p.join(' ')).join(' L') + 'Z'));
    P(ctx, `M${-d.skullW} -20 Q-18 0 -16 22 Q-4 ${d.chin + 6} ${d.chinX + 30} ${d.chin + 10} L-60 80Z`, 'rgba(70,35,25,.13)');
    if (d.blush || c.cheek > .3) E(ctx, 26, d.eyeY + 16, 9, 6, `rgba(220,90,80,${.22 * Math.max(d.blush, c.cheek * .7)})`);
    if (d.blush) E(ctx, -6, d.eyeY + 17, 9, 6, `rgba(220,90,80,${.2 * d.blush})`);
    if (d.lash && !d.blush) { E(ctx, -4, d.eyeY + 17, 10, 6, 'rgba(215,95,85,.10)'); E(ctx, 28, d.eyeY + 15, 6, 5, 'rgba(215,95,85,.09)'); }
    if (d.double) P(ctx, `M${d.chinX - 18} ${d.chin + 2} Q${d.chinX} ${d.chin + 12} ${d.chinX + 16} ${d.chin - 2}`, null, sd, 1.4);
    // forehead lines (deepen when brows go up)
    const fl = clamp(d.wrinkle * .7 + c.browUp * .5 + c.browIn * .35, 0, 1);
    if (fl > .2 && d.hair !== 'turban') for (let i = 0; i < 3; i++) P(ctx, `M${-8 + i * 2} ${d.browY + d.eyeY - 10 - i * 5} Q${10} ${d.browY + d.eyeY - 13 - i * 5 - c.browIn * 2} ${26 - i * 2} ${d.browY + d.eyeY - 10 - i * 5}`, null, `rgba(90,45,35,${.42 * fl})`, 1.1);
    if (c.browDown > .4) P(ctx, `M16 ${d.eyeY + d.browY + 2} l-1 -6 M20 ${d.eyeY + d.browY + 2} l1 -6`, null, `rgba(90,45,35,${.5 * c.browDown})`, 1.1);
    if (d.sag) P(ctx, `M${d.chinX + 18} ${d.chin - 12} Q${d.chinX + 14} ${d.chin - 4} ${d.chinX + 6} ${d.chin - 1}`, null, `rgba(90,45,35,${.4 * d.sag})`, 1.1);
    ctx.restore();
    // tilak / bindi
    if (d.bindi) E(ctx, 13, d.eyeY + d.browY - 7, 2.8, 2.8, '#c22a37');
    if (d.tilak === 'sandal') { P(ctx, `M12 ${d.eyeY + d.browY - 2} L12 ${d.eyeY + d.browY - 15}`, null, '#e8b04a', 3.2); E(ctx, 12, d.eyeY + d.browY - 5, 1.6, 1.6, '#c22a37'); }
    if (d.tilak === 'red') P(ctx, `M12 ${d.eyeY + d.browY - 2} L12 ${d.eyeY + d.browY - 14}`, null, '#c22a37', 2.6);
    if (d.tilak === 'tripund') P(ctx, `M-6 ${d.eyeY - 30} Q12 ${d.eyeY - 33} 30 ${d.eyeY - 30} M-6 ${d.eyeY - 25} Q12 ${d.eyeY - 28} 30 ${d.eyeY - 25} M-6 ${d.eyeY - 20} Q12 ${d.eyeY - 23} 30 ${d.eyeY - 20}`, null, '#f4f1ea', 2.1);
    if (d.tilak === 'tripund') E(ctx, 12, d.eyeY - 25, 1.8, 1.8, '#c22a37');
    const gapHalf = d.eyeGap / 2;
    brow(ctx, 15 - gapHalf, d.eyeY + d.browY, 1, d, c, false);
    brow(ctx, 15 + gapHalf * .92, d.eyeY + d.browY - 1, .74, d, c, true);
    eye(ctx, 15 - gapHalf, d.eyeY, 1, d, c, false, t);
    eye(ctx, 15 + gapHalf * .92, d.eyeY - .5, .72, d, c, true, t);
    if (c.tears > .05) {
      // tear streaks down both cheeks, with drops running down them
      for (const [ex, sx, off] of [[15 - gapHalf, 1, 0], [15 + gapHalf * .92, .72, .5]]) {
        const top = d.eyeY + 6 * d.eyeSize;
        P(ctx, `M${ex - 2 * sx} ${top} Q${ex - 5 * sx} ${top + 14} ${ex - 3 * sx} ${top + 30}`, null, `rgba(170,215,245,${.75 * c.tears})`, 2.6);
        const k = ((t * .7 + off) % 1);
        E(ctx, ex - 4 * sx, top + 4 + k * 28, 2.4 * sx + .6, 3.2, `rgba(190,228,255,${.9 * c.tears * (1 - k * .5)})`, 'rgba(90,140,180,.6)', .6);
      }
    }
    if (d.glasses) { E(ctx, 15 - gapHalf, d.eyeY, 11, 9, null, '#3a2a22', 1.8); E(ctx, 15 + gapHalf * .92, d.eyeY, 8, 9, null, '#3a2a22', 1.8); }
    nose(ctx, d, c, skin);
    const m = mouth(ctx, d, c, skin);
    facialHair(ctx, d, c, m, skin, true);
    facialHair(ctx, d, c, m, skin, false);
    hairFront(ctx, d, c, t, skin);
    if (d.veil) {
      const v = d.veil, top = d.top * d.faceLen;
      P(ctx, `M${d.back - 8} 40 Q${d.back - 16} ${top * .4} -10 ${top - 8} Q${d.skullW} ${top - 10} ${d.skullW + 6} ${top * .35} Q${d.skullW * .6} ${top * .55} 8 ${top * .6} Q-22 ${top * .4} -30 4 Q-32 30 -26 46Z`, grad(ctx, 0, top, 0, 40, [shade(v, 14), v, shade(v, -26)]), ink, 1.8);
      P(ctx, `M-6 ${top - 2} Q${d.skullW * .5} ${top - 4} ${d.skullW + 4} ${top * .4}`, null, d.veilEdge || shade(v, 40), 3);
    }
    ctx.restore();
  }

  // ---- Procedural blinks + micro-saccades, deterministic in t.
  function blinkAt(t, seed, rate = 1) {
    let s = seed * 7.13, tt = 0;
    while (tt < t + 1) {
      s = (s * 9301 + 49297) % 233280;
      const gap = (1.6 + (s / 233280) * 3.4) / rate;
      tt += gap;
      const dt = t - tt;
      if (dt > -0.01 && dt < .17) return Math.sin(clamp(dt / .17, 0, 1) * Math.PI);
      if ((s % 7) === 0) { const d2 = t - tt - .24; if (d2 > 0 && d2 < .15) return Math.sin(d2 / .15 * Math.PI); }
    }
    return 0;
  }
  const saccade = (t, seed) => {
    const k = Math.floor(t / .7 + seed);
    const h = n => { const s = Math.sin(n * 91.7 + seed) * 4375.85; return s - Math.floor(s); };
    return [(h(k) - .5) * .25, (h(k + 33) - .5) * .18];
  };

  // Build face DNA from the character fields storyboards already have (age, gender, build, hair, beard,
  // moustache, glasses, tilak, jewelry, veil). A per-name hash adds small differences so two characters
  // of the same type never share one face.
  const memo = new Map();
  function auto(ch) {
    if (ch.dna) return ch.dna;
    const id = [ch.name, ch.age, ch.gender, ch.build, ch.hair, ch.beard, ch.moustache, ch.veil, ch.primary, ch.accent].join('|');
    if (memo.has(id)) return memo.get(id);
    let h = 2166136261;
    for (const k of String(ch.name || id).replace(/\s*\(.*\)\s*$/u, '')) h = Math.imul(h ^ k.codePointAt(0), 16777619);
    const r = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296);
    const female = ch.gender === 'female', age = ch.age || 'adult', elder = age === 'elder', child = age === 'child';
    const type = child ? 'child' : female ? (elder ? 'elderWoman' : 'youngWoman') : ch.hair === 'jata' || ch.costume === 'ascetic' ? 'sage'
      : elder ? 'elderMan' : ch.build === 'stout' ? 'seth' : 'adultMan';
    const o = {};
    if (female) {
      o.hair = ch.hair === 'braid' ? 'braid' : (elder || ch.hair === 'grey') ? 'greyBun' : 'bun';
      if (elder || ch.hair === 'grey') o.hairColor = '#b9b3ad';
      o.earring = !!ch.jewelry || elder;
      o.noseStud = !!ch.jewelry && !child && age !== 'young';
      o.bindi = !child && age !== 'young';
      if (age === 'young') { o.lips = .55; o.blush = .15; }
      if (ch.build === 'stout') { o.cheek = .8; o.double = .5; o.skullW = 42; }
      if (ch.build === 'slim' && !elder) o.cheek = .4;
      if (ch.veil) o.veil = ch.primary || '#9b4d5c';
      if (!elder && ch.hair === 'grey') o.wrinkle = .5;
      if (child) { o.lash = 1; o.hair = ch.hair === 'braid' ? 'braid' : 'bun'; }
    } else {
      const map = { crop: child ? 'tuft' : 'crop', grey: 'crop', turban: 'turban', topi: 'topi', jata: 'jata', bald: 'bald', bun: 'crop', braid: 'crop' };
      o.hair = map[ch.hair] || (type === 'seth' ? 'turban' : 'crop');
      if (ch.hair === 'grey' || (elder && !['turban', 'jata'].includes(o.hair))) o.hairColor = '#c9c4bd';
      if (o.hair === 'turban') o.turbanColor = ch.accent && ch.accent !== ch.primary ? ch.accent : '#d9a531';
      o.moustache = ch.moustache ? (elder ? 'droop' : (ch.build === 'stout' || ch.jewelry === 'gold') ? 'curl' : 'thin') : null;
      const beard = ch.beard && ch.beard !== 'none' ? ch.beard : null;
      o.beard = beard === 'long' ? 'long' : beard ? 'short' : type === 'sage' ? 'long' : null;
      o.beardColor = elder || beard === 'white' || beard === 'grey' ? '#f1eee8' : '#2a2426';
      if (age === 'young') { o.stubble = 0; o.skullW = 40; o.jawW = .86; }
      if (type === 'adultMan') o.stubble = ch.patches || ch.mud ? .5 : .25;
      if (ch.build === 'slim') o.cheek = .15;
      if (ch.build === 'stout' && type !== 'seth') { o.cheek = .8; o.double = .6; o.skullW = 45; }
    }
    o.glasses = !!ch.glasses;
    o.tilak = ['red', 'tripund', 'sandal'].includes(ch.tilak) ? ch.tilak : null;
    const d = dna(type, o);
    d.eyeSize *= 1 + (r() - .5) * .1;
    d.noseLen *= 1 + (r() - .5) * .16;
    d.noseW *= 1 + (r() - .5) * .14;
    d.jawW = clamp(d.jawW + (r() - .5) * .12, .5, 1.05);
    d.mouthW *= 1 + (r() - .5) * .1;
    d.skullW += (r() - .5) * 2.5;
    d.browArch = clamp(d.browArch + (r() - .5) * .2, 0, .7);
    memo.set(id, d);
    return d;
  }

  // The engine's emotion vocabulary mapped to face controls.
  const ENGINE = { funny: 'laugh', laugh: 'laugh', think: 'thinking' };
  const exprOf = name => expressions[ENGINE[name] || name] || expressions.neutral;

  globalThis.Face = { dna, auto, exprOf, archetypes, expressions, blend, head, blinkAt, saccade, C0 };
})();
