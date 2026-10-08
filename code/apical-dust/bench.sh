#!/bin/sh
# solo steady-state timing, run after the sweep has finished
until grep -q "done seeds" sweep256.log; do sleep 30; done
for K in 16 64 256; do
  echo "K=$K dust $(python3 apical.py --method dust --K $K --bench 20 | grep BENCH)"
  echo "K=$K apical_orig $(python3 apical.py --method apical --pw 0 --K $K --bench 20 | grep BENCH)"
  echo "K=$K apical_fast $(python3 apical.py --method apical --pw 0 --fast 1 --K $K --bench 20 | grep BENCH)"
done
python3 apical.py --method apical --pw 0 --fast 1 --K 16 --lr 0.01 --seed 0 --steps 1000 --out results/apicalfast_K16_lr0.01_s0.json | tail -1
echo BENCH_DONE
