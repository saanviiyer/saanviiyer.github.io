---
layout: post
title: "What a protein language model's representation carries"
date: 2026-11-10
tag: "Research"
section: technical
rank: 2
math: true
published: false
dek: "A linear probe reads contacts out of ESM-2 at AUC 0.909. Removing the directions it found barely changes what the model itself predicts. Decodable and used are different claims, and most of the work is in telling them apart."
authors:
  - Saanvi S. Subramanian
affiliations:
  - Caltech
artifact: "ESM-2 650M and 8M, 1,500 fold-split SCOPe domains"
thumb: /assets/images/protein-lm-interpretability/contact-by-depth.png
permalink: /thinking/protein-lm-interpretability/
excerpt: "A linear probe reads residue contacts out of ESM-2's embeddings at AUC 0.909 on held-out folds. Removing the directions that probe found barely moves the model's own contact prediction. Decodable and used are different claims, and separating them is most of the work."
---

**TL;DR.** I probed ESM-2's residue embeddings for five structural properties on 1,500 SCOPe domains, split so that no test protein shares a fold with any training protein. Structure is there and it is easy to read: contacts at AUC 0.909, three-state secondary structure at 0.956, both far above every control I could build. Then I asked the question a probe cannot answer on its own. I found the directions the contact probe relies on and removed them, and the probe lost only 0.055 AUC before a refitted probe recovered almost all of it. Removing all 64 of them still left 0.847. When I removed those same directions inside the model and let the remaining layers run, ESM-2's own contact head moved by at most 0.014. The information is real, it is spread across many directions, and the model's own prediction barely depends on the ones my probe liked.

## In this post

I want to separate three claims that often travel together. The first is that a property is **decodable** from a representation. The second is that it is decodable **because the model represents it**, rather than because something simpler correlates with it. The third is that the model **uses** what the probe found. Each needs a different measurement, and on protein structure I can run all three.

So, in order: what I measured and on what data, what the trivial baselines already give you before the model does anything, where in the network structure shows up, what happens when I delete the directions a probe depends on, and what happens when I delete them inside the model and let it keep computing. At the end there is a side result about layer selection that I did not go looking for.

## What counts as evidence here

The target is ESM-2 650M, with the 8M model as a small control. For each of 34 hidden states I take the per-residue vectors and fit a probe on them: multinomial logistic regression for per-residue targets, and for pairs a rank-64 bilinear form, so each residue still passes only through a linear map. Five targets, all read off the deposited structure: residue contact, a seven-bin distance, three- and eight-state secondary structure, solvent accessibility, and ligand-binding residues.

Three design choices do most of the work.

**The split is by fold.** Proteins are grouped by SCOP fold and whole folds are assigned to train, validation and test, so no test protein shares a fold, and therefore no superfamily and no family, with anything in training. This matters more than it sounds. A split by sequence identity still lets a test protein sit beside a training protein of the same architecture, and then a probe that has memorised an architecture looks like a probe that has learned geometry. After the split I have 1,050 training, 151 validation and 299 test domains over 494, 69 and 135 folds, which is 55,817 labelled test residues and 6.4 million test residue pairs.

**The layer is chosen on validation, never on test.** Every representation, including every control, gets its own best layer picked the same way. That favours the controls, which is the direction I want to err in.

**Intervals come from resampling folds, not residues.** Residues inside one protein are not independent, and proteins inside one fold are not either. Bootstrapping over the 135 test folds gives intervals that reflect how much of a result rides on which folds happened to land in test.

I also screened the panel before downloading anything, excluding resistance determinants and toxins by the same criterion I apply to the functional work, which removed 348 of 6,500 candidate domains. That costs test folds, and therefore precision, and it is the right trade.

## What do you get before the model does anything?

This is the question I most want answered before reading any model number, because on pair tasks the baseline turns out to be most of the way to the model.

Residues near each other in the sequence are near each other in space. So a contact probe that sees nothing but the sequence separation between two residues and the length of the chain, with no embedding at all, reaches **AUC 0.695**. A model scoring 0.72 on contacts has not demonstrated much. For the per-residue targets the strong control is different: a one-hot window of the five residues on either side reaches 0.780 on three-state secondary structure, because local sequence composition really does predict helix and strand.

Here is the full comparison, each row against the strongest control I could build for that target.

