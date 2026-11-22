(() => {
  const { clamp, mix, ink, ellipse, path, line, gradient, shade, contain } = VillageDraw;
  const youth = { child: 0.66, young: 0.94, adult: 1, elder: 0.94 };
  const height = character => 504 * (youth[character.age] || 1);
  const darkInk = '#292328';
  const handAngle = (elbowX, elbowY, x, y) => Math.atan2(y - elbowY, x - elbowX) - Math.PI / 2;

  function arm(ctx, x, y, elbowX, elbowY, handX, handY, colors, short, sari, point) {
    const { skin, shadow, cloth, cuff } = colors;
    const curve = `M${x} ${y} Q${elbowX - 2} ${elbowY - 10} ${elbowX} ${elbowY} Q${elbowX + 3} ${elbowY + 8} ${handX} ${handY}`;
    path(ctx, curve, null, ink, 22);
    path(ctx, curve, null, skin, 18);
    const sleeve = short
      ? `M${x} ${y} Q${elbowX - 2} ${elbowY - 10} ${x + (elbowX - x) * 0.55} ${y + (elbowY - y) * 0.55}`
      : `M${x} ${y} Q${elbowX - 2} ${elbowY - 10} ${elbowX} ${elbowY} Q${elbowX + 1} ${elbowY + 4} ${elbowX + (handX - elbowX) * 0.70} ${elbowY + (handY - elbowY) * 0.70}`;
    path(ctx, sleeve, null, ink, 29);
    path(ctx, sleeve, null, cloth, 25);
    if (sari) ellipse(ctx, x + (elbowX - x) * 0.55, y + (elbowY - y) * 0.55, 9, 7, cuff);
    ctx.save();
    ctx.translate(handX, handY);
    ctx.rotate(handAngle(elbowX, elbowY, handX, handY));
    path(ctx, 'M-8 -4 Q-11 0 -9 10 Q-10 17 -6 20 Q-3 22 -2 15 Q0 22 4 21 Q9 18 10 11 L10 2 Q8 -5 4 -5 Z', skin, ink, 1.5);
    path(ctx, 'M4 1 Q-3 4 -1 11 M6 9 L5 16 M1 13 L1 18', null, shadow, 1.1);
    if (colors.bangle) {
      path(ctx, 'M-9 -6 Q0 -2 9 -6', null, colors.bangle, 3.4);
      path(ctx, 'M-9 -10 Q0 -6 9 -10', null, colors.bangle, 3.0);
      if (colors.ring) ellipse(ctx, 2, 14, 2.1, 2.1, colors.ring, '#8a6420', 0.6);
    }
    if (point) path(ctx, 'M2 4 L3 21 Q5 28 8 23 L9 5', skin, ink, 1.3);
    if (sari) {
      line(ctx, -8, -3, 8, -3, cuff, 3);
      line(ctx, -8, 0, 8, 0, '#efd579', 1.4);
    }
    ctx.restore();
  }

  function leg(ctx, x, shift, lift, cloth, shadeCloth, skin, wrap, drop, shoeColor = '#533b33') {
    const fold = drop / 91;
    const knee = x * 2.1 * fold;
    const shin = -80 + drop * 0.31;
    shift -= x * fold * 0.70;
    const shoe = `M${x + shift - 10} ${-13 - lift} Q${x + shift - 13} ${-4 - lift} ${x + shift - 10} ${-1 - lift}
      Q${x + shift + 9} ${3 - lift} ${x + shift + 21} ${-2 - lift}
      Q${x + shift + 26} ${-7 - lift} ${x + shift + 17} ${-11 - lift} L${x + shift + 8} ${-15 - lift}Z`;
    const legShape = `M${x - 22} ${-131 + drop} Q${x - 17 + shift * 0.4 + knee} ${shin} ${x - 12 + shift} ${-13 - lift}
      Q${x + shift} ${-6 - lift} ${x + shift + 13} ${-14 - lift} Q${x + 17 + shift * 0.45 + knee} ${shin + 4} ${x + 24} ${-133 + drop}Z`;
    path(ctx, shoe, shoeColor, ink, 2);
    path(ctx, legShape, cloth, ink, 2);
    path(ctx, `M${x + 7} ${-118 + drop} Q${x + 6 + shift * 0.4 + knee} ${shin + 15} ${x + 7 + shift} ${-16 - lift}
      L${x + 13 + shift} ${-14 - lift} Q${x + 17 + shift * 0.45 + knee} ${shin + 4} ${x + 24} ${-130 + drop}Z`, shadeCloth);
    if (wrap) path(ctx, `M${x - 12 + shift} ${-16 - lift} Q${x + shift} ${-12 - lift} ${x + 13 + shift} ${-15 - lift}`, null, skin, 3);
    path(ctx, `M${x + shift - 8} ${-4 - lift} Q${x + shift + 9} ${-1 - lift} ${x + shift + 19} ${-5 - lift}`, null, '#a17d5f', 1.4);
  }

  function lap(ctx, drop, cloth, skin, sari) {
    const amount = clamp((drop - 43) / 48, 0, 1);
    if (!amount) return;
    ctx.save();
    ctx.translate(0, -drop);
    ctx.scale(amount, amount);
    path(ctx, 'M-22 -45 Q-52 -57 -65 -38 Q-74 -24 -59 -12 Q-40 3 3 -10 L21 -29Z',
      shade(cloth, -11), ink, 2.0);
    path(ctx, 'M18 -45 Q49 -53 64 -38 Q76 -25 62 -13 Q52 -5 23 -7 Q2 -7 -20 -20 L-12 -34Z',
      gradient(ctx, 5, -51, 51, -5, [shade(cloth, 12), cloth, shade(cloth, -31)]), ink, 2.0);
    path(ctx, 'M50 -35 Q48 -21 25 -18 M-52 -32 Q-40 -21 -27 -24 M3 -23 Q9 -16 26 -13',
      null, shade(cloth, -26), 1.65);
    if (sari) path(ctx, 'M-41 -14 Q-2 -25 18 -9 Q45 -6 60 -15', null, shade(cloth, 34), 3.2);
    path(ctx, 'M-29 -13 Q-18 -14 -6 -7 Q-1 -1 -11 2 L-29 2 Q-42 -2 -38 -8Z M18 -14 Q28 -16 37 -9 Q44 -3 35 1 L17 2 Q8 0 11 -5Z',
      shade(skin, -9), ink, 1.55);
    ctx.restore();
  }

  // Smile, concern, anger, surprise, and squint can blend independently of speech.
  const expressions = {
    neutral: [.08, 0, 0, 0, 0],
    happy: [.75, 0, 0, 0, .22],
    funny: [1, 0, 0, 0, .65],
    sad: [0, .82, 0, 0, .21],
    worried: [0, 1, 0, .18, 0],
    angry: [0, .26, 1, 0, .22],
    surprised: [0, 0, 0, 1, 0],
  };

  function expression(state) {
    const target = expressions[state.pose === 'laugh' ? 'funny' : state.emotion] ?? expressions.neutral;
    const previous = expressions[state.previousEmotion] ?? target;
    const delivery = expressions[state.deliveryEmotion] ?? target;
    return target.map((value, i) =>
      mix(mix(previous[i], value, state.emotionBlend ?? 1), delivery[i], state.deliveryBlend ?? 0));
  }

  function mouth(ctx, character, open, smile, worry, anger, surprise) {
    const y = character.moustache ? -263 : -266;
    const depth = open * 8.9 + smile * 5.6;
    if (surprise > .58 && smile < .15) {
      ellipse(ctx, 7, y + 2, 4 + open * 4, 4 + open * 4.8, '#532d2c', '#522d29', 1.1);
      if (open > .42) ellipse(ctx, 7.2, y + 4.6, 2.7, 1.35, '#b86f65');
      return;
    }
    const left = -4 - smile * 6.6;
    const right = 16 + smile * 6.2;
    const corner = y - smile * 4 + worry * 2.3 + anger * 2.1;
    const upper = y - worry * 4.8 - anger * 2.9 + smile * 1.7;
    if (depth > 2.3) {
      const shape = `M${left} ${corner} Q6 ${upper} ${right} ${corner - .8}
        Q12 ${y + depth * 1.56} 5 ${y + depth * .88} Q-4 ${y + depth * .68} ${left} ${corner}Z`;
      path(ctx, shape, '#552c2c', '#61352d', 1.05);
      if (smile > .39) {
        path(ctx, `M${left + 1.9} ${corner + 1} Q6 ${upper + .38} ${right - 2.2} ${corner + .35}
          Q11 ${y + 3.3 + smile} 5 ${y + 3.0} Q-3 ${y + 2} ${left + 1.9} ${corner + 1}Z`, '#fff0d6');
      }
      if (depth > 8) ellipse(ctx, 6, y + depth * .68, 4.2, 1.43, '#b76b62');
    } else {
      path(ctx, `M${left} ${corner} Q6 ${y + smile * 5.7 - worry * 5.7 - anger * 3.4} ${right} ${corner - .6}`,
        null, '#63352f', 1.75);
    }
    if (smile > .48) {
      path(ctx, `M${left - 2} ${corner + 2} q-1 -2.7 2 -4.2 M${right - 1} ${corner - 2.2} q3 0 3 3.8`,
        null, shade(character.skin, -41), 1.3);
    }
  }

  function head(ctx, character, state, open, blink, gaze, rear) {
    const [smile, worry, anger, surprise, squint] = expression(state);
    const skin = character.skin;
    const skinDark = shade(skin, -21);
    const skinLight = shade(skin, 18);
    const jata = character.hair === 'jata';
    const hair = jata ? '#d6d1c8' : character.hair === 'grey' ? '#565052' : '#26262a';
    const hairLight = jata ? '#f4f1ea' : character.hair === 'grey' ? '#7e7470' : '#413437';
    const elder = character.age === 'elder';
    const female = character.gender === 'female';
    const jaw = female ? 19 : elder ? 25 : 23;
    const earY = -283;
    if (character.hair === 'bun') {
      ellipse(ctx, -32, -277, 19, 21, hair, darkInk, 2.1);
      path(ctx, 'M-44 -287 Q-53 -269 -35 -264 M-46 -279 Q-44 -268 -35 -267', null, hairLight, 1.6);
    }
    path(ctx, `M-18 -267 L-17 -241 Q0 -223 18 -242 L15 -270Z`, skinDark, ink, 1.9);
    const cheek = gradient(ctx, -30, -320, 32, -261, [skinLight, skin, skinDark]);
    const jawDrop = open * 3.6 + smile * 1.7;
    const face = `M-33 -310 C-29 -338 15 -340 28 -321 C34 -311 35 -296 32 -284
      Q34 -267 ${jaw} ${-259 + jawDrop} Q9 ${-248 + jawDrop} -7 ${-252 + jawDrop}
      Q-30 -254 -34 -278 Q-42 -290 -33 -310Z`;
    path(ctx, face, rear ? hair : cheek, ink, 2);
    if (!rear) {
      ellipse(ctx, -35, earY, 7.5, 10.6, skin, ink, 1.5);
      path(ctx, 'M-39 -285 Q-35 -292 -32 -284 L-35 -280', null, skinDark, 1.6);
      path(ctx, 'M-29 -281 Q-31 -270 -25 -264 Q-14 -256 3 -256 Q-7 -251 -18 -256 Q-29 -260 -33 -274Z', skinDark);
      ellipse(ctx, -17, -274, 8, 3.4, shade(skin, 7));
    }

    if (character.hair === 'turban') {
      path(ctx, 'M-40 -298 Q-48 -313 -34 -330 Q-19 -347 7 -346 Q31 -344 39 -324 Q45 -309 34 -301 Q22 -298 14 -307 Q-2 -299 -20 -308 Q-28 -299 -40 -298Z', character.accent, ink, 2.4);
      path(ctx, 'M-35 -326 Q-21 -311 20 -306 Q33 -304 40 -311 M-21 -338 Q-9 -324 26 -319 M-2 -345 Q9 -332 35 -327 M-43 -310 Q-33 -311 -22 -316',
        null, shade(character.accent, -42), 2.4);
      path(ctx, 'M-27 -330 Q-2 -309 22 -312', null, shade(character.accent, 23), 3);
      if (character.jewelry === 'gold') {
        path(ctx, 'M-4 -321 Q-12 -352 6 -366 Q5 -346 0 -331Z', '#f1ead0', '#a89a6a', 1);
        path(ctx, 'M-39 -304 Q-18 -311 12 -308', null, '#e8c25a', 2.2);
        path(ctx, 'M-14 -322 Q-4 -331 8 -321 Q0 -312 -14 -322Z', '#e8c25a', '#8a6420', 1.4);
        ellipse(ctx, -3, -320.5, 2.6, 2.6, '#c42f45', '#7a1d2c', 0.7);
      }
    } else if (jata) {
      // Matted locks (jata): a coiled top-knot, a thin scalp, and long ropes of hair hanging past the shoulders.
      const lock = (x0, y0, x1, y1, bend, w) => path(ctx, `M${x0} ${y0} Q${x0 + bend} ${(y0 + y1) / 2} ${x1} ${y1} L${x1 + w} ${y1 + 3} Q${x0 + bend + w * 1.6} ${(y0 + y1) / 2} ${x0 + w} ${y0}Z`, hair, '#8c867c', 1.3);
      lock(-37, -298, -47, -238, -7, 5);
      lock(-33, -296, -41, -222, -3, 4);
      path(ctx, 'M-38 -283 Q-44 -300 -38 -318 Q-30 -338 0 -341 Q30 -340 38 -318 Q42 -300 36 -283 Q30 -300 20 -306 Q0 -312 -20 -306 Q-30 -300 -38 -283Z', hair, '#8c867c', 1.8);
      ctx.save();
      ctx.translate(2, -345);
      ctx.scale(0.72, 0.72);
      ellipse(ctx, 0, 4, 29, 20, hair, '#8c867c', 2);
      ellipse(ctx, 0, -8, 21, 15, shade(hair, -6), '#8c867c', 1.6);
      ellipse(ctx, 0, -17, 12, 9, hair, '#8c867c', 1.5);
      path(ctx, 'M-24 6 Q-10 -6 6 4 M-18 -4 Q-2 -14 16 -4 M-10 -14 Q2 -22 12 -14', null, '#9b958a', 1.6);
      path(ctx, 'M-27 8 Q-33 22 -30 34', null, '#8c867c', 3);
      ctx.restore();
      path(ctx, 'M-33 -318 Q-10 -326 12 -322 M-28 -308 Q-6 -314 24 -310', null, '#a8a298', 1.4);
    } else if (character.hair === 'bald') {
      path(ctx, 'M-38 -283 Q-42 -294 -38 -304 L-33 -297Z M36 -300 Q40 -292 36 -284 L32 -290Z', hair, darkInk, 1.3);
      path(ctx, 'M-30 -326 Q-8 -340 18 -334', null, 'rgba(255,255,255,.22)', 3);
    } else if (character.hair === 'topi') {
      path(ctx, 'M-38 -283 Q-41 -296 -37 -305 L-31 -299 L-31 -285Z', hair, darkInk, 1.3);
      path(ctx, 'M-37 -306 Q-35 -348 3 -351 Q39 -348 40 -311 Q28 -300 2 -304 Q-24 -300 -37 -306Z', '#f3eee2', ink, 2.1);
      path(ctx, 'M-31 -322 Q3 -333 34 -322 M-35 -309 Q2 -301 38 -311', null, '#cfc6b0', 1.8);
    } else {
      const hairline = female
        ? 'M-37 -284 Q-47 -296 -38 -320 Q-29 -343 1 -344 Q28 -344 36 -326 Q41 -317 34 -298 Q21 -307 15 -327 Q-1 -305 -23 -301 Q-30 -300 -31 -285Z'
        : character.hair === 'crop'
          ? 'M-38 -283 Q-44 -300 -37 -316 Q-30 -339 -4 -341 Q26 -344 36 -325 Q40 -318 34 -307 Q25 -310 21 -319 Q5 -314 -12 -316 Q-25 -312 -29 -304 L-29 -284Z'
          : 'M-38 -283 Q-44 -295 -39 -312 Q-42 -328 -20 -338 Q-5 -350 21 -338 Q37 -337 41 -322 Q44 -313 35 -306 Q29 -307 28 -317 Q12 -313 -4 -322 Q-11 -314 -26 -309 L-29 -284Z';
      path(ctx, hairline, hair, darkInk, 2);
      path(ctx, female ? 'M-33 -310 Q-12 -316 8 -337 M-24 -305 Q-4 -313 12 -333 M18 -334 Q24 -321 33 -314'
        : 'M-29 -320 Q-22 -334 0 -337 M-20 -318 Q-8 -326 3 -328 M12 -332 Q28 -330 33 -322', null, hairLight, 1.7);
    }
    if (character.veil) {
      path(ctx, 'M-48 -280 Q-60 -332 -6 -354 Q48 -348 52 -296 Q48 -276 39 -262 Q36 -292 26 -305 Q4 -321 -22 -305 Q-34 -293 -38 -262 Q-45 -268 -48 -280Z', character.primary, ink, 2);
      path(ctx, 'M-38 -266 Q-33 -294 -22 -306 Q4 -321 26 -305 Q36 -292 39 -264', null, character.accent, 2.4);
    }
    if (rear) {
      path(ctx, 'M-30 -302 Q-10 -282 29 -299 L28 -273 Q6 -255 -24 -270Z', hair);
      return;
    }
    const brow = (x, y, side) => {
      const inner = y - worry * 5 + anger * 4.5;
      const outer = y + worry * 1.1 - anger * 3;
      path(ctx, `M${x - 8.5} ${side < 0 ? outer : inner} Q${x - side} ${y - 5.5 - surprise * 2 - smile * 1.7}
        ${x + 8} ${side < 0 ? inner : outer}`, null, hair, jata ? 5.6 : elder ? 3.2 : 2.8);
      if (jata) path(ctx, `M${x - 10} ${(side < 0 ? outer : inner) - 3} Q${x} ${y - 10 - surprise * 2} ${x + 10} ${(side < 0 ? inner : outer) - 3}`, null, hairLight, 2.2);
    };
    brow(-11, -299 - surprise * 4.4 - smile * 1.7, -1);
    brow(18, -300 - surprise * 4.0 - smile * 2.5, 1);
    for (const [x, y, w] of [[-10, -290, 8.1], [18, -291, 7]]) {
      const lid = clamp(blink * (1 - surprise * .78) + squint * .79, 0, 1);
      if (lid > 0.77) {
        path(ctx, `M${x - w} ${y} Q${x} ${y + 2 - smile * 7.3} ${x + w} ${y - 1}`, null, ink, 1.85);
      } else {
        const ry = (4.85 + surprise * 2.3 - smile * .52 - anger * .65) * (1 - lid * .68);
        path(ctx, `M${x - w} ${y} Q${x - 2} ${y - ry * 2.02} ${x + w} ${y - 0.5} Q${x} ${y + ry * 1.43} ${x - w} ${y}Z`, '#fff4de', ink, 1.3);
        const pupil = x + 1 + gaze.x * 2.55;
        const pupilY = y + gaze.y * Math.min(1.15, ry * .22);
        ellipse(ctx, pupil, pupilY, 3.15 - surprise * .37, ry * .87, '#432d28');
        ellipse(ctx, pupil + .86, pupilY - .94, .99, .95, '#fff3dc');
      }
    }
    path(ctx, 'M7 -292 Q7 -283 12 -278 Q11 -275 5 -276 M0 -276 Q3 -278 6 -277', null, shade(skin, -48), 1.5);
    if (smile > .44) {
      ellipse(ctx, -18, -277, 8.9, 3.6, '#cb775b70');
      ellipse(ctx, 25, -278, 5.3, 3.6, '#cb775b60');
      path(ctx, 'M-24 -282 Q-18 -286 -14 -283 M23 -283 Q27 -286 29 -283', null, shade(skin, -30), 1.15);
    }
    if (character.beard && character.beard !== 'none') {
      const fur = character.beard === 'white' || character.beard === 'long' ? '#efebe4' : hair;
      if (character.beard === 'long') {
        path(ctx, 'M-32 -284 Q-40 -248 -24 -226 Q-12 -212 2 -203 Q14 -212 25 -228 Q40 -248 33 -280 Q27 -263 17 -260 Q5 -255 -9 -259 Q-23 -261 -32 -284Z', fur, '#8c867c', 1.6);
        path(ctx, 'M-24 -252 Q-22 -230 -9 -212 M-8 -248 Q-6 -226 0 -208 M8 -248 Q9 -226 4 -208 M21 -252 Q21 -230 12 -214 M-30 -264 Q-34 -244 -22 -228 M30 -264 Q36 -244 23 -228', null, '#b7b1a6', 1.3);
      }
      else path(ctx, character.beard === 'short'
        ? 'M-31 -281 Q-30 -255 -4 -247 Q22 -250 31 -278 Q25 -265 17 -261 Q5 -256 -9 -259 Q-23 -261 -31 -281Z'
        : 'M-32 -282 Q-34 -246 -6 -232 Q24 -236 33 -276 Q27 -262 17 -259 Q5 -254 -9 -258 Q-23 -260 -32 -282Z', fur, darkInk, 1.3);
    }
    if (character.tilak === 'tripund') {
      path(ctx, 'M-11 -316 Q4 -319 19 -316 M-12 -311 Q4 -314 20 -311 M-11 -306 Q4 -309 18 -306', null, '#f4f1e8', 2.3);
      ellipse(ctx, 4, -300, 2.2, 2.3, '#b3262a');
    }
    if (character.tilak === 'red') path(ctx, 'M3 -313 L4.5 -301', null, '#c9352a', 2.4);
    if (character.tilak === 'sandal') {
      path(ctx, 'M-8 -313 Q4 -315 16 -313 M-8 -309 Q4 -311 16 -309 M-7 -305 Q4 -307 15 -305', null, '#efe3c2', 1.7);
      ellipse(ctx, 4, -308, 1.7, 1.9, '#c9352a');
    }
    mouth(ctx, character, open, smile, worry, anger, surprise);
    if (character.moustache) {
      ctx.save();
      ctx.translate(0, -1.4 - smile * 2.3);
      path(ctx, 'M5 -276 Q-4 -278 -10 -271 Q-14 -269 -16 -270 Q-11 -262 -2 -266 L6 -270 Q13 -265 20 -266 Q25 -267 24 -271 Q21 -269 17 -272 Q12 -277 5 -276Z',
        jata ? '#f1ede6' : character.hair === 'grey' || elder ? '#4d4140' : hair, jata ? '#8c867c' : darkInk, jata ? 1.2 : 0.75);
      if (jata) path(ctx, 'M-16 -270 Q-24 -262 -22 -252 M24 -271 Q32 -263 29 -252', null, '#f1ede6', 3.4);
      ctx.restore();
    }
    if (jata) {
      // Hollow cheeks, heavy lids, deep wrinkles and a long, thin nose: an old man who has fasted for years.
      ctx.save();
      ctx.globalAlpha = 0.34;
      ellipse(ctx, -21, -272, 9, 15, skinDark);
      ellipse(ctx, 27, -274, 7, 14, skinDark);
      ctx.restore();
      path(ctx, 'M-20 -297 Q-10 -303 -1 -298 M10 -298 Q19 -304 28 -298', null, shade(skin, -45), 2.1);
      path(ctx, 'M-19 -283 Q-10 -279 -2 -283 M9 -284 Q18 -280 26 -284', null, shade(skin, -34), 1.4);
      path(ctx, 'M-16 -318 Q4 -322 24 -317 M-14 -312 Q4 -316 22 -311', null, shade(skin, -40), 1.4);
      path(ctx, 'M-22 -290 Q-30 -294 -33 -299 M-22 -286 Q-31 -287 -34 -290 M28 -291 Q34 -295 36 -300', null, shade(skin, -40), 1.2);
      path(ctx, 'M-14 -276 Q-19 -268 -17 -259 M17 -277 Q22 -269 21 -261', null, shade(skin, -44), 1.6);
      path(ctx, 'M5 -294 Q4 -281 10 -276 Q6 -273 0 -275', null, shade(skin, -55), 1.8);
    }
    if (elder) {
      path(ctx, 'M-17 -308 Q-5 -311 8 -309 M-14 -304 Q-5 -305 2 -304 M-24 -280 Q-21 -279 -19 -278 M19 -277 Q22 -276 24 -274',
        null, shade(skin, -33), 1.1);
    }
    if (female) {
      ellipse(ctx, 4, -303, 2.2, 2.3, '#9c343c');
      ellipse(ctx, -36, -275, 3.1, 3.7, '#edb750', '#8d633e', 1);
      ellipse(ctx, -36, -270, 2.2, 2.1, '#e8b749');
    }
    if (character.jewelry === 'gold') {
      if (female) {
        ellipse(ctx, 9.5, -276, 3.1, 3.1, null, '#e8c25a', 1.5);
        path(ctx, 'M2 -333 L3 -313', null, '#e8c25a', 1.2);
        ellipse(ctx, 3, -310, 3.1, 3.6, '#e8c25a', '#8a6420', 0.9);
        ellipse(ctx, 3, -310, 1.3, 1.5, '#c42f45');
        ellipse(ctx, -36, -263, 3, 6.5, '#e8c25a', '#8a6420', 0.9);
      } else {
        ellipse(ctx, -36, -274, 2.7, 3.4, '#e8c25a', '#8a6420', 0.9);
        ellipse(ctx, -36, -268, 2, 2, '#e8c25a');
      }
    } else if (character.jewelry === 'simple' && female) {
      ellipse(ctx, 9, -276, 1.4, 1.4, '#cfd8dc');
    }
    if (character.glasses) {
      ellipse(ctx, -10, -290, 11.8, 8.4, null, '#4d3932', 1.7);
      ellipse(ctx, 18, -291, 10, 8.2, null, '#4d3932', 1.7);
      path(ctx, 'M2 -292 Q6 -296 8 -292 M-21 -292 L-34 -287', null, '#4d3932', 1.7);
    }
  }

  function gesture(pose, t, open) {
    const wave = Math.sin(t * 11);
    const beat = Math.sin(t * 6) * (3 + open * 8);
    if (pose === 'walk' || pose === 'run' || pose === 'sneak') {
      const swing = Math.sin(t * (pose === 'run' ? 11 : pose === 'sneak' ? 5.1 : 6.8)) * (pose === 'run' ? 35 : 23);
      if (pose === 'sneak') return [57, -178, 64 + swing * 0.6, -167, -51, -164, -46 - swing * 0.75, -132];
      return [56 + swing, -156, 45 + swing * 1.25, -116, -50 - swing * 0.7, -159, -57 - swing, -119];
    }
    if (pose === 'point') return [73, -193, 111 + beat * 0.3, -212, -49, -156, -50, -115];
    if (pose === 'open') return [64, -166, 98, -193 + beat, -54, -165, -74, -180 - beat];
    if (pose === 'talk') return [57, -168, 79, -171 + beat, -49, -154, -53, -117];
    if (pose === 'think') return [56, -168, 15, -251, -51, -158, -25, -155];
    if (pose === 'wave') return [60, -190, 70 + wave * 13, -256 + wave * 3, -51, -157, -50, -113];
    if (pose === 'fold') return [55, -166, -21, -169, -53, -166, 22, -173];
    if (pose === 'reach') return [75, -182, 104, -159, -53, -154, -55, -116];
    if (pose === 'hold') return [49, -160, 16, -160, -48, -160, -17, -160];
    if (pose === 'check-pocket') return [61, -157, 21, -130, -62, -156, -23, -133];
    if (pose === 'offer') return [67, -183, 98, -168, -51, -158, -37, -138];
    if (pose === 'read') return [55, -174, 27, -199, -55, -173, -13, -195];
    if (pose === 'flinch') return [64, -194, 68, -237, -58, -196, -66, -221];
    if (pose === 'listen') return [54, -174, 31, -265, -53, -160, -47, -121];
    if (pose === 'sniff') return [57, -171, 38, -240 + Math.sin(t * 3) * 2, -50, -163, -45, -126];
    if (pose === 'cheer') return [64, -208, 79, -273 + wave * 5, -58, -205, -75, -257 - wave * 4];
    if (pose === 'write') return [61, -180, 59 + Math.sin(t * 10) * 5, -146 + Math.cos(t * 10) * 2, -60, -163, -27, -142];
    if (pose === 'comfort') return [68, -212, 113, -200 + beat * 0.2, -55, -171, -32, -140];
    if (pose === 'work') return [61, -187, 43 + Math.sin(t * 7) * 8, -157, -51, -183, -13, -164];
    if (pose === 'laugh') return [58, -178, 38 + beat * .27, -151, -57, -173, -30, -145 - beat * .2];
    if (pose === 'present') return [57, -186, 64 + beat * .28, -222 + beat * .34, -55, -165, -35, -133];
    if (pose === 'cradle') return [54, -177, 31 + beat * .13, -159, -52, -175, -29 + beat * .13, -159];
    if (pose === 'pass') return [73, -182, 106, -165 + beat * .11, -49, -181, 66, -166 + beat * .11];
    if (pose === 'scoop') return [62, -155, 75, -88, -50, -161, 38, -96];
    if (pose === 'attend') return [48, -170, 49, -126, -48, -171, -47, -126];
    if (pose === 'doze') return [57, -168, 28, -155, -49, -171, -22, -156];
    if (pose === 'shiver') return [57, -164, -12, -170, -53, -164, 26, -172];
    if (pose === 'bow') return [60, -150, 92, -98, -50, -150, 70, -92];
    if (pose === 'hush') return [52, -188, 11, -255, -49, -164, -44, -128];
    return [52, -159, 52, -115 + beat * 0.12, -49, -159, -54, -116];
  }

  const stanceDepth = { sit: 91, crouch: 43 };
  function stanceDrop(state) {
    const drop = stanceDepth[state.stance] || 0;
    const from = state.previousStance ? stanceDepth[state.previousStance] || 0 : drop;
    return mix(from, drop, state.stanceBlend ?? 1);
  }

  const buildFactor = character => (character.build === 'stout' ? 1.18 : character.build === 'slim' ? 0.9 : 1);
  function bodyWidth(character) {
    return (character.gender === 'female' ? 0.91 : character.age === 'elder' ? 0.95 : 1) * buildFactor(character);
  }

  function bodyMotion(character, state, time) {
    const phase = time + (character.seed % 911) / 113;
    const { pose, face } = state;
    const step = ({ run: 11, walk: 6.8, sneak: 5.1 })[pose] || 0;
    const swing = Math.sin(time * step) * (step === 11 ? 31 : 18);
    const lift = Math.abs(Math.sin(time * step)) * (step === 11 ? 20 : 8);
    const laugh = pose === 'laugh' ? (state.poseBlend ?? 1) : state.emotion === 'funny' ? .32 : 0;
    const breathing = Math.sin(phase * 2.12) * 1.8;
    const bob = (step ? -Math.abs(Math.cos(time * step)) * 4.4 : breathing)
      - laugh * (3.4 + Math.sin(time * 16) * 3.1);
    const leaning = { sneak: -.07, flinch: .055, laugh: .04, pass: -.046, scoop: -.047, comfort: -.035, doze: -.045, bow: -.5, shiver: .05 };
    const aim = leaning[pose] ?? 0;
    let lean = mix(leaning[state.previousPose] ?? aim, aim, state.poseBlend ?? 1)
      + Math.sin(phase * 1.3) * .007 + (state.lean ?? 0);
    let feet = null, walkBob = null, walkSwing = null;
    if (state.walkPhase != null) {
      // Planted-foot walk: each foot slides back linearly while on the ground (60% of the cycle)
      // at exactly body speed, then lifts and swings forward. Women take a shorter, softer step.
      const female = character.gender === 'female';
      const S = state.stride ?? (female ? 12 : 18), L = (female ? 5 : 9) * Math.min(1, S / (female ? 12 : 18));
      const foot = p => {
        p = ((p % 1) + 1) % 1;
        if (p < .6) return [S - 2 * S * (p / .6), 0];
        const q = (p - .6) / .4, e = q * q * (3 - 2 * q);
        return [-S + 2 * S * e, Math.sin(q * Math.PI) * L];
      };
      const p = state.walkPhase;
      const [nx, nl] = foot(p), [fx, fl] = foot(p + .5);
      feet = { nx, nl, fx, fl };
      walkBob = -(female ? 1.8 : 3.2) * (.5 - .5 * Math.cos(p * Math.PI * 4));
      walkSwing = -Math.sin(p * Math.PI * 2); // arms opposite to the legs
      if (female) lean += Math.sin(p * Math.PI * 4) * .006;
    }
    return { phase, swing, lift, drop: state.drop ?? stanceDrop(state), bob: walkBob ?? bob, lean, laugh, feet, walkSwing,
      width: (face === 'left' ? -1 : 1) * bodyWidth(character) };
  }

  function actingPose(state, speaking) {
    if (state.carry && ['walk', 'run', 'sneak'].includes(state.pose)) {
      return state.carry === 'both' ? 'cradle' : 'hold';
    }
    return (state.pose === 'idle' || state.pose === 'look') && speaking ? 'talk' : state.pose;
  }

  function armPoints(state, time, mouth, speaking) {
    const active = gesture(actingPose(state, speaking), time, mouth);
    if (!state.previousPose || state.poseBlend >= 1) return active;
    const from = gesture(state.previousPose, time, mouth);
    return active.map((value, i) => VillageDraw.mix(from[i], value, state.poseBlend));
  }

  function hand(character, state, time, mouth, speaking) {
    const [, , x, y] = armPoints(state, time, mouth, speaking);
    const body = bodyMotion(character, state, time);
    const height = y + 7 + body.drop + body.bob;
    return [(x + body.lean * height) * body.width, height];
  }

  function grasp(character, state, time, mouth, speaking, side) {
    const body = bodyMotion(character, state, time);
    const arms = armPoints(state, time, mouth, speaking);
    const anchored = side === 'waist' || side === 'shoulder';
    const hands = anchored ? [] : side === 'both' ? [0, 4] : [side === 'far' ? 4 : 0];
    const wrists = hands.map(i => {
      const [elbowX, elbowY, x, y] = arms.slice(i, i + 4);
      return { x, y, rotation: handAngle(elbowX, elbowY, x, y) };
    });
    const palms = wrists.map(({ x, y, rotation }) => [x - Math.sin(rotation) * 8, y + Math.cos(rotation) * 8]);
    const [x, y] = palms.length === 2 ? [
      (palms[0][0] + palms[1][0]) / 2, (palms[0][1] + palms[1][1]) / 2,
    ] : palms[0] ?? (side === 'shoulder' ? [-37, -238] : [39, -150]);
    const vertical = y + body.bob + body.drop;
    return { x: (x + body.lean * vertical) * body.width, y: vertical, body, wrists };
  }

  function graspFingers(ctx, character, contact) {
    const { body, wrists } = contact;
    const skin = character.skin;
    ctx.save();
    ctx.scale(body.width, 1);
    ctx.transform(1, 0, body.lean, 1, 0, 0);
    ctx.translate(0, body.drop + body.bob);
    for (const wrist of wrists) {
      ctx.save();
      ctx.translate(wrist.x, wrist.y);
      ctx.rotate(wrist.rotation);
      path(ctx, 'M-7 2 Q-3 0 1 3 L5 8 Q8 5 10 8 Q11 12 8 16 Q4 20 0 16 L-5 12 Q-10 7 -7 2Z',
        skin, ink, 1.35);
      path(ctx, 'M1 5 Q1 8 5 10 M2 12 Q4 14 7 13', null, shade(skin, -42), .94);
      ctx.restore();
    }
    ctx.restore();
  }


  // Arm solver for the prototype: original gesture table, walk swing synced to the planted feet,
  // IK for explicit hand targets, and damped springs between poses (slight overshoot, no snapping).
  const UPPER = 58, FORE = 57;
  function ikArm(sx, sy, tx, ty, pole) {
    const r = Lab.ik(sx, sy, tx, ty, UPPER, FORE, [sx + pole[0], sy + pole[1]], .5);
    return [r.mx, r.my, r.ex, r.ey];
  }
  function arms2(character, state, time, mouth, speaking, motion) {
    let pts;
    if (motion.walkSwing != null && ['walk', 'run', 'sneak'].includes(actingPose(state, speaking)) && !state.carry) {
      // the original walk gesture, driven by the walk phase instead of the clock
      const sw = motion.walkSwing * (character.gender === 'female' ? 16 : 23);
      pts = [56 + sw, -156, 45 + sw * 1.25, -116, -50 - sw * .7, -159, -57 - sw, -119];
    } else pts = armPoints(state, time, mouth, speaking);
    if (state.handN) { const [a, b, c, d] = ikArm(33, -226, state.handN[0], state.handN[1], state.poleN || [-40, 110]); pts = [a, b, c, d, ...pts.slice(4)]; }
    if (state.handF) { const [a, b, c, d] = ikArm(-35, -226, state.handF[0], state.handF[1], state.poleF || [-50, 110]); pts = [...pts.slice(0, 4), a, b, c, d]; }
    if (state.beatN) { pts[0] += state.beatN[0] * .35; pts[1] += state.beatN[1] * .35; pts[2] += state.beatN[0]; pts[3] += state.beatN[1]; }
    const rig = state.rig;
    if (!rig) return pts;
    const dt = rig.last == null ? 0 : Math.max(0, Math.min(.1, time - rig.last));
    rig.last = time;
    if (!rig.s) rig.s = pts.map(v => new Lab.Spring(v, state.walkPhase != null ? 9 : 4.2, .62));
    const freq = state.walkPhase != null ? 9 : (state.rigFreq ?? 4.2);
    return pts.map((v, i) => {
      rig.s[i].f = freq;
      const locked = (i < 4 && state.lockN) || (i >= 4 && state.lockF);
      if (locked) { rig.s[i].x = v; rig.s[i].v = 0; return v; }
      return rig.s[i].step(v, dt);
    });
  }

  // Convert a point in the person's local space (after translate/scale) into arm space.
  function armSpace(character, state, time, p) {
    const m = bodyMotion(character, state, time);
    const y = p[1];
    return [p[0] / m.width - m.lean * y, y - (m.bob + m.drop)];
  }
  function fromArm(character, state, time, a) {
    const m = bodyMotion(character, state, time);
    const y = a[1] + m.bob + m.drop;
    return [(a[0] + m.lean * y) * m.width, y];
  }

  // Face controls from the engine state: emotion (with a springy blend from the previous one), the line's
  // delivery emotion, pose cues, gaze, blinks, and Hindi mouth shapes from the caption text.
  const tracks = new WeakMap();
  function engineFace(state, pose, laugh, blink, gaze, vocal, speaking, time) {
    const cur = Face.exprOf(pose === 'laugh' ? 'funny' : pose === 'think' ? 'think' : state.emotion);
    const prev = Face.exprOf(state.previousEmotion ?? state.emotion);
    const k = state.emotionBlend ?? 1;
    const layers = [[prev, 1 - k], [cur, k]];
    if (state.deliveryEmotion && state.deliveryBlend) layers.push([Face.exprOf(state.deliveryEmotion), state.deliveryBlend * .6]);
    if (laugh) layers.push([Face.exprOf('funny'), laugh * .5]);
    const c = Face.blend(...layers);
    c.blink = Math.max(c.blink || 0, blink);
    if (state.tears) c.tears = 1;
    c.gazeX = gaze.x; c.gazeY = Math.max(c.gazeY, gaze.y * .9);
    const line = state.line;
    if (speaking && line && line.text && typeof LipSync !== 'undefined') {
      let tr = tracks.get(line);
      if (!tr) { tr = LipSync.track(line.text, line.start + .04, line.end - .06); tracks.set(line, tr); }
      const vis = LipSync.sample(tr, time).ctl;
      const g = clamp(vocal * 3.2, 0, 1); // silence in the recording closes the mouth
      for (const n of ['jaw', 'wide', 'pucker', 'teeth', 'tongue', 'lowerIn']) c[n] = (c[n] || 0) * .35 + (vis[n] || 0) * g;
      if (vis.closed) { c.closed = vis.closed; c.jaw *= 1 - vis.closed; }
      c.press = Math.max(c.press || 0, vis.press || 0);
      if (!vis.jaw && !vis.closed) c.jaw = Math.max(c.jaw, vocal * .6);
    } else c.jaw = Math.max(c.jaw || 0, vocal * .75);
    return c;
  }

  function person(ctx, character, state, time, mouth, speaking, image) {
    if (image) {
      contain(ctx, image, 232, 347, 0);
      return;
    }
    const baseTransform = ctx.getTransform();
    const { pose, face } = state;
    const rear = face === 'back';
    const female = character.gender === 'female';
    const sari = character.costume === 'sari';
    const wrap = ['dhoti', 'kurta', 'salwar', 'sari', 'ascetic'].includes(character.costume);
    const ascetic = character.costume === 'ascetic';
    const long = ['kurta', 'dhoti', 'salwar', 'ascetic'].includes(character.costume);
    const short = sari || character.costume === 'shirt' || character.costume === 'ascetic';
    const skin = character.skin;
    const primary = character.primary;
    const accent = character.accent;
    const shadow = shade(skin, -32);
    const clothShade = shade(primary, -35);
    const pants = sari ? primary : character.costume === 'dhoti' ? '#e6d7b5' : character.costume === 'ascetic' ? shade(character.primary, -6) :
      character.costume === 'salwar' ? shade(primary, -22) : character.costume === 'kurta' ? '#d1bfa6' : '#424854';
    const motion = bodyMotion(character, state, time);
    const { phase, swing, lift, drop, bob, lean, laugh, width } = motion;
    const activePose = actingPose(state, speaking);
    const [ex, ey, hx, hy, bx, by, kx, ky] = arms2(character, state, time, mouth, speaking, motion);
    const jewel = character.jewelry === 'gold' ? '#e8c25a' : character.jewelry === 'simple' ? '#8fb7c8' : null;
    const colors = { skin, shadow, cloth: ascetic ? shade(skin, -6) : clothShade, cuff: ascetic ? skin : accent, bangle: jewel, ring: character.jewelry === 'gold' ? '#f0cf6a' : null };
    const support = state.carry === 'both' || state.farFront;
    ctx.save();
    ctx.scale(width, 1);
    ctx.transform(1, 0, lean, 1, 0, 0);
    const feet = character.barefoot ? shade(skin, -6) : '#533b33';
    leg(ctx, -18, motion.feet ? motion.feet.fx : -swing, motion.feet ? motion.feet.fl : (swing > 0 ? lift : 0), shade(pants, -12), shade(pants, -26), skin, wrap, drop, feet);
    leg(ctx, 18, motion.feet ? motion.feet.nx : swing, motion.feet ? motion.feet.nl : (swing < 0 ? lift : 0), pants, shade(pants, -18), skin, wrap, drop, feet);
    ctx.translate(0, bob + drop);
    if (!support) arm(ctx, -35, -226, bx, by, kx, ky, colors, short, sari, false);
    if (character.hair === 'braid') {
      path(ctx, `M-31 -309 Q-54 -266 -41 -232 Q-33 -210 ${-44 + swing * 0.19} -181 L-36 -174 Q-24 -198 -31 -229 Q-37 -261 -24 -300Z`, '#29252b', darkInk, 2);
      for (let i = 0; i < 7; i++) {
        path(ctx, `M${-42 + Math.sin(i / 2) * 4} ${-255 + i * 10} q4 6 10 2`, null, '#4d3a3a', 2);
      }
      line(ctx, -42 + swing * 0.19, -185, -34 + swing * 0.19, -182, accent, 3);
    }
    const hem = sari ? -20 - drop : long ? Math.min(-94, -38 - drop) : -122;
    const hemK = sari ? .75 : long ? .3 : 0;
    const hemL = motion.feet ? Math.min(motion.feet.nx, motion.feet.fx) * hemK - 2 : 0;
    const hemR = motion.feet ? Math.max(motion.feet.nx, motion.feet.fx) * hemK + 2 : 0;
    const body = `M-15 -247 Q-29 -244 -41 -234 Q-49 -221 -43 -198 Q-37 -169 ${-42 + hemL} ${hem + 7}
      Q-21 ${hem - 3} ${-1 + (hemL + hemR) / 2} ${hem} Q22 ${hem + 5} ${45 + hemR} ${hem + 1}
      Q35 -170 44 -204 Q51 -230 34 -239 L17 -247 Q1 -237 -15 -247Z`;
    const fabric = gradient(ctx, -41, -237, 43, hem, [shade(primary, 18), primary, clothShade]);
    path(ctx, body, fabric, ink, 2.15);
    path(ctx, `M30 -230 Q23 -197 27 -162 L39 ${hem + 1} L45 ${hem + 1} Q34 -171 44 -204 Q50 -224 41 -232Z`, clothShade);
    path(ctx, `M-34 -200 Q-30 -179 -36 -159 M28 -164 Q27 -146 31 ${hem + 9} M-25 ${hem + 13} Q-18 ${hem + 9} -11 ${hem + 11}`, null, shade(primary, -20), 1.55);
    if (sari) {
      path(ctx, `M-38 -235 Q-10 -210 28 -180 Q37 -169 38 -158 Q29 -148 -6 -163 Q-26 -174 -39 -194Z`, accent, ink, 1.5);
      path(ctx, `M-36 -226 Q-2 -191 35 -170 M-38 -210 Q-10 -183 37 -162 M-27 -147 Q-24 -87 ${-28 + hemL * .6} ${hem - 8} M-9 -147 Q-1 -78 ${-8 + (hemL + hemR) * .3} ${hem - 4} M7 -142 Q12 -83 ${9 + hemR * .6} ${hem - 4}`, null, shade(accent, -40), 2.1);
      path(ctx, `M${-41 + hemL} ${hem - 5} Q${4 + (hemL + hemR) / 2} ${hem} ${44 + hemR} ${hem - 4}`, null, accent, 5);
    } else if (character.costume === 'salwar') {
      path(ctx, 'M-33 -242 Q-20 -237 -7 -225 Q17 -203 38 -201 L38 -183 Q0 -184 -25 -208 L-38 -229Z', accent, shade(accent, -50), 1.5);
      path(ctx, 'M-33 -235 Q-1 -199 37 -193 M-40 -100 Q1 -91 43 -98', null, shade(accent, 20), 2);
      for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) {
        const x = -24 + i * 16 + (j % 2) * 4;
        const y = -163 + j * 17;
        ellipse(ctx, x, y, 1.3, 1.8, shade(primary, 27));
      }
    } else if (ascetic) {
      if (!rear) {
        // Bare, thin chest above a saffron lower cloth, a sash over one shoulder, ash marks and a rudraksha garland.
        const chest = 'M-33 -242 Q-39 -204 -31 -160 Q0 -148 32 -161 Q41 -204 33 -242 Q16 -222 0 -238 Q-16 -222 -33 -242Z';
        path(ctx, chest, gradient(ctx, -36, -242, 36, -150, [shade(skin, 14), skin, shade(skin, -22)]), ink, 1.8);
        path(ctx, 'M-20 -214 Q-10 -208 -4 -212 M20 -214 Q10 -208 4 -212 M-24 -196 Q-12 -190 -3 -194 M24 -196 Q12 -190 3 -194 M-18 -178 Q-8 -174 -2 -177 M18 -178 Q8 -174 2 -177', null, shade(skin, -38), 1.5);
        path(ctx, 'M-14 -240 Q0 -230 14 -240 M0 -232 L0 -196', null, shade(skin, -34), 1.3);
        ellipse(ctx, 1, -162, 2.2, 1.6, shade(skin, -46));
        path(ctx, 'M-18 -194 Q0 -190 18 -194 M-20 -186 Q0 -182 20 -186 M-18 -178 Q0 -174 18 -178', null, '#f1eee6', 2.3);
        path(ctx, 'M-42 -161 Q-21 -152 -1 -156 Q22 -152 45 -161 Q40 -150 44 -138 Q22 -133 0 -136 Q-22 -133 -40 -140 Q-45 -150 -42 -161Z', accent, ink, 1.6);
        path(ctx, 'M-32 -152 Q-30 -140 -33 -136 M6 -152 Q8 -140 4 -136 M28 -152 Q30 -140 28 -137', null, shade(accent, -34), 1.4);
        path(ctx, 'M-34 -240 Q-16 -226 8 -204 Q26 -184 41 -160 L33 -156 Q16 -178 -6 -198 Q-26 -216 -38 -232Z', accent, ink, 1.5);
        path(ctx, 'M-30 -234 Q-4 -212 30 -165', null, shade(accent, 26), 1.7);
        path(ctx, 'M-16 -243 Q0 -113 16 -243', null, '#4a2f1f', 2.4);
        for (let i = 1; i < 13; i++) {
          const k = i / 13;
          const bx = -16 + 32 * k;
          const by = -243 + 2 * (1 - k) * k * 130;
          ellipse(ctx, bx, by, 3.3, 3.5, '#6b4226', '#2f1c10', 0.8);
          ellipse(ctx, bx - 0.8, by - 0.9, 0.9, 0.9, '#b98a5e');
        }
      }
    } else if (!rear) {
      const collar = character.costume === 'vest' ? accent : shade(primary, 20);
      path(ctx, 'M-16 -246 L-23 -235 L-8 -222 L2 -235 L13 -223 L24 -236 L17 -246 Q0 -239 -16 -246Z', collar, ink, 1.5);
      path(ctx, `M2 -235 Q7 -201 4 ${hem + 1}`, null, clothShade, 1.7);
      for (let i = 0; i < 5; i++) ellipse(ctx, 5, -216 + i * 17, 2, 2.05, '#69504a', '#3d2e2b', 0.65);
      if (character.costume === 'vest' || character.costume === 'shirt') path(ctx, 'M16 -207 L31 -208 L30 -190 Q23 -187 17 -190Z', null, clothShade, 1.35);
      if (character.costume === 'dhoti') {
        path(ctx, 'M-34 -240 Q-27 -245 -17 -240 Q-20 -197 -17 -151 Q-29 -148 -37 -154 Q-39 -199 -34 -240Z', accent, shade(accent, -47), 1.4);
        path(ctx, 'M-34 -158 L-19 -155 M-32 -242 Q-30 -208 -30 -159', null, shade(accent, 25), 2);
      }
    }
    if (character.trim && !sari && !rear) {
      const g = character.trim;
      path(ctx, `M-42 ${hem + 6} Q-21 ${hem - 4} -1 ${hem - 1} Q22 ${hem + 4} 45 ${hem}`, null, g, 5.5);
      path(ctx, `M-41 ${hem - 6} Q-21 ${hem - 15} -1 ${hem - 12} Q22 ${hem - 8} 44 ${hem - 11}`, null, shade(g, -30), 2);
      path(ctx, 'M-16 -246 L-8 -222 L2 -235 L13 -223 L24 -236', null, g, 3);
      path(ctx, `M2 -235 Q7 -201 4 ${hem + 1}`, null, g, 3.2);
      for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) ellipse(ctx, -30 + i * 12 + (j % 2) * 6, -214 + j * 18, 1.5, 1.5, shade(g, 22));
    }
    if (jewel && !rear) {
      const rich = character.jewelry === 'gold';
      const long = female && rich ? -175 : -203;
      path(ctx, `M-17 -243 Q0 ${long} 17 -243`, null, jewel, 2.8);
      if (rich) {
        path(ctx, `M-20 -240 Q0 ${long + 14} 20 -240`, null, shade(jewel, -25), 2.2);
        for (let i = 1; i < 8; i++) {
          const t = i / 8;
          ellipse(ctx, -19 + 38 * t, -241 + 2 * (1 - t) * t * (long + 241) * 1, 2.1, 2.1, '#f6efe0', '#a89a7a', 0.5);
        }
        const py = -241 + 0.5 * (long + 241) + 2;
        ellipse(ctx, 0, py, 5.5, 6.5, '#e8c25a', '#8a6420', 1);
        ellipse(ctx, 0, py, 2.6, 3, '#c42f45');
      }
    }
    if (character.patches && !rear) {
      const patch = (x, y, w, h, fill) => {
        const ragged = [[x, y + 1], [x + w * 0.35, y - 1.5], [x + w, y + 2], [x + w + 1, y + h * 0.5], [x + w - 2, y + h],
          [x + w * 0.55, y + h + 1.5], [x + 2, y + h - 2], [x - 1.5, y + h * 0.45]];
        path(ctx, 'M' + ragged.map(point => point.join(' ')).join(' L') + 'Z', fill, shade(fill, -45), 1);
        ctx.save();
        ctx.setLineDash([2.2, 2.6]);
        path(ctx, `M${x + 3} ${y + 3} L${x + w - 3} ${y + 4.5} L${x + w - 4} ${y + h - 3} L${x + 4} ${y + h - 4}Z`, null, '#cfc3a6', 0.9);
        ctx.restore();
      };
      patch(-26, -214, 24, 20, shade(primary, -34));
      patch(12, -170, 21, 24, '#8f7a5c');
      patch(-30, hem - 36, 22, 20, '#756450');
      let zig = `M-42 ${hem + 8}`;
      for (let i = 0; i < 12; i++) zig += ` L${-42 + i * 7.4 + 3.7} ${hem + (i % 2 ? 8 : 13)} L${-42 + (i + 1) * 7.4} ${hem + 8}`;
      path(ctx, zig, shade(primary, -24), ink, 1.2);
    }
    if (character.mud && !rear) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ellipse(ctx, -18, -150, 15, 10, '#7a4f33');
      ellipse(ctx, 22, -104, 18, 11, '#7a4f33');
      ellipse(ctx, 4, -192, 11, 7, '#8a5a3c');
      ellipse(ctx, -10, hem - 18, 20, 8, '#7a4f33');
      ctx.restore();
    }
    if (character.shawl && !rear) {
      const w = character.shawl;
      path(ctx, 'M-46 -238 Q-22 -256 0 -246 Q24 -256 47 -238 Q52 -222 46 -204 Q24 -230 0 -224 Q-24 -230 -46 -204 Q-52 -222 -46 -238Z', w, ink, 1.8);
      path(ctx, 'M-42 -214 L-49 -150 L-31 -146 L-27 -210Z', shade(w, -14), ink, 1.6);
      path(ctx, 'M-46 -154 L-30 -150 M-40 -170 L-28 -167', null, shade(w, 28), 1.4);
    }
    if (!state.noLap) lap(ctx, drop, pants, skin, sari);
    if (state.beforeNear) state.beforeNear(ctx, baseTransform);
    if (support) arm(ctx, -35, -226, bx, by, kx, ky, colors, short, sari, false);
    arm(ctx, 33, -226, ex, ey, hx, hy, { ...colors, cloth: ascetic ? shade(skin, 2) : primary }, short, sari || female, ['point', 'hush'].includes(activePose));
    if (character.badge && !rear) {
      path(ctx, 'M22 -229 L34 -227 L32 -219 L20 -222Z M-36 -229 L-25 -235 L-22 -228 L-34 -222Z',
        shade(accent, 6), shade(accent, -22), 1);
      path(ctx, 'M19 -209 L26 -208 L26 -201 L22 -197 L18 -202Z', '#cfa75d', '#725844', 0.8);
      ellipse(ctx, 22.5, -204.3, 1.45, 1.7, '#f1d388');
    }
    ctx.save();
    ctx.scale(1 / buildFactor(character), 1);
    ctx.translate(0, -244);
    const nod = pose === 'nod' ? 0.12 * Math.sin(time * 7) : pose === 'shake' ? 0.12 * Math.sin(time * 11) :
      ['look', 'read', 'check-pocket', 'write', 'work', 'scoop'].includes(pose) ? 0.16 : pose === 'listen' ? -0.16 :
        pose === 'sniff' ? 0.06 + Math.sin(time * 3) * .04 : pose === 'attend' ? .046 :
          pose === 'doze' ? .29 + Math.sin(phase * 2.25) * .052 : 0;
    ctx.rotate(nod - laugh * (.10 + Math.sin(time * 14) * .034) + Math.sin(phase * 2.1) * .021 + (speaking ? mouth * .03 : 0));
    ctx.translate(0, 244);
    const blink = pose === 'doze' ? 1 :
      Math.max(0, 1 - Math.abs((phase % 3.9) - 1.18) / 0.14, laugh * Math.max(0, Math.sin(time * 12)) * .64);
    if (character.age === 'child') {
      ctx.translate(0, -257);
      ctx.scale(1.10, 1.06);
      ctx.translate(0, 257);
    }
    const gazeDown = ['look', 'read', 'sniff', 'write', 'check-pocket', 'scoop'].includes(pose) ? .88 : 0;
    const gaze = { x: clamp((state.gazeX ?? .62) + Math.sin(phase * 2.3) * .13, -1, 1), y: gazeDown };
    const vocal = clamp(mouth + laugh * (.36 + Math.sin(time * 12) * .14)
      + (pose === 'doze' ? .17 + Math.sin(phase * 2.25) * .11 : 0), 0, 1);
    if (ascetic) { ctx.translate(0, -300); ctx.scale(0.9, 1.05); ctx.translate(0, 300); }
    if (!rear && !image && typeof Face !== 'undefined') {
      const dna = character.dna || Face.auto(character);
      path(ctx, 'M-18 -267 L-17 -241 Q0 -223 18 -242 L15 -270Z', shade(character.skin, -21), ink, 1.9);
      const c = state.expr ? { ...state.expr } : engineFace(state, pose, laugh, blink, gaze, vocal, speaking, time);
      if (state.expr) c.jaw = Math.max(c.jaw || 0, state.visemes ? 0 : vocal * .75);
      ctx.save();
      ctx.translate(0, -262); ctx.rotate(state.headTilt || 0); ctx.translate(2, -32);
      ctx.scale(1.0, 1.0);
      Face.head(ctx, dna, c, character.skin, time);
      ctx.restore();
    } else head(ctx, character, state, vocal, blink, gaze, rear);
    if (state.ribbon) {
      const tip = Math.sin(phase * 5) * 2 + swing * 0.1;
      path(ctx, `M-31 -294 Q-50 -297 -52 -311 Q-40 -314 -31 -299 Q-25 -316 -15 -311 Q-16 -299 -28 -294
        L-21 ${-276 + tip} L-28 ${-278 + tip} L-30 -289 L-42 ${-277 - tip} L-46 ${-284 - tip}Z`, '#c43a37', '#762c32', 1.65);
      ellipse(ctx, -31, -296, 4.4, 4.1, '#e35c4e', '#8a3735', 0.9);
    }
    ctx.restore();
    ctx.restore();
  }

  // 0 standing .. 1 lying on a bed (the stance key is 'lie'); blends with the previous stance.
  function lieAmount(state) {
    const now = state.stance === 'lie' ? 1 : 0;
    const before = state.previousStance ? (state.previousStance === 'lie' ? 1 : 0) : now;
    return mix(before, now, state.stanceBlend ?? 1);
  }

  globalThis.VillageCast = { armSpace, fromArm, height, person, hand, grasp, graspFingers, stanceDrop, lieAmount };
})();
