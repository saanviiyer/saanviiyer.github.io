---
layout: post
title: "Brain-like algorithms: can they solve continual learning and catastrophic forgetting?"
date: 2026-10-12
tag: "Essay"
section: technical
thumb: /assets/images/engram-continual-learning/locality.png
math: true
permalink: /thinking/brain-like-algorithms/
excerpt: "The brain does not run backpropagation, which keeps the hope alive that biologically plausible learning rules forget less. On a fair comparison they do not: locality is worth 0.21 points, replay is worth 10.6."
---

**TL;DR.** The brain does not learn by backpropagation, which has kept biologically plausible learning rules alive as a candidate cure for catastrophic forgetting: if credit assignment were local, maybe a network would stop overwriting old skills. I tested that hope on class-incremental Split-CIFAR-10 with a fair comparison, and it does not hold. Once each rule is matched to backpropagation at the same learning accuracy, the retention advantage of locality is 0.21 points, while an explicit replay buffer adds 10.6. Locality is not the lever; rehearsal is. A separate experiment, adding one more piece of cortical machinery to a backprop-free learner, helps a little at about the same compute, which points at a more constructive version of the question.

## The brain does not run backprop

During the NeuroAI track of the Neuromatch program I kept circling the same point from systems neuroscience: the cortex has no clean way to run a backward pass. Backpropagation needs two things a biological circuit does not obviously have. It needs the backward path to use the exact transpose of the forward weights, the weight-transport problem, and it needs a global error signal threaded precisely backwards through every layer. Real synapses update from local quantities instead: roughly presynaptic activity, postsynaptic activity, and a neuromodulatory third factor that stands in for reward or surprise. That is three-factor plasticity, and it is local in both space and time.

This gap is usually framed as a problem for biological realism. It is just as interesting as a question about machine learning. If the brain learns continually, across a lifetime, without a replay buffer of every experience and without a global backward pass, then whatever it is doing is a candidate solution to a problem deep learning still struggles with. A standard network trained on a new task overwrites the weights that encoded the old one, and accuracy on the old task collapses. That is catastrophic forgetting, and it is the reason a deployed model cannot simply keep learning.

## The hope, stated precisely

The appealing version of the hope is that locality itself buys retention. A backpropagation update couples every weight to every other through the global error, so learning a new task can move any weight that mattered for an old one. A local rule only moves a weight based on signals available at that synapse, so, the intuition goes, it should disturb unrelated structure less and forget less. Feedback alignment, direct feedback alignment, and predictive coding are the usual bio-plausible candidates, and all three have been reported to forget less than backpropagation.

The trouble with that literature is a confound hiding in plain sight. A rule that learns each new task less well also has less to forget. If a method only reaches 70% on the new task where backpropagation reaches 90%, it has written less into the shared weights, so of course it overwrites less of the old task. Read on its own, its "better retention" is partly just weaker learning. You cannot compare forgetting across methods until you hold learning fixed.

## The instrument: fix learning first

So the first thing to build is not a model, it is a measuring instrument. I weakened backpropagation along a ladder of settings, fewer steps, smaller capacity, and so on, and measured backward transfer, how much accuracy on earlier tasks moves, as a function of how well the new task was learned. Across that ladder, backward transfer is almost a deterministic function of learning accuracy, with an $R^2$ of 0.995. That tight relationship is the instrument: it tells me, for any learning accuracy, what backward transfer a plain backpropagation baseline already achieves, and it sets how small a difference I can resolve, a held-out error of 1.09 points.

<figure class="ba-fig">
  <div class="ba-wrap"><canvas id="ba-plot"></canvas></div>
  <div class="ba-controls">
    <button id="ba-play" type="button">pause</button>
    <input id="ba-slider" type="range" min="62" max="90" value="90" aria-label="Accuracy at which the baseline is compared">
    <span class="ba-readout">apparent edge of locality <b id="ba-edge">+4.3</b> pts</span>
  </div>
  <figcaption><strong>The fair comparison.</strong> Backward transfer falls along one curve as a network learns each task better, so comparing a local rule against backpropagation trained to a higher accuracy makes the rule look like it forgets less. Slide the baseline down to the rule's own learning accuracy and the apparent edge collapses to the measured +0.21 points, while replay stays about 10.6 points above the curve. Axes are schematic; the matched edge (+0.21) and replay (+10.6) are measured on class-incremental Split-CIFAR-10.</figcaption>
</figure>

With the instrument in hand, the comparison is honest: score each rule against backpropagation at the same learning accuracy, tuning the baseline as hard as the rule.

## What actually survives

