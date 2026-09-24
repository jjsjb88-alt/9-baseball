"""Build the 120-frame left-facing Red Rush pitch from original SD pose sheets.

Requires Pillow. Run from the repository root. Source images remain untouched;
generated PNGs, atlas, GIF proof and manifest stay in assets/pitcher-sd-v1.
"""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSET = ROOT / "assets" / "pitcher-sd-v1"
SOURCE = ASSET / "source"
FRAME_DIR = ASSET / "frames"
SIZE = 256
FPS = 60
FRAME_COUNT = 120
COLS = 10
ROWS = 12

SHEETS = {
    "keys": "red-rush-keys.png",
    "inbetweens": "red-rush-inbetweens.png",
    "load": "red-rush-load.png",
    "stride": "red-rush-stride.png",
    "release": "red-rush-release.png",
    "follow": "red-rush-follow.png",
}

# Each entry selects an authored pose cell plus its 60-fps hold length.
# Poses are concentrated around hand separation, ball release and follow-through.
TIMELINE = [
    ("keys", 0, "set", 4),
    ("load", 0, "set-breathe", 4),
    ("load", 1, "glove-raise", 4),
    ("load", 2, "coil-early", 4),
    ("load", 3, "coil-late", 4),
    ("load", 4, "heel-rise", 4),
    ("load", 5, "knee-rise", 4),
    ("keys", 1, "coil", 3),
    ("inbetweens", 1, "ball-separate", 3),
    ("keys", 2, "leg-kick", 3),
    ("stride", 0, "balance", 3),
    ("stride", 1, "hand-break", 3),
    ("stride", 2, "glove-reach", 3),
    ("stride", 3, "stride-start", 3),
    ("stride", 4, "front-foot", 3),
    ("stride", 5, "plant", 3),
    ("keys", 3, "wide-stride", 3),
    ("inbetweens", 3, "arm-cock", 3),
    ("release", 0, "arm-back", 3),
    ("release", 1, "hip-turn", 3),
    ("release", 2, "elbow-lead", 3),
    ("release", 3, "whip", 3),
    ("release", 4, "fingertips", 3),
    ("release", 5, "ball-out", 3),
    ("keys", 4, "release", 2),
    ("inbetweens", 4, "post-release", 2),
    ("follow", 0, "decelerate", 4),
    ("follow", 1, "rear-leg-rise", 4),
    ("follow", 2, "fold", 4),
    ("follow", 3, "deep-follow", 4),
    ("follow", 4, "rise", 4),
    ("follow", 5, "recover", 4),
    ("follow", 5, "reset", 5),
    ("keys", 0, "set-again", 8),
]

assert sum(item[3] for item in TIMELINE) == FRAME_COUNT


def load_sheet(path: Path) -> Image.Image:
    sheet = Image.open(path).convert("RGBA")
    if sheet.height != 1024 or abs(sheet.width - 1536) > 1:
        raise ValueError(f"{path.name}: expected approximately 1536x1024, got {sheet.size}")
    if sheet.width != 1536:
        sheet = sheet.resize((1536, 1024), Image.Resampling.NEAREST)
    return sheet


def cell(sheet: Image.Image, index: int) -> Image.Image:
    x, y = index % 3, index // 3
    crop = sheet.crop((x * 512, y * 512, (x + 1) * 512, (y + 1) * 512))
    clean = remove_sheet_bleed(crop.resize((SIZE, SIZE), Image.Resampling.NEAREST))
    fitted = clean.resize((SIZE - 24, SIZE - 24), Image.Resampling.NEAREST)
    frame = Image.new("RGBA", (SIZE, SIZE))
    frame.alpha_composite(fitted, (12, 24))
    return frame


def remove_sheet_bleed(pose: Image.Image) -> Image.Image:
    """Remove detached neighbor-cell fragments along sheet boundaries."""
    alpha = pose.getchannel("A").load()
    seen = bytearray(SIZE * SIZE)
    components = []
    for y in range(SIZE):
        for x in range(SIZE):
            start = y * SIZE + x
            if seen[start] or alpha[x, y] <= 20:
                continue
            stack = [start]
            seen[start] = 1
            points = []
            edge = False
            while stack:
                point = stack.pop()
                py, px = divmod(point, SIZE)
                points.append(point)
                edge |= px == 0 or py == 0 or px == SIZE - 1 or py == SIZE - 1
                for oy in (-1, 0, 1):
                    for ox in (-1, 0, 1):
                        nx, ny = px + ox, py + oy
                        if 0 <= nx < SIZE and 0 <= ny < SIZE:
                            other = ny * SIZE + nx
                            if not seen[other] and alpha[nx, ny] > 20:
                                seen[other] = 1
                                stack.append(other)
            components.append((points, edge))
    if not components:
        return pose
    main = max(components, key=lambda item: len(item[0]))
    clean = pose.copy()
    pixels = clean.load()
    for points, edge in components:
        if not edge or points is main[0]:
            continue
        for point in points:
            y, x = divmod(point, SIZE)
            for ny in range(max(0, y - 1), min(SIZE, y + 2)):
                for nx in range(max(0, x - 1), min(SIZE, x + 2)):
                    if alpha[nx, ny] <= 20 or (nx == x and ny == y):
                        pixels[nx, ny] = (0, 0, 0, 0)
    return clean

