---
layout: post
title: "Current ways we can read the brain: comparing approaches for neural interfacing"
date: 2026-10-12
tag: "Essay"
section: technical
thumb: /assets/images/clinical-bci-localization/floor-and-breakeven.png
permalink: /thinking/reading-the-brain/
excerpt: "Every way of reading the brain trades spatial resolution, temporal resolution, and how far you are willing to open the skull. No method wins all three, and the trade determines what a model downstream can even hope to decode."
---

**TL;DR.** There is no single best way to read the brain. Each method sits at a fixed point in a three-way trade: how finely it resolves space, how finely it resolves time, and how invasive it is. Scalp EEG has millisecond timing and no surgery but blurry space; fMRI has millimeter space but second-slow timing; intracortical implants have both but require penetrating the cortex. The trade is not an engineering detail to be optimized away, it is the thing that decides what a decoder downstream can recover, and it is why reading a specific region out of a non-invasive recording is so hard.

## The three axes

A neural interface is judged on three mostly independent properties. Spatial resolution is how small a region it can distinguish, from whole lobes down to single neurons. Temporal resolution is how fast a change it can follow, from seconds down to milliseconds. Invasiveness is how much of the skull and brain you have to open, from a cap on the scalp to electrodes in the tissue. A method's usefulness for a given question is set by where it lands on all three at once, and almost nothing lands well on all three.

The physics forces the trade. Electrical signals measured at the scalp are smeared by the skull and scalp, so EEG reads fast but cannot say precisely where a signal came from. The blood-oxygen signal fMRI measures is sharp in space but lags neural activity by seconds, so it reads where but not exactly when. To get both at once you have to put the sensor next to the neurons, which means surgery.

<figure class="nb-fig">
  <div class="nb-wrap"><canvas id="nb-plot"></canvas></div>
  <div class="nb-controls">
    <button id="nb-toggle" type="button">showing: all methods</button>
    <span class="nb-readout">bottom-left is best on both axes; color marks invasiveness</span>
  </div>
  <figcaption><strong>The space-time-invasiveness trade.</strong> Each method plotted by spatial resolution (left is finer) and temporal resolution (down is finer); berry points are non-invasive, pink points require surgery. Toggle to keep only the non-invasive methods and the whole good corner, fine in both space and time, empties out. Values are order-of-magnitude, from standard references.</figcaption>
</figure>

## Where each method sits

**Scalp EEG** records electrical potentials from a cap of electrodes. Timing is excellent, on the order of a millisecond, and it is cheap and fully non-invasive, which is why it dominates clinical epilepsy and brain-computer interfaces. Its spatial resolution is poor, on the order of centimeters, because every electrode sums the activity of enormous populations seen through the skull. **MEG** reads the magnetic fields of the same currents; its timing matches EEG and its spatial resolution is somewhat better because magnetic fields are less distorted by tissue, but it needs a shielded room and a large machine.

**fMRI** infers activity from blood oxygenation. Its spatial resolution reaches about a millimeter, good enough to separate small structures, but the blood response is slow, so its temporal resolution is on the order of a second. **fNIRS** uses light to read a similar blood signal and is portable, at worse resolution on both axes.

**ECoG** places an electrode grid directly on the cortical surface, under the skull. It recovers millimeter space and millisecond time at once, the combination the non-invasive methods cannot reach, at the cost of surgery. **Intracortical arrays**, the Utah array and the penetrating threads used by implant companies, push further, resolving individual neurons with millisecond timing, at the cost of putting electrodes into the tissue itself. These are the recordings behind the most capable motor and speech decoders, and they are invasive by construction.

## Why the trade decides what a model can do

The reason this matters for machine learning is that a decoder cannot recover information the sensor never captured. A model reading scalp EEG inherits EEG's spatial blur no matter how good the model is, so asking it to name the exact region a signal came from is asking it to invert a measurement that threw that information away. I have run into this directly in epilepsy work: localizing a lesion from EEG is hard not because the decoder is weak but because the modality that is safe enough to use routinely is the one with the least spatial information. In my own analysis, most of the apparent spatial performance of an EEG localizer was label frequency; the genuine spatial signal localized only about 1.6 times over its own blind floor. That is a statement about the modality as much as the model.

This is also why the implant companies accept surgery. If you need single-neuron resolution and millisecond timing, no non-invasive method can give it to you, and the entire value of a penetrating electrode is that it buys the good corner of the trade that physics closes off from the outside. The right interface is not the most advanced one; it is the one whose fixed point on the three axes matches the question, and whose invasiveness the application can justify.

## What I take from it

Progress in reading the brain is not a single number going up. It is movement along a trade that different applications resolve differently: a seizure monitor wants EEG's safety and timing and tolerates its blur, a speech prosthesis wants an implant's resolution and accepts its surgery, a cognitive-neuroscience study wants fMRI's maps and lives with its lag. The honest way to compare methods is to name all three axes at once and ask which the problem actually needs, rather than reaching for whichever modality is newest. And whatever the modality gives up, a model downstream cannot give it back.

