import json, os, subprocess
from concurrent.futures import ThreadPoolExecutor
STEPS = 1000
VAR = {'bp': ['--method', 'bp'], 'dust': ['--method', 'dust'], 'apical': ['--method', 'apical', '--pw', '1'],
       'apicalcv': ['--method', 'apical', '--pw', '0'], 'fbonly': ['--method', 'fbonly']}
def name(m, K, lr, s): return f'results/{m}_K{K}_lr{lr}_s{s}.json'
def run(job):
    m, K, lr, s = job
    out = name(m, K, lr, s)
    if os.path.exists(out): return
    cmd = ['python3', 'apical.py'] + VAR[m] + ['--K', str(max(K, 2)), '--lr', str(lr), '--seed', str(s), '--steps', str(STEPS), '--out', out]
    subprocess.run(cmd, stdout=open(out + '.log', 'w'), stderr=subprocess.STDOUT)
def best_lr(m, K):
    c = [(json.load(open(f))['best_val'], float(f.split('_lr')[1].split('_s')[0])) for f in os.listdir('results') if False]
    c = []
    for lr in [0.003, 0.01, 0.03, 0.1]:
        f = name(m, K, lr, 0)
        if os.path.exists(f): c.append((json.load(open(f))['best_val'], lr))
    return min(c)[1]
def pool(jobs):
    with ThreadPoolExecutor(2) as ex: list(ex.map(run, jobs))
tune = [('dust', 16, 0.003, 0), ('apical', 16, 0.003, 0)] + [('apicalcv', 16, lr, 0) for lr in [0.003, 0.01, 0.03]] \
     + [('apicalcv', 64, lr, 0) for lr in [0.01, 0.03]]
pool(tune); print('tuned', flush=True)
cells = [('bp', 0), ('dust', 16), ('apical', 16), ('apicalcv', 16), ('dust', 64), ('apical', 64), ('apicalcv', 64)]
seeds = [(m, K, best_lr(m, K), s) for m, K in cells for s in [1, 2]]
seeds.sort(key=lambda j: j[1])
pool(seeds); print('done seeds', flush=True)
