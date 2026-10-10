---
layout: post
title: "A white-box evaluation for protein models"
date: 2026-10-01
tag: "Research"
section: technical
thumb: /assets/images/white-box-protein-eval/eval-schematic.png
permalink: /thinking/white-box-protein-eval/
excerpt: "A proposal to test whether a protein model has learned an assay property by probing its internal activations and checking that the signal holds on held-out families."
---

**TL;DR.** I propose a white-box evaluation for protein models in three parts: rank fixed sets of already-measured benign variants, recover the assay property with linear probes on internal activations, and hold out whole families to check that the signal transfers. It uses only benign, already-measured proteins, generates no new sequences, and releases no reusable steering probe.

## The problem is that a score can rank without understanding

A protein model is usually judged by whether its score correlates with a measured property across a benchmark, and that test can pass for the wrong reason. The model can rank sequences using a feature that happens to line up with the property on familiar data, so the correlation reflects the benchmark's composition rather than a learned account of the property. I want an evaluation that separates those two cases, because the distinction decides whether the score can be trusted when the model is used on something new.

A white-box evaluation looks inside the model instead of only at its output. Rather than asking whether the final score correlates with the property, it asks whether the property is recoverable from the model's internal activations and whether that recovery survives a shift to unfamiliar proteins.

## The proposal is to rank measured variants, probe activations, and hold out families

The evaluation has three parts that build on each other. First, I assemble fixed sets of protein variants whose properties were already measured in published deep mutational scanning assays, so every label is measured and no new sequence is created. Second, I train a linear probe, a simple classifier or regressor on a protein model's internal activations, to recover the assay property, which tests whether the information is present in the representation and not only in the output score. Third, I hold out whole protein families, defined by family or clan, during probe training and test on them, so the evaluation measures whether the recovered signal transfers rather than whether it fits the families the probe already saw.

![Schematic of the evaluation, from fixed sets of measured benign variants, to linear probes on internal activations, to a held-out-family test that blocks shortcut scoring](/assets/images/white-box-protein-eval/eval-schematic.png)

**Figure 1.** The evaluation runs in three steps, from fixed sets of measured benign variants, to linear probes on the model's internal activations, to a held-out-family test that blocks shortcut scoring.

## Held-out families are the test that matters

The held-out-family split is what makes the evaluation informative, because a probe that reads a shortcut will do well on families it trained on and fall off on families it did not. If the probe recovers the property on held-out families, that is evidence the model represents something about the property that generalizes. If it does not, the earlier correlation was standing on family-specific structure, and the score should not be trusted outside its training distribution.

## The biosecurity boundary is stated first, not added later

I fix the safety boundary before any experiment runs, so the design cannot drift into uplift. The proposal uses only benign proteins that were already measured, it does not generate new functional sequences, it does not run wet-lab validation, and it does not release a reusable steering probe that could be repurposed. The output is an evaluation and a report of where a model's representation does and does not carry an assay property, which is a statement about the model rather than a tool for designing anything.

## What would falsify the idea

The proposal is falsifiable: if probes recover assay properties just as well on held-out families as on seen ones for a model whose output score is known to shortcut, then the white-box test adds nothing beyond the output correlation. I would report that limit directly, because the point of the evaluation is to detect shortcut scoring, and a version that cannot separate the two cases has failed its own test.

