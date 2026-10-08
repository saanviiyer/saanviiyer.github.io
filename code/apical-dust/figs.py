"""Build inline-SVG figures and summary numbers for the blog post from results/*.json.
Colors are CSS variables so the figures follow the page theme."""
import glob, json, math, statistics as st

COL = {'bp': 'var(--c-bp)', 'dust': 'var(--c-dust)', 'apicalcv': 'var(--c-cv)', 'apical': 'var(--c-pw)', 'fbonly': 'var(--c-fb)',
       'cv': 'var(--c-cv)', 'pw': 'var(--c-pw)', 'fb': 'var(--c-fb)'}
LABEL = {'bp': 'Backprop', 'dust': 'Dust', 'apicalcv': 'Apical (unbiased)', 'apical': 'Precision-weighted', 'fbonly': 'Feedback only',
         'cv': 'Apical (unbiased)', 'pw': 'Precision-weighted', 'fb': 'Feedback only'}


def cells():
    out = {}
    for f in glob.glob('results/*_s[0-9].json'):
        n = f.split('/')[-1][:-5]; m, K, lr, s = n.split('_')
        out.setdefault((m, int(K[1:]), float(lr[2:])), {})[int(s[1:])] = json.load(open(f))
    return out


def best_cells():
    """For each (method, K) the lr with 3 seeds (the tuned one)."""
    res = {}
    for (m, K, lr), runs in cells().items():
        if len(runs) >= 3:
            res[(m, K)] = runs
    return res


def summary():
    bc = best_cells(); rows = {}
    for (m, K), runs in bc.items():
        v = [runs[s]['test_at_best'] for s in sorted(runs)]
        rows[(m, K)] = {'mean': st.mean(v), 'sd': st.stdev(v), 'vals': v, 'seeds': sorted(runs)}
    return rows


def paired(rows, a, b, K):
    """mean and per-seed differences a - b at population K (negative = a better)."""
    ra, rb = rows[(a, K)], rows[(b, K)]
    d = [x - y for x, y in zip(ra['vals'], rb['vals'])]
    return st.mean(d), d


def axis(x0, y0, w, h, xt, yt, fx, fy, xlab, ylab, xfmt=str, yfmt=lambda v: f'{v:.2f}'):
    s = [f'<line x1="{x0}" y1="{y0+h}" x2="{x0+w}" y2="{y0+h}" stroke="var(--rule-strong)" stroke-width="1"/>']
    for v in yt:
        y = fy(v)
        s.append(f'<line x1="{x0}" y1="{y:.1f}" x2="{x0+w}" y2="{y:.1f}" stroke="var(--grid)" stroke-width="1"/>')
        s.append(f'<text x="{x0-6}" y="{y+3.5:.1f}" text-anchor="end" class="tk">{yfmt(v)}</text>')
    for v in xt:
        x = fx(v)
        s.append(f'<text x="{x:.1f}" y="{y0+h+15}" text-anchor="middle" class="tk">{xfmt(v)}</text>')
    s.append(f'<text x="{x0+w/2}" y="{y0+h+32}" text-anchor="middle" class="al">{xlab}</text>')
    s.append(f'<text x="{x0-38}" y="{y0+h/2}" text-anchor="middle" class="al" transform="rotate(-90 {x0-38} {y0+h/2})">{ylab}</text>')
    return s


def line(pts, color, dash=False, w=2):
    d = ' '.join(f'{"M" if i == 0 else "L"}{x:.1f},{y:.1f}' for i, (x, y) in enumerate(pts))
    da = ' stroke-dasharray="5 4"' if dash else ''
    dots = ''.join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3" fill="{color}"/>' for x, y in pts) if not dash else ''
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{w}"{da} stroke-linejoin="round"/>' + dots