def motion(frame: int, local: int, dwell: int) -> tuple[float, int, int]:
    """Small continuous whole-body motion, retaining every original hand-drawn silhouette."""
    p = frame / (FRAME_COUNT - 1)
    if frame < 39:  # load onto pivot foot and lift front knee
        dx = -2 * frame / 39
        dy = -2.4 * math.sin(math.pi * frame / 39)
        angle = 0.55 * math.sin(math.pi * frame / 39)
    elif frame < 80:  # stride and leftward delivery
        q = (frame - 39) / 41
        dx = -2 - 5 * q
        dy = -1.3 * math.sin(math.pi * q)
        angle = 0.7 - 1.65 * q
    elif frame < 109:  # body follows the ball
        q = (frame - 80) / 29
        dx = -7 + 3 * q
        dy = 0.8 * math.sin(math.pi * q)
        angle = -0.95 + 0.7 * q
    else:  # recover on the same mound point
        q = (frame - 109) / 10
        dx = -4 + 4 * q
        dy = 0
        angle = -0.25 + 0.25 * q
    # Within each authored pose the hair and shoulder silhouette advances at
    # every display refresh; a rotation around the planted-foot area keeps
    # pixels crisp and avoids distorted anatomy or translucent double bodies.
    micro = (local - (dwell - 1) / 2) * 0.22
    return angle + micro, round(dx), round(dy)


def animated_pose(base: Image.Image, frame: int, local: int, dwell: int, seen: set[str]) -> Image.Image:
    angle, dx, dy = motion(frame, local, dwell)
    for retry in range(20):
        rendered = base.rotate(angle + retry * 0.16, resample=Image.Resampling.NEAREST,
                               center=(SIZE // 2, SIZE - 12), translate=(dx, dy))
        digest = hashlib.sha256(rendered.tobytes()).hexdigest()
        if digest not in seen:
            seen.add(digest)
            return rendered
    raise RuntimeError(f"Could not make frame {frame} visually distinct")


def main() -> None:
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    sheets = {name: load_sheet(SOURCE / filename) for name, filename in SHEETS.items()}
    cache = {(name, index): cell(sheet, index) for name, sheet in sheets.items() for index in range(6)}
    atlas = Image.new("RGBA", (COLS * SIZE, ROWS * SIZE))
    samples = []
    frame_names = []
    pose_markers = []
    hashes: set[str] = set()
    frame = 0
    for sheet_name, pose_index, label, dwell in TIMELINE:
        pose_markers.append({"frame": frame, "pose": label, "sheet": sheet_name, "cell": pose_index})
        base = cache[(sheet_name, pose_index)]
        for local in range(dwell):
            rendered = animated_pose(base, frame, local, dwell, hashes)
            filename = f"red-rush-pitch-{frame:03d}.png"
            rendered.save(FRAME_DIR / filename, optimize=True)
            frame_names.append(filename)
            atlas.alpha_composite(rendered, ((frame % COLS) * SIZE, (frame // COLS) * SIZE))
            if frame % 2 == 0:
                samples.append(rendered.resize((128, 128), Image.Resampling.NEAREST))
            frame += 1
    assert frame == FRAME_COUNT
    atlas.save(ASSET / "red-rush-pitch-120-atlas.png", optimize=True)
    samples[0].save(ASSET / "red-rush-pitch-preview.gif", save_all=True,
                    append_images=samples[1:], duration=33, loop=0, disposal=2,
                    transparency=0, optimize=False)
    manifest = {
        "id": "red-rush-pitch-v1",
        "character": "regular-01-red-rush",
        "facing": "screen-left",
        "throws": "screen-left",
        "frameCount": FRAME_COUNT,
        "uniqueFrameCount": len(hashes),
        "fps": FPS,
        "durationMs": FRAME_COUNT * 1000 // FPS,
        "frameSize": [SIZE, SIZE],
        "atlas": "red-rush-pitch-120-atlas.png",
        "atlasColumns": COLS,
        "atlasRows": ROWS,
        "keyPoses": pose_markers,
        "frames": frame_names,
    }
    (ASSET / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
                                          encoding="utf-8")
    print(f"Built {frame} frames; {len(hashes)} visually unique; atlas {atlas.size}")


if __name__ == "__main__":
    main()
