"""Generates the technical drawings shared by the Figma file and the site.

Everything is emitted as plain paths (lettering included) so it renders the
same in Figma's SVG importer and in the browser.

    python scripts/gen_drawings.py <out-dir> <BarlowCondensed-Bold.ttf>

writes tire.svg, truck.svg and tread-{steer,drive,trailer}.svg to <out-dir>.
Then run scripts/emit_drawings_ts.py to refresh lib/drawings.ts.
"""
import math, json, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

OUT = sys.argv[1]
FONT = sys.argv[2]

PAPER = '#F2ECE1'; INK = '#16130F'; INK2 = '#2A251F'; RED = '#E3161E'

def f(v): return f"{v:.1f}".rstrip('0').rstrip('.') if abs(v - round(v)) > 1e-6 else str(int(round(v)))

def pol(cx, cy, r, deg):
    a = math.radians(deg)
    return cx + r*math.cos(a), cy + r*math.sin(a)

font = TTFont(FONT)
gs = font.getGlyphSet(); cmap = font.getBestCmap(); upm = font['head'].unitsPerEm
hmtx = font['hmtx']

def text_on_arc(text, cx, cy, r, size, center_deg, tracking=0.0, bottom=False):
    """Lay glyph outlines along a circle. Top arcs read clockwise; bottom arcs are
    flipped so the lettering stays upright, as it does on a real sidewall."""
    s = size/upm
    names = [cmap[ord(ch)] for ch in text]
    adv = [hmtx[n][0]*s + tracking*size for n in names]
    total = sum(adv) - tracking*size
    # arc length -> degrees at the baseline radius
    rr = r
    span = math.degrees(total/rr)
    out = []
    cur = 0.0
    for n, a in zip(names, adv):
        w = hmtx[n][0]*s
        mid = cur + w/2
        if not bottom:
            deg = center_deg - span/2 + math.degrees(mid/rr)
            # glyph x-centre at 0, baseline at radius r, up = outward
            th = math.radians(deg)
            ux, uy = math.cos(th), math.sin(th)           # outward
            tx, ty = -uy, ux                              # tangent (clockwise)
            bx, by = cx + r*ux, cy + r*uy
            # fontTools transform (xx, xy, yx, yy, dx, dy): glyph x runs along the
            # tangent, glyph y (up) points outward, baseline sits on the radius
            M = (tx*s, ty*s, ux*s, uy*s, bx - (w/2)*tx, by - (w/2)*ty)
        else:
            deg = center_deg + span/2 - math.degrees(mid/rr)
            th = math.radians(deg)
            ux, uy = math.cos(th), math.sin(th)
            tx, ty = uy, -ux                              # tangent (counter-clockwise)
            bx, by = cx + r*ux, cy + r*uy
            # up = inward for bottom text
            M = (tx*s, ty*s, -ux*s, -uy*s, bx - (w/2)*tx, by - (w/2)*ty)
        pen = SVGPathPen(gs, ntos=lambda v: f"{v:.1f}")
        tp = TransformPen(pen, M)
        gs[n].draw(tp)
        out.append(pen.getCommands())
        cur += a
    return ''.join(out)

def circle_path(cx, cy, r):
    return f"M{f(cx-r)} {f(cy)}a{f(r)} {f(r)} 0 1 0 {f(2*r)} 0a{f(r)} {f(r)} 0 1 0 {f(-2*r)} 0Z"

# ------------------------------------------------------------------ tire
def tire():
    C = 400; RO = 392; RG = 370; RB = 246
    pitch = 360/44
    d = []
    for k in range(44):
        a0 = -90 + k*pitch
        seq = [(RG, a0), (RG, a0+1.3), (RO, a0+2.1), (RO, a0+pitch-0.7)]
        for i, (r, a) in enumerate(seq):
            x, y = pol(C, C, r, a)
            if not d:
                d.append(f"M{f(x)} {f(y)}")
            elif i in (1, 3):  # arcs along groove floor / block top
                d.append(f"A{f(r)} {f(r)} 0 0 1 {f(x)} {f(y)}")
            else:
                d.append(f"L{f(x)} {f(y)}")
    d.append('Z')
    tread = ''.join(d) + circle_path(C, C, RB)
    shoulder = circle_path(C, C, 352)
    bead = circle_path(C, C, 262)
    sidewall_rib = circle_path(C, C, 336)
    size_txt = text_on_arc('295/75R22.5', C, C, 286, 40, -90, tracking=0.04)
    left_txt = text_on_arc('TUBELESS', C, C, 290, 22, -142, tracking=0.12)
    right_txt = text_on_arc('LOAD RANGE G', C, C, 290, 22, -36, tracking=0.12)
    bottom_txt = text_on_arc('TRUCK TIRE PRO  ·  DUNN, N.C.', C, C, 312, 22, 90, tracking=0.16, bottom=True)
    # wheel
    holes = []
    for k in range(10):
        a = -90 + 18 + k*36
        r1, r2, half = 150, 200, 11
        p1 = pol(C, C, r1, a-half+2); p2 = pol(C, C, r2, a-half); p3 = pol(C, C, r2, a+half); p4 = pol(C, C, r1, a+half-2)
        holes.append(f"M{f(p1[0])} {f(p1[1])}L{f(p2[0])} {f(p2[1])}A{r2} {r2} 0 0 1 {f(p3[0])} {f(p3[1])}L{f(p4[0])} {f(p4[1])}A{r1} {r1} 0 0 0 {f(p1[0])} {f(p1[1])}Z")
    nuts = []; nut_dots = []
    for k in range(10):
        a = -90 + k*36
        cx, cy = pol(C, C, 104, a)
        hexp = [pol(cx, cy, 12, a + 30 + 60*j) for j in range(6)]
        nuts.append('M' + 'L'.join(f"{f(x)} {f(y)}" for x, y in hexp) + 'Z')
        nut_dots.append(circle_path(cx, cy, 3.2))
    vx, vy = pol(C, C, 226, -90 + 36*2 + 18)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
