---
layout: post
title: "PRISM: methods, controls, and what each number is a number about"
date: 2026-09-29
tag: "Research"
section: technical
thumb: /assets/images/prism-signature-steering/scramble.png
permalink: /thinking/prism-signature-steering/
excerpt: "The lab report for PRISM: how the pipeline works, what each control measures, and where the numbers came from."
---

*This is the methods companion to [The probe works and the understanding is not there]({{ '/thinking/the-probe-works-and-the-understanding-is-not-there/' | relative_url }}), which is where I work out what the result means for evaluation. Here I record how the pipeline works, what each control measures, and which file each number comes from.*

## The pipeline

A mutational signature is the characteristic pattern of DNA base substitutions a mutational process leaves behind, and the COSMIC catalog lists 78 single-base-substitution signatures, each a probability distribution over base changes in their trinucleotide context. PRISM asks whether those processes move the proteins they alter toward particular regions of a protein model's representation.

For each signature, the operator walks a coding sequence and samples substitutions from that signature's channel weights for the local trinucleotide. It writes edits in place, so a substitution can change the context for the next position, which is rare at per-position probabilities of order ten to the minus two. The current configuration generates ten mutants per protein and signature condition. Reverse-complement substitutions are omitted.

The source proteins come from two Pfam clans: 65 usable accessions across 12 families in CL0023, the P-loop NTPase clan, and 9 accessions from a single family in CL0072. Other clan runs exist in the archive, so the two-clan framing is a selection from more runs, which I state plainly below.

Each mutant is translated and embedded with ESM-2 8M. Mean pooling over residue vectors, excluding the start and end tokens, gives one vector per protein. Displacement toward a Pfam family is the signed change in cosine distance to that family's centroid, so a positive value means the mutant mean sits closer to the family than the wild type does. The centroid library holds 27,481 Pfam family centroids at 320 dimensions. Steering analyses use hidden layer 5 of the same model.

Two notes on the model size, because they bound what the pipeline can say. The trajectory work runs on ESM-2 8M, not 650M. A 650M centroid library exists but covers only 492 clan-restricted families, which is not enough for a catalogue-wide comparison, so I could not test whether these results hold at a larger model scale.

![PRISM pipeline schematic](/assets/images/prism-signature-steering/pipeline-schematic.png)

**Figure 1.** The pipeline runs from an SBS signature, to simulated coding mutations, to ESM-2 embeddings of wild-type and mutant proteins, to displacement measured against Pfam centroids.

## SBS17a ranks first toward PF17041 in both clans

On the raw geometry, SBS17a is the top-ranked signature of 78 for directing sequences toward the Pfam family PF17041, and it holds that rank in both CL0023 and CL0072. The same direction appearing in two protein contexts is what a genuine effect would produce rather than a single coincidence.

The corrected rerun changes how much that recurrence is worth. The legacy pipeline translated each mutant to the first stop codon. Mapping stop codons to X and continuing translation removes nearly all of the between-signature length variance, and SBS17a stays first in both clans, with concentration rising from 31.6% to 71.7% in CL0023 and from 68.3% to 100.0% in CL0072. But PF17041 attracts more signatures overall under read-through, CL0072 hubness rises from 1.13% to 5.35%, and enrichment falls from 60.7 times to 18.7 times. Six signatures select PF17041 as their modal CL0072 target, and other pairs also reach 100% concentration. The rerun keeps the association and removes the earlier claim that SBS17a was unique in it.

One more bound on this arm: the PF17041 centroid is built from four seed sequences.

![SBS17a ranks first of 78 signatures toward PF17041 in both clans](/assets/images/prism-signature-steering/sbs17a-ranking.png)

**Figure 2.** SBS17a is the top-ranked signature of 78 for directing sequences toward PF17041 in both clans. The bar heights are the pre-read-through concentrations, 31.6% in CL0023 and 68.3% in CL0072, which the read-through rerun raises to 71.7% and 100% while keeping SBS17a first.

## Length explains most of the displacement magnitude

Premature stops tie signature identity to protein length. Signatures differ in stop-codon probability, mean-pooled embeddings depend on the translated sequence, so length offers an explanation for displacement that needs no functional shift.

Fitting mean absolute displacement on log translated length, one point per signature across all 78, gives R-squared 0.941 within CL0023. That is an ordinary least-squares fit on log length, and the fraction of variance it accounts for is the fraction of a per-signature summary, not of per-protein movement. Two provenance notes: the original analysis reported R-squared 0.925 for the same relationship but I found no code or saved output that produces it, and the archived re-derivation that gives 0.941 used 68 source sequences where the retained trajectory panel has 65, so it is not a re-analysis of exactly the same panel. The pairwise arm shows a weaker length association at R-squared 0.53.

