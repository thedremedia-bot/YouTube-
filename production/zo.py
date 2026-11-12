"""Zoomed Out shared production kit: brand, drawing helpers, voice, audio, encoding."""
import math, os, re, subprocess, wave
from functools import lru_cache
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS = 1080, 1920, 30
S = 2  # supersampling factor for drawing

SPACE = (11, 16, 38)
ORBIT = (27, 37, 80)
YELLOW = (255, 214, 10)
CYAN = (34, 211, 238)
CORAL = (255, 90, 95)
WHITE = (248, 250, 252)
MUTED = (148, 163, 200)

FONT_DIR = "/usr/share/fonts/opentype/inter/"
FONTS = {
    "black": "InterDisplay-Black.otf",
    "xbold": "InterDisplay-ExtraBold.otf",
    "bold": "InterDisplay-Bold.otf",
    "medium": "InterDisplay-Medium.otf",
}


@lru_cache(maxsize=None)
def font(weight, size):
    return ImageFont.truetype(FONT_DIR + FONTS[weight], int(round(size)))


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def prog(t, start, dur):
    return clamp((t - start) / dur) if dur > 0 else float(t >= start)


def ease_out(x):
    return 1 - (1 - clamp(x)) ** 3


def ease_io(x):
    x = clamp(x)
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def ease_back(x):
    x = clamp(x)
    c1, c3 = 1.70158, 2.70158
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2


def lerp(a, b, x):
    return a + (b - a) * x


def rgba(c, a=1.0):
    return (c[0], c[1], c[2], int(255 * clamp(a)))


class Canvas:
    """Transparent drawing layer in logical 1080x1920 coordinates, supersampled."""

    def __init__(self, w=W, h=H, s=S):
        self.s, self.w, self.h = s, w, h
        self.img = Image.new("RGBA", (w * s, h * s), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.img)

    def text(self, xy, txt, weight="xbold", size=60, fill=WHITE, a=1.0, anchor="mm",
             stroke=0, stroke_fill=SPACE):
        s = self.s
        self.d.text((xy[0] * s, xy[1] * s), txt, font=font(weight, size * s), fill=rgba(fill, a),
                    anchor=anchor, stroke_width=int(stroke * s), stroke_fill=rgba(stroke_fill, a))

    def text_w(self, txt, weight, size):
        return font(weight, size * self.s).getlength(txt) / self.s

    def rect(self, box, fill=None, a=1.0, radius=0, outline=None, width=0):
        s = self.s
        b = [v * s for v in box]
        if b[2] <= b[0] or b[3] <= b[1]:
            return
        self.d.rounded_rectangle(b, radius=radius * s, fill=rgba(fill, a) if fill else None,
                                 outline=rgba(outline, a) if outline else None, width=int(width * s))

    def circle(self, c, r, fill=None, a=1.0, outline=None, width=0):
        s = self.s
        self.d.ellipse([(c[0] - r) * s, (c[1] - r) * s, (c[0] + r) * s, (c[1] + r) * s],
                       fill=rgba(fill, a) if fill else None,
                       outline=rgba(outline, a) if outline else None, width=int(width * s))

    def ellipse(self, box, fill, a=1.0):
        self.d.ellipse([v * self.s for v in box], fill=rgba(fill, a))

    def line(self, pts, fill, width=4, a=1.0):
        s = self.s
        self.d.line([(x * s, y * s) for x, y in pts], fill=rgba(fill, a), width=int(width * s), joint="curve")

    def poly(self, pts, fill, a=1.0):
        self.d.polygon([(x * self.s, y * self.s) for x, y in pts], fill=rgba(fill, a))

    def paste(self, other, alpha=1.0):
        im = other.img
        if alpha < 1:
            im = im.copy()
            im.putalpha(im.getchannel("A").point(lambda v: int(v * alpha)))
        self.img.alpha_composite(im)

    def final(self):
        return self.img.resize((self.w, self.h), Image.LANCZOS)


def rings(c, center, r, a=1.0, dot=True):
    """Brand mark: three concentric rings closing on an off-centre yellow dot."""
    cx, cy = center
    for i, (k, col, off) in enumerate([(1.0, WHITE, 0.0), (0.66, CYAN, 0.10), (0.36, WHITE, 0.18)]):
        rr = r * k
        c.circle((cx + r * off, cy - r * off), rr, outline=col, width=max(1.5, r * 0.075), a=a)
    if dot:
        c.circle((cx + r * 0.25, cy - r * 0.25), r * 0.13, fill=YELLOW, a=a)


