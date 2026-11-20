#!/usr/bin/env python3
"""Media pipeline for every branch of the compendium.

Reads src/branches/<branch>/branch.json and entries.json, downloads each image
referenced by a "from" URL, converts it to WebP for its role, writes it to
public/media/<branch>/..., and records "src", "w" and "h" back into the JSON.

    python3 tools/media.py            # process new or missing media
    python3 tools/media.py --force    # rebuild every file from the download cache
    python3 tools/media.py mounts     # limit to one branch

Roles
    portrait   square, 480 px. Optional "crop": [cx, cy, size] as fractions of the
               source (centre x, centre y, side relative to the short edge).
               Optional "matte": true composites a transparent in-game icon onto ink.
    any role   optional "clip": [x0, y0, x1, y1] as fractions, applied first; optional "frame": n picks
               frame n of an animated source (a GIF's first frame is often a title or an empty shot).
    hero       wide, max 1920 px.
    capture    location reference (map / on-site), max 1600 px; maps keep detail.
    gallery    extra stills, max 1280 px; "matte" supported.
    cover      leaf or category cover band, max 1600 px.
"""
import hashlib, json, os, subprocess, sys
from io import BytesIO
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def write_json(path, data):
    """Write JSON atomically (temp file, then rename), so a build or lint reading it never sees a half-written file."""
    tmp = f"{path}.tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)
CACHE = os.path.join(ROOT, "tools", ".cache")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36"
INK = (21, 17, 15)
SPEC = {
    "portrait": dict(max=480, q=84),
    "hero": dict(max=1920, q=80),
    "capture": dict(max=1600, q=84),
    "gallery": dict(max=1280, q=82),
    "cover": dict(max=1600, q=78),
}
REFERER = {"fextralifeimages": "https://crimsondesertgame.wiki.fextralife.com/", "game8": "https://game8.co/",
           "gamerantimages": "https://gamerant.com/", "crimsondesert.gg": "https://crimsondesert.gg/"}


def fetch(url):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, hashlib.sha1(url.encode()).hexdigest()[:20])
    if not os.path.exists(path) or os.path.getsize(path) < 1000:
        ref = next((r for k, r in REFERER.items() if k in url), "")
        cmd = ["curl", "-sfL", "-m", "60", "-A", UA, "-o", path, url] + (["-e", ref] if ref else [])
        if subprocess.run(cmd).returncode != 0:
            raise RuntimeError(f"download failed: {url}")
    return Image.open(path)


def matte(im):
    """Composite a transparent in-game icon onto an ink field with a soft radial lift."""
    im = im.convert("RGBA")
    side = max(im.size)
    bg = Image.new("RGBA", (side, side), INK + (255,))
    glow = Image.new("L", (side, side), 0)
    ImageDraw.Draw(glow).ellipse((side * .12, side * .12, side * .88, side * .88), fill=70)
    glow = glow.filter(ImageFilter.GaussianBlur(side * .14))
    bg.paste(Image.new("RGBA", (side, side), (120, 96, 80, 255)), mask=glow)
    bg.alpha_composite(im, ((side - im.width) // 2, (side - im.height) // 2))
    return bg.convert("RGB")


def square(im, crop):
    w, h = im.size
    if crop:
        cx, cy, size = crop
        s = int(min(w, h) * size)
        x = int(min(max(cx * w - s / 2, 0), w - s)); y = int(min(max(cy * h - s / 2, 0), h - s))
        return im.crop((x, y, x + s, y + s))
    s = min(w, h)
    return im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s))


def render(item, role, out_rel, force):
    out_abs = os.path.join(ROOT, "public", out_rel)
    if not force and os.path.exists(out_abs) and item.get("src") == out_rel and item.get("w"):
        return False
    im = fetch(item["from"])
    if item.get("frame"):
        im.seek(item["frame"])
    im.load()
    if item.get("clip"):  # [x0, y0, x1, y1] fractions of the source — cut away title cards or HUD first
        x0, y0, x1, y1 = item["clip"]
        im = im.crop((round(x0 * im.width), round(y0 * im.height), round(x1 * im.width), round(y1 * im.height)))
    if item.get("matte"):
        im = matte(im)
    elif im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA"); bg = Image.new("RGBA", im.size, INK + (255,)); bg.alpha_composite(im); im = bg
    im = im.convert("RGB")
    if role == "portrait":
        im = square(im, item.get("crop"))
    spec = SPEC[role]
    if im.width > spec["max"] or (role == "portrait" and im.width != spec["max"] and im.width > spec["max"] * 0.66):
        ratio = spec["max"] / im.width
        im = im.resize((spec["max"], round(im.height * ratio)), Image.LANCZOS)
    os.makedirs(os.path.dirname(out_abs), exist_ok=True)
    buf = BytesIO(); im.save(buf, "WEBP", quality=spec["q"], method=6); open(out_abs, "wb").write(buf.getvalue())
    item["src"], item["w"], item["h"] = out_rel, im.width, im.height
    return True


def process_branch(branch_dir, force):
    bid = os.path.basename(branch_dir)
    made = 0
    entries_path = os.path.join(branch_dir, "entries.json")
    branch_path = os.path.join(branch_dir, "branch.json")
    entries = json.load(open(entries_path))
    for e in entries:
        if "media" not in e:  # a plate with a `base` shows its source plate's media
            continue
        base = f"media/{bid}/{e['id']}"
        m = e["media"]
        if m.get("portrait", {}).get("from"): made += render(m["portrait"], "portrait", f"{base}/portrait.webp", force)
        if m.get("hero", {}).get("from"): made += render(m["hero"], "hero", f"{base}/hero.webp", force)
        for i, c in enumerate(m.get("captures", [])): made += render(c, "capture", f"{base}/{c['kind']}-{i + 1}.webp", force)
        for i, g in enumerate(m.get("gallery", [])): made += render(g, "gallery", f"{base}/gallery-{i + 1}.webp", force)
    write_json(entries_path, entries)
    if os.path.exists(branch_path):
        branch = json.load(open(branch_path))
        for leaf in branch["leaves"]:
            cov = leaf.get("cover", {})
            if cov.get("from"): made += render(cov, "cover", f"media/{bid}/_leaves/{leaf['id']}.webp", force)
        for cat in branch.get("categories", []):
            cov = cat.get("cover", {})
            if cov.get("from"): made += render(cov, "cover", f"media/{bid}/_categories/{cat['id']}.webp", force)
        write_json(branch_path, branch)
    return made


if __name__ == "__main__":
    force = "--force" in sys.argv
    only = [a for a in sys.argv[1:] if not a.startswith("--")]
    root = os.path.join(ROOT, "src", "branches")
    for name in sorted(os.listdir(root)):
        d = os.path.join(root, name)
        if os.path.isdir(d) and os.path.exists(os.path.join(d, "entries.json")) and (not only or name in only):
            print(f"{name}: {process_branch(d, force)} file(s) written")
