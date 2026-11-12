"""ZO-003 · Zoom In · Why Brain Freeze Hurts (3D character version).
Composites rendered 3D frames with captions, labels, music and sound effects.
usage: python3 v003_brain_freeze_comp.py <render_dir> <out.mp4> [cover.png] [--stills dir]"""
import json, math, os, sys
from multiprocessing import Pool
import numpy as np
from PIL import Image
from zo import *

RD, OUT = sys.argv[1], sys.argv[2]
COVER = sys.argv[3] if len(sys.argv) > 3 and not sys.argv[3].startswith("--") else None
STILLS = sys.argv[sys.argv.index("--stills") + 1] if "--stills" in sys.argv else None
T = json.load(open(os.path.join(RD, "bf_time.json")))
META = json.load(open(os.path.join(RD, "bf_meta.json")))
SENT, CAPS, DUR = T["sent"], [(a, b, w) for a, b, w in T["caps"]], T["dur"]
s = [a for a, b in SENT]
e = [b for a, b in SENT]
RFPS = 15
NR = int(DUR * RFPS)
NF = NR * 2
LOOP = DUR - 0.35
CUTS = [0.0, s[1] - 0.1, s[2] - 0.1, s[4] - 0.1, s[6] - 0.1, s[7] - 0.1, s[8] - 0.1, DUR]
T_BITE = CUTS[1] * 0.56
T_WARM = s[7] + 1.8
HIGHLIGHT = {"ice", "cream", "cold", "roof", "tighten", "widen", "warm", "blood", "brain", "nerve",
             "pain", "forehead", "confused", "tongue", "warmth", "fades", "fast"}
GREEN = (52, 211, 153)
PINK = (255, 150, 170)


def header(c):
    c.rect((60, 214, 1020, 310), fill=SPACE, a=0.35, radius=48)
    rings(c, (112, 262), 36)
    c.text((166, 262), "ZOOMED OUT", "black", 36, WHITE, anchor="lm")
    w = c.text_w("ZOOM IN", "black", 30) + 52
    c.rect((1080 - 78 - w, 234, 1080 - 78, 290), fill=CYAN, radius=28)
    c.text((1080 - 78 - w / 2, 263), "ZOOM IN", "black", 30, SPACE)


def pill(c, pos, txt, col, a=1.0, to=None, size=44, fg=SPACE):
    if a <= 0:
        return
    w = c.text_w(txt, "black", size) + 56
    x, y = pos
    if to:
        c.line([(x, y), to], col, width=6, a=a)
        c.circle(to, 12, fill=col, a=a)
        c.circle(to, 20, outline=WHITE, width=4, a=a)
    c.rect((x - w / 2, y - 40, x + w / 2, y + 40), fill=col, radius=40, a=a)
    c.text((x, y), txt, "black", size, fg, a=a)


def ringpulse(c, p, col, t, n=3, r0=30, r1=150, speed=1.2, a=1.0):
    for k in range(n):
        q = (t * speed + k / n) % 1.0
        c.circle(p, lerp(r0, r1, q), outline=col, width=10 * (1 - q) + 2, a=a * (1 - q))


def pt(m, key):
    return (m[key][0] * W, m[key][1] * H)


def overlay(c, t, m):
    k = m["k"]
    if k == 0:
        p = ease_back(prog(t, 0.0, 0.3))
        c.text((540, 400), "BRAIN FREEZE", "black", 120 * lerp(0.8, 1, p), WHITE, stroke=10, stroke_fill=SPACE)
        a = prog(t, 0.5, 0.2)
        c.rect((330, 1190, 750, 1266), fill=CYAN, radius=38, a=a)
        c.text((540, 1228), "WHY IT HURTS", "black", 42, SPACE, a=a)
    elif k == 1:
        P = pt(m, "P")
        a = prog(t, s[1] + 0.3, 0.3)
        ringpulse(c, P, CYAN, t, a=a)
        pill(c, (760, P[1] - 330), "COLD", CYAN, a=prog(t, s[1] + 0.5, 0.2), to=(P[0] + 20, P[1] - 30), size=56)
    elif k == 2:
        pill(c, (300, 1130), "BLOOD VESSELS", CORAL, a=prog(t, s[2] + 0.2, 0.2), to=pt(m, "V"), fg=WHITE)
        pill(c, (800, 480), "BRAIN", PINK, a=prog(t, s[3] + 0.9, 0.2), to=pt(m, "B"))
        a = prog(t, s[2] + 0.9, 0.15) * (1 - prog(t, s[2] + 1.9, 0.15))
        if a > 0:
            c.text((540, 1230), "TIGHTEN", "black", 80, WHITE, a=a, stroke=8)
        a = prog(t, s[2] + 2.0, 0.15) * (1 - prog(t, s[3] + 0.3, 0.2))
        if a > 0:
            c.text((540, 1230), "THEN WIDEN", "black", 80 * lerp(0.8, 1, ease_back(prog(t, s[2] + 2.0, 0.25))), YELLOW, a=a, stroke=8)
    elif k == 3:
        pill(c, (800, 1130), "NERVE", YELLOW, a=prog(t, s[4] + 0.5, 0.2), to=pt(m, "N"))
        a = prog(t, s[5] + 1.2, 0.2)
        if a > 0:
            F = pt(m, "F")
            ringpulse(c, F, CORAL, t, r0=20, r1=110, a=a)
            pill(c, (300, F[1] - 170), "FOREHEAD", CORAL, a=a, to=F, fg=WHITE)
    elif k == 4:
        F = pt(m, "F")
        a = prog(t, CUTS[4] + 0.3, 0.3)
        ringpulse(c, F, CORAL, t, r0=40, r1=230, speed=1.6, a=a)
        p = ease_back(prog(t, s[6] + 1.6, 0.3))
        if t > s[6] + 1.6:
            w = 620 * lerp(0.8, 1, p)
            c.rect((540 - w / 2, 1130, 540 + w / 2, 1230), fill=CORAL, radius=50)
            c.text((540, 1180), "PAIN SHOWS UP HERE", "black", 46 * lerp(0.8, 1, p), WHITE)
    elif k == 5:
        P = pt(m, "P")
        a = prog(t, T_WARM, 0.25)
        if a > 0:
            ringpulse(c, P, GREEN, t, r0=30, r1=170, a=a)
        pill(c, (700, 1150), "PRESS TONGUE UP", GREEN, a=prog(t, s[7] + 0.8, 0.2), to=(P[0], P[1] + 40))
    else:
        Tp = pt(m, "T")
        t0 = s[8] + 1.0
        a = prog(t, t0, 0.12)
        if a > 0:
            p = ease_back(prog(t, t0, 0.3))
            cx, cy, r = 820, max(520, Tp[1] + 60), 100 * lerp(0.6, 1, p)
            c.circle((cx, cy), r, fill=GREEN, a=a)
            c.line([(cx - r * 0.45, cy + r * 0.02), (cx - r * 0.12, cy + r * 0.36), (cx + r * 0.48, cy - r * 0.34)], WHITE, width=r * 0.2, a=a)
            pill(c, (540, 1180), "PAIN FADES", GREEN, a=prog(t, t0 + 0.2, 0.2), size=56)


