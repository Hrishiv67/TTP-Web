"""Writes the site's logo files from the two-path SVG made by trace_logo.py.

    python scripts/emit_logos.py <traced.svg> <repo-root>

public/logo.svg          ink + red, for paper backgrounds
public/logo-reverse.svg  ink flipped to paper, red kept, for ink backgrounds
app/icon.svg             the red TTP monogram on an ink tile (favicon)
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from compact import compact  # noqa: E402

src, root = Path(sys.argv[1]), Path(sys.argv[2])
svg = src.read_text()
view_box = re.search(r'viewBox="([^"]+)"', svg).group(1)
ink_abs, red_abs = re.findall(r' d="([^"]+)"', svg)
ink, red = compact(ink_abs, 1), compact(red_abs, 1)
label = "Truck Tire Pro Inc. — Quality Tires, est. 2020"

for name, ink_fill, red_fill in [("logo.svg", "#16130F", "#E3161E"), ("logo-reverse.svg", "#F2ECE1", "#E8262D")]:
    (root / "public" / name).write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}" width="1022" height="784" role="img" '
        f'aria-label="{label}"><path fill="{ink_fill}" fill-rule="evenodd" d="{ink}"/>'
        f'<path fill="{red_fill}" fill-rule="evenodd" d="{red}"/></svg>\n'
    )

# favicon: square tile around the monogram's bounding box
nums = list(map(float, re.findall(r"-?\d*\.?\d+", red_abs)))
xs, ys = nums[0::2], nums[1::2]
side = max(max(xs) - min(xs), max(ys) - min(ys)) * 1.18
bx = (min(xs) + max(xs)) / 2 - side / 2
by = (min(ys) + max(ys)) / 2 - side / 2
(root / "app" / "icon.svg").write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{bx:.0f} {by:.0f} {side:.0f} {side:.0f}">'
    f'<rect x="{bx:.0f}" y="{by:.0f}" width="{side:.0f}" height="{side:.0f}" rx="{side * 0.08:.0f}" fill="#16130F"/>'
    f'<path fill="#E3161E" fill-rule="evenodd" d="{red}"/></svg>\n'
)
print("wrote public/logo.svg, public/logo-reverse.svg, app/icon.svg")
