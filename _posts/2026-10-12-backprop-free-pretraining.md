---
layout: post
title: "Backprop-free pretraining with biological feedback"
date: 2026-10-12
tag: "Research"
section: technical
thumb: /assets/images/apical-dust/thumb.png
math: true
permalink: /thinking/backprop-free-pretraining/
excerpt: "Dust pretrains transformers with noise instead of a backward pass, and pays for it in variance. Adding one piece of cortical machinery cuts that variance for free, and along the way shows that Dust's own way of shortlisting hyperparameters ranks estimators backwards."
---

**TL;DR.** Dust is the first zeroth-order method competitive with backpropagation at pretraining transformers: it replaces the backward pass with noise, a reward, and a local update. Its one cost is variance, which it buys down by spending compute on a larger population. I added a biological mechanism, top-down feedback onto an apical dendrite, that cuts the variance for free at small populations. Two results from that study matter beyond the biology, and both are about how Dust is built and tuned. First, Dust's practice of ranking estimators by single-batch cosine to backpropagation ranks them backwards, and a one-line averaging test fixes it. Second, Dust gives future-token credit only to attention internals, which stalls the token-embedding gradient; crediting the embedding directly lowers test loss. These are small-scale mechanisms, not scaling claims, but they are the kind of thing worth checking before scaling.

## Why this is about Dust, not just the brain

My background is in neuroscience, and Dust looked familiar. It injects Gaussian noise into every layer's output, scores each token's noise by how much it lowered the loss, and forms the weight gradient from the reward-weighted noise. That is three-factor plasticity: presynaptic activity, postsynaptic activity, and a neuromodulatory reward. The appeal for machine learning is concrete. A single forward pass tests thousands of perturbations at once, with no backward pass and no weight transport, which is why it is competitive at pretraining where other zeroth-order methods are not.

The cost is variance. With a population of \\(K\\) draws and a \\(d\\)-dimensional layer output, the noise in the per-token estimate scales roughly with \\(d/K\\), and Dust reduces it by raising \\(K\\), which costs compute. So the useful question for anyone scaling Dust is not whether it is biological, it is whether some cheaper mechanism can remove the same variance. That is what the cortical feedback pathway does.

## The mechanism, briefly

Cortical pyramidal neurons take bottom-up input on their basal dendrites and top-down feedback on a separate apical dendrite, and several models treat the apical signal as a local, learned, approximate error. Lansdell, Prakash and Kording (2020) showed the brain could learn that feedback from noise and reward, which Dust already has. Apical adds the pathway: for each module \\(m\\), a feedback matrix \\(B_m\\) maps the network's output error \\(e_t\\) to a predicted gradient \\(B_m e_t\\), where \\(e_t\\) is itself a zeroth-order estimate from jittering the cached logits, and \\(B_m\\) is fit online by regressing Dust's noisy gradient estimates on \\(e_t\\).

Used as a control variate, the prediction is subtracted, only the remainder is estimated from noise, and the prediction is added back. In expectation the correction cancels the prediction, so the estimate stays unbiased for any \\(B_m\\), and a poor feedback map cannot hurt the expected update. Its noise now scales with the size of the remainder rather than with the full gradient. The payoff is exactly where Dust is most expensive: test loss improves over Dust in all six seed-paired runs at \\(K=16\\) and \\(K=64\\) (by 0.012 and 0.010 nats per character), at about the same wall-clock cost per step, and the gain is gone by \\(K=256\\), precisely as variance reduction predicts.

## The result Dust's authors should care about most

Here is the finding I would put in front of the Dust team. The Dust paper shortlists hyperparameters by measuring the cosine similarity between an estimator's update and the true backpropagation gradient on a single batch. That statistic ranked my estimators backwards.

A feedback-weighted estimator triples per-step cosine on the MLP, from 0.26 to 0.78 at \\(K=16\\), and still trains worse, by 0.044 nats. The reason is that its error points the same way every step, and momentum sums that bias up over training. A single-batch cosine cannot see this, because on any one step the biased estimator does point close to the gradient. What separates bias from noise is averaging: average each estimator's updates over many batches and compare the average to backpropagation. Noise averages out and reveals the unbiased estimator; a biased estimator's average stays stuck at an angle no matter how many batches you add.