Matched this way, the bio-plausible rules stop looking special. Feedback alignment and direct feedback alignment are indistinguishable from backpropagation. Predictive coding retains 0.21 points more, with a 95% interval of [+0.11, +0.31], about a fifth of the instrument's own resolution, so any retention advantage from locality on this protocol stays under a third of a point. The thing people reach for, locality of credit assignment, is not the thing that reduces forgetting.

What does reduce forgetting is embarrassingly old-fashioned. Adding a replay buffer, which simply rehearses a small sample of earlier data while learning the new task, adds 10.6 points of retention, about fifty times the local-rule effect. Rehearsal, not biological credit assignment, is what moves the number. This matches a plain reading of the brain too: the hippocampus replays experience during rest and sleep, and replay is arguably the most clearly established biological mechanism for not forgetting.

The honest conclusion from the continual-learning side is therefore a negative one, and it is worth stating cleanly because the opposite is so often assumed: a learning rule being local, or being "brain-like" in its credit assignment, does not by itself solve catastrophic forgetting. If your method claims to, the first question to ask is whether it was compared to backpropagation at matched learning.

## A more constructive question

A negative result on one framing is an invitation to change the framing. Instead of asking whether locality prevents forgetting, ask whether adding a piece of cortical machinery to a backprop-free learner makes it train better in the first place. That is where my follow-up on Q Labs' Dust comes in. Dust is the first zeroth-order method competitive with backpropagation at pretraining transformers, and at heart it is a biologically flavored rule: noise in the activations, a reward signal, and a local update, the same three ingredients as three-factor plasticity, with no backward pass at all.

I added one more cortical ingredient: top-down feedback onto apical dendrites. Each layer gets a learned linear prediction of its own output error from the network's output error, estimated from forward passes only, so nothing in the method restores the backward pass. Used as an unbiased control variate, the feedback leaves Dust's gradient estimate unbiased and lowers its variance. The result is a small but consistent win: test loss improves over Dust in all six seed-paired runs at small populations, by 0.012 at $K=16$ and 0.010 at $K=64$ nats per character, and with redundant work removed an Apical step costs about the same wall-clock time as a Dust step. Fixing how Dust credits its own embeddings and attention first, then adding the feedback, raised the gain at $K=16$ to 0.020.

The lesson I take across both experiments is not that brain-like algorithms are a dead end. It is that "brain-like" has to be made specific before it means anything. Locality of credit assignment, tested fairly, does not buy retention. Rehearsal does. And adding concrete cortical structure to a backprop-free learner can help it train, at matched compute, which is the version of the question I find most worth pushing on next.

## Limitations

The continual-learning result is scoped to class-incremental Split-CIFAR-10 with a growing head, which sits near a retention floor, and the architectures compared are feedforward convolutional networks, so this speaks to credit-assignment rules under this protocol rather than to recurrent or sequential ones. A wider-window replication is the obvious next step. The apical result is a demonstration on a specific backprop-free rule at small model scale, and the feedback it adds is a control variate, not a return of the backward pass. Neither experiment licenses a claim about the brain itself; they are claims about what specific brain-inspired mechanisms do inside specific networks, measured against a baseline tuned as hard as the method.

