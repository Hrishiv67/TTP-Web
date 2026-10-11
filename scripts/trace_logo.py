"""Vectorises the supplied Truck Tire Pro logo into two flat paths (ink + red).

    python scripts/trace_logo.py assets/logo-source.webp <out.svg>

The source is the straight-on, distressed artwork (assets/logo-scan.webp is a
photo of a sticker and is skewed, so it is kept for reference only). Small
distress specks are filled, nicks narrower than ~1.5px are bridged, and the
scratch through "EST" is closed with a vertical-only pass confined to that
word. Larger distress is kept: it is part of the mark. Then run
scripts/emit_logos.py to write public/logo*.svg and app/icon.svg.
Needs: numpy, Pillow, scipy, potracer.
"""
import sys, time
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
import potrace

SRC = sys.argv[1]
OUT = sys.argv[2]
SCALE = 2
HOLE_MAX = 60   # enclosed specks smaller than this (px at source scale) are filled
SPECK_MAX = 75  # loose ink smaller than this is dropped

im = Image.open(SRC).convert('RGB')
W, H = im.size
im = im.resize((W*SCALE, H*SCALE), Image.LANCZOS)
a = np.asarray(im).astype(np.float32)
r, g, b = a[...,0], a[...,1], a[...,2]
lum = 0.299*r + 0.587*g + 0.114*b
redness = r - np.maximum(g, b)

red = (redness > 90) & (r > 110)
black = (lum < 105) & ~red

CLOSE_R = 3  # at working scale: bridges distress nicks under ~1.5 source px, keeps the 6px+ white rings

def disk(r):
    y, x = np.ogrid[-r:r+1, -r:r+1]
    return x*x + y*y <= r*r

def clean(mask, hole_max, speck_max):
    s = SCALE*SCALE
    mask = ndi.binary_closing(np.pad(mask, CLOSE_R*2), structure=disk(CLOSE_R))[CLOSE_R*2:-CLOSE_R*2, CLOSE_R*2:-CLOSE_R*2]
    # drop isolated ink specks
    lab, n = ndi.label(mask)
    sizes = ndi.sum(mask, lab, range(1, n+1))
    keep = np.zeros(n+1, bool); keep[1:] = sizes >= speck_max*s
    mask = keep[lab]
    # fill small enclosed holes (distress specks), keep large ones (real counters / rings)
    inv = ~mask
    lab, n = ndi.label(inv)
    sizes = ndi.sum(inv, lab, range(1, n+1))
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:,0], lab[:,-1]])))
    fill = np.zeros(n+1, bool)
    for i, sz in enumerate(sizes, start=1):
        if sz < hole_max*s and i not in border:
            fill[i] = True
    mask = mask | fill[lab]
    return mask

# "EST" is cut through horizontally by a distress scratch wider than CLOSE_R; bridge it
# with a vertical-only closing confined to that word so nothing else can merge.
ey0, ey1, ex0, ex1 = 612*SCALE, 672*SCALE, 128*SCALE, 210*SCALE
roi = np.pad(lum[ey0:ey1, ex0:ex1] < 135, 12*SCALE)  # the scratch leaves the strokes grey, not white
roi = ndi.binary_closing(roi, structure=np.ones((9*SCALE, 1), bool))[12*SCALE:-12*SCALE, 12*SCALE:-12*SCALE]
black[ey0:ey1, ex0:ex1] |= roi

red_c = clean(red, HOLE_MAX, SPECK_MAX)
# the red letters sit on the black tire; specks of red-ish noise inside black get dropped by speck filter
black_c = clean(black, HOLE_MAX, SPECK_MAX)

def trace(mask):
    bm = potrace.Bitmap(~mask)  # potracer treats True as paper
    t = time.time()
    plist = bm.trace(turdsize=6*SCALE, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=1.0, opticurve=True, opttolerance=0.25)
    parts = []
    k = 1.0/SCALE
    f = lambda p: f"{p.x*k:.1f} {p.y*k:.1f}"
    for curve in plist:
        parts.append("M" + f(curve.start_point))
        for seg in curve.segments:
            if seg.is_corner:
                parts.append("L" + f(seg.c) + "L" + f(seg.end_point))
            else:
                parts.append("C" + f(seg.c1) + " " + f(seg.c2) + " " + f(seg.end_point))
        parts.append("Z")
    print('traced', len(plist), 'curves in', round(time.time()-t,1), 's', file=sys.stderr)
    return "".join(parts)

dblack = trace(black_c)
dred = trace(red_c)

# tight crop box from both masks (source coords)
ys, xs = np.where(black_c | red_c)
pad = 6
x0, y0 = xs.min()/SCALE - pad, ys.min()/SCALE - pad
x1, y1 = xs.max()/SCALE + pad, ys.max()/SCALE + pad
vb = f"{x0:.0f} {y0:.0f} {x1-x0:.0f} {y1-y0:.0f}"
svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"><path fill="#141210" fill-rule="evenodd" d="{dblack}"/><path fill="#E3161E" fill-rule="evenodd" d="{dred}"/></svg>'
open(OUT, 'w').write(svg)
print('viewBox', vb, 'bytes', len(svg), file=sys.stderr)
