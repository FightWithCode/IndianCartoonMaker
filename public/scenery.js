(() => {
  const { ellipse, path, line, rect, gradient, random, shade, contain } = VillageDraw;
  const W = 1600;
  const H = 900;
  const light = {
    day: ['#86bfce', '#dcebd3', '#96ab8c', '#6f8564', '#dcb881', '#b68a5d', '#465b37'],
    dawn: ['#a4a9bd', '#f5d5af', '#a9a68b', '#777c64', '#d3aa7e', '#a27d5e', '#4e5a41'],
    dusk: ['#9686a2', '#ffd0a0', '#aa8776', '#786d58', '#c79261', '#946c54', '#4f4b38'],
    night: ['#172640', '#526678', '#596a70', '#344d50', '#716753', '#4e4e43', '#2e413e'],
  };

  function hill(ctx, random, y, amplitude, color) {
    let d = `M-50 ${y + 70}`;
    let previous = y;
    for (let x = 0; x <= W + 90; x += 160) {
      const next = y + random() * amplitude - amplitude * 0.5;
      d += ` Q${x - 55} ${previous} ${x} ${next}`;
      previous = next;
    }
    path(ctx, d + `L${W + 160} 620 L-50 620Z`, color);
  }

  function foliage(ctx, rng, x, y, scale, color, count = 105) {
    for (let j = 0; j < count; j++) {
      const a = rng() * 6.28;
      const r = Math.sqrt(rng());
      const px = x + Math.cos(a) * r * scale;
      const py = y + Math.sin(a) * r * scale * 0.61;
      const size = scale * (0.085 + rng() * 0.18);
      ellipse(ctx, px, py, size * 1.4, size, shade(color, Math.floor((0.54 - r) * 18 + rng() * 29 - (py - y) * 0.13)));
    }
  }

  function tree(ctx, x, base, scale, color, rng, banyan = false) {
    ctx.save();
    ctx.translate(x, base);
    ctx.scale(scale, scale);
    const bark = shade(color, -15);
    ellipse(ctx, 12, 2, 107, 16, 'rgba(63,46,35,.20)');
    path(ctx, 'M-70 8 Q-27 -28 -24 -76 Q-18 -137 -45 -210 L-33 -243 Q-6 -212 4 -166 Q16 -204 46 -241 L67 -230 Q27 -187 28 -155 Q41 -179 76 -195 L88 -180 Q43 -150 30 -98 Q22 -41 74 1 Q44 14 19 -3 Q-4 20 -18 3Z',
      gradient(ctx, -54, -100, 54, -100, ['#866044', '#664e3c', '#483b32']), '#574332', 3);
    path(ctx, 'M-53 2 Q-14 -35 -15 -95 Q-15 -162 -30 -217 M-24 8 Q3 -27 1 -90 Q-1 -131 -8 -160 M35 -1 Q8 -55 18 -120 Q23 -156 52 -189 M6 -1 Q-6 -26 8 -52', null, '#a17c53', 3.1);
    if (banyan) {
      for (let i = 0; i < 12; i++) {
        const rootX = -176 + i * 32 + rng() * 13;
        const length = 95 + rng() * 180;
        path(ctx, `M${rootX} -268 q-12 46 -7 88 q5 38 -5 ${length * 0.55}`, null, i % 2 ? '#70523a' : '#8e6744', 1.8 + rng() * 4);
      }
    }
    foliage(ctx, rng, -61, -257, banyan ? 179 : 111, bark, 80);
    foliage(ctx, rng, 77, -239, banyan ? 137 : 101, color, 69);
    foliage(ctx, rng, 6, -310, banyan ? 139 : 92, shade(color, 16), 54);
    ctx.restore();
  }

  function window(ctx, x, y, w, h, night, teal = false) {
    rect(ctx, x - 6, y - 5, w + 12, h + 11, '#5b4837');
    rect(ctx, x, y, w, h, night ? '#e9a859' : '#4d4d43');
    const color = teal ? '#527769' : '#785d44';
    rect(ctx, x - w * 0.28, y + 1, w * 0.29, h - 1, color);
    rect(ctx, x + w, y + 1, w * 0.29, h - 1, shade(color, -9));
    for (let i = 1; i < 4; i++) line(ctx, x + w * i / 4, y, x + w * i / 4, y + h, '#514336', 3.2);
    line(ctx, x - 8, y + h + 5, x + w + 10, y + h + 5, '#5c4a39', 4);
  }

  function house(ctx, rng, x, y, scale, wall, roof, night, detail = true) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    path(ctx, 'M-157 -5 L-131 -43 L152 -44 L200 10 L-134 13Z', 'rgba(54,47,37,.21)');
    path(ctx, 'M-136 -148 L108 -151 L108 -3 L-136 -5Z', gradient(ctx, -134, -160, 104, -6, [shade(wall, 27), wall, shade(wall, -17)]), shade(wall, -59), 1.8);
    path(ctx, 'M108 -151 L159 -125 L157 -18 L108 -3Z', shade(wall, -36), shade(wall, -63), 1.7);
    path(ctx, 'M-146 -11 L109 -9 L158 -23 L170 -11 L110 6 L-146 3Z', shade(wall, -41));
    path(ctx, 'M-154 -142 L-104 -206 L74 -212 L121 -146Z', gradient(ctx, -125, -211, 25, -141, [shade(roof, 28), roof, shade(roof, -31)]), shade(roof, -45), 2.6);
    path(ctx, 'M73 -211 L168 -167 L175 -121 L121 -146Z', shade(roof, -33), shade(roof, -53), 2.3);
    const roofArea = new Path2D('M-154 -142 L-104 -206 L74 -212 L121 -146Z');
    ctx.save();
    ctx.clip(roofArea);
    for (let row = 0; row < 8; row++) {
      const yy = -211 + row * 10;
      for (let i = 0; i < 24; i++) {
        const xx = -153 + i * 12 + (row % 2) * 6;
        path(ctx, `M${xx} ${yy} q6 -5 12 0 l2 9 q-6 -3 -13 1Z`, shade(roof, Math.floor(rng() * 38) - 16), shade(roof, -26), 0.65);
      }
    }
    ctx.restore();
    path(ctx, 'M-154 -142 L121 -146 L175 -121 L173 -114 L122 -137 L-152 -133Z', shade(roof, -49));
    rect(ctx, -27, -106, 59, 101, shade(wall, -57));
    rect(ctx, -18, -98, 43, 93, night ? '#bb7f43' : '#483c34');
    path(ctx, 'M-18 -98 L13 -94 L12 -7 L-18 -6Z', '#735641');
    line(ctx, 12, -53, 7, -53, '#d0ac69', 3);
    window(ctx, -100, -103, 35, 38, night, true);
    window(ctx, 61, -105, 26, 33, night);
    if (detail) {
      line(ctx, -134, -23, 107, -22, shade(wall, -32), 2);
      for (let i = 0; i < 14; i++) {
        const xx = -131 + i * 17;
        if (xx < -31 || xx > 34) path(ctx, `M${xx} -26 l7 -9 l7 9`, null, shade(roof, 15), 1.3);
      }
      for (let i = 0; i < 65; i++) {
        const xx = -131 + rng() * 235;
        const yy = -136 + rng() * 128;
        if (yy < -111 || (xx > 31 && xx < 58)) ellipse(ctx, xx, yy, 0.4 + rng() * 2, 0.7, 'rgba(92,63,47,.14)');
      }
    }
    ctx.restore();
  }

  function terracotta(ctx, color) {
    path(ctx, 'M-14 -61 Q-20 -54 -13 -51 Q-36 -36 -29 -16 Q-23 0 0 0 Q27 0 31 -17 Q35 -37 15 -51 Q19 -57 14 -61Z',
      gradient(ctx, -30, -40, 27, -15, [shade(color, 24), color, shade(color, -39)]), '#5a3b2d', 2.6);
    ellipse(ctx, 0, -60, 15.8, 4.6, '#643d2c', shade(color, 36), 1.6);
    path(ctx, 'M-27 -26 Q0 -16 29 -26 M-26 -19 Q0 -12 28 -20', null, shade(color, 53), 1.8);
    path(ctx, 'M-21 -29 l6 6 l6 -4 l6 6 l7 -5 l6 5 l8 -6', null, shade(color, 64), 1.15);
  }

  function basket(ctx, color) {
    path(ctx, 'M-34 -35 Q-28 -4 -21 -1 Q0 5 21 -1 Q30 -12 35 -35Z',
      gradient(ctx, -29, -28, 30, -12, [shade(color, 35), color, shade(color, -29)]), '#583d31', 2.3);
    ellipse(ctx, 0, -35, 35, 9, '#604533', shade(color, 33), 2.3);
    path(ctx, 'M-21 -37 Q-15 -82 1 -76 Q19 -76 24 -36', null, shade(color, -24), 5.5);
    path(ctx, 'M-22 -39 Q-14 -79 1 -74 Q15 -73 21 -44', null, shade(color, 31), 1.7);
    for (let i = 0; i < 4; i++) path(ctx, `M${-30 + i * 2} ${-27 + i * 6} Q0 ${-17 + i * 5} ${31 - i * 2} ${-28 + i * 6}`, null, shade(color, 34), 1.5);
  }

  function well(ctx, color) {
    ellipse(ctx, 1, 3, 78, 17, 'rgba(48,35,31,.23)');
    path(ctx, 'M-61 -54 L-58 -16 Q-49 3 0 4 Q49 4 58 -16 L62 -55Z', shade(color, -12), '#685749', 2);
    for (let row = 0; row < 4; row++) {
      const y = -54 + row * 13;
      path(ctx, `M-59 ${y} Q0 ${y + 28} 58 ${y}`, null, shade(color, -43), 2);
      for (let i = 0; i < 5; i++) {
        const x = -52 + i * 23 + (row % 2) * 6;
        const yy = y + 14 * (1 - (x / 60) ** 2);
        line(ctx, x, yy, x + 1, yy + 12, shade(color, -38), 1.4);
      }
    }
    ellipse(ctx, 0, -56, 63, 18, shade(color, 26), shade(color, -40), 2.4);
    ellipse(ctx, 0, -57, 48, 11, '#514536', '#77634e', 1.4);
    path(ctx, 'M-53 -57 L-53 -130 L-43 -131 L-42 -55 M48 -57 L47 -130 L56 -130 L58 -55 M-58 -125 L63 -128 L64 -137 L-59 -134Z',
      '#79543b', '#5a4234', 2);
    path(ctx, 'M5 -134 Q-3 -127 5 -121 M12 -134 Q5 -128 12 -121 M19 -135 Q12 -128 19 -121 L17 -80', null, '#e1b76c', 2.6);
  }

  function fence(ctx, x, y, w, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    for (let j = 0; j < 3; j++) path(ctx, `M0 ${-19 - j * 14} Q${w * 0.48} ${-28 - j * 14} ${w} ${-14 - j * 14}`, null, j % 2 ? '#92734b' : '#a88657', 5.2);
    for (let i = 0; i < w; i += 30) path(ctx, `M${i} 0 l-5 -68 l6 -6 l4 73Z`, '#83613f', '#75583e', 1.2);
    ctx.restore();
  }

  function outdoors(ctx, scene, time, weather) {
    const rng = random(scene.seed);
    const colors = light[time];
    const night = time === 'night';
    const [sky, horizon, far, near, earth, dirt, green] = colors;
    const kind = scene.kind;
    rect(ctx, 0, 0, W, H, gradient(ctx, 0, 0, 0, 560, [sky, horizon]));
    if (night) {
      for (let i = 0; i < 90; i++) ellipse(ctx, rng() * W, rng() * 356, 0.5 + rng() * 1.6, 0.6 + rng(), 'rgba(244,232,198,.66)');
      ellipse(ctx, 1165, 128, 35, 35, '#e9d7a0');
      ellipse(ctx, 1178, 118, 33, 33, '#2b3e56');
    } else {
      const radius = time === 'day' ? 47 : 82;
      ellipse(ctx, 1180, time === 'day' ? 112 : 300, radius, radius, time === 'day' ? '#fff1c1' : '#f3b271');
    }
    for (let i = 0; i < 8; i++) {
      const x = rng() * W;
      const y = 62 + rng() * 264;
      const scale = 25 + rng() * 108;
      for (let j = 0; j < 7; j++) {
        ellipse(ctx, x + rng() * scale, y + rng() * 19, scale * 0.55, 4 + rng() * 13, night ? 'rgba(149,156,158,.08)' : 'rgba(252,246,219,.14)');
      }
    }
    hill(ctx, rng, 400, 136, far);
    hill(ctx, rng, 447, 95, shade(far, -15));
    hill(ctx, rng, 483, 76, near);
    rect(ctx, 0, 489, W, H - 489, gradient(ctx, 0, 488, 0, H, [shade(earth, -17), earth, dirt]));
    const landscape = ['field', 'river', 'lane'].includes(kind);
    const grass = shade(green, night ? 7 : 30);
    path(ctx, 'M0 498 Q255 463 442 513 Q725 468 1010 494 Q1430 472 1600 523 L1600 598 Q1300 558 1110 585 Q907 545 606 591 Q300 554 0 640Z',
      gradient(ctx, 0, 481, 0, 630, [shade(grass, 12), grass, green]));
    for (let i = 0; i < 9; i++) {
      const y = 507 + i * 9;
      path(ctx, `M-30 ${y + i * 1.8} Q460 ${y - 38} 815 ${y + 3} T1630 ${y - i}`, null, shade(grass, i % 3 === 0 ? -18 : 20), 2.5 + i * 0.8);
    }
    for (let i = 0; i < 24; i++) {
      const x = rng() * W;
      const y = 476 + rng() * 63;
      if (i % 4 === 0) house(ctx, rng, x, y + 20, 0.14 + rng() * 0.17, night ? '#736e5b' : '#ddc6a0', night ? '#51423b' : '#a56648', night, false);
      else foliage(ctx, rng, x, y - 13, 21 + rng() * 24, shade(green, Math.floor(rng() * 30)), 15);
    }
    if (kind === 'river') {
      const water = night ? '#45686c' : '#659a99';
      path(ctx, 'M890 492 Q1030 534 882 573 Q713 618 769 671 Q844 720 1490 900 L1600 900 L1600 748 Q1220 683 1088 635 Q1012 609 1100 576 Q1180 542 930 489Z',
        gradient(ctx, 0, 493, 0, 900, [shade(water, 18), water, shade(water, -28)]), shade(water, -24), 3.2);
      for (let i = 0; i < 42; i++) {
        const y = 582 + rng() * 310;
        const x = 915 + rng() * (120 + (y - 565) * 0.94) + (y > 670 ? (y - 670) * 1.8 : 0);
        line(ctx, x, y, x + 16 + rng() * 66, y + 0.8, 'rgba(218,225,197,.27)', 1 + rng() * 1.8);
      }
    } else {
      const road = landscape ? 'M720 501 Q854 544 760 628 Q679 711 1150 900 L460 900 Q463 744 674 638 Q800 560 690 501Z' :
        'M755 505 Q844 544 755 570 Q501 651 352 900 L1510 900 Q1154 729 1000 631 Q855 569 800 501Z';
      path(ctx, road, gradient(ctx, 0, 510, 0, 900, [shade(earth, 9), shade(earth, -5), shade(dirt, 15)]));
    }
    for (let i = 0; i < 1550; i++) {
      const x = rng() * W;
      const y = 545 + rng() * 355;
      if (kind === 'river' && x > 790 + (y - 620) * 2 && x < 1310) continue;
      const width = 1 + rng() * 13 * (y / H) ** 2;
      ellipse(ctx, x, y, width, 0.38 + rng() * 1.5, i % 3 ? 'rgba(89,59,38,.13)' : 'rgba(245,217,168,.24)');
    }
    const wall = night ? shade(scene.palette, -50) : shade(scene.palette, 32);
    const roof = night ? '#594740' : '#9b573b';
    if (!landscape) {
      house(ctx, rng, 222, 637, 1.15, wall, roof, night);
      house(ctx, rng, 1328, 613, 1.02, shade(wall, -15), shade(roof, -7), night);
      house(ctx, rng, 1199, 560, 0.58, shade(wall, 14), roof, night);
      fence(ctx, 1040, 628, 295, 0.68);
      fence(ctx, 42, 685, 190, 0.94);
    }
    if (kind === 'lane') {
      house(ctx, rng, 330, 635, 1.20, wall, roof, night);
      house(ctx, rng, 1220, 614, 1, shade(wall, 7), roof, night);
      fence(ctx, 1040, 650, 330, 0.8);
      line(ctx, 1060, 609, 1068, 203, '#7b6550', 8);
      line(ctx, 1044, 238, 1100, 238, '#7b6550', 5);
      path(ctx, 'M-20 163 Q565 375 1080 236 Q1320 328 1610 280', null, '#5d554a', 2);
    }
    if (kind === 'field') {
      for (let i = 0; i < 170; i++) {
        const x = rng() * W;
        const y = 570 + rng() * 330;
        if (Math.abs(x - 800) < (y - 545) * 0.55 + 55) continue;
        const s = 8 + (y - 570) * 0.048;
        path(ctx, `M${x} ${y} q-2 -${s} -10 -${s + 2} m10 ${s + 2} q3 -${s * 0.7} 11 -${s}`, null, shade(grass, i % 4 === 0 ? 46 : -3), 2.2);
      }
    }
    if (kind === 'chowk' || kind === 'courtyard') {
      ctx.save();
      ctx.translate(kind === 'chowk' ? 1020 : 1170, 640);
      ctx.scale(1.15, 1.15);
      if (kind === 'chowk') well(ctx, night ? '#777064' : '#a8937e');
      else {
        terracotta(ctx, '#a7623f');
        ctx.translate(48, 3);
        ctx.scale(0.7, 0.7);
        terracotta(ctx, '#b96f46');
      }
      ctx.restore();
    }
    if (kind === 'temple') {
      path(ctx, 'M977 640 L984 600 L1014 600 L1024 459 Q1075 443 1081 363 Q1090 444 1140 455 L1150 600 L1194 600 L1206 640Z',
        gradient(ctx, 984, 425, 1170, 641, [shade(wall, 35), wall, shade(wall, -21)]), shade(wall, -55), 3);
      path(ctx, 'M1041 597 L1042 528 Q1080 470 1121 528 L1125 599Z', night ? '#ce9958' : '#675145', '#8e6b4c', 8);
      for (let i = 0; i < 5; i++) line(ctx, 1026 + i * 5, 461 - i * 18, 1139 - i * 5, 461 - i * 18, shade(wall, -38), 4);
      line(ctx, 1081, 377, 1081, 322, '#71493b', 3);
      path(ctx, 'M1081 324 Q1100 332 1116 322 L1118 341 Q1102 347 1081 339Z', '#bb6a39');
    }
    tree(ctx, kind === 'river' ? 1440 : 125, kind === 'field' ? 628 : 685, kind === 'field' ? 0.74 : 1.1, green, rng, kind === 'chowk' || kind === 'temple');
    tree(ctx, 1512, 685, 0.73, shade(green, -10), rng);
    if (weather === 'mist' || weather === 'rain') rect(ctx, 0, 0, W, H, weather === 'mist' ? 'rgba(216,222,207,.31)' : 'rgba(66,85,101,.27)');
  }

  function indoors(ctx, scene, time) {
    const rng = random(scene.seed);
    const kind = scene.kind;
    const dark = time === 'night' ? -37 : time === 'dusk' ? -12 : 0;
    const base = shade(scene.palette, dark);
    rect(ctx, 0, 0, W, 617, gradient(ctx, 0, 0, W, 617, [shade(base, -35), shade(base, 54), shade(base, -18)]));
    path(ctx, 'M0 569 Q850 610 1600 568 L1600 900 L0 900Z', gradient(ctx, 0, 570, 0, 900, [shade(base, -17), shade(base, 8), shade(base, -28)]));
    path(ctx, 'M0 553 Q805 590 1600 554 L1600 596 Q800 628 0 591Z', shade(base, -39));
    for (let j = 0; j < 7; j++) {
      const y = 615 + j * j * 7.2;
      line(ctx, 0, y, W, y - 2, 'rgba(65,43,34,.20)', 2);
      for (let i = 0; i < 12; i++) {
        const x = i * 175 - (j % 2) * 97 - 80;
        line(ctx, x, y, x + (x - 800) * 0.04, y + 11 + j * 11, 'rgba(65,43,34,.22)', 1.8);
      }
    }
    for (let i = 0; i < 850; i++) {
      ellipse(ctx, rng() * W, rng() * 554, 0.8 + rng() * 4.5, 0.7 + rng() * 2, 'rgba(73,45,36,.11)');
    }
    for (let i = 0; i < 7; i++) path(ctx, `M${i * 300 - 90} 0 l59 0 l-55 143 l-83 4Z`, shade(base, -42), shade(base, -57), 3);
    rect(ctx, 0, 109, W, 15, shade(base, -49));
    window(ctx, 1260, 212, 182, 167, time === 'night', true);
    if (time !== 'night') path(ctx, 'M1261 383 L1443 383 L1357 625 L1079 728 L911 662Z', 'rgba(255,220,151,.16)');
    if (kind === 'shop') {
      const wood = shade('#6e4a36', dark);
      rect(ctx, 93, 165, 1013, 382, shade(wood, -16));
      for (let row = 0; row < 4; row++) {
        const y = 244 + row * 93;
        for (let i = 0; i < 19; i++) {
          const x = 111 + i * 52 + rng() * 6;
          const w = 25 + rng() * 16;
          const h = 40 + rng() * 39;
          const color = shade(['#ba7b48', '#a05d4e', '#71845d', '#c9a753', '#718995', '#ae8867'][Math.floor(rng() * 6)], dark);
          rect(ctx, x, y - h, w, h, color);
          rect(ctx, x + 3, y - h - 3, w - 6, 7, shade(color, -28));
          rect(ctx, x + 2, y - h / 2, w - 4, 18, shade(color, 31));
          line(ctx, x + 7, y - h / 2 + 7, x + w - 7, y - h / 2 + 7, shade(color, -33), 1.2);
        }
        rect(ctx, 93, y, 1013, 12, shade(wood, 16));
        rect(ctx, 93, y + 12, 1013, 5, shade(wood, -15));
      }
      for (let i = 0; i < 5; i++) rect(ctx, 89 + i * 250, 156, 20, 402, wood);
      path(ctx, 'M-24 611 L509 622 L649 709 L614 893 L-24 873Z', gradient(ctx, 0, 611, 649, 893, [shade(wood, 18), wood, shade(wood, -17)]), shade(wood, -23), 3.2);
      path(ctx, 'M-24 593 L499 610 L652 686 L649 713 L-24 693Z', shade(wood, 23), shade(wood, -9), 3.5);
    } else if (kind === 'school') {
      rect(ctx, 253, 191, 820, 286, '#614b38');
      rect(ctx, 265, 202, 796, 261, '#4b6257');
      for (let row = 0; row < 4; row++) for (let i = 0; i < 18; i++) {
        const x = 304 + i * 35 + rng() * 5;
        const y = 247 + row * 51 + rng() * 4;
        path(ctx, `M${x} ${y} q12 -14 15 3 l-12 5 q-5 -3 0 -7`, null, 'rgba(241,227,189,.55)', 1.8);
      }
      for (const x of [55, 1180]) {
        path(ctx, `M${x} 631 l247 -7 l68 49 l-309 13Z`, '#92704f', '#604d3a', 3);
        path(ctx, `M${x + 17} 681 l-6 104 m279 -107 l-5 110`, null, '#66523e', 12);
      }
    } else {
      rect(ctx, 169, 325, 535, 25, '#72513c');
      for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.translate(220 + 89 * i, 326);
        ctx.scale(0.55 + rng() * 0.42, 0.55 + rng() * 0.42);
        terracotta(ctx, shade('#a1654c', dark));
        ctx.restore();
      }
      path(ctx, 'M116 591 L461 587 L522 653 L91 666Z M91 666 L91 734 L517 713 L522 653Z', '#a4805a', '#664c39', 3);
      for (let i = 0; i < 25; i++) line(ctx, 116 + i * 14, 596, 98 + i * 16.4, 659, '#85684b', 1.1);
      path(ctx, 'M646 559 L692 523 L731 555 L719 608 L650 613Z', '#776352', '#5c4b3d', 3);
      ellipse(ctx, 688, 550, 31, 12, '#5d4b3d');
    }
  }

  function backdrop(ctx, scene, shot, image) {
    if (image) {
      VillageDraw.cover(ctx, image, W, H);
      if (!scene.bakedLight) {
        if (shot.time === 'night') rect(ctx, 0, 0, W, H, 'rgba(18,39,77,.63)');
        if (shot.time === 'dusk') rect(ctx, 0, 0, W, H, 'rgba(119,63,57,.22)');
        if (shot.time === 'dawn') rect(ctx, 0, 0, W, H, 'rgba(243,164,102,.18)');
      }
      if (shot.weather === 'mist') rect(ctx, 0, 0, W, H, 'rgba(213,226,211,.36)');
      if (shot.weather === 'rain') rect(ctx, 0, 0, W, H, 'rgba(55,82,107,.31)');
    } else if (['shop', 'home', 'school'].includes(scene.kind)) indoors(ctx, scene, shot.time);
    else outdoors(ctx, scene, shot.time, shot.weather);
  }

  function prop(ctx, asset, t, image) {
    const { kind, color } = asset;
    const edge = shade(color, -42);
    if (image) return contain(ctx, image, 205, 205);
    if (VillageInserts.prop(ctx, asset, t)) return;
    ellipse(ctx, 4, 1, ['cart', 'bench', 'buffalo'].includes(kind) ? 75 : 41, 7.5, 'rgba(59,42,34,.16)');
    if (kind === 'pot') return terracotta(ctx, color);
    if (kind === 'basket') return basket(ctx, color);
    if (kind === 'well') return well(ctx, color);
    if (kind === 'tree') return tree(ctx, 0, 0, 0.71, color, random(17129), true);
    if (kind === 'bench' || kind === 'stall') {
      path(ctx, 'M-74 -43 L65 -45 L78 -31 L-72 -26Z M-62 -26 L-58 -1 L-49 -1 L-50 -27 M60 -32 L57 -2 L67 -2 L71 -33', color, edge, 2.6);
      if (kind === 'stall') path(ctx, 'M-68 -44 L-69 -118 L-62 -118 L-60 -43 M63 -45 L61 -117 L69 -117 L71 -45 M-88 -113 L-62 -144 L61 -144 L88 -113Z', shade(color, 22), edge, 2.8);
      return;
    }
    if (kind === 'coin') {
      ellipse(ctx, 0, -16, 18, 17, '#c68b32', '#79552b', 2.5);
      ellipse(ctx, -1, -17, 13, 12, '#e5b651', '#f5d18e', 1.7);
      if (asset.label === 'plain') {
        ellipse(ctx, -1, -17, 7.2, 7.4, null, '#bd8638', 1.45);
      } else {
        path(ctx, 'M-4 -23 L6 -23 M-4 -19 L6 -19 M-1 -24 Q5 -14 -4 -14 L6 -9', null, '#9d692e', 1.6);
      }
      return;
    }
    if (kind === 'lantern') {
      const glow = ctx.createRadialGradient(0, -43, 1, 0, -43, 104);
      glow.addColorStop(0, `rgba(255,204,111,${0.35 + Math.sin(t * 9) * 0.07})`);
      glow.addColorStop(1, 'rgba(255,196,94,0)');
      ellipse(ctx, 0, -43, 104, 104, glow);
      path(ctx, 'M-18 -4 L-13 -13 L-12 -56 L12 -56 L15 -13 L21 -4Z', '#e9a75e', edge, 3);
      path(ctx, 'M-21 -58 L-11 -68 L10 -68 L21 -57Z M-6 -69 Q-8 -86 7 -83 L7 -68', color, edge, 2.8);
      path(ctx, 'M0 -22 Q-11 -34 1 -48 Q11 -30 0 -22Z', '#fff1ac');
      return;
    }
    if (kind === 'goat' || kind === 'buffalo') {
      const buffalo = kind === 'buffalo';
      ctx.save();
      if (buffalo) ctx.scale(1.3, 1.35);
      const bob = Math.sin(t * 2.5) * 1.5;
      path(ctx, 'M-41 -50 L-47 -4 L-39 -3 L-28 -45 M29 -48 L29 -3 L36 -2 L43 -49', edge, '#4f3d35', 2.7);
      path(ctx, 'M-51 -58 Q-62 -71 -67 -88 Q-60 -70 -42 -69Z', color, edge, 2.4);
      ellipse(ctx, -6, -60, 55, 27, color, edge, 3);
      path(ctx, `M29 -64 Q38 ${-99 + bob} 57 ${-100 + bob} Q82 ${-96 + bob} 86 ${-75 + bob} Q77 ${-65 + bob} 60 ${-68 + bob} L44 -43Z`, shade(color, 14), edge, 3);
      path(ctx, buffalo ? 'M52 -99 Q33 -99 34 -119 Q43 -109 57 -107 M64 -102 Q85 -101 91 -122 Q94 -99 72 -95' :
        'M52 -97 Q40 -112 49 -118 Q51 -105 59 -101 M66 -100 Q72 -113 80 -113 L73 -97', '#c0ac8f', edge, 2.3);
      ellipse(ctx, 68, -86 + bob, 3.3, 3.3, '#382d28');
      ellipse(ctx, 82, -77 + bob, 2, 2, '#382d28');
      ctx.restore();
      return;
    }
    if (kind === 'cart' || kind === 'cycle') {
      const cycle = kind === 'cycle';
      for (const x of [-51, 51]) {
        ellipse(ctx, x, -29, 29, 29, null, '#554338', 5.7);
        ellipse(ctx, x, -29, 4.8, 4.8, edge);
        for (let i = 0; i < 9; i++) {
          const angle = i * Math.PI * 2 / 9 + t * 0.2;
          line(ctx, x, -29, x + 26 * Math.cos(angle), -29 + 26 * Math.sin(angle), '#785b44', 1.5);
        }
      }
      path(ctx, cycle ? 'M-51 -29 L-15 -75 L16 -31 L-51 -29 L30 -67 L51 -29 L37 -84 L52 -85 M-23 -76 L-5 -76' :
        'M-81 -52 L78 -51 L84 -96 L-83 -98Z M-64 -55 L98 -46 L120 -52',
      cycle ? null : color, edge, 5.1);
      if (cycle) path(ctx, 'M-70 -69 L-27 -69 M-61 -69 L-51 -29 M-34 -69 L-51 -29', null, edge, 3.25);
      if (!cycle) for (let j = 0; j < 5; j++) line(ctx, -79, -59 - j * 7, 78, -58 - j * 7, shade(color, 21), 2.2);
      return;
    }
    if (kind === 'book') {
      path(ctx, 'M-40 -16 L-10 -45 L5 -37 Q27 -45 43 -39 L34 -12 Q16 -11 2 -3 Q-19 -12 -40 -8Z', '#ecdfbc', edge, 2.5);
      path(ctx, 'M-10 -45 L2 -3 M-30 -17 L-10 -22 M-26 -24 L-12 -27 M9 -21 Q22 -27 33 -26', null, '#957b62', 1.6);
    } else if (kind === 'door') {
      path(ctx, 'M-45 0 L-44 -135 L48 -135 L48 0Z', color, edge, 5.5);
      for (let i = 0; i < 7; i++) line(ctx, -38 + 12 * i, -128, -37 + 12 * i, 0, shade(color, -18), 2.1);
      ellipse(ctx, 33, -60, 4.5, 4.5, '#d7aa61', edge, 1.8);
    } else if (kind === 'rope') {
      for (let i = 0; i < 5; i++) ellipse(ctx, i - 2, -4 - i * 3, 34 - i * 4, 8, null, shade(color, 14 + i * 7), 3.5);
      path(ctx, 'M6 -16 Q32 -26 41 -15 Q50 -7 64 -16', null, color, 4);
    } else if (kind === 'pump') {
      path(ctx, 'M-19 -1 L-19 -104 L13 -104 L13 -46 L36 -45 L37 -33 L8 -33 L8 0Z M-20 -99 L-43 -80 L-55 -28', color, edge, 4);
      ellipse(ctx, -3, -100, 16, 7, shade(color, 23));
    } else if (kind === 'sign') {
      path(ctx, 'M-7 -2 L-8 -104 L4 -104 L6 -1Z M-61 -79 L-60 -128 L65 -127 L62 -76Z', color, edge, 3);
      path(ctx, 'M-45 -111 L38 -110 M-42 -98 L22 -97', null, shade(color, 37), 3);
    } else {
      path(ctx, 'M-22 -61 Q-36 -43 -34 -17 Q-35 -4 -17 -1 L22 -2 Q37 -5 35 -19 Q32 -42 17 -59 L24 -71 L-23 -71Z', color, edge, 2.3);
      path(ctx, 'M-23 -61 Q0 -56 21 -62 M-16 -57 Q-14 -46 -24 -37 M17 -56 Q17 -45 27 -35', null, shade(color, 35), 2.2);
    }
  }

  globalThis.VillageScenery = { W, H, backdrop, prop };
})();
