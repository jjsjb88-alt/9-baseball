"""Package the remaining original pitcher pose sheets as 120-frame SD atlases.

The two transparent 3x2 source sheets per pitcher contain twelve authored
silhouettes. Figures are extracted as connected alpha components so a stride
that crosses a nominal sheet cell boundary is not amputated. This script adds
subtle crisp whole-body motion between held poses; it does not invent new limb
drawings. Run from any directory with a Pillow + NumPy Python installation.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ASSET = ROOT / "assets" / "pitcher-sd-v2"
SOURCE = ASSET / "source"
SIZE = 256
FPS = 60
FRAMES = 120
COLS = 10
ROWS = 12
SCALE = 4
ALPHA_CUTOFF = 45

# Pose anchors are spaced to put the ball release at frame 79 (1.32 seconds),
# matching the game's existing pitcher impact cue. key=primary pose,
# bridges=additional in-between pose. The final eight frames reset to set.
TIMELINE = [
    ("keys", 0, "set", 9),
    ("bridges", 0, "hands-rise", 8),
    ("keys", 1, "coil", 9),
    ("bridges", 1, "deeper-coil", 8),
    ("keys", 2, "leg-lift", 9),
    ("bridges", 2, "knee-lower", 8),
    ("keys", 3, "stride", 9),
    ("bridges", 3, "foot-plant", 8),
    ("bridges", 4, "arm-whip", 11),
    ("keys", 4, "release", 6),
    ("keys", 5, "follow-through", 17),
    ("bridges", 5, "recovery", 10),
    ("keys", 0, "reset", 8),
]
assert sum(item[3] for item in TIMELINE) == FRAMES

# These authored windup poses look right before the leftward release. Mirror
# only the affected silhouettes, preserving the remaining pose art and timing.
FACING_CORRECTIONS = {
    "elite-01-cobalt-impact": {"keys": (0, 1, 2, 3), "bridges": (0, 1, 2, 3)},
    "elite-02-neon-trick": {"keys": (0, 1, 2), "bridges": (0, 1)},
}


def connected_silhouettes(sheet: Image.Image) -> list[Image.Image]:
    """Find the six large characters on a transparent sheet, across cells."""
    alpha = np.asarray(sheet.getchannel("A").resize(
        (sheet.width // SCALE, sheet.height // SCALE), Image.Resampling.BOX
    ))
    occupied = alpha > ALPHA_CUTOFF
    height, width = occupied.shape
    seen = np.zeros((height, width), dtype=np.bool_)
    components: list[tuple[int, list[tuple[int, int]], float, float]] = []
    for y in range(height):
        for x in range(width):
            if seen[y, x] or not occupied[y, x]:
                continue
            seen[y, x] = True
            todo = [(x, y)]
            pixels: list[tuple[int, int]] = []
            sum_x = sum_y = 0
            while todo:
                px, py = todo.pop()
                pixels.append((px, py))
                sum_x += px
                sum_y += py
                for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1),
                               (px, py + 1), (px - 1, py - 1), (px + 1, py + 1),
                               (px - 1, py + 1), (px + 1, py - 1)):
                    if 0 <= nx < width and 0 <= ny < height and occupied[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        todo.append((nx, ny))
            if len(pixels) >= 500:
                components.append((len(pixels), pixels, sum_x / len(pixels), sum_y / len(pixels)))

    # Amber Sinker's two stride shoes touch at the lower row's nominal cell
    # boundary. Separate that connected region at the sheet column seam.
    if len(components) == 5:
        merged = max(components, key=lambda item: max(p[0] for p in item[1]) - min(p[0] for p in item[1]))
        xs = [p[0] for p in merged[1]]
        cut = round(((min(xs) + max(xs)) / 2) / (512 / SCALE)) * (512 // SCALE)
        halves = [[p for p in merged[1] if p[0] < cut], [p for p in merged[1] if p[0] >= cut]]
        if min(map(len, halves)) < 1500:
            raise ValueError("Touching poses cannot be separated at the sheet seam")
        components.remove(merged)
        for points in halves:
            components.append((len(points), points,
                               sum(p[0] for p in points) / len(points),
                               sum(p[1] for p in points) / len(points)))
    components.sort(key=lambda item: item[0], reverse=True)
    if len(components) < 6:
        raise ValueError(f"Expected six complete silhouettes; found {len(components)}")
    figures = components[:6]
    if figures[-1][0] < 1500:
        raise ValueError(f"A silhouette is unexpectedly small ({figures[-1][0]} pixels)")
    figures.sort(key=lambda item: (int(item[3] >= height / 2), item[2]))

    poses = []
    for _, pixels, _, _ in figures:
        coarse = np.zeros((height, width), dtype=np.uint8)
        for px, py in pixels:
            coarse[py, px] = 255
        mask = Image.fromarray(coarse, "L").resize(sheet.size, Image.Resampling.NEAREST)
        mask = mask.filter(ImageFilter.MaxFilter(9))
        pose = sheet.copy()
        pose.putalpha(ImageChops.multiply(sheet.getchannel("A"), mask))
        bounds = pose.getchannel("A").getbbox()
        if not bounds:
            raise ValueError("Empty silhouette after extraction")
        poses.append(pose.crop(bounds))
    return poses


def fitted_poses(character: str) -> list[Image.Image]:
    sheets = {}
    for kind in ("keys", "bridges"):
        filename = SOURCE / f"{character}-{kind}.png"
        sheet = Image.open(filename).convert("RGBA")
        if sheet.size != (1536, 1024):
            raise ValueError(f"{filename}: expected 1536x1024, got {sheet.size}")
        sheets[kind] = connected_silhouettes(sheet)
        for pose_index in FACING_CORRECTIONS.get(character, {}).get(kind, ()):
            sheets[kind][pose_index] = ImageOps.mirror(sheets[kind][pose_index])

    # A single scale is used for all poses of a character. The bent stride
    # therefore looks shorter than the upright windup, with no size popping.
    largest = max(max(pose.size) for poses in sheets.values() for pose in poses)
    scale = 228 / largest
    result = []
    for kind in ("keys", "bridges"):
        for pose in sheets[kind]:
            width = max(1, round(pose.width * scale))
            height = max(1, round(pose.height * scale))
            scaled = pose.resize((width, height), Image.Resampling.NEAREST)
            canvas = Image.new("RGBA", (SIZE, SIZE))
            canvas.alpha_composite(scaled, ((SIZE - width) // 2, SIZE - height - 8))
            result.append(canvas)
    return result


def motion(frame: int, local: int, dwell: int) -> tuple[float, int, int]:
    if frame < 42:
        t = frame / 42
        dx = -2 * t
        dy = -2 * math.sin(math.pi * t)
        angle = 0.7 * math.sin(math.pi * t)
    elif frame < 79:
        t = (frame - 42) / 37
        dx = -2 - 5 * t
        dy = -math.sin(math.pi * t)
        angle = 0.7 - 1.5 * t
    elif frame < 112:
        t = (frame - 79) / 33
        dx = -7 + 4 * t
        dy = math.sin(math.pi * t)
        angle = -0.8 + 0.55 * t
    else:
        t = (frame - 112) / 8
        dx = -3 + 3 * t
        dy = 0
        angle = -0.25 + 0.25 * t
    micro = (local - (dwell - 1) / 2) * 0.24
    return angle + micro, round(dx), round(dy)


def render(base: Image.Image, frame: int, local: int, dwell: int, hashes: set[str]) -> Image.Image:
    angle, dx, dy = motion(frame, local, dwell)
    for retry in range(24):
        rendered = base.rotate(angle + retry * 0.17, resample=Image.Resampling.NEAREST,
                               center=(SIZE // 2, SIZE - 10), translate=(dx, dy))
        digest = hashlib.sha256(rendered.tobytes()).hexdigest()
        if digest not in hashes:
            hashes.add(digest)
            return rendered
    raise RuntimeError(f"Frame {frame} could not be made unique")


def build(character: str, loose_frames: bool = False) -> None:
    poses = fitted_poses(character)
    atlas = Image.new("RGBA", (COLS * SIZE, ROWS * SIZE))
    pose_preview = Image.new("RGBA", (6 * SIZE, 2 * SIZE))
    for i, pose in enumerate(poses):
        pose_preview.alpha_composite(pose, ((i % 6) * SIZE, (i // 6) * SIZE))
    preview_dir = ASSET / "previews"
    atlas_dir = ASSET / "atlases"
    preview_dir.mkdir(parents=True, exist_ok=True)
    atlas_dir.mkdir(parents=True, exist_ok=True)
    pose_preview.save(preview_dir / f"{character}-poses.png", optimize=True)

    frame_dir = ASSET / "frames" / character
    if loose_frames:
        frame_dir.mkdir(parents=True, exist_ok=True)
    markers = []
    samples = []
    hashes: set[str] = set()
    frame = 0
    for kind, pose_index, label, dwell in TIMELINE:
        markers.append({"frame": frame, "pose": label, "source": kind, "cell": pose_index})
        base = poses[pose_index + (0 if kind == "keys" else 6)]
        for local in range(dwell):
            current = render(base, frame, local, dwell, hashes)
            if loose_frames:
                current.save(frame_dir / f"{character}-pitch-{frame:03d}.png", optimize=True)
            atlas.alpha_composite(current, ((frame % COLS) * SIZE, (frame // COLS) * SIZE))
            if frame % 2 == 0:
                samples.append(current.resize((128, 128), Image.Resampling.NEAREST))
            frame += 1
    if frame != FRAMES or len(hashes) != FRAMES:
        raise AssertionError(f"Expected {FRAMES} unique frames, got {frame}/{len(hashes)}")

    atlas_name = f"{character}-pitch-120-atlas.png"
    atlas.save(atlas_dir / atlas_name, optimize=True)
    samples[0].save(preview_dir / f"{character}-pitch.gif", save_all=True,
                    append_images=samples[1:], duration=33, loop=0, disposal=2,
                    transparency=0, optimize=False)
    manifest = {
        "id": f"{character}-pitch-v2", "character": character,
        "facing": "screen-left", "throws": "screen-left",
        "frameCount": FRAMES, "uniqueFrameCount": len(hashes),
        "fps": FPS, "durationMs": 2000, "releaseFrame": 79,
        "frameSize": [SIZE, SIZE], "atlas": f"atlases/{atlas_name}",
        "atlasColumns": COLS, "atlasRows": ROWS,
        "authoredPoseCount": len(poses), "keyPoses": markers,
        "facingCorrections": [
            f"{kind}:{index}"
            for kind, indices in FACING_CORRECTIONS.get(character, {}).items()
            for index in indices
        ],
    }
    (ASSET / f"{character}-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{character}: {FRAMES} unique frames, {len(poses)} authored poses, {atlas.size} atlas")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("characters", nargs="*", help="roster IDs; defaults to all except Red Rush")
    parser.add_argument("--loose-frames", action="store_true", help="also save 120 PNGs per pitcher")
    args = parser.parse_args()
    roster = json.loads((ROOT / "assets" / "pitcher-mobs-v1" / "roster.json").read_text(encoding="utf-8"))
    remaining = [entry["id"] for entry in roster if entry["id"] != "regular-01-red-rush"]
    characters = args.characters or remaining
    if any(character not in remaining for character in characters):
        parser.error("Every character must be one of the eleven remaining pitcher IDs")
    for character in characters:
        build(character, args.loose_frames)


if __name__ == "__main__":
    main()

