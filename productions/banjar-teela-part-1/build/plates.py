"""Derive the story's new backdrops from plates already in the studio library.

No image-generation service is called. Each plate is a deterministic regrade/repaint of an
existing painted plate in data/media (fixed seeds, so the output ids are reproducible):

  teela             the barren red mound, from the wheat-field path plate
  peepal-dusk       the peepal chaupal at golden dusk
  janaki-ghar       Janaki's house: broken tiles, rain streaks, no festive decoration
  janaki-ghar-dusk  the same house at dusk (for the closing introduction)

Run from the repository root:  python build/plates.py [name ...]   (writes ids to build/plates.json)
"""
import hashlib
import io
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import binary_dilation, gaussian_filter

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
MEDIA = ROOT / "data" / "media"
W, H = 1600, 900

SOURCES = {
    "field": "9ba90100b32f22d0064aa9c2563850ad",
    "peepal": "213ee03fc6767e7d0e81ffc265052a7d",
    "house": "796682643f3c05cfa835f4f4a13c55ba",
}


def load(name):
    return np.asarray(Image.open(MEDIA / (SOURCES[name] + ".jpg")).convert("RGB"), dtype=np.float32) / 255.0


def to_image(a):
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def noise(seed, scale, shape=(H, W)):
    """Smooth value noise in 0..1. A tuple scale blurs each axis separately."""
    rng = np.random.default_rng(seed)
    n = gaussian_filter(rng.random(shape).astype(np.float32), scale, mode="wrap")
    return (n - n.min()) / (n.max() - n.min() + 1e-6)


def fbm(seed, base, octaves=4):
    total, amp, norm = 0, 1.0, 0
    for o in range(octaves):
        total = total + amp * noise(seed + o * 17, base / (2 ** o))
        norm += amp
        amp *= 0.5
    return total / norm


def hsv(a):
    return np.asarray(to_image(a).convert("HSV"), dtype=np.float32) / 255.0


def from_hsv(h):
    image = Image.fromarray((np.clip(h, 0, 1) * 255 + 0.5).astype(np.uint8), "HSV").convert("RGB")
    return np.asarray(image, dtype=np.float32) / 255.0


def lerp(a, b, t):
    return a + (b - a) * t


def vignette(a, strength=0.3):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.hypot((xx - W / 2) / (W / 2), (yy - H * 0.52) / (H / 2))
    return a * (1 - strength * np.clip(d - 0.55, 0, 1)[..., None])


def inpaint(a, mask, passes=60):
    """Fill masked pixels from their surroundings (normalised blur, repeated)."""
    out = a.copy()
    known = (~mask).astype(np.float32)
    for _ in range(passes):
        num = np.stack([gaussian_filter(out[..., c] * known, 2.2) for c in range(3)], -1)
        den = gaussian_filter(known, 2.2)[..., None]
        fill = num / np.maximum(den, 1e-4)
        grow = (den[..., 0] > 0.02) & mask
        out[grow] = fill[grow]
        known = np.where(grow, 1.0, known)
        if known.min() > 0.99:
            break
    return out


# --------------------------------------------------------------------------- the mound
def soil_grain():
    """Fine painted grain for dry earth, from the courtyard plate's soil (leaf shadows filtered out)."""
    yard = load("house")[640:900, 0:900, :].mean(-1)
    grain = yard - gaussian_filter(yard, 2.5)
    grain = np.clip(grain / (3.0 * grain.std() + 1e-6), -1, 1)
    return np.tile(grain, (3, 2))


