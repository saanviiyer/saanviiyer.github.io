---
layout: post
title: "[NEEDS SAANVI: title. Working title: WMDP-Bio can be partly answered without reading the question]"
date: 2026-10-02
tag: "Research"
permalink: /thinking/wmdp-bio-audit/
excerpt: "On WMDP-Bio, always picking the longest answer scores 46.5% against 25% chance, without reading the question."
---

**TL;DR.** I tested how much of WMDP-Bio can be answered without reading the question. Random guessing scores 25%. Always choosing the longest of the four answers scores 46.5%. A classifier that never sees the question reaches 34.6%. Part of what the benchmark scores is answer length and other question-independent artifacts, rather than biological knowledge. [NEEDS SAANVI: one sentence on what question remains open, matching the last section.]

## I scored WMDP-Bio with rules that never read the question

WMDP-Bio is a multiple-choice benchmark meant to measure hazardous biology knowledge, and each question has four answer options. I wanted to know how much of the score a model could earn without reading the question at all, so I ran baselines that see only the answer options. [NEEDS SAANVI: dataset version and item count. palimpsest/README.md records n=1,273; confirm the version before using it.]

[NEEDS SAANVI: how the longest-answer rule handles ties.]

[NEEDS SAANVI: the exact question-blind classifier, its features, and its cross-validation. palimpsest/FINDINGS.md:38 records "logistic regression on option text, grouped CV"; confirm before using.]

## Always choosing the longest answer scores 46.5%

Random guessing on four options scores 25%. Always choosing the longest answer scores 46.5%, which is 21.5 points above chance from a rule that uses no biology. [NEEDS SAANVI: uncertainty on 46.5%, for example the bootstrap interval, and how it was computed.]

**Figure 1.** [NEEDS SAANVI: figure, accuracy of chance, the longest-answer rule, and the question-blind classifier, with intervals.]

## A classifier that never sees the question reaches 34.6%

The longest-answer rule tests one artifact. The question-blind classifier tests whether the answer options carry other cues, so I trained it on the options alone. It reached 34.6%, which is 9.6 points above chance without access to the question. [NEEDS SAANVI: uncertainty on 34.6%.]

[NEEDS SAANVI: any further control you want reported here, for example what happens on a length-matched subset. Only include results you have recorded and approve for this post.]

## What the controls show

These baselines do not show that WMDP-Bio measures nothing. They show that a score on it mixes biological knowledge with artifacts in how the answer options were written, so a model's score is an upper bound on what it knows until the artifact share is subtracted. [NEEDS SAANVI: confirm this reading, and whether you want to report a guessing-corrected solvable fraction.]

## What question remains

[NEEDS SAANVI: the open question you want to end on, for example whether models actually use the length cue when they answer, and whether you have run that test. Do not state a model result here unless it is recorded.]

## Acknowledgements

[NEEDS SAANVI: collaborators, supervisors, or programs to credit, or remove this section. Also confirm the code link, if the repository is public.]
