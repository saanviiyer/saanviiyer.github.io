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

**TL;DR.** I think the reasoning gains of the last few years came from domains where a candidate answer is cheap to check. Math has proofs and code has test suites, and games keep score. You can let a model propose many reasoning paths and keep the ones a verifier accepts, and search plus a cheap verifier is most of what reasoning has meant. Science breaks the recipe, because the verifier is the experiment. An experiment is slow and expensive, and sometimes you cannot run it at all while the model is reasoning. So I think the path to models that do science runs through verifiers for open-ended claims. That is the same problem as building an evaluation that still means something once a model optimizes against it. The reasoning engine is ready, and the "is this true" oracle is the bottleneck.

## Reasoning is propose-and-verify

Strip a modern reasoning system down and you find a search with a judge. The model proposes candidate steps or whole solutions, and a verifier scores them. Training and inference can then both spend compute on many attempts and keep the ones that check out. **Where that judge is cheap and reliable, the loop is extraordinary.** A unit test passes or fails, and a theorem prover either closes the goal or leaves it open. You can push the model hard against a signal like that because the signal stays reliable. I read the last few years of reasoning progress as mostly a matter of where that reliable signal was cheap to get.

<figure class="ss-fig">
  <div class="ss-wrap"><canvas id="ss-plot"></canvas></div>
  <div class="ss-controls">
    <button id="ss-toggle" type="button">verifier: on</button>
    <span class="ss-readout" id="ss-count">candidates to check: pruned each step</span>
  </div>
  <figcaption><strong>The verifier is what makes search tractable.</strong> A reasoning search branches at every step. With a reliable verifier, wrong branches are pruned as they appear and only a thin path survives, so the work grows slowly. Turn the verifier off, the case for open-ended science, and nothing can be pruned. Every branch stays live and the work explodes. The engine is the same. The judge is what changes.</figcaption>
</figure>

## Science removes the judge

Now take the loop to a scientific question. Does this mutation change the protein's function? Is this the mechanism behind the disease? Here the verifier is an experiment. It is slow and costly, and sometimes the model cannot get one at all while it reasons. Worse, the field usually stands in for the experiment with a benchmark or a learned score. That kind of judge stops meaning what it claims the moment a search optimizes against it. A proxy that looked fine in bulk becomes the weakest scorer at the top of a ranking. A correctly computed number supports a wrong conclusion. A verifier inside an agent loop certifies a scorer that memorized the answers. I measured each of these myself, and together they are why I now read an output score as a projection of the computation. **When the judge is unreliable, more search amplifies the error, because the model optimizes the flaw.**

To me this reframes what it means to enhance scientific reasoning. It is tempting to picture a bigger model thinking harder, but I think the binding constraint sits upstream of that. Without a trustworthy verifier, **a more powerful reasoner is a more powerful optimizer of whatever proxy you handed it**, and it will find the proxy's shortcut before it finds the science. What we still need is cheap, reliable verification of open-ended claims.

If the judge is the bottleneck, then the research that matters is the research that builds better judges. I think that research takes three forms. The first is evaluations designed to survive optimization. Their scores should face trivial baselines and a top-tail utility test. They also need confound controls, held-out transfer and selection-aware nulls, so that passing them takes the science and closes the shortcut. The second is interpretability, which reads the computation behind a claim and goes beyond the claim itself. If a model can show its work in a form we can inspect, we can verify its reasoning internally when we cannot check it against the world. The third is a halting criterion. **An autonomous scientific agent needs to know when to stop and when a result is sound**, and that is the verifier problem in a scheduling form. We measure how well agents search, and we barely measure whether they know when they have finished. Of the three, I think the halting criterion is the one we measure least.

## What I actually expect

I expect scientific superintelligence to arrive, if it does, one domain at a time. It arrives as the judge gets cheaper and more trustworthy and as we point the search that already works at a signal that stays reliable. **Bulk calibration alone is insufficient for protein design.** Protein design gets there when an in-silico score matches measurement at the top of the ranking. Mechanistic claims get there when we can test them with something independent of the representation that generated them. Until then, I think the most important thing a reasoning system can do about a scientific claim is the least glamorous one. It should say how the claim would be wrong and how you would check. Reasoning was the easy part, and knowing when to believe it is the hard one.

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