def cracks(seed, hz, density=62):
    """Drought-crack network (Voronoi cell edges, domain-warped) on a perspective ground plane."""
    from scipy.spatial import cKDTree
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    depth = np.clip((yy - hz) / (H - hz), 0.001, 1)
    z = 1.0 / (depth + 0.07)
    wx = (xx - W / 2) / W * z * 9 + (noise(seed + 1, 14) - 0.5) * 0.9
    wz = z * 7 + (noise(seed + 2, 14) - 0.5) * 0.9
    rng = np.random.default_rng(seed)
    points = rng.random((density * density, 2)) * [26, 90] - [13, 0]
    d, _ = cKDTree(points).query(np.stack([wx.ravel(), wz.ravel()], 1), k=2)
    edge = (d[:, 1] - d[:, 0]).reshape(H, W)
    width = (0.014 + 0.010 * (1 - depth)) * (0.45 + noise(seed + 3, 9) * 1.1)
    return np.clip(1 - edge / width, 0, 1)


def teela():
    a = load("field")
    h = hsv(a)
    hue, sat, val = h[..., 0] * 360, h[..., 1], h[..., 2]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    hz = 338.0

    # Trees and the far bank turn into dry, dusty olive-brown.
    leaf = (hue > 28) & (hue < 125) & (sat > 0.14)
    out = from_hsv(np.stack([np.where(leaf, (24 + (hue - 28) * 0.05) / 360, hue / 360),
                             np.where(leaf, np.clip(sat * 0.46, 0, 0.5), sat),
                             np.where(leaf, val * 0.70, val)], -1))

    # Hazy golden-hour sky; the river catches the same light.
    skylike = (((hue > 150) & (hue < 260)) | ((val > 0.78) & (sat < 0.38))) & (yy < 300) & ~leaf
    closed = gaussian_filter(skylike.astype(np.float32), 3.0) > 0.30
    sky_mask = gaussian_filter(binary_dilation(closed, iterations=2).astype(np.float32), 1.0)[..., None]
    t = np.clip(yy / 330, 0, 1)[..., None]
    top = np.array([0.44, 0.47, 0.60], np.float32)
    mid = np.array([0.94, 0.68, 0.46], np.float32)
    low = np.array([1.00, 0.84, 0.60], np.float32)
    sky = np.where(t < 0.6, lerp(top, mid, t / 0.6), lerp(mid, low, (t - 0.6) / 0.4))
    sky = sky + (fbm(11, 70)[..., None] - 0.5) * 0.09 * np.array([1.0, 0.8, 0.5], np.float32)
    out = out * (1 - sky_mask) + sky * sky_mask
    out = lerp(out, out.mean(-1, keepdims=True) * np.array([1.1, 0.95, 0.78], np.float32), 0.35)

    # Low dusty hills on the horizon instead of the far river bank.
    hills = hz - 34 - noise(8, 40, (1, W))[0] * 30 - noise(9, 14, (1, W))[0] * 7
    band = (yy > hills[None, :]) & (yy <= hz + 4) & (xx > 250) & ((xx < 1455) | (xx > 1550))
    hill_col = lerp(np.array([0.78, 0.50, 0.40], np.float32), np.array([0.90, 0.68, 0.50], np.float32), np.clip((yy - hills[None, :]) / 50, 0, 1)[..., None])
    hm = gaussian_filter(band.astype(np.float32), 1.4)[..., None]
    out = out * (1 - hm) + hill_col * hm

    # Replace the wheat with parched, cracked red earth on a receding ground plane.
    depth = np.clip((yy - hz) / (H - hz), 0, 1)
    tex = soil_grain()
    gy = np.clip(((yy - hz) * 1.1).astype(int), 0, tex.shape[0] - 1)
    gx = (((xx - W / 2) * (0.35 + 0.9 * depth) + 3 * W) % (tex.shape[1] - 1)).astype(int)
    grain = tex[gy, gx]
    patch = fbm(31, 90)
    far = np.array([0.80, 0.52, 0.38], np.float32)
    near = np.array([0.66, 0.30, 0.19], np.float32)
    ground = lerp(far, near, np.clip(depth * 1.25, 0, 1)[..., None])
    ground = ground * (0.84 + 0.34 * patch[..., None]) * (1 + 0.30 * grain[..., None])
    c = cracks(5, hz)
    ground = ground * (1 - 0.50 * c[..., None] * np.clip(depth * 3.0, 0, 1)[..., None])
    dust = np.clip((fbm(44, 40) - 0.52) * 3, 0, 1)[..., None]
    ground = lerp(ground, np.array([0.86, 0.62, 0.46], np.float32), dust * 0.35)
    ground = ground * (1 - (np.clip((900 - xx) / 900, 0, 1) * 0.12 * depth)[..., None])
    trunk = (hue > 8) & (hue < 48) & (sat > 0.22) & (val < 0.66) & (xx > 1420) & (yy > 300) & (yy < 470)
    trunk = gaussian_filter(gaussian_filter(trunk.astype(np.float32), 2.0) > 0.4, 1.2) > 0.3
    ground_mask = (yy > hz) & ~trunk
    gm = gaussian_filter(ground_mask.astype(np.float32), 2.0)[..., None]
    out = out * (1 - gm) + ground * gm

    # The mound: a tall, eroded hill of the same red clay, lit from the right.
    centre, spread, peak = 470.0, 360.0, 96.0
    xs = np.arange(W, dtype=np.float32)
    ridge = noise(3, 26, (1, W))[0] * 30 + noise(5, 8, (1, W))[0] * 9
    prof = peak + (hz + 4 - peak) * (1 - np.exp(-np.abs((xs - centre) / spread) ** 3.1)) + ridge
    inside = (yy >= prof[None, :]) & (yy <= hz + 6)
    height = np.clip((hz - yy) / (hz - peak), 0, 1)
    side = np.clip((xs[None, :] - (centre - 140)) / 520, 0, 1)        # 0 = shaded left, 1 = sunlit right
    lighting = np.clip(0.55 + side * 0.55, 0, 1)
    clay_lit = np.array([0.80, 0.37, 0.22], np.float32)
    clay_dark = np.array([0.45, 0.19, 0.14], np.float32)
    clay = lerp(clay_dark, clay_lit, lighting[..., None]) * np.ones((H, 1, 1), np.float32)
    bands = np.clip((noise(61, (46, 3.2), (H, W)) - 0.5) * 5, -1, 1)
    gullies = np.clip(bands, 0, 1) * (0.30 + 0.70 * height)
    clay = clay * (1 + 0.10 * np.clip(-bands, 0, 1)[..., None] * height[..., None])
    mtex = tex[(yy.astype(int) % tex.shape[0]), (xx.astype(int) % tex.shape[1])]
    clay = clay * (0.88 + 0.22 * fbm(23, 40)[..., None]) * (1 + 0.32 * mtex[..., None])
    clay = clay * (1 - 0.22 * np.clip(gullies, 0, 1)[..., None])
    scrub = (fbm(41, 6) > 0.70) & (height < 0.55) & (height > 0.04) & (np.random.default_rng(9).random((H, W)) > 0.35)
    clay = np.where(scrub[..., None], clay * np.array([0.62, 0.58, 0.40], np.float32), clay)
    rim = np.clip(1 - np.abs(yy - prof[None, :]) / 6, 0, 1) * side
    clay = clay + rim[..., None] * np.array([0.22, 0.12, 0.04], np.float32)
    foot = np.clip((yy - (hz - 70)) / 76.0, 0, 1)[..., None]
    clay = lerp(clay, np.array([0.86, 0.60, 0.44], np.float32), foot * 0.8)
    edge = gaussian_filter(inside.astype(np.float32), 1.0)[..., None]
    out = out * (1 - edge) + clay * edge

    # Heat haze along the horizon, then the warm grade and sun glow.
    band = np.exp(-((yy - hz) / 38.0) ** 2)[..., None]
    out = lerp(out, np.array([0.94, 0.70, 0.50], np.float32), band * 0.45)
    out = out * np.array([1.07, 0.97, 0.84], np.float32)
    glow = np.exp(-(((xx - 1250) / 520.0) ** 2 + ((yy - 150) / 260.0) ** 2))[..., None]
    out = out + glow * np.array([0.20, 0.10, 0.02], np.float32)
    return vignette(out, 0.34)


