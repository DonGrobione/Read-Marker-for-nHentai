"""Package the extension in src/ into dist/<name>-<version>.xpi.

Usage:  python build.py

The .xpi is a plain ZIP archive with manifest.json at its root. Python's
zipfile is used instead of PowerShell's Compress-Archive, because the latter
can write backslash paths that Firefox rejects.
"""

import json
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
DIST = ROOT / "dist"
PACKAGE_NAME = "read-marker-for-nhentai"


def main() -> int:
    manifest_path = SRC / "manifest.json"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        print(f"Invalid manifest {manifest_path}: {error}", file=sys.stderr)
        return 1

    version = manifest.get("version")
    if not version:
        print("manifest.json has no version", file=sys.stderr)
        return 1

    DIST.mkdir(exist_ok=True)
    target = DIST / f"{PACKAGE_NAME}-{version}.xpi"

    files = sorted(p for p in SRC.rglob("*") if p.is_file())
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in files:
            archive.write(path, path.relative_to(SRC).as_posix())

    print(f"Built {target} ({len(files)} files)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
