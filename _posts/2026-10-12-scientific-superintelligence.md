---
layout: post
title: "Scientific superintelligence, what would it take to enhance model reasoning?"
date: 2026-10-12
tag: "Essay"
section: technical
rank: 5
thumb: /assets/images/eval-biology-article/winners-curse.png
permalink: /writing/scientific-superintelligence/
redirect_from:
  - /thinking/scientific-superintelligence/
excerpt: "Reasoning improved fastest where answers are cheap to verify. Science runs the other way, because its verifier is slow and expensive and often missing. I think the bottleneck to scientific superintelligence is knowing when a claim is true."
---

## 1 Introduction

A chess engine and a research group are both searching, and only one of them can tell you quickly whether a move was any good. The engine plays a line, reaches a position, and reads off an evaluation in microseconds. The group runs an experiment, waits weeks, and often learns that the measurement was the wrong one. Both are proposing candidates into a space too large to enumerate. The difference is the cost of the judge.

In this piece I argue that the reasoning progress of the last few years came from the first situation, and that science is the second. Modern reasoning systems are a search with a judge attached, and they improved fastest exactly where a candidate answer is cheap to check. Science inverts the economics, because its judge is an experiment: slow, expensive, and sometimes unavailable while the model is still reasoning. My claim is that the bottleneck to scientific superintelligence is not the reasoner. It is knowing when a claim is true.

### 1.1 Scope

I take no position here on whether a model that cleared this bottleneck would be understanding anything, or on what to call it. The question is functional: which part of the loop currently limits scientific performance, and what would have to be built to move it. Everything below is about the judge.

## 2 Reasoning is propose-and-verify

Strip a modern reasoning system down and you find a search with a judge. The model proposes candidate steps or whole solutions, and a verifier scores them. Training and inference can then both spend compute on many attempts and keep the ones that check out.

Where that judge is cheap and reliable, the loop is extraordinary. A unit test passes or fails. A theorem prover either closes the goal or leaves it open. A game keeps score. You can push a model hard against a signal like that, because the signal stays reliable under pressure. I read the last few years of reasoning progress as mostly a question of where such a signal was cheap to get.

The property that matters is not accuracy in the ordinary sense. It is that the judge keeps its meaning while a search optimizes against it. A test suite does not become easier to pass because a model is trying hard to pass it.

<figure class="ss-fig">
  <div class="ss-wrap"><canvas id="ss-plot"></canvas></div>
  <div class="ss-controls">
    <button id="ss-toggle" type="button">verifier: on</button>
    <span class="ss-readout" id="ss-count">candidates to check: pruned each step</span>
  </div>
  <figcaption><strong>Figure 1: the judge, not the engine, is what makes search tractable.</strong> A reasoning search branches at every step. With a reliable verifier, wrong branches are pruned as they appear and a thin path survives, so the work grows slowly. Turn the verifier off, which is the case for open-ended science, and nothing can be pruned: every branch stays live and the work explodes. The engine is identical in both panels.</figcaption>
</figure>

## 3 Science removes the judge

Now take the loop to a scientific question. Does this mutation change the protein's function? Is this the mechanism behind the disease? The verifier is an experiment. It is slow and costly, and often the model cannot obtain one at all while it reasons.

What the field does instead is substitute: a benchmark, or a learned score, standing in for the measurement. That substitute stops meaning what it claims the moment a search optimizes against it. I have measured three versions of this failure directly.

1. A proxy that looks calibrated in bulk becomes the weakest scorer at the top of the ranking, which is the only region a design campaign ever visits.
2. A number computed correctly supports a conclusion that is wrong, because the quantity being computed was not the quantity in the claim.
3. A verifier operating inside an agent loop certifies a scorer that had memorized its answers.

Together these are why I now read an output score as a projection of the computation rather than as a measurement of the thing. When the judge is unreliable, more search amplifies the error, because the model optimizes the flaw.

This reframes what it would mean to enhance scientific reasoning. The tempting picture is a bigger model thinking harder. The binding constraint sits upstream of that. Without a trustworthy verifier, a more powerful reasoner is a more powerful optimizer of whatever proxy you handed it, and it finds the proxy's shortcut before it finds the science.

## 4 Three ways to build a better judge

If the judge is the bottleneck, the research that matters is the research that builds judges. I see three forms it can take, and they fail in different places.

**Evaluations designed to survive optimization.** A score should be made to face trivial baselines, a top-tail utility test, confound controls, held-out transfer and selection-aware nulls. Passing then requires the science and closes the shortcut. This is the most direct route and the one most often skipped, because the controls usually lower the headline number.