# ------------------------------------------------------------------------- peepal at dusk
def peepal_dusk():
    a = load("peepal")
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    g = a * np.array([1.10, 0.80, 0.52], np.float32) * 0.80
    g = lerp(g, np.array([0.95, 0.46, 0.26], np.float32), 0.10)
    top = np.clip(1 - yy / 330, 0, 1)[..., None] * 0.45
    g = lerp(g, g * np.array([1.18, 0.82, 0.78], np.float32) + np.array([0.10, 0.03, 0.01], np.float32), top)
    low = np.clip((yy - 600) / 300, 0, 1)[..., None]
    g = lerp(g, g * np.array([0.78, 0.74, 0.86], np.float32), low * 0.5)
    glow = np.exp(-(((xx - 200) / 520.0) ** 2 + ((yy - 120) / 240.0) ** 2))[..., None]
    g = g + glow * np.array([0.26, 0.11, 0.0], np.float32)
    return vignette(g, 0.36)


# ------------------------------------------------------------------- Janaki's weathered house
def janaki_ghar(dusk=False):
    base = load("house")
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

    # 1. Remove the festive pieces: clone clean floor over the rangoli, fade the white border.
    rango = Image.new("L", (W, H), 0)
    ImageDraw.Draw(rango).polygon([(1020, 614), (1170, 574), (1330, 610), (1172, 668)], fill=255)
    rm = gaussian_filter(np.asarray(rango, dtype=np.float32) / 255.0, 9)[..., None]
    donor = np.roll(np.roll(base, 360, axis=1), 12, axis=0)
    base = base * (1 - rm) + donor * rm

    white = (base.min(-1) > 0.66) & ((base.max(-1) - base.min(-1)) < 0.30)
    region = np.zeros((H, W), bool)
    region[250:480, 1055:1300] = True
    region[440:480, 480:1300] = True
    base = inpaint(base, gaussian_filter((white & region).astype(np.float32), 1.6) > 0.10, 40)

    # 2. Poor, tired colours: desaturate and darken the plaster a little.
    base = lerp(base, base.mean(-1, keepdims=True), 0.30)
    base = base * np.array([0.96, 0.90, 0.82], np.float32) * 0.90
    img = to_image(base)

    # 3. Broken roof tiles: dark gaps, exposed rafters and chipped fragments.
    holes = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    hd = ImageDraw.Draw(holes)
    rng = np.random.default_rng(404)

    def hole(points, rafters=True):
        cx = sum(p[0] for p in points) / len(points)
        cy = sum(p[1] for p in points) / len(points)
        jag = [(cx + (x - cx) * rng.uniform(0.9, 1.12), cy + (y - cy) * rng.uniform(0.85, 1.15)) for x, y in points]
        hd.polygon(jag, fill=(30, 20, 17, 226))
        xs = [p[0] for p in jag]
        ys = [p[1] for p in jag]
        if rafters:
            for k in range(3):
                x0 = min(xs) + (max(xs) - min(xs)) * (0.22 + 0.28 * k)
                hd.line([(x0, min(ys) - 1), (x0 + 5, max(ys) + 1)], fill=(84, 56, 38, 255), width=3)
        for _ in range(6):
            fx = rng.uniform(min(xs), max(xs))
            fy = max(ys) + rng.uniform(-6, 3)
            hd.polygon([(fx, fy), (fx + 9, fy - 2), (fx + 11, fy + 4), (fx + 2, fy + 6)], fill=(132, 62, 42, 255))

    hole([(660, 200), (730, 188), (790, 205), (770, 242), (700, 250), (655, 232)])
    hole([(980, 178), (1040, 170), (1085, 186), (1060, 220), (1000, 226)])
    hole([(540, 214), (590, 208), (612, 232), (570, 248)], rafters=False)
    hole([(1195, 168), (1235, 164), (1252, 188), (1214, 198)], rafters=False)
    hole([(1360, 218), (1425, 200), (1470, 228), (1432, 262), (1372, 258)])          # veranda roof
    holes = holes.filter(ImageFilter.GaussianBlur(0.9))
    arr = np.asarray(Image.alpha_composite(img.convert("RGBA"), holes).convert("RGB"), dtype=np.float32) / 255.0

    # 4. Rain streaks running down the plaster from the eaves, and damp at the base.
    wall = np.zeros((H, W), np.float32)
    wall[285:575, 385:1380] = 1.0
    wall = gaussian_filter(wall, 6)
    columns = gaussian_filter(np.random.default_rng(88).random((1, W)).astype(np.float32), (0, 2.0))[0]
    columns = (columns - columns.min()) / (columns.max() - columns.min())
    columns = np.clip((columns - 0.45) * 2.6, 0, 1)
    length = gaussian_filter(np.random.default_rng(5).random((1, W)).astype(np.float32), (0, 5))[0] * 3 + 0.45
    drop = np.clip(1 - (yy - 285) / (95 + 190 * length[None, :]), 0, 1)
    streaks = columns[None, :] * drop * wall * (0.65 + 0.35 * fbm(61, 14))
    arr = arr * (1 - 0.34 * streaks[..., None] * np.array([0.35, 0.55, 0.75], np.float32))
    arr = arr * (1 - 0.18 * fbm(14, 70)[..., None] * wall[..., None])
    damp = np.clip((yy - 500) / 60, 0, 1) * np.clip((590 - yy) / 40, 0, 1) * wall
    arr = arr * (1 - 0.18 * damp[..., None])

    # 5. Quieter light than the festive original.
    if dusk:
        arr = arr * np.array([1.02, 0.80, 0.66], np.float32) * 0.78
        low = np.clip((yy - 560) / 340, 0, 1)[..., None]
        arr = lerp(arr, arr * np.array([0.80, 0.78, 0.92], np.float32), low * 0.5)
        glow = np.exp(-(((xx - 150) / 470.0) ** 2 + ((yy - 90) / 220.0) ** 2))[..., None]
        arr = arr + glow * np.array([0.20, 0.08, 0.0], np.float32)
    else:
        arr = arr * np.array([1.0, 0.97, 0.92], np.float32)
    return vignette(arr, 0.30)


