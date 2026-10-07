---
layout: post
title: "Can a clinical BCI localize a lesion?"
date: 2026-10-07
tag: "Research"
section: technical
permalink: /thinking/clinical-bci-localization/
excerpt: "I asked whether a scalp-EEG readout can tell you where a brain lesion is, which is what a surgical workup needs. There is real spatial signal, but it sits right at the edge of being useful, and most of the work was building the baseline that shows that."
---

In this post I ask a question that sounds like it should have an easy answer. If you record a brain's electrical activity, can you tell where something is wrong with it? That is what a clinical brain-signal readout, scalp EEG and the intracranial recordings a workup sometimes adds, is meant to do before epilepsy surgery, because a surgeon has to know which piece of cortex to remove. I spent a lot of time trying to get a model to do this from EEG, and the honest answer I came to is that there is real signal in the recording, but the easy baselines are strong enough that the signal sits right at the edge of being useful, not past it. I walk through why the question matters, the result that looked good until I checked the baseline, whether the signal is accurate enough to help, and the one setting where a localization prior clearly works.

## What localizing a lesion from brain signals means

A focal lesion, like a small malformation of the cortex, can make a region fire abnormally. In a seizure workup, clinicians read the EEG and other signals to decide which region is the source, because the surgery with the best chance of seizure freedom removes that region. A model that could point at the region from the recording alone would be a real clinical tool. The task I scored is a stripped-down version of it. Given a window of EEG, name the region, and compare the model against chance.

The first thing that bites you here is chance. If you score the model as top-1 over a set of candidate regions, the naive chance level is one over the number of regions. But some regions carry a label far more often than others, so a model that has learned nothing about the signal can still beat naive chance by guessing the common region. Getting that baseline right is most of the problem, and it is where my own first result went wrong.

## The result that looked good until I checked the baseline

Scoring localization as top-1 over 20 sensor pairs, against a density-matched chance baseline that already corrects for how many channels each window labels, my localizer scored 2.00 times chance. That is the number I first reported, and it reads like clear spatial skill.

Then I ran a control for a different reason and it changed the reading. I pooled the model's features across sensors, so the model keeps everything it learned but loses any access to which sensor is which, and scored that. A model with no spatial information should sit at chance. It did not. Pooled over one encoder it reached about 1.57 times chance, and over two others about 1.35 and 1.28, because it had learned which sensors are labeled most often. The density-matched baseline corrects for how many channels a window labels, not for which ones are likely in the first place, and no amount of care in building it would have caught this. Against a model-free, prior-only predictor, the honest floor is about 1.37 times chance, not 1.00.

So part of my 2.00 was a labeling prior rather than localization. The useful thing is that the signal does not vanish once you denominate it correctly. Measured against the proper floor, the localizer still clears it by a real margin, about 1.62 times the floor rather than 2.00 times naive chance. There is genuine spatial information in the recording. The headline just overstated how much, and the right baseline, not the model, turned out to be most of the work.

The lesson repeated at a coarser scale and in the other direction. At hemisphere level, where there is no label to exploit, the same model-free predictor scored 0.729 times chance, below chance, because committing to one hemisphere is worse than guessing once windows with multi-hemisphere labels are counted. A low-cardinality balanced metric was safe to divide by. The high-cardinality one was not.

## Is the signal accurate enough to help?

Real signal is not the same as useful signal, so I asked the next question directly. How accurate does a localization prior have to be before conditioning a lesion detector on it beats using no prior at all? I swept prior quality from chance to a perfect oracle. With enough seeds, a prior that is 90 percent accurate does not beat the no-prior baseline. It is indistinguishable from it, at p equal to 0.55, so break-even sits at or above 90 percent accuracy. My localizer runs at about 0.90, 0.903 out of sample and 0.918 in sample, which is marginal either way. The spatial signal exists, and it is right at the threshold where it would start to help, not clearly past it.

## Where a localization prior clearly works

There is one setting where a localization prior helps without ambiguity, and it is worth being exact about what it shows. In a separate study I added an anatomical localization prior to an MRI lesion detector and asked how many missed lesions it could recover. Restricting the search to the lesion lobe recovered 14 of 24 lesions the image-only model had missed, against 1.4 expected by chance, with P below 0.001.

The catch is that this prior was simulated. I used each case's confirmed lesion lobe as a stand-in for the region an EEG-guided workup would flag, and no real EEG was processed. That makes the result a ceiling, the best a localization signal could do if it were perfect, rather than evidence that EEG reaches it. Reading the studies together gives the honest picture. A correct localization prior is clearly useful, and getting a correct one from real EEG is exactly the part that is still at the edge of its baseline.

## So, can a clinical BCI localize lesion abnormality?

There is real spatial signal in the recording, and on my results it is not yet accurate enough to be the clinical prior. The headline margins over chance were inflated by a label-frequency effect, the corrected margin is genuine but modest, and the accuracy the signal reaches is right at the break-even threshold where it would begin to help a detector rather than clearly past it. The output of this work that I trust is not a localizer for the bedside. It is the set of baselines that separate real localization from a labeling prior, and a clear statement of the ceiling a correct prior would reach, so the next version can be measured against the right thing.

## Acknowledgements

This draws on two write-ups from the CortSeer and CLERA line of work, the structural-functional FCD detection study and the evaluation audit "Right Number, Wrong Conclusion." Both are collaborative, and the venues, collaborators, and paper links are on my [clinical machine learning]({{ '/projects/clinical-ml/' | relative_url }}) project page.