<style>
  .nb-fig .nb-wrap { width: 100%; aspect-ratio: 16 / 9; background: var(--read-card, #fffdf7); border: 1px solid var(--read-card-edge, #efe7d7); border-radius: 12px; }
  .nb-fig .nb-wrap canvas { width: 100%; height: 100%; display: block; }
  .nb-fig .nb-controls { display: flex; align-items: center; gap: 14px; margin-top: 10px; font-family: var(--sans); font-size: 0.8rem; color: var(--muted); flex-wrap: wrap; }
  .nb-fig .nb-controls button { font-family: var(--sans); font-size: 0.76rem; border: 1px solid var(--accent); color: var(--accent); background: transparent; border-radius: 999px; padding: 4px 15px; cursor: pointer; }
</style>
<script>
(function(){
  var cv=document.getElementById('nb-plot'); if(!cv||!cv.getContext)return;
  var ctx=cv.getContext('2d'); var DPR=Math.min(2,window.devicePixelRatio||1);
  function col(v,f){try{var c=getComputedStyle(document.documentElement).getPropertyValue(v).trim();return c||f;}catch(e){return f;}}
  // spatial mm (log), temporal ms (log), invasive bool
  var M=[
    {n:'EEG', s:10, t:1, inv:false},
    {n:'MEG', s:5, t:1, inv:false},
    {n:'fMRI', s:1, t:1000, inv:false},
    {n:'fNIRS', s:20, t:1000, inv:false},
    {n:'ECoG', s:1, t:1, inv:true},
    {n:'intracortical', s:0.05, t:1, inv:true}
  ];
  var mode=0; // 0 all, 1 non-invasive
  var btn=document.getElementById('nb-toggle');
  function resize(){var w=cv.clientWidth,h=cv.clientHeight;cv.width=Math.max(1,w*DPR);cv.height=Math.max(1,h*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);}
  // x: spatial, log from 0.02 (left,fine) to 50 (right,coarse)
  function X(s,w){var L=56,R=24; var lx=(Math.log10(s)-Math.log10(0.02))/(Math.log10(50)-Math.log10(0.02)); return L+lx*(w-L-R);}
  // y: temporal, log from 0.5ms (bottom,fine) to 3000ms (top,coarse)
  function Y(t,h){var T=20,B=46; var ly=(Math.log10(t)-Math.log10(0.5))/(Math.log10(3000)-Math.log10(0.5)); return (h-B) - ly*(h-T-B);}
  function draw(){
    var w=cv.clientWidth,h=cv.clientHeight; ctx.clearRect(0,0,w,h);
    var acc=col('--accent','#a8324a'), pink='#cf4d87', mut='#9a9183';
    ctx.strokeStyle='#e4dcce'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(X(0.02,w),Y(3000,h)); ctx.lineTo(X(0.02,w),Y(0.5,h)); ctx.lineTo(X(50,w),Y(0.5,h)); ctx.stroke();
    ctx.fillStyle=mut; ctx.font='11px Inter,system-ui,sans-serif'; ctx.textAlign='center';
    ctx.fillText('spatial resolution  (fine ←    → coarse)', w/2, h-12);
    ctx.save(); ctx.translate(16,h/2); ctx.rotate(-Math.PI/2); ctx.fillText('temporal resolution  (fine ↓    ↑ coarse)',0,0); ctx.restore();
    ctx.fillStyle='rgba(168,50,74,0.08)'; ctx.fillRect(X(0.02,w),Y(3,h),X(2,w)-X(0.02,w),Y(0.5,h)-Y(3,h));
    ctx.fillStyle=mut; ctx.font='10px Inter,system-ui,sans-serif'; ctx.textAlign='left'; ctx.fillText('fine on both', X(0.03,w), Y(0.6,h)-4);
    M.forEach(function(m){
      var show = mode===0 || !m.inv;
      var x=X(m.s,w), y=Y(m.t,h);
      ctx.globalAlpha = show?1:0.14;
      ctx.beginPath(); ctx.arc(x,y,6,0,7); ctx.fillStyle=m.inv?pink:acc; ctx.fill();
      ctx.fillStyle = show?'#3a322c':mut; ctx.font='600 11px Inter,system-ui,sans-serif'; ctx.textAlign='left';
      ctx.fillText(m.n, x+9, y+4);
      ctx.globalAlpha=1;
    });
  }
  if(btn) btn.addEventListener('click',function(){ mode=(mode+1)%2; btn.textContent = mode===0?'showing: all methods':'showing: non-invasive only'; draw(); });
  window.addEventListener('resize',function(){resize();draw();}); resize(); draw();
})();
</script>
