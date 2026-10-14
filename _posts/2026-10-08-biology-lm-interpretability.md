---
layout: post
title: "Interpreting functional representations in biology language models"
date: 2026-10-08
tag: "Research"
section: technical
thumb: /assets/images/biology-lm-interpretability/nulls-at-layer32.png
permalink: /thinking/biology-lm-interpretability/
excerpt: "Where does function become causally accessible inside a protein language model, and how is it organised once it is there? There is a band near three-quarter depth. But the more durable finding is that five of my twelve claims invert once the control is named."
---

## Why this work matters

- **Function is causally accessible in a narrow interior band, not at the output.** A fitted fitness direction beats a generic matched-norm shift by +0.0933 at layer 24 of 33, and the final layer normalisation destroys the effect ninety-five-fold.
- **The sparse feature that attribution selects is not the feature that works.** In every seed the most decoder-aligned atom is also the most perturbation-responsive one, and it carries almost none of the effect. Other atoms recover 77 to 95 percent, at cosines as low as −0.39.
- **A mean-pooled embedding is not a summary of what the model knows.** It predicts intervention outcomes at chance, and a random projection of the same width matches or beats PCA of the real activations.
- **The measurement fails before the model does.** A reading-frame test I built is passed by an order-0 Markov chain that cannot represent a codon, and failed by HyenaDNA. Five of the twelve claims in this project invert once the control is named.

## Introduction

A protein language model is used in place of measurements nobody made. A zero-shot likelihood stands in for a fitness assay, a frozen embedding for a functional annotation, a model score for a clinical variant effect. The substitution is usually defended by correlation with held-out labels, which leaves the interesting question untouched: whether the quantity being substituted is the quantity the model actually computes with.

I wanted to ask that from the inside. At what depth does intervening along a fitted functional direction move the model's own output representation, and once the information is there, does it localise into individual sparse features or spread across many?

Three things follow from getting this right. If function is only accessible in a narrow interior band, then every method that reads the output embedding is reading the wrong layer. If the feature attribution selects is not the feature that carries the effect, then feature-level explanations of these models are not load-bearing. And if the tests we use to detect representations can be passed by models that provably lack them, then a large fraction of the published evidence is uninterpretable rather than wrong.

Biology is an unusually good place to ask, because the answer is constrained from outside the model and from two directions. Deep mutational scanning gives measured fitness for thousands of single substitutions. Physical chemistry gives substitution matrices and hydropathy scales fixed long before any language model existed, which makes them honest baselines rather than tuned ones. And in coding DNA the constraint is combinatorial rather than measured: reading frame, codon boundaries and stop placement are facts about a sequence that a correct model must respect and a wrong model can be caught violating.

## The setup, fitting a direction and injecting it

The functional target is deep mutational scanning fitness across ten ProteinGym assays, 72 to 212 residues. The direction is the difference between mean activations of high- and low-fitness variants, fitted on training proteins only, centred within each protein. Without that centring the between-protein offset dominates and the fitted direction becomes a protein detector rather than a fitness direction.

The direction is injected with a forward hook at a chosen layer, so the perturbation has to propagate through every remaining layer to reach the readout. Adding it to a pooled output would not test the computation at all.

Everything then depends on what you compare it against. I use three nulls at matched norm: a random Gaussian direction, a direction orthogonal to the fitted one, and the unweighted mean activation. The third is the stiff one, because adding any large in-distribution shift moves embeddings somewhere, and a control that does not do that is not testing the hypothesis.

## Main finding, an interior band at three-quarter depth

The specific effect is confined to a band near three-quarter depth. Two independently constructed contrasts, built from different definitions of "high" and "low" fitness, agree that an interior maximum exists there.

![Directional margin over the mean-shift null against relative depth, two independent contrast definitions, both peaking near three-quarter depth and going negative near the output](/assets/images/biology-lm-interpretability/fig_depth.png)

**Figure 1.** Both constructions find the interior maximum. They disagree in sign about the output region, so I report a band rather than a global optimum.

At the output layer the effect collapses ninety-five-fold in a single layer, from +0.0716 at layer 32 to +0.0008 at layer 33. The cause is architectural: the output passes through `emb_layer_norm_after`, which removes most of a constant added direction. The same collapse appears independently in a different target, so it is a property of the architecture rather than of this experiment.

The absolute numbers stay small. The best recovery anywhere is ten percent of the real high-minus-low difference, which means ninety percent of it is not reproduced by any direction I can extract this way.

**I do not call this an emergence zone, and the distinction matters.** Five layers of the sweep carry the directional margin and exactly one carries a protein-level interval. That locates a band, not a boundary. Whether the onset is sharp requires a dense depth sweep with per-protein intervals at every layer, which I have not run.

![Per-protein directional margins at layer 20 for twelve held-out proteins, all positive, spanning a factor of 23](/assets/images/biology-lm-interpretability/per-protein-margins.png)