**Interpretability.** Reading the computation behind a claim gives a second channel that does not run through the output score. If a model can show its work in a form we can inspect, its reasoning can be checked internally in the cases where it cannot be checked against the world. The limit is that the instrument itself has to be validated, which is its own measurement problem.

**A halting criterion.** An autonomous scientific agent needs to know when to stop, and when a result is sound enough to report. That is the verifier problem in scheduling form. We measure how well agents search, and we barely measure whether they know when they have finished. Of the three, this is the one we measure least.

## 5 What I expect

Scientific superintelligence, if it arrives, arrives one domain at a time, as the judge in that domain gets cheaper and more trustworthy and the search that already works is pointed at a signal that stays reliable.

Protein design gets there when an in-silico score matches measurement at the top of the ranking, since bulk calibration alone is insufficient. Mechanistic claims get there when they can be tested with something independent of the representation that generated them.

Until then, the most useful thing a reasoning system can do with a scientific claim is the least glamorous one. It can say how the claim would be wrong, and how you would check. Reasoning was the easy part. Knowing when to believe it is the hard one.

<style>
  .ss-fig .ss-wrap { width: 100%; aspect-ratio: 16 / 8.5; background: var(--read-card, #fffdf7); border: 1px solid var(--read-card-edge, #efe7d7); border-radius: 12px; }
  .ss-fig .ss-wrap canvas { width: 100%; height: 100%; display: block; }
  .ss-fig .ss-controls { display: flex; align-items: center; gap: 14px; margin-top: 10px; font-family: var(--sans); font-size: 0.8rem; color: var(--muted); flex-wrap: wrap; }
  .ss-fig .ss-controls button { font-family: var(--sans); font-size: 0.76rem; border: 1px solid var(--accent); color: var(--accent); background: transparent; border-radius: 999px; padding: 4px 15px; cursor: pointer; }
</style>
<script>
(function(){
  var cv=document.getElementById('ss-plot'); if(!cv||!cv.getContext)return;
  var ctx=cv.getContext('2d'); var DPR=Math.min(2,window.devicePixelRatio||1);
  function col(v,f){try{var c=getComputedStyle(document.documentElement).getPropertyValue(v).trim();return c||f;}catch(e){return f;}}
  var D=5, correct=[0,1,0,1,0], verifier=true, t=0;
  var btn=document.getElementById('ss-toggle'), cnt=document.getElementById('ss-count');
  function resize(){var w=cv.clientWidth,h=cv.clientHeight;cv.width=Math.max(1,w*DPR);cv.height=Math.max(1,h*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);}
  function onPath(l,idx){ for(var i=0;i<l;i++){ if(((idx>>(l-1-i))&1)!==correct[i]) return false; } return true; }
  function pos(l,idx,w,h){ var L=42,R=34; var x=L+(l/D)*(w-L-R); var count=Math.pow(2,l); var y=26+((idx+0.5)/count)*(h-66); return {x:x,y:y}; }
  function draw(){
    var w=cv.clientWidth,h=cv.clientHeight; ctx.clearRect(0,0,w,h);
    var acc=col('--accent','#a8324a'); var reveal=Math.min(D,t);
    for(var l=0;l<=D;l++){ if(l>reveal+0.01) continue; var count=Math.pow(2,l);
      for(var idx=0;idx<count;idx++){ var p=pos(l,idx,w,h); var keep=verifier?onPath(l,idx):true;
        if(l>0){ var pp=pos(l-1,idx>>1,w,h); ctx.strokeStyle=keep?'rgba(168,50,74,0.5)':'rgba(154,145,131,0.16)'; ctx.lineWidth=keep?1.6:1; ctx.beginPath(); ctx.moveTo(pp.x,pp.y); ctx.lineTo(p.x,p.y); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(p.x,p.y,keep?4:2.4,0,7); ctx.fillStyle=keep?acc:'rgba(154,145,131,0.28)'; ctx.fill();
      } }
    if(cnt){ cnt.textContent = verifier ? 'candidates to check: grows with depth, pruned each step' : ('candidates to check: 2^depth = '+Math.pow(2,Math.floor(Math.min(D,reveal)))+', nothing to prune'); }
  }
  function loop(){ t+=0.02; if(t>D+1.4) t=0; draw(); requestAnimationFrame(loop); }
  if(btn) btn.addEventListener('click',function(){ verifier=!verifier; btn.textContent='verifier: '+(verifier?'on':'off'); });
  window.addEventListener('resize',resize); resize(); loop();
})();
</script>
