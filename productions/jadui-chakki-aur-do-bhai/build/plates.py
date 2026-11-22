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


def media(ident):
    """A plate already in the library, resized to the working 1600x900."""
    return np.asarray(Image.open(MEDIA / ident).convert("RGB").resize((W, H), Image.LANCZOS), dtype=np.float32) / 255.0


def moonlight(a, level=0.42, tint=(0.55, 0.66, 1.0), sky_rows=0, moon=None, seed=7):
    """Night grade: drop to moonlight blue, keep a little colour, darken the sky, add stars and a moon."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    lum = a.mean(-1, keepdims=True)
    out = lerp(a, lum, 0.45) * np.array(tint, np.float32) * level
    if sky_rows:
        sky = np.clip(1 - yy / sky_rows, 0, 1) * (lum[..., 0] > 0.55)
        deep = lerp(np.array([0.04, 0.06, 0.16], np.float32), np.array([0.10, 0.14, 0.30], np.float32), (yy / sky_rows)[..., None].clip(0, 1))
        out = lerp(out, deep, sky[..., None] * 0.85)
        rng = np.random.default_rng(seed)
        for _ in range(140):
            x, y = int(rng.uniform(0, W)), int(rng.uniform(0, sky_rows * 0.9))
            if sky[y, x] > 0.5:
                out[max(0, y - 1):y + 1, max(0, x - 1):x + 1] = rng.uniform(0.6, 1.0)
    if moon:
        mx, my, mr = moon
        d = np.hypot(xx - mx, yy - my)
        out = out + (np.exp(-(d / (mr * 4)) ** 2) * 0.25)[..., None] * np.array([0.7, 0.8, 1.0], np.float32)
        out = np.where((d < mr)[..., None], np.array([0.95, 0.95, 0.88], np.float32), out)
    return out


def glow_rect(out, x0, y0, x1, y1, strength=1.0, radius=90, color=(1.0, 0.68, 0.30)):
    """A warmly lit window: fill the opening and spill a soft pool of lamplight around it."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    inside = ((xx >= x0) & (xx <= x1) & (yy >= y0) & (yy <= y1)).astype(np.float32)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    spill = np.exp(-(((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * radius ** 2)))
    c = np.array(color, np.float32)
    out = lerp(out, out * 0.35 + c * 0.9, (inside * 0.85 * strength)[..., None])
    return out + (spill * 0.28 * strength)[..., None] * c


def house_night():
    """Madhav's new house (the pottery-yard house) under silver moonlight, its windows lit by a lantern."""
    a = media("10b24c8a96d10776b1062a02d4ae2ada.jpg")
    out = moonlight(a, level=0.40, sky_rows=330, moon=(1380, 120, 34), seed=11)
    for x0, y0, x1, y1 in [(856, 384, 890, 422), (1081, 384, 1116, 422)]:
        out = glow_rect(out, x0, y0, x1, y1, 1.0, 70)
    out = glow_rect(out, 968, 420, 994, 470, 0.7, 60)
    return vignette(out, 0.40)


def room_night():
    """The lantern-lit room at night (the warm kitchen plate, a touch darker at the edges)."""
    return vignette(load("kitchen") * 0.92, 0.42)


HAVELI_WINDOWS = [(165, 222, 205, 300), (305, 222, 345, 300), (445, 222, 485, 300), (585, 222, 625, 300),
                  (975, 222, 1015, 300), (1115, 222, 1155, 300), (1255, 222, 1295, 300), (1395, 222, 1435, 300)]


