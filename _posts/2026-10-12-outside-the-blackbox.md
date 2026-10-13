---
layout: post
title: "We need to think outside the (black)box: why evaluations keep failing, and the case for interpretability"
date: 2026-10-12
tag: "Essay"
section: technical
thumb: /assets/images/eval-biology-article/winners-curse.png
math: true
permalink: /thinking/outside-the-blackbox/
excerpt: "Every output-level evaluation I have stress-tested fails the moment a model or a search optimizes against it. That is not a bug to patch benchmark by benchmark; it is a reason to read what the model computes, not only what it emits."
---

**TL;DR.** I have spent a while trying to break evaluations, and the same thing happens every time: a score looks healthy on a fixed dataset and stops meaning anything the moment a model or a search optimizes against it. A zero-shot protein score ranks below counting mutations. A benchmark correlation stops predicting which designs a campaign should keep. A verifier certifies a scorer that memorized the answers. A safety benchmark can be half-answered without reading the question. These are not four unrelated bugs. They are the same structural fact: an evaluation defined on outputs is gameable and incomplete, because the output is a projection of what the model actually did. The complement is interpretability, reading the computation rather than only the emission, and it is the part I think the field underweights.

## The pattern: scores die where they are used

Start with the mechanism that shows up everywhere, the winner's curse. Write any score as the true quality plus an error term,

$$ s = f^{*} + \varepsilon. $$

On an average example the error is noise and a correlation looks fine. Now let a search keep the highest-scoring candidate out of many. The kept candidate is the one whose error happened to be most favorable, so the error of the selected item is the maximum of many draws, and

$$ \mathbb{E}\!\left[\max_{i \le n}\varepsilon_i\right] \text{ grows with } n. $$

The more you search, the more of the score is error rather than quality. A proxy that looks trustworthy in bulk becomes useless exactly where it is used, at the top of the ranking.

<figure class="wc-fig">
  <div class="wc-wrap"><canvas id="wc-plot"></canvas></div>
  <div class="wc-controls">
    <button id="wc-play" type="button">pause</button>
    <input id="wc-slider" type="range" min="1" max="280" value="1" aria-label="Search budget">
    <span class="wc-readout">selected error <b id="wc-gap">0.0</b></span>
  </div>
  <figcaption><strong>The winner's curse.</strong> Each candidate's proxy is its true quality plus independent error, and a search keeps the highest proxy. As the budget grows, the kept candidate's proxy climbs steeply while its true quality lags, and the gap between them is error, not quality. Drawn from Gaussian quality and Gaussian error, not fit to any dataset; it is the mechanism, not a measurement.</figcaption>
</figure>

This is not a thought experiment. On 504 measured PET-hydrolase variants, a zero-shot ESM-2 650M score ranks activity at a within-study Spearman of 0.01, below a plain mutation count at 0.25; the expensive model is the weakest scorer on the task it is sold for. Reported benchmark correlation explains half the variance in top-10% selection value and only 16% at top-1%, so the number decays exactly as selection sharpens. And when the evaluator becomes a component of an agent, it becomes an attack surface: a scorer that memorizes the measured outcomes clears a trust gate at AUROC 0.991 and adds nothing, because the gate scored it on data it had already seen.

## Why patching benchmarks will not fix this

The usual response is to fix the benchmark: add harder examples, de-duplicate, re-weight. That helps a specific leak and misses the shape of the problem. A safety benchmark makes the point cleanly. On a hazardous-knowledge multiple-choice set, a rule that never reads the question and picks the longest of four options scores 46.5% against 25% chance, and a classifier trained on the answer text alone reaches 34.6%. Part of the score is an artifact of how the options were written, so a model's number is an upper bound on what it knows until that artifact is subtracted, and a drop in the number under an intervention is not by itself evidence that knowledge was removed.

Every one of these failures lives at the output. The score reads a model's emissions, the benchmark summarizes emissions over a corpus, the gate reads emitted outcomes. None of them look at what the model computed to get there. That is the ceiling: an output-level evaluation cannot distinguish a model that solved the task from one that found a shortcut that produces the same output, and a shortcut is exactly what an optimizer finds first.

## The complement: read the computation

Interpretability is the move that steps off the output. Instead of asking whether the model's answer is right, it asks what internal structure produced the answer, and whether that structure is the thing you think it is. I have argued the skeptical half of this elsewhere, that interpretability evidence is easy to overread, and I still believe it. A linear probe that recovers a concept is not proof the model uses that concept: in one case a probe reads a mutational process out of an embedding at an AUC of 0.94 on familiar processes and collapses to 0.775% on held-out ones, so it had memorized a fingerprint, not learned a mechanism. Decodability is the start of an evaluation, not the end.

But the skeptical half is an argument for doing interpretability carefully, not for abandoning it. The constructive version is a white-box evaluation: instead of correlating a model's output with an outcome, ask whether the property of interest is even recoverable from the model's internal activations, and whether that recovery survives a shift to unfamiliar inputs. That question is harder to game than output correlation, because the optimizer would have to install the real structure, not just produce the right emission. It is also the only kind of evaluation that can separate understanding from a shortcut, which is precisely the distinction the output-level failures above keep collapsing.

## What I think this adds up to

