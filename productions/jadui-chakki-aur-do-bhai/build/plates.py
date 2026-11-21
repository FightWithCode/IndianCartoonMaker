"""Derive this story's new backdrops from plates already in the studio library.

No image-generation service is called. Each plate is a deterministic regrade/repaint of an
existing painted plate in data/media (fixed seeds, so the output ids are reproducible):

  haveli        the merchant's grand haveli, painted from scratch in paint.py
  jhopdi        the poor potter's hut, painted from scratch in paint.py
  hut-rain      the potter's hut yard in monsoon rain: the jhopdi regraded, wet ground, puddles
  flood         the peepal lane under muddy flood water, with the scene reflected in it
  kitchen-cold  the lantern-lit kitchen with its warmth drained (no fire in the chulha)
  room-sick     the charpai room dim and blue, one lantern burning

Run:  python build/plates.py [name ...]      (writes ids to build/plates.json)
"""
import hashlib
import io
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

import paint
from scipy.ndimage import gaussian_filter, map_coordinates

HERE = Path(__file__).resolve().parent
PRODUCTION = HERE.parent
ROOT = HERE.parents[2]
MEDIA = ROOT / "data" / "media"
W, H = 1600, 900

SOURCES = {
    "lane": "2b81b86c1da9373c82032c57bdf49dc4",
    "peepal": "213ee03fc6767e7d0e81ffc265052a7d",
    "kitchen": "14b1a7083b2059cc27e37772d03c0379",
    "room": "f6e297dd142a0a33d6a46671e5f16ddc",
}


def load(name):
    return np.asarray(Image.open(MEDIA / (SOURCES[name] + ".jpg")).convert("RGB"), dtype=np.float32) / 255.0


def to_image(a):
    image = Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))
    return image if image.size == (W, H) else image.resize((1920, 1080), Image.LANCZOS)


def noise(seed, scale, shape=(H, W)):
    n = gaussian_filter(np.random.default_rng(seed).random(shape).astype(np.float32), scale, mode="wrap")
    return (n - n.min()) / (n.max() - n.min() + 1e-6)


def lerp(a, b, t):
    return a + (b - a) * t


def vignette(a, strength):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.hypot((xx - W / 2) / (W / 2), (yy - H * 0.52) / (H / 2))
    return a * (1 - strength * np.clip(d - 0.5, 0, 1)[..., None])


def pool(cx, cy, radius):
    """Soft circular light pool in 0..1 centred on a lantern."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    return np.exp(-(((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * radius ** 2)))


def flood():
    a = load("peepal")
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    # 1. overcast monsoon light on the whole scene
    grey = a.mean(-1, keepdims=True)
    scene = lerp(a, grey, 0.45) * np.array([0.80, 0.86, 0.92], np.float32) * 0.80
    top = np.clip(1 - yy / 400, 0, 1)[..., None]
    scene = lerp(scene, scene * 0.78 + np.array([0.03, 0.05, 0.08], np.float32), top * 0.6)
    # 2. flood water covers the ground below an irregular shoreline
    shore = 548 + (noise(3, 40, (1, W))[0] - 0.5) * 70
    below = (yy - shore[None, :])
    water = np.clip(below / 6, 0, 1)
    # 3. reflection: mirror the scene about the shoreline, rippled sideways
    src_y = np.clip(2 * shore[None, :] - yy, 0, H - 1)
    ripple = (np.sin(yy * 0.13 + noise(5, 6) * 9) * 3.5 + (noise(6, 3) - 0.5) * 10) * np.clip(below / 120, 0, 1)
    src_x = np.clip(xx + ripple, 0, W - 1)
    reflected = np.stack([map_coordinates(scene[..., c], [src_y, src_x], order=1, mode="nearest") for c in range(3)], -1)
    reflected = np.stack([gaussian_filter(reflected[..., c], (2.4, 0.8)) for c in range(3)], -1)
    mud = np.array([0.46, 0.37, 0.27], np.float32)
    depth = np.clip(below / 330, 0, 1)[..., None]
    pool_colour = lerp(reflected * 0.78, mud, 0.38 + 0.38 * depth)
    # 4. glints and slow streaks on the water
    streaks = np.clip((gaussian_filter(np.random.default_rng(11).random((H, W)).astype(np.float32), (1.0, 14)) - 0.5) * 9, 0, 1)
    pool_colour = pool_colour + (streaks * np.clip(below / 200, 0, 1))[..., None] * np.array([0.18, 0.18, 0.17], np.float32) * 0.6
    out = lerp(scene, pool_colour, water[..., None])
    # 5. wet, heavy air near the horizon
    haze = np.exp(-((yy - shore[None, :]) / 60.0) ** 2)[..., None]
    out = lerp(out, np.array([0.62, 0.66, 0.68], np.float32), haze * 0.18)
    return vignette(out, 0.34)


def hut_rain():
    a = paint.jhopdi()
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    grey = a.mean(-1, keepdims=True)
    out = lerp(a, grey, 0.55) * np.array([0.80, 0.88, 0.97], np.float32) * 0.72
    sky = np.clip(1 - yy / 330, 0, 1)[..., None]
    out = lerp(out, out * 0.8 + np.array([0.05, 0.07, 0.10], np.float32), sky * 0.7)
    # wet courtyard: darker earth, with puddles that mirror the grey sky
    ground = np.clip((yy - 560) / 60, 0, 1)
    out = out * (1 - 0.18 * ground[..., None])
    puddle_field = noise(21, 14) + 0.30 * (yy / H)
    puddles = np.clip((puddle_field - 0.80) * 22, 0, 1) * ground
    puddles = gaussian_filter(puddles, 1.0)[..., None]
    sheen = np.array([0.30, 0.36, 0.43], np.float32) * (0.85 + 0.3 * noise(22, 4)[..., None])
    out = lerp(out, sheen, puddles * 0.62)
    edge = np.clip(1 - np.abs(puddles[..., 0] - 0.45) * 6, 0, 1)
    out = out + edge[..., None] * np.array([0.05, 0.06, 0.07], np.float32)
    return vignette(out, 0.30)


def cold(name, lamp, radius, level, tint):
    """Drain a warm interior of its warmth, keeping only the lantern's pool of light."""
    a = load(name)
    grey = a.mean(-1, keepdims=True)
    dim = lerp(a, grey, 0.55) * np.array(tint, np.float32) * level
    light = pool(lamp[0], lamp[1], radius)[..., None]
    return vignette(lerp(dim, a * 0.9, light * 0.85), 0.40)