def haveli_night(cracked=False):
    """The haveli at night; cracked=True adds split walls with gold light pouring out of every crack and window."""
    a = paint.haveli()
    out = moonlight(a, level=0.38, sky_rows=150, moon=(1460, 70, 26), seed=23)
    for i, (x0, y0, x1, y1) in enumerate(HAVELI_WINDOWS):
        out = glow_rect(out, x0, y0, x1, y1, 1.0 if cracked else (0.6 if i % 3 else 0.0), 80 if cracked else 50)
    out = glow_rect(out, 740, 190, 860, 260, 0.8 if cracked else 0.5, 90)
    if cracked:
        from PIL import ImageDraw
        rng = np.random.default_rng(77)
        mask = Image.new("L", (W, H), 0)
        d = ImageDraw.Draw(mask)
        starts = [(x1, y1) for (_, _, x1, y1) in HAVELI_WINDOWS[::2]] + [(x0, y0) for (x0, y0, _, _) in HAVELI_WINDOWS[1::2]] + [(800, 330), (300, 420), (1300, 430), (760, 150)]
        for sx, sy in starts:
            for branch in range(2):
                x, y, ang = sx, sy, rng.uniform(0, 6.28)
                pts = [(x, y)]
                for _ in range(int(rng.integers(4, 9))):
                    ang += rng.choice([-1, 1]) * rng.uniform(0.5, 1.2)
                    step = rng.uniform(8, 18)
                    x, y = x + np.cos(ang) * step, y + abs(np.sin(ang)) * step
                    pts.append((x, y))
                d.line(pts, fill=255, width=int(rng.integers(3, 6)), joint="curve")
        crack = np.asarray(mask, dtype=np.float32) / 255.0
        core = np.clip(crack - gaussian_filter(crack, 1.2) * 0.8, 0, 1)
        glow = gaussian_filter(crack, 9)
        glow = glow / (glow.max() + 1e-6)
        out = out * (1 - 0.85 * crack[..., None])                                   # dark split in the plaster
        out = out + (core * 0.8)[..., None] * np.array([1.0, 0.80, 0.30], np.float32)  # gold seeping through
        out = out + (glow * 0.30)[..., None] * np.array([1.0, 0.70, 0.25], np.float32)
        # scattered coins already on the street below the windows
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        for _ in range(260):
            cx, cy = rng.uniform(80, 1520), rng.uniform(600, 880)
            r = rng.uniform(3, 7)
            m = ((xx - cx) ** 2 / (r * 1.4) ** 2 + (yy - cy) ** 2 / r ** 2) < 1
            out[m] = np.array([0.95, 0.74, 0.22]) * rng.uniform(0.7, 1.1)
    return vignette(out, 0.42)


def coins_on(out, rng, n, x0, x1, y0, y1, rmin=3, rmax=7):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    for _ in range(n):
        cx, cy = rng.uniform(x0, x1), rng.uniform(y0, y1)
        r = rng.uniform(rmin, rmax)
        m = ((xx - cx) ** 2 / (r * 1.4) ** 2 + (yy - cy) ** 2 / r ** 2) < 1
        out[m] = np.array([0.95, 0.74, 0.22]) * rng.uniform(0.75, 1.1)
    return out


def haveli_broken():
    """The cracked haveli at night after the rescue party broke in: the great doors smashed open, the hall's
    gold glowing inside, coins spilling over the threshold and down the steps."""
    from PIL import ImageDraw
    out = haveli_night(True)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    # the doorway: gold light and the heap inside
    door = (xx > 724) & (xx < 876) & (yy > 455) & (yy < 604)
    inner = lerp(np.array([0.30, 0.18, 0.08], np.float32), np.array([1.0, 0.78, 0.30], np.float32), np.clip((yy - 455) / 150, 0, 1)[..., None])
    out = np.where(door[..., None], inner, out)
    out = out + (pool(800, 560, 190) * 0.45)[..., None] * np.array([1.0, 0.72, 0.28], np.float32)
    # splintered leaves: one hanging askew from its hinge, one fallen across the steps
    leaf = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(leaf)
    d.polygon([(724, 458), (770, 470), (752, 600), (712, 590)], fill=255)
    d.polygon([(820, 612), (930, 600), (948, 628), (836, 642)], fill=255)
    lm = np.asarray(leaf, dtype=np.float32)[..., None] / 255.0
    wood = np.array([0.34, 0.20, 0.12], np.float32) + 0.05 * noise(91, 3)[..., None]
    out = lerp(out, wood, lm)
    splinter = Image.new("L", (W, H), 0)
    ds = ImageDraw.Draw(splinter)
    rng = np.random.default_rng(5)
    for _ in range(26):
        x, y = rng.uniform(700, 900), rng.uniform(450, 640)
        ds.line([(x, y), (x + rng.uniform(-18, 18), y + rng.uniform(-10, 10))], fill=255, width=2)
    sm = np.asarray(splinter, dtype=np.float32)[..., None] / 255.0
    out = lerp(out, np.array([0.55, 0.38, 0.22], np.float32), sm * 0.9)
    # coins pouring down the steps in a fan
    for i in range(420):
        t = rng.uniform(0, 1) ** 0.7
        cx = 800 + rng.normal(0, 40 + 260 * t)
        cy = 600 + t * 280
        out = coins_on(out, rng, 1, cx, cx + 1, cy, cy + 1, 3, 7)
    return vignette(out, 0.42)