<g id="wheel">
<path id="rim-face" fill="{PAPER}" d="{circle_path(C, C, RB)}"/>
<path fill="none" stroke="{INK}" stroke-width="1.5" d="{circle_path(C, C, 230)}"/>
<path fill="none" stroke="{INK}" stroke-width="1" d="{circle_path(C, C, 214)}"/>
<path fill="none" stroke="{INK}" stroke-width="1" stroke-dasharray="3 5" d="{circle_path(C, C, 132)}"/>
<path id="hand-holes" fill="{INK}" d="{''.join(holes)}"/>
<path fill="none" stroke="{INK}" stroke-width="2" d="{circle_path(C, C, 124)}"/>
<path id="lug-nuts" fill="{INK}" d="{''.join(nuts)}"/>
<path fill="{PAPER}" d="{''.join(nut_dots)}"/>
<path fill="{INK}" d="{circle_path(C, C, 52)}"/>
<path fill="none" stroke="{PAPER}" stroke-width="1.5" d="{circle_path(C, C, 40)}"/>
<path id="valve" fill="{RED}" d="{circle_path(vx, vy, 5.5)}"/>
</g>
<g id="tire">
<path id="tread" fill="{INK}" fill-rule="evenodd" d="{tread}"/>
<path fill="none" stroke="{PAPER}" stroke-opacity=".28" stroke-width="1.5" d="{shoulder}"/>
<path fill="none" stroke="{PAPER}" stroke-opacity=".18" stroke-width="1" d="{sidewall_rib}"/>
<path fill="none" stroke="{PAPER}" stroke-opacity=".35" stroke-width="1.2" d="{bead}"/>
<path id="size" fill="{RED}" d="{size_txt}"/>
<path id="sidewall-text" fill="{PAPER}" fill-opacity=".82" d="{left_txt}{right_txt}{bottom_txt}"/>
</g>
</svg>'''
    open(f'{OUT}/tire.svg', 'w').write(svg)
    return svg

# ------------------------------------------------------------------ truck (top view)
def truck():
    W, H = 1120, 260
    def rect(x, y, w, h, rx=0):
        return f"M{f(x+rx)} {f(y)}H{f(x+w-rx)}" + (f"A{rx} {rx} 0 0 1 {f(x+w)} {f(y+rx)}" if rx else '') + f"V{f(y+h-rx)}" + (f"A{rx} {rx} 0 0 1 {f(x+w-rx)} {f(y+h)}" if rx else '') + f"H{f(x+rx)}" + (f"A{rx} {rx} 0 0 1 {f(x)} {f(y+h-rx)}" if rx else '') + f"V{f(y+rx)}" + (f"A{rx} {rx} 0 0 1 {f(x+rx)} {f(y)}" if rx else '') + 'Z'
    TL, TW = 48, 16  # tyre footprint in plan: length along travel, tread width
    def tyre(cx, y):
        return rect(cx - TL/2, y, TL, TW, 3)
    def treadlines(cx, y):
        return ''.join(f"M{f(cx - TL/2 + 8 + 8*i)} {f(y+3)}V{f(y+TW-3)}" for i in range(5))
    groups = {}
    # steer: singles
    sx = 108
    groups['steer'] = dict(tyres=[tyre(sx, 48), tyre(sx, 196)], lines=treadlines(sx, 48)+treadlines(sx, 196), axle=f"M{sx} 64V196")
    dx = [352, 404]
    groups['drive'] = dict(tyres=[tyre(x, y) for x in dx for y in (30, 48, 196, 214)], lines=''.join(treadlines(x, y) for x in dx for y in (30, 48, 196, 214)), axle=''.join(f"M{x} 64V196" for x in dx))
    tx = [952, 1004]
    groups['trailer'] = dict(tyres=[tyre(x, y) for x in tx for y in (30, 48, 196, 214)], lines=''.join(treadlines(x, y) for x in tx for y in (30, 48, 196, 214)), axle=''.join(f"M{x} 64V196" for x in tx))
    body = ''.join([
        rect(40, 84, 112, 92, 14),     # hood
        rect(152, 70, 150, 120, 6),    # cab + sleeper
        f"M196 70V190",               # cab / sleeper split
        f"M302 108H430M302 152H430",   # frame rails
    ])
    windshield = rect(160, 78, 26, 104, 3)
    fifth = circle_path(378, 130, 24)
    trailer = rect(336, 52, 744, 156, 2)
    kingpin = circle_path(378, 130, 5)
    doors = "M1072 52V208M1076 130H1080"
    centre = "M20 130H1100"
    parts = []
    parts.append(f'<path id="centreline" fill="none" stroke="{PAPER}" stroke-opacity=".22" stroke-width="1" stroke-dasharray="14 5 3 5" d="{centre}"/>')
    parts.append(f'<path id="tractor" fill="none" stroke="{PAPER}" stroke-width="1.5" stroke-linejoin="round" d="{body}"/>')
    parts.append(f'<path fill="none" stroke="{PAPER}" stroke-opacity=".5" stroke-width="1" d="{windshield}{fifth}"/>')
    parts.append(f'<path id="trailer-body" fill="none" stroke="{PAPER}" stroke-width="1.5" stroke-dasharray="1 0" d="{trailer}{doors}"/>')
    parts.append(f'<path fill="{PAPER}" d="{kingpin}"/>')
    for g, v in groups.items():
        parts.append(f'<g id="axle-{g}" data-axle="{g}"><path class="axle" fill="none" stroke="{PAPER}" stroke-opacity=".6" stroke-width="2" d="{v["axle"]}"/><path class="tyres" fill="{INK2}" stroke="{PAPER}" stroke-width="1.25" d="{"".join(v["tyres"])}"/><path class="treads" fill="none" stroke="{PAPER}" stroke-opacity=".35" stroke-width="1" d="{v["lines"]}"/></g>')
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">' + ''.join(parts) + '</svg>'
    open(f'{OUT}/truck.svg', 'w').write(svg)
    return groups, body, windshield + fifth, trailer + doors, kingpin, centre

# ------------------------------------------------------------------ tread swatches
def zig(x, y0, y1, amp, period):
    pts = [f"M{f(x)} {f(y0)}"]
    y = y0; i = 0
    while y < y1:
        y = min(y + period/2, y1); i += 1
        pts.append(f"L{f(x + (amp if i % 2 else 0))} {f(y)}")
    return ''.join(pts)

def treads():
    W, H = 200, 280
    out = {}
    # steer: five ribs, zig-zag grooves, sipes
    d = []
    for gx in (40, 80, 120, 160):
        d.append(zig(gx - 5, 0, H, 5, 22)); d.append(zig(gx + 3, 0, H, 5, 22))
    sipes = []
    for rib0 in (0, 44, 84, 124, 164):
        for yy in range(10, H, 22):
            sipes.append(f"M{rib0 + 10} {yy}l14 6")
    out['steer'] = (''.join(d), ''.join(sipes))
    # drive: offset lug blocks with a zig-zag centre groove
    d = []
    for row in range(-1, 8):
        y = row*40
        d.append(f"M0 {y+6}L84 {y-2}L88 {y+26}L0 {y+34}Z")
        y2 = y + 20
        d.append(f"M112 {y2-2}L200 {y2+6}V{y2+34}L116 {y2+26}Z")
    sipes = []
    for row in range(-1, 8):
        y = row*40
        sipes.append(f"M24 {y+12}l10 14M52 {y+9}l10 14")
        sipes.append(f"M140 {y+31}l10 14M168 {y+34}l10 14")
    out['drive'] = (''.join(d), ''.join(sipes))
    # trailer: five narrow ribs, straight grooves
    d = []
    for gx in (38, 78, 122, 162):
        d.append(f"M{gx-2} 0V{H}M{gx+2} 0V{H}")
    sipes = []
    for rib0 in (0, 40, 80, 124, 164):
        for yy in range(14, H, 28):
            sipes.append(f"M{rib0 + 12} {yy}h12")
    out['trailer'] = (''.join(d), ''.join(sipes))
    for k, (main, sip) in out.items():
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
               f'<defs><clipPath id="c-{k}"><rect width="{W}" height="{H}"/></clipPath></defs><g clip-path="url(#c-{k})">'
               f'<path fill="none" stroke="{PAPER}" stroke-width="1.5" stroke-linejoin="round" d="{main}"/>'
               f'<path fill="none" stroke="{PAPER}" stroke-opacity=".45" stroke-width="1" stroke-linecap="round" d="{sip}"/></g>'
               f'<rect x=".5" y=".5" width="{W-1}" height="{H-1}" fill="none" stroke="{PAPER}" stroke-opacity=".25"/></svg>')
        open(f'{OUT}/tread-{k}.svg', 'w').write(svg)
    return out

tire_svg = tire()
truck_parts = truck()
tread_parts = treads()
print('ok', len(tire_svg))