GIVEN = PRODUCTION / "background images"


def given(file):
    """A backdrop supplied by the story's author (2752x1536). The generator's corner mark is painted out
    by cropping 5 % off the left and 7 % off the right and bottom, then the plate is resized to 1920x1080."""
    a = np.asarray(Image.open(GIVEN / file).convert("RGB"), dtype=np.float32) / 255.0
    # The mark sits in the bottom-right corner: crop it away (16:9 kept) instead of patching it.
    a = a[0:1360, 130:130 + 2418]
    return a


def morning_hut():
    """The potter's hut in the cold, misty first light: blue-grey air, a low pale sun behind the thatch."""
    a = paint.jhopdi()
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    grey = a.mean(-1, keepdims=True)
    out = lerp(a, grey, 0.35) * np.array([0.90, 0.97, 1.05], np.float32) * 0.92
    mist = noise(31, 40) * 0.6 + noise(32, 14) * 0.4
    band = np.exp(-((yy - 520) / 150.0) ** 2) * (0.45 + 0.55 * mist) + 0.25 * np.clip(1 - yy / 400, 0, 1)
    out = lerp(out, np.array([0.80, 0.85, 0.88], np.float32), np.clip(band, 0, 0.7)[..., None] * 0.72)
    return vignette(out, 0.30)


PLATES = {
    "kali-path": ("काली पहाड़ी की ओर धुंधली पगडंडी", lambda: given("Misty Village Path Heading to Kali Pahadi.png")),
    "cliff": ("पहाड़ी की चट्टान और घाटी", lambda: given("Misty Mountain Cliff Valley.png")),
    "storm": ("आंधी में पहाड़ी जंगल", lambda: given("Stormy Hillside Forest.png")),
    "cave": ("प्राचीन गुफा का द्वार", lambda: given("Ancient Stone Cave Entrance with Golden Glow.png")),
    "courtyard-evening": ("गांव का शाम का चौक", lambda: given("Evening courtyar with lights.png")),
    "pottery-yard": ("बरगद के नीचे कुम्हार का आंगन", lambda: given("Outdoor Pottery Workshop Courtyard.png")),
    "hut-morning": ("चंदनपुर · कोहरे में झोपड़ी", morning_hut),
    "haveli": ("चंदनपुर · सोहन की हवेली", paint.haveli),
    "jhopdi": ("चंदनपुर · माधव की झोपड़ी", paint.jhopdi),
    "flood": ("चंदनपुर · बाढ़ का पानी", flood),
    "kitchen-cold": ("चंदनपुर · ठंडी रसोई", lambda: cold("kitchen", (1280, 228), 230, 0.50, (0.86, 0.92, 1.05))),
    "hut-rain": ("चंदनपुर · बारिश में झोपड़ी", hut_rain),
    "room-sick": ("चंदनपुर · बीमार मां का कमरा", lambda: cold("room", (112, 175), 240, 0.46, (0.80, 0.88, 1.10))),
}


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
    manifest_path = HERE / "plates.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    review = ROOT / "data" / "jadui-work" / "plates"
    review.mkdir(parents=True, exist_ok=True)
    for key, (name, build) in PLATES.items():
        if only and key not in only:
            continue
        image = to_image(build())
        image.save(review / f"{key}.jpg", quality=90)
        manifest[key] = store(name, image)
        print(key, manifest[key])
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
