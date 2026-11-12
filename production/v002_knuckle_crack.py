"""ZO-002 · Zoom In · Why Your Knuckles Crack.
usage: python3 v002_knuckle_crack.py <model_dir> <work_dir> <out.mp4> [cover.png]"""
import math, os, sys
from multiprocessing import Pool
import numpy as np
from PIL import Image
from zo import *

MODEL, WORK, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
COVER = sys.argv[4] if len(sys.argv) > 4 else None
os.makedirs(WORK, exist_ok=True)

LINES = [(x, x, g) for x, g in [
    ("That pop when you crack your knuckles?", 0.15),
    ("It isn't your bones.", 0.30),
    ("Every knuckle is a joint: two bones, sealed in a capsule full of slippery fluid.", 0.22),
    ("That fluid has gas dissolved in it, like a fizzy drink.", 0.25),
    ("When you pull the finger, the capsule stretches, and the pressure inside suddenly drops.", 0.20),
    ("The gas rushes out, and a bubble snaps into existence.", 0.30),
    ("That's the pop.", 0.35),
    ("It takes about twenty minutes for the gas to dissolve again, so you can't crack the same knuckle twice in a row.", 0.30),
    ("And no, it doesn't cause arthritis.", 0.22),
    ("One doctor cracked only his left hand for over fifty years to check.", 0.30),
    ("Both hands were fine.", 0.0),
]]
HIGHLIGHT = {"pop", "bones", "capsule", "fluid", "gas", "fizzy", "pressure", "drops", "bubble",
             "twenty", "minutes", "arthritis", "fifty", "years", "fine", "joint"}

voice, vsr, SENT, CAPS = synth_voice(LINES, MODEL)
DUR = SENT[-1][1] + 1.5
NF = int(DUR * FPS)
voice = np.concatenate([voice, np.zeros(max(0, int(DUR * vsr) - len(voice)), np.float32)])
s = [a for a, b in SENT]
e = [b for a, b in SENT]
SCENES = [0.0, s[2] - 0.12, s[8] - 0.12]
LOOP = DUR - 0.35

T_HOOKPOP = 0.85
T_STRETCH = s[4] + 0.3
T_POP = s[5] + 0.58 * (e[5] - s[5])
T_RESET = s[7] + 0.3
T_STRIKE = s[8] + 0.55 * (e[8] - s[8])

SKIN = (236, 178, 140)
BONE = (240, 231, 210)
BONE_D = (196, 184, 156)
PINK = (255, 150, 140)
GREEN = (52, 211, 153)
CARD = (40, 54, 112)
BG = background().convert("RGBA")
RNG = np.random.default_rng(4)
DOTS = [(RNG.uniform(-1, 1), RNG.uniform(-1, 1), RNG.uniform(0, 6.28), RNG.uniform(5, 9)) for _ in range(46)]


def header(c):
    rings(c, (112, 262), 40)
    c.text((172, 262), "ZOOMED OUT", "black", 38, WHITE, anchor="lm")
    w = c.text_w("ZOOM IN", "black", 32) + 56
    c.rect((1080 - 70 - w, 232, 1080 - 70, 292), fill=CYAN, radius=30)
    c.text((1080 - 70 - w / 2, 263), "ZOOM IN", "black", 32, SPACE)


def pop(t, t0, d=0.3):
    return ease_back(prog(t, t0, d))


def burst(c, center, r, a, label="POP!"):
    cx, cy = center
    pts = []
    for i in range(24):
        rr = r if i % 2 == 0 else r * 0.68
        ang = i * math.pi / 12
        pts.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang)))
    c.poly(pts, YELLOW, a)
    c.text((cx, cy), label, "black", r * 0.55, SPACE, a=a)


def finger(c, base, bend, skin_a, bone_a):
    L, wd = [290, 215, 175], 150
    angs = [0.0, bend, bend * 1.7]
    pts = [base]
    for ln, an in zip(L, angs):
        x, y = pts[-1]
        pts.append((x + ln * math.cos(an), y + ln * math.sin(an)))
    c.rect((-120, base[1] - 190, base[0] + 30, base[1] + 190), fill=SKIN, radius=70, a=skin_a)
    c.line(pts, SKIN, width=wd, a=skin_a)
    for p in pts[1:]:
        c.circle(p, wd / 2, fill=SKIN, a=skin_a)
    if bone_a > 0:
        c.line([(-60, base[1]), (base[0] - 26, base[1])], BONE, width=58, a=bone_a)
        c.circle((base[0] - 30, base[1]), 42, fill=BONE, a=bone_a)
        for i in range(3):
            (x0, y0), (x1, y1) = pts[i], pts[i + 1]
            dx, dy = (x1 - x0) / L[i], (y1 - y0) / L[i]
            a0 = (x0 + dx * 34, y0 + dy * 34)
            a1 = (x1 - dx * (34 if i < 2 else 60), y1 - dy * (34 if i < 2 else 60))
            c.line([a0, a1], BONE, width=50 - i * 6, a=bone_a)
            c.circle(a0, 38 - i * 4, fill=BONE, a=bone_a)
            c.circle(a1, 34 - i * 4, fill=BONE, a=bone_a)
    return pts


