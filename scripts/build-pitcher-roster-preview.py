"""Create a compact contact sheet from the finished 120-frame atlases."""
from pathlib import Path
import json

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSET = ROOT / "assets" / "pitcher-sd-v2"
ROSTER = json.loads((ROOT / "assets" / "pitcher-mobs-v1" / "roster.json").read_text(encoding="utf-8"))
PITCHERS = [entry for entry in ROSTER if entry["id"] != "regular-01-red-rush"]
WIDTH, HEIGHT = 1438, 1634
BG = (7, 13, 27, 255)
CARD = (22, 32, 52, 255)
PALETTE = {"battle": (223, 174, 114), "elite": (148, 150, 220), "boss": (232, 133, 119)}
font = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 24)
bold = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 34)
small = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 14)

out = Image.new("RGBA", (WIDTH, HEIGHT), BG)
draw = ImageDraw.Draw(out)
draw.text((27, 24), "9ZONE HOMEBOUND", fill=(230, 182, 119), font=small)
draw.text((27, 47), "투수 SD 로스터 · 11명", fill=(246, 247, 255), font=bold)
draw.text((27, 96), "SET → RELEASE  |  캐릭터별 120프레임 · 화면 왼쪽 투구", fill=(158, 173, 202), font=small)

for index, entry in enumerate(PITCHERS):
    col, row = index % 3, index // 3
    x, y = 26 + col * 468, 139 + row * 356
    accent = PALETTE[entry["tier"]]
    draw.rounded_rectangle((x, y, x + 449, y + 334), radius=18, fill=CARD, outline=accent, width=2)
    draw.rectangle((x + 17, y + 18, x + 21, y + 49), fill=accent)
    draw.text((x + 34, y + 18), entry["name"], fill=(246, 247, 255), font=font)
    draw.text((x + 34, y + 49), entry["id"], fill=(143, 158, 186), font=small)
    atlas = Image.open(ASSET / "atlases" / f"{entry['id']}-pitch-120-atlas.png").convert("RGBA")
    for slot, (frame, label) in enumerate(((0, "SET"), (79, "RELEASE"))):
        crop = atlas.crop(((frame % 10) * 256, (frame // 10) * 256,
                           (frame % 10 + 1) * 256, (frame // 10 + 1) * 256))
        crop = crop.resize((210, 210), Image.Resampling.NEAREST)
        px = x + 10 + slot * 222
        out.alpha_composite(crop, (px, y + 78))
        draw.text((px + 12, y + 295), label, fill=accent, font=small)

draw.text((27, 1585), "원본 자세 12개 × 11명  |  256 × 256  |  60fps · 2초  |  RED RUSH 제외", fill=(143, 158, 186), font=small)
out.save(ASSET / "roster-preview.png", optimize=True)
print(ASSET / "roster-preview.png")
