(() => {
  const { ellipse, gradient, line, path, rect, shade } = VillageDraw;
  const edge = '#483027';

  function rounded(ctx, x, y, w, h, radius, fill, outline = edge) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (outline) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
  }

  function text(ctx, value, x, y, size, color, width, bold = true) {
    ctx.fillStyle = color;
    ctx.font = `${bold ? 700 : 500} ${size}px "Nirmala UI", "Noto Sans Devanagari", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(value, x, y, width);
  }

  function wallet(ctx, color, open) {
    ellipse(ctx, 3, -1, open ? 85 : 52, 7, '#301d2145');
    if (open) {
      rounded(ctx, -91, -104, 182, 104, 8, gradient(ctx, -90, -90, 91, 0, [shade(color, 24), color, shade(color, -18)]));
      rounded(ctx, -85, -97, 81, 89, 5, shade(color, -21));
      rounded(ctx, 3, -97, 82, 89, 5, shade(color, -27));
      path(ctx, 'M-80 -81 L-13 -89 L-8 -50 L-73 -40Z', '#8b9971', '#544a36', 1.5);
      path(ctx, 'M8 -72 L73 -78 L78 -37 L13 -29Z', '#e2ceb2', '#71594a', 1.4);
      path(ctx, 'M10 -65 L71 -70 M16 -56 L68 -61 M19 -48 L68 -53', null, '#9f8f74', 1.4);
      path(ctx, 'M-84 -64 L-6 -65 L-6 -10 L-84 -10Z M5 -48 Q41 -38 83 -51 L83 -10 L5 -10Z', shade(color, 8), shade(color, -18), 1.3);
      path(ctx, 'M0 -100 L0 -5 M-80 -56 L-10 -57 M11 -42 Q43 -32 78 -43', null, '#b387648f', 1.5);
      return;
    }
    rounded(ctx, -56, -71, 112, 71, 8, gradient(ctx, -55, -60, 50, -3, [shade(color, 28), color, shade(color, -24)]));
    rounded(ctx, -50, -64, 100, 57, 6, shade(color, 2), '#b18a677f');
    path(ctx, 'M-47 -48 Q-5 -40 47 -51 L48 -58 Q2 -49 -47 -58Z', shade(color, -8));
    rounded(ctx, 19, -39, 37, 16, 5, shade(color, 16), shade(color, -25));
    ellipse(ctx, 26, -30.5, 3.9, 3.5, '#ba9363', '#644a3d', 1.1);
  }

  function envelope(ctx, color, label) {
    rounded(ctx, -68, -87, 136, 87, 4, gradient(ctx, -57, -77, 68, -3, [shade(color, 27), color, shade(color, -18)]), '#816443');
    path(ctx, 'M-65 -3 L-11 -53 L56 -7 M64 -82 L0 -38 L-64 -82', null, '#9c7e52', 1.55);
    path(ctx, 'M-66 -85 L66 -85 L0 -38Z', shade(color, 16), '#997747', 1.6);
    ellipse(ctx, 0, -43, 9.5, 8.3, '#963f3c', '#6d302d', 1);
    ellipse(ctx, -1, -44, 5, 4, null, '#bb6556', 0.9);
    if (label) text(ctx, label, 0, -19, 11.5, '#593c2c', 110, false);
  }

  function paper(ctx, color, label, press) {
    const w = press ? 165 : 124;
    const h = press ? 174 : 97;
    const x = -w / 2;
    path(ctx, `M${x + 2} ${-h} L${-x - 10} ${-h - 2} L${-x + 1} ${-h + 13} L${-x - 3} -2 L${x + 5} 2Z`,
      gradient(ctx, x, -h, -x, 1, [shade(color, 7), color, shade(color, -18)]), '#8b7152', 1.4);
    path(ctx, `M${-x - 10} ${-h - 1} L${-x - 11} ${-h + 12} L${-x} ${-h + 13}`, shade(color, -16), '#ad936d', 0.95);
    if (press) {
      text(ctx, 'पीपलगंज समाचार', 0, -150, 17, '#473a32', 146);
      line(ctx, -69, -136, 68, -136, '#53443a', 1.8);
      text(ctx, label || 'शरीफ़ चोर', 0, -113, 23, '#502e2d', 145);
      for (const col of [-70, 4]) for (let i = 0; i < 10; i++) {
        const y = -91 + i * 7.1;
        line(ctx, col, y, col + 48 + (i * 9) % 21, y, '#61584c96', 1.35);
      }
      return;
    }
    line(ctx, x + 8, -18, -x - 8, -19, '#bca27c86', 1.15);
    const rows = label.split('\n').filter(Boolean).slice(0, 3);
    for (const [i, row] of rows.entries()) text(ctx, row, 0, -55 + (i - (rows.length - 1) / 2) * 17, 16, '#613c3f', w - 19, false);
  }

  function letter(ctx, color, label) {
    ellipse(ctx, 2, -4, 95, 12, '#3f281c35');
    path(ctx, 'M-99 -123 Q-26 -128 89 -121 L100 -110 L96 -6 Q2 -10 -97 -4Z',
      gradient(ctx, -104, -126, 100, 0, [shade(color, 21), color, shade(color, -19)]), '#90704f', 1.55);
    path(ctx, 'M89 -121 L87 -107 L100 -110Z', shade(color, -16), '#b99770', 1.1);
    path(ctx, 'M-97 -62 Q-4 -68 96 -62 M-76 -17 Q-24 -14 29 -17', null, '#a9805330', 1.25);
    const rows = label.split('\n').filter(Boolean).slice(0, 3);
    rows.forEach((row, i) => text(ctx, row, 0, -67 + (i - (rows.length - 1) / 2) * 29, 21, '#57352d', 176));
  }

  function key(ctx, color, label) {
    path(ctx, 'M-44 -23 C-53 -31 -54 -44 -45 -51 C-32 -61 -15 -53 -13 -40 L45 -40 L53 -33 L45 -23 L38 -23 L38 -30 L31 -30 L31 -24 L24 -24 L24 -32 L-14 -32 C-18 -22 -34 -17 -44 -23Z',
      gradient(ctx, -45, -52, 48, -23, [shade(color, 48), color, shade(color, -39)]), '#5c4934', 1.9);
    ellipse(ctx, -34, -37.5, 7.1, 6.2, '#5a4132', shade(color, 31), 1.4);
    line(ctx, -12, -36, 43, -36, shade(color, 34), 1.5);
    if (label) {
      path(ctx, 'M-36 -35 Q-49 -31 -48 -18 L-42 -14', null, '#ae895e', 1.8);
      rounded(ctx, -65, -19, 72, 22, 3, '#e0c996', '#9a7955');
      text(ctx, label, -29, -7, 12.5, '#563b2f', 63);
    }
  }

  function soap(ctx, color) {
    ellipse(ctx, 6, -4, 66, 7, '#321a2840');
    rounded(ctx, -65, -70, 130, 69, 17, gradient(ctx, -54, -69, 55, -4, [shade(color, 39), color, shade(color, -22)]), '#8d6664');
    rounded(ctx, -59, -65, 118, 54, 16, shade(color, 18), '#d6aaa4');
    path(ctx, 'M-38 -36 C-43 -42 -41 -52 -32 -53 Q-20 -55 -17 -45 L39 -45 L43 -40 L37 -36 L31 -36 L31 -40 L26 -40 L26 -37 L22 -37 L22 -42 L-18 -42 Q-21 -32 -38 -36Z',
      '#a56e76', '#dfb1aa', 1.1);
  }

  function postbox(ctx, color, label) {
    ellipse(ctx, 4, 2, 61, 11, '#422a2661');
    path(ctx, 'M-36 -164 Q-35 -192 -5 -196 L-4 -206 L5 -206 L6 -196 Q35 -191 36 -164Z',
      gradient(ctx, -35, -176, 37, -179, [shade(color, 28), color, shade(color, -31)]), '#572d2d', 2.4);
    rounded(ctx, -38, -169, 76, 170, 10, gradient(ctx, -37, -120, 38, -120, [shade(color, 24), color, shade(color, -39)]), '#552d2b');
    rounded(ctx, -41, -165, 82, 11, 4, shade(color, 13), '#64312e');
    rounded(ctx, -28, -144, 56, 14, 3, '#321f1c', '#79402f');
    line(ctx, -25, -131, 25, -131, '#cb7253', 1.65);
    rounded(ctx, -27, -113, 54, 69, 4, shade(color, 7), '#682f2c');
    if (label !== 'plain') text(ctx, 'डाक', 0, -90, 15, '#f4d8a6', 44);
    line(ctx, -16, -72, 16, -72, '#e9bf8580', 1.3);
    ellipse(ctx, 17, -58, 2.5, 2.8, '#dfb273');
    rounded(ctx, -44, -11, 88, 14, 4, shade(color, -17), '#582c2a');
  }

  function latch(ctx, color) {
    rounded(ctx, -23, -98, 55, 91, 8, '#22212165', null);
    rounded(ctx, -25, -100, 50, 86, 8, gradient(ctx, -25, -89, 25, -12, [shade(color, 28), color, shade(color, -23)]), '#564832');
    path(ctx, 'M-21 -88 L-21 -27 Q-21 -19 -14 -19 M-15 -96 L14 -96 Q20 -96 21 -91', null, '#d1b784', 1.2);
    for (const y of [-91, -22]) ellipse(ctx, 0, y, 2.3, 2.3, '#45392b');
    ellipse(ctx, 0, -58, 14, 14, '#72573d', shade(color, 24), 1.4);
    path(ctx, 'M-4 -60 C-4 -66 6 -66 6 -60 Q7 -55 3 -54 L4 -49 L-4 -49 L-3 -54 Q-7 -55 -4 -60Z', '#2d2627');
  }

  function photo(ctx) {
    rounded(ctx, -36, -86, 72, 86, 3, '#e0d1b6', '#9e7a62');
    rect(ctx, -29, -78, 58, 61, '#82a097');
    ellipse(ctx, 1, -21, 24, 10, '#a95d54');
    ellipse(ctx, 0, -53, 16, 17, '#6a4436');
    ellipse(ctx, 0, -49, 13, 14, '#c18c64');
    ellipse(ctx, -4, -50, 1.3, 1.5, '#432e2b');
    ellipse(ctx, 4, -50, 1.3, 1.5, '#432e2b');
    path(ctx, 'M-4 -44 Q0 -40 5 -44 M-10 -59 Q-4 -55 5 -60', null, '#603a34', 1.35);
  }

  function rack(ctx, color) {
    rounded(ctx, -116, -180, 232, 180, 6, gradient(ctx, -110, -175, 111, -8, [shade(color, 19), color, shade(color, -28)]), '#3d2d28');
    for (let i = 0; i < 5; i++) line(ctx, -110, -165 + i * 35, 109, -161 + i * 35, '#1e17185c', 1.2);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 6; col++) {
      const x = -92 + col * 37.4;
      const y = -152 + row * 53;
      rounded(ctx, x - 11, y - 11, 24, 15, 1, (row + col) % 2 ? '#c8ab7c' : '#c3b494', '#8c7252');
      line(ctx, x - 6, y - 4, x + 7, y - 4, '#795e49', 1.15);
      ellipse(ctx, x, y + 9, 2.6, 2.7, '#362b24');
      ctx.save();
      ctx.translate(x - 12, y + 25);
      ctx.rotate(1.47 + (col % 3 - 1) * 0.14);
      ctx.scale(0.28, 0.28);
      key(ctx, (row + col) % 2 ? '#b4945b' : '#8e8776');
      ctx.restore();
    }
  }

  function pouch(ctx, color, open) {
    ellipse(ctx, 3, 1, 58, 8, '#3a2a2738');
    const bag = open
      ? 'M-48 -81 Q-40 -54 -51 -33 Q-65 -8 -42 -3 Q-3 7 39 -3 Q66 -12 52 -37 Q43 -57 48 -81Z'
      : 'M-22 -83 Q-40 -54 -51 -33 Q-65 -8 -42 -3 Q-3 7 39 -3 Q66 -12 52 -37 Q43 -57 22 -83Z';
    path(ctx, bag, gradient(ctx, -51, -86, 47, -1, [shade(color, 30), color, shade(color, -37)]), shade(color, -54), 2.2);
    path(ctx, 'M-17 -74 Q-28 -54 -34 -31 M-10 -77 Q-15 -51 -13 -35 M18 -73 Q36 -54 40 -28 M-43 -11 Q3 -2 41 -12',
      null, shade(color, 28), 1.35);
    ctx.save();
    ctx.setLineDash([3, 3]);
    path(ctx, 'M-43 -15 Q2 -6 44 -14', null, '#d7be91b8', 1.5);
    ctx.restore();
    if (open) {
      ellipse(ctx, 0, -80, 47, 14, shade(color, -48), shade(color, 21), 2.6);
      path(ctx, 'M-44 -80 Q0 -62 45 -80', null, '#c8ad83', 1.8);
    } else {
      path(ctx, 'M-27 -103 Q-10 -96 0 -104 Q9 -96 25 -103 L20 -81 Q1 -74 -21 -81Z', shade(color, 20), shade(color, -53), 1.8);
      path(ctx, 'M-22 -82 Q0 -74 22 -83 M-21 -78 Q-2 -72 22 -80 M2 -78 Q-19 -108 -43 -91 Q-45 -82 -6 -77 Q30 -107 38 -90 Q35 -83 4 -78 M-4 -78 Q-13 -61 -24 -56 M4 -78 Q16 -62 22 -59',
        null, '#e0ba83', 3.3);
      ellipse(ctx, 1, -78, 5.1, 4.2, '#f0c48c', '#896243', 1.25);
    }
  }

  function banknotes(ctx, color) {
    for (const [dx, dy, tilt] of [[-8, 0, -0.12], [0, -5, 0.05], [6, -9, 0.13]]) {
      ctx.save();
      ctx.translate(dx, dy);
      ctx.rotate(tilt);
      rounded(ctx, -66, -54, 132, 53, 4, gradient(ctx, -60, -49, 57, -3, [shade(color, 27), color, shade(color, -16)]), '#655c45');
      rounded(ctx, -60, -49, 120, 42, 6, null, '#d6d5aa');
      ellipse(ctx, 7, -27, 18, 15, shade(color, 28), shade(color, -16), 1.4);
      path(ctx, 'M7 -36 Q20 -25 7 -15 Q-7 -25 7 -36Z M-50 -34 L-25 -34 M-50 -25 L-29 -25 M34 -22 L49 -22', null, '#777b5c', 1.4);
      ctx.restore();
    }
  }

  function parcel(ctx, color) {
    ellipse(ctx, 3, -1, 79, 9, '#2c1b2048');
    path(ctx, 'M-77 -67 L-45 -95 L78 -89 L86 -61 L59 -39 L-75 -45Z', shade(color, 19), '#6e503c', 2);
    path(ctx, 'M-76 -67 L64 -60 L65 -1 L-76 -10Z', gradient(ctx, -77, -67, 69, -1, [shade(color, 10), color, shade(color, -22)]), '#6e503c', 2);
    path(ctx, 'M65 -61 L86 -79 L87 -27 L65 -1Z', shade(color, -27), '#6e503c', 1.8);
    path(ctx, 'M-66 -68 L-53 -58 L-55 -10 M73 -68 L78 -62 L79 -23 M-11 -92 L-39 -63 L-38 -8 M14 -91 L-14 -61 L-13 -6', null, '#a27d5699', 1.7);
    path(ctx, 'M5 -93 L-21 -64 L-21 -7 M-65 -79 L73 -73 L86 -82 M-7 -78 Q-29 -94 -37 -83 Q-32 -76 -7 -78 Q15 -94 23 -85 Q19 -77 -7 -78',
      null, '#5d4b3c', 3);
    ellipse(ctx, -7, -78, 5, 4, '#77624d');
  }

  function openParcel(ctx, color, t) {
    const width = 23 + 46 * VillageDraw.ease(VillageDraw.clamp(t / .78, 0, 1));
    ellipse(ctx, 1, -2, 121, 15, '#31201d4f');
    path(ctx, `M-64 -69 L-114 ${-75 - width * .56} L-52 ${-91 - width * .42} L54 -96 L84 ${-91 - width * .49}
      L124 -67 L89 -45 L112 -23 L91 -2 L-89 -5 L-111 -24 L-80 -44Z`,
      gradient(ctx, -100, -125, 111, -7, [shade(color, 32), color, shade(color, -15)]), '#806047', 2);
    path(ctx, 'M-65 -67 L63 -64 L78 -28 L-72 -30Z', shade(color, -21), '#9c774e', 1.4);
    path(ctx, 'M-65 -67 L-84 -94 M63 -64 L85 -91 M-72 -30 L-91 -11 M78 -28 L90 -13 M-74 -34 L77 -32',
      null, '#a480588d', 1.4);
  }

  function piggyBank(ctx, color) {
    ellipse(ctx, 0, 0, 57, 8, '#3c28223b');
    path(ctx, 'M-40 -33 L-37 -2 L-21 -1 L-15 -31 M22 -30 L24 -2 L42 -1 L43 -35',
      shade(color, -15), '#754b41', 2);
    ellipse(ctx, -2, -44, 57, 39, gradient(ctx, -50, -72, 48, -3, [shade(color, 29), color, shade(color, -25)]), '#754b41', 2.2);
    path(ctx, 'M-56 -42 Q-71 -39 -67 -49 Q-62 -55 -59 -47 M24 -68 Q22 -85 29 -89 Q40 -86 46 -66 M43 -64 Q52 -81 57 -77 Q62 -68 57 -57',
      color, '#754b41', 2.1);
    ellipse(ctx, 47, -46, 23, 17, shade(color, 10), '#754b41', 1.7);
    ellipse(ctx, 59, -43, 16, 12, shade(color, 24), '#a16553', 1.2);
    ellipse(ctx, 55, -45, 1.85, 3, '#875348');
    ellipse(ctx, 63, -43, 1.9, 3, '#875348');
    ellipse(ctx, 45, -60, 3, 3.5, '#4b352c');
    path(ctx, 'M-23 -74 Q-9 -79 7 -76', null, '#714637', 5.4);
    path(ctx, 'M-44 -33 Q-22 -13 4 -22 Q-20 -18 -39 -30 M-47 -55 Q-38 -65 -27 -64', null, shade(color, 31), 2.6);
  }

  function seeds(ctx, color) {
    ellipse(ctx, 5, -1, 66, 8, '#4e35273b');
    path(ctx, 'M-51 -104 Q-49 -76 -61 -40 Q-74 -2 -37 0 L43 0 Q68 -5 63 -30 Q54 -66 48 -103Z',
      gradient(ctx, -55, -106, 57, 0, [shade(color, 23), color, shade(color, -28)]), '#6b543b', 2.1);
    ellipse(ctx, 0, -100, 51, 17, '#a67c45', '#705333', 2.2);
    for (let i = 0; i < 46; i++) {
      const x = Math.sin(i * 2.3999) * (17 + i % 29);
      const y = -100 + Math.cos(i * 3.7) * (4 + i % 10);
      ellipse(ctx, x, y, 3.2, 1.8, i % 3 ? '#d4a764' : '#e5bc7b', '#997040', 0.6);
    }
    path(ctx, 'M-52 -100 Q-23 -78 26 -85 Q40 -88 51 -100 M-50 -75 Q-32 -67 43 -77 M-44 -68 Q-34 -47 -48 -16 M40 -69 Q34 -53 48 -30', null, '#9d7a50', 3.1);
    ctx.save();
    ctx.setLineDash([3, 4]);
    path(ctx, 'M-44 -65 Q-38 -54 -49 -17', null, '#e3ba82', 2);
    ctx.restore();
  }

  function umbrella(ctx, color) {
    path(ctx, 'M0 -161 L0 -12 Q1 6 16 -3 Q24 -10 20 -20', null, '#614b3b', 4.8);
    path(ctx, 'M-104 -83 Q-91 -148 -5 -162 Q67 -156 106 -86 Q76 -98 52 -76 Q15 -98 -10 -78 Q-48 -96 -65 -76 Q-79 -94 -104 -83Z',
      gradient(ctx, -80, -149, 84, -80, [shade(color, 28), color, shade(color, -31)]), shade(color, -48), 2.1);
    path(ctx, 'M-5 -160 Q-59 -146 -65 -77 M-5 -160 Q-12 -125 -10 -78 M-5 -160 Q39 -146 52 -77 M-98 -88 Q-60 -126 -15 -142',
      null, shade(color, -32), 1.9);
    line(ctx, -4, -161, -1, -171, '#6c533f', 4);
  }

  function table(ctx, color) {
    ellipse(ctx, 9, -2, 177, 15, '#30201e53');
    path(ctx, 'M-155 -124 L-153 -5 L-135 -5 L-130 -125 M140 -124 L145 -5 L163 -7 L165 -127',
      shade(color, -25), '#49332b', 2.8);
    path(ctx, 'M-174 -135 L162 -137 L164 -99 L-170 -96Z', color, '#4f372b', 2.8);
    path(ctx, 'M-190 -139 L-154 -173 L159 -175 L184 -143 L164 -132 L-172 -131Z',
      gradient(ctx, -172, -170, 144, -132, [shade(color, 27), shade(color, 10), color]), '#583d2c', 2.6);
    path(ctx, 'M-163 -149 L164 -152 M-145 -166 L142 -166 M-158 -121 Q-12 -126 148 -117 M-158 -108 Q2 -114 152 -108',
      null, shade(color, -22), 1.4);
  }

  function jalebi(ctx, label) {
    function spiral(x, y, scale, tilt) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt);
      ctx.scale(scale, scale * .71);
      const loops = 'M-20 4 C-27 -10 -12 -21 4 -20 C24 -20 31 -4 23 9 C13 21 -7 15 -9 5 C-12 -6 -2 -13 8 -9 C18 -6 14 7 6 6 C2 6 -1 3 1 0';
      path(ctx, loops, null, '#9c4b23', 9);
      path(ctx, loops, null, '#e58a30', 6.6);
      path(ctx, loops, null, '#f6b454', 3.1);
      ctx.restore();
    }
    if (label === 'single') {
      spiral(0, -13, .83, -.21);
      return;
    }
    ellipse(ctx, 0, -6, 82, 20, '#43332970');
    ellipse(ctx, 0, -17, 80, 24, '#bda088', '#6b5142', 2.1);
    ellipse(ctx, 0, -19, 71, 17, '#a08770', '#ecce9c', 1.6);
    for (const [x, y, size, tilt] of [[-44,-21,.80,-.1],[-8,-29,.95,.1],[40,-23,.90,-.1],[-28,-12,.79,.06],[19,-12,.85,.13]]) {
      spiral(x, y, size, tilt);
    }
  }

  function shawl(ctx, color) {
    path(ctx, 'M-59 -169 Q-36 -182 -9 -153 Q17 -167 53 -166 Q73 -137 76 -83 L88 -18 Q50 5 4 2 Q-48 1 -88 -17 L-76 -82Z',
      gradient(ctx, -61, -166, 75, -16, [shade(color, 31), color, shade(color, -30)]), '#382c35', 2.5);
    path(ctx, 'M-58 -168 Q-26 -179 -6 -151 Q21 -166 54 -165 M-79 -27 Q0 3 79 -27 M-48 -149 Q-62 -98 -65 -40 M33 -153 Q21 -97 42 -32',
      null, shade(color, 33), 2.25);
    path(ctx, 'M-10 -148 Q-6 -109 -16 -44 Q-5 -30 10 -30 M-42 -124 Q-40 -99 -53 -77 M47 -92 Q46 -62 61 -47',
      null, shade(color, -30), 2.7);
    for (let i = -6; i <= 6; i++) line(ctx, i * 11, -8, i * 11 + 1, -2, shade(color, 25), 1.8);
  }

  function padlock(ctx, color, open) {
    ctx.save();
    if (open) {
      ctx.translate(-16, -28);
      ctx.rotate(-.27);
      ctx.translate(16, 28);
    }
    path(ctx, 'M-16 -27 L-16 -50 Q-16 -70 1 -70 Q18 -70 18 -51 L18 -29', null, '#563d34', 11);
    path(ctx, 'M-16 -28 L-16 -50 Q-16 -70 1 -70 Q18 -70 18 -51 L18 -29', null, '#b8a184', 7);
    ctx.restore();
    rounded(ctx, -28, -41, 56, 40, 8, gradient(ctx, -20, -38, 25, -3, [shade(color, 29), color, shade(color, -35)]), '#604b33');
    ellipse(ctx, 1, -24, 4.4, 4.7, '#514035');
    path(ctx, 'M-1 -23 L-4 -13 L6 -13 L3 -23Z M-18 -35 L18 -35', null, '#5e4938', 2.4);
  }

  function keyBoard(ctx, color, label) {
    rounded(ctx, -146, -195, 292, 196, 7, gradient(ctx, -141, -194, 145, 0, [shade(color, 21), color, shade(color, -31)]), '#493327');
    for (let i = 1; i <= 6; i++) line(ctx, -140, -194 + i * 27, 139, -190 + i * 27, '#3d2e276b', 1.6);
    const names = label.split('\n');
    for (const [i, x] of [-95, 0, 95].entries()) {
      rounded(ctx, x - 43, -172, 86, 29, 3, i % 2 ? '#d7bd89' : '#e1c99c', '#9f7950');
      if (names[i]) text(ctx, names[i], x, -156, 13.1, '#553927', 76);
      for (const [dy, tone] of [[-114, '#c4a871'], [-47, '#a89474']]) {
        ellipse(ctx, x, dy - 17, 5, 5, '#443126', '#b28b62', .9);
        ctx.save();
        ctx.translate(x + 12, dy + 9);
        ctx.rotate(1.38 + (i - 1) * .16);
        ctx.scale(.56, .56);
        key(ctx, tone);
        ctx.restore();
      }
    }
  }

  function hangingCloth(ctx, color) {
    path(ctx, 'M-146 -194 Q-89 -209 -16 -193 Q48 -205 136 -197 L151 -28 Q120 -14 85 -21 Q20 -8 -21 -20 Q-89 -3 -150 -22Z',
      gradient(ctx, -139, -173, 140, -12, [shade(color, 22), color, shade(color, -28)]), '#4f3231', 2.2);
    for (const x of [-108, -67, -21, 29, 83, 125]) {
      path(ctx, `M${x} -188 q-9 59 -2 88 q7 47 1 74`, null, shade(color, -24), 2.2);
    }
    path(ctx, 'M-147 -28 Q-78 -10 -22 -28 Q20 -16 86 -29 Q115 -22 151 -35', null, shade(color, 25), 3.2);
  }

  function anklet(ctx, color) {
    ctx.save();
    ctx.rotate(-.10);
    ellipse(ctx, 0, -29, 60, 25, null, '#5c5652', 10);
    ellipse(ctx, 0, -29, 60, 25, null, color, 6.9);
    ellipse(ctx, -1, -30, 60, 24, null, '#ede1b9', 2);
    for (let i = 0; i <= 10; i++) {
      const a = i / 10 * Math.PI;
      const x = Math.cos(a) * 58;
      const y = -27 + Math.sin(a) * 24;
      ellipse(ctx, x, y + 3, 4.7, 5.3, '#d1bc99', '#776c63', 1.1);
      ellipse(ctx, x - 1, y + 1, 1.9, 1.8, '#fff1d0');
    }
    ctx.restore();
  }

  function chest(ctx, color, open) {
    ellipse(ctx, 0, -1, 124, 11, '#281d1f66');
    if (open) {
      path(ctx, 'M-106 -80 L-125 -156 L103 -157 L113 -83Z', shade(color, -12), '#3f2824', 3.4);
      path(ctx, 'M-96 -91 L-111 -144 L91 -145 L101 -91Z', shade(color, -25), shade(color, 12), 1.7);
    }
    path(ctx, 'M-109 -84 L99 -88 L114 -65 L105 -4 L-109 -2 L-119 -62Z', color, '#472f29', 3.4);
    path(ctx, 'M-116 -66 L-98 -86 L100 -86 L114 -66Z', open ? '#382922' : shade(color, 26), '#5d4032', 2.2);
    path(ctx, 'M-111 -58 L109 -60 M-108 -14 L105 -15 M-82 -59 L-79 -7 M76 -60 L75 -8', null, '#b2895c', 3.7);
    rounded(ctx, -17, -63, 34, 20, 3, '#b38c56', '#6a4c35');
    ellipse(ctx, 0, -53, 3.7, 4.2, '#473326');
  }

  function dhol(ctx, color) {
    path(ctx, 'M-69 -70 Q-5 -89 70 -67 L72 -18 Q2 3 -68 -18Z',
      gradient(ctx, -66, -79, 69, -15, [shade(color, 25), color, shade(color, -27)]), '#50352c', 2.6);
    for (const x of [-67, 68]) {
      ellipse(ctx, x, -43, 18, 29, '#dbc297', '#775a43', 2.2);
      ellipse(ctx, x, -43, 11, 19, '#c9ad87', '#8c6d50', 1.5);
    }
    path(ctx, 'M-55 -68 L-35 -20 L-15 -72 L4 -17 L23 -72 L46 -20 L58 -67 M-56 -49 Q-10 -111 59 -51',
      null, '#ebc899', 2.5);
  }

  function openSack(ctx, color) {
    ellipse(ctx, 1, -2, 115, 10, '#2b21234b');
    path(ctx, 'M-91 -75 Q-109 -61 -104 -24 Q-92 3 -37 -3 L89 -6 Q111 -13 103 -43 Q97 -70 75 -76Z',
      gradient(ctx, -99, -82, 90, -3, [shade(color, 25), color, shade(color, -27)]), '#62463a', 2.3);
    ellipse(ctx, -1, -73, 93, 23, shade(color, -42), '#9a7456', 2.9);
    path(ctx, 'M-91 -75 Q-15 -40 88 -75 M-88 -58 Q-73 -42 -87 -27 M75 -56 Q83 -37 93 -27 M-83 -18 Q0 -1 83 -18',
      null, shade(color, 28), 2.2);
  }

  function fairWheel(ctx, color, time) {
    const y = -128;
    const r = 102;
    path(ctx, 'M-56 0 L-5 -136 L9 -137 L61 0 M-64 0 L69 0', null, '#6b4b3e', 9);
    ellipse(ctx, 2, y, r, r, null, shade(color, -31), 9);
    ellipse(ctx, 2, y, r - 3, r - 3, null, '#d1a268', 2.5);
    for (let i = 0; i < 8; i++) {
      const a = time * .38 + i * Math.PI / 4;
      const x = 2 + Math.cos(a) * r;
      const yy = y + Math.sin(a) * r;
      line(ctx, 2, y, x, yy, color, 4);
      path(ctx, `M${x-13} ${yy+4} l2 16 h22 l3 -16Z`, i % 2 ? '#bf8953' : '#a15948', '#5b4039', 1.6);
      ellipse(ctx, x, yy, 3.8, 3.8, '#edbd72');
    }
    ellipse(ctx, 2, y, 10, 10, '#b8895c', '#604538', 2);
  }

  function puppetShow(ctx, color, time) {
    rounded(ctx, -134, -207, 268, 204, 5, '#49313e', '#664432');
    path(ctx, 'M-136 -208 Q-81 -186 0 -200 Q78 -187 137 -208 L137 -191 L110 -173 Q53 -187 0 -177 Q-64 -185 -110 -173 L-136 -191Z',
      color, '#63333b', 2.1);
    path(ctx, 'M-133 -197 Q-91 -157 -112 -40 L-137 -20Z M133 -197 Q91 -157 112 -40 L137 -20Z', shade(color, 11), '#63333b', 2);
    for (const [i, x] of [-43, 45].entries()) {
      const sway = Math.sin(time * 3.9 + i * 1.4) * 7;
      const bounce = Math.sin(time * 5.1 + i) * 4;
      const y = -107 + bounce;
      const fabric = i ? '#c0964e' : '#397e77';
      line(ctx, x, -194, x + sway, y - 22, '#e4c0969c', 1.1);
      line(ctx, x - 21, -192, x + sway - 25, y + 18, '#e4c0969c', 1);
      line(ctx, x + 21, -192, x + sway + 25, y + 15, '#e4c0969c', 1);
      ctx.save();
      ctx.translate(x + sway, y);
      ctx.rotate(sway * .017);
      path(ctx, 'M-9 3 Q-17 8 -23 18 M10 3 Q20 6 26 14 M-7 39 L-14 56 M8 39 L14 56', null, '#ce9a69', 5.1);
      path(ctx, 'M-9 -1 L11 -1 L21 38 Q0 48 -23 38Z', fabric, '#382a37', 1.8);
      path(ctx, 'M-18 31 Q0 39 18 30 M-8 4 L11 32', null, '#e1b271', 2.1);
      ellipse(ctx, 0, -10, 13, 15, '#bd8458', '#483031', 1.55);
      ellipse(ctx, -4, -10, 1.4, 1.7, '#392834');
      ellipse(ctx, 5, -10, 1.4, 1.7, '#392834');
      path(ctx, 'M-5 -4 Q1 1 6 -5', null, '#673936', 1.45);
      const drop = i ? 0 : Math.min(50, Math.max(0, time - 3.2) ** 2 * 106);
      ctx.translate(drop * .18, drop);
      path(ctx, 'M-15 -20 Q-14 -34 1 -34 Q15 -34 16 -19 Q0 -15 -15 -20Z', i ? '#a65451' : '#c78d41', '#633b33', 1.35);
      ctx.restore();
    }
    path(ctx, 'M-142 -28 L144 -28 L144 2 L-142 2Z', '#876044', '#5f3c2f', 2.2);
    line(ctx, -129, -15, 130, -15, '#c59566', 1.6);
  }


  // A potter's wheel (chaak). label: "dusty" adds cobwebs, "clay" a lump on the head, "spin" turns it.
  function chaak(ctx, color, label, time) {
    const wood = color;
    const dark = shade(color, -38);
    ellipse(ctx, 0, -1, 92, 11, '#2b21234b');
    // legs and cross brace
    path(ctx, 'M-58 -22 L-70 -1 L-58 -1 L-46 -20Z M58 -22 L70 -1 L58 -1 L46 -20Z', shade(color, -18), dark, 2.2);
    path(ctx, 'M-60 -12 L60 -12 L60 -7 L-60 -7Z', shade(color, -8), dark, 1.6);
    // flywheel: thick rim, then the face with spokes
    ellipse(ctx, 0, -19, 80, 21, dark);
    ellipse(ctx, 0, -25, 80, 21, gradient(ctx, -80, -40, 80, -10, [shade(wood, 26), wood, shade(wood, -24)]), dark, 2.4);
    ellipse(ctx, 0, -25, 62, 15, null, shade(wood, -30), 1.6);
    const turn = label && label.includes('spin') ? time * 3.2 : 0.5;
    for (let i = 0; i < 6; i++) {
      const a = turn + i * Math.PI / 3;
      line(ctx, 0, -25, Math.cos(a) * 62, -25 + Math.sin(a) * 15, shade(wood, -22), 2.4);
    }
    ellipse(ctx, 0, -25, 11, 3.6, shade(wood, -34));
    // axle and the wheel head
    path(ctx, 'M-6 -27 L-6 -76 L6 -76 L6 -27Z', shade(wood, -14), dark, 1.8);
    ellipse(ctx, 0, -80, 38, 9.5, dark);
    ellipse(ctx, 0, -83, 38, 9.5, gradient(ctx, -38, -90, 38, -76, [shade(wood, 22), wood, shade(wood, -16)]), dark, 2);
    ellipse(ctx, 0, -83, 24, 5.4, null, shade(wood, -28), 1.3);
    if (label && label.includes('clay')) {
      path(ctx, 'M-22 -84 Q-24 -108 0 -113 Q24 -108 22 -84 Q0 -77 -22 -84Z', gradient(ctx, -22, -112, 22, -80, ['#c4573c', '#a84631', '#8b3826']), '#5e2a1d', 2);
      path(ctx, 'M-13 -100 Q-4 -106 6 -103', null, '#d98467', 2);
    }
    if (label && label.includes('dusty')) {
      // thick dust on the wood and cobwebs between legs and head
      ellipse(ctx, 0, -25, 74, 17, 'rgba(206,188,160,.34)');
      ellipse(ctx, 0, -83, 33, 7.5, 'rgba(206,188,160,.40)');
      const web = 'rgba(245,240,226,.62)';
      path(ctx, 'M-70 -22 Q-58 -44 -46 -58 M-70 -22 Q-48 -36 -30 -32 M-62 -33 Q-52 -31 -45 -45 M-66 -27 Q-56 -29 -50 -38', null, web, 1.1);
      path(ctx, 'M30 -84 Q47 -70 68 -52 M30 -84 Q46 -62 52 -44 M42 -74 Q54 -75 61 -64 M37 -66 Q49 -66 57 -55', null, web, 1.1);
      path(ctx, 'M-20 -83 L-40 -66 M-14 -82 Q-30 -62 -26 -46', null, web, 1);
    }
  }

  // A long-handled shovel (phavda) resting on the ground, blade down.
  function shovel(ctx, color) {
    ellipse(ctx, 6, -1, 44, 6, '#2b21234b');
    path(ctx, 'M52 -178 L60 -176 L16 -22 L9 -24Z', gradient(ctx, 10, -150, 60, -30, [shade('#8a5f3c', 18), '#8a5f3c', shade('#8a5f3c', -22)]), '#4f3626', 1.8);
    path(ctx, 'M44 -186 Q56 -193 70 -184 L64 -172 Q54 -178 46 -174Z', '#7a5334', '#4f3626', 1.6);
    path(ctx, 'M-8 -34 L24 -28 L28 -12 Q10 4 -14 -3 Q-18 -18 -8 -34Z', gradient(ctx, -14, -34, 26, 0, [shade(color, 34), color, shade(color, -30)]), shade(color, -52), 2);
    path(ctx, 'M-6 -28 L20 -23 M-9 -17 Q4 -13 18 -14', null, shade(color, 52), 1.3);
    path(ctx, 'M7 -33 L24 -30 L21 -21 L10 -24Z', shade(color, -12), shade(color, -52), 1.4);
  }


  // A heap of gold coins that glints. Deterministic: the same heap every frame.
  function coinPile(ctx, color, time) {
    const rng = VillageDraw.random(7741);
    ellipse(ctx, 0, -1, 96, 11, '#2b21234b');
    path(ctx, 'M-84 -2 Q-70 -40 -34 -52 Q0 -74 36 -52 Q72 -40 86 -2Z', gradient(ctx, -80, -70, 80, 0, [shade(color, 20), color, shade(color, -42)]), '#7a5a1c', 2.2);
    for (let i = 0; i < 96; i++) {
      const u = rng();
      const v = rng();
      const x = (u - 0.5) * 168 * (1 - v * 0.55);
      const y = -4 - v * 62 * (1 - Math.abs(u - 0.5) * 1.25);
      const rx = 9 + rng() * 4;
      const tone = i % 3 === 0 ? '#f5d57e' : i % 3 === 1 ? '#e0a83c' : '#c98f2c';
      ellipse(ctx, x, y, rx, rx * 0.42, tone, '#8a6420', 1.1);
      ellipse(ctx, x - rx * 0.2, y - 1, rx * 0.5, rx * 0.17, 'rgba(255,244,190,.55)');
    }
    for (let i = 0; i < 5; i++) {
      const x = (rng() - 0.5) * 120;
      const y = -12 - rng() * 56;
      const glint = Math.max(0, Math.sin(time * (1.6 + rng() * 1.6) + i * 2.1)) ** 5;
      if (glint < 0.05) continue;
      const r = 6 + glint * 11;
      path(ctx, `M${x} ${y - r} Q${x + 1.5} ${y - 1.5} ${x + r} ${y} Q${x + 1.5} ${y + 1.5} ${x} ${y + r} Q${x - 1.5} ${y + 1.5} ${x - r} ${y} Q${x - 1.5} ${y - 1.5} ${x} ${y - r}Z`, `rgba(255,250,225,${0.9 * glint})`);
    }
  }


  // A patchwork quilt (razai/kantha) laid over a sleeper, and a pillow.
  function quilt(ctx, color) {
    ellipse(ctx, 0, -1, 136, 9, '#2b21234b');
    const shape = 'M-124 -4 Q-134 -42 -108 -62 Q-4 -80 110 -60 Q134 -42 126 -4 Q0 6 -124 -4Z';
    path(ctx, shape, gradient(ctx, -124, -78, 126, 0, [shade(color, 22), color, shade(color, -28)]), '#4c3426', 2.2);
    ctx.save();
    ctx.clip(new Path2D(shape));
    const tones = [shade(color, 34), shade(color, -16), '#d9c9a0', shade(color, 10)];
    for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) {
      const x = -124 + i * 32 + (j % 2) * 16;
      const y = -76 + j * 24;
      path(ctx, `M${x} ${y + 12} L${x + 16} ${y} L${x + 32} ${y + 12} L${x + 16} ${y + 24}Z`, tones[(i + j) % 4], shade(color, -42), 1);
    }
    path(ctx, 'M-120 -34 Q0 -52 124 -32 M-118 -20 Q0 -36 124 -18', null, 'rgba(255,255,255,.22)', 1.6);
    ctx.restore();
    path(ctx, shape, null, '#4c3426', 2.2);
    path(ctx, 'M-96 -62 Q-66 -44 -80 -8 M-30 -70 Q-8 -44 -22 -4 M44 -68 Q70 -46 58 -4', null, 'rgba(60,40,30,.32)', 3);
  }

  function pillow(ctx, color) {
    ellipse(ctx, 0, -1, 54, 6, '#2b21234b');
    const shape = 'M-46 -4 Q-54 -30 -34 -40 Q2 -50 40 -38 Q56 -28 46 -4Z';
    path(ctx, shape, gradient(ctx, -50, -48, 50, 0, [shade(color, 30), color, shade(color, -20)]), '#5d4a3d', 2);
    path(ctx, 'M-36 -12 Q0 -22 38 -12 M-34 -24 Q2 -34 36 -24', null, shade(color, -34), 1.6);
  }

  // The sage's stone hand-mill (chakki): two grey discs, a wooden peg, faint golden glyphs that pulse.
  // label "glow" adds a radiant halo and rising sparks.
  function chakki(ctx, color, label, time) {
    const glow = label === 'glow';
    const pulse = 0.65 + 0.35 * Math.sin(time * 2.6);
    if (glow) {
      const halo = ctx.createRadialGradient(0, -34, 4, 0, -34, 120);
      halo.addColorStop(0, `rgba(255,224,130,${0.62 * pulse})`);
      halo.addColorStop(1, 'rgba(255,200,90,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(-130, -160, 260, 250);
    }
    ellipse(ctx, 2, -2, 64, 11, '#2b21234b');
    // lower stone
    path(ctx, 'M-58 -20 L-58 -9 Q0 8 58 -9 L58 -20Z', gradient(ctx, -58, 0, 58, 0, [shade(color, -24), shade(color, -48), shade(color, -30)]), '#4d4741', 2);
    ellipse(ctx, 0, -20, 58, 15, gradient(ctx, -58, -30, 58, -10, [shade(color, 12), color, shade(color, -22)]), '#4d4741', 2);
    // upper stone
    path(ctx, 'M-50 -35 L-50 -22 Q0 -8 50 -22 L50 -35Z', gradient(ctx, -50, 0, 50, 0, [shade(color, -8), shade(color, -34), shade(color, -16)]), '#4d4741', 2);
    ellipse(ctx, 0, -35, 50, 13, gradient(ctx, -50, -46, 50, -26, [shade(color, 26), shade(color, 6), shade(color, -14)]), '#4d4741', 2);
    ellipse(ctx, 0, -35, 8, 2.8, '#2c2723', '#4d4741', 1.2);
    // wooden handle peg: it circles the top stone while the mill is turning (label "spin" or "grain")
    const turning = label === 'spin' || label === 'grain';
    const a = time * 7.5;
    const px = turning ? Math.cos(a) * 31 : 34;
    const py = turning ? -35 + Math.sin(a) * 8 : -38;
    path(ctx, `M${px - 3} ${py} L${px - 1} ${py - 25} L${px + 6} ${py - 25} L${px + 4} ${py}Z`, '#7a5636', '#43301f', 1.6);
    ellipse(ctx, px + 2.5, py - 27, 5.2, 2.6, '#8a6340', '#43301f', 1.3);
    if (label === 'grain' || label === 'heap') {
      // wheat and rice (a heap stays when the mill has stopped, label "heap"; "grain" also pours)
      ellipse(ctx, -70, -2, 30, 9, '#2b21234b');
      path(ctx, 'M-100 -2 Q-82 -34 -70 -36 Q-56 -34 -40 -2Z', gradient(ctx, -100, -36, -40, 0, [shade('#e3c26a', 20), '#e3c26a', shade('#e3c26a', -26)]), '#8a6a2a', 1.4);
      for (let i = 0; i < 16; i++) ellipse(ctx, -92 + (i * 7.3) % 46, -6 - (i * 5) % 22, 1.7, 1, i % 3 ? '#f5efdc' : '#b8892f');
      for (let i = 0; i < (label === 'grain' ? 22 : 0); i++) {
        const u = (time * 1.7 + i / 22) % 1;
        const gx = -52 - u * 14 + Math.sin(i * 3.1) * 2.5;
        const gy = -20 + u * u * 20 + u * 4;
        ellipse(ctx, gx, gy, 2.2, 1.3, i % 2 ? '#f5efdc' : '#d9aa3c');
      }
    }
    // golden glyphs around the rim
    const gold = `rgba(255,214,110,${glow ? 0.9 : 0.55 + 0.25 * pulse})`;
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * 0.95 + i * (Math.PI * 1.9 / 8);
      const x = Math.cos(a) * 36, y = -35 + Math.sin(a) * 9.4;
      if (y > -29) continue;
      path(ctx, `M${x - 3} ${y} L${x} ${y - 3.2} L${x + 3} ${y} L${x} ${y + 3.2}Z M${x - 4.6} ${y + 5} L${x + 4.6} ${y + 5}`, null, gold, 1.5);
    }
    ellipse(ctx, 0, -35, 24, 6.2, null, gold, 1.2);
    path(ctx, 'M-42 -30 Q-20 -24 -8 -26 M14 -24 Q30 -26 44 -31', null, 'rgba(255,255,255,.18)', 1.6);
    if (glow) {
      for (let i = 0; i < 7; i++) {
        const rise = ((time * 0.45 + i * 0.37) % 1);
        const x = Math.sin(i * 2.9 + time) * 38;
        const y = -42 - rise * 92;
        const r = (1 - rise) * 8 + 2;
        path(ctx, `M${x} ${y - r} Q${x + 1.4} ${y - 1.4} ${x + r} ${y} Q${x + 1.4} ${y + 1.4} ${x} ${y + r} Q${x - 1.4} ${y + 1.4} ${x - r} ${y} Q${x - 1.4} ${y - 1.4} ${x} ${y - r}Z`, `rgba(255,240,180,${0.95 * (1 - rise)})`);
      }
    }
  }

  // Two dry rotis on a leaf-cloth, and a brass lota (water pot).
  function roti(ctx, color) {
    ellipse(ctx, 0, -3, 40, 6, '#2b21234b');
    ellipse(ctx, 6, -9, 33, 9, shade(color, -14), '#6d5236', 1.6);
    ellipse(ctx, -4, -15, 33, 9.5, gradient(ctx, -30, -22, 30, -8, [shade(color, 24), color, shade(color, -14)]), '#6d5236', 1.6);
    for (const [x, y] of [[-14, -16], [2, -14], [-4, -18], [14, -15], [-20, -14]]) ellipse(ctx, x, y, 2.6, 1.3, shade(color, -42));
  }

  function lota(ctx, color) {
    ellipse(ctx, 0, -2, 30, 5, '#2b21234b');
    const body = 'M-17 -4 Q-30 -26 -15 -42 L-9 -50 L9 -50 L15 -42 Q30 -26 17 -4Z';
    path(ctx, body, gradient(ctx, -30, -30, 30, -20, [shade(color, 34), color, shade(color, -34)]), shade(color, -56), 2);
    ellipse(ctx, 0, -50, 9.5, 3.4, shade(color, -30), shade(color, -56), 1.5);
    path(ctx, 'M-18 -30 Q-2 -24 18 -30 M-20 -22 Q0 -14 20 -22', null, shade(color, -48), 1.3);
    path(ctx, 'M-14 -38 Q-20 -26 -12 -12', null, 'rgba(255,255,255,.45)', 2);
  }

  function prop(ctx, { kind, color, label }, t) {
    if (kind === 'wallet' || kind === 'open-wallet') wallet(ctx, color, kind === 'open-wallet');
    else if (kind === 'envelope') envelope(ctx, color, label);
    else if (kind === 'note' || kind === 'newspaper') paper(ctx, color, label, kind === 'newspaper');
    else if (kind === 'letter') letter(ctx, color, label);
    else if (kind === 'key') key(ctx, color, label);
    else if (kind === 'soap') soap(ctx, color);
    else if (kind === 'postbox') postbox(ctx, color, label);
    else if (kind === 'latch') latch(ctx, color);
    else if (kind === 'photo') photo(ctx);
    else if (kind === 'key-rack') rack(ctx, color);
    else if (kind === 'ticket') {
      rounded(ctx, -54, -44, 108, 44, 3, '#90aa9f', '#536e66');
      text(ctx, label || 'पीपलगंज बस', 0, -31, 12, '#314d4a', 89);
      for (let i = 0; i < 11; i++) line(ctx, -45 + i * 8.8, -17, -45 + i * 8.8, -8, '#4f756d', 1.3);
    } else if (kind === 'diya') {
      const flicker = Math.sin(t * 13) * 2.4 + Math.sin(t * 21) * 1.3;
      const halo = ctx.createRadialGradient(12, -42, 0, 12, -42, 91);
      halo.addColorStop(0, '#ffdc9182');
      halo.addColorStop(1, '#f19f4c00');
      ellipse(ctx, 12, -42, 91, 91, halo);
      path(ctx, 'M-35 -25 Q-27 1 -4 1 Q28 2 39 -30 Q4 -19 -35 -25Z', color, '#703e34', 1.6);
      ellipse(ctx, -2, -24, 33, 9, shade(color, -33), shade(color, 22), 1.8);
      path(ctx, `M11 -24 C-2 -34 7 -47 ${15 + flicker} ${-57 - flicker} Q32 -35 16 -24Z`, '#ffbf58', '#c9733d', 1);
      path(ctx, 'M13 -25 Q7 -31 15 -43 Q20 -32 15 -25Z', '#fff0ae');
    } else if (kind === 'tea') {
      ellipse(ctx, 1, 0, 25, 5, '#241a1f60');
      path(ctx, 'M-19 -46 L19 -46 L13 -3 Q1 2 -13 -3Z', '#b7c5bba3', '#685747', 1.5);
      path(ctx, 'M-17 -39 L16 -39 L11 -6 Q0 -1 -11 -6Z', '#a26b40');
      ellipse(ctx, 0, -42, 18, 4, '#ba8861', '#ded9bc', 1.3);
      line(ctx, -12, -37, -9, -9, '#fbebcc8c', 1.7);
    } else if (kind === 'cloth-pouch' || kind === 'open-pouch') pouch(ctx, color, kind === 'open-pouch');
    else if (kind === 'banknotes') banknotes(ctx, color);
    else if (kind === 'parcel') parcel(ctx, color);
    else if (kind === 'open-parcel') openParcel(ctx, color, t);
    else if (kind === 'piggy-bank') piggyBank(ctx, color);
    else if (kind === 'seed-sack') seeds(ctx, color);
    else if (kind === 'umbrella') umbrella(ctx, color);
    else if (kind === 'desk') table(ctx, color);
    else if (kind === 'pencil') {
      path(ctx, 'M-32 -46 L-26 -53 L38 -10 L42 0 L31 -2Z', color, '#59453a', 1.3);
      path(ctx, 'M34 -12 L42 0 L30 -2Z', '#d5b18a', '#745d43', 1.1);
      line(ctx, 38, -4, 42, 0, '#3c3331', 1.85);
    } else if (kind === 'clean-cloth') {
      path(ctx, 'M-58 -58 Q-27 -70 11 -64 Q38 -62 57 -47 L52 -5 Q19 4 -6 -4 Q-38 1 -57 -14Z', color, '#8f7563', 1.6);
      path(ctx, 'M-50 -50 Q-21 -60 19 -56 L47 -47 M-48 -19 Q0 -6 46 -12', null, shade(color, -31), 1.6);
    } else if (kind === 'soap-key') {
      key(ctx, color);
      path(ctx, 'M13 -39 Q16 -47 23 -40 Q27 -42 32 -38 L38 -35 L33 -31 L28 -33 L23 -30 L18 -35Z', '#f3e1b5', '#d1b38b', 1.1);
      ellipse(ctx, 46, -31, 4.7, 3.7, '#f8e7c5');
      ellipse(ctx, 27, -25, 3.6, 2.9, '#fbebd0');
    } else if (kind === 'soap-bar') {
      rounded(ctx, -48, -48, 96, 47, 13, gradient(ctx, -42, -43, 42, 0, [shade(color, 24), color, shade(color, -21)]), '#9d826d');
      rounded(ctx, -42, -42, 84, 31, 10, shade(color, 12), '#dbbea2');
    } else if (kind === 'ribbon') {
      path(ctx, 'M-1 -46 Q-55 -94 -76 -76 Q-93 -46 -49 -42 Q-32 -38 -8 -43 Q-27 -22 -48 -7 L-30 -6 L-21 5 Q-6 -20 1 -39 Q12 -23 40 -1 L47 -12 L64 -17 Q28 -22 10 -46 Q62 -35 73 -57 Q82 -86 59 -79 Q23 -76 -1 -46Z',
        gradient(ctx, -71, -68, 65, -3, [shade(color, 22), color, shade(color, -38)]), shade(color, -53), 2);
      path(ctx, 'M-9 -49 Q-48 -74 -67 -70 M10 -51 Q42 -69 65 -70', null, shade(color, 30), 1.9);
      ellipse(ctx, 1, -47, 10, 8, shade(color, 23), shade(color, -44), 1.7);
    } else if (kind === 'thali') {
      ellipse(ctx, 0, -11, 62, 21, '#cbb29a', '#665348', 2.4);
      ellipse(ctx, 0, -13, 53, 15, '#d8c6a7', '#eee1c1', 1.65);
      ellipse(ctx, -13, -16, 25, 10, '#dbad6b', '#a37649', 1.55);
      for (let i = 0; i < 8; i++) ellipse(ctx, -28 + (i * 11) % 32, -18 + i % 4 * 2, 1.35, 1.05, '#a97745');
      ellipse(ctx, 26, -25, 14, 10, '#b0a191', '#75644d', 1.5);
      ellipse(ctx, 26, -28, 12, 6, '#8c8147', '#e8d6a6', 1.3);
    } else if (kind === 'tomato') {
      if (label === 'single') {
        path(ctx, 'M-23 -23 C-24 -42 -9 -47 1 -40 C18 -49 28 -36 25 -21 C24 -6 12 0 1 -2 C-13 1 -25 -9 -23 -23Z',
          gradient(ctx, -19, -39, 18, -5, [shade(color, 34), color, shade(color, -34)]), '#873a30', 1.7);
        path(ctx, 'M0 -40 L1 -48 M0 -40 Q-8 -44 -13 -40 L-5 -38 L-10 -34 L0 -37 L6 -32 L6 -38 L15 -40Z',
          '#597847', '#506236', 1.05);
        path(ctx, 'M-17 -27 Q-16 -33 -12 -34', null, '#f8aa76', 2.05);
        return true;
      }
      ellipse(ctx, -17, -25, 26, 23, color, shade(color, -46), 1.7);
      ellipse(ctx, 21, -25, 29, 24, gradient(ctx, 2, -47, 40, -2, [shade(color, 29), color, shade(color, -27)]), shade(color, -46), 1.7);
      path(ctx, 'M15 -47 L20 -52 L27 -50 L27 -46 L40 -46 L32 -42 L25 -44 L21 -37 L20 -44 L10 -41Z', '#637b43');
      path(ctx, 'M-30 -44 L-16 -51 L-10 -49 L-9 -45 L2 -44 L-7 -41 L-15 -42 L-22 -37 L-21 -43Z', '#536e3b');
    } else if (kind === 'jalebi') jalebi(ctx, label);
    else if (kind === 'shawl') shawl(ctx, color);
    else if (kind === 'padlock') padlock(ctx, color, label === 'open');
    else if (kind === 'key-board') keyBoard(ctx, color, label);
    else if (kind === 'hanging-cloth') hangingCloth(ctx, color);
    else if (kind === 'anklet') anklet(ctx, color);
    else if (kind === 'chest') chest(ctx, color, label === 'open');
    else if (kind === 'dhol') dhol(ctx, color);
    else if (kind === 'open-sack') openSack(ctx, color);
    else if (kind === 'fair-wheel') fairWheel(ctx, color, t);
    else if (kind === 'puppet-show') puppetShow(ctx, color, t);
    else if (kind === 'quilt') quilt(ctx, color);
    else if (kind === 'pillow') pillow(ctx, color);
    else if (kind === 'coin-pile') coinPile(ctx, color, t);
    else if (kind === 'chaak') chaak(ctx, color, label, t);
    else if (kind === 'shovel') shovel(ctx, color);
    else if (kind === 'chakki') chakki(ctx, color, label, t);
    else if (kind === 'roti') roti(ctx, color);
    else if (kind === 'lota') lota(ctx, color);
    else return false;
    return true;
  }

  globalThis.VillageInserts = { prop };
})();