I am not claiming interpretability is solved or that it replaces behavioral evaluation. The honest position is narrower and, I think, more useful. Behavioral evaluation is necessary and, on its own, structurally insufficient: it will keep failing under optimization because it reads a projection of the computation. So the evaluations I trust do two things at once. They test the output under the exact pressure the model is put under, with trivial baselines, top-tail utility, confound controls, and held-out transfer. And they test the computation, asking what is recoverable inside the model and whether it survives a distribution shift. The models that matter most will not stay inside the distribution where their scores were calibrated. The evidence we trust about them has to be built to look past the output, which means building the interpretability tools before we need them, not after a score we believed turns out to have been a shortcut all along.

<style>
  .wc-fig .wc-wrap { width: 100%; aspect-ratio: 16 / 8.5; background: var(--read-card, #fffdf7); border: 1px solid var(--read-card-edge, #efe7d7); border-radius: 12px; }
  .wc-fig .wc-wrap canvas { width: 100%; height: 100%; display: block; }
  .wc-fig .wc-controls { display: flex; align-items: center; gap: 14px; margin-top: 10px; font-family: var(--sans); font-size: 0.82rem; color: var(--muted); flex-wrap: wrap; }
  .wc-fig .wc-controls button { font-family: var(--sans); font-size: 0.76rem; border: 1px solid var(--accent); color: var(--accent); background: transparent; border-radius: 999px; padding: 4px 15px; cursor: pointer; }
  .wc-fig .wc-controls input[type=range] { flex: 1; min-width: 150px; accent-color: var(--accent); }
  .wc-fig .wc-readout b { color: var(--accent); }
</style>
<script>
(function(){
  var cv=document.getElementById('wc-plot'); if(!cv||!cv.getContext)return;
  var ctx=cv.getContext('2d'); var DPR=Math.min(2,window.devicePixelRatio||1);
  function col(v,f){try{var c=getComputedStyle(document.documentElement).getPropertyValue(v).trim();return c||f;}catch(e){return f;}}
  var M=280, seed=73, truth=[], proxy=[];
  function rnd(){ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; }
  function randn(){ var u=rnd()||1e-9,v=rnd(); return Math.sqrt(-2*Math.log(u))*Math.cos(6.283185*v); }
  var keptProxy=[], keptTrue=[], bestP=-1e9, bestT=0;
  for(var i=0;i<M;i++){ var t=randn(), e=randn()*1.3, p=t+e; if(p>bestP){bestP=p;bestT=t;} keptProxy.push(bestP); keptTrue.push(bestT); }
  var n=1, playing=true;
  var slider=document.getElementById('wc-slider'), btn=document.getElementById('wc-play'), gap=document.getElementById('wc-gap');
  function resize(){var w=cv.clientWidth,h=cv.clientHeight;cv.width=Math.max(1,w*DPR);cv.height=Math.max(1,h*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);}
  function X(i,w){var L=20,R=16; return L+(i/(M-1))*(w-L-R);}
  var YMIN=-0.5, YMAX=3.6;
  function Y(v,h){var T=16,B=40; return T+(YMAX-v)/(YMAX-YMIN)*(h-T-B);}
  function curve(arr,c,lw,upTo){ ctx.strokeStyle=c; ctx.lineWidth=lw; ctx.beginPath(); var w=cv.clientWidth,h=cv.clientHeight; for(var i=0;i<=upTo;i++){var x=X(i,w),y=Y(arr[i],h); if(i===0)ctx.moveTo(x,y); else ctx.lineTo(x,y);} ctx.stroke(); }
  function draw(){
    var w=cv.clientWidth,h=cv.clientHeight; ctx.clearRect(0,0,w,h);
    var acc=col('--accent','#a8324a'), mut='#9a9183', pink='#cf4d87';
    ctx.strokeStyle='#e4dcce'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(X(0,w),Y(YMIN,h)); ctx.lineTo(X(M-1,w),Y(YMIN,h)); ctx.stroke();
    ctx.fillStyle=mut; ctx.font='11px Inter,system-ui,sans-serif'; ctx.textAlign='center';
    ctx.fillText('candidates searched (budget)', w/2, h-12);
    var idx=Math.max(0,Math.min(M-1,n-1));
    curve(keptProxy, pink, 2.5, idx);
    curve(keptTrue, acc, 2.5, idx);
    var px=X(idx,w), py=Y(keptProxy[idx],h), ty=Y(keptTrue[idx],h);
    ctx.setLineDash([3,3]); ctx.strokeStyle='rgba(168,50,74,0.4)'; ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(px,ty); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(px,py,4.5,0,7); ctx.fillStyle=pink; ctx.fill();
    ctx.beginPath(); ctx.arc(px,ty,4.5,0,7); ctx.fillStyle=acc; ctx.fill();
    ctx.textAlign='left'; ctx.font='600 11px Inter,system-ui,sans-serif';
    ctx.fillStyle=pink; ctx.fillText('proxy of kept candidate', Math.min(px+8,w-160), py-6);
    ctx.fillStyle=acc; ctx.fillText('true quality', Math.min(px+8,w-90), ty+14);
    var g=keptProxy[idx]-keptTrue[idx]; if(gap) gap.textContent=g.toFixed(2);
    if(slider&&document.activeElement!==slider) slider.value=String(n);
  }
  function loop(){ if(playing){ n+=1.4; if(n>=M){n=1;} } draw(); requestAnimationFrame(loop); }
  if(slider) slider.addEventListener('input',function(){playing=false;if(btn)btn.textContent='play';n=+slider.value;});
  if(btn) btn.addEventListener('click',function(){playing=!playing;btn.textContent=playing?'pause':'play';});
  window.addEventListener('resize',resize); resize(); loop();
})();
</script>
