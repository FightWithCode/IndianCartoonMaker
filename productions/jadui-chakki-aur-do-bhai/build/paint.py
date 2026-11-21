"""Paint two new backdrops from scratch with drawing code (no image-generation service).

    haveli()   a wealthy merchant's two-storey haveli: arcaded front, central jharokha balcony,
               domes and chhatris, carved door, garlands, brass urns, a red carpet and paved forecourt
    jhopdi()   a poor potter's hut: sagging thatch with patched holes, cracked mud walls with bare
               brick showing, a torn curtain for a door, dung cakes, a broken cot and a clothesline of rags

Shapes are drawn at 2x for clean edges, then given the studio's painted look: fine grain borrowed from
the painted plates already in data/media, soft ambient-occlusion shadows, warm light and a vignette.
Every random choice is seeded, so the output is reproducible.
"""
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import gaussian_filter

W, H, S = 1600, 900, 2
ROOT = Path(__file__).resolve().parents[3]
MEDIA = ROOT / "data" / "media"
YARD = "796682643f3c05cfa835f4f4a13c55ba"          # a painted courtyard plate: its soil is the grain source


# ----------------------------------------------------------------------------- helpers
def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def oneof(rng, options):
    return options[int(rng.integers(len(options)))]


def mixc(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


class Pen:
    """Draws in logical 1600x900 coordinates onto a 2x canvas; extra layers hold shadows and glints.

    `k` scales everything drawn from now on about `anchor`, so a group of shapes can be enlarged."""

    def __init__(self, base=(0, 0, 0)):
        self.img = Image.new("RGB", (W * S, H * S), base)
        self.d = ImageDraw.Draw(self.img)
        self.shade = Image.new("L", (W * S, H * S), 0)
        self.sd = ImageDraw.Draw(self.shade)
        self.glint = Image.new("L", (W * S, H * S), 0)
        self.gd = ImageDraw.Draw(self.glint)
        self.k = 1.0
        self.anchor = (800.0, 660.0)

    def T(self, x, y):
        ax, ay = self.anchor
        return ((ax + (x - ax) * self.k) * S, (ay + (y - ay) * self.k) * S)

    def pts(self, points):
        return [self.T(x, y) for x, y in points]

    def poly(self, points, fill, outline=None):
        self.d.polygon(self.pts(points), fill=fill, outline=outline)

    def rect(self, x0, y0, x1, y1, fill):
        self.poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], fill)

    def ell(self, cx, cy, rx, ry, fill):
        (x0, y0), (x1, y1) = self.T(cx - rx, cy - ry), self.T(cx + rx, cy + ry)
        self.d.ellipse([x0, y0, x1, y1], fill=fill)

    def line(self, points, fill, width=1.0):
        self.d.line(self.pts(points), fill=fill, width=max(1, round(width * self.k * S)), joint="curve")

    def shadow(self, points, level=255):
        self.sd.polygon(self.pts(points), fill=level)

    def shadow_ell(self, cx, cy, rx, ry, level=255):
        (x0, y0), (x1, y1) = self.T(cx - rx, cy - ry), self.T(cx + rx, cy + ry)
        self.sd.ellipse([x0, y0, x1, y1], fill=level)

    def shine(self, cx, cy, rx, ry, level=255):
        (x0, y0), (x1, y1) = self.T(cx - rx, cy - ry), self.T(cx + rx, cy + ry)
        self.gd.ellipse([x0, y0, x1, y1], fill=level)


def arch(x0, x1, y_base, y_spring, steps=28):
    """Round-arched opening as a polygon (base left, up to the spring line, over the crown, down)."""
    r = (x1 - x0) / 2
    cx = (x0 + x1) / 2
    pts = [(x0, y_base), (x0, y_spring)]
    for i in range(1, steps):
        a = math.pi - math.pi * i / steps
        pts.append((cx + r * math.cos(a), y_spring - r * math.sin(a)))
    pts += [(x1, y_spring), (x1, y_base)]
    return pts


def dome(cx, base_y, rx, ry, steps=26):
    return [(cx - rx, base_y)] + [(cx + rx * math.cos(math.pi - math.pi * i / steps), base_y - ry * math.sin(math.pi * i / steps))
                                    for i in range(1, steps)] + [(cx + rx, base_y)]