def small_multiples(data, xs, keys, panels, xlab, title_fmt, logx=True, ylo=0.0, yhi=1.0):
    """data[method][x][layer] -> cos. One panel per layer type."""
    W, H, pw, ph, ml, mt = 720, 250, 190, 160, 56, 30
    gap = (W - ml - 3 * pw) / 2 - 4
    svg = [f'<svg viewBox="0 0 {W} {H}" role="img" xmlns="http://www.w3.org/2000/svg">']
    lx = lambda v: math.log2(v)
    for i, layer in enumerate(panels):
        x0 = ml + i * (pw + gap); y0 = mt
        a, b = lx(xs[0]), lx(xs[-1])
        fx = (lambda v, x0=x0, a=a, b=b: x0 + (lx(v) - a) / (b - a) * pw) if logx else None
        fy = lambda v, y0=y0: y0 + ph - (v - ylo) / (yhi - ylo) * ph
        svg += axis(x0, y0, pw, ph, xs, [0, 0.25, 0.5, 0.75, 1.0], fx, fy, xlab if i == 1 else '',
                    'cosine to backprop' if i == 0 else '', xfmt=lambda v: f'{v}' if v < 1000 else f'{v//1000}k',
                    yfmt=(lambda v: f'{v:.2f}') if i == 0 else (lambda v: ''))
        svg.append(f'<text x="{x0}" y="{y0-12}" class="pt">{title_fmt(layer)}</text>')
        for m in keys:
            pts = [(fx(x), fy(data[m][x][layer])) for x in xs if layer in data[m].get(x, {})]
            svg.append(line(pts, COL[m]))
    svg.append('</svg>')
    return '\n'.join(svg)


LAYER_NAME = {'fc1': 'MLP input (fc1)', 'o': 'Attention output (o)', 'k': 'Keys (k)', 'v': 'Values (v)', 'q': 'Queries (q)'}

# per-step alignment probe on a backprop checkpoint (output of probe.py, 4 batches per point)
PROBE = {
    'dust': {16: {'fc1': .26, 'o': .41, 'k': .16, 'v': .25}, 64: {'fc1': .51, 'o': .70, 'k': .40, 'v': .51}, 256: {'fc1': .70, 'o': .88, 'k': .56, 'v': .72}},
    'cv': {16: {'fc1': .30, 'o': .55, 'k': .18, 'v': .21}, 64: {'fc1': .68, 'o': .87, 'k': .40, 'v': .48}, 256: {'fc1': .87, 'o': .96, 'k': .56, 'v': .72}},
    'pw': {16: {'fc1': .78, 'o': .84, 'k': .18, 'v': .36}, 64: {'fc1': .91, 'o': .94, 'k': .45, 'v': .63}, 256: {'fc1': .93, 'o': .96, 'k': .58, 'v': .76}},
    'fb': {16: {'fc1': .78, 'o': .82, 'k': .11, 'v': .36}, 64: {'fc1': .90, 'o': .91, 'k': .30, 'v': .60}, 256: {'fc1': .90, 'o': .93, 'k': .27, 'v': .61}},
}


def fig_probe():
    return small_multiples(PROBE, [16, 64, 256], ['dust', 'cv', 'pw', 'fb'], ['fc1', 'o', 'k'],
                           'population K (draws per module)', lambda l: LAYER_NAME[l])


def fig_bias():
    b = json.load(open('results/bias.json'))
    data = {m: {int(n): v for n, v in d.items()} for m, d in b.items()}
    xs = sorted(data['dust'])
    return small_multiples(data, xs, ['dust', 'cv', 'pw', 'fb'], ['fc1', 'v', 'k'],
                           'independent K=16 estimates averaged on one batch', lambda l: LAYER_NAME[l])


def fig_curves(K):
    bc = best_cells()
    W, H, ml, mt, pw, ph = 720, 280, 64, 16, 620, 210
    keys = [m for m in ['bp', 'dust', 'apicalcv', 'apical', 'fbonly'] if (m, K if m != 'bp' else 0) in bc]
    lo, hi = 2.35, 2.85
    fx = lambda s: ml + s / 1000 * pw
    fy = lambda v: mt + ph - (min(max(v, lo), hi) - lo) / (hi - lo) * ph
    svg = [f'<svg viewBox="0 0 {W} {H}" role="img" xmlns="http://www.w3.org/2000/svg">']
    svg += axis(ml, mt, pw, ph, [0, 250, 500, 750, 1000], [2.4, 2.5, 2.6, 2.7, 2.8], fx, fy,
                'training step (512 tokens per step)', 'validation loss (nats/char)')
    for m in keys:
        runs = bc[(m, K if m != 'bp' else 0)]
        steps = runs[0]['step']
        mean = [st.mean(runs[s]['val'][i] for s in runs) for i in range(len(steps))]
        pts = [(fx(s), fy(v)) for s, v in zip(steps, mean) if s > 0]
        svg.append(line(pts, COL[m], dash=(m == 'bp')))
    svg.append('</svg>')
    return '\n'.join(svg)


