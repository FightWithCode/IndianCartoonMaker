(() => {
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const mix = (start, end, t) => start + (end - start) * t;
  const ease = t => t * t * (3 - 2 * t);
  const ink = '#422b28';
  const key = name => name.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
  const ellipse = (ctx, x, y, rx, ry, color, stroke, width = 1) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    if (color) {
      ctx.fillStyle = color;
      ctx.fill();
    }
    if (stroke) {
      ctx.lineWidth = width;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  };
  const path = (ctx, d, fill, stroke, width = 1.6) => {
    const shape = new Path2D(d);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill(shape);
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.stroke(shape);
    }
  };
  const line = (ctx, x, y, ex, ey, color, width = 1) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
  };
  const gradient = (ctx, x, y, endX, endY, stops) => {
    const paint = ctx.createLinearGradient(x, y, endX, endY);
    stops.forEach((color, i) => paint.addColorStop(i / (stops.length - 1), color));
    return paint;
  };
  const random = initial => {
    let seed = initial >>> 0;
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  };
  const shade = (hex, amount) => {
    const value = parseInt(hex.slice(1), 16);
    return '#' + [16, 8, 0].map(shift => clamp(((value >> shift) & 255) + amount, 0, 255).toString(16).padStart(2, '0')).join('');
  };
  const rect = (ctx, x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  const contain = (ctx, img, w, h, bottom = 0) => {
    const scale = Math.min(w / img.width, h / img.height);
    ctx.drawImage(img, -img.width * scale / 2, bottom - img.height * scale, img.width * scale, img.height * scale);
  };
  const cover = (ctx, img, w, h) => {
    const scale = Math.max(w / img.width, h / img.height);
    ctx.drawImage(img, (w - img.width * scale) / 2, (h - img.height * scale) / 2, img.width * scale, img.height * scale);
  };
  globalThis.VillageDraw = { clamp, mix, ease, ink, key, ellipse, path, line, gradient, random, shade, rect, contain, cover };
})();
