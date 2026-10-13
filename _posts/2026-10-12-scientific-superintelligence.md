---
layout: post
title: "Scientific superintelligence: what would it take to enhance model reasoning?"
date: 2026-10-12
tag: "Essay"
section: technical
thumb: /assets/images/eval-biology-article/winners-curse.png
permalink: /thinking/scientific-superintelligence/
excerpt: "Reasoning improved fastest where answers are cheap to verify. Science is the opposite: the verifier is slow, expensive, and often absent. The bottleneck to scientific superintelligence is not search, it is knowing when a claim is true."
---

**TL;DR.** The reasoning gains of the last few years came from domains where a candidate answer is cheap to check: math has a proof, code has a test suite, a game has a score. You can let a model propose many reasoning paths and keep the ones a verifier accepts, and search plus a cheap verifier is most of what "reasoning" has meant. Science breaks the recipe, because the verifier is the experiment, which is slow, expensive, and sometimes impossible at the moment of reasoning. So the path to models that do real science is not mainly more search or more parameters. It is building verifiers for open-ended claims, which is the same problem as making an evaluation that still means something once a model optimizes against it. The reasoning engine is not the bottleneck; the "is this true" oracle is.

## Reasoning is propose-and-verify

Strip a modern reasoning system down and it is a search with a judge. The model proposes candidate steps or whole solutions, and a verifier scores them, so training and inference can both spend compute generating many attempts and keeping the ones that check out. Where that judge is cheap and reliable, the loop is extraordinary: a unit test either passes or it does not, a theorem prover either closes the goal or it does not, and the model can be pushed hard against a signal that does not lie.

<figure class="ss-fig">
  <div class="ss-wrap"><canvas id="ss-plot"></canvas></div>
  <div class="ss-controls">
    <button id="ss-toggle" type="button">verifier: on</button>
    <span class="ss-readout" id="ss-count">candidates to check: pruned each step</span>
  </div>
  <figcaption><strong>The verifier is what makes search tractable.</strong> A reasoning search branches at every step. With a reliable verifier, wrong branches are pruned as they appear and only a thin path survives, so the work grows slowly. Turn the verifier off, the case for open-ended science, and nothing can be pruned: every branch stays live and the work explodes. The engine is the same; the judge is what changes.</figcaption>
</figure>

## Science removes the judge

Now take the loop to a real scientific question. Does this mutation change the protein's function? Is this the mechanism behind the disease? The honest verifier is an experiment, and it is slow, costly, and sometimes unavailable at the time the model is reasoning. Worse, the field's usual stand-in for the experiment, a benchmark or a learned score, is exactly the kind of judge that stops meaning what it claims the moment a search optimizes against it. A proxy that looked fine in bulk becomes the weakest scorer at the top of a ranking; a correctly computed number supports a wrong conclusion; a verifier inside an agent loop certifies a scorer that memorized the answers. When the judge is unreliable, more search does not help, it amplifies the error, because the model optimizes the flaw.

This reframes what "enhancing scientific reasoning" means. It is tempting to picture a bigger model thinking harder. The binding constraint is upstream of that: without a trustworthy verifier, a more powerful reasoner is a more powerful optimizer of whatever proxy you handed it, and it will find the proxy's shortcut before it finds the science. The capability that is actually missing is cheap, robust verification of open-ended claims.

## So the work is in the verifier

If the judge is the bottleneck, the research that matters is the research that builds better judges, and I think it looks like three things. First, evaluations designed to survive optimization: scores tested with trivial baselines, top-tail utility, confound controls, held-out transfer, and selection-aware nulls, so that passing them requires the real thing and not a shortcut. Second, interpretability, reading the computation that produced a claim rather than only the claim, because a model that can show its work in an inspectable way is one whose reasoning you can verify internally when you cannot verify it against the world. Third, a halting criterion: an autonomous scientific agent needs to know when to stop and when a result is real, and that is just the verifier problem wearing a scheduling hat. We measure how well agents search; we barely measure whether they know when they are done.

## What I actually expect

I do not think scientific superintelligence arrives as one model that is suddenly much smarter. I think it arrives, if it does, as the judge gets cheaper and more trustworthy, one domain at a time, and the search that already works gets pointed at a signal that does not lie. Protein design gets there when an in-silico score is calibrated against measurement at the top of the ranking, not just in bulk. Mechanistic claims get there when we can test them with something independent of the representation that generated them. Until then, the most important thing a reasoning system can do about a scientific claim is the least glamorous: say how it would be wrong, and how you would check. The reasoning was never the hard part. Knowing when to believe it is.

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
