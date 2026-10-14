---
layout: post
title: "Medical AI, and the need for multimodality"
date: 2026-10-12
tag: "Essay"
section: technical
thumb: /assets/images/projects/clinical/cortseer-recovery.png
math: true
permalink: /thinking/medical-ai-multimodality/
excerpt: "A clinician reads the MRI, the EEG, and the history together. A model that reads one of them will miss what the others would have caught. But a second modality only helps if it adds information where the decision is made, and a realistic prior often does not."
---

**TL;DR.** Medicine is multimodal by construction: a clinician localizes an epileptic lesion by reading the MRI, the EEG, and the patient's history together, and no single stream settles it. So a model built on one modality inherits that modality's blind spots. On 175 confirmed focal cortical dysplasia scans, an image-only detector finds 150 and misses 25 completely, and the misses are exactly the subtle lesions that brought the patient to imaging. The case for multimodality is that strong. The catch is that a second modality is not free information. When I fuse a realistic, imperfect localization prior into the detector, it adds almost nothing, and forcing the fusion actively hurts. Multimodality is necessary and, done naively, counterproductive, which makes it a measurement problem before it is an architecture problem.

## One modality has a blind spot shaped like the hard cases

Focal cortical dysplasia is a surgically treatable cause of drug-resistant epilepsy, and its lesions are often small and low-contrast. A trained 3D nnU-Net on T2-FLAIR detects 150 of 175 confirmed lesions, 85.7%, and misses 25 of them with no voxel above threshold anywhere in the lesion. A number like 85.7% reads as a strong detector. It is also a detector that fails precisely on the cases a clinician most needs help with, because the obvious lesions never needed a model. The blind spot is not random noise; it is structured by what the modality can see.

This is the honest argument for multimodality in medicine. The information that would rescue those 25 cases exists, it is just in a different stream. In epilepsy, that stream is the EEG and the clinical workup, which point at a brain region independently of the MRI. If the model could use where the seizure localizes, it could lower its threshold there and raise it elsewhere, so a faint lesion in the right place survives while noise elsewhere is suppressed.

## The ceiling, and why it is only a ceiling

To measure the best case, I gave the recovery step a perfect localization prior: each case's own confirmed lesion lobe, as a stand-in for what an EEG workup would indicate. Restricting a multi-peak search to that region recovers 14 of the 25 missed lesions, every recovery within the top four candidates, against null baselines of 1.4 and 4.0 recoveries at \\(P < 10^{-4}\\). That is a large effect, and it says the ceiling is worth reaching: the second modality, if it were perfect, would recover more than half of the complete misses.

But a perfect prior is not a result a clinician can obtain, because a deployable pipeline has to find the region first, and no EEG signal was processed anywhere in that experiment. The 14 of 25 is an oracle upper bound, not an achievable number, and I report it that way every time it appears. The real question is what a realistic, imperfect prior buys.

## The result that matters, a realistic prior adds almost nothing

Here is where multimodality stops being free. When I fuse a prior at the strength a real EEG localizer could supply, the benefit collapses. A 90%-accurate prior applied after segmentation is statistically indistinguishable from no prior at all, with a break-even near chance (\\(p \approx 0.55\\)), and forcing a hard fusion into the pipeline hurts: it loses about 0.36 Dice and degrades the majority of cases rather than helping them. The gap between the oracle ceiling and the realistic floor is the entire problem, and it is invisible to anyone who only reports the oracle number.

<figure class="mm-fig">
  <div class="mm-wrap"><canvas id="mm-plot"></canvas></div>
  <div class="mm-controls">
    <button id="mm-play" type="button">pause</button>
    <input id="mm-slider" type="range" min="50" max="100" value="90" aria-label="Accuracy of the localization prior">
    <span class="mm-readout">prior accuracy <b id="mm-acc">90%</b> &middot; lesions recovered beyond baseline <b id="mm-rec">~0</b></span>
  </div>
  <figcaption><strong>Before fusion: the prior has to be almost perfect to help.</strong> Slide the accuracy of the localization prior. A realistic prior, up through 90%, is indistinguishable from using no prior at all; only as it approaches the oracle does the benefit climb toward the 14-of-25 ceiling. The curve is schematic between the two measured anchors: a 90% prior breaks even (\\(p \approx 0.55\\)), and a perfect prior recovers 14 of 25.</figcaption>
