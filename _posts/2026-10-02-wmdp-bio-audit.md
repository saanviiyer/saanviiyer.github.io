---
layout: post
title: "WMDP-Bio can be partly answered without reading the question"
date: 2026-10-02
tag: "Research"
section: technical
thumb: /assets/images/wmdp-bio-audit/option-only.png
permalink: /thinking/wmdp-bio-audit/
excerpt: "On WMDP-Bio, always picking the longest answer scores 46.5% against 25% chance, without reading the question."
---

**TL;DR.** I tested how much of WMDP-Bio can be answered without reading the question. Random guessing scores 25%. Always choosing the longest of the four answers scores 46.5%. A classifier that never sees the question reaches 34.6%. Part of what the benchmark scores is answer length and other question-independent artifacts, rather than biological knowledge. Whether a model actually uses these cues when it answers is a separate question that these baselines do not settle.

## I scored WMDP-Bio with rules that never read the question

WMDP-Bio is a multiple-choice benchmark meant to measure hazardous biology knowledge, and each of its 1,273 items has four answer options. I wanted to know how much of the score a model could earn without reading the question at all, so I ran baselines that see only the answer options. The longest-answer rule takes the option with the most characters and breaks ties by position. The question-blind classifier is a logistic regression on the option text alone, scored with grouped cross-validation so that no question-similarity cluster lands in both the training and the test split.

## Always choosing the longest answer scores 46.5%

Random guessing on four options scores 25%. Always choosing the longest answer scores 46.5%, which is 21.5 points above chance from a rule that uses no biology. A cluster bootstrap over 1,195 question-similarity groups puts the guessing-corrected solvable fraction at 0.287 [0.249, 0.324], and the interval for the longest-answer rule itself excludes chance. The mirror case confirms the mechanism, because always choosing the shortest option scores 0.153, below chance, since correct answers here are systematically longer.

![Accuracy without the question: the longest-answer rule scores 0.465 and the question-blind classifier 0.346, both above the 0.25 chance line](/assets/images/wmdp-bio-audit/option-only.png)

**Figure 1.** Accuracy of two question-blind rules against the 0.25 chance line. The longest-answer rule scores 0.465 and the question-blind classifier 0.346, and both intervals exclude chance on a cluster bootstrap.

## A classifier that never sees the question reaches 34.6%

The longest-answer rule tests one artifact. The question-blind classifier tests whether the answer options carry other cues, so I trained it on the options alone. It reached 34.6%, which is 9.6 points above chance without access to the question, and its interval also excludes chance. I also checked whether it is only reading answer length. On a subset built so that every length rule scores exactly at chance, the option-only logistic regression still reaches 0.325, so part of the signal is in how the correct answer is written rather than in its length alone.

## What the controls show

These baselines do not show that WMDP-Bio measures nothing. They show that a score on it mixes biological knowledge with artifacts in how the answer options were written, so a model's score is an upper bound on what it knows until the artifact share is subtracted. Against a reference of all 57 MMLU subjects run through the same battery, WMDP-Bio sits at the 96.5th percentile on option-only solvability, with two subjects above it, so the point is not that WMDP-Bio is uniquely flawed but that it carries one of the largest of these artifacts and, at 1,273 items, the best-measured one.

## What question remains

The open question is whether models actually use these cues when they answer. That needs model weights and a separate measurement, which I have not run, so nothing here shows that any model scores on WMDP-Bio by picking long answers. What the baselines establish is only that the benchmark leaves that door open, and that any threshold keyed to a WMDP-Bio score inherits the artifact until it is controlled.
