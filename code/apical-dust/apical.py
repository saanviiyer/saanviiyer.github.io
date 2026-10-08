"""Dust and Apical: training a transformer without a backward pass.

Dust   = per-token activation (node) perturbation, a virtual population along the
         token axis, reward-weighted noise as the output-error estimate.
Apical = Dust + a learned top-down feedback pathway used as a control variate.
         The feedback weights B_m map the network's output error e_t (itself
         estimated by perturbing the logits) to a predicted error at every
         module's output. The perturbation only has to estimate the residual
         g - B e, so the estimate stays unbiased while its variance shrinks.
         B_m is learned by ridge regression of the Dust estimates on e
         (no derivatives anywhere; Lansdell et al. 2020 style).
fbonly = ablation: update weights with B e alone (perturbation only trains B).
bp     = backprop baseline.
"""
import argparse, json, math, os, time
import torch
import torch.nn.functional as F

p = argparse.ArgumentParser()
p.add_argument('--method', default='dust', choices=['bp', 'dust', 'apical', 'fbonly'])
p.add_argument('--K', type=int, default=32)
p.add_argument('--Khead', type=int, default=0, help='head population, default 4K')
p.add_argument('--lr', type=float, default=0.3)
p.add_argument('--mom', type=float, default=0.9)
p.add_argument('--seed', type=int, default=0)
p.add_argument('--steps', type=int, default=1500)
p.add_argument('--B', type=int, default=8)
p.add_argument('--T', type=int, default=64)
p.add_argument('--d', type=int, default=128)
p.add_argument('--L', type=int, default=2)
p.add_argument('--H', type=int, default=4)
p.add_argument('--sig', type=str, default='', help='json overrides of noise scales')
p.add_argument('--gamma_kv', type=float, default=0.9)
p.add_argument('--rho', type=float, default=0.98, help='EMA decay of feedback statistics')
p.add_argument('--ridge', type=float, default=1e-2)
p.add_argument('--pw', type=int, default=1, help='apical: precision-weight the residual')
p.add_argument('--pw_rho', type=float, default=0.9)
p.add_argument('--chunk', type=int, default=64)
p.add_argument('--eval_every', type=int, default=100)
p.add_argument('--cos_every', type=int, default=100)
p.add_argument('--device', default='mps')
p.add_argument('--out', default='')
p.add_argument('--timing', action='store_true')
p.add_argument('--fast', type=int, default=0, help='remove redundant work (same math, different RNG stream)')
p.add_argument('--bench', type=int, default=0, help='time N steady-state steps and exit')
args = p.parse_args()

dev = torch.device(args.device)
torch.manual_seed(args.seed)
HERE = os.path.dirname(os.path.abspath(__file__))

# ---------------- data ----------------
text = open(os.path.join(HERE, 'data/input.txt')).read()
chars = sorted(set(text)); V = len(chars)
stoi = {c: i for i, c in enumerate(chars)}
data = torch.tensor([stoi[c] for c in text], dtype=torch.long)
n = len(data)
train, val, test = data[:int(.9 * n)], data[int(.9 * n):int(.95 * n)], data[int(.95 * n):]
gen = torch.Generator().manual_seed(1000 + args.seed)


def batch(src, B, T, g):
    ix = torch.randint(len(src) - T - 1, (B,), generator=g)
    x = torch.stack([src[i:i + T] for i in ix]); y = torch.stack([src[i + 1:i + T + 1] for i in ix])
    return x.to(dev), y.to(dev)


eg = torch.Generator().manual_seed(7)
VAL = [batch(val, 32, args.T, eg) for _ in range(16)]
TEST = [batch(test, 32, args.T, eg) for _ in range(16)]

# ---------------- model ----------------
d, L, H, T, B = args.d, args.L, args.H, args.T, args.B
g0 = torch.Generator().manual_seed(args.seed)


def nrm(*s, std=0.02):
    return (torch.randn(*s, generator=g0) * std).to(dev)


P = {'tok': nrm(V, d), 'pos': nrm(T, d)}
for l in range(L):
    for m in 'qkv':
        P[f'{l}.{m}'] = nrm(d, d)
    P[f'{l}.o'] = nrm(d, d, std=0.02 / math.sqrt(2 * L))
    P[f'{l}.fc1'] = nrm(4 * d, d)
    P[f'{l}.fc2'] = nrm(d, 4 * d, std=0.02 / math.sqrt(2 * L))
P['head'] = nrm(V, d)