</figure>

The reason is not that EEG is useless. It is that the useful information has to survive the way it is combined. A prior that is right most of the time still points the search at the wrong region often enough to cancel its gains, and a hard fusion lets those wrong votes overwrite good image evidence. The modality carries signal; the fusion throws it away.

## What the second modality should actually be judged on

Two further pieces of this work say the same thing from different angles, and both are about measuring the decision rather than the score. First, when a localizer must decide whether to commit to an answer per patient, the signal that knows when it is right is not the model's own confidence. Routing on cross-segment self-agreement, how often separate EEG segments point to the same hemisphere, answers patients at 88.4% accuracy at 40% coverage, against 70.0% for confidence. The model already contains a better reliability signal than the one everyone reads off it. Second, a catalogue of seven corrections to my own EEG-localization work shows how easily a correctly computed multimodal number supports a wrong conclusion, from a chance baseline that flatters every model to a single-site result mistaken for a cohort-wide one.

## So where does that leave multimodality?

Exactly where medicine already is: necessary, and hard. The clinician integrates modalities because no single one is sufficient, and the FCD blind spot proves a model has to do the same. But "add EEG to the MRI model" is not a result, it is a hypothesis, and the honest version of it has a break-even curve attached. A second modality earns its place only when it adds information at the operating point where the decision is made, under a fusion that does not let its errors overwrite the first modality, and measured against the realistic accuracy it will actually have, not an oracle. The ceiling says the prize is real. The floor says the work is in the fusion, not in adding another input.

## Limitations

The recovery result is an oracle upper bound on a 175-case confirmed-FCD cohort, with the zone simulated from the confirmed lesion lobe rather than from a measured EEG report, and the recovery step has no external test set yet. The break-even and hard-fusion results are from the companion fusion analysis and are specific to that pipeline and cohort definition; a separate journal framing runs the same work on a larger all-comers cohort with different denominators, and the two should not be mixed. The routing result is an offline replay of a policy, not an observed clinician-and-model team.