# --------------------------------------------------------------------------------- output
def store(name, image):
    buffer = io.BytesIO()
    image.save(buffer, "JPEG", quality=92, subsampling=0)
    content = buffer.getvalue()
    ident = hashlib.sha256(content).hexdigest()[:32] + ".jpg"
    (MEDIA / ident).write_bytes(content)
    (MEDIA / (ident + ".json")).write_text(json.dumps(
        {"id": ident, "name": name + ".jpg", "bytes": len(content), "type": "image"}, ensure_ascii=False), encoding="utf-8")
    return ident


def main():
    only = set(sys.argv[1:])
    plates = {
        "teela": ("चंदनपुर · बंजर टीला", teela),
        "peepal-dusk": ("चंदनपुर · साँझ की चौपाल", peepal_dusk),
        "janaki-ghar": ("चंदनपुर · जानकी का कच्चा घर", janaki_ghar),
        "janaki-ghar-dusk": ("चंदनपुर · जानकी का घर, साँझ", lambda: janaki_ghar(True)),
    }
    manifest_path = HERE / "plates.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    preview = ROOT / "data" / "banjar-teela-part-1-work"
    preview.mkdir(parents=True, exist_ok=True)
    for key, (name, build) in plates.items():
        if only and key not in only:
            continue
        image = to_image(build())
        image.save(preview / f"plate-{key}.jpg", quality=90)
        manifest[key] = store(name, image)
        print(key, manifest[key])
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
