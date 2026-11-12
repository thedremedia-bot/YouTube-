"""ZO-001 · Scale Check · A Million vs a Billion Seconds.
usage: python3 v001_million_vs_billion.py <model_dir> <work_dir> <out.mp4> [cover.png]"""
import os, sys
from multiprocessing import Pool
import numpy as np
from PIL import Image
from zo import *

MODEL, WORK, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
COVER = sys.argv[4] if len(sys.argv) > 4 else None
os.makedirs(WORK, exist_ok=True)

# (spoken text, caption text, pause after)
LINES = [
    ("A million seconds ago was less than two weeks ago.", "A million seconds ago was less than two weeks ago.", 0.18),
    ("A billion seconds ago?", "A billion seconds ago?", 0.40),
    ("You might not have been born.", "You might not have been born.", 0.30),
    ("One million seconds is about eleven and a half days.", "One million seconds is about eleven and a half days.", 0.20),
    ("One billion seconds is almost thirty-two years.", "One billion seconds is almost thirty-two years.", 0.25),
    ("Same word ending, completely different planet.", "Same word ending, completely different planet.", 0.30),
    ("And a trillion seconds?", "And a trillion seconds?", 0.35),
    ("That takes you back nearly thirty-two thousand years, to when mammoths were still walking around.",
     "That takes you back nearly thirty-two thousand years, to when mammoths were still walking around.", 0.35),
    ("So next time someone says, million, billion, whatever,", "So next time someone says \"million, billion, whatever\"…", 0.30),
    ("it's not whatever.", "It's not whatever.", 0.0),
]
HIGHLIGHT = {"million", "billion", "trillion", "eleven", "half", "days", "thirtytwo", "years",
             "thousand", "mammoths", "whatever", "born", "weeks"}

voice, vsr, SENT, CAPS = synth_voice(LINES, MODEL)
DUR = SENT[-1][1] + 1.5
NF = int(DUR * FPS)
voice = np.concatenate([voice, np.zeros(max(0, int(DUR * vsr) - len(voice)), np.float32)])

s = [a for a, b in SENT]
e = [b for a, b in SENT]
SCENES = [0.0, s[1] - 0.12, s[3] - 0.12, s[6] - 0.12, s[8] - 0.12]  # A B C D E
LOOP = DUR - 0.35

CAL_START, CAL_END = s[0] + 0.7, e[0] - 0.15
T_YEARS = e[2] - 0.15            # "31.7 years ago" lands
T_BIL_BAR = s[4] + 0.25          # billion bar starts growing
T_X1000 = s[5] + 0.2
T_MAMMOTH = s[7] + (e[7] - s[7]) * 0.52
T_W = [s[8] + (e[8] - s[8]) * f for f in (0.50, 0.68, 0.84)]
T_STRIKE = s[9] + 0.25

BG = background().convert("RGBA")


def header(c):
    rings(c, (112, 262), 40)
    c.text((172, 262), "ZOOMED OUT", "black", 38, WHITE, anchor="lm")
    w = c.text_w("SCALE CHECK", "black", 32) + 56
    c.rect((1080 - 70 - w, 232, 1080 - 70, 292), fill=YELLOW, radius=30)
    c.text((1080 - 70 - w / 2, 263), "SCALE CHECK", "black", 32, SPACE)


def pop(t, t0, d=0.3):
    return ease_back(prog(t, t0, d))


def big_number(c, t, t0, txt, y, size, sub, sub_y):
    p = pop(t, t0, 0.28)
    c.text((540, y), txt, "black", size * lerp(0.7, 1, p), YELLOW, a=prog(t, t0, 0.1))
    c.text((540, sub_y), sub, "xbold", 80, WHITE, a=prog(t, t0 + 0.08, 0.15))