def noise(seed, scale, shape=(H, W)):
    n = gaussian_filter(np.random.default_rng(seed).random(shape).astype(np.float32), scale, mode="wrap")
    return (n - n.min()) / (n.max() - n.min() + 1e-6)


def grain():
    """Fine painted grain from the courtyard plate's soil (leaf shadows removed), tiled to the frame."""
    yard = np.asarray(Image.open(MEDIA / (YARD + ".jpg")).convert("L"), dtype=np.float32)[640:900, 0:900] / 255.0
    g = yard - gaussian_filter(yard, 2.5)
    g = np.clip(g / (3.0 * g.std() + 1e-6), -1, 1)
    return np.tile(g, (4, 2))[:H, :W]


def finish(pen, light=(1.06, 1.0, 0.90), grain_amount=0.10, shadow_strength=0.55, vignette=0.28, blur=0.6, seed=0, sky=0, cloud=0.10):
    """Flatten the layers into the final painted-looking float image."""
    base = np.asarray(pen.img.resize((W, H), Image.LANCZOS), dtype=np.float32) / 255.0
    shade = np.asarray(pen.shade.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(7)), dtype=np.float32) / 255.0
    glint = np.asarray(pen.glint.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(3)), dtype=np.float32) / 255.0
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    broad = 0.94 + 0.12 * noise(seed + 3, 90)
    out = base * (1 - shadow_strength * shade[..., None]) * broad[..., None]
    fine = gaussian_filter(grain(), 0.7)
    ground = np.clip((yy - sky) / 60.0, 0, 1)                      # keep the grain off the sky
    out = out * (1 + (grain_amount * (0.15 + 0.85 * ground) * fine)[..., None])
    if sky:
        soft = np.clip((noise(seed + 9, (14, 60)) - 0.52) * 3.2, 0, 1) * np.clip(1 - yy / sky, 0, 1)
        out = out + (cloud * soft)[..., None] * np.array([1.0, 0.97, 0.9], np.float32)
    out = out * np.array(light, np.float32) * (1.07 - 0.14 * (xx / W))[..., None]
    out = out + glint[..., None] * np.array([0.40, 0.32, 0.12], np.float32)
    img = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(blur))
    out = np.asarray(img, dtype=np.float32) / 255.0
    d = np.hypot((xx - W / 2) / (W / 2), (yy - H * 0.52) / (H / 2))
    return out * (1 - vignette * np.clip(d - 0.55, 0, 1)[..., None])


