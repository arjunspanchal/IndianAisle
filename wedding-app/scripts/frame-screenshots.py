"""Frames raw app captures as App Store screenshots (1290 x 2796, the 6.9-inch iPhone size).

    python3 scripts/frame-screenshots.py <folder with raw-*.png>

Each one: paper background, a short headline in the wedding's type, and the
screen itself inside a thin gold line. Output goes to store/screenshots/ios-6.9/.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
RAW = Path(sys.argv[1])
OUT = ROOT / "store/screenshots/ios-6.9"
W, H = 1290, 2796
PAPER, INK, ROSE, OLIVE, GOLD = "#FCFAF5", "#424D35", "#AA4E6D", "#889B60", "#B89451"

F = ROOT / "node_modules/@expo-google-fonts"
display = lambda s: ImageFont.truetype(str(F / "cormorant-garamond/500Medium/CormorantGaramond_500Medium.ttf"), s)
italic = lambda s: ImageFont.truetype(str(F / "cormorant-garamond/500Medium_Italic/CormorantGaramond_500Medium_Italic.ttf"), s)
label = lambda s: ImageFont.truetype(str(F / "dm-sans/500Medium/DMSans_500Medium.ttf"), s)

# (raw file, eyebrow, headline, rose italic line)
SHOTS = [
    ("today", "Kashika & Arjun · 17–19 January 2027", "Everything in one place.", "From hello to goodbye."),
    ("programme", "The programme", "Three days,", "hour by hour."),
    ("camera", "The wedding camera", "27 photos a day.", "No peeking till morning."),
    ("chat", "Guest chat", "Say hello", "before you arrive."),
    ("info", "Good to know", "Less wondering.", "More celebrating."),
]

SCREEN_W = 1000
SCREEN_TOP = 620
RADIUS = 64


def centred(d, y, text, font, fill, tracking=0):
    if tracking:
        widths = [d.textlength(c, font=font) for c in text]
        x = (W - (sum(widths) + tracking * (len(text) - 1))) / 2
        for c, w in zip(text, widths):
            d.text((x, y), c, font=font, fill=fill)
            x += w + tracking
    else:
        d.text(((W - d.textlength(text, font=font)) / 2, y), text, font=font, fill=fill)


for i, (name, eyebrow, head, accent) in enumerate(SHOTS, 1):
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)
    centred(d, 170, eyebrow.upper(), label(30), OLIVE, tracking=7)
    centred(d, 248, head, display(124), INK)
    centred(d, 388, accent, italic(112), ROSE)

    raw = Image.open(RAW / f"raw-{name}.png").convert("RGB")
    screen_h = round(SCREEN_W * raw.height / raw.width)
    screen = raw.resize((SCREEN_W, screen_h), Image.LANCZOS)
    x = (W - SCREEN_W) // 2
    # The screen runs off the bottom edge, like a phone held just out of frame.
    mask = Image.new("L", (SCREEN_W, screen_h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, SCREEN_W - 1, screen_h + RADIUS * 2], radius=RADIUS, fill=255)
    img.paste(screen, (x, SCREEN_TOP), mask)
    d.rounded_rectangle([x - 14, SCREEN_TOP - 14, x + SCREEN_W + 13, H + RADIUS * 2], radius=RADIUS + 14, outline=GOLD, width=4)

    out = OUT / f"{i:02d}-{name}.png"
    img.save(out, optimize=True)
    print(out.name, img.size)
