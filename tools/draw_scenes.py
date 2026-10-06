"""Draws the sign-in page art: four 8-bit scenes, each with an animal whose eyes follow the cursor.

    python tools/draw_scenes.py

Writes assets/scenes/<scene>.png (animation frames side by side), static/scenes/<animal>.png (the animal,
drawn without pupils: 'E' marks eye whites, the page draws pupils that track the cursor), particle sprites,
and assets/scenes/scenes.json, which tells the page where everything is. Edit a map and re-run.
"""

import json
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "scenes")
W, H = 96, 112   # scene size in art pixels (portrait: it fills the right half of the page)


def hexc(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def canvas(w=W, h=H):
    return np.zeros((h, w, 4), np.uint8)


def blit(img, art, x, y, pal, scale=1):
    for j, row in enumerate(art.strip("\n").split("\n")):
        for i, ch in enumerate(row):
            if ch in pal:
                y0, x0 = y + j * scale, x + i * scale
                if 0 <= x0 < img.shape[1] and 0 <= y0 < img.shape[0]:
                    img[y0:y0 + scale, x0:x0 + scale] = pal[ch] + (255,)


def fill(img, y0, y1, c, x0=0, x1=None):
    img[y0:y1, x0:x1, :3] = c
    img[y0:y1, x0:x1, 3] = 255


def bands(img, rows, colours, dither=True):
    """Hard sky bands; a checker row at each seam (the 8-bit gradient)."""
    for k, c in enumerate(colours):
        fill(img, rows[k], rows[k + 1], hexc(c))
        if dither and k:
            img[rows[k], ::2, :3] = hexc(colours[k - 1])
            img[rows[k] + 1, 1::2, :3] = hexc(colours[k - 1]) if rows[k + 1] - rows[k] > 3 else img[rows[k] + 1, 1::2, :3]


def disc(img, cx, cy, r, c, below=None):
    yy, xx = np.mgrid[0:img.shape[0], 0:img.shape[1]]
    m = (xx - cx) ** 2 + (yy - cy) ** 2 <= r * r + r
    if below is not None:
        m &= yy < below
    img[m, :3] = hexc(c)
    img[m, 3] = 255


def eyes_of(art):
    """Rectangles of 'E' pixels (eye whites) in a sprite map."""
    rows = art.strip("\n").split("\n")
    e = np.array([[ch == "E" for ch in r.ljust(max(map(len, rows)))] for r in rows])
    seen, rects = np.zeros_like(e), []
    for y, x in zip(*np.nonzero(e)):
        if seen[y, x]:
            continue
        x1 = x
        while x1 + 1 < e.shape[1] and e[y, x1 + 1]:
            x1 += 1
        y1 = y
        while y1 + 1 < e.shape[0] and e[y1 + 1, x:x1 + 1].all():
            y1 += 1
        seen[y:y1 + 1, x:x1 + 1] = True
        rects.append({"x": int(x), "y": int(y), "w": int(x1 - x + 1), "h": int(y1 - y + 1)})
    return rects


def sprite(art, pal):
    rows = art.strip("\n").split("\n")
    img = canvas(max(map(len, rows)), len(rows))
    blit(img, art, 0, 0, pal)
    return img


rng = np.random.default_rng(3)

# --------------------------------------------------------------------------------------------- animals
FUR = {"K": hexc("2b1d16"), "O": hexc("e8913a"), "D": hexc("b8612a"), "L": hexc("ffdeb2"), "P": hexc("f28fa0"),
       "E": hexc("ffffff")}
CAT = """
.K...............K....
.KK.............KK....
.KPK...........KPK....
.KPOK.........KOPK....
.KOOOKKKKKKKKKOOOK....
KOOOODOOOOOOODOOOOK...
KOOOOOOOOOOOOOOOOOK...
KOOOEEEEOOOOEEEEOOK...
KOOOEEEEOOOOEEEEOOK...
KOOOEEEEOOOOEEEEOOK...
KOOOEEEEOOOOEEEEOOK...
KOOPPOOOOOKOOOOPPOK...
.KOOOOOOOKOKOOOOOK....
..KKOOOOOOOOOOOKK.....
...KOOOLLLLLOOOK......
..KOOOLLLLLLLOOOK.....
..KODOLLLLLLLODOK..KK.
.KOOOOLLLLLLLOOOOK.KOK
.KODOOLLLLLLLOODOK.KOK
.KOOOOLLLLLLLOOOOKKOK.
.KOOOKOOOOOOOKOOOKOK..
..KKKLLKKKKKKLLKKKK...
"""

CRAB_PAL = {"K": hexc("3b0f12"), "R": hexc("e83a2c"), "r": hexc("a8201c"), "P": hexc("ff9aa8"), "E": hexc("ffffff")}
CRAB = """
..KKKKKK.......KKKKKK..
.KEEEEEEK.....KEEEEEEK.
.KEEEEEEK.....KEEEEEEK.
.KEEEEEEK.....KEEEEEEK.
.KEEEEEEK.....KEEEEEEK.
..KKKKKK.......KKKKKK..
....KK...........KK....
KK...K...........K...KK
KRK..K...........K..KRK
KRRK.KKKKKKKKKKKKK.KRRK
.KRRKRRRRRRRRRRRRRKRRK.
..KKRRRRRRRRRRRRRRRKK..
...KRRPPRRRRRRRPPRRK...
...KRRRRRRKRKRRRRRRK...
...KrRRRRRRKRRRRRRrK...
..K.KrrrrrrrrrrrrrK.K..
.K.K.KKKKKKKKKKKKK.K.K.
"""

SEAL_PAL = {"K": hexc("1c1a24"), "G": hexc("8a8fa6"), "g": hexc("5c6078"), "L": hexc("c8ccd8"), "N": hexc("2b2830"),
            "P": hexc("f0a0b0"), "E": hexc("ffffff")}
SEAL = """
....KKKKKKKKK..........
...KGGGGGGGGGK.........
..KGGGGGGGGGGGK........
.KGGEEEEGEEEEGGK.......
.KGGEEEEGEEEEGGK.......
.KGGEEEEGEEEEGGK.......
.KGGEEEEGEEEEGGK.......
.KGPGGGGNGGGGPGK.......
.KGGGGKNNNKGGGGK.......
..KGGLGKKKGLGGK........
..KGGLLLLLLLGGK........
.KGGGLLLLLLLGGGKK......
.KGGGLLLLLLLGGGGGKK....
KGGgGLLLLLLLGGGGGGGKK..
KGGgGGLLLLLGGGGgGGGGGK.
KGGGgGGGGGGGGGGGgGGGGGK
.KGGGgggKKKKgggGGGKKKGK
..KKKKKK....KKKKKK..KK.
"""

PENG_PAL = {"K": hexc("12141c"), "B": hexc("262a3a"), "W": hexc("f4f4f8"), "w": hexc("c8d4e8"), "Y": hexc("f8a830"),
            "y": hexc("c87818"), "E": hexc("ffffff"), "R": hexc("e83a3a")}
PENG = """
.....KKKKKKKK.....
....KBBBBBBBBK....
...KBBBBBBBBBBK...
..KBBWWWWWWWWBBK..
..KBWEEEEWEEEEWBK.
..KBWEEEEWEEEEWBK.
..KBWEEEEWEEEEWBK.
..KBWEEEEWEEEEWBK.
..KBWWWWYYWWWWWBK.
..KBBWWWyyWWWWBBK.
.KBBRRRRRRRRRRBBBK
.KBBRRRRRRRRRRRRBK
KBBBWWWWWWWWWWBBBK
KBBWWWWWWWWWWWWBBK
KBBWWWWWWWWWWWWBBK
.KBWWWWWWWWWWWWBK.
.KBBwWWWWWWWWwBBK.
..KBBwwwwwwwwBBK..
...KKYYKKKKYYKK...
...KYYYK..KYYYK...
"""

# The status page's site manager: hard hat, heavy eyelids (only the lower half of each eye is open), one sweat drop.
WORK_PAL = {**FUR, "Y": hexc("f8c830"), "y": hexc("c89018"), "B": hexc("8cd4fc")}
HARDHAT_CAT = """
........YYYYYY..........
......YYYYYYYYYY........
.....YYyYYYYYYYYY.......
.....YYyYYYYYYYYY.......
...yyyyyyyyyyyyyyyy.....
...KOOOOOOOOOOOOOOK..B..
..KOOODDOOOOOODDOOOK.BB.
..KOOOEEEEOOOEEEEOOK....
..KOOOEEEEOOOEEEEOOK....
..KOPPOOOOOKOOOOOPPK....
...KOOOOOOKKKOOOOOK.....
....KKOOOOOOOOOOKK......
.....KOOOLLLLLOOK.......
....KOOLLLLLLLLOOK......
...KOOOLLLLLLLLOOOK.....
..KOODOLLLLLLLLODOOK....
..KOOOOLLLLLLLLOOOOKKKK.
..KOOOOOOOOOOOOOOOOKOOOK
..KKLLKKKKKKKKKKKLLKKKK.
"""
CONE_PAL = {"O": hexc("f87830"), "o": hexc("c85818"), "W": hexc("f4f4f4"), "K": hexc("2b1d16")}
CONE = """
....KK....
...KOOK...
...KOOK...
..KWWWWK..
..KWWWWK..
..KOOOoK..
.KOOOOooK.
.KWWWWWWK.
.KWWWWWWK.
KOOOOOOooK
KKKKKKKKKK
"""
# Hover art for the model menu (like a Discord nameplate): autumn leaves, thickest on the right.
def nameplate():
    w, h = 96, 16
    img = canvas(w, h)
    r = np.random.default_rng(5)
    for _ in range(46):
        x = int(w - 1 - abs(r.normal(0, 26)))
        y = int(r.integers(0, h - 2))
        if 0 <= x < w - 2:
            blit(img, [".A.\nAYA\n.R.", "AA\nRA", "Y.\nAY"][int(r.integers(3))], x, y, LEAF_PAL)
    return img


# --------------------------------------------------------------------------------------------- scenes
LEAF_PAL = {"A": hexc("de6e28"), "Y": hexc("f0ba3c"), "R": hexc("c43e26"), "B": hexc("5c3a24"), "b": hexc("42291a")}
TREE = """
........AAYYAA..........
.....RAAAYYAAAARA.......
...AARAAAAAAYAAARAA.....
..AYAAARRAAAAAAAYAAA....
.RAAAYAAAARAAYAAAAARA...
AARAAAAYAAAAARAAAAAYAA..
AAAARAAAAYAAAAARAAAAAR..
.AYAAAAARAAAAYAAAAYAAA..
..RAAAYAAAABbAAARAAAR...
...AARA..AABbAA.AAR.....
.....A....RBb...A.......
...........Bb...........
...........Bb...........
...........Bb...........
..........BBbB..........
.........BBBbBB.........
"""


def autumn():
    img = canvas()
    bands(img, [0, 18, 32, 44, 54, 62, 72], ["1f1830", "34213e", "5c2d42", "96463e", "cc7046", "e89850"])
    disc(img, 70, 70, 9, "ffc46e", below=72)
    yy, xx = np.mgrid[0:H, 0:W]
    hill = (69 - 2.5 * np.sin(xx / 8.0) - 1.5 * np.sin(xx / 3.4 + 1)).round()
    img[(yy >= hill) & (yy < 72), :3] = hexc("46263a")
    fill(img, 72, H, hexc("7a4e30"))
    fill(img, 72, 73, hexc("8e5e3a"))
    for _ in range(70):
        img[int(rng.integers(73, H)), int(rng.integers(W)), :3] = hexc("8e5e3a")
    blit(img, TREE, -2, 34, LEAF_PAL, scale=2)
    blit(img, TREE, 74, 54, LEAF_PAL)
    for _ in range(46):
        x0, y0 = int(rng.integers(-2, W)), int(rng.integers(74, H))
        for _ in range(int(rng.integers(2, 5))):
            x, y = x0 + int(rng.integers(3)), y0 + int(rng.integers(2))
            if 0 <= x < W and y < H:
                img[y, x, :3] = LEAF_PAL["AYR"[int(rng.integers(3))]]
    return [img]


PALM = """
.....GGG..GGG.......
...GGGgGGGGgGGG.....
..GGg...GGG...gGG...
.Gg....GGgGG....gG..
.G....G..T..G....G..
......G..T...G......
.........T..........
.........TT.........
..........T.........
..........T.........
..........TT........
...........T........
...........T........
...........TT.......
............T.......
............T.......
............T.......
...........TTT......
"""
PALM_PAL = {"G": hexc("2c9c3c"), "g": hexc("1c6c2c"), "T": hexc("8c5c2c")}
CLOUD = """
....WWWW......
..WWWWWWWW....
.WWWWWWWWWWWW.
WWWWWWWWWWWWWW
.wwwwwwwwwwww.
"""
CLOUD_PAL = {"W": hexc("ffffff"), "w": hexc("d8eefc")}


def beach():
    frames = []
    for f in range(2):
        img = canvas()
        bands(img, [0, 22, 40, 52, 58], ["3c8cfc", "5cacfc", "84ccfc", "b4e4fc"])
        disc(img, 74, 14, 7, "fce060")
        disc(img, 74, 14, 5, "fcf8a0")
        blit(img, CLOUD, 8, 10, CLOUD_PAL)
        blit(img, CLOUD, 40, 26, CLOUD_PAL)
        fill(img, 58, 74, hexc("1c6cd8"))
        fill(img, 58, 60, hexc("3c8cfc"))
        for y in range(61, 74, 3):   # wave highlights, shifted every frame
            for x in range((y * 5 + f * 3) % 7, W, 7):
                img[y, x:x + 3, :3] = hexc("6cb4fc")
        fill(img, 74, 78, hexc("f0f0f0"))   # surf line
        for x in range((f * 2) % 4, W, 4):
            img[74, x:x + 2, :3] = hexc("6cb4fc")
            img[77, x + 2:x + 4, :3] = hexc("fcdca8")
        fill(img, 78, H, hexc("fcdca8"))
        for _ in range(90):
            img[int(rng.integers(79, H)), int(rng.integers(W)), :3] = hexc("e4b878")
        blit(img, PALM, -4, 50, PALM_PAL, scale=2)
        for sx, sy, c in ((70, 100, "f8a8b8"), (84, 92, "fcfcfc"), (22, 104, "f8c890")):
            blit(img, ".S.\nSSS", sx, sy, {"S": hexc(c)})
        frames.append(img)
    return frames


def sunset():
    frames = []
    for f in range(2):
        img = canvas()
        bands(img, [0, 16, 28, 38, 46, 54, 60], ["2c1838", "5c2448", "a83c4c", "e0603c", "f88c38", "fcb048"])
        disc(img, 44, 60, 12, "fce070", below=60)
        disc(img, 44, 60, 8, "fcf8b0", below=60)
        fill(img, 60, H, hexc("3c2048"))
        for y in range(61, H, 2):   # sun glitter on the water
            span = max(2, 13 - (y - 60) // 5)
            for x in range(44 - span, 44 + span, 2):
                if (x + y // 2 + f) % 3 == 0:
                    img[y, x:x + 2, :3] = hexc("fcb048" if y < 80 else "e0603c")
        for y in range(64, H, 5):
            for x in range((y + f * 4) % 9, W, 9):
                img[y, x:x + 3, :3] = hexc("5c2c58")
        # cliff and lighthouse on the right, rocks in front
        yy, xx = np.mgrid[0:H, 0:W]
        img[(xx > 64 + (yy - 40) * 0.25) & (yy > 42 + 0.12 * (96 - xx)) & (yy < 70), :3] = hexc("1c1024")
        img[(xx > 64 + (yy - 40) * 0.25) & (yy > 42 + 0.12 * (96 - xx)) & (yy < 70), 3] = 255
        fill(img, 28, 44, hexc("f4f0e8"), 80, 85)
        for y in (31, 37):
            fill(img, y, y + 3, hexc("d83c3c"), 80, 85)
        fill(img, 24, 28, hexc("2c1830"), 79, 86)
        fill(img, 25, 27, hexc("fcf060") if f else hexc("6c5c40"), 81, 84)
        rock = ((yy - 104) ** 2 / 64 + (xx - 42) ** 2 / 900 < 1) | ((yy - 108) ** 2 / 36 + (xx - 14) ** 2 / 300 < 1)
        img[rock, :3] = hexc("2c1830")
        img[rock, 3] = 255
        img[rock & (yy < 99) & ((xx + yy) % 5 == 0), :3] = hexc("4c2c48")   # a little texture on top
        frames.append(img)
    return frames


PINE = """
.....W.....
....WWG....
...WGGGW...
..WWWGGGW..
...GGWGG...
..WGGGGWW..
.WWGGGGGGW.
..GGWWGGG..
.WGGGGGGWW.
WWGGGGGGGWW
.....T.....
.....T.....
"""
PINE_PAL = {"W": hexc("e8f0fc"), "G": hexc("1c4c44"), "T": hexc("3c2c2c")}


def snow():
    frames = []
    stars = [(int(rng.integers(W)), int(rng.integers(0, 50))) for _ in range(40)]
    for f in range(2):
        img = canvas()
        bands(img, [0, 24, 44, 60, 70], ["0c0c2c", "141c44", "1c2c5c", "2c3c74"])
        for k, (x, y) in enumerate(stars):
            if (k + f) % 3:
                img[y, x, :3] = hexc("fcfcfc" if k % 4 else "fce8a0")
        for k, (x, y) in enumerate(stars[:6]):   # a few twinkle as crosses
            if (k + f) % 2 == 0:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if 0 <= x + dx < W and 0 <= y + dy < H:
                        img[y + dy, x + dx, :3] = hexc("8ca4dc")
        disc(img, 72, 18, 7, "f8f4dc")
        disc(img, 75, 16, 6, "0c0c2c")   # crescent
        yy, xx = np.mgrid[0:H, 0:W]
        hill = (68 - 3 * np.sin(xx / 9.0 + 2) - 2 * np.sin(xx / 4.0)).round()
        img[(yy >= hill) & (yy < 76), :3] = hexc("8ca4d4")
        img[(yy >= hill) & (yy < 76), 3] = 255
        fill(img, 76, H, hexc("e8f0fc"))
        fill(img, 76, 77, hexc("c4d4f0"))
        for _ in range(60):
            img[int(rng.integers(78, H)), int(rng.integers(W)), :3] = hexc("c4d4f0")
        for px_, py_, s in ((2, 50, 2), (24, 60, 1), (80, 56, 2), (66, 64, 1), (12, 66, 1)):
            blit(img, PINE, px_, py_, PINE_PAL, scale=s)
        frames.append(img)
    return frames


# --------------------------------------------------------------------------------------------- particles
PARTICLES = {
    "leaf": (".A.\nAYA\n.R.", LEAF_PAL),
    "drop": (".B.\nBBB\n.b.", {"B": hexc("8cd4fc"), "b": hexc("3c8cfc")}),
    "sand": ("SS\nSs", {"S": hexc("fcdca8"), "s": hexc("e4b878")}),
    "snow": (".W.\nWWW\n.W.", {"W": hexc("ffffff")}),
    "gull": ("K.....K\n.K.K.K.\n..K.K..", {"K": hexc("fcfcfc")}),
    "bird": ("K.....K\n.K.K.K.\n..K.K..", {"K": hexc("2c1830")}),
    "z": ("ZZZ\n..Z\n.Z.\nZZZ", {"Z": hexc("e8e4f8")}),
    "heart": (".PP.PP.\nPPPPPPP\nPPPPPPP\n.PPPPP.\n..PPP..\n...P...", {"P": hexc("f28fa0")}),
}

SCENES = [
    # name, painter, frame_ms, animal map, palette, animal x/y in the scene, lid colour, words, ambient, burst
    ("autumn", autumn, 0, "cat", CAT, FUR, (44, 52), "e8913a", ["meow!", "mrrp?", "purr~", "mew!", "nya!"],
     {"sprite": "leaf", "kind": "fall", "from": [0, 46, 30, 64], "every": [450, 1100], "ground": [74, 108]}, "leaf"),
    ("beach", beach, 520, "crab", CRAB, CRAB_PAL, (40, 86), "e83a2c", ["snip snip!", "click clack!", "pinch?", "sidestep!"],
     {"sprite": "gull", "kind": "glide", "from": [0, 4, 0, 30], "every": [2500, 6000], "ground": [80, 110]}, "sand"),
    ("sunset", sunset, 700, "seal", SEAL, SEAL_PAL, (32, 80), "8a8fa6", ["arf!", "ork ork!", "*clap clap*", "splash!"],
     {"sprite": "bird", "kind": "glide", "from": [0, 6, 0, 34], "every": [2500, 6500], "ground": [62, 110]}, "drop"),
    ("snow", snow, 900, "penguin", PENG, PENG_PAL, (40, 70), "262a3a", ["noot!", "brr!", "waddle waddle", "*flap*"],
     {"sprite": "snow", "kind": "fall", "from": [0, 96, -4, 0], "every": [120, 320], "ground": [78, 110]}, "snow"),
]


def main():
    os.makedirs(OUT, exist_ok=True)
    meta = []
    for name, painter, frame_ms, animal, art, pal, (ax, ay), lid, words, ambient, burst in SCENES:
        frames = painter()
        Image.fromarray(np.concatenate(frames, axis=1)).save(os.path.join(OUT, f"{name}.png"))
        spr = sprite(art, pal)
        Image.fromarray(spr).save(os.path.join(OUT, f"{animal}.png"))
        meta.append({"name": name, "frames": len(frames), "frame_ms": frame_ms, "w": W, "h": H,
                     "animal": {"name": animal, "x": ax, "y": ay, "w": spr.shape[1], "h": spr.shape[0],
                                "eyes": eyes_of(art), "pupil": [2, 2], "lid": "#" + lid, "words": words},
                     "ambient": ambient, "burst": burst})
    for pname, (art, pal) in PARTICLES.items():
        Image.fromarray(sprite(art, pal)).save(os.path.join(OUT, f"p-{pname}.png"))
    # status-page extras: the tired site manager (not a scene) and its cone; the model-menu nameplate
    Image.fromarray(sprite(HARDHAT_CAT, WORK_PAL)).save(os.path.join(OUT, "hardhat-cat.png"))
    Image.fromarray(sprite(CONE, CONE_PAL)).save(os.path.join(OUT, "cone.png"))
    Image.fromarray(nameplate()).save(os.path.join(OUT, "nameplate-autumn.png"))
    extras = {"hardhat-cat": {"name": "hardhat-cat", "w": len(HARDHAT_CAT.strip().split()[0]), "h": len(HARDHAT_CAT.strip().split()),
                              "eyes": eyes_of(HARDHAT_CAT), "pupil": [2, 1], "lid": "#e8913a",
                              "words": ["*yawn*", "we're on it...", "five more minutes", "it's fine. probably."]}}
    with open(os.path.join(OUT, "scenes.json"), "w") as f:
        json.dump(meta, f, indent=1)
    with open(os.path.join(OUT, "extras.json"), "w") as f:
        json.dump(extras, f, indent=1)
    print("wrote", ", ".join(m["name"] for m in meta))


if __name__ == "__main__":
    main()
