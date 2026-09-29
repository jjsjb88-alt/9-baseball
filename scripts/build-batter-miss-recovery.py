"""Place the authored miss-recovery pose in V15's unused eighth sheet cell."""
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "assets" / "production-art" / "battle-portrait-v15"
SOURCE = ART / "batter-miss-recovery.png"
BASELINE = 1527
CELL = (1024, 1536)


def main():
    pose = Image.open(SOURCE).convert("RGBA")
    if pose.size != CELL:
        raise ValueError(f"Expected {CELL}, got {pose.size}")
    alpha = pose.getchannel("A")
    opaque = alpha.point(lambda value: 255 if value > 128 else 0).getbbox()
    if not opaque:
        raise ValueError("Miss pose has no visible actor")
    shift = BASELINE - opaque[3]
    if shift < 0 or opaque[1] + shift < 0:
        raise ValueError("Miss pose cannot fit the shared baseline")
    aligned = Image.new("RGBA", CELL)
    aligned.paste(pose, (0, shift))

    for name, scale in (("batter-sheet.png", 1), ("batter-sheet-runtime.png", 2)):
        path = ART / name
        sheet = Image.open(path).convert("RGBA")
        expected = (4 * CELL[0] // scale, 2 * CELL[1] // scale)
        if sheet.size != expected:
            raise ValueError(f"Expected {name} to be {expected}, got {sheet.size}")
        cell = aligned if scale == 1 else aligned.resize((512, 768), Image.Resampling.LANCZOS)
        sheet.paste(cell, (3 * cell.width, cell.height))
        sheet.save(path, optimize=True)
    print(f"Aligned miss-recovery feet at {BASELINE}px; source shift {shift}px")


if __name__ == "__main__":
    main()
