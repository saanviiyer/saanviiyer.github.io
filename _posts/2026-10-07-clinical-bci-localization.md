---
layout: post
title: "Can a clinical BCI localize a lesion?"
date: 2026-10-07
tag: "Research"
section: technical
permalink: /thinking/clinical-bci-localization/
thumb: /assets/images/clinical-bci-localization/floor-and-breakeven.png
excerpt: "I asked whether a scalp-EEG readout can tell you where a brain lesion is, which is what a surgical workup needs. There is genuine spatial signal, but it sits right at the edge of being useful, and most of the work was building the baseline that shows that."
---

In this post I ask whether a recording of the brain's electrical activity can tell you where a lesion sits. That is a concrete clinical need. Before epilepsy surgery, a workup has to point at the region to remove, and scalp EEG, together with the intracranial recordings a workup sometimes adds, is one of the signals clinicians read to find it. I spent a lot of time building a model to do this from EEG. The answer I came to is that there is genuine signal in the recording, and the easy baselines are strong enough that it sits right at the edge of being useful. I walk through what the task is, the result I first reported, the control that changed how I read it, whether the signal is accurate enough to help, and the one setting where a localization prior clearly works.

## What localizing a lesion from brain signals means

A focal lesion, like a small malformation of the cortex, can make a region fire abnormally. In a seizure workup, clinicians read the EEG and other signals to decide which region is the source, because the surgery with the best chance of seizure freedom removes that region. A model that could point at the region from the recording alone would be a usable clinical tool. The task I scored is a stripped-down version of it. Given a window of EEG, name the region, and compare the model against chance.

The first thing that bites you here is chance. If you score the model as top-1 over a set of candidate regions, the naive chance level is one over the number of regions. But some regions carry a label far more often than others, so a model that has learned nothing about the signal can still beat naive chance by guessing the common region. Getting that baseline right is most of the problem, and it is where my own first result went wrong.

## The result that looked good until I checked the baseline

Scoring localization as top-1 over 20 sensor pairs, against a density-matched chance baseline that already corrects for how many channels each window labels, my localizer scored 2.00 times chance. That is the number I first reported, and it reads like clear spatial skill.

Then I ran a control for a different reason and it changed the reading. I pooled the model's features across sensors, so the model keeps everything it learned but loses any access to which sensor is which, and scored that. A model with no spatial information should sit at chance. It did not. Pooled over one encoder it reached about 1.57 times chance, and over two others about 1.35 and 1.28, because it had learned which sensors are labeled most often. The density-matched baseline corrects for how many channels a window labels, not for which ones are likely in the first place, and no amount of care in building it would have caught this. Against a model-free, prior-only predictor, the proper floor is about 1.37 times chance, not 1.00.

So part of my 2.00 was a labeling prior rather than localization. The useful thing is that the signal does not vanish once you denominate it correctly. Measured against the proper floor, the localizer still clears it by a genuine margin, about 1.62 times the floor rather than 2.00 times naive chance. There is genuine spatial information in the recording. The headline just overstated how much, and the right baseline, not the model, turned out to be most of the work.

The lesson repeated at a coarser scale and in the other direction. At hemisphere level, where there is no label to exploit, the same model-free predictor scored 0.729 times chance, below chance, because committing to one hemisphere is worse than guessing once windows with multi-hemisphere labels are counted. A low-cardinality balanced metric was safe to divide by. The high-cardinality one was not.

## Is the signal accurate enough to help?

Genuine signal is not the same as useful signal, so I asked the next question directly. How accurate does a localization prior have to be before conditioning a lesion detector on it beats using no prior at all? I swept prior quality from chance to a perfect oracle. With enough seeds, a prior that is 90 percent accurate does not beat the no-prior baseline. It is indistinguishable from it, at p equal to 0.55, so break-even sits at or above 90 percent accuracy. My localizer runs at about 0.90, 0.903 out of sample and 0.918 in sample, which is marginal either way. The spatial signal exists, and it is right at the threshold where it would start to help, not clearly past it.

<picture>
  <source media="(max-width: 600px)" srcset="/assets/images/clinical-bci-localization/floor-and-breakeven-stacked.png">
  <img src="/assets/images/clinical-bci-localization/floor-and-breakeven.png" alt="Left, localization as a multiple of chance, with the prior-only floor at 1.37, the spatial-blind model at 1.57, and the full localizer at 2.00. Right, prior accuracy against a break-even threshold of 0.90, with the localizer at 0.903 and 0.918.">
</picture>

**Figure 1. Genuine signal, at the edge of useful.** Left, localization scored as a multiple of density-matched chance. A model with no spatial information already reaches 1.37 times chance, a model that keeps its features but loses sensor identity reaches 1.57, and the full localizer reaches 2.00, so part of the headline is a label-frequency prior. Against the proper floor the localizer still clears it, by a corrected 1.62 times the floor. Right, how accurate a prior has to be before it helps a lesion detector. Break-even sits at or above 0.90, and the localizer lands at 0.903 out of sample and 0.918 in sample, right at the edge. At hemisphere level, where there is no label to exploit, the same model-free predictor scores 0.729 times chance, below chance.

## Where a localization prior clearly works

There is one setting where a localization prior helps without ambiguity, and it is worth being exact about what it shows. In a separate study I added an anatomical localization prior to an MRI lesion detector and asked how many missed lesions it could recover. Restricting the search to the lesion lobe recovered 14 of 24 lesions the image-only model had missed, against 1.4 expected by chance, with P below 0.001.

The catch is that this prior was simulated. I used each case's confirmed lesion lobe as a stand-in for the region an EEG-guided workup would flag, and no measured EEG was processed. That makes the result a ceiling, the best a localization signal could do if it were perfect, rather than evidence that EEG reaches it. Reading the studies together gives the full picture. A correct localization prior is clearly useful, and getting a correct one from measured EEG is exactly the part that is still at the edge of its baseline.

## So, can a clinical BCI localize lesion abnormality?

There is genuine spatial signal in the recording, and on my results it is not yet accurate enough to be the clinical prior. The headline margins over chance were inflated by a label-frequency effect, the corrected margin is genuine but modest, and the accuracy the signal reaches is right at the break-even threshold where it would begin to help a detector rather than clearly past it. The output of this work that I trust is not a localizer for the bedside. It is the set of baselines that separate genuine localization from a labeling prior, and a clear statement of the ceiling a correct prior would reach, so the next version can be measured against the right thing.

## Acknowledgements

This draws on two write-ups from the CortSeer and CLERA line of work, the structural-functional FCD detection study and the evaluation audit "Right Number, Wrong Conclusion." Both are collaborative, and the venues, collaborators, and paper links are on my [clinical machine learning]({{ '/projects/clinical-ml/' | relative_url }}) project page.
