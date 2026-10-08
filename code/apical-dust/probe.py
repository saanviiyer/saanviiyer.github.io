# Gradient-alignment probe: cosine(estimate, backprop) per module type vs population, on a bp-trained checkpoint.
import sys, json, runpy, torch
argv = sys.argv[1:]
cfg = json.loads(argv[0]); sys.argv = ['apical.py', '--steps', '0', '--eval_every', '100000'] + argv[1:]
ns = runpy.run_path('apical.py', run_name='probe')
P, bp_grads, zo_errors, weight_grads, cosines, Feedback, batch, train = [ns[k] for k in
    ['P', 'bp_grads', 'zo_errors', 'weight_grads', 'cosines', 'Feedback', 'batch', 'train']]
args, B, T, gen = ns['args'], ns['B'], ns['T'], ns['gen']
# train with backprop to a checkpoint
mom = {k: torch.zeros_like(v) for k, v in P.items()}
for s in range(cfg['bp_steps']):
    x, y = batch(train, B, T, gen); G = bp_grads(P, x, y)
    with torch.no_grad():
        for k in P: mom[k].mul_(0.9).add_(G[k]); P[k].sub_(cfg.get("lr",0.05) * mom[k])
print('ckpt val', ns['evaluate'](P, ns['VAL']))
def group(c):
    out = {}
    for k, v in c.items():
        t = k.split('.')[-1]; out.setdefault(t, []).append(v)
    return {t: round(sum(v) / len(v), 3) for t, v in out.items()}
res = {}
for K in cfg['Ks']:
    fb = Feedback()
    with torch.no_grad():
        for s in range(cfg['fit_steps']):
            x, y = batch(train, B, T, gen)
            errs, cache, _ = zo_errors(P, x, y, K, 4 * K)
            fb.update(errs['head'], errs)
    cd, ca, cf, cp = [], [], [], []
    for s in range(cfg['eval_batches']):
        x, y = batch(train, B, T, gen); Gbp = bp_grads(P, x, y)
        with torch.no_grad():
            errs, cache, _ = zo_errors(P, x, y, K, 4 * K)
            cd.append(group(cosines(weight_grads(errs, cache, x), Gbp)))
            gps = fb.predict(errs['head'])
            errs2, cache2, _ = zo_errors(P, x, y, K, 4 * K, gps=gps)
            ca.append(group(cosines(weight_grads(errs2, cache2, x), Gbp)))
            ns['PW'].clear()
            cp.append(group(cosines(ns['precision_weighted'](gps, errs['head'], cache2, x), Gbp)))
            cf.append(group(cosines(weight_grads({**gps, 'head': errs['head']}, cache, x), Gbp)))
    avg = lambda L: {t: round(sum(d[t] for d in L) / len(L), 3) for t in L[0]}
    res[K] = {'dust': avg(cd), 'apical': avg(ca), 'fb': avg(cf), 'apical_pw': avg(cp)}
    print(K, json.dumps(res[K]), flush=True)