![Translated length by signature, and mean absolute displacement against log translated length with R-squared 0.941](/assets/images/prism-signature-steering/length-confound.png)

**Figure 3.** Signatures differ in how long their translated sequences are, because they differ in stop-codon probability, and mean absolute displacement falls almost perfectly with log translated length at R-squared 0.941 across the 78 signatures.

## A composition-matched scramble reproduces 72% of the steering, on one readout

The steering arm adds a norm-matched direction vector at hidden layer 5 to held-out wild-type embeddings and measures how far that moves them toward the PF17041 centroid. The measured SBS17a direction reduces cosine distance by 0.0425. A context-scrambled direction, which preserves composition and destroys the signature's trinucleotide structure, reduces it by 0.0306. The ratio is 72% over five seeds, which is why I read this effect as predominantly compositional.

That 72% belongs to that readout and does not generalize across the project. On the trajectory readout the same scramble control retains only about 34% of the excess above uniform, with measured, scrambled and uniform concentrations at 0.4923, 0.1900 and 0.0360. Two controls of the same name give different answers depending on what they are measuring, so I report the readout alongside the ratio.

A composition follow-up narrows this further. Amino-acid frequencies alone predict cosine distance to the PF17041 centroid at grouped cross-validated R-squared 0.339. On the change in distance rather than the level, that falls to 0.0966, so composition explains about a tenth of the movement itself. The closed-loop design arm found signature-guided minus composition-matched at -0.0027, p = 0.875.

![The signature direction moves held-out embeddings toward PF17041, and a context-scrambled direction keeps 72% of that movement](/assets/images/prism-signature-steering/scramble.png)

**Figure 4.** The measured SBS17a direction reduces cosine distance to the PF17041 centroid by 0.0425, and a context-scrambled direction that preserves composition keeps 72% of that movement. The right panel shows the context effect, 0.0081, sitting 5.8 times above the seed-to-seed floor of 0.0014.

## The recommender: two evaluations, not one

The inverse-design recommender ranks signatures for a requested Pfam-to-Pfam transition. A random forest reads the origin centroid, the target centroid, their difference, and each signature's 96-channel COSMIC profile, over 35,403 positive-attraction transitions spanning 75 proteins.

It gets scored two ways, and the two are different tasks. The archived in-distribution run reports AUC 0.94, a binary discrimination between a measured transition and sampled negative signatures on a protein-grouped split. The leave-signatures-out run is a 78-way identification with whole signatures held out as both positives and negatives across five folds, and there top-1 accuracy is 0.775% and top-5 is 7.125%. Top-1 sits below the 1.28% a uniform guess over 78 classes would give. With SBS17a excluded from training, the model ranks it first in none of 158 test cases. A separate archived run gives top-1 0.725% and top-5 7.975%, which is the source of an earlier 0.7% in my own prose; the canonical values are the 0.775% ones.

AUC measures discrimination over score thresholds on familiar mechanisms. Top-k measures whether the right signature surfaces for a mechanism never seen. Reporting only the first would describe a recommender that does not work out of distribution as one that works.

![Transfer to unseen signatures: leave-signatures-out top-1 accuracy is 0.8 percent, below the 1.3 percent uniform line, and 0.0 percent with SBS17a withheld](/assets/images/prism-signature-steering/loso.png)

**Figure 5.** Transfer to unseen signatures. Leave-signatures-out top-1 accuracy is 0.775%, plotted rounded to 0.8%, below the 1.28% a uniform guess over 78 classes would give, and 0.0% when SBS17a itself is withheld.

## What is not here

PRISM measures geometry inside a protein model's representation, so every number above is a statement about the model and not about biological function. SBS17a is not a validated functional driver on this evidence: the length relationship accounts for most of the displacement magnitude, the scramble control takes most of the steering, the read-through rerun removes the uniqueness claim, and the recommender does not transfer to held-out mechanisms.

There is no residue-level attribution. Nothing here isolates which positions carry whatever signature-specific residual survives the composition and length controls, and that is the experiment this work points at next.

## Acknowledgements

PRISM was supervised independent research with AITHYRA, with Gabriela Lobińska, and I presented it as an oral at IEEE CIBCB 2026. The audit code is in the [protein-lm-audits repository](https://github.com/saanviiyer/protein-lm-audits/tree/main/prism).