**Figure 2.** The one cell where I have the full per-protein decomposition. All 12 proteins are positive and the mean is +0.1720, interval +0.1182 to +0.2359. Two things that pooling hides: the margins span a factor of 23, so this is not a uniform property each protein samples with noise; and on TAT_HV1BR the fitted direction moves the representation the *wrong* way, with the margin positive only because the null moves it further wrong.

## The null you choose selects your layer

This is the result I would keep if I could keep only one, and it is the reason I now distrust my own earlier sweeps.

Score the fitted direction the way this literature usually does — against a matched-norm random null, on a distance-to-centroid readout, selecting the layer by significance — and the answer is depth 0.97 at **z = 16.24**, the largest value anywhere in any sweep I ran. That looks like a discovery.

Score the same direction at the same layer against the generic mean-shift null on a directional readout, and its margin is **−0.0041**. It is worse than an arbitrary shift of the same size.

![Four directions at layer 32 under two readouts. On the distance readout the fitted direction dominates the random and orthogonal nulls but the mean-shift null is already two-thirds of it; on the directional readout the mean-shift null exceeds the fitted direction](/assets/images/biology-lm-interpretability/nulls-at-layer32.png)

**Figure 3.** The same cell, four directions, two readouts. On the left the fitted direction towers over the conventional nulls, which is where z = 16.24 comes from, but the mean shift already accounts for two-thirds of the movement. On the right the ordering inverts outright: the null reaches +0.0757 against the fitted direction's +0.0716.

The mechanism is visible once the stiffer control is in the picture. The conventional nulls are blind to the generic component of the movement, so a significance score computed against them is largest exactly where that generic component is largest. None of the three ingredients is unusual on its own. The combination picks the one layer at which the hypothesis loses to its own control.

Three more failures came out of the same sweep, and I report them because each one was mine:

- **Distance and direction disagree about the same null.** At layer 20 the mean-shift null cuts distance by +0.0204, which reads as recovering 48 percent of the effect, while its directional faithfulness is −0.017, slightly anti-aligned. The null gets closer while pointing the wrong way.
- **A recovery fraction is not comparable across depths.** Its numerator grows as the injection point approaches the output while the denominator is fixed, so the same property read 0.11 at depth 0.48 and 1.34 at depth 0.97. A recovery fraction above one is not a recovery fraction, and I initially read the late value as a mechanism.
- **A dose-response inside the linear regime proves nothing.** At strengths of 0.5, 1 and 2 the response doubled with every doubling, which established only that the readout is linear in the injected vector. The grid had to widen sixteen-fold before anything was diagnostic.

## Mechanistic deep-dive, the atom attribution selects is not the atom that works

If function is carried by reusable parts, a sparse dictionary should isolate them. I trained a 16,384-feature top-*k* autoencoder at layer 30, three seeds, 12.8× overcomplete with k = 48 active per residue, and reported held-out quality first because a failure to localise is uninterpretable without it: fraction of variance unexplained 0.149, reconstruction cosine 0.914, measured sparsity exactly 48, dead features 2.6 to 3.4 percent. An earlier, undertrained dictionary was discarded for exactly this reason — a feature that was never aligned is not expected to steer, so its failure says nothing.

The pre-registered criterion asked for decoder cosine above 0.5 and steering comparable to the supervised direction. In all three seeds the most perturbation-responsive atom *is* the most decoder-aligned atom, at cosine 0.734 to 0.763. **The alignment leg passes and the causal leg fails**: steering that atom gives −0.0035, +0.0037 and +0.0078 against a supervised reference of +0.0389.

![Decoder cosine against single-atom steering effect for 39 candidate atoms across three seeds, showing the highest-cosine atoms clustered at zero effect while the best-steering atoms sit at negative cosine](/assets/images/biology-lm-interpretability/alignment-vs-efficacy.png)

**Figure 4.** The circled atoms are the ones attribution selects, at cosine around 0.75 and essentially zero steering effect. The atoms that reach the supervised reference sit at *negative* cosine. Alignment predicts efficacy only weakly, r = +0.445 over 39 candidates.

So the dictionary does contain atoms that realise the direction on their own — the best single atom recovers 86, 95 and 77 percent across seeds. What it does not contain is a way to find them from alignment. In every seed the best-steering atom is strongly anti-aligned, at cosine −0.68, −0.39 and −0.67. That is sharper than a weak correlation: the *sign* of the alignment is systematically wrong for the atom that carries the effect. I do not have a mechanism for this and I am not going to invent one.

A related detail that bears on any attribution method: seven of the 39 candidates have activation changes indistinguishable from zero, at ranks beyond 15,000 of 16,384, and nonetheless steer at +0.013 to +0.023. A feature the perturbation never activates is invisible to any method based on activation change.

## Pooling loses the structure, and the loss is dimensional

Asked to predict whether an intervention changed the model's output on held-out proteins — 7,074 training and 1,994 test variants on a protein-disjoint 157/44 split — mean-pooled activations score AUC 0.4931, which is chance. Adding them to the intervention parameters *lowers* AUC from 0.8338 to 0.6319.

The control that makes this readable is a Gaussian random projection at matched dimension, twenty seeds.