def fig_dots(rows):
    """Final test loss per cell, seeds as dots, mean as tick."""
    groups = [(16, ['dust', 'apicalcv', 'apical', 'fbonly']), (64, ['dust', 'apicalcv', 'apical']), (256, ['dust', 'apicalcv'])]
    W, ml, row_h, mt = 720, 170, 26, 20
    n = sum(len([m for m in g if (m, K) in rows]) for K, g in groups) + len(groups)
    H = mt + n * row_h + 50
    lo, hi = 2.38, 2.66
    fx = lambda v: ml + (v - lo) / (hi - lo) * (W - ml - 20)
    svg = [f'<svg viewBox="0 0 {W} {H}" role="img" xmlns="http://www.w3.org/2000/svg">']
    y = mt
    bp = rows.get(('bp', 0))
    yb = mt + n * row_h
    for t in [2.40, 2.45, 2.50, 2.55, 2.60, 2.65]:
        svg.append(f'<line x1="{fx(t):.1f}" y1="{mt-6}" x2="{fx(t):.1f}" y2="{yb}" stroke="var(--grid)"/>')
        svg.append(f'<text x="{fx(t):.1f}" y="{yb+16}" text-anchor="middle" class="tk">{t:.2f}</text>')
    svg.append(f'<text x="{ml + (W-ml-20)/2}" y="{yb+34}" text-anchor="middle" class="al">test loss at best validation checkpoint (nats/char), lower is better</text>')
    if bp:
        svg.append(f'<line x1="{fx(bp["mean"]):.1f}" y1="{mt-6}" x2="{fx(bp["mean"]):.1f}" y2="{yb}" stroke="var(--c-bp)" stroke-dasharray="5 4" stroke-width="1.5"/>')
        svg.append(f'<text x="{fx(bp["mean"])+5:.1f}" y="{mt+4}" class="tk">backprop {bp["mean"]:.3f}</text>')
    for K, g in groups:
        svg.append(f'<text x="0" y="{y+14}" class="pt">K = {K}</text>'); y += row_h
        for m in g:
            if (m, K) not in rows: continue
            r = rows[(m, K)]
            svg.append(f'<text x="12" y="{y+4}" class="tk2">{LABEL[m]}</text>')
            svg.append(f'<line x1="{fx(min(r["vals"])):.1f}" y1="{y}" x2="{fx(max(r["vals"])):.1f}" y2="{y}" stroke="{COL[m]}" stroke-width="2" opacity="0.5"/>')
            for v in r['vals']:
                svg.append(f'<circle cx="{fx(v):.1f}" cy="{y}" r="4" fill="{COL[m]}" opacity="0.75"/>')
            svg.append(f'<line x1="{fx(r["mean"]):.1f}" y1="{y-8}" x2="{fx(r["mean"]):.1f}" y2="{y+8}" stroke="var(--ink)" stroke-width="2"/>')
            y += row_h
    svg.append('</svg>')
    return '\n'.join(svg)


if __name__ == '__main__':
    rows = summary()
    for k, v in sorted(rows.items()):
        print(k, f"{v['mean']:.4f} ± {v['sd']:.4f}", [round(x, 4) for x in v['vals']])
    for K in (16, 64, 256):
        for a in ('apicalcv', 'apical'):
            if (a, K) in rows and ('dust', K) in rows:
                m, d = paired(rows, a, 'dust', K); print(f'{a} - dust @K{K}: {m:+.4f}', [round(x, 4) for x in d])