def background(w=W, h=H, seed=7, stars=220):
    """Deep-space gradient with a soft glow and sparse stars (final resolution, RGB)."""
    y = np.linspace(0, 1, h)[:, None]
    x = np.linspace(0, 1, w)[None, :]
    base = np.zeros((h, w, 3), np.float32)
    for i in range(3):
        base[..., i] = lerp(ORBIT[i] * 0.75, SPACE[i] * 0.8, y) + 0 * x
    glow = np.exp(-(((x - 0.5) / 0.55) ** 2 + ((y - 0.38) / 0.33) ** 2))
    for i, g in enumerate((30, 44, 110)):
        base[..., i] += glow * g * 0.55
    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(img, "RGBA")
    rng = np.random.default_rng(seed)
    for _ in range(stars):
        sx, sy = rng.uniform(0, w), rng.uniform(0, h)
        r = rng.choice([1, 1, 1.5, 2, 2.5])
        d.ellipse([sx - r, sy - r, sx + r, sy + r], fill=(235, 240, 255, int(rng.uniform(40, 170))))
    return img


# ---------------------------------------------------------------- voice
def split_chunks(sentence, max_words=3):
    """Caption chunks: up to max_words words, broken at punctuation."""
    words = sentence.split()
    chunks, cur = [], []
    for wd in words:
        cur.append(wd)
        if len(cur) >= max_words or re.search(r"[,.?!…:;]$", wd):
            chunks.append(cur)
            cur = []
    if cur:
        chunks.append(cur)
    return chunks


def trim(x, sr, thr=0.012, pad=0.03):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return x
    a = max(0, idx[0] - int(pad * sr))
    b = min(len(x), idx[-1] + int(pad * sr))
    return x[a:b]


def synth_voice(lines, model_dir, voice="af_heart", speed=1.05, lead=0.25):
    """lines: list of (spoken_text, caption_text, gap_after). Returns voice array, sr,
    sentence timings [(start, end)], and caption chunks [(start, end, [words])]."""
    from kokoro_onnx import Kokoro
    k = Kokoro(os.path.join(model_dir, "kokoro-v1.0.onnx"), os.path.join(model_dir, "voices-v1.0.bin"))
    sr = 24000
    parts, sent, caps = [np.zeros(int(lead * sr), np.float32)], [], []
    t = lead
    for spoken, caption, gap in lines:
        x, sr = k.create(spoken, voice=voice, speed=speed, lang="en-us")
        x = trim(np.asarray(x, np.float32), sr)
        dur = len(x) / sr
        sent.append((t, t + dur))
        chunks = split_chunks(caption)
        weights = [sum(len(w) + 1 + (3 if re.search(r"[,.?!…]$", w) else 0) for w in ch) for ch in chunks]
        tot, acc = sum(weights), 0
        for ch, wt in zip(chunks, weights):
            caps.append((t + dur * acc / tot, t + dur * (acc + wt) / tot, ch))
            acc += wt
        parts += [x, np.zeros(int(gap * sr), np.float32)]
        t += dur + gap
    v = np.concatenate(parts)
    return v / max(1e-6, np.abs(v).max()) * 0.9, sr, sent, caps


def draw_caption(c, t, caps, highlight, y=1330, size=92):
    for a, b, words in caps:
        if a <= t < b + 0.06:
            p = ease_back(prog(t, a, 0.12))
            sz = size * lerp(0.8, 1.0, p)
            txt = " ".join(words).upper()
            while c.text_w(txt, "black", sz) > 980:
                sz *= 0.95
            total = c.text_w(txt, "black", sz)
            x = W / 2 - total / 2
            space = c.text_w(" ", "black", sz)
            for wd in words:
                up = wd.upper()
                key = re.sub(r"[^a-z]", "", wd.lower())
                col = YELLOW if key in highlight else WHITE
                c.text((x, y), up, "black", sz, col, anchor="lm", stroke=7, stroke_fill=(5, 8, 22))
                x += c.text_w(up, "black", sz) + space
            return


# ---------------------------------------------------------------- audio
SR = 48000


def _env(n, attack, decay_tau):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / decay_tau)


def add(track, sound, at, gain=1.0):
    i = int(at * SR)
    if i >= len(track) or i < 0:
        return
    n = min(len(sound), len(track) - i)
    track[i:i + n] += sound[:n] * gain


def note(freq, dur, tau=0.25, attack=0.004, harm=(1, 0.35, 0.12)):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = sum(h * np.sin(2 * np.pi * freq * (i + 1) * t) for i, h in enumerate(harm))
    return (x * _env(n, attack, tau)).astype(np.float32)