| target | ESM-2 650M | strongest control | which control |
|---|---|---|---|
| secondary structure, 3-state | 0.956 | 0.780 | one-hot window |
| secondary structure, 8-state | 0.913 | 0.745 | one-hot window |
| solvent accessibility | 0.906 | 0.765 | one-hot window |
| binding site | 0.843 | 0.652 | untrained network |
| contact | 0.909 | 0.695 | length and separation |
| distance bin | 0.774 | 0.680 | length and separation |

All six intervals are clear of their control. Structure is genuinely in there, and this is not a close call.

Two of the controls are worth naming properly. **Untrained** is ESM-2 650M with random weights, probed identically. It is a null model rather than a null feature set, and on binding sites it is the strongest control there is, at 0.652 on its own. A random network with the right architecture is not nothing, and anyone reporting a binding-site probe without that comparison is reporting partly the architecture. **Shuffled sequence** permutes each protein's residues, preserving composition exactly and destroying order; the contact probe falls to 0.645 on it.

<img src="/assets/images/protein-lm-interpretability/contact-by-depth.png" alt="Contact AUC against relative depth for four representations. ESM-2 650M rises from 0.56 to 0.909, crossing the length-only line around 0.2 depth and separating clearly only after 0.6. The 8M model, the untrained network and the shuffled-sequence control all stay at or below the length-only line of 0.695.">

**Figure 1. Where contact information shows up.** The dotted line is what sequence separation and chain length give you with no model at all. ESM-2 650M separates from it only in the back half of the network. The 8M model never clearly does, and neither does the untrained network or the shuffled-sequence control. The two solid lines are references rather than results: ESM-2's own attention-based contact head at 0.922, and ESMFold, a supervised structure predictor, at 0.997. I quote ESMFold only to mark the ceiling, and it is inflated, because it was trained on PDB entries that very likely include these test chains.

The shape matters. If contact information were a simple consequence of sequence locality, the curve would be flat and sit near the dotted line. Instead it is flat and near the dotted line for the first half of the network and then climbs, which is what a representation being built looks like.

## Is the information in a few directions?

Now the part a probe cannot settle by itself. My contact probe is a rank-64 bilinear form, so it reads each residue through 64 directions. If structure lived in a small subspace, removing those directions should destroy the signal.

I ranked the 64 directions by how much validation AUC each one's removal costs, then projected the top ones out of the embeddings and rescored.

<img src="/assets/images/protein-lm-interpretability/redundancy-and-edit.png" alt="Panel A, a dot plot of contact AUC: nothing removed 0.909, best 8 removed 0.854, best 8 removed then probe refit 0.889, all 64 removed then refit 0.847, 8 random directions 0.909. Panel B, contact-head AUC against the layer the edit is applied at: 8 random directions stay flat at 0.922 while the probe's best 8 dip to 0.908 around layer 29.">

**Figure 2. Deleting the directions, two ways.** In panel A the vertical range is 0.14 AUC. In panel B it is 0.025, and the grey band is the no-edit interval.

Panel A is the answer. Removing the single most important direction costs 0.011, against 0.012 for removing the top principal component instead, so that direction is not doing anything a generic high-variance direction would not. Removing the best eight costs the trained probe 0.055, which looks like a localisation result until you refit: **a probe retrained on the ablated embeddings recovers to 0.889 of 0.909.** Removing the entire 64-direction subspace the probe uses and refitting still leaves 0.847, far above the 0.695 baseline. Eight random directions cost nothing at all.

The reading is that contact information is spread redundantly across many directions. This is also a warning about method. Had I reported only the frozen-probe number, 0.909 falling to 0.854, I would have published a localisation claim that the retraining control dissolves. An ablation is interpretable only next to a refit.

## Does the model use them?

Decodability and use are different, and the probing literature has said so for years. The test is to intervene on the model rather than on a frozen matrix of activations: project the directions out of the residual stream partway through the forward pass, let the remaining layers run, and score something the model itself produces. ESM-2 ships a contact head that reads its own attention maps, so I have a readout that is the model's and not mine.

Panel B of Figure 2 is the result. Removing eight random directions leaves the contact head at 0.922 everywhere, never shifting it by more than 0.0003. Removing the probe's best eight does nothing through the first dozen layers, then opens a small gap reaching **0.014 at layer 29**. The effect is real, it is concentrated where the probe's information lives, and it is small, about four times smaller than what the same projection does to the probe itself.

