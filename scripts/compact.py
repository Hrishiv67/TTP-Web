"""Compact SVG path data: absolute -> relative, fixed precision. Handles MLHVCQAZ (+lowercase)."""
import re, sys
NUM = r'-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?'
ARGS = {'M': 2, 'L': 2, 'H': 1, 'V': 1, 'C': 6, 'Q': 4, 'A': 7, 'Z': 0, 'S': 4, 'T': 2}

def fmt(v, dec):
    v = round(v, dec)
    if abs(v) < 10 ** -dec / 2: v = 0.0
    s = f"{v:.{dec}f}".rstrip('0').rstrip('.') if dec else str(int(round(v)))
    if s.startswith('0.'): s = s[1:]
    elif s.startswith('-0.'): s = '-' + s[2:]
    return s or '0'

def joinnums(nums):
    out = ''
    for n in nums:
        if not out:
            out = n
        elif n.startswith('-'):
            out += n
        elif n.startswith('.') and ('.' in re.split(r'[ -]', out)[-1]):
            out += n
        else:
            out += ' ' + n
    return out

def compact(d, dec=1):
    toks = re.findall(r'[MLHVCQAZSTmlhvcqazst]|' + NUM, d)
    i = 0; cx = cy = sx = sy = 0.0; out = []; cmd = None
    q = 10 ** dec; R = lambda v: round(v * q) / q
    while i < len(toks):
        t = toks[i]
        if re.match(r'[A-Za-z]', t):
            cmd = t; i += 1
            if cmd in 'Zz':
                out.append('z'); cx, cy = sx, sy; continue
        n = ARGS[cmd.upper()]
        a = [float(x) for x in toks[i:i+n]]; i += n
        rel = cmd.islower(); C = cmd.upper()
        if C == 'M':
            x, y = (cx + a[0], cy + a[1]) if rel else (a[0], a[1]); x, y = R(x), R(y)
            out.append('m' + joinnums([fmt(x-cx, dec), fmt(y-cy, dec)])); cx, cy = x, y; sx, sy = x, y
            cmd = 'l' if rel else 'L'
        elif C == 'L':
            x, y = (cx + a[0], cy + a[1]) if rel else (a[0], a[1]); x, y = R(x), R(y)
            out.append('l' + joinnums([fmt(x-cx, dec), fmt(y-cy, dec)])); cx, cy = x, y
        elif C == 'H':
            x = R(cx + a[0] if rel else a[0]); out.append('h' + fmt(x-cx, dec)); cx = x
        elif C == 'V':
            y = R(cy + a[0] if rel else a[0]); out.append('v' + fmt(y-cy, dec)); cy = y
        elif C in 'CQ':
            pts = []
            for k in range(0, n, 2):
                x, y = (cx + a[k], cy + a[k+1]) if rel else (a[k], a[k+1]); pts.append((R(x), R(y)))
            out.append(C.lower() + joinnums([fmt(v, dec) for p in pts for v in (p[0]-cx, p[1]-cy)])); cx, cy = pts[-1]
        elif C == 'A':
            x, y = (cx + a[5], cy + a[6]) if rel else (a[5], a[6]); x, y = R(x), R(y)
            out.append('a' + joinnums([fmt(a[0], dec), fmt(a[1], dec), fmt(a[2], 0), str(int(a[3])), str(int(a[4])), fmt(x-cx, dec), fmt(y-cy, dec)])); cx, cy = x, y
    s = ''.join(out)
    return 'M' + s[1:] if s.startswith('m') else s

if __name__ == '__main__':
    src = open(sys.argv[1]).read(); dec = int(sys.argv[3]) if len(sys.argv) > 3 else 1
    res = re.sub(r' d="([^"]+)"', lambda m: ' d="' + compact(m.group(1), dec) + '"', src)
    open(sys.argv[2], 'w').write(res)
    print(len(src), '->', len(res))