def scene_a(c, t):
    c.text((540, 470), "THAT POP?", "black", 176, YELLOW)
    a2 = prog(t, s[1], 0.12)
    if a2 > 0:
        c.text((540, 615), "NOT YOUR BONES", "black", 98 * lerp(0.75, 1, pop(t, s[1])), WHITE, a=a2)
    bend = math.radians(52) * ease_out(prog(t, 0.25, 0.6))
    xray = ease_io(prog(t, s[1] - 0.2, 0.5))
    pts = finger(c, (250, 860), bend, lerp(1.0, 0.38, xray), xray)
    a = prog(t, T_HOOKPOP, 0.06) * (1 - prog(t, T_HOOKPOP + 1.1, 0.3))
    if a > 0:
        burst(c, (pts[1][0] + 120, pts[1][1] - 170), 150 * lerp(0.4, 1, pop(t, T_HOOKPOP, 0.25)), a)
        for k in range(3):
            rr = 60 + 60 * k + 40 * prog(t, T_HOOKPOP, 0.8)
            c.d.arc([(pts[1][0] - rr) * c.s, (pts[1][1] - rr) * c.s, (pts[1][0] + rr) * c.s, (pts[1][1] + rr) * c.s],
                    200, 250, fill=rgba(WHITE, a * (1 - k * 0.25)), width=int(10 * c.s))


def joint(c, t, gap, dots_a, conv, bub, labels_a):
    cx, cy = 540, 800
    xl, xr = cx - gap / 2, cx + gap / 2
    cap = (xl - 285, 615, xr + 285, 985)
    c.rect(cap, fill=CYAN, a=0.30, radius=150)
    for xe, sd in ((xl, -1), (xr, 1)):
        sh = (-60, 712, xe - 150, 888) if sd < 0 else (xe + 150, 712, 1140, 888)
        hd = (xe - 250, 655, xe, 945) if sd < 0 else (xe, 655, xe + 250, 945)
        c.rect((sh[0] - 6, sh[1] - 6, sh[2] + 6, sh[3] + 6), fill=BONE_D, radius=30)
        c.ellipse((hd[0] - 6, hd[1] - 6, hd[2] + 6, hd[3] + 6), BONE_D)
        c.rect(sh, fill=BONE, radius=30)
        c.ellipse(hd, BONE)
    c.rect(cap, outline=PINK, width=14, radius=150)
    if dots_a > 0:
        for ux, uy, ph, r in DOTS:
            x = cx + ux * (gap / 2 + 26) + 5 * math.sin(t * 5 + ph)
            y = cy + uy * 150 + 6 * math.cos(t * 4 + ph)
            x, y = lerp(x, cx, conv), lerp(y, cy, conv)
            c.circle((x, y), r * (1 - 0.6 * conv), fill=WHITE, a=0.9 * dots_a * (1 - conv * 0.7))
    if bub > 0:
        R = min(gap / 2 - 4, 74) * bub
        c.circle((cx, cy), R, fill=WHITE, a=0.95)
        c.circle((cx, cy), R, outline=CYAN, width=6)
        c.circle((cx - R * 0.3, cy - R * 0.32), R * 0.2, fill=CYAN, a=0.35)
    if labels_a > 0:
        for x in (150, 930):
            c.text((x, cy), "BONE", "black", 46, (128, 112, 84), a=labels_a)
        c.text((540, 548), "CAPSULE", "black", 46, PINK, a=labels_a)
        c.line([(540, 578), (540, 610)], PINK, width=5, a=labels_a)
        c.text((540, 1075), "FLUID", "black", 46, CYAN, a=labels_a)
        c.line([(540, 962), (540, 1044)], CYAN, width=5, a=labels_a)


