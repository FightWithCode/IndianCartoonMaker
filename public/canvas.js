(() => {
  const { clamp, mix, ease, key, ellipse, path, line, random, rect } = VillageDraw;
  const { W, H } = VillageScenery;
  const { height, person } = VillageCast;

  function imageUrl(id) {
    return id === 'banyan-square' ? '/plates/banyan-square.jpg' : '/media/' + id;
  }

  async function loadImages(timeline) {
    const ids = new Set(['characters', 'scenes', 'props'].flatMap(kind => timeline[kind].map(asset => asset.image)).filter(Boolean));
    const entries = await Promise.all([...ids].map(async id => {
      const img = new Image();
      img.src = imageUrl(id);
      await img.decode();
      return [id, img];
    }));
    return Object.fromEntries(entries);
  }

  function motionTrack(actor) {
    const { keys, ...initial } = actor;
    let last = { ...initial, at: 0 };
    return [last, ...keys.map(frame => {
      const defined = Object.fromEntries(Object.entries(frame).filter(([, value]) => value !== undefined));
      last = { ...last, ...defined };
      return last;
    })];
  }

  // Damped-spring step response: a small wind-up, a quick move, a slight overshoot, then settle.
  // Stateless (a function of the time since the key), so any frame can be drawn on its own.
  function springBlend(age, freq = 3.1, damping = .58, windup = .1) {
    if (age <= 0) return 0;
    if (age < windup) return -.07 * Math.sin(Math.PI * age / windup);
    const x = age - windup, w = 2 * Math.PI * freq, wd = w * Math.sqrt(1 - damping * damping);
    return 1 - Math.exp(-damping * w * x) * (Math.cos(wd * x) + damping * w / wd * Math.sin(wd * x));
  }

  // Planted-foot walking: the gait phase comes from the distance actually travelled, so the foot on the
  // ground never slides. Stride adapts to speed (women take shorter, quicker steps). When a walk ends the
  // last step shortens over 0.35 s instead of snapping to a standing pose.
  const WALKS = ['walk', 'run', 'sneak'];
  function walkAt(track, t, character) {
    const female = character.gender === 'female';
    let phase = 0, S = female ? 10 : 14, T = 1, endedAt = null;
    for (let i = 0; i < track.length && track[i].at <= t; i++) {
      const a = track[i], b = track[i + 1];
      if (!WALKS.includes(a.pose)) { endedAt = endedAt ?? null; continue; }
      const segEnd = b ? b.at : Infinity;
      const scale = height(character) * (a.size ?? 1) / 347;
      const v = b ? Math.abs((b.x - a.x) * W) / scale / Math.max(.05, b.at - a.at) : 0;
      if (v > 4) { S = clamp(v * (female ? .21 : .3), female ? 7 : 9, female ? 16 : 26); T = 2 * S / .6 / v; }
      else { S = female ? 10 : 14; T = 1; }
      phase += (Math.min(segEnd, t) - a.at) / T;
      endedAt = segEnd <= t ? segEnd : null;
    }
    const now = track.filter(f => f.at <= t).at(-1);
    if (now && WALKS.includes(now.pose)) return { walkPhase: phase, stride: S };
    if (endedAt != null && t - endedAt < .35) {
      const k = (t - endedAt) / .35;
      return { walkPhase: phase + (t - endedAt) / T, stride: S * (1 - ease(k)) };
    }
    return null;
  }

  function stateAt(track, t) {
    const nextIndex = track.findIndex(frame => frame.at > t);
    const index = nextIndex < 0 ? track.length - 1 : nextIndex - 1;
    const previous = track[index];
    const blend = {
      previousPose: track[index - 1]?.pose,
      poseBlend: index > 0 ? springBlend(t - previous.at) : 1,
      previousEmotion: track[index - 1]?.emotion,
      emotionBlend: index > 0 ? springBlend(t - previous.at, 2.4, .62, 0) : 1,
      previousStance: track[index - 1]?.stance,
      stanceBlend: ease(clamp((t - previous.at) / 0.46, 0, 1)),
    };
    if (nextIndex < 0) return { ...previous, ...blend };
    const next = track[nextIndex];
    const amount = clamp((t - previous.at) / (next.at - previous.at), 0, 1);
    const travel = ['walk', 'run', 'sneak'].includes(previous.pose) ? amount : ease(amount);
    const state = { ...previous, ...blend, x: mix(previous.x, next.x, travel), y: mix(previous.y, next.y, travel), size: mix(previous.size, next.size, travel) };
    if (previous.angle != null) state.angle = mix(previous.angle, next.angle, travel);
    if (previous.alpha != null) state.alpha = mix(previous.alpha, next.alpha ?? previous.alpha, travel);
    return state;
  }

  function portraitFit(shot, width, h) {
    const { frame, fit, zoom } = shot.camera;
    if (width >= h || !fit || shot.tracks.length < 2 || ['close', 'detail'].includes(frame)) return x => x;
    const positions = shot.tracks.flatMap(track => track.map(state => state.x)).filter(x => x >= 0.04 && x <= 0.96);
    if (positions.length < 2) return x => x;
    const left = Math.min(...positions);
    const right = Math.max(...positions);
    const center = (left + right) / 2;
    const worldWidth = width / (h / H) / (zoom ?? (frame === 'medium' ? 1.24 : 1.08));
    const span = Math.max(0.04, (worldWidth - 218) / W);
    const amount = Math.min(1, span / Math.max(span, right - left));
    return x => x < 0 || x > 1 ? x : center + (x - center) * amount;
  }

  function frameCamera(shot, actors, t, width, h) {
    const { camera } = shot;
    const portrait = width < h;
    const base = Math.max(width / W, h / H);
    const close = ['close', 'detail'].includes(camera.frame);
    const focus = actors.find(actor => key(actor.character.name) === key(camera.focus));
    const target = close ? focus || actors.find(actor => actor.speaking) || actors[0]
      : portrait && camera.fit && actors.length > 1 ? undefined : focus;
    const group = target ? [target] : actors;
    const xs = group.map(item => item.state.x * W);
    const ys = group.map(item => item.state.y * H);
    const heights = group.map(item => height(item.character) * item.state.size * (1 - VillageCast.stanceDrop(item.state) / 347));
    const average = (values, fallback) => values.length ? values.reduce((sum, val) => sum + val, 0) / values.length : fallback;
    const horizontalSpan = xs.length > 1 ? Math.max(...xs) - Math.min(...xs) : 0;
    const groupX = xs.length ? (Math.min(...xs) + Math.max(...xs)) * 0.5 : W / 2;
    const near = { wide: 1, medium: 1.35, close: 2.22, detail: 3.18 }[camera.frame];
    const fittingZoom = !target && horizontalSpan ? Math.max(1, width / (horizontalSpan + 220) / base) : near;
    const duration = Math.max(shot.duration, 0.01);
    const move = ease(clamp(t / duration, 0, 1));
    const movement = { push: 0.065 * move, pull: 0.065 * (1 - move), 'pan-left': 0.13, 'pan-right': 0.13 }[camera.move] || 0;
    const zoom = Math.max(1, camera.zoom ?? Math.min(near, fittingZoom)) + movement;
    const scale = base * zoom;
    const y = average(ys, H * 0.85);
    const body = average(heights, H * 0.52);
    const targetY = y - body * ({ wide: 0.53, medium: 0.57, close: 0.68, detail: 0.79 }[camera.frame]);
    const pan = ({ 'pan-left': 1, 'pan-right': -1 }[camera.move] || 0) * (0.5 - move) * width / scale * 0.16;
    const x = camera.x == null ? (portrait || camera.frame !== 'wide' ? groupX : mix(W / 2, groupX, 0.25)) : camera.x * W;
    const yAim = camera.y == null ? (camera.frame === 'wide' ? H * 0.5 : targetY) : camera.y * H;
    return {
      scale, x: clamp(x + pan, width / scale / 2, W - width / scale / 2),
      y: clamp(yAim, h / scale / 2, H - h / scale / 2),
    };
  }

  function atmosphere(ctx, shot, t) {
    const rng = random(shot.sceneSeed);
    if (shot.weather === 'rain') {
      for (let i = 0; i < 125; i++) {
        const x = (rng() * W + W * 5 - t * 135 % W) % W;
        const y = (rng() * H + t * (390 + rng() * 225)) % H;
        line(ctx, x, y, x - 11, y + 33, 'rgba(228,241,241,.22)', 1.8);
      }
      return;
    }
    if (shot.time === 'night' || shot.time === 'dusk') {
      for (let i = 0; i < 24; i++) {
        const x = (rng() * W + t * (8 + rng() * 13)) % W;
        const y = 327 + rng() * 488 + Math.sin(t * 1.3 + i * 2) * 14;
        const glow = Math.max(0, Math.sin(t * 2.8 + i * 2));
        ellipse(ctx, x, y, 1.8 + glow * 1.3, 1.8 + glow * 1.3, `rgba(255,227,133,${glow * 0.64})`);
      }
    } else if (!['home', 'shop', 'school'].includes(shot.sceneKind)) {
      for (let i = 0; i < 34; i++) {
        const x = (rng() * W + t * (6 + rng() * 21)) % W;
        const y = 199 + rng() * 622 + Math.sin(t * 1.8 + i) * 9;
        ellipse(ctx, x, y, 1.0 + rng() * 2, 0.8 + rng() * 1.2, 'rgba(255,234,176,.35)');
      }
      if (shot.camera.frame === 'wide' && shot.weather === 'clear') {
        for (let i = 0; i < 6; i++) {
          const x = (250 + i * 32 + t * 39) % W;
          const y = 154 + i % 3 * 22 + Math.sin(t * 2 + i) * 9;
          const flap = Math.sin(t * 8 + i * 0.5) * 6;
          path(ctx, `M${x - 9} ${y - flap} q5 -4 9 3 q4 -7 9 ${-flap - 3}`, null, 'rgba(65,75,75,.63)', 1.7);
        }
      }
    }
  }


  const TAU = Math.PI * 2;
  const frac = value => value - Math.floor(value);

  // Concave four-point sparkle with a soft halo. Drawn additively.
  function star(ctx, x, y, r, alpha, tone = '255,226,150') {
    if (alpha <= 0.01) return;
    const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 1.9);
    halo.addColorStop(0, 'rgba(255,252,236,' + alpha * 0.85 + ')');
    halo.addColorStop(0.28, 'rgba(' + tone + ',' + alpha * 0.42 + ')');
    halo.addColorStop(1, 'rgba(' + tone + ',0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.9, 0, TAU);
    ctx.fill();
    const long = r * 2.7;
    const pinch = r * 0.1;
    ctx.fillStyle = 'rgba(255,250,232,' + Math.min(1, alpha) + ')';
    ctx.beginPath();
    ctx.moveTo(x, y - long);
    ctx.quadraticCurveTo(x + pinch, y - pinch, x + long, y);
    ctx.quadraticCurveTo(x + pinch, y + pinch, x, y + long);
    ctx.quadraticCurveTo(x - pinch, y + pinch, x - long, y);
    ctx.quadraticCurveTo(x - pinch, y - pinch, x, y - long);
    ctx.fill();
  }

  const glitterTones = ['255,226,150', '255,236,190', '255,198,140', '255,246,222', '255,214,170'];

  // Screen-space particle effects. Every position is a pure function of the shot's
  // seed and time, so re-rendering the same storyboard is frame-identical.
  // ---- gold coins -------------------------------------------------------------------------------
  // Every coin is a pure function of (index, time), so any frame renders the same on its own.
  const hash = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  function coin(ctx, x, y, r, spin, alpha = 1) {
    const squash = Math.max(0.18, Math.abs(Math.cos(spin)));
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.ellipse(x, y, r * squash, r, 0, 0, TAU);
    ctx.fillStyle = squash > 0.5 ? '#f3c94a' : '#d9a331';
    ctx.fill();
    ctx.lineWidth = Math.max(0.6, r * 0.22);
    ctx.strokeStyle = '#9a6a14';
    ctx.stroke();
    if (squash > 0.45) {
      ctx.beginPath();
      ctx.ellipse(x - r * 0.25 * squash, y - r * 0.3, r * 0.32 * squash, r * 0.22, 0, 0, TAU);
      ctx.fillStyle = 'rgba(255,248,210,0.85)';
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Coins pouring from each source: a fountain arcs up and out, a spill falls out of a window.
  function coinStreams(ctx, shot, t, width, h, unit, amount, fade) {
    const sources = shot.coinSources?.length ? shot.coinSources : [{ x: shot.auraX, y: shot.auraY, mode: 'fountain', rate: 1, at: 0 }];
    const glints = [];
    sources.forEach((src, si) => {
      const local = t - (src.at || 0);
      if (local <= 0) return;
      const rate = 30 * amount * (src.rate ?? 1);
      const life = src.mode === 'spill' ? 1.5 : 1.7;
      const first = Math.max(0, Math.floor((local - life) * rate)), last = Math.floor(local * rate);
      for (let k = first; k <= last; k++) {
        const age = local - k / rate;
        if (age < 0 || age > life) continue;
        const r1 = hash(k * 3.1 + si * 17), r2 = hash(k * 7.3 + si * 29), r3 = hash(k * 1.7 + si * 41);
        let vx, vy;
        if (src.mode === 'spill') { vx = (r1 - 0.5) * 0.22 * width; vy = (0.05 + r2 * 0.18) * h; }
        else { vx = (r1 - 0.5) * 0.75 * width; vy = -(0.75 + r2 * 0.6) * h; }
        const g = 1.55 * h;
        const x = src.x * width + vx * age, y = src.y * h + vy * age + 0.5 * g * age * age;
        if (y > h * 1.05) continue;
        const a = Math.min(1, (life - age) / 0.25) * fade;
        coin(ctx, x, y, (5 + r3 * 5) * unit, age * (9 + r1 * 8) + r2 * 6, a);
        if (r3 > 0.86) glints.push([x, y, a]);
      }
    });
    return glints;
  }

  // A heap of coins whose surface rises from gold.from to gold.to; drawn over the actors so they
  // sink into it. Levels are in the actors' y scale (0.88 is the usual floor line).
  function goldHeap(ctx, shot, t) {
    const g = shot.gold;
    const end = g.end ?? shot.duration;
    const k = ease(clamp((t - g.at) / Math.max(0.01, end - g.at), 0, 1));
    const level = mix(g.from, g.to, k) * H;
    if (level >= H * 1.02) return;
    const peak = g.peakX * W;
    const surface = x => level - 0.07 * H * Math.exp(-(((x - peak) / (0.22 * W)) ** 2)) + Math.sin(x * 0.021 + t * 2.4) * 4 + Math.sin(x * 0.057 - t * 1.7) * 2.5;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-60, H + 60);
    for (let x = -60; x <= W + 60; x += 20) ctx.lineTo(x, surface(x));
    ctx.lineTo(W + 60, H + 60);
    ctx.closePath();
    const fill = ctx.createLinearGradient(0, level - 0.08 * H, 0, H);
    fill.addColorStop(0, '#f8d870');
    fill.addColorStop(0.35, '#e2a930');
    fill.addColorStop(1, '#8e5c12');
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#8a5a12';
    ctx.stroke();
    ctx.clip();
    // coin texture, densest at the surface; the top layer jostles as more coins pour in
    for (let i = 0; i < 420; i++) {
      const x = hash(i * 1.37) * (W + 120) - 60;
      const depth = Math.pow(hash(i * 2.91), 2.2) * (H - level + 40);
      const jitter = depth < 40 ? Math.sin(t * 6 + i) * 3 : 0;
      const y = surface(x) + 6 + depth + jitter;
      const r = 7 + hash(i * 5.3) * 7;
      coin(ctx, x, y, r, hash(i * 9.1) * 6 + (depth < 40 ? t * 2 : 0), 0.95 - Math.min(0.5, depth / H));
    }
    // coins rolling down the slopes of the heap
    for (let i = 0; i < 26; i++) {
      const lane = hash(i * 4.4) < 0.5 ? -1 : 1;
      const p = (t * (0.25 + hash(i * 3.3) * 0.3) + hash(i * 8.1)) % 1;
      const x = peak + lane * p * 0.45 * W;
      coin(ctx, x, surface(x) - 4, 8, t * 10 + i, 1 - p * 0.6);
    }
    ctx.restore();
    // glints over the surface
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 18; i++) {
      const x = hash(i * 6.7) * W;
      const tw = Math.max(0, Math.sin(t * (2 + hash(i) * 3) + i * 1.7));
      star(ctx, x, surface(x) + 10 + hash(i * 2.2) * 50, 10 * tw, tw * 0.9);
    }
    ctx.restore();
  }

  function effects(ctx, shot, t, width, h) {
    const unit = Math.min(width, h) / 720;
    const amount = shot.fxAmount ?? 1;
    const fade = Math.min(1, t / 0.6, Math.max(0, (shot.duration - t) / 0.5));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    shot.fx.forEach((kind, index) => {
      const rng = random((shot.sceneSeed ^ (index * 7919 + 101)) >>> 0);
      if (kind === 'glow') {
        const pulse = 0.88 + 0.12 * Math.sin(t * 0.9);
        const light = ctx.createRadialGradient(width * 0.82, h * 0.1, 0, width * 0.82, h * 0.1, Math.hypot(width, h) * 0.72);
        light.addColorStop(0, 'rgba(255,196,112,' + 0.30 * amount * pulse * fade + ')');
        light.addColorStop(0.45, 'rgba(255,170,96,' + 0.10 * amount * pulse * fade + ')');
        light.addColorStop(1, 'rgba(255,150,90,0)');
        ctx.fillStyle = light;
        ctx.fillRect(0, 0, width, h);
      } else if (kind === 'rays') {
        for (let i = 0; i < 5; i++) {
          const baseX = width * (0.30 + i * 0.17 + rng() * 0.05);
          const sway = Math.sin(t * 0.35 + i * 1.7) * width * 0.02;
          const spread = width * (0.045 + rng() * 0.04);
          const alpha = (0.075 + 0.045 * Math.sin(t * 0.8 + i * 2.1)) * amount * fade;
          const shaft = ctx.createLinearGradient(baseX, 0, baseX - width * 0.34, h);
          shaft.addColorStop(0, 'rgba(255,226,160,' + alpha + ')');
          shaft.addColorStop(0.7, 'rgba(255,214,150,' + alpha * 0.35 + ')');
          shaft.addColorStop(1, 'rgba(255,214,150,0)');
          ctx.fillStyle = shaft;
          ctx.beginPath();
          ctx.moveTo(baseX + sway - spread, -10);
          ctx.lineTo(baseX + sway + spread, -10);
          ctx.lineTo(baseX + sway - width * 0.34 + spread * 2.6, h + 10);
          ctx.lineTo(baseX + sway - width * 0.34 - spread * 2.6, h + 10);
          ctx.fill();
        }
      } else if (kind === 'dust') {
        const count = Math.round(70 * amount);
        for (let i = 0; i < count; i++) {
          const depth = 0.35 + rng() * 0.65;
          const x = frac(rng() + t * 0.006 * depth + Math.sin(t * 0.4 + i) * 0.004) * width;
          const y = frac(rng() - t * 0.0045 * depth) * h;
          const size = (1.0 + depth * 3.1) * unit;
          const twinkle = 0.55 + 0.45 * Math.sin(t * (0.7 + depth) + i * 1.9);
          const mote = ctx.createRadialGradient(x, y, 0, x, y, size * 2.2);
          mote.addColorStop(0, 'rgba(255,232,178,' + 0.55 * depth * twinkle * fade * Math.min(1, amount) + ')');
          mote.addColorStop(1, 'rgba(255,220,160,0)');
          ctx.fillStyle = mote;
          ctx.beginPath();
          ctx.arc(x, y, size * 2.2, 0, TAU);
          ctx.fill();
        }
      } else if (kind === 'glitter') {
        const count = Math.round(34 * amount);
        for (let i = 0; i < count; i++) {
          const x = frac(rng() + Math.sin(t * (0.3 + rng() * 0.3) + i * 2.3) * 0.012) * width;
          const y = frac(rng() - t * (0.008 + rng() * 0.014)) * h;
          const phase = rng() * TAU;
          const rate = 1.4 + rng() * 2.6;
          const flash = Math.pow(Math.max(0, Math.sin(t * rate + phase)), 4);
          const r = (2.0 + rng() * 5.5) * unit;
          star(ctx, x, y, r * (0.45 + 0.75 * flash), flash * fade * Math.min(1, 0.55 + amount * 0.45), glitterTones[i % glitterTones.length]);
        }
        // A few large slow hero glints so the frame always has a focal sparkle.
        for (let i = 0; i < Math.round(5 * amount); i++) {
          const x = (0.12 + rng() * 0.76) * width;
          const y = (0.12 + rng() * 0.62) * h;
          const cycle = 3.2 + rng() * 2.4;
          const local = frac((t + rng() * cycle) / cycle);
          const flash = local < 0.34 ? Math.sin(local / 0.34 * Math.PI) ** 2 : 0;
          star(ctx, x, y, (6 + rng() * 5) * unit * flash, flash * fade, '255,240,200');
        }
      } else if (kind === 'embers') {
        const count = Math.round(40 * amount);
        for (let i = 0; i < count; i++) {
          const rise = frac(rng() + t * (0.03 + rng() * 0.05));
          const x = (rng() + Math.sin(t * 1.2 + i * 3.1) * 0.02 + rise * 0.04) * width;
          const y = h * (1.02 - rise * 1.1);
          const flick = 0.6 + 0.4 * Math.sin(t * 9 + i * 5.3);
          const size = (1.2 + rng() * 2.6) * unit * (1 - rise * 0.6);
          const ember = ctx.createRadialGradient(x, y, 0, x, y, size * 2.6);
          ember.addColorStop(0, 'rgba(255,206,120,' + 0.9 * flick * (1 - rise) * fade + ')');
          ember.addColorStop(0.4, 'rgba(255,128,52,' + 0.5 * flick * (1 - rise) * fade + ')');
          ember.addColorStop(1, 'rgba(255,90,30,0)');
          ctx.fillStyle = ember;
          ctx.beginPath();
          ctx.arc(x, y, size * 2.6, 0, TAU);
          ctx.fill();
        }
      } else if (kind === 'petals') {
        ctx.globalCompositeOperation = 'source-over';
        const count = Math.round(16 * amount);
        for (let i = 0; i < count; i++) {
          const fall = frac(rng() + t * (0.035 + rng() * 0.03));
          const x = (rng() + Math.sin(t * 0.9 + i * 2.4) * 0.05 + fall * 0.08) * width;
          const y = h * (-0.05 + fall * 1.1);
          const spin = t * (1.1 + rng()) + i;
          const size = (6 + rng() * 6) * unit;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(spin);
          ctx.scale(1, 0.45 + 0.55 * Math.abs(Math.cos(spin * 0.8)));
          ctx.globalAlpha = 0.9 * fade;
          ctx.fillStyle = i % 3 ? '#f0a22d' : '#e0701f';
          ctx.beginPath();
          ctx.ellipse(0, 0, size, size * 0.52, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
        ctx.globalCompositeOperation = 'lighter';
      } else if (kind === 'fireflies') {
        const count = Math.round(22 * amount);
        for (let i = 0; i < count; i++) {
          const px = rng();
          const py = 0.3 + rng() * 0.6;
          const x = (px + Math.sin(t * (0.25 + rng() * 0.3) + i * 4.1) * 0.05) * width;
          const y = (py + Math.cos(t * (0.3 + rng() * 0.3) + i * 2.7) * 0.04) * h;
          const glow = Math.pow(0.5 + 0.5 * Math.sin(t * (1.5 + rng() * 1.5) + i * 1.3), 2);
          const size = (2.2 + rng() * 2) * unit;
          const light = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
          light.addColorStop(0, 'rgba(235,255,160,' + 0.95 * glow * fade + ')');
          light.addColorStop(0.3, 'rgba(210,255,120,' + 0.38 * glow * fade + ')');
          light.addColorStop(1, 'rgba(190,255,100,0)');
          ctx.fillStyle = light;
          ctx.beginPath();
          ctx.arc(x, y, size * 4, 0, TAU);
          ctx.fill();
        }
      } else if (kind === 'leaves') {
        // Dry leaves tumbling across the frame on a gale: fast, slightly rising, each spinning on its own.
        ctx.globalCompositeOperation = 'source-over';
        const count = Math.round(34 * amount);
        const tones = ['#8a6a2b', '#a47a30', '#6e5a2a', '#9b5f2a', '#7d7a35'];
        for (let i = 0; i < count; i++) {
          const speed = 0.16 + rng() * 0.22;
          const run = frac(rng() + t * speed);
          const x = (-0.1 + run * 1.2) * width;
          const y = (0.15 + rng() * 0.75 - run * 0.12 + Math.sin(t * (1.5 + rng() * 2) + i * 2.3) * 0.05) * h;
          const spin = t * (3 + rng() * 5) + i * 1.7;
          const size = (6 + rng() * 9) * unit;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(spin);
          ctx.scale(1, 0.4 + 0.6 * Math.abs(Math.cos(spin * 0.7)));
          ctx.globalAlpha = 0.9 * fade;
          ctx.fillStyle = tones[i % tones.length];
          ctx.beginPath();
          ctx.moveTo(-size, 0);
          ctx.quadraticCurveTo(0, -size * 0.7, size, 0);
          ctx.quadraticCurveTo(0, size * 0.7, -size, 0);
          ctx.fill();
          ctx.restore();
        }
        // wind streaks
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 1.6 * unit;
        for (let i = 0; i < Math.round(10 * amount); i++) {
          const run = frac(rng() + t * (0.5 + rng() * 0.4));
          const x = (-0.2 + run * 1.4) * width;
          const y = (0.1 + rng() * 0.8) * h;
          ctx.strokeStyle = 'rgba(235,235,225,' + 0.16 * fade * Math.sin(run * Math.PI) + ')';
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + width * 0.05, y - h * 0.02, x + width * 0.11, y + h * 0.01);
          ctx.stroke();
        }
      } else if (kind === 'fog') {
        ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < Math.round(9 * Math.min(1.6, amount)); i++) {
          const drift = frac(rng() + t * (0.012 + rng() * 0.02));
          const cx = (-0.3 + drift * 1.6) * width;
          const cy = (0.35 + rng() * 0.6) * h;
          const rx = width * (0.25 + rng() * 0.25);
          const ry = h * (0.07 + rng() * 0.09);
          const cloud = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
          cloud.addColorStop(0, 'rgba(226,232,230,' + 0.30 * Math.min(1.4, amount) * fade + ')');
          cloud.addColorStop(1, 'rgba(226,232,230,0)');
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(1, ry / rx);
          ctx.translate(-cx, -cy);
          ctx.fillStyle = cloud;
          ctx.fillRect(cx - rx, cy - rx, rx * 2, rx * 2);
          ctx.restore();
        }
        ctx.globalCompositeOperation = 'lighter';
      } else if (kind === 'coins') {
        ctx.globalCompositeOperation = 'source-over';
        const glints = coinStreams(ctx, shot, t, width, h, unit, amount, fade);
        ctx.globalCompositeOperation = 'lighter';
        for (const [x, y, a] of glints) star(ctx, x, y, 9 * unit, a * 0.9);
      } else if (kind === 'aura') {
        // A soft divine halo that breathes, with slow rays turning behind it.
        const cx = width * (shot.auraX ?? 0.5);
        const cy = h * (shot.auraY ?? 0.5);
        const pulse = 0.8 + 0.2 * Math.sin(t * 1.6);
        const radius = Math.min(width, h) * (0.5 + 0.06 * Math.sin(t * 1.1));
        const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        halo.addColorStop(0, 'rgba(255,236,170,' + 0.55 * amount * pulse * fade + ')');
        halo.addColorStop(0.4, 'rgba(255,206,120,' + 0.20 * amount * pulse * fade + ')');
        halo.addColorStop(1, 'rgba(255,190,100,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, width, h);
        for (let i = 0; i < 12; i++) {
          const a = t * 0.12 + i * TAU / 12;
          const ray = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * radius * 1.4, cy + Math.sin(a) * radius * 1.4);
          ray.addColorStop(0, 'rgba(255,230,160,' + 0.13 * amount * fade + ')');
          ray.addColorStop(1, 'rgba(255,230,160,0)');
          ctx.fillStyle = ray;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, radius * 1.4, a - 0.06, a + 0.06);
          ctx.fill();
        }
      } else if (kind === 'shimmer') {
        const local = frac(t / 6.5 + (shot.sceneSeed % 97) / 97);
        if (local < 0.42) {
          const move = local / 0.42;
          const cx = (-0.25 + move * 1.5) * width;
          const band = ctx.createLinearGradient(cx - width * 0.12, 0, cx + width * 0.12, h * 0.45);
          const peak = Math.sin(move * Math.PI) * 0.16 * amount * fade;
          band.addColorStop(0, 'rgba(255,240,205,0)');
          band.addColorStop(0.5, 'rgba(255,240,205,' + peak + ')');
          band.addColorStop(1, 'rgba(255,240,205,0)');
          ctx.fillStyle = band;
          ctx.fillRect(0, 0, width, h);
        }
      }
    });
    ctx.restore();
  }

  // Comic "tremble" marks drawn just outside the body outline (the body itself stays still): short curved
  // strokes on both sides of the head, shoulders, arms and hips that flick in and out at a shiver's rate.
  function shiverMarks(ctx, state, t) {
    const drop = VillageCast.stanceDrop(state);
    ctx.save();
    ctx.filter = 'none';
    ctx.lineCap = 'round';
    const spots = [[-58, -300, 1], [-64, -236, 1], [-66, -178, 1], [-60, -128, 1], [60, -300, -1], [66, -236, -1], [68, -178, -1], [62, -128, -1]];
    spots.forEach(([x, y, side], i) => {
      const beat = Math.sin(t * 31 + i * 1.9);
      const out = (beat > 0 ? 3 : -2) * -side * -1;
      const alpha = 0.55 + 0.35 * Math.abs(Math.sin(t * 15.5 + i));
      for (let k = 0; k < 2; k++) {
        const dx = side * (k * 8 - out * (k ? 1 : 0.5));
        ctx.strokeStyle = 'rgba(38,34,48,' + Math.min(1, alpha * 1.15 * (1 - k * 0.3)) + ')';
        ctx.lineWidth = 4.6 - k * 1.4;
        ctx.beginPath();
        const yy = y + drop + (i % 2 ? 4 : -4);
        ctx.moveTo(x + dx, yy - 20);
        ctx.quadraticCurveTo(x + dx + side * 10, yy, x + dx, yy + 20);
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  function burnCaption(ctx, caption, width, h, position, scale) {
    const portrait = width < h;
    const font = Math.max(17, Math.round((portrait ? width * 0.042 : h * 0.037) * scale));
    const leading = font * 1.32;
    const max = width * (portrait ? 0.82 : 0.81);
    ctx.font = `700 ${font}px "Nirmala UI", "Noto Sans Devanagari", "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const words = caption.text.split(/\s+/u);
    const rows = [];
    let row = '';
    for (const word of words) {
      const line = row ? row + ' ' + word : word;
      if (row && ctx.measureText(line).width > max) {
        rows.push(row);
        row = word;
      } else row = line;
    }
    if (row) rows.push(row);
    if (rows.length === 2 && ctx.measureText(rows[1]).width < ctx.measureText(rows[0]).width * 0.56) {
      const halfway = ctx.measureText(caption.text).width * 0.5;
      let split = 1;
      while (split < words.length - 1 && ctx.measureText(words.slice(0, split).join(' ')).width < halfway) split++;
      rows.splice(0, 2, words.slice(0, split).join(' '), words.slice(split).join(' '));
    }
    const textWidth = Math.min(max, Math.max(...rows.map(row => ctx.measureText(row).width)));
    const boxHeight = leading * rows.length + font * 0.53;
    const baseline = position === 'low' ? 0.934 : portrait ? 0.85 : 0.938;
    const top = position === 'top' ? h * 0.105 : h * baseline - boxHeight;
    ctx.fillStyle = 'rgba(26,19,20,.86)';
    ctx.beginPath();
    ctx.roundRect((width - textWidth) / 2 - font * 0.54, top, textWidth + font * 1.08, boxHeight, font * 0.30);
    ctx.fill();
    ctx.fillStyle = '#fff1d6';
    rows.forEach((line, i) => ctx.fillText(line, width / 2, top + font * 0.30 + leading * (i + 0.5), max));
  }

  function overlays(ctx, items, t, duration, width, h) {
    for (const item of items) {
      const end = item.end ?? duration;
      if (t < item.at || t >= end) continue;
      const amount = Math.min(ease(clamp((t - item.at) / 0.31, 0, 1)), ease(clamp((end - t) / 0.36, 0, 1)));
      const large = item.style === 'title';
      const count = item.style === 'count';
      const font = width * (large ? 0.077 : count ? 0.097 : 0.039);
      const y = h * item.y + (1 - amount) * 12;
      ctx.save();
      ctx.globalAlpha = amount;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (large || count) {
        const backdrop = ctx.createRadialGradient(width / 2, y, 0, width / 2, y, width * 0.55);
        backdrop.addColorStop(0, '#1b1517d9');
        backdrop.addColorStop(1, '#18111900');
        ellipse(ctx, width / 2, y, width * 0.57, font * 1.75, backdrop);
      }
      if (item.eyebrow) {
        ctx.font = `600 ${Math.round(width * 0.027)}px "Nirmala UI", serif`;
        ctx.fillStyle = '#e7c698';
        ctx.fillText(item.eyebrow, width / 2, y - font * 0.80, width * 0.80);
      }
      ctx.font = `700 ${Math.round(font)}px "Nirmala UI", "Segoe UI", sans-serif`;
      ctx.fillStyle = large || count ? '#ffe0a7' : '#f3d7ac';
      if (large) {
        // A slow highlight sweeps across the title letters.
        const reach = Math.min(width * 0.86, ctx.measureText(item.text).width) / 2;
        const sweep = frac((t - item.at) / 3.4);
        const sheen = ctx.createLinearGradient(width / 2 - reach, 0, width / 2 + reach, 0);
        const lo = Math.max(0.001, sweep * 1.4 - 0.3);
        const hi = Math.min(0.999, sweep * 1.4 - 0.1);
        sheen.addColorStop(0, '#ffd994');
        if (hi > lo) {
          sheen.addColorStop(lo, '#ffd994');
          sheen.addColorStop((lo + hi) / 2, '#fffaf0');
          sheen.addColorStop(hi, '#ffd994');
        }
        sheen.addColorStop(1, '#ffd994');
        ctx.fillStyle = sheen;
      }
      ctx.shadowColor = '#231713';
      ctx.shadowBlur = 8;
      ctx.fillText(item.text, width / 2, y, width * 0.86);
      if (large) {
        ctx.shadowBlur = 0;
        const stars = random(item.text.length * 131 + 7);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const span = Math.min(width * 0.86, ctx.measureText(item.text).width);
        for (let i = 0; i < 9; i++) {
          const sx = width / 2 + (stars() - 0.5) * (span + font * 1.4);
          const sy = y + (stars() - 0.5) * font * 1.9;
          const phase = stars() * TAU;
          const flash = Math.pow(Math.max(0, Math.sin((t - item.at) * (1.6 + stars() * 1.8) + phase)), 3);
          star(ctx, sx, sy, font * (0.07 + stars() * 0.09) * (0.4 + flash * 0.9), flash * 0.95);
        }
        ctx.restore();
        line(ctx, width * 0.30, y + font * 0.72, width * 0.70, y + font * 0.72, '#d0a371a9', 1.4);
      }
      ctx.restore();
    }
  }

  function create(canvas, timeline, images) {
    const ctx = canvas.getContext('2d', { alpha: false });
    const width = canvas.width;
    const h = canvas.height;
    const cast = new Map(timeline.characters.map(asset => [key(asset.name), asset]));
    const places = new Map(timeline.scenes.map(asset => [key(asset.name), asset]));
    const props = new Map(timeline.props.map(asset => [key(asset.name), asset]));
    const shots = timeline.shots.map(shot => {
      const scene = places.get(key(shot.scene));
      const prepared = {
        ...shot, sceneKind: scene.kind, sceneSeed: scene.seed, sceneAsset: scene,
        tracks: shot.actors.map(motionTrack), propTracks: shot.props.map(prop => ({ prop, track: motionTrack(prop) })),
      };
      return { ...prepared, screenX: portraitFit(prepared, width, h) };
    });
    let cachedKey = '';
    const bg = document.createElement('canvas');
    bg.width = W;
    bg.height = H;
    const paint = bg.getContext('2d', { alpha: false });
    const tint = { night: 'brightness(.66) saturate(.77)', dusk: 'brightness(.9) saturate(.91)', dawn: 'brightness(.96)' };

    function drawAt(at) {
      const seconds = clamp(at, 0, timeline.duration - 0.0001);
      const index = Math.max(0, shots.findLastIndex(shot => shot.start <= seconds));
      const shot = shots[index];
      const t = seconds - shot.start;
      const current = shot.dialogue.find(line => line.start <= t && line.end > t);
      const active = current && !current.narration ? key(current.speaker) : '';
      const actors = shot.tracks.map(track => {
        const state = stateAt(track, t);
        state.x = shot.screenX(state.x);
        const gait = walkAt(track, t, cast.get(key(state.character)));
        if (gait) Object.assign(state, gait);
        const baseCharacter = cast.get(key(state.character));
        const character = state.outfit ? { ...baseCharacter, ...state.outfit } : baseCharacter;
        const speaking = active === key(character.name);
        if (speaking) state.line = current;
        let mouth = 0;
        if (speaking) {
          const levelIndex = (t - current.start) * 25;
          const n = Math.floor(levelIndex);
          mouth = current.levels.length
            ? mix(current.levels[n] || 0, current.levels[n + 1] || 0, levelIndex % 1) / 100
            : Math.abs(Math.sin(t * 21)) * 0.7;
          if (current.emotion !== 'neutral') {
            state.deliveryEmotion = current.emotion;
            state.deliveryBlend = ease(clamp(Math.min((t - current.start) / .20, (current.end - t) / .27), 0, 1));
          }
        }
        return { state, character, speaking, mouth };
      });
      const speaker = actors.find(actor => actor.speaking);
      if (speaker) for (const actor of actors) {
        if (actor === speaker) continue;
        const facing = actor.state.face === 'left' ? -1 : 1;
        actor.state.gazeX = clamp((speaker.state.x - actor.state.x) * 5 * facing, -.85, .88);
      }
      const camera = frameCamera(shot, actors, t, width, h);
      const id = [shot.scene, shot.time, shot.weather].join('|');
      if (id !== cachedKey) {
        VillageScenery.backdrop(paint, shot.sceneAsset, shot, images[shot.sceneAsset.image]);
        cachedKey = id;
      }
      ctx.save();
      ctx.translate(width / 2, h / 2);
      ctx.scale(camera.scale, camera.scale);
      ctx.translate(-camera.x, -camera.y);
      ctx.drawImage(bg, 0, 0);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      const visibleProps = shot.propTracks.filter(({ prop }) => prop.at <= t && (prop.end == null || prop.end > t)).map(({ prop, track }) => {
        const holder = prop.holder && actors.find(actor => key(actor.character.name) === key(prop.holder));
        const state = { ...stateAt(track, t), at: prop.at };
        return { prop: state, holder, y: state.depth ?? (holder ? holder.state.y + 0.0002 : state.y) };
      }).filter(layer => layer.prop.alpha > 0);
      for (const { prop, holder } of visibleProps) {
        if (holder && ['near', 'far', 'both'].includes(prop.grasp?.hand)) holder.state.carry = prop.grasp.hand;
      }
      const layers = [...actors.map(actor => ({ actor, y: actor.state.y })), ...visibleProps].sort((a, b) => a.y - b.y);
      for (const layer of layers) {
        ctx.save();
        if (layer.actor) {
          const { character, state, speaking, mouth } = layer.actor;
          const scale = height(character) * state.size / 347;
          const x = state.x * W;
          const y = state.y * H;
          const lie = VillageCast.lieAmount(state);
          ctx.globalAlpha = state.alpha ?? 1;
          if (lie < 0.5) {
            ellipse(ctx, x + 14, y + 2, 62 * scale, 10 * scale, 'rgba(58,39,35,.22)');
            ellipse(ctx, x + 4, y - 1, 39 * scale, 5.5 * scale, 'rgba(64,43,36,.20)');
          }
          ctx.translate(x, y);
          ctx.scale(scale, scale);
          if (lie > 0) {
            // Lying down: the body is laid flat with the head toward the side the actor faces away from.
            ctx.translate(0, -52 * lie);
            ctx.rotate((state.face === 'left' ? 1 : -1) * Math.PI / 2 * lie);
          }
          ctx.filter = tint[shot.time] || 'none';
          person(ctx, character, state, t, mouth, speaking, images[character.image]);
          if (state.pose === 'shiver') shiverMarks(ctx, state, t);
        } else {
          const p = layer.prop;
          const asset = props.get(key(p.prop));
          const elapsed = t - p.at;
          const fall = p.motion === 'fall' ? -115 * (1 - Math.min(1, (elapsed / 0.62) ** 2)) : 0;
          const roll = p.motion === 'roll' ? Math.min(130, elapsed * 78) : 0;
          let x = shot.screenX(p.x) * W;
          let y = p.y * H;
          let contact;
          let holderScale;
          if (layer.holder) {
            const { state, character, mouth, speaking } = layer.holder;
            holderScale = height(character) * state.size / 347;
            if (p.grasp && !images[character.image]) {
              contact = VillageCast.grasp(character, state, t, mouth, speaking, p.grasp.hand);
              x = state.x * W + contact.x * holderScale;
              y = state.y * H + contact.y * holderScale;
            } else {
              const [handX, handY] = VillageCast.hand(character, state, t, mouth, speaking);
              const grip = p.grip ?? ({ pot: 59, basket: 74, coin: 16, lantern: 80, book: 29, rope: 18, wallet: 34, envelope: 40, note: 23, tea: 26, key: 32, diya: 19,
                'cloth-pouch': 56, 'open-pouch': 54, 'soap-key': 35, 'piggy-bank': 39, parcel: 29, pencil: 23, ribbon: 30 }[asset.kind] || 38);
              x = state.x * W + handX * holderScale;
              y = state.y * H + handY * holderScale + grip * p.size;
            }
          }
          ctx.save();
          ctx.translate(x + roll, y + fall);
          ctx.scale(p.size, p.size);
          ctx.rotate(p.angle * Math.PI / 180);
          ctx.globalAlpha = p.alpha;
          if (p.motion === 'sway') ctx.rotate(Math.sin(t * 4) * 0.1);
          if (p.motion === 'roll') ctx.rotate(roll / 19);
          if (contact) ctx.translate(-p.grasp.x, -p.grasp.y);
          if (p.motion === 'glow') {
            ctx.shadowColor = '#f3ac58';
            ctx.shadowBlur = 10 + Math.sin(t * 8) * 5;
          }
          if (!['lantern', 'diya'].includes(asset.kind)) ctx.filter = tint[shot.time] || 'none';
          VillageScenery.prop(ctx, asset, elapsed, images[asset.image]);
          ctx.restore();
          if (contact?.wrists.length) {
            const { state, character } = layer.holder;
            ctx.translate(state.x * W, state.y * H);
            ctx.scale(holderScale, holderScale);
            ctx.filter = tint[shot.time] || 'none';
            ctx.globalAlpha = p.alpha;
            VillageCast.graspFingers(ctx, character, contact);
          }
        }
        ctx.restore();
      }
      if (shot.gold) goldHeap(ctx, shot, t);
      atmosphere(ctx, shot, t);
      ctx.restore();
      if (shot.fx?.length) effects(ctx, shot, t, width, h);
      if (shot.vignette) {
        const vignette = ctx.createRadialGradient(width / 2, h * 0.49, Math.min(width, h) * 0.25, width / 2, h * 0.49, Math.hypot(width, h) * 0.48);
        vignette.addColorStop(0, '#1a141d00');
        vignette.addColorStop(1, `rgba(23,13,25,${shot.vignette})`);
        rect(ctx, 0, 0, width, h, vignette);
      }
      overlays(ctx, shot.overlays, t, shot.duration, width, h);
      if (shot.transition === 'fade') {
        const alpha = Math.max(1 - t / 0.36, 1 - (shot.duration - t) / 0.41, 0);
        if (alpha) rect(ctx, 0, 0, width, h, `rgba(23,17,21,${alpha})`);
      }
      const caption = current?.captions.find(item => item.start <= t && item.end > t);
      if (timeline.captions && caption) burnCaption(ctx, caption, width, h, shot.captionPosition, timeline.captionScale ?? 1);
      return index;
    }
    return { drawAt };
  }

  globalThis.VillageCanvas = { create, loadImages };
})();