A null result from an intervention is worth nothing unless the intervention can move the readout at all, so the positive control matters more than the null. It can: removing the top eight **principal components** at the token embedding instead collapses the contact head from 0.922 to **0.646**. The machinery works. The probe's directions are simply not what the model's own contact prediction runs through.

I want to be careful about what this licenses. It is one model, one readout, one probe family. Failing to move ESM-2's contact head is not the same as failing to change the computation, and a stronger probe might find directions that matter more. What it does rule out is the easy inference: that because a linear probe found a direction encoding contacts, the model is using that direction to predict contacts.

## What the probe cannot read

Three limits, stated as numbers.

**Long-range contacts.** Precision on the top L/5 long-range pairs is 0.533 from the embedding probe, against 0.745 from ESM-2's own attention head on the same proteins. Long-range contact geometry is better read from attention maps than from any low-rank bilinear form of the residual stream.

**Metric distance.** Seven-bin distance accuracy is 0.640, below the 0.666 you get by always guessing the commonest bin. Macro AUC of 0.774 and a per-protein Spearman of 0.501 against true distance say there is real signal, but beyond the contact and no-contact boundary a linear readout recovers little actual distance.

**Binding sites.** AUC 0.843 clears every control, but average precision is 0.396 against a base rate of 0.091, and only 68 test proteins carry binding labels. The negatives are noisy by construction, since a residue with no ligand nearby in this particular deposited entry may bind something else.

## A side result about picking layers

While comparing against work on the intrinsic dimension of these representations, I ran into something I was not looking for.

There is a well-cited unsupervised recipe for choosing which layer of a protein language model to use: compute the intrinsic dimension of the representation at each layer and take the relative minimum, on the argument that the most compressed layer is the most abstract. It is attractive because it needs no labels. It has been validated by the quality of what it produces, not against a supervised measurement of where the information is. I had both curves on the same proteins, so I overlaid them.

<img src="/assets/images/protein-lm-interpretability/id-vs-decodability.png" alt="Top panel, intrinsic dimension against layer, rising to 24 at layer 5 then falling to a flat minimum of 2.09 near layer 23 and rising again at the end. Bottom panel, contact AUC, three-state secondary structure accuracy and solvent accessibility AUC all continuing to rise past layer 23 and peaking at layers 32 and 33.">

**Figure 3. The heuristic picks layer 23. The information peaks at 32 and 33.** Dots mark each probe's best layer.

Choosing the intrinsic-dimension minimum costs **0.133 contact AUC**, 0.076 on three-state secondary structure and 0.061 on accessibility, against each target's best layer. Across layers the two quantities correlate at about $-0.57$, and over the last ten layers both rise together, so in that range the heuristic points the wrong way. The minimum is also flat: four layers sit within 0.02 of it, so the recipe selects one layer out of a band it cannot resolve, and none of that band is where the information is.

Two honest caveats. Intrinsic dimension here is a whole-protein, mean-pooled quantity while my probes are per-residue, and the original claim is specifically about remote homology, which is also a whole-protein task. So this is the closest supervised measurement I have, not the same measurement, and the direct test would be remote-homology accuracy by layer. The intrinsic dimension is also computed at the smallest neighbourhood scale, which is where these estimates are least stable.

## What I take from this

The useful output is not the headline number. It is the gap between the three claims I started with.

Structure is decodable from ESM-2's embeddings, clearly and well above every control. That is claim one, and it holds. Claim two needs controls that are built rather than random, and the length-only baseline at 0.695 of a 0.909 result is the reason: most of what a careless contact probe reports is sequence locality. Claim three needs an intervention on the model with a positive control attached, and it does not hold here, because the model's own prediction barely depends on what the probe found.

The practical version is three questions to ask of any probing result, mine included. What does the trivial baseline get? What happens if you retrain the probe after ablating? And when you intervene, can you show the intervention is capable of moving the readout at all?

## Acknowledgements

The structure probes here are the counterpart to a functional arm I describe in [an earlier post](/writing/interpretability/), where the same instrument deflates rather than confirms. The intrinsic-dimension comparison grew out of a separate project auditing that measurement. Code, configurations and seeds for everything above are in the probe suite; the fitted directions are not released.