def scene_b(c, t):
    stretch = ease_io(prog(t, T_STRETCH, 1.2)) * (1 - ease_io(prog(t, T_RESET, 2.2)))
    gap = lerp(64, 170, stretch)
    conv = ease_io(prog(t, T_POP - 0.55, 0.5)) * (1 - ease_io(prog(t, T_RESET + 0.4, 2.6)))
    bub = pop(t, T_POP - 0.05, 0.2) * (1 - ease_io(prog(t, T_RESET, 2.6)))
    labels_a = prog(t, s[2] + 0.8, 0.3) * (1 - prog(t, s[4] - 0.2, 0.25))
    joint(c, t, gap, prog(t, s[3], 0.3), conv, bub if t >= T_POP - 0.05 else 0, labels_a)
    # flash rings at the pop and again on "That's the pop"
    for tp in (T_POP, s[6] + 0.25):
        q = prog(t, tp, 0.45)
        if 0 < q < 1:
            c.circle((540, 800), 80 + 260 * ease_out(q), outline=YELLOW, width=14 * (1 - q) + 2, a=1 - q)
    # titles
    if t < s[3] - 0.1:
        c.text((540, 440), "INSIDE A KNUCKLE", "black", 92, WHITE, a=prog(t, SCENES[1], 0.2))
    elif t < s[4] - 0.1:
        c.text((540, 440), "LIKE A FIZZY DRINK", "black", 88 * lerp(0.8, 1, pop(t, s[3] + 1.2)), YELLOW,
               a=prog(t, s[3] + 1.2, 0.15))
    elif t < T_POP:
        a = prog(t, T_STRETCH, 0.2)
        c.text((540, 440), "PRESSURE DROPS", "black", 92, WHITE, a=a)
    elif t < s[7] - 0.1:
        k = max(pop(t, T_POP, 0.22), 0.01) * (1 + 0.12 * (1 - prog(t, s[6] + 0.25, 0.3)) * (t > s[6] + 0.25))
        burst(c, (540, 440), 165 * k, 1.0)
    else:
        left = 1200 * (1 - ease_io(prog(t, T_RESET, e[7] - T_RESET - 0.4)))
        c.text((540, 430), f"{int(left) // 60:02d}:{int(left) % 60:02d}", "black", 190, WHITE, a=prog(t, s[7], 0.2))
        c.text((540, 545), "MINUTES TO RESET", "xbold", 50, MUTED, a=prog(t, s[7], 0.2))
    # pull arrows + pressure gauge
    g = prog(t, s[4], 0.25) * (1 - prog(t, s[7] + 0.2, 0.3))
    if g > 0:
        d = 30 * stretch
        for sd in (-1, 1):
            x0 = 540 + sd * (300 + d)
            c.line([(x0, 1075), (x0 + sd * 120, 1075)], CYAN, width=16, a=g)
            c.poly([(x0 + sd * 165, 1075), (x0 + sd * 112, 1042), (x0 + sd * 112, 1108)], CYAN, a=g)
        c.text((540, 1075), "PULL", "black", 46, CYAN, a=g)
        lvl = lerp(1.0, 0.22, ease_io(prog(t, T_STRETCH + 0.3, 1.1)))
        col = tuple(int(lerp(YELLOW[i], CORAL[i], 1 - lvl)) for i in range(3))
        c.text((90, 1185), "PRESSURE", "black", 40, MUTED, anchor="lm", a=g)
        c.rect((340, 1163, 990, 1207), fill=CARD, radius=22, a=g)
        c.rect((340, 1163, 340 + 650 * lvl, 1207), fill=col, radius=22, a=g)
    a = prog(t, s[7] + 0.55 * (e[7] - s[7]), 0.15) * (1 - prog(t, e[7] + 0.1, 0.2))
    if a > 0:
        c.rect((240, 1050, 840, 1150), fill=CORAL, radius=50, a=a)
        c.text((540, 1100), "NO SECOND CRACK YET", "black", 44, WHITE, a=a)
    if t < s[7] - 0.1 and t > s[5]:
        c.text((540, 1245), "Source: Kawchuk et al., PLOS ONE (2015)", "medium", 30, MUTED, a=0.9)


def scene_c(c, t):
    c.text((540, 470), "ARTHRITIS?", "black", 160, WHITE, a=prog(t, SCENES[2], 0.15))
    k = ease_out(prog(t, T_STRIKE, 0.22))
    if k > 0:
        half = c.text_w("ARTHRITIS?", "black", 160) / 2 + 20
        c.line([(540 - half, 474), (540 - half + 2 * half * k, 474)], CORAL, width=20)
    cards = [(70, "LEFT HAND", "50+", "years of cracking", YELLOW, s[9] + 0.2),
             (560, "RIGHT HAND", "0", "never cracked", WHITE, s[9] + 0.45 * (e[9] - s[9]))]
    for x, lab, big, sub, col, t0 in cards:
        a = prog(t, t0, 0.15)
        if a <= 0:
            continue
        dy = 40 * (1 - ease_out(prog(t, t0, 0.3)))
        c.rect((x, 650 + dy, x + 450, 1030 + dy), fill=CARD, radius=44, a=a)
        c.text((x + 225, 715 + dy), lab, "black", 46, MUTED, a=a)
        c.text((x + 225, 840 + dy), big, "black", 170, col, a=a)
        c.text((x + 225, 965 + dy), sub, "bold", 40, WHITE, a=a)
    a = prog(t, s[10] + 0.1, 0.12)
    if a > 0:
        p = pop(t, s[10] + 0.1)
        w = 800 * lerp(0.8, 1, p)
        c.rect((540 - w / 2, 1070, 540 + w / 2, 1190), fill=GREEN, radius=60, a=a)
        c.text((540, 1130), "BOTH HANDS: FINE", "black", 66 * lerp(0.8, 1, p), SPACE, a=a)
    c.text((540, 1245), "Source: D. Unger, Arthritis & Rheumatism (1998)", "medium", 30, MUTED,
           a=prog(t, s[9], 0.3) * 0.9)


