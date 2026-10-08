# Apical Dust

Code and results for the post "Apical Dust: a learned feedback pathway for training transformers without a backward pass", an independent follow-up to Q Labs' [Dust](https://qlabs.sh/research/dust). Not affiliated with Q Labs.

Everything runs on one laptop GPU (Apple MPS by default; pass `--device cpu` or `--device cuda` otherwise). Requires Python 3 with PyTorch.

## Data

Character-level tiny Shakespeare, not included here:

    mkdir -p data
    curl -o data/input.txt https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt

## Files

| File | What it does |
|---|---|
| `apical.py` | Model, Dust, Apical and backprop training. `--method {bp,dust,apical,fbonly}`; `--pw 1` is precision-weighted Apical, `--pw 0` the unbiased control variate. `--fast 1` removes redundant work (same math, different random stream). `--bench N` times N steady-state steps. |
| `probe.py` | Figure 1: per-step cosine to backprop against population, on a backprop checkpoint. |
| `bias.py` | Figure 2: averages N independent estimates on one batch to separate noise from bias. Writes `results/bias.json`. |
| `sweep.py`, `sweep_lib.py` | K = 16 and 64 sweep: learning-rate tuning on seed 0, then seeds 1 and 2. |
| `sweep256.py` | K = 256 rung, same protocol. |
| `bench.sh`, `bench2.log` | Timing benchmark. `bench2.log` holds the interleaved Dust vs optimized Apical timings used in the post. |
| `figs.py` | Builds the SVG figures and prints the summary table and paired differences. |
| `build_blog.py` | Builds the post's HTML from `results/`. |
| `results/` | One JSON per run (`{method}_K{population}_lr{rate}_s{seed}.json`) with validation and test curves and gradient cosines, plus `bias.json`. |

## Reproduce

    python3 sweep.py          # K = 16, 64 (several hours)
    python3 sweep256.py       # K = 256 (several more hours)
    python3 probe.py '{"bp_steps":300,"lr":0.03,"Ks":[16,64,256],"fit_steps":40,"eval_batches":4}'
    python3 bias.py
    python3 figs.py           # summary table

Method names in `results/`: `dust`, `apicalcv` (unbiased control variate), `apical` (precision-weighted), `fbonly` (feedback only), `bp` (backprop). The `apicalfast` run checks the `--fast 1` path on one seed.
