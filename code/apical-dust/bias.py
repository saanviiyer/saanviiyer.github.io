# Bias test: average N independent estimates on ONE fixed batch; unbiased estimators -> cos 1, biased ones plateau.
import sys, json, runpy, torch
sys.argv = ['apical.py', '--steps', '0', '--eval_every', '100000']
ns = runpy.run_path('apical.py', run_name='bias')
P, bp_grads, zo_errors, weight_grads, cosines, Feedback, batch, train = [ns[k] for k in
    ['P', 'bp_grads', 'zo_errors', 'weight_grads', 'cosines', 'Feedback', 'batch', 'train']]
B, T, gen = ns['B'], ns['T'], ns['gen']
mom = {k: torch.zeros_like(v) for k, v in P.items()}
for s in range(300):
    x, y = batch(train, B, T, gen); G = bp_grads(P, x, y)
    with torch.no_grad():
        for k in P: mom[k].mul_(0.9).add_(G[k]); P[k].sub_(0.03 * mom[k])
K = 16
fb = Feedback()
with torch.no_grad():
    for s in range(60):
        x, y = batch(train, B, T, gen); errs, cache, _ = zo_errors(P, x, y, K, 4 * K); fb.update(errs['head'], errs)
x, y = batch(train, B, T, gen); Gbp = bp_grads(P, x, y)
keys = [k for k in Gbp if k != 'head']
acc = {m: {k: torch.zeros_like(Gbp[k]) for k in keys} for m in ['dust', 'cv', 'pw', 'fb']}
out = {m: {} for m in acc}
def agg(G, n):
    c = cosines({k: G[k] / n for k in keys}, Gbp); g = {}
    for k, v in c.items(): g.setdefault(k.split('.')[-1], []).append(v)
    return {t: sum(v) / len(v) for t, v in g.items()}
with torch.no_grad():
    for n in range(1, 257):
        errs, cache, _ = zo_errors(P, x, y, K, 4 * K)
        Gd = weight_grads(errs, cache, x)
        gps = fb.predict(errs['head'])
        errs2, cache2, _ = zo_errors(P, x, y, K, 4 * K, gps=gps)
        Gc = weight_grads(errs2, cache2, x)
        ns['PW'].clear(); Gp = ns['precision_weighted'](gps, errs['head'], cache2, x)
        Gf = weight_grads({**gps, 'head': errs['head']}, cache, x)
        for m, G in zip(['dust', 'cv', 'pw', 'fb'], [Gd, Gc, Gp, Gf]):
            for k in keys: acc[m][k] += G[k]
        if n in (1, 4, 16, 64, 256):
            for m in acc: out[m][n] = agg(acc[m], n)
            print(n, {m: {t: round(v, 2) for t, v in out[m][n].items()} for m in acc}, flush=True)
json.dump(out, open('results/bias.json', 'w'))
