from sweep_lib import run, best_lr, pool
pool([(m, 256, lr, 0) for m in ['dust', 'apicalcv'] for lr in [0.01, 0.03]]); print('tuned', flush=True)
pool([(m, 256, best_lr(m, 256), s) for m in ['dust', 'apicalcv'] for s in [1, 2]]); print('done seeds', flush=True)