def haveli_open():
    """The haveli on a bright morning with its great doors thrown open to the village."""
    a = paint.haveli()
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    door = (xx > 724) & (xx < 876) & (yy > 455) & (yy < 604)
    court = lerp(np.array([0.98, 0.93, 0.78], np.float32), np.array([0.86, 0.74, 0.52], np.float32), np.clip((yy - 455) / 150, 0, 1)[..., None])
    court = court + (np.clip((yy - 520) / 80, 0, 1) * (np.abs(xx - 800) < 30))[..., None] * np.array([-0.4, -0.1, -0.4], np.float32)  # a tulsi in the courtyard
    out = np.where(door[..., None], court, a)
    for x0, x1, k in [(696, 726, -1), (874, 904, 1)]:                  # the two leaves swung open
        m = (xx > x0) & (xx < x1) & (yy > 450 + (xx - x0) * 0.2 * (k < 0)) & (yy < 606)
        out = np.where(m[..., None], np.array([0.44, 0.27, 0.15], np.float32), out)
    out = out * np.array([1.06, 1.02, 0.94], np.float32) + (pool(800, 520, 260) * 0.18)[..., None]
    return vignette(out, 0.22)


def cave_pedestal():
    """Inside the mountain cave by day: a stone pedestal where the mill is returned."""
    a = given("Ancient Stone Cave Entrance with Golden Glow.png")
    a = np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).resize((W, H), Image.LANCZOS), dtype=np.float32) / 255.0
    from PIL import ImageDraw
    img = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    d = ImageDraw.Draw(img)
    ink, lit, mid, dark = (58, 42, 28), (176, 160, 132), (146, 130, 104), (108, 94, 74)
    d.polygon([(944, 742), (1062, 742), (1052, 704), (954, 704)], fill=mid, outline=ink, width=3)       # base
    d.polygon([(1010, 742), (1062, 742), (1052, 704), (1006, 704)], fill=dark)
    d.polygon([(966, 704), (1040, 704), (1036, 664), (970, 664)], fill=lit, outline=ink, width=3)       # column
    d.polygon([(1010, 704), (1040, 704), (1036, 664), (1008, 664)], fill=mid)
    d.polygon([(944, 664), (1062, 664), (1056, 648), (950, 648)], fill=lit, outline=ink, width=3)       # top slab
    for y in (684, 724):
        d.line([(972, y), (1000, y + 2)], fill=dark, width=2)
    out = np.asarray(img, dtype=np.float32) / 255.0
    out = out + (pool(1003, 630, 130) * 0.22)[..., None] * np.array([1.0, 0.85, 0.5], np.float32)
    return out


def chowk_night():
    """The evening village square under moonlight: the lane Madhav runs down."""
    a = media("051b2ab975370ff92214ad6982bf7dc7.jpg")
    out = moonlight(a, level=0.42, sky_rows=300, moon=(240, 110, 30), seed=41)
    return vignette(out, 0.38)


PLATES = {
    "haveli-broken": ("चंदनपुर · टूटा दरवाजा, सीढ़ियों पर सोना", haveli_broken),
    "haveli-open": ("चंदनपुर · सुबह खुले दरवाजों वाली हवेली", haveli_open),
    "cave-pedestal": ("गुफा के भीतर पत्थर का चबूतरा", cave_pedestal),
    "chowk-night": ("चंदनपुर · रात का चौक", chowk_night),
    "house-night": ("चंदनपुर · रात में माधव का घर", house_night),
    "room-night": ("चंदनपुर · रात में माधव का कमरा", room_night),
    "haveli-hall": ("चंदनपुर · हवेली का दालान, रात", paint.haveli_hall),
    "haveli-night": ("चंदनपुर · रात में सोहन की हवेली", lambda: haveli_night(False)),
    "haveli-crack": ("चंदनपुर · चटकती हवेली से बहता सोना", lambda: haveli_night(True)),
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