# ----------------------------------------------------------------------------- haveli
def haveli():
    pen = Pen()
    rng = np.random.default_rng(1203)
    CREAM, CREAM_L, WHITE = rgb("#ead29a"), rgb("#f4e6bd"), rgb("#f5eeda")
    RED, RED_D, GOLD, GOLD_L = rgb("#a9472f"), rgb("#7e3322"), rgb("#d9a73c"), rgb("#f3d36e")
    DARK, INTERIOR, TEAL = rgb("#33231a"), rgb("#4e3324"), rgb("#2f6a62")
    XL, XR = 110, 1490

    # sky: pale blue overhead warming to gold at the horizon
    for y in range(0, 660):
        t = min(1, y / 470)
        pen.rect(0, y, W, y + 1.2, mixc(rgb("#9cc3da"), rgb("#f6e0ae"), t ** 0.9))

    # trees at both ends and peeking over the roof line
    def foliage(cx, cy, spread, count, palette):
        for _ in range(count):
            a = rng.uniform(0, 6.28)
            r = math.sqrt(rng.uniform(0, 1))
            pen.ell(cx + math.cos(a) * r * spread, cy + math.sin(a) * r * spread * 0.62, rng.uniform(14, 30), rng.uniform(10, 22), palette[rng.integers(len(palette))])
    greens = [rgb("#3f6a38"), rgb("#58863f"), rgb("#6f9a4d"), rgb("#2f5230")]
    pen.rect(40, 300, 70, 640, rgb("#5b4332"))
    pen.rect(1535, 300, 1562, 640, rgb("#5b4332"))
    foliage(55, 250, 120, 90, greens)
    foliage(1545, 260, 130, 95, greens)
    foliage(310, 120, 120, 40, greens)
    foliage(1290, 125, 120, 40, greens)

    # compound wall beyond the wings
    for x0, x1 in [(0, XL), (XR, W)]:
        pen.rect(x0, 520, x1, 655, CREAM)
        pen.rect(x0, 508, x1, 526, RED)

    # ---- main body of the haveli
    pen.rect(XL, 128, XR, 366, CREAM)                       # upper floor wall (wings)
    pen.rect(XL - 6, 128, XR + 6, 160, CREAM_L)             # parapet band
    pen.rect(XL - 6, 154, XR + 6, 164, RED)
    for x in range(XL - 6, XR, 36):                         # scalloped battlements
        pen.poly([(x, 128), (x + 18, 104), (x + 36, 128)], CREAM_L)
    pen.rect(XL, 366, XR, 612, CREAM)                       # ground floor wall

    # central block, taller, with the dome
    cx0, cx1 = 640, 960
    pen.rect(cx0, 78, cx1, 366, mixc(CREAM, CREAM_L, 0.4))
    pen.rect(cx0 - 8, 78, cx1 + 8, 108, CREAM_L)
    pen.rect(cx0 - 8, 100, cx1 + 8, 112, RED)
    for x in range(cx0 - 8, cx1 + 8, 32):
        pen.poly([(x, 78), (x + 16, 56), (x + 32, 78)], CREAM_L)

    # ---- first-floor windows (one above every arcade bay), then the central jharokha
    pillar = 26
    bounds = [XL] + [XL + (675 - XL) / 4 * i for i in range(1, 5)] + [925] + [925 + (XR - 925) / 4 * i for i in range(1, 5)]
    bays = [(bounds[i], bounds[i + 1]) for i in range(len(bounds) - 1)]
    centre_bay = 4
    for i, (b0, b1) in enumerate(bays):
        if i == centre_bay:
            continue
        cx = (b0 + b1) / 2
        pen.poly(arch(cx - 40, cx + 40, 322, 240), RED)                       # frame
        pen.poly(arch(cx - 34, cx + 34, 318, 240), rgb("#3a2a20"))
        for gx in range(int(cx - 30), int(cx + 31), 9):                       # jaali lattice
            pen.line([(gx, 212), (gx, 318)], rgb("#8c6a46"), 1.4)
        for gy in range(226, 318, 14):
            pen.line([(cx - 34, gy), (cx + 34, gy)], rgb("#8c6a46"), 1.2)
        for sx in (-1, 1):                                                    # teal shutters
            x_in = cx + sx * 34
            pen.poly([(x_in, 232), (x_in + sx * 22, 238), (x_in + sx * 22, 322), (x_in, 318)], TEAL)
            for k in range(7):
                pen.line([(x_in, 246 + k * 11), (x_in + sx * 22, 250 + k * 11)], rgb("#1f4a44"), 1.3)
        pen.rect(cx - 46, 318, cx + 46, 330, WHITE)
        pen.shadow([(cx - 34, 240), (cx + 34, 240), (cx + 34, 318), (cx - 34, 318)], 150)
    # the central jharokha: a projecting carved balcony
    pen.poly([(700, 200), (900, 200), (886, 180), (714, 180)], RED)
    for x in range(716, 890, 16):
        pen.poly([(x, 200), (x + 8, 210), (x + 16, 200)], GOLD)
    pen.rect(710, 200, 890, 348, RED)
    pen.rect(718, 210, 882, 340, WHITE)
    for k in range(3):
        a0 = 726 + k * 52
        pen.poly(arch(a0, a0 + 44, 332, 262), rgb("#2c2018"))
        pen.line([(a0 + 22, 250), (a0 + 22, 332)], rgb("#8c6a46"), 1.3)
        pen.ell(a0 + 22, 300, 8, 8, rgb("#ffd88c"))                            # lamp inside
    pen.rect(706, 340, 894, 356, RED)
    for bx in (722, 770, 830, 878):
        pen.poly([(bx - 8, 356), (bx + 8, 356), (bx, 396)], RED_D)
    pen.shadow([(706, 356), (894, 356), (894, 420), (706, 420)], 170)
    pen.shine(800, 280, 40, 18, 90)

    # ---- chhatris (small domed pavilions) and the great dome
    def chhatri(cx, base_y, w, h):
        pen.rect(cx - w / 2, base_y - 8, cx + w / 2, base_y, RED)
        for px in (-w / 2 + 3, -w / 6, w / 6, w / 2 - 9):
            pen.rect(cx + px, base_y - h * 0.55, cx + px + 6, base_y - 8, WHITE)
        pen.poly([(cx - w / 2 - 4, base_y - h * 0.55), (cx + w / 2 + 4, base_y - h * 0.55), (cx + w / 2 - 2, base_y - h * 0.65), (cx - w / 2 + 2, base_y - h * 0.65)], RED)
        pen.poly(dome(cx, base_y - h * 0.65, w * 0.5, h * 0.42), GOLD)
        pen.line([(cx, base_y - h * 1.07), (cx, base_y - h * 1.22)], GOLD_L, 2)
        pen.ell(cx, base_y - h * 1.24, 3.4, 3.4, GOLD_L)
        pen.shine(cx - w * 0.12, base_y - h * 0.86, w * 0.12, h * 0.09, 220)
    for cx in (200, 1400):
        chhatri(cx, 128, 96, 90)
    for cx in (470, 1130):
        chhatri(cx, 128, 64, 64)
    for cx in (690, 910):
        chhatri(cx, 78, 56, 56)
    pen.rect(760, 70, 840, 80, RED)
    pen.poly(dome(800, 70, 78, 66), GOLD)                                      # the great dome
    pen.shine(770, 36, 24, 10, 230)
    pen.line([(800, 4), (800, 30)], rgb("#8a6420"), 3)
    pen.ell(800, 3, 5, 5, GOLD_L)
    pen.poly([(803, 4), (840, 14), (803, 24)], rgb("#e8782a"))                 # saffron flag

    # ---- cornice and dentils, shadowed beneath
    pen.rect(XL - 10, 340, XR + 10, 354, RED)
    pen.rect(XL - 10, 354, XR + 10, 364, CREAM_L)
    for x in range(XL - 10, XR + 10, 14):
        pen.rect(x, 364, x + 8, 372, RED_D)
    pen.shadow([(XL, 372), (XR, 372), (XR, 420), (XL, 420)], 200)

    # ---- ground-floor arcade: dark interiors first, then arches, pillars, lamps and garlands
    for i, (b0, b1) in enumerate(bays):
        if i == centre_bay:
            continue
        o0, o1 = b0 + pillar / 2, b1 - pillar / 2
        pen.poly(arch(o0 - 7, o1 + 7, 612, 452), RED)
        pen.poly(arch(o0 - 3, o1 + 3, 612, 452), WHITE)
        pen.poly(arch(o0, o1, 612, 452), INTERIOR)
        # warm light pooling on the veranda floor and a doorway at the back
        pen.rect(o0, 560, o1, 612, rgb("#6d4930"))
        if i % 2 == 0:
            pen.rect((o0 + o1) / 2 - 22, 470, (o0 + o1) / 2 + 22, 560, rgb("#7a5338"))
            pen.rect((o0 + o1) / 2 - 18, 476, (o0 + o1) / 2 + 18, 556, rgb("#5e3d29"))
        pen.line([((o0 + o1) / 2, 440), ((o0 + o1) / 2, 478)], rgb("#c9a24a"), 1.6)
        pen.ell((o0 + o1) / 2, 486, 8, 10, GOLD_L)                                # brass hanging lamp
        pen.shine((o0 + o1) / 2, 484, 6, 8, 255)
        pen.shadow(arch(o0, o1, 540, 452), 120)
    for i in range(len(bounds)):                                                # pillars between bays
        px = bounds[i]
        if i in (centre_bay, centre_bay + 1):
            continue
        pen.rect(px - pillar / 2, 440, px + pillar / 2, 612, WHITE)
        pen.rect(px - pillar / 2 - 8, 432, px + pillar / 2 + 8, 452, RED)
        pen.rect(px - pillar / 2 - 5, 596, px + pillar / 2 + 5, 612, RED_D)
        pen.line([(px - 5, 460), (px - 5, 592)], rgb("#d8cdb0"), 1.2)
        pen.shadow([(px + pillar / 2, 452), (px + pillar / 2 + 16, 452), (px + pillar / 2 + 16, 612), (px + pillar / 2, 612)], 120)
    # the grand central door under a cusped arch
    pen.poly(arch(660, 940, 612, 492), RED)
    pen.poly(arch(670, 930, 612, 492), WHITE)
    pen.poly(arch(682, 918, 612, 492), RED_D)
    pen.poly(arch(690, 910, 612, 492), rgb("#2b1d15"))
    pen.poly(arch(716, 884, 500, 440), rgb("#c98a3a"))                           # carved fanlight above the doors
    for k in range(9):
        a = math.pi * (0.1 + k * 0.1)
        pen.line([(800, 500), (800 + 84 * math.cos(a), 500 - 84 * math.sin(a))], rgb("#7a4a1e"), 1.6)
    pen.shine(800, 470, 34, 16, 160)
    for sx in (-1, 1):                                                        # carved double door, slightly ajar
        x_edge = 800 + sx * 8
        pen.poly([(x_edge, 500), (800 + sx * 96, 508), (800 + sx * 96, 612), (x_edge, 612)], rgb("#5a3622"))
        for r in range(3):
            for c in range(4):
                pen.rect(800 + sx * (14 + c * 20), 516 + r * 30, 800 + sx * (26 + c * 20), 540 + r * 30, rgb("#6b422a"))
                pen.ell(800 + sx * (20 + c * 20), 528 + r * 30, 2.6, 2.6, GOLD)  # brass studs
    pen.shine(760, 560, 14, 28, 120)
    for k in range(6):                                                        # cusps along the arch
        a = math.pi * (0.12 + k * 0.152)
        pen.ell(800 - 135 * math.cos(a), 492 - 135 * math.sin(a), 8, 8, GOLD)

    # marigold garlands draped across every arch
    def garland(x0, x1, y0, sag):
        for i in range(30):
            t = i / 29
            x = x0 + (x1 - x0) * t
            y = y0 + sag * 4 * t * (1 - t)
            pen.ell(x, y, 5.2, 5.2, [rgb("#f09a1c"), rgb("#f6bb2b"), rgb("#e0701a")][i % 3])
    for i, (b0, b1) in enumerate(bays):
        if i != centre_bay:
            garland(b0 + 4, b1 - 4, 440, 20)
    garland(676, 924, 478, 40)
    pen.line([(662, 480), (662, 560)], rgb("#e08a1c"), 3)
    pen.line([(938, 480), (938, 560)], rgb("#e08a1c"), 3)

    # ---- plinth, steps, carpet and paving
    pen.rect(XL - 12, 612, XR + 12, 656, RED)
    pen.rect(XL - 12, 612, XR + 12, 622, rgb("#c4613f"))
    pen.rect(XL - 12, 646, XR + 12, 656, RED_D)
    for k in range(3):                                                         # three broad steps
        y0 = 622 + k * 16
        pen.poly([(650 - k * 14, y0), (950 + k * 14, y0), (956 + k * 14, y0 + 16), (644 - k * 14, y0 + 16)], mixc(rgb("#c4613f"), rgb("#8a3a26"), k / 3))
        pen.rect(644 - k * 14, y0, 956 + k * 14, y0 + 3, rgb("#e0906a"))
    # forecourt paving in perspective (sandstone slabs)
    pen.rect(0, 654, W, H, rgb("#d4b486"))
    vp = (800, 420)
    for k, y in enumerate([672, 700, 740, 792, 860]):
        pen.line([(0, y), (W, y)], rgb("#b89564"), 1.6)
    for x in range(-1200, 2800, 150):
        x_far = vp[0] + (x - vp[0]) * (672 - vp[1]) / (H - vp[1])
        pen.line([(x_far, 672), (x, H)], rgb("#b89564"), 1.6)
    for k in range(40):
        y = rng.uniform(690, 890)
        x = rng.uniform(0, W)
        pen.ell(x, y, rng.uniform(20, 60), rng.uniform(3, 8), oneof(rng, [rgb("#ccab7c"), rgb("#dcc093"), rgb("#c39f70")]))
    pen.poly([(716, 656), (884, 656), (1060, H), (540, H)], rgb("#9a2c2f"))        # red carpet runner
    pen.poly([(716, 656), (724, 656), (556, H), (540, H)], GOLD)
    pen.poly([(876, 656), (884, 656), (1060, H), (1044, H)], GOLD)
    pen.shadow([(644, 668), (956, 668), (1010, 700), (600, 700)], 150)
    for ux in (610, 990):                                                      # brass urns by the steps
        pen.ell(ux, 640, 40, 9, rgb("#7a5a1c"))
        pen.poly([(ux - 26, 630), (ux + 26, 630), (ux + 36, 590), (ux + 22, 560), (ux - 22, 560), (ux - 36, 590)], GOLD)
        pen.ell(ux, 560, 24, 8, rgb("#c99a30"))
        pen.shine(ux - 12, 598, 7, 22, 255)
        for a in (-1.0, -0.5, 0, 0.5, 1.0):                                     # palm fronds
            pen.line([(ux, 556), (ux + math.sin(a) * 50, 556 - math.cos(a) * 62)], rgb("#3f7a3a"), 5)
    pen.shadow_ell(610, 652, 52, 10, 180)
    pen.shadow_ell(990, 652, 52, 10, 180)

    return finish(pen, light=(1.07, 1.0, 0.88), grain_amount=0.09, vignette=0.26, seed=11, sky=420, cloud=0.16)


