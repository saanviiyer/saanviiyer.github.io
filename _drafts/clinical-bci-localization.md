---
layout: post
title: "Can a clinical BCI localize a lesion?"
date: 2026-10-07
tag: "Research"
section: technical
published: false
permalink: /thinking/clinical-bci-localization/
excerpt: "I asked whether a scalp-EEG readout can tell you where a brain lesion is, which is what a surgical workup needs. The honest answer from my own results is not reliably yet, and most of the work is building the baseline that says so."
---

<!-- RESERVED DRAFT. Not published (lives in _drafts, which GitHub Pages never builds).
     This one is close to publishable: every number below is already public on the
     /projects/clinical-ml/ page (the FCD oracle result and the RCMLR denominator correction).
     Before moving to _posts/YYYY-MM-DD-clinical-bci-localization.md and setting published: true,
     Saanvi should confirm the four numbers flagged inline and decide how much of the RCMLR
     correction to restate here versus link out to the clinical-ml page. -->

In this post I ask a question that sounds like it should have an easy answer. If you record a brain's electrical activity, can you tell where something is wrong with it? That is what a clinical brain-signal readout, scalp EEG and the intracranial recordings a workup sometimes adds, is supposed to do before epilepsy surgery, because a surgeon has to know which piece of cortex to remove. I spent a lot of time trying to get a model to do this from EEG, and the honest answer I came to is that it is harder than the headline numbers suggest, mostly because the easy baselines are stronger than anyone expects. I walk through why the question matters, the result that looked good until I checked it, and the one setting where a localization signal clearly helps.

## What localizing a lesion from brain signals means

A focal lesion, like a small malformation of the cortex, can make a region fire abnormally. In a seizure workup, clinicians read the EEG and other signals to decide which region is the source, because the surgery that gives the best chance of seizure freedom removes that region. A model that could point at the region from the recording alone would be a real clinical tool. The task I scored is a stripped-down version of it: given a window of EEG, name the region, and compare the model against chance.

The first thing that bites you here is chance. If you score the model as top-1 over a set of candidate regions, the naive chance level is one over the number of regions. But some regions carry a label far more often than others, so a model that has learned nothing about the signal can still beat naive chance just by guessing the common region. Getting the baseline right is most of the problem, and it is where my own first result went wrong.

## The result that looked good until I checked the baseline

Scoring localization as top-1 over 20 sensor pairs, and against a density-matched chance baseline that already corrects for how many channels each window labels, my localizer scored 2.00 times chance. That is the number I first reported, and it reads like real spatial skill.

Then I ran a control for a different reason and it deflated the claim. I pooled the model's features across sensors, so the model keeps all of its learned representation but loses any access to which sensor is which, and scored that. A model with no spatial information should sit at chance. It did not. Pooled over one encoder it reached about 1.57 times chance, and over two others about 1.35 and 1.28, because it had learned which sensors are labeled most often. The density-matched baseline corrects for how many channels a window labels, not for which ones are a priori likely, and no amount of care in building it would have caught this. Against a model-free, prior-only predictor the honest floor is about 1.37 times chance, not 1.00. [TODO: Saanvi to confirm 1.37 referential floor and the pooled 1.57 figure against the RCMLR table before publishing.]

So the localizer at 2.00 does beat the right floor at 1.37, which means there is some genuine spatial signal, but the margin is much smaller than the headline implied, and most of the apparent 2.00 was a labeling prior rather than localization. The lesson repeated at a coarser scale. At hemisphere level, where there is no exploitable prior, the same model-free predictor scored 0.729 times chance, below chance, because committing to one hemisphere is worse than guessing once multi-hemisphere labels are counted. A low-cardinality balanced metric was safe. The high-cardinality one was not.

## Where a localization signal clearly helps

There is one setting where a localization prior clearly helps, and it is worth being precise about what it shows. In a separate study I added an anatomical localization prior to an MRI lesion detector and asked how many missed lesions it could recover. Restricting the search to the lesion lobe recovered 14 of 24 lesions the image-only model had missed, against 1.4 expected by chance, with P below 0.001. [TODO: Saanvi to keep 14 of 24 consistent with the clinical-ml page and the final FCD manuscript.]

The catch is that this prior was simulated. I used each case's confirmed lesion lobe as a stand-in for the region an EEG-guided workup would flag, and no real EEG was processed. That makes the result a ceiling, the best a real localization signal could do if it were perfect, rather than evidence that EEG reaches it. Reading the two studies together is the honest picture. A localization prior is clearly useful when it is correct, and getting a correct one from real EEG is exactly the part that does not yet clear its baseline.

## So, can a clinical BCI localize lesion abnormality?

Not reliably, on my results so far. There is a real spatial signal in the recording, but the easy baselines, a class-frequency prior on the fine metric and a below-chance floor on the coarse one, are strong enough that the honest margin is small and easy to overstate. The useful output of this work is not a localizer I would trust at the bedside. It is the set of baselines that tell a real localization from a labeling prior, and a clear statement of the ceiling a correct prior would reach, so the next version can be measured against the right thing.

## Acknowledgements

This draws on the CortSeer and CLERA line of work. [TODO: Saanvi to add collaborators, venue, and a link to the relevant paper, and to confirm the authorship line matches the papers these numbers come from.]
