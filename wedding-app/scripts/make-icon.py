"""Draws the iOS app icon (assets/icon.png) for KA Wedding.

    python3 scripts/make-icon.py

iOS rounds the corners of the square itself, so the artwork is built for that
shape: an olive band that follows the rounded edge, the paper card inside it
with the gold hairline, and the K & A monogram centred with room to spare.
Nothing may sit near a corner and the letters must stay inside the gold line.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "node_modules/@expo-google-fonts/cormorant-garamond"
SIZE, SS = 1024, 4  # final size, supersampling factor
S = SIZE * SS

OLIVE, PAPER, INK, ROSE, GOLD = "#889B60", "#FCFAF5", "#424D35", "#AA4E6D", "#B89451"

IOS_RADIUS = 0.2237 * SIZE  # the home-screen corner radius, as a share of the icon
BAND = 58                   # olive band width
GOLD_INSET = 26             # gap from the paper edge to the gold line
MONOGRAM_WIDTH = 730        # ink width of "K & A"; the gold line's inner width is 856


def px(v: float) -> int:
    return round(v * SS)


def glyph(char: str, font_file: str, size: float, fill: str) -> Image.Image:
    """One letter on a transparent layer, cropped to its ink, plus its baseline offset."""
    font = ImageFont.truetype(str(FONTS / font_file), px(size))
    l, t, r, b = font.getbbox(char, anchor="ls")  # relative to the baseline
    layer = Image.new("RGBA", (r - l + 8, b - t + 8), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text((4 - l, 4 - t), char, font=font, fill=fill, anchor="ls")
    layer.info["above"] = -t + 4  # pixels from the layer's top down to the baseline
    return layer


def build() -> Image.Image:
    img = Image.new("RGB", (S, S), OLIVE)
    d = ImageDraw.Draw(img)

    # Paper card, its corners concentric with the icon's own rounded corners.
    d.rounded_rectangle([px(BAND), px(BAND), S - px(BAND), S - px(BAND)], radius=px(IOS_RADIUS - BAND), fill=PAPER)
    g = BAND + GOLD_INSET
    d.rounded_rectangle([px(g), px(g), S - px(g), S - px(g)], radius=px(IOS_RADIUS - g), outline=GOLD, width=px(4))

    # Monogram: K and A in ink, a smaller italic ampersand in rose between them.
    # Largest letters that still leave a comfortable gap either side of the ampersand.
    cap = 420.0
    while True:
        parts = [
            glyph("K", "600SemiBold/CormorantGaramond_600SemiBold.ttf", cap, INK),
            glyph("&", "500Medium_Italic/CormorantGaramond_500Medium_Italic.ttf", cap * 0.74, ROSE),
            glyph("A", "600SemiBold/CormorantGaramond_600SemiBold.ttf", cap, INK),
        ]
        ink = sum(p.width - 8 for p in parts)
        gap = (px(MONOGRAM_WIDTH) - ink) / 2
        if gap >= px(cap * 0.14):
            break
        cap -= 4

    cap_height = parts[0].info["above"] - 4
    baseline = S / 2 + cap_height / 2          # capitals centred top to bottom
    x = (S - px(MONOGRAM_WIDTH)) / 2
    for p in parts:
        img.paste(p, (round(x) - 4, round(baseline - p.info["above"])), p)
        x += p.width - 8 + gap

    return img.resize((SIZE, SIZE), Image.LANCZOS)


if __name__ == "__main__":
    out = ROOT / "assets/icon.png"
    build().save(out, optimize=True)
    print(f"wrote {out}")