<figure class="cm-fig">
  <div class="cm-wrap"><canvas id="cm-plot"></canvas></div>
  <div class="cm-controls">
    <button id="cm-play" type="button">pause</button>
    <input id="cm-slider" type="range" min="1" max="200" value="1" aria-label="Number of batches averaged">
    <span class="cm-readout">averaged cosine to backprop &middot; feedback-weighted <b id="cm-a">0.00</b> &middot; control variate <b id="cm-b">0.00</b></span>
  </div>
  <figcaption><strong>Why single-batch cosine misleads.</strong> Both estimators are noisy, so on one batch the feedback-weighted update (pink) often points closer to the true backprop gradient (grey) than the unbiased control variate (berry). Average the updates over many batches and it flips: the control variate's average converges onto the gradient, while the feedback-weighted average stays locked at an angle, because its error is a bias, not noise. Vectors are schematic; the backwards ranking and the averaging fix are the measured result.</figcaption>
</figure>

This matters because it changes a decision Dust makes for real. If single-batch cosine is the filter used to pick which estimator or hyperparameter to scale, it will prefer the biased one, which looks aligned every step and quietly accumulates error through momentum. The averaging test costs one extra loop and gives the right ordering.

## The improvement to Dust's credit assignment

The second result is a change to the algorithm itself. In the Dust paper, future-token credit reaches only the attention internals, not the token embedding. My averaging test shows the consequence: the embedding gradient stalls at cosine 0.71 to backpropagation and cannot improve past it, because it never receives the part of the error that later tokens carry. Crediting the embedding for later tokens raises the stall point to 0.78 and lowers test loss by about 0.03 nats at \\(K=64\\) and \\(K=256\\). It is a small, local fix with a measurable effect, and it is exactly the kind of credit-assignment gap that compounds at depth and length.

## Honest scope

Backpropagation is still ahead at this scale: it reaches 2.394 nats against 2.443 for the best Dust at \\(K=256\\). Every result here comes from a two-layer, character-level model trained on 512k tokens, so they are mechanisms, not scaling results. What I would check at Dust's scale is whether the control-variate gain holds where variance, not optimization, is the binding constraint; whether the embedding-credit fix compounds with depth and context length; and whether the averaging test re-orders any of the hyperparameter choices the paper made by single-batch cosine. None of those need the brain to be correct. They need Dust to be measured with a statistic that can tell bias from noise.