<style>
  .ba-fig .ba-wrap { width: 100%; aspect-ratio: 16 / 8.5; background: var(--read-card, #fffdf7); border: 1px solid var(--read-card-edge, #efe7d7); border-radius: 12px; }
  .ba-fig .ba-wrap canvas { width: 100%; height: 100%; display: block; }
  .ba-fig .ba-controls { display: flex; align-items: center; gap: 14px; margin-top: 10px; font-family: var(--sans); font-size: 0.82rem; color: var(--muted); flex-wrap: wrap; }
  .ba-fig .ba-controls button { font-family: var(--sans); font-size: 0.76rem; border: 1px solid var(--accent); color: var(--accent); background: transparent; border-radius: 999px; padding: 4px 15px; cursor: pointer; }
  .ba-fig .ba-controls input[type=range] { flex: 1; min-width: 150px; accent-color: var(--accent); }
  .ba-fig .ba-readout b { color: var(--accent); }
</style>
<script>
(function(){
  var cv=document.getElementById('ba-plot'); if(!cv||!cv.getContext)return;
  var ctx=cv.getContext('2d'); var DPR=Math.min(2,window.devicePixelRatio||1);
  var PC_ACC=0.62, PC_EDGE=0.21, REPLAY_EDGE=10.6, MAXY=10, MINY=-8, A0=0.35, A1=0.90;
  function bwt(a){ return 2 - 8*(a-A0)/(A1-A0); }
  function col(v,f){ try{var c=getComputedStyle(document.documentElement).getPropertyValue(v).trim();return c||f;}catch(e){return f;} }
  var slider=document.getElementById('ba-slider'), btn=document.getElementById('ba-play'), ed=document.getElementById('ba-edge');
  var comp=0.90, playing=true, dir=-1;
  function resize(){var w=cv.clientWidth,h=cv.clientHeight;cv.width=Math.max(1,w*DPR);cv.height=Math.max(1,h*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);}
  function X(a,w){var L=54,R=18;return L+(a-A0)/(A1-A0)*(w-L-R);}
  function Y(v,h){var T=18,B=40;return T+(MAXY-v)/(MAXY-MINY)*(h-T-B);}
  function dot(x,y,r,c){ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fillStyle=c;ctx.fill();}
  function draw(){
    var w=cv.clientWidth,h=cv.clientHeight; ctx.clearRect(0,0,w,h);
    var acc=col('--accent','#a8324a'), mut='#9a9183';
    ctx.strokeStyle='#e4dcce'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(X(A0,w),Y(MAXY,h)); ctx.lineTo(X(A0,w),Y(MINY,h)); ctx.lineTo(X(A1,w),Y(MINY,h)); ctx.stroke();
    ctx.fillStyle=mut; ctx.font='11px Inter,system-ui,sans-serif'; ctx.textAlign='center';
    ctx.save(); ctx.translate(16,h/2); ctx.rotate(-Math.PI/2); ctx.fillText('backward transfer (retention)',0,0); ctx.restore();
    ctx.fillText('learning accuracy on the new task',(X(A0,w)+X(A1,w))/2,h-12);
    ctx.strokeStyle=mut; ctx.lineWidth=2; ctx.beginPath();
    for(var a=A0;a<=A1+1e-9;a+=0.01){var x=X(a,w),y=Y(bwt(a),h); if(a<=A0)ctx.moveTo(x,y); else ctx.lineTo(x,y);} ctx.stroke();
    ctx.fillStyle=mut; ctx.textAlign='left'; ctx.fillText('backprop ladder', X(0.74,w), Y(bwt(0.74),h)+16);
    dot(X(0.5,w),Y(bwt(0.5)+0.1,h),3.5,'rgba(168,50,74,0.4)');
    dot(X(0.55,w),Y(bwt(0.55)+0.1,h),3.5,'rgba(168,50,74,0.4)');
    var cx=X(comp,w), cyC=Y(bwt(comp),h);
    ctx.setLineDash([4,4]); ctx.strokeStyle='rgba(168,50,74,0.3)'; ctx.beginPath(); ctx.moveTo(cx,Y(MAXY,h)); ctx.lineTo(cx,Y(MINY,h)); ctx.stroke();
    var pcy=Y(bwt(PC_ACC)+PC_EDGE,h);
    ctx.strokeStyle=acc; ctx.lineWidth=2.5; ctx.beginPath(); ctx.moveTo(cx,pcy); ctx.lineTo(cx,cyC); ctx.stroke(); ctx.setLineDash([]);
    dot(cx,cyC,4,mut);
    dot(X(PC_ACC,w),pcy,5.5,acc);
    var ry=Y(bwt(PC_ACC)+REPLAY_EDGE,h); dot(X(PC_ACC,w),ry,5.5,'#cf4d87');
    ctx.font='600 11px Inter,system-ui,sans-serif'; ctx.fillStyle=acc; ctx.textAlign='left';
    ctx.fillText('predictive coding', X(PC_ACC,w)+9, pcy+4);
    ctx.fillStyle='#cf4d87'; ctx.fillText('replay', X(PC_ACC,w)+9, ry+4);
    var e=(bwt(PC_ACC)+PC_EDGE)-bwt(comp); if(ed) ed.textContent='+'+(e<1?e.toFixed(2):e.toFixed(1));
    if(slider&&document.activeElement!==slider) slider.value=String(Math.round(comp*100));
  }
  function loop(){ if(playing){ comp+=0.0012*dir; if(comp<=PC_ACC){comp=PC_ACC;dir=1;} if(comp>=0.90){comp=0.90;dir=-1;} } draw(); requestAnimationFrame(loop); }
  if(slider) slider.addEventListener('input',function(){playing=false;if(btn)btn.textContent='play';comp=slider.value/100;});
  if(btn) btn.addEventListener('click',function(){playing=!playing;btn.textContent=playing?'pause':'play';});
  window.addEventListener('resize',resize); resize(); loop();
})();
</script>
