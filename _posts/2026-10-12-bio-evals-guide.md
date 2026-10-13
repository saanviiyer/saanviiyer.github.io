---
layout: post
title: "Bio evals: a benchmarking guide"
date: 2026-10-12
tag: "Guide"
section: technical
thumb: /assets/images/projects/agentevals/selection-decay.png
math: true
permalink: /thinking/bio-evals-guide/
excerpt: "A practical checklist for evaluating a model or a score in biology: beat a trivial baseline, measure utility in the top tail, control the obvious confound, hold whole groups out, and null against the selection, not against random."
---

**TL;DR.** This is the battery I run on any biological score before I trust it, written as a checklist rather than an argument. Five tests, each with the one measurement that exposes the failure it is built to catch: a trivial-baseline test, a top-tail utility test, a confound control, a held-out transfer test, and a selection-aware null. A score that passes its headline benchmark and fails these is not evidence about biology; it is evidence about the benchmark.

## Test 1 — Beat a trivial baseline

Before a score gets credit for understanding, it has to beat the dumbest thing that could work. For a protein variant, that is the number of mutations it carries.

- **Run:** score your variants with the model and with a plain mutation count, within each study, and compare rank correlations to the measured outcome.
- **Fail signal:** the model does not clear the count. On 504 measured PET-hydrolase variants, a zero-shot ESM-2 650M score ranks activity at a within-study Spearman of 0.01, against 0.25 for a mutation count. The expensive model is the weakest scorer on the task it is sold for.
- **Why within-study:** pooling across assays lets between-study offsets masquerade as signal. Always compare inside the unit a campaign would act on.

## Test 2 — Measure utility in the top tail, not in bulk

Benchmarks report a correlation over a whole assay. A campaign keeps the top few candidates. Those are different quantities, and the first stops predicting the second exactly where you use it.

- **Run:** for each benchmark unit, measure the value of the designs selected at a sharp cutoff (top 1%, top 10%), and ask how much the reported correlation predicts that selection value.
- **Fail signal:** the relationship decays as selection sharpens. Reported correlation explains half the variance in top-10% selection value and 16% at top-1%, and some assays with positive correlation give worse-than-random top-1% selections.

<figure class="sd-fig">
  <div class="sd-wrap"><canvas id="sd-plot"></canvas></div>
  <div class="sd-controls">
    <button id="sd-play" type="button">pause</button>
    <input id="sd-slider" type="range" min="1" max="100" value="100" aria-label="Selection cutoff (top k percent)">
    <span class="sd-readout">top <b id="sd-k">100</b>% &middot; variance in selection value explained <b id="sd-r">0.70</b></span>
  </div>
  <figcaption><strong>Correlation decays where selection sharpens.</strong> Slide the cutoff from the whole assay toward the top 1%. The variance in selection value explained by the reported correlation falls from most of it to 0.16, so a leaderboard number that looks predictive in bulk tells you little about the handful of designs a campaign actually keeps. Anchored at the measured 0.50 (top 10%) and 0.16 (top 1%); the rest of the curve is schematic.</figcaption>
</figure>

## Test 3 — Control the obvious confound

If a movement in a representation is reproduced by the plainest property of the input, it is not evidence about the mechanism you are studying.

- **Run:** build a control that preserves the confound (amino-acid composition, sequence length) and destroys the structure you are claiming, and measure how much of the effect survives.
- **Fail signal:** most of it survives the control. A composition-matched scramble reproduces 72% of a mutational signature's steering in embedding space, and protein length alone explains 94.1% of how far sequences move. Whatever is left that is specific to the mechanism is small, and you have to report its size, not just its sign.

## Test 4 — Hold whole groups out

Decodability on familiar examples is the evidence people cite most for understanding, and it is the easiest to overread.

- **Run:** train your probe or policy, then evaluate on entire groups (whole mechanisms, whole families) held out of training, not on random splits.
- **Fail signal:** performance collapses out of distribution. A probe that names a mutational process at an AUC of 0.94 on familiar ones drops to 0.775% top-1 on held-out ones, below a uniform guess. It had memorized a fingerprint, not learned a mechanism. A random split would have hidden this completely.

## Test 5 — Null against the selection, not against random

When a search keeps the top candidate, the right null is not a random draw. Write the score as true quality plus error, \\(s = f^{*} + \varepsilon\\). The kept candidate has the largest error among many, and \\(\mathbb{E}[\max_{i\le n}\varepsilon_i]\\) grows with \\(n\\), so the selected error inflates the score on its own.

- **Run:** compare your selection to a null that mimics the selection procedure at the same budget, and report where the score and the realized quality first separate.
- **Fail signal:** the apparent gain is selected error. This is also why a safety benchmark can be half-answered without reading the question: always choosing the longest of four options scores 46.5% against 25%, so part of any score is an artifact of the options, and the artifact share has to be subtracted before a threshold is keyed to it.

## What to report

For every score, publish the trivial baseline, the top-k utility next to the bulk correlation, the confound control with the size of the surviving effect, the held-out-group result, and the selection-matched null. If a verifier is in the loop, red-team it in a setting where ground truth exists: a leaked scorer can clear a trust gate at AUROC 0.991 and add nothing, so detection and recovery have to be measured separately. None of this is exotic. It is the difference between a number that survives being optimized against and one that was only ever describing a fixed dataset.

