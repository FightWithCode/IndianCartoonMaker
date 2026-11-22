// Text-driven Hindi lip sync: Devanagari -> phoneme classes -> visemes -> timed track.
// Devanagari is close to phonetic, so a rule-based g2p gets most of the way without a speech model.
// In production the timing would come from the audio (Rhubarb Lip Sync / Whisper word stamps); the
// amplitude envelope the engine already computes can gate the jaw on top.
(() => {
  const { clamp, mix } = Lab;
  const VOWEL = { 'अ': 'A', 'आ': 'AA', 'इ': 'I', 'ई': 'I', 'उ': 'U', 'ऊ': 'U', 'ए': 'E', 'ऐ': 'E', 'ओ': 'O', 'औ': 'O', 'ऋ': 'I',
    'ा': 'AA', 'ि': 'I', 'ी': 'I', 'ु': 'U', 'ू': 'U', 'े': 'E', 'ै': 'E', 'ो': 'O', 'ौ': 'O', 'ृ': 'I', 'ॉ': 'O', 'ॅ': 'E' };
  const LONG = new Set(['आ', 'ई', 'ऊ', 'ा', 'ी', 'ू', 'ै', 'ौ', 'ऐ', 'औ']);
  const CONS = {};
  const put = (chars, v) => [...chars].forEach(ch => (CONS[ch] = v));
  put('पफबभम', 'MBP');
  put('व', 'FV');
  put('तथदधनटठडढणलरड़ढ़', 'L');
  put('सशषजझचछयज़', 'S');
  put('कखगघङहक़ख़ग़', 'K');
  const SHAPES = {
    X: {},
    A: { jaw: .42, wide: .12 },
    AA: { jaw: .85, wide: .22 },
    I: { jaw: .22, wide: .85, teeth: .9, smile: .15 },
    E: { jaw: .45, wide: .6, teeth: .75 },
    U: { jaw: .2, pucker: 1 },
    O: { jaw: .55, pucker: .75 },
    MBP: { closed: 1, press: .6 },
    FV: { jaw: .12, teeth: 1, lowerIn: 1 },
    L: { jaw: .36, teeth: .55, tongue: 1 },
    S: { jaw: .08, teeth: 1, wide: .55 },
    K: { jaw: .38, wide: .1 },
  };

  // Returns [{v, w, ch, word, stress}] in reading order.
  function phonemes(text) {
    const out = [];
    const words = text.split(/(\s+|[,।!?—–-]+)/u).filter(Boolean);
    words.forEach((word, wi) => {
      if (/^\s+$/u.test(word)) { out.push({ v: 'X', w: .12, ch: ' ', word: wi }); return; }
      if (/^[,।!?—–-]+$/u.test(word)) { out.push({ v: 'X', w: .9, ch: word, word: wi, pause: true }); return; }
      const chars = [...word];
      let firstVowel = true;
      for (let i = 0; i < chars.length; i++) {
        const ch = chars[i], next = chars[i + 1];
        if (CONS[ch]) {
          let c = ch;
          if (next === '़') { c += next; i++; }
          out.push({ v: CONS[c] || CONS[ch], w: .55, ch: c, word: wi });
          const after = chars[i + 1];
          if (after === '्') { i++; continue; }
          if (after && VOWEL[after]) continue;
          const last = i >= chars.length - 1 || (chars[i + 1] && /[ंँः]/u.test(chars[i + 1]) && i + 1 >= chars.length - 1);
          // Schwa deletion: the inherent 'a' is dropped at the end of a word.
          if (!last || chars.length <= 2) { out.push({ v: 'A', w: .7, ch: 'अ', word: wi, stress: firstVowel }); firstVowel = false; }
        } else if (VOWEL[ch]) {
          out.push({ v: VOWEL[ch], w: LONG.has(ch) ? 1.25 : .85, ch, word: wi, stress: firstVowel || LONG.has(ch) });
          firstVowel = false;
        }
      }
    });
    return out;
  }

  // Spread phonemes over [start, end] and return a sampler giving viseme controls at time t.
  function track(text, start, end) {
    const ph = phonemes(text);
    const total = ph.reduce((s, p) => s + p.w, 0);
    let t = start;
    const keys = ph.map(p => { const k = { ...p, t0: t, t1: t + (p.w / total) * (end - start) }; t = k.t1; return k; });
    return { keys, text, start, end };
  }

  // Coarticulation: each viseme ramps in before its slot and out after it (weighted overlap), so
  // the mouth never snaps. MBP gets priority so lips really close on म/ब/प.
  function sample(tr, t) {
    if (!tr || t < tr.start - .1 || t > tr.end + .15) return { ctl: {}, key: null };
    const acc = {}, wsum = { v: 0 };
    let cur = null;
    for (const k of tr.keys) {
      const mid = (k.t0 + k.t1) / 2, half = (k.t1 - k.t0) / 2 + .045;
      const d = Math.abs(t - mid);
      if (d > half * 1.8) continue;
      let w = Math.max(0, 1 - d / (half * 1.8));
      w = w * w * (3 - 2 * w);
      if (k.v === 'MBP') w *= 2.2;
      if (t >= k.t0 && t < k.t1) cur = k;
      const shape = SHAPES[k.v];
      for (const n in shape) acc[n] = (acc[n] || 0) + shape[n] * w;
      wsum.v += w;
    }
    const ctl = {};
    const norm = Math.max(1, wsum.v);
    for (const n in acc) ctl[n] = clamp(acc[n] / norm, 0, 1);
    return { ctl, key: cur };
  }

  globalThis.LipSync = { phonemes, track, sample, SHAPES };
})();
