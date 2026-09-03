#!/usr/bin/env python3
"""
Wrap the artifact source into a standalone page served by Vercel.

`wedding-site/save-the-date.html` is authored as an ARTIFACT FRAGMENT — it has
no <!doctype>/<html>/<head>/<body>, because claude.ai supplies those at publish
time. Serving it from public/ needs a real document, so this wraps it.

Source of truth is the fragment. Edit that, then re-run:

    python3 wedding-site/build-public.py

Never hand-edit public/save-the-date.html — it is generated and overwritten.
"""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "wedding-site" / "save-the-date.html"
OUT = ROOT / "public" / "save-the-date.html"

fragment = SRC.read_text(encoding="utf-8")

# The fragment is ordered head-content first (title/meta/link/style), then
# body-content (the <svg> symbol defs, <main>, <script>). Split on the defs.
MARKER = '<svg width="0" height="0"'
if MARKER not in fragment:
    sys.exit(f"error: could not find the body split marker {MARKER!r} in {SRC}")

head_part, body_part = fragment.split(MARKER, 1)
body_part = MARKER + body_part

doc = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<!-- A private family page on a commercial domain: keep it out of search
     results. Guests reach it by link. Remove to allow indexing. -->
<meta name="robots" content="noindex, nofollow">
{head_part.strip()}
</head>
<body>
{body_part.strip()}
</body>
</html>
"""

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(doc, encoding="utf-8")
print(f"built {OUT.relative_to(ROOT)} ({len(doc):,} bytes) from {SRC.relative_to(ROOT)}")