# ----------------------------------------------------------------------------- jhopdi
def jhopdi():
    pen = Pen()
    rng = np.random.default_rng(2207)
    MUD, MUD_L, MUD_D = rgb("#a58460"), rgb("#bf9f78"), rgb("#7e6244")
    BRICK, THATCH_D = rgb("#9b5a3e"), rgb("#6d5a3a")

    # a hazy, dull sky and a few tired trees
    for y in range(0, 540):
        pen.rect(0, y, W, y + 1.2, mixc(rgb("#b9c4c2"), rgb("#ece0c0"), min(1, y / 480)))
    olive = [rgb("#6a7a4a"), rgb("#7c8a56"), rgb("#58673e")]
    for cx, cy in [(120, 440), (230, 470), (1430, 450), (1520, 480), (1330, 470)]:
        for _ in range(50):
            pen.ell(cx + rng.normal(0, 55), cy + rng.normal(0, 26), rng.uniform(14, 28), rng.uniform(10, 18), olive[rng.integers(3)])
    pen.rect(0, 520, W, 900, rgb("#a8906b"))                                   # bare ground
    # far thatched neighbour
    pen.poly([(1380, 540), (1460, 500), (1540, 540)], rgb("#8a7650"))
    pen.rect(1392, 540, 1528, 580, rgb("#b09068"))

    # ---- the hut itself, drawn 1.3x larger than its design coordinates
    pen.k = 1.3
    # ---- walls: leaning, patched mud
    wall = [(448, 640), (466, 420), (1140, 430), (1160, 640)]
    pen.poly(wall, MUD)
    # plaster patches of different shades
    for (x, y, w, h, col) in [(480, 440, 150, 90, MUD_L), (900, 470, 120, 100, rgb("#b08e68")), (620, 560, 110, 60, MUD_L), (1040, 450, 90, 70, rgb("#9c7a56"))]:
        pen.poly([(x, y), (x + w, y + 4), (x + w - 6, y + h), (x + 4, y + h - 6)], col)
    # where the plaster has fallen: bare brick
    for (bx, by, bw, bh) in [(500, 540, 120, 80), (960, 560, 90, 70), (760, 440, 70, 40)]:
        pen.rect(bx, by, bx + bw, by + bh, rgb("#c9a888"))
        for r in range(0, bh, 16):
            off = (r // 16 % 2) * 20
            for c in range(-20, bw, 40):
                x0 = bx + max(0, c + off)
                x1 = min(bx + bw, bx + c + off + 36)
                if x1 > x0:
                    pen.rect(x0, by + r + 1, x1, min(by + bh, by + r + 14), BRICK if (r + c) % 3 else rgb("#a8654a"))
    # damp stain at the foot, cracks
    pen.poly([(448, 600), (1160, 600), (1160, 640), (448, 640)], MUD_D)
    for x0 in (560, 830, 1050):
        pts = [(x0, 440)]
        for k in range(1, 9):
            pts.append((pts[-1][0] + rng.uniform(-14, 14), 440 + k * 24))
        pen.line(pts, rgb("#4a3828"), 2.4)

    # ---- the thatched roof: layered straw, sagging in the middle, with two torn patches
    roof = [(350, 452), (470, 330), (640, 285), (800, 296), (960, 286), (1130, 332), (1250, 452), (1190, 470), (800, 440), (410, 470)]
    pen.poly(roof, rgb("#8a7348"))
    layer = Image.new("RGB", (W * S, H * S), rgb("#8a7348"))
    mask = Image.new("L", (W * S, H * S), 0)
    ImageDraw.Draw(mask).polygon(pen.pts(roof), fill=255)
    ld = ImageDraw.Draw(layer)
    straw = [rgb("#a38a58"), rgb("#8a7248"), rgb("#b79d68"), rgb("#6d5a38"), rgb("#9c8450")]
    for _ in range(3400):
        x = rng.uniform(350, 1250)
        y_top = float(np.interp(x, [350, 470, 640, 800, 960, 1130, 1250], [452, 330, 285, 296, 286, 332, 452])) - 20
        length = rng.uniform(60, 150)
        slope = (x - 800) * 0.07 + rng.normal(0, 4)
        ld.line([pen.T(x, y_top), pen.T(x + slope * length / 60, y_top + length)], fill=straw[int(rng.integers(5))], width=max(1, round(rng.uniform(1.4, 3.2) * pen.k * S)))
    base = pen.img.copy()
    base.paste(layer, (0, 0), mask)
    pen.img = base
    pen.d = ImageDraw.Draw(pen.img)
    # ragged hanging fringe along the eaves
    for x in range(360, 1240, 9):
        yb = 458 + (abs(x - 800) / 450) * -10 + rng.uniform(-3, 8)
        pen.line([(x, yb - 12), (x + rng.uniform(-3, 3), yb + rng.uniform(6, 22))], rgb("#7d6740"), 2.2)
    # torn patches: holes with bamboo rafters showing, one covered by a blue plastic sheet
    pen.poly([(590, 330), (680, 322), (700, 372), (640, 396), (584, 380)], rgb("#241a14"))
    for k in range(4):
        pen.line([(592 + k * 24, 326), (586 + k * 30, 392)], rgb("#8a6a3a"), 3)
    pen.poly([(880, 316), (1000, 322), (1010, 392), (900, 410), (870, 366)], rgb("#4c6f8c"))
    pen.poly([(880, 316), (940, 320), (930, 408), (900, 410), (870, 366)], rgb("#5a7f9c"))
    for ex, ey in [(884, 322), (1002, 328), (1008, 388), (904, 406)]:
        pen.ell(ex, ey, 9, 7, rgb("#7d7468"))                                  # stones holding the sheet down
    pen.line([(898, 350), (990, 372)], rgb("#3a5670"), 1.6)
    pen.line([(930, 324), (962, 400)], rgb("#3a5670"), 1.4)
    # sagging ridge pole and a bamboo prop holding up the left corner
    pen.line([(420, 340), (800, 306), (1180, 340)], rgb("#6a5230"), 6)
    pen.line([(372, 470), (336, 642)], rgb("#8a7a42"), 9)
    pen.line([(372, 470), (336, 642)], rgb("#b0a05c"), 3)
    pen.shadow([(410, 458), (1190, 458), (1160, 520), (440, 520)], 110)      # eave shadow on the wall

    # ---- door with a torn curtain, a broken shutter, dung cakes, firewood
    pen.rect(716, 476, 812, 640, rgb("#2a2018"))
    pen.rect(716, 470, 812, 480, rgb("#6a5230"))
    pen.poly([(720, 482), (780, 480), (782, 560), (770, 600), (760, 570), (748, 620), (736, 590), (724, 640), (720, 640)], rgb("#8c3b30"))
    pen.poly([(720, 482), (744, 482), (736, 620), (722, 640)], rgb("#a3483a"))
    for dx, dy in [(740, 520), (760, 560)]:
        pen.poly([(dx, dy), (dx + 14, dy + 2), (dx + 12, dy + 16), (dx, dy + 14)], rgb("#6b7a5e"))
    pen.rect(560, 470, 624, 530, rgb("#2a2018"))
    pen.poly([(556, 466), (600, 470), (590, 536), (552, 520)], rgb("#8a6a40"))
    for k in range(5):
        pen.line([(560 + k * 12, 474), (556 + k * 12, 528)], rgb("#5a4228"), 1.5)
    for r in range(3):
        for c in range(5):
            pen.ell(970 + c * 28 + (r % 2) * 14, 500 + r * 30, 13, 12, rgb("#7a5a3a"))
            pen.ell(970 + c * 28 + (r % 2) * 14, 500 + r * 30, 9, 8, rgb("#8c6b48"))
    for k in range(14):
        x0 = 520 + rng.uniform(0, 70)
        pen.line([(x0, 640 - k * 3), (x0 + 60 + rng.uniform(-8, 8), 622 - k * 3 + rng.uniform(-6, 6))], rgb(["#6a4a2c", "#7e5a38", "#5a3e26"][k % 3]), 5)

    # ---- clothesline of ragged cloth
    pen.line([(346, 470), (800, 520), (1272, 480)], rgb("#4a3a28"), 1.6)
    pen.line([(1272, 470), (1268, 640)], rgb("#8a7a42"), 8)
    for (x, w, col) in [(640, 86, rgb("#8a6f78")), (1000, 100, rgb("#c9bfa2"))]:
        y = 520 + abs(x - 800) * 0.0 + (x - 346) * 0.05
        pen.poly([(x, y), (x + w, y + 2), (x + w - 8, y + 110), (x + w - 28, y + 96), (x + w - 44, y + 118), (x + 6, y + 104)], col)
        pen.poly([(x + 20, y + 30), (x + 48, y + 32), (x + 46, y + 56), (x + 18, y + 54)], rgb("#6e7f8c"))
        pen.poly([(x + 52, y + 62), (x + 76, y + 64), (x + 72, y + 84), (x + 50, y + 82)], rgb("#8c5a45"))

    # ---- a broken charpai (cot) to the right of the hut
    cot = (1180, 590, 1420, 650)
    for lx in (cot[0] + 6, cot[0] + 52, cot[2] - 56, cot[2] - 10):
        pen.rect(lx, 612, lx + 9, 662, rgb("#5a4228"))
    pen.poly([(cot[0], 596), (cot[2], 590), (cot[2] + 4, 616), (cot[0] - 2, 624)], rgb("#6a5230"))
    pen.poly([(cot[0] + 8, 602), (cot[2] - 8, 598), (cot[2] - 6, 612), (cot[0] + 6, 618)], rgb("#9a845a"))
    for k in range(10):
        pen.line([(cot[0] + 10 + k * 22, 602), (cot[0] + 14 + k * 22, 616)], rgb("#7a6440"), 1.2)
    pen.line([(cot[0] + 80, 610), (cot[0] + 120, 640)], rgb("#9a845a"), 2.4)       # sagging, broken rope

    pen.k = 1.0
    # ---- cracked pots and rubbish in the yard
    for (px, py, s) in [(1130, 650, 1.0), (404, 668, 0.85), (1450, 700, 0.7)]:
        pen.shadow_ell(px, py + 4, 40 * s, 8 * s, 170)
        pen.poly([(px - 28 * s, py), (px - 34 * s, py - 26 * s), (px - 20 * s, py - 50 * s), (px + 20 * s, py - 50 * s), (px + 34 * s, py - 26 * s), (px + 28 * s, py)], rgb("#9a5a3e"))
        pen.line([(px - 4 * s, py - 50 * s), (px + 6 * s, py - 30 * s), (px - 2 * s, py - 14 * s), (px + 8 * s, py)], rgb("#3a2418"), 2)
    pen.poly([(560, 700), (590, 692), (600, 708), (570, 716)], rgb("#8a4f36"))   # a broken shard
    pen.poly([(900, 730), (930, 722), (936, 738), (906, 742)], rgb("#8a4f36"))
    # sparse weeds and bald earth
    for _ in range(90):
        x = rng.uniform(0, W)
        y = rng.uniform(640, 890)
        for a in (-0.5, 0, 0.5):
            pen.line([(x, y), (x + a * 12, y - rng.uniform(10, 22))], rgb("#6f7a44"), 1.6)
    for _ in range(36):
        pen.ell(rng.uniform(0, W), rng.uniform(660, 890), rng.uniform(30, 90), rng.uniform(4, 12), oneof(rng, [rgb("#9a7e5a"), rgb("#b09068"), rgb("#8c7250")]))
    pen.shadow_ell(800, 650, 380, 16, 140)

    return finish(pen, light=(0.97, 0.96, 0.92), grain_amount=0.12, vignette=0.34, seed=29, sky=520, cloud=0.08)


def to_image(a):
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


if __name__ == "__main__":
    out = ROOT / "data" / "jadui-work" / "plates"
    out.mkdir(parents=True, exist_ok=True)
    to_image(haveli()).save(out / "paint-haveli.jpg", quality=92)
    to_image(jhopdi()).save(out / "paint-jhopdi.jpg", quality=92)
    print("painted")