def base(ri):
    ri = min(ri, NR - 1)
    return Image.open(os.path.join(RD, "fr", "%04d.png" % ri)).convert("RGBA").resize((W, H), Image.LANCZOS)


def compose(i):
    t = i / FPS
    ri = min(i // 2, NR - 1)
    frame = base(ri)
    cv = Canvas()
    overlay(cv, t, META[str(ri)])
    header(cv)
    if t < LOOP:
        draw_caption(cv, t, CAPS, HIGHLIGHT, y=1400, size=88)
    frame.alpha_composite(cv.final())
    if t >= LOOP:
        f = ease_io(prog(t, LOOP, DUR - LOOP - 0.03))
        first = base(0)
        c0 = Canvas()
        overlay(c0, 0.6, META["0"])
        header(c0)
        first.alpha_composite(c0.final())
        frame = Image.blend(frame, first, f)
    return frame.convert("RGB")


def render(i):
    return compose(i).tobytes()


def crunch():
    n = int(0.22 * SR)
    tt = np.arange(n) / SR
    x = smooth(noise(n, 21), 4) * (np.exp(-tt / 0.02) + 0.6 * np.exp(-((tt - 0.09) / 0.02) ** 2))
    return (x * 1.5).astype(np.float32)


def chime(f=880, dur=0.9):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * m * tt) * np.exp(-tt / (0.35 / m)) / m for m in (1, 2, 3))
    return (x * 0.5).astype(np.float32)


def build_audio():
    n = int(DUR * SR)
    bed = np.zeros(n + SR, np.float32)
    add(bed, music_bed(DUR, bpm=98), 0, 1.0)
    add(bed, crunch(), T_BITE, 0.9)
    for st in CUTS[1:-1]:
        add(bed, whoosh(), st - 0.18, 0.5)
    for k, f in enumerate((1760, 2093, 2637)):
        add(bed, chime(f, 0.7), s[1] + 0.3 + k * 0.12, 0.25)
    add(bed, riser(0.9), s[2] + 1.1, 0.4)
    add(bed, hit(), s[2] + 2.0, 0.8)
    for k in range(5):
        add(bed, kick(), s[3] + 0.1 + k * 0.42, 0.7)
        add(bed, kick(), s[3] + 0.25 + k * 0.42, 0.45)
    for k in range(16):
        add(bed, tick(), s[4] + 0.6 + k * 0.2, 0.22)
    for k in range(8):
        add(bed, tick(), s[5] + 0.3 + k * 0.2, 0.22)
    add(bed, hit(), s[5] + 1.2, 0.7)
    add(bed, hit(), CUTS[4] + 0.25, 1.0)
    add(bed, chime(660), T_WARM, 0.5)
    add(bed, chime(880), s[8] + 1.0, 0.6)
    add(bed, chime(1320), s[8] + 1.12, 0.5)
    return bed[:n]


if __name__ == "__main__":
    if STILLS:
        os.makedirs(STILLS, exist_ok=True)
        for tt in [float(x) for x in sys.argv[sys.argv.index("--stills") + 2].split(",")]:
            compose(int(tt * FPS)).save(os.path.join(STILLS, "s%05.1f.png" % tt))
        sys.exit()
    bw = os.path.join(RD, "bf_bed.wav")
    write_wav(bw, build_audio() * 0.8, SR)
    if COVER:
        compose(int((CUTS[4] + 1.6) * FPS)).save(COVER)
    with Pool(4) as pool:
        encode(pool.imap(render, range(NF), chunksize=2), NF, os.path.join(RD, "bf_voice.wav"), bw, OUT)
    print("wrote", OUT, NF)