MODS = ['emb'] + [f'{l}.{m}' for l in range(L) for m in ['q', 'k', 'v', 'o', 'fc1', 'fc2']]
DOUT = {m: (4 * d if m.endswith('fc1') else d) for m in MODS}
SIG = {'emb': 0.05, 'q': 0.05, 'k': 0.05, 'v': 0.05, 'o': 0.05, 'fc1': 0.05, 'fc2': 0.05, 'head': 0.05}
if args.sig:
    SIG.update(json.loads(args.sig))
mtype = lambda m: m.split('.')[-1]
GAMMA = {m: (args.gamma_kv if mtype(m) in ('k', 'v') else 0.0) for m in MODS}


def ln(x):
    return F.layer_norm(x, (x.shape[-1],))


def forward(P, idx=None, noise=None, cache=None, start=0, h0=None):
    noise = noise or {}

    def lin(name, inp):
        y = inp @ P[name].T
        if cache is not None:
            cache['x'][name] = inp
        if name in noise:
            y = y + noise[name]
        return y

    if start == 0:
        h = P['tok'][idx] + P['pos'][:idx.shape[1]]
        if 'emb' in noise:
            h = h + noise['emb']
    else:
        h = h0
    for l in range(start, L):
        if cache is not None:
            cache['h'][l] = h
        x = ln(h)
        q, k, v = lin(f'{l}.q', x), lin(f'{l}.k', x), lin(f'{l}.v', x)
        N, Tt, _ = q.shape
        sh = lambda z: z.view(N, Tt, H, d // H).transpose(1, 2)
        a = F.scaled_dot_product_attention(sh(q), sh(k), sh(v), is_causal=True)
        h = h + lin(f'{l}.o', a.transpose(1, 2).reshape(N, Tt, d))
        x = ln(h)
        h = h + lin(f'{l}.fc2', F.gelu(lin(f'{l}.fc1', x)))
    hf = ln(h)
    if cache is not None:
        cache['x']['head'] = hf
    return hf @ P['head'].T


def tok_loss(logits, y):
    return F.cross_entropy(logits.reshape(-1, V), y.reshape(-1), reduction='none').view(y.shape)


@torch.no_grad()
def evaluate(P, sets):
    return sum(tok_loss(forward(P, x), y).mean().item() for x, y in sets) / len(sets)


DISC = {}


def discount(c, gamma):  # r_t = sum_{s>=t} gamma^{s-t} c_s, c: (K,B,T)
    if gamma == 0:
        return c
    if gamma not in DISC:
        s = torch.arange(T, device=dev)
        D = (s[:, None] - s[None, :]).float()
        DISC[gamma] = torch.where(D >= 0, gamma ** D.clamp(min=0), torch.zeros_like(D))
    return c @ DISC[gamma]


def estimate(c, a, sigma, gamma, gp=None, halves=False):
    """c: (K,B,T) loss reductions, a: (K,B,T,D) unit noise. Returns (B,T,D) error estimate
    in units of d(sum of token losses)/d(output). With halves=True also returns the residual
    estimate from each half of the population (for precision weighting)."""
    r = discount(c, gamma)
    if gp is not None:
        # control variate: remove the part of the reward the feedback already predicts
        r = r + sigma * (a * gp.unsqueeze(0)).sum(-1)
    ra = r.unsqueeze(-1) * a
    res = -ra.mean(0) / sigma
    out = res if gp is None else gp + res
    if not halves:
        return out
    h = a.shape[0] // 2
    return out, -ra[:h].mean(0) / sigma, -ra[h:].mean(0) / sigma


@torch.no_grad()
def zo_errors(P, x, y, K, Khead, gps=None, e_given=None, need_halves=True):
    """Zeroth-order output-error estimates for every module. No backward pass."""
    cache = {'x': {}, 'h': {}}
    logits = forward(P, x, cache=cache)
    errs = {}
    # head: jitter cached logits, re-evaluate only the cross entropy
    sh = SIG['head']
    if e_given is not None:
        errs['head'] = e_given
    else:
        a = torch.randn(Khead, B, T, V, device=dev)
        lp = tok_loss(logits.unsqueeze(0) + sh * a, y.unsqueeze(0).expand(Khead, B, T))
        errs['head'] = estimate(lp.mean(0, keepdim=True) - lp, a, sh, 0.0)
    for m in MODS:
        D, s = DOUT[m], SIG[mtype(m)]
        start = 0 if m == 'emb' else int(m.split('.')[0])
        a = torch.randn(K, B, T, D, device=dev)
        losses = []
        for i in range(0, K, args.chunk):
            k = min(args.chunk, K - i)
            nz = {m: s * a[i:i + k].reshape(k * B, T, D)}
            if start == 0:
                lg = forward(P, x.repeat(k, 1), noise=nz)
            else:
                lg = forward(P, noise=nz, start=start, h0=cache['h'][start].repeat(k, 1, 1))
            losses.append(tok_loss(lg, y.repeat(k, 1)).view(k, B, T))
        lp = torch.cat(losses)
        if gps is None or not need_halves:
            errs[m] = estimate(lp.mean(0, keepdim=True) - lp, a, s, GAMMA[m], None if gps is None else gps[m])
        else:
            errs[m], r1, r2 = estimate(lp.mean(0, keepdim=True) - lp, a, s, GAMMA[m], gps[m], halves=True)
            HALVES[m] = (r1, r2)
    return errs, cache, logits


HALVES = {}


def weight_grads(errs, cache, x):
    """Outer product of estimated output error with the layer input (same as backprop's last step)."""
    N = B * T
    G = {}
    for m, g in errs.items():
        if m == 'emb':
            gt = torch.zeros_like(P['tok'])
            gt.index_add_(0, x.reshape(-1), g.reshape(-1, d))
            G['tok'] = gt / N
            G['pos'] = g.sum(0) / N
        else:
            G[m] = torch.einsum('btd,bti->di', g, cache['x'][m]) / N
    return G


def bp_grads(P, x, y):
    Q = {k: v.detach().clone().requires_grad_(True) for k, v in P.items()}
    loss = tok_loss(forward(Q, x), y).mean()
    gr = torch.autograd.grad(loss, list(Q.values()))
    return dict(zip(Q.keys(), gr))


def cosines(G, Gbp):
    out = {}
    for k in G:
        out[k] = F.cosine_similarity(G[k].flatten(), Gbp[k].flatten(), dim=0).item()
    return out


def ns_inverse(A, iters=40):
    """Newton-Schulz inverse of an SPD matrix, all on device (no host sync)."""
    X = torch.eye(A.shape[0], device=A.device) / A.diagonal().sum()
    I2 = 2 * torch.eye(A.shape[0], device=A.device)
    for _ in range(iters):
        X = X @ (I2 - A @ X)
    return X


# ---------------- feedback pathway (Apical) ----------------
class Feedback:
    """Per-module linear feedback B_m: e_t (V) -> predicted output error (D_m).
    Fit by EMA ridge regression of the perturbation estimates on e."""

    def __init__(self):
        self.Cee = torch.zeros(V, V, device=dev)
        self.Cge = {m: torch.zeros(DOUT[m], V, device=dev) for m in MODS}
        self.Bm = {m: torch.zeros(DOUT[m], V, device=dev) for m in MODS}
        self.n = 0

    def predict(self, e):
        return {m: e @ self.Bm[m].T for m in MODS}

    def update(self, e, errs):
        rho = args.rho
        ef = e.reshape(-1, V)
        N = ef.shape[0]
        self.Cee.mul_(rho).add_((1 - rho) * ef.T @ ef / N)
        self.n += 1
        bias = 1 - rho ** self.n
        Cee = self.Cee / bias
        lam = args.ridge * Cee.diagonal().mean()
        A = Cee + lam * torch.eye(V, device=dev)
        if args.fast:
            inv = ns_inverse(A)
        else:
            inv = torch.linalg.inv(A.cpu()).to(dev)
        for m in MODS:
            gf = errs[m].reshape(-1, DOUT[m])
            self.Cge[m].mul_(rho).add_((1 - rho) * gf.T @ ef / N)
            self.Bm[m] = (self.Cge[m] / bias) @ inv


PW = {}


def precision_weighted(gps, e, cache, x):
    """Combine top-down prediction (feedback) with bottom-up evidence (perturbation residual),
    weighting the residual by its estimated reliability, as in precision-weighted prediction errors.
    Signal power of the residual is <G1,G2> (unbiased), noise power of the mean is |G1-G2|^2/4."""
    Gfb = weight_grads({**gps, 'head': e}, cache, x)
    G1 = weight_grads({m: HALVES[m][0] for m in MODS}, cache, x)
    G2 = weight_grads({m: HALVES[m][1] for m in MODS}, cache, x)
    G = {'head': Gfb['head']}
    for k in G1:
        sig = (G1[k] * G2[k]).sum().clamp(min=0)
        noi = ((G1[k] - G2[k]) ** 2).sum() / 4
        s0, n0 = PW.get(k, (sig, noi))
        s0 = args.pw_rho * s0 + (1 - args.pw_rho) * sig; n0 = args.pw_rho * n0 + (1 - args.pw_rho) * noi
        PW[k] = (s0, n0)
        beta = s0 / (s0 + n0 + 1e-30)
        G[k] = Gfb[k] + beta * (G1[k] + G2[k]) / 2
    return G


# ---------------- training ----------------
K = args.K
Khead = args.Khead or 4 * K
mom = {k: torch.zeros_like(v) for k, v in P.items()}
fb = Feedback() if args.method in ('apical', 'fbonly') else None
log = {'args': vars(args), 'step': [], 'val': [], 'test': [], 'train': [], 'cos': [], 'cos_fb': []}
t0 = time.time()
for step in range(args.steps + 1):
    if args.bench and step == 3:
        (torch.mps.synchronize() if dev.type == 'mps' else None); tb = time.time()
    if args.bench and step == 3 + args.bench:
        (torch.mps.synchronize() if dev.type == 'mps' else None)
        print(f'BENCH {(time.time() - tb) / args.bench:.4f} s/step'); break
    if (step % args.eval_every == 0 or step == args.steps) and not args.bench:
        log['step'].append(step); log['val'].append(evaluate(P, VAL)); log['test'].append(evaluate(P, TEST))
        print(f"step {step} val {log['val'][-1]:.4f} t={time.time() - t0:.0f}s", flush=True)
    if step == args.steps:
        break
    x, y = batch(train, B, T, gen)
    if args.method == 'bp':
        G = bp_grads(P, x, y)
    else:
        with torch.no_grad():
            if fb is not None and args.method == 'apical' and args.fast:
                cache = {'x': {}, 'h': {}}
                lg0 = forward(P, x, cache=cache)
                a = torch.randn(Khead, B, T, V, device=dev)
                lp = tok_loss(lg0.unsqueeze(0) + SIG['head'] * a, y.unsqueeze(0).expand(Khead, B, T))
                e = estimate(lp.mean(0, keepdim=True) - lp, a, SIG['head'], 0.0)
                gps = fb.predict(e)
                errs, cache, _ = zo_errors(P, x, y, K, Khead, gps=gps, e_given=e, need_halves=bool(args.pw))
            elif fb is not None and args.method == 'apical':
                # e_t needs the head estimate first; compute it from a clean forward + logit jitter
                cache0 = {'x': {}, 'h': {}}
                lg0 = forward(P, x, cache=cache0)
                a = torch.randn(Khead, B, T, V, device=dev)
                lp = tok_loss(lg0.unsqueeze(0) + SIG['head'] * a, y.unsqueeze(0).expand(Khead, B, T))
                e = estimate(lp.mean(0, keepdim=True) - lp, a, SIG['head'], 0.0)
                gps = fb.predict(e)
                errs, cache, _ = zo_errors(P, x, y, K, Khead, gps=gps)
                errs['head'] = e
            else:
                errs, cache, _ = zo_errors(P, x, y, K, Khead)
                e = errs['head']
                gps = fb.predict(e) if fb is not None else None
            if fb is not None:
                fb.update(e, errs)
            if args.method == 'fbonly':
                used = dict(gps); used['head'] = e
                G = weight_grads(used, cache, x)
            elif args.method == 'apical' and args.pw:
                G = precision_weighted(gps, e, cache, x)
            else:
                G = weight_grads(errs, cache, x)
        if step % args.cos_every == 0 and not args.bench:
            Gbp = bp_grads(P, x, y)
            log['cos'].append((step, cosines(G, Gbp)))
            if gps is not None:
                Gfb = weight_grads({**gps, 'head': e}, cache, x)
                log['cos_fb'].append((step, cosines(Gfb, Gbp)))
    with torch.no_grad():
        for k in P:
            mom[k].mul_(args.mom).add_(G[k])
            P[k].sub_(args.lr * mom[k])
    if args.timing and step == 5:
        print(f'time/step {(time.time() - t0) / 6:.3f}s'); break
    if log['val'] and not math.isfinite(log['val'][-1]):
        break

best = min(range(len(log['val'])), key=lambda i: log['val'][i] if math.isfinite(log['val'][i]) else 1e9)
log['best_val'] = log['val'][best]; log['test_at_best'] = log['test'][best]
log['time'] = time.time() - t0
print(f"best val {log['best_val']:.4f} test@best {log['test_at_best']:.4f} time {log['time']:.0f}s")
if args.out:
    json.dump(log, open(args.out, 'w'))