def scene_a(c, t, t0=0.0):
    big_number(c, t, -1, "1,000,000", 480, 196, "SECONDS AGO", 622)
    cw, ch, gap, x0, y0 = 120, 112, 12, 84, 760
    today = 18
    back = 11.5 * ease_io(prog(t, CAL_START, CAL_END - CAL_START))
    for i in range(21):
        r, col = divmod(i, 7)
        x, y = x0 + col * (cw + gap), y0 + r * (ch + gap)
        ago = today - i
        c.rect((x, y, x + cw, y + ch), fill=(52, 68, 132), a=0.95 if ago >= 0 else 0.35, radius=18)
        if 0 < ago:
            f = clamp(back - (ago - 1))
            if f > 0:
                c.rect((x + cw * (1 - f), y, x + cw, y + ch), fill=YELLOW, a=0.92, radius=18)
                if f > 0.6:
                    c.text((x + cw / 2, y + ch / 2), str(ago), "black", 50, SPACE)
        if ago == 0:
            c.rect((x, y, x + cw, y + ch), fill=CYAN, radius=18)
            c.text((x + cw / 2, y + ch / 2), "NOW", "black", 36, SPACE)
    a = prog(t, CAL_END - 0.1, 0.2)
    if a > 0:
        c.text((540, 1190), "≈ 11½ DAYS AGO", "black", 84 * lerp(0.8, 1, pop(t, CAL_END - 0.1)), WHITE, a=a)


def scene_b(c, t):
    t0 = SCENES[1]
    big_number(c, t, t0 + 0.1, "1,000,000,000", 470, 148, "SECONDS AGO?", 596)
    a = prog(t, s[2] - 0.1, 0.25)
    if a > 0:
        c.text((540, 740), "THE YEAR WAS", "bold", 54, MUTED, a=a)
        yr = int(round(lerp(2026, 1995, ease_io(prog(t, s[2], T_YEARS - s[2] - 0.1)))))
        c.text((540, 910), str(yr), "black", 300, WHITE, a=a)
    a2 = prog(t, T_YEARS, 0.12)
    if a2 > 0:
        p = pop(t, T_YEARS)
        w = 660 * lerp(0.8, 1, p)
        c.rect((540 - w / 2, 1090, 540 + w / 2, 1210), fill=CYAN, radius=60, a=a2)
        c.text((540, 1150), "31.7 YEARS AGO", "black", 70 * lerp(0.8, 1, p), SPACE, a=a2)


def scene_c(c, t):
    x0, full = 90, 900
    a1 = prog(t, SCENES[2], 0.15)
    c.text((x0, 470), "1 MILLION SECONDS", "bold", 54, MUTED, anchor="lm", a=a1)
    c.text((x0, 565), "11.5 DAYS", "black", 112, WHITE, anchor="lm", a=prog(t, s[3] + 0.9, 0.2))
    grow = ease_out(prog(t, s[3] + 0.4, 0.9))
    shrink = ease_io(prog(t, T_BIL_BAR, 1.3))
    w1 = lerp(lerp(0, 340, grow), 3, shrink)
    c.rect((x0, 650, x0 + full, 702), fill=ORBIT, radius=10, a=0.8 * a1)
    c.rect((x0, 650, x0 + max(w1, 3), 702), fill=YELLOW, radius=min(10, w1 / 2), a=a1)

    a2 = prog(t, s[4], 0.2)
    if a2 > 0:
        c.text((x0, 880), "1 BILLION SECONDS", "bold", 54, MUTED, anchor="lm", a=a2)
        c.text((x0, 975), "31.7 YEARS", "black", 112, YELLOW, anchor="lm", a=prog(t, s[4] + 0.9, 0.2))
        c.rect((x0, 1060, x0 + full, 1112), fill=ORBIT, radius=10, a=0.8 * a2)
        c.rect((x0, 1060, x0 + max(3, full * shrink), 1112), fill=YELLOW, radius=10, a=a2)
    a3 = prog(t, T_X1000, 0.15)
    if a3 > 0:
        p = pop(t, T_X1000)
        c.poly([(x0 + 2, 716), (x0 - 16, 748), (x0 + 20, 748)], CYAN, a=a3)
        c.text((x0 - 16, 780), "the million bar, to scale", "bold", 40, CYAN, anchor="lm", a=a3)
        c.text((540, 1205), "1,000× LONGER", "black", 104 * lerp(0.75, 1, p), CYAN, a=a3)


