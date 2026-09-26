#!/usr/bin/env python3
"""Stage the currently approved/reviewed 10-pose batter sequence for sprite-gen import.

This script does not generate or alter art. It copies the existing 9ZONE V1/V3
PNG anchors into sprite-gen's documented --pngs-dir import layout so the first
pipeline comparison can use the exact current assets as its baseline.
"""

from argparse import ArgumentParser
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[2]

POSES = [
    ("01-ready.png", ROOT / "assets/batter-reboot-v1/batter-ready.png"),
    ("02-load.png", ROOT / "assets/batter-reboot-v3/batter-load.png"),
    ("03-trigger.png", ROOT / "assets/batter-reboot-v1/batter-trigger.png"),
    ("04-swing-start.png", ROOT / "assets/batter-reboot-v3/batter-swing-start.png"),
    ("05-swing-mid.png", ROOT / "assets/batter-reboot-v3/batter-swing-mid.png"),
    ("06-contact.png", ROOT / "assets/batter-reboot-v1/batter-contact.png"),
    ("07-follow-early.png", ROOT / "assets/batter-reboot-v3/batter-follow-through-early.png"),
    ("08-follow-late.png", ROOT / "assets/batter-reboot-v3/batter-follow-through-late.png"),
    ("09-finish.png", ROOT / "assets/batter-reboot-v1/batter-finish.png"),
    ("10-settle.png", ROOT / "assets/batter-reboot-v3/batter-settle.png"),
]


def copy_file(source: Path, target: Path) -> None:
    if not source.is_file():
        raise FileNotFoundError(f"missing source asset: {source}")
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)


def main() -> int:
    parser = ArgumentParser()
    parser.add_argument(
        "--out",
        required=True,
        type=Path,
        help="staging directory passed later to sprite-gen unpack-atlas --pngs-dir",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="replace an existing staging directory",
    )
    args = parser.parse_args()

    out = args.out.resolve()
    if out.exists():
        if not args.force:
            raise FileExistsError(f"{out} already exists; pass --force to replace it")
        shutil.rmtree(out)

    swing = out / "swing"
    refs = swing / "_refs"
    base = out / "_base"

    for name, source in POSES:
        copy_file(source, swing / name)

    ready = ROOT / "assets/batter-reboot-v1/batter-ready.png"
    contact = ROOT / "assets/batter-reboot-v1/batter-contact.png"
    copy_file(ready, base / "batter-golden-master.png")
    copy_file(ready, refs / "anchor-ready.png")
    copy_file(contact, refs / "anchor-contact.png")

    print(f"staged {len(POSES)} batter poses at {out}")
    print(f"next: sprite-gen unpack-atlas --pngs-dir {out} --out-dir <run-dir>")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
