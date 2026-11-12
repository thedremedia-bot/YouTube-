"""Renders the Zoomed Out brand assets (profile picture, banner, watermark)."""
import os, sys
from PIL import Image
from zo import *

out = sys.argv[1] if len(sys.argv) > 1 else "brand"
os.makedirs(out, exist_ok=True)

# Profile picture 1080x1080 (kept inside the circular crop)
bg = background(1080, 1080, seed=3, stars=90)
c = Canvas(1080, 1080)
rings(c, (510, 570), 330)
img = bg.convert("RGBA")
img.alpha_composite(c.final())
img.convert("RGB").save(f"{out}/zoomed-out_profile-picture_1080.png")
img.convert("RGB").resize((800, 800), Image.LANCZOS).save(f"{out}/zoomed-out_profile-picture_800.png")

# YouTube banner 2560x1440, text inside the 1546x423 centre safe area
bg = background(2560, 1440, seed=11, stars=420)
c = Canvas(2560, 1440)
for r, a in [(1500, 0.07), (1150, 0.10), (820, 0.14), (520, 0.20)]:
    c.circle((330, 720), r, outline=WHITE, width=5, a=a)
cx, cy = 1280, 720
rings(c, (cx - 560, cy), 150)
c.text((cx - 360, cy - 52), "ZOOMED OUT", "black", 158, WHITE, anchor="lm")
c.text((cx - 352, cy + 92), "BIG NUMBERS, MADE VISIBLE.", "bold", 62, YELLOW, anchor="lm")
c.text((cx - 352, cy + 168), "New videos every day", "medium", 44, MUTED, anchor="lm")
img = bg.convert("RGBA")
img.alpha_composite(c.final())
img.convert("RGB").save(f"{out}/zoomed-out_youtube-banner_2560x1440.png")

# Transparent watermark 300x300
c = Canvas(300, 300)
rings(c, (140, 160), 110)
c.final().save(f"{out}/zoomed-out_watermark_300.png")
print("brand assets written to", out)