<style>
  .mm-fig .mm-wrap { width: 100%; aspect-ratio: 16 / 8.5; background: var(--read-card, #fffdf7); border: 1px solid var(--read-card-edge, #efe7d7); border-radius: 12px; }
  .mm-fig .mm-wrap canvas { width: 100%; height: 100%; display: block; }
  .mm-fig .mm-controls { display: flex; align-items: center; gap: 14px; margin-top: 10px; font-family: var(--sans); font-size: 0.8rem; color: var(--muted); flex-wrap: wrap; }
  .mm-fig .mm-controls button { font-family: var(--sans); font-size: 0.76rem; border: 1px solid var(--accent); color: var(--accent); background: transparent; border-radius: 999px; padding: 4px 15px; cursor: pointer; }
  .mm-fig .mm-controls input[type=range] { flex: 1; min-width: 150px; accent-color: var(--accent); }
  .mm-fig .mm-readout b { color: var(--accent); }
</style>
<script>
(function(){
  var cv=document.getElementById('mm-plot'); if(!cv||!cv.getContext)return;
  var ctx=cv.getContext('2d'); var DPR=Math.min(2,window.devicePixelRatio||1);
  function col(v,f){try{var c=getComputedStyle(document.documentElement).getPropertyValue(v).trim();return c||f;}catch(e){return f;}}
  // recovered(acc): ~0 until ~0.9, then rises to 14 at 1.0. Smooth.
  function rec(acc){ var x=(acc-0.5)/0.5; var g=Math.pow(Math.max(0,(acc-0.86)/0.14),2.2); return 14*Math.min(1,g); }
  var slider=document.getElementById('mm-slider'), btn=document.getElementById('mm-play'), accEl=document.getElementById('mm-acc'), recEl=document.getElementById('mm-rec');
  var acc=0.90, playing=true, dir=1;
  function resize(){var w=cv.clientWidth,h=cv.clientHeight;cv.width=Math.max(1,w*DPR);cv.height=Math.max(1,h*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);}
  function X(a,w){var L=50,R=18;return L+(a-0.5)/0.5*(w-L-R);}
  function Y(v,h){var T=16,B=42;return T+(14-v)/14*(h-T-B);}
  function draw(){
    var w=cv.clientWidth,h=cv.clientHeight; ctx.clearRect(0,0,w,h);
    var acc2=col('--accent','#a8324a'), mut='#9a9183';
    ctx.strokeStyle='#e4dcce'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(X(0.5,w),Y(14,h)); ctx.lineTo(X(0.5,w),Y(0,h)); ctx.lineTo(X(1,w),Y(0,h)); ctx.stroke();
    ctx.fillStyle=mut; ctx.font='11px Inter,system-ui,sans-serif'; ctx.textAlign='center';
    ctx.save(); ctx.translate(14,h/2); ctx.rotate(-Math.PI/2); ctx.fillText('lesions recovered beyond baseline (of 25)',0,0); ctx.restore();
    ctx.fillText('accuracy of the localization prior',(X(0.5,w)+X(1,w))/2,h-12);
    // ceiling line at 14
    ctx.setLineDash([3,3]); ctx.strokeStyle='rgba(168,50,74,0.25)'; ctx.beginPath(); ctx.moveTo(X(0.5,w),Y(14,h)); ctx.lineTo(X(1,w),Y(14,h)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle=mut; ctx.textAlign='left'; ctx.fillText('oracle ceiling (14)', X(0.52,w), Y(14,h)-6);
    // curve
    ctx.strokeStyle=acc2; ctx.lineWidth=2.5; ctx.beginPath();
    for(var a=0.5;a<=1.0001;a+=0.005){var x=X(a,w),y=Y(rec(a),h); if(a<=0.5)ctx.moveTo(x,y); else ctx.lineTo(x,y);} ctx.stroke();
    // 90% anchor
    ctx.fillStyle=mut; var ax=X(0.90,w); ctx.beginPath(); ctx.arc(ax,Y(rec(0.90),h),3.5,0,7); ctx.fill();
    ctx.font='10px Inter,system-ui,sans-serif'; ctx.textAlign='center'; ctx.fillText('90%: breaks even (p=0.55)', ax, Y(rec(0.90),h)+18);
    // current point
    var cx=X(acc,w), cy=Y(rec(acc),h);
    ctx.setLineDash([4,4]); ctx.strokeStyle='rgba(168,50,74,0.3)'; ctx.beginPath(); ctx.moveTo(cx,Y(0,h)); ctx.lineTo(cx,cy); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(cx,cy,5.5,0,7); ctx.fillStyle=acc2; ctx.fill();
    if(accEl) accEl.textContent=Math.round(acc*100)+'%';
    var r=rec(acc); if(recEl) recEl.textContent = r<0.5?'~0':r.toFixed(r<10?1:0);
    if(slider&&document.activeElement!==slider) slider.value=String(Math.round(acc*100));
  }
  function loop(){ if(playing){ acc+=0.0012*dir; if(acc>=1){acc=1;dir=-1;} if(acc<=0.5){acc=0.5;dir=1;} } draw(); requestAnimationFrame(loop); }
  if(slider) slider.addEventListener('input',function(){playing=false;if(btn)btn.textContent='play';acc=slider.value/100;});
  if(btn) btn.addEventListener('click',function(){playing=!playing;btn.textContent=playing?'pause':'play';});
  window.addEventListener('resize',resize); resize(); loop();
})();
</script>