def mammoth(c, cx, base, k, a):
    fur, dark = (186, 128, 78), (140, 94, 58)
    P = lambda x, y: (cx + x * k, base + y * k)
    E = lambda x0, y0, x1, y1, col: c.ellipse((*P(x0, y0), *P(x1, y1)), col, a)
    for lx in (-125, 20):
        c.rect((*P(lx + 22, -90), *P(lx + 62, 0)), fill=dark, radius=10 * k, a=a)
    E(-160, -195, 95, -50, fur)
    E(-10, -240, 135, -85, fur)
    E(80, -222, 182, -100, fur)
    for lx in (-135, 55):
        c.rect((*P(lx, -90), *P(lx + 44, 0)), fill=fur, radius=12 * k, a=a)
    c.line([P(158, -150), P(184, -100), P(186, -52), P(204, -22)], fur, width=30 * k, a=a)
    c.circle(P(204, -22), 15 * k, fill=fur, a=a)
    c.line([P(-156, -135), P(-178, -92)], dark, width=9 * k, a=a)
    c.line([P(150, -128), P(178, -84), P(216, -70), P(250, -92), P(258, -124)], WHITE, width=12 * k, a=a)
    c.circle(P(140, -172), 7 * k, fill=SPACE, a=a)


def scene_d(c, t):
    t0 = SCENES[3]
    big_number(c, t, t0 + 0.1, "1,000,000,000,000", 460, 108, "SECONDS AGO?", 570)
    a = prog(t, s[7] - 0.05, 0.2)
    if a <= 0:
        return
    cnt = int(round(31700 * ease_io(prog(t, s[7] + 0.1, T_MAMMOTH - s[7] - 0.1)) / 100) * 100)
    c.text((540, 760), f"{cnt:,}", "black", 210, WHITE, a=a)
    c.text((540, 890), "YEARS AGO", "xbold", 64, MUTED, a=a)
    xr, xl, y = 980, 100, 1170
    d = ease_io(prog(t, s[7] + 0.1, T_MAMMOTH - s[7] - 0.1))
    xe = lerp(xr, xl, d)
    c.line([(xe, y), (xr, y)], MUTED, width=6, a=a)
    for i in range(1, 32):
        xt = xr - (xr - xl) * i / 31.7
        if xt >= xe:
            c.line([(xt, y - (16 if i % 10 == 0 else 8)), (xt, y + (16 if i % 10 == 0 else 8))], MUTED, width=3, a=a * 0.8)
    c.circle((xr, y), 16, fill=CYAN, a=a)
    c.text((xr, y + 48), "NOW", "black", 36, CYAN, anchor="rm", a=a)
    c.circle((xe, y), 12, fill=YELLOW, a=a)
    am = prog(t, T_MAMMOTH, 0.3)
    if am > 0:
        k = 0.82 * lerp(0.7, 1, pop(t, T_MAMMOTH, 0.35))
        mammoth(c, 250, y - 14, k, am)
        c.text((xl, y + 48), "31,700 YEARS AGO", "black", 36, YELLOW, anchor="lm", a=am)


def scene_e(c, t):
    ys = [470, 700, 930]
    words = ["MILLION", "BILLION", "WHATEVER"]
    swap = ease_io(prog(t, T_STRIKE + 0.45, 0.3))
    for i, (wd, y) in enumerate(zip(words, ys)):
        a = prog(t, T_W[i], 0.1)
        if a <= 0:
            continue
        p = pop(t, T_W[i], 0.25)
        if i < 2:
            c.text((540, y), wd, "black", 160 * lerp(0.75, 1, p), WHITE, a=a)
        else:
            c.text((540, y), wd, "black", 150 * lerp(0.75, 1, p), MUTED, a=a * (1 - swap))
            k = ease_out(prog(t, T_STRIKE, 0.22))
            if k > 0 and swap < 1:
                half = c.text_w(wd, "black", 150) / 2 + 24
                c.line([(540 - half, y + 4), (540 - half + 2 * half * k, y + 4)], CORAL, width=18, a=1 - swap)
            if swap > 0:
                c.text((540, y), "TRILLION", "black", 160 * lerp(0.8, 1, swap), YELLOW, a=swap)
    for j, y in enumerate((585, 815)):
        tb = T_STRIKE + 0.55 + j * 0.15
        a = prog(t, tb, 0.12)
        if a > 0:
            p = pop(t, tb, 0.25)
            w = 250 * lerp(0.7, 1, p)
            c.rect((540 - w / 2, y - 36, 540 + w / 2, y + 36), fill=CYAN, radius=36, a=a)
            c.text((540, y), "× 1,000", "black", 46 * lerp(0.7, 1, p), SPACE, a=a)
    a = prog(t, T_STRIKE + 0.95, 0.25)
    if a > 0:
        c.text((540, 1100), "IT'S NOT WHATEVER.", "black", 76, WHITE, a=a)
        c.text((540, 1185), "Follow for a daily scale check", "bold", 44, MUTED, a=a)