FUNCS = [scene_a, scene_b, scene_c]


def render(i):
    t = i / FPS
    idx = max(k for k in range(3) if t >= SCENES[k])
    cv = Canvas()
    FUNCS[idx](cv, t)
    img = cv.img
    tin = prog(t, SCENES[idx], 0.22)
    if idx > 0 and tin < 1:
        sc = lerp(1.14, 1.0, ease_out(tin)) if idx == 2 else lerp(0.8, 1.0, ease_out(tin))
        w, h = img.size
        z = img.resize((int(w * sc), int(h * sc)), Image.BILINEAR)
        if sc >= 1:
            ox, oy = (z.size[0] - w) // 2, (z.size[1] - h) // 2
            img = z.crop((ox, oy, ox + w, oy + h))
        else:
            img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            img.paste(z, ((w - z.size[0]) // 2, int((h - z.size[1]) * 0.42)))
        img.putalpha(img.getchannel("A").point(lambda v: int(v * ease_out(tin))))
    big = Canvas()
    if t >= LOOP:
        f = ease_io(prog(t, LOOP, DUR - LOOP - 0.03))
        img.putalpha(img.getchannel("A").point(lambda v: int(v * (1 - f))))
        first = Canvas()
        scene_a(first, 0.0)
        big.paste(first, f)
    big.img.alpha_composite(img)
    header(big)
    if t < LOOP:
        draw_caption(big, t, CAPS, HIGHLIGHT, y=1350, size=88)
    frame = BG.copy()
    frame.alpha_composite(big.final())
    return frame.convert("RGB").tobytes()


def crack():
    n = int(0.25 * SR)
    tt = np.arange(n) / SR
    x = smooth(noise(n, 11), 3) * np.exp(-tt / 0.006) * 1.6
    x += np.sin(2 * np.pi * 620 * tt) * np.exp(-tt / 0.018) * 0.8
    x += np.sin(2 * np.pi * 150 * tt) * np.exp(-tt / 0.05) * 0.9
    return x.astype(np.float32)


def build_audio():
    n = int(DUR * SR)
    bed = np.zeros(n + SR, np.float32)
    add(bed, music_bed(DUR, bpm=96), 0, 1.0)
    add(bed, crack(), T_HOOKPOP, 1.0)
    for st in SCENES[1:]:
        add(bed, whoosh(), st - 0.18, 0.55)
    add(bed, tick(), s[2] + 0.8, 0.4)
    for k in range(8):
        add(bed, tick(), s[3] + 0.5 + k * 0.16, 0.18)
    add(bed, riser(1.3), T_POP - 1.3, 0.5)
    add(bed, crack(), T_POP, 1.2)
    add(bed, hit(), T_POP, 0.7)
    add(bed, crack(), s[6] + 0.25, 0.8)
    for k in range(10):
        add(bed, tick(), T_RESET + k * (e[7] - T_RESET - 0.4) / 10, 0.22)
    add(bed, whoosh(0.25, 9), T_STRIKE - 0.05, 0.6)
    add(bed, hit(), s[10] + 0.1, 0.9)
    return bed[:n]


if __name__ == "__main__":
    vw, bw = os.path.join(WORK, "voice.wav"), os.path.join(WORK, "bed.wav")
    write_wav(vw, voice[: int(DUR * vsr)], vsr)
    write_wav(bw, build_audio() * 0.8, SR)
    print(f"duration {DUR:.2f}s, {NF} frames")
    for (a, b), l in zip(SENT, LINES):
        print(f"  {a:6.2f}-{b:6.2f}  {l[1]}")
    if COVER:
        cv = Canvas()
        joint(cv, 0, 170, 0, 1, 1, 0)
        burst(cv, (540, 440), 165, 1.0)
        cv.text((540, 1120), "WHY KNUCKLES CRACK", "black", 88, WHITE)
        header(cv)
        fr = BG.copy()
        fr.alpha_composite(cv.final())
        fr.convert("RGB").save(COVER)
    with Pool(4) as pool:
        encode(pool.imap(render, range(NF), chunksize=2), NF, vw, bw, OUT)
    print("wrote", OUT)