<style>
  .sd-fig .sd-wrap { width: 100%; aspect-ratio: 16 / 8.5; background: var(--read-card, #fffdf7); border: 1px solid var(--read-card-edge, #efe7d7); border-radius: 12px; }
  .sd-fig .sd-wrap canvas { width: 100%; height: 100%; display: block; }
  .sd-fig .sd-controls { display: flex; align-items: center; gap: 14px; margin-top: 10px; font-family: var(--sans); font-size: 0.8rem; color: var(--muted); flex-wrap: wrap; }
  .sd-fig .sd-controls button { font-family: var(--sans); font-size: 0.76rem; border: 1px solid var(--accent); color: var(--accent); background: transparent; border-radius: 999px; padding: 4px 15px; cursor: pointer; }
  .sd-fig .sd-controls input[type=range] { flex: 1; min-width: 150px; accent-color: var(--accent); }
  .sd-fig .sd-readout b { color: var(--accent); }
</style>
<script>
(function(){
  var cv=document.getElementById('sd-plot'); if(!cv||!cv.getContext)return;
  var ctx=cv.getContext('2d'); var DPR=Math.min(2,window.devicePixelRatio||1);
  function col(v,f){try{var c=getComputedStyle(document.documentElement).getPropertyValue(v).trim();return c||f;}catch(e){return f;}}
  // r2(k) with k = cutoff percent (1..100). anchors: 100->0.70, 10->0.50, 1->0.16
  function r2(k){ var lk=Math.log10(k); // k=1->0, 10->1, 100->2
    // piecewise-ish smooth: use logistic in lk
    return 0.16 + (0.70-0.16)*(lk/2); }
  var slider=document.getElementById('sd-slider'), btn=document.getElementById('sd-play'), kEl=document.getElementById('sd-k'), rEl=document.getElementById('sd-r');
  var k=100, playing=true, dir=-1;
  function resize(){var w=cv.clientWidth,h=cv.clientHeight;cv.width=Math.max(1,w*DPR);cv.height=Math.max(1,h*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);}
  function X(kk,w){var L=50,R=18; var lk=Math.log10(kk); return L+(1-lk/2)*(w-L-R);} // k=100 left-ish? we want top1% at right
  function Y(v,h){var T=16,B=42;return T+(0.75-v)/0.75*(h-T-B);}
  function draw(){
    var w=cv.clientWidth,h=cv.clientHeight; ctx.clearRect(0,0,w,h);
    var acc=col('--accent','#a8324a'), mut='#9a9183';
    ctx.strokeStyle='#e4dcce'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(X(100,w),Y(0.75,h)); ctx.lineTo(X(100,w),Y(0,h)); ctx.lineTo(X(1,w),Y(0,h)); ctx.stroke();
    ctx.fillStyle=mut; ctx.font='11px Inter,system-ui,sans-serif'; ctx.textAlign='center';
    ctx.save(); ctx.translate(14,h/2); ctx.rotate(-Math.PI/2); ctx.fillText('variance in selection value explained',0,0); ctx.restore();
    ctx.fillText('selection cutoff (whole assay to top 1%)',(X(100,w)+X(1,w))/2,h-12);
    // ticks
    [100,10,1].forEach(function(t){ var x=X(t,w); ctx.fillStyle=mut; ctx.font='10px Inter,system-ui,sans-serif'; ctx.fillText(t==100?'all':('top '+t+'%'), x, h-26); });
    ctx.strokeStyle=acc; ctx.lineWidth=2.5; ctx.beginPath();
    for(var kk=100;kk>=1;kk-=0.5){var x=X(kk,w),y=Y(r2(kk),h); if(kk>=100)ctx.moveTo(x,y); else ctx.lineTo(x,y);} ctx.stroke();
    [[10,'0.50'],[1,'0.16']].forEach(function(an){ var x=X(an[0],w),y=Y(r2(an[0]),h); ctx.fillStyle=mut; ctx.beginPath(); ctx.arc(x,y,3.5,0,7); ctx.fill(); ctx.font='10px Inter,system-ui,sans-serif'; ctx.textAlign='center'; ctx.fillText(an[1], x, y-8); });
    var cx=X(k,w), cy=Y(r2(k),h);
    ctx.setLineDash([4,4]); ctx.strokeStyle='rgba(168,50,74,0.3)'; ctx.beginPath(); ctx.moveTo(cx,Y(0,h)); ctx.lineTo(cx,cy); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(cx,cy,5.5,0,7); ctx.fillStyle=acc; ctx.fill();
    if(kEl) kEl.textContent=Math.round(k); if(rEl) rEl.textContent=r2(k).toFixed(2);
    if(slider&&document.activeElement!==slider) slider.value=String(Math.round(k));
  }
  function loop(){ if(playing){ k+=0.4*dir; if(k<=1){k=1;dir=1;} if(k>=100){k=100;dir=-1;} } draw(); requestAnimationFrame(loop); }
  if(slider) slider.addEventListener('input',function(){playing=false;if(btn)btn.textContent='play';k=+slider.value;});
  if(btn) btn.addEventListener('click',function(){playing=!playing;btn.textContent=playing?'pause':'play';});
  window.addEventListener('resize',resize); resize(); loop();
})();
</script>