FUNCS = [scene_a, scene_b, scene_c, scene_d, scene_e]


def layer(idx, t):
    c = Canvas()
    FUNCS[idx](c, t)
    return c.img


def render(i):
    t = i / FPS
    idx = max(k for k in range(5) if t >= SCENES[k])
    frame = BG.copy()
    big = Canvas()
    img = layer(idx, t)
    tin = prog(t, SCENES[idx], 0.22)
    if idx > 0 and tin < 1:
        sc = lerp(1.14, 1.0, ease_out(tin))
        w, h = img.size
        z = img.resize((int(w * sc), int(h * sc)), Image.BILINEAR)
        ox, oy = (z.size[0] - w) // 2, (z.size[1] - h) // 2
        img = z.crop((ox, oy, ox + w, oy + h))
        img.putalpha(img.getchannel("A").point(lambda v: int(v * ease_out(tin))))
    if t >= LOOP:  # hand back to the opening frame for a seamless loop
        f = ease_io(prog(t, LOOP, DUR - LOOP - 0.03))
        img.putalpha(img.getchannel("A").point(lambda v: int(v * (1 - f))))
        first = Canvas()
        scene_a(first, 0.0, t0=-1)
        big.paste(first, f)
    big.img.alpha_composite(img)
    header(big)
    if t < LOOP:
        draw_caption(big, t, CAPS, HIGHLIGHT)
    frame.alpha_composite(big.final())
    return frame.convert("RGB").tobytes()


def build_audio():
    n = int(DUR * SR)
    bed = np.zeros(n + SR, np.float32)
    add(bed, music_bed(DUR), 0, 1.0)
    for st in SCENES[1:]:
        add(bed, whoosh(), st - 0.18, 0.55)
    for k in range(11):
        add(bed, tick(), CAL_START + (CAL_END - CAL_START) * (k + 0.5) / 11.5, 0.30)
    add(bed, riser(1.0), T_YEARS - 1.0, 0.45)
    add(bed, hit(), T_YEARS, 1.0)
    add(bed, hit(), T_BIL_BAR + 1.3, 0.8)
    add(bed, hit(), T_X1000, 0.7)
    add(bed, riser(1.4), T_MAMMOTH - 1.4, 0.45)
    add(bed, hit(), T_MAMMOTH, 1.0)
    for tw in T_W:
        add(bed, tick(), tw, 0.45)
    add(bed, whoosh(0.25, 9), T_STRIKE - 0.05, 0.6)
    add(bed, hit(), T_STRIKE + 0.45, 0.9)
    return bed[:n]


if __name__ == "__main__":
    vw, bw = os.path.join(WORK, "voice.wav"), os.path.join(WORK, "bed.wav")
    write_wav(vw, voice[: int(DUR * vsr)], vsr)
    write_wav(bw, build_audio() * 0.8, SR)
    print(f"duration {DUR:.2f}s, {NF} frames")
    for (a, b), l in zip(SENT, LINES):
        print(f"  {a:6.2f}-{b:6.2f}  {l[1]}")
    if COVER:
        c = Canvas()
        scene_a(c, CAL_END + 0.5, t0=-1)
        header(c)
        fr = BG.copy()
        fr.alpha_composite(c.final())
        fr.convert("RGB").save(COVER)
    with Pool(4) as pool:
        encode(pool.imap(render, range(NF), chunksize=2), NF, vw, bw, OUT)
    print("wrote", OUT)