<style>
  .cm-fig .cm-wrap { width: 100%; aspect-ratio: 16 / 8.5; background: var(--read-card, #fffdf7); border: 1px solid var(--read-card-edge, #efe7d7); border-radius: 12px; }
  .cm-fig .cm-wrap canvas { width: 100%; height: 100%; display: block; }
  .cm-fig .cm-controls { display: flex; align-items: center; gap: 14px; margin-top: 10px; font-family: var(--sans); font-size: 0.8rem; color: var(--muted); flex-wrap: wrap; }
  .cm-fig .cm-controls button { font-family: var(--sans); font-size: 0.76rem; border: 1px solid var(--accent); color: var(--accent); background: transparent; border-radius: 999px; padding: 4px 15px; cursor: pointer; }
  .cm-fig .cm-controls input[type=range] { flex: 1; min-width: 150px; accent-color: var(--accent); }
  .cm-fig .cm-readout b { color: var(--accent); }
</style>
<script>
(function(){
  var cv=document.getElementById('cm-plot'); if(!cv||!cv.getContext)return;
  var ctx=cv.getContext('2d'); var DPR=Math.min(2,window.devicePixelRatio||1);
  function col(v,f){try{var c=getComputedStyle(document.documentElement).getPropertyValue(v).trim();return c||f;}catch(e){return f;}}
  var seed=11; function rnd(){seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;}
  function randn(){var u=rnd()||1e-9,v=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(6.283185*v);}
  var MAXN=200, A=[], B=[]; // precompute per-batch sample vectors
  var biasAng=0.68; // ~0.78 cosine target for feedback-weighted average
  for(var i=0;i<MAXN;i++){
    // feedback-weighted: true*cos + bias component + noise -> biased average
    A.push({x: 0.9+randn()*0.55, y: Math.sin(biasAng)*0.9 + randn()*0.55});
    // control variate: true + larger noise -> unbiased average, noisy per-step
    B.push({x: 1.0+randn()*0.95, y: randn()*0.95});
  }
  var n=1, playing=true;
  var slider=document.getElementById('cm-slider'), btn=document.getElementById('cm-play'), ca=document.getElementById('cm-a'), cb=document.getElementById('cm-b');
  function resize(){var w=cv.clientWidth,h=cv.clientHeight;cv.width=Math.max(1,w*DPR);cv.height=Math.max(1,h*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);}
  function avg(arr,k){var sx=0,sy=0;for(var i=0;i<k;i++){sx+=arr[i].x;sy+=arr[i].y;}return {x:sx/k,y:sy/k};}
  function cosTo(v){var m=Math.hypot(v.x,v.y)||1e-9;return v.x/m;}
  function arrow(cx,cy,vx,vy,scale,c,lw){var ex=cx+vx*scale,ey=cy-vy*scale;ctx.strokeStyle=c;ctx.fillStyle=c;ctx.lineWidth=lw;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(ex,ey);ctx.stroke();var a=Math.atan2(cy-ey,ex-cx);ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(ex-9*Math.cos(a-0.4),ey+9*Math.sin(a-0.4));ctx.lineTo(ex-9*Math.cos(a+0.4),ey+9*Math.sin(a+0.4));ctx.closePath();ctx.fill();}
  function draw(){
    var w=cv.clientWidth,h=cv.clientHeight; ctx.clearRect(0,0,w,h);
    var acc=col('--accent','#a8324a'), pink='#cf4d87', mut='#b7ad9c';
    var cx=w*0.18, cy=h*0.56, S=Math.min(w*0.5,h*0.7);
    var k=Math.max(1,Math.min(MAXN,Math.round(n)));
    // faint recent samples
    ctx.globalAlpha=0.16;
    for(var i=Math.max(0,k-18);i<k;i++){ arrow(cx,cy,A[i].x,A[i].y,S*0.5,pink,1); arrow(cx,cy,B[i].x,B[i].y,S*0.5,acc,1); }
    ctx.globalAlpha=1;
    // true gradient (unit right)
    arrow(cx,cy,1,0,S,mut,3);
    ctx.fillStyle=mut; ctx.font='600 12px Inter,system-ui,sans-serif'; ctx.textAlign='left';
    ctx.fillText('true backprop gradient', cx+S*1.0-6, cy-8);
    var aA=avg(A,k), aB=avg(B,k);
    arrow(cx,cy,aA.x,aA.y, S/Math.max(1,Math.hypot(aA.x,aA.y)), pink,3);
    arrow(cx,cy,aB.x,aB.y, S/Math.max(1,Math.hypot(aB.x,aB.y)), acc,3);
    var cA=cosTo(aA), cB=cosTo(aB);
    if(ca) ca.textContent=cA.toFixed(2); if(cb) cb.textContent=cB.toFixed(2);
    ctx.textAlign='left'; ctx.font='600 11px Inter,system-ui,sans-serif';
    ctx.fillStyle=pink; ctx.fillText('feedback-weighted (biased)', w*0.58, h*0.3);
    ctx.fillStyle=acc; ctx.fillText('control variate (unbiased)', w*0.58, h*0.3+18);
    ctx.fillStyle=mut; ctx.font='11px Inter,system-ui,sans-serif'; ctx.fillText('batches averaged: '+k, w*0.58, h*0.3+40);
    if(slider&&document.activeElement!==slider) slider.value=String(k);
  }
  function loop(){ if(playing){ n+=0.9; if(n>=MAXN){n=1;} } draw(); requestAnimationFrame(loop); }
  if(slider) slider.addEventListener('input',function(){playing=false;if(btn)btn.textContent='play';n=+slider.value;});
  if(btn) btn.addEventListener('click',function(){playing=!playing;btn.textContent=playing?'pause':'play';});
  window.addEventListener('resize',resize); resize(); loop();
})();
</script>