![AUC against components retained, for PCA of real activations and a Gaussian random projection, both declining as components are added](/assets/images/biology-lm-interpretability/fig_pooling.png)

**Figure 5.** Both curves fall as components are added. The random projection matches real PCA at two components and beats it from four to sixteen, by five standard deviations at eight. Neither reaches the intervention parameters alone.

A random subspace of the same width carries at least as much of what predicts the outcome as the leading principal directions of the real activations do, over a third of the range I swept. The information is not absent; the geometry is wrong. Every added direction costs accuracy, which is the signature of a nuisance subspace dominating the variance, and two scalars of boundary margin recover what 1,280 pooled dimensions could not, reaching 0.8846 beside the parameters. Those intervals overlap with the parameters-alone baseline, so I state that as a consistent improvement rather than a demonstrated one.

## A Markov chain passes the reading-frame test

Everything above presupposes that the tests I am using discriminate. For nucleotide models, one of them does not.

I built a typed-intervention battery the way this literature builds such tests: declare a perturbation, declare the expected direction before scoring, pair within sequence, adjudicate against a reference effect. Reading frame is the natural first property, since a model that represents it should distinguish an in-frame stop codon from the same three bases out of frame.

HyenaDNA does not pass. On 24 coding sequences the frame-anchored stop contrast gives +0.00058, interval −0.00045 to +0.00161, 14 of 24 signed, binomial *p* = 0.54, which is a coin.

An order-0 Markov chain carrying only period-3 structure does pass, at +0.00092, interval +0.00064 to +0.00120, 22 of 24. An order-2 chain passes at six times HyenaDNA's effect with all 24 sequences signed. **An order-0 Markov chain assigns base probabilities that depend on position modulo three and on nothing else.** It cannot represent a codon, a stop, or a frame.

![The reading-frame test across model classes, showing HyenaDNA's interval spanning zero, periodic Markov chains passing, and aperiodic controls collapsing to zero or inverting](/assets/images/biology-lm-interpretability/fig_frame.png)

**Figure 6.** The aperiodic controls locate the problem. Remove the periodicity and keep the model class, and every estimate collapses to zero or inverts. The quantity the test responds to is position-modulo-three periodicity.

Any model with that periodicity scores as representing reading frame, and a model without it does not, regardless of whether it represents frame.

Two things I want to be careful about. This is **not** evidence that genomic models fail to represent reading frame; it is evidence that this test cannot tell, and a verdict from it is not evidence either way. And the test is mine, so this is a self-audit rather than an indictment of anyone else's instrument — though I would expect the failure mode to recur in tests built on the same pattern. The pass is also not monotone in chain order: two of six orders fail on the contrast measure, and an order-5 periodic chain has more context-phase cells than I have sequences, so it is fitting noise.

## Implications

**For people using these models as oracles.** The output embedding is the worst place to read a functional direction, because the final layer norm removes most of a constant added direction and collapses the effect ninety-five-fold. If you are pooling a last-layer embedding and feeding it to a downstream predictor, the pooled vector in my hands predicted an intervention outcome at chance while two scalars did most of the job. The practical version: put a zero-parameter baseline beside every number. A single unfitted BLOSUM62 feature decodes fitness at 0.165 against ESM-2's 0.203, and the model's figure is a maximum over 33 layers chosen on the same held-out proteins it is scored on.

**For interpretability methodology.** The gap between an effect and its control is where the result lives. Reading down the effect column of my own work it looks like a set of small positive findings; reading across to the control column, five of twelve invert. The inversions are not exotic — a conventional null, a conventional readout, an unbounded metric, a dose-response inside its linear regime — and each one is individually defensible. The rule I would most want adopted is the one the nucleotide work bought and the protein work could not have produced: **run the test on a model that cannot hold the representation, and report what happens.** A null sequence tells you what a given model does on degraded input. A null *model* tells you whether the test needs the capability it is named for.

**For evaluation and biosecurity.** A white-box evaluation that probes internal activations is only as good as its controls, and the controls that matter are held-out protein families and zero-parameter baselines. My own results say a probe can look informative while standing on family structure or on chemistry fixed decades ago. All of this work uses benign, already-measured proteins, generates no new sequences, runs no wet-lab validation, and releases no reusable steering probe. It is a statement about models, not a tool for designing anything.

## Closing thoughts

The honest summary is that I went looking for where function lives inside these models and found a narrow band that recovers ten percent of the real effect, on ten proteins at one seed and one model scale, with a protein-level interval at exactly one layer. That is a real result and a small one.

What I did not expect was how much of the work would end up being about the instrument. The z = 16.24 cell is the clearest case: three ordinary methodological choices, each defensible, combining to select the one layer where the hypothesis loses to its own control. The reading-frame battery is the second: a test named for a capability, passed by a model that provably lacks it.

The thing I most want to build next is a calibrated noise floor for the faithfulness metric, by fitting directions on disjoint variant draws from the same proteins and measuring their agreement. Every negative result here is reported against its nulls and against nothing else, which means I can say a direction failed to beat its control but not how much signal was available to find. Until that exists, the band is the honest object and the gates are the transportable part.