def pad(freqs, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for f in freqs:
        for det in (-0.35, 0.3):
            x += np.sin(2 * np.pi * (f + det) * t) + 0.25 * np.sin(2 * np.pi * 2 * (f + det) * t)
    e = np.minimum(1, t / 0.5) * np.minimum(1, (dur - t) / 0.6)
    return (x * e / (len(freqs) * 2)).astype(np.float32)


def kick():
    n = int(0.28 * SR)
    t = np.arange(n) / SR
    f = 46 + 70 * np.exp(-t / 0.03)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.09)).astype(np.float32)


def noise(n, seed=0):
    return np.random.default_rng(seed).standard_normal(n).astype(np.float32)


def smooth(x, k):
    return np.convolve(x, np.ones(k) / k, mode="same").astype(np.float32)


def whoosh(dur=0.45, seed=1):
    n = int(dur * SR)
    t = np.arange(n) / n
    x = smooth(noise(n, seed), 24) - smooth(noise(n, seed), 240)
    return (x * np.sin(np.pi * t) ** 2 * 2.2).astype(np.float32)


def hit():
    n = int(0.6 * SR)
    t = np.arange(n) / SR
    low = np.sin(2 * np.pi * np.cumsum(40 + 60 * np.exp(-t / 0.05)) / SR) * np.exp(-t / 0.16)
    click = smooth(noise(n, 3), 6) * np.exp(-t / 0.012) * 0.5
    shimmer = np.sin(2 * np.pi * 1320 * t) * np.exp(-t / 0.2) * 0.12
    return (low + click + shimmer).astype(np.float32)


def riser(dur=1.0):
    n = int(dur * SR)
    t = np.arange(n) / n
    f = 220 * 2 ** (t * 1.6)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.35
    nz = (smooth(noise(n, 5), 12) - smooth(noise(n, 5), 120)) * 1.2
    return ((tone + nz) * t ** 2).astype(np.float32)


def tick():
    n = int(0.06 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.008)).astype(np.float32)


def music_bed(dur, bpm=100, seed=0):
    """Original synth bed: Am - F - C - G, pad + plucked arpeggio + soft kick."""
    n = int(dur * SR) + SR
    tr = np.zeros(n, np.float32)
    beat = 60 / bpm
    bar = 4 * beat
    A = 110.0
    st = lambda k: A * 2 ** (k / 12)
    chords = [(0, 3, 7), (-4, 0, 3), (3, 7, 10), (-2, 2, 5)]  # Am, F, C, G (semitones from A)
    t, i = 0.0, 0
    while t < dur:
        ch = chords[i % 4]
        add(tr, pad([st(k) for k in ch] + [st(ch[0] - 12)], 2 * bar + 0.5), t, 0.30)
        pattern = [0, 1, 2, 1, 0, 2, 1, 2]
        for b in range(16):
            tt = t + b * beat / 2
            if tt >= dur:
                break
            k = ch[pattern[b % 8]] + 12 + (12 if b % 8 == 5 else 0)
            add(tr, note(st(k), 0.5, tau=0.16), tt, 0.11)
            if b % 2 == 0:
                add(tr, kick(), tt, 0.38 if b % 4 == 0 else 0.2)
            else:
                add(tr, smooth(noise(int(0.03 * SR), b), 2) * np.exp(-np.arange(int(0.03 * SR)) / 300), tt, 0.035)
        t += 2 * bar
        i += 1
    fade = int(0.8 * SR)
    m = tr[: int(dur * SR)]
    m[:fade // 4] *= np.linspace(0, 1, fade // 4)
    m[-fade:] *= np.linspace(1, 0, fade)
    return m


def write_wav(path, x, sr):
    x = np.clip(x, -1, 1)
    with wave.open(path, "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sr)
        f.writeframes((x * 32767).astype(np.int16).tobytes())


# ---------------------------------------------------------------- encode
def encode(frame_iter, n_frames, voice_wav, bed_wav, out_path, music_gain=0.30):
    cmd = ["ffmpeg", "-y", "-loglevel", "error",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-i", voice_wav, "-i", bed_wav,
           "-filter_complex",
           f"[1:a]aresample=48000,volume=1.0[v];[2:a]volume={music_gain}[m];"
           "[v][m]amix=inputs=2:duration=longest:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]",
           "-map", "0:v", "-map", "[a]",
           "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart",
           "-t", f"{n_frames / FPS:.3f}", out_path]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for fr in frame_iter:
        p.stdin.write(fr)
    p.stdin.close()
    if p.wait() != 0:
        raise RuntimeError("ffmpeg failed")
