"""Runtime art derivatives: shipped WebP copies of the heavy PNGs, sized for how the game shows them.

The source PNGs under assets/ stay untouched (they are the art masters). This script writes
assets/runtime-opt/<sha1>-<name>.webp plus manifest.json keyed by the source PNG's sha1.
At build time scripts/lib/vite-runtime-art.mjs swaps any emitted PNG whose bytes match a
manifest entry for its WebP. A changed master no longer matches and simply ships as the PNG
until this script is run again.

  npm run build && python scripts/optimize-runtime-art.py   # derivatives for the PNGs the build ships
  python scripts/optimize-runtime-art.py --check    # list masters over MIN_BYTES with no derivative

Needs Pillow with WebP (the Codex runtime's python has it). Not needed by CI.
"""
import glob, hashlib, json, os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'runtime-opt')
MIN_BYTES = 150_000

# (pattern on the posix path under assets/, rule). First match wins.
#   keep=True     -> same pixel size (sprite sheets / atlases slice frames by ratio; Pixi keyposes)
#   long=N        -> fit the long edge to N px (2x the largest size the game draws it at)
#   lossless=True -> exact pixels (pixel-art frames)
RULES = [
    (r'^pitcher-sd-v\d/.*-atlas\.png$',            dict(keep=True, lossless=True)),
    (r'^pitcher-pixellab-v\d/atlases/.*-atlas\.png$', dict(keep=True, lossless=True)),  # PixelLab pitch atlases
    (r'^sprites-v4/.*-60\.png$',                    dict(keep=True, lossless=True)),
    (r'^ui-kit/.*master-sheet\.png$',               dict(keep=True, lossless=True)),
    (r'^production-art/battle-polish-v16/.*\.png$', dict(keep=True, q=90)),
    (r'^production-art/battle-portrait-v15/batter-sheet\.png$', dict(long=2048, q=88)),  # 4x2 cells -> 512x768; hero box ~310px tall
    (r'^production-art/battle-portrait-v15/batter-sheet-runtime\.png$', dict(keep=True, q=88)),  # already 512x768 cells (#103 M09)
    (r'^production-art/phone-assets-v18/A0[1-3].*\.png$', dict(long=1024, q=84)),  # home-run cut-in card <=400px wide
    (r'^production-art/phone-assets-v18/.*\.png$',  dict(long=1200, q=84)),  # title / ending heroes: <=560px tall
    (r'^production-art/red-rush-knockout-layers-v17/.*\.png$', dict(long=1024, q=84)),  # knockout cut-in card
    (r'^cards-v15/deck-dex-backdrop\.png$',         dict(keep=True, q=80)),
    (r'^cards-v15/.*\.png$',                        dict(long=768, q=82)),   # hand/reward/deck cards: <=180px wide on screen
    (r'^production-art/mockup-world-v15/dex-.*\.png$', dict(long=800, q=84)),  # portrait dialog, map preview, reward
    (r'^production-art/mockup-world-v15/map-node-.*\.png$', dict(long=256, q=85)),  # ~60px nodes
    (r'^production-art/mockup-world-v15/frame-reward-.*\.png$', dict(long=512, q=90)),  # card-size frame overlay
    (r'^production-art/mockup-world-v15/.*\.png$',  dict(keep=True, q=80)),  # full-screen keyart / map plate
    (r'^pitcher-study-v2/source/.*-release\.png$', dict(long=800, q=84)),  # pitcher portrait cutouts
    (r'^pitcher-mobs-v1/.*\.png$',                  dict(long=720, q=85)),   # transparent roster cutouts
    (r'^duel/stadium.*\.png$',                      dict(keep=True, q=80)),  # full-screen stadium plates
]


def rule_for(rel):
    for pat, rule in RULES:
        if re.search(pat, rel):
            return rule
    return None


def sha1(path):
    with open(path, 'rb') as f:
        return hashlib.sha1(f.read()).hexdigest()


def shipped():
    """sha1s of the PNGs the build ships: PNGs still in dist/assets, plus masters already in the
    manifest (the last build shipped those as WebP) whose bytes have not changed since"""
    files = glob.glob(os.path.join(ROOT, 'dist', 'assets', '*.png'))
    if not files:
        sys.exit('run npm run build first: derivatives are made only for PNGs the build ships')
    ships = {sha1(p) for p in files}
    try:
        with open(os.path.join(OUT, 'manifest.json'), encoding='utf-8') as f:
            for h, m in json.load(f).items():
                src = os.path.join(ROOT, 'assets', m['src'])
                if os.path.exists(src) and sha1(src) == h:
                    ships.add(h)
    except FileNotFoundError:
        pass
    return ships


def build(check=False):
    os.makedirs(OUT, exist_ok=True)
    ships = shipped()
    manifest = {}
    missing = []
    for path in sorted(glob.glob(os.path.join(ROOT, 'assets', '**', '*.png'), recursive=True)):
        rel = os.path.relpath(path, os.path.join(ROOT, 'assets')).replace(os.sep, '/')
        if rel.startswith('runtime-opt/') or os.path.getsize(path) < MIN_BYTES:
            continue
        rule = rule_for(rel)
        if not rule:
            continue
        h = sha1(path)
        if h not in ships:
            continue
        name = f"{h[:12]}-{os.path.splitext(os.path.basename(rel))[0]}.webp"
        dest = os.path.join(OUT, name)
        if check:
            if not os.path.exists(dest):
                missing.append(rel)
            continue
        im = Image.open(path)
        im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB')
        if not rule.get('keep') and max(im.size) > rule['long']:
            s = rule['long'] / max(im.size)
            im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        if rule.get('lossless'):
            im.save(dest, 'WEBP', lossless=True, method=6)
        else:
            im.save(dest, 'WEBP', quality=rule['q'], method=6, alpha_quality=95)
        if os.path.getsize(dest) > 0.9 * os.path.getsize(path):
            os.remove(dest)  # no real saving (already tight PNG): ship the master
            continue
        manifest.setdefault(h, {'file': name, 'src': rel, 'size': list(im.size)})
    if check:
        print('\n'.join(missing) or 'all rule matches have derivatives')
        return 1 if missing else 0
    live = {m['file'] for m in manifest.values()}
    for old in glob.glob(os.path.join(OUT, '*.webp')):
        if os.path.basename(old) not in live:
            os.remove(old)
    with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(dict(sorted(manifest.items(), key=lambda kv: kv[1]['src'])), f, indent=1, ensure_ascii=False)
        f.write('\n')
    return 0


if __name__ == '__main__':
    sys.exit(build(check='--check' in sys.argv))
