---
layout: post
title: "Transfer that survives its controls"
date: 2026-10-09
tag: "Research"
section: technical
thumb: /assets/images/biologos-transfer/spearman-comparison.png
permalink: /thinking/transfer-that-survives-its-controls/
excerpt: "Four cheap controls that decide whether a cross-representation claim is real, the four of my own claims they overturned, and the one model built to close the gap that nobody had scored zero-shot."
---

<!-- REVIEW DRAFT. Replaces /thinking/biologos-transfer/ rather than editing it.
     Not published while it sits in _drafts/.

     FIGURES — three needed, one exists:
     1. frame-control.png EXISTS and is still accurate (0.141 / 0.143 / 0.129 / 0.064,
        all re-verified against results/transfer_analysis.csv on 2026-10-08).
     2. spearman-comparison.png EXISTS but is STALE. It draws m +/- 1.96*SE intervals,
        a method the project lists among its own corrected defects, and labels ESM-2
        as 0.466 when the mean is 0.4655 (0.465 to three decimals). Needs regenerating
        with t intervals and the corrected label before this post goes live.
     3. A gate diagram and a tokenizer-contrast chart do not exist as site assets yet.
        Both are drawn in the working artifact. Marked inline below. -->

**TL;DR.** DNA and protein are two encodings of one molecule, related by a map that is known exactly, which makes biology the sharpest available place to ask a question the rest of machine learning can only ask loosely: when a model trained on one representation appears to know something about another, is that transfer, or an artifact of how the question was asked? The reusable part of this project is four controls that decide it, each cheap, each costed in model evaluations rather than GPU-hours. Applying them overturned four of my own claims. Applying them to the one model built specifically to close the gap — a codon-aligned genomic model nobody had scored zero-shot — gives the cleanest result here: codon-level tokenization buys nothing. The comparison people quote, a 7B genomic model against a substitution matrix from 1992, is a case study inside that rather than the point.

## Why biology is the sharp place to ask

When a model trained on English appears to know something about Swahili, nobody can write down the map between them. You can measure the transfer, but you cannot subtract off what the two languages share and inspect the remainder.

DNA and protein are different. The genetic code is a complete, published, 64-to-20 lookup table. Every amino acid is three nucleotides, and the mapping is fixed. That buys two things no human-language study gets. You can build controls that destroy the map while leaving the input inside the model's training distribution. And because many codons spell one amino acid, the model's own behaviour across synonymous encodings gives you a noise ceiling for free.

## Four controls that decide whether transfer is real

Abstractly: a model *f* scores inputs in representation *A*, and someone claims *f* captures a property *P* defined on modality *B*, where *A* and *B* are related by a known many-to-one map. Four things follow, and all four are constructive.

**1. A noise ceiling taken from the model, not from replicates.** Inputs that must share a label exactly form a fibre. Any variation of *f* inside a fibre is variance that cannot track the label, so it attenuates any correlation *f* could have. The ceiling is κ = √(σ²between / (σ²between + σ²within)), and a true correlation can appear no larger than κ times itself. For genomic models the fibres are synonymous encodings, and this costs nothing at all: scoring a variant already requires choosing a codon, and the same masked pass prices every synonymous alternative. Across the 25 assays the Nucleotide Transformer's κ is 0.900, so a true correlation of 0.5 would still have shown up as 0.45. **A null reported without a ceiling may just be a measurement with no power.**

**2. Controls that destroy the map but keep the input natural.** If the representation is genuinely *B*-level, destroying the map must destroy the signal. The subtlety is that the control has to keep the input inside *f*'s training distribution, or a drop is confounded with distribution shift and proves nothing. DNA gives two that qualify: a one-nucleotide frameshift changes every downstream codon while leaving a real genomic string, and the reverse complement is real sequence on the opposite strand. One control that looks admissible and is not: replacing every codon with a synonymous alternative also preserves the protein, and the signal does drop, but that is a global distribution shift as much as a map manipulation. It is recorded as a negative design lesson rather than as evidence.

**3. Composition-matched context twins.** Any claim that more context improves a score needs a twin supplying the same number of tokens, with the same composition, carrying no information. Mononucleotide and dinucleotide shuffles applied separately to each flank give it. The quantity reported is real minus shuffled, never the real trend alone.

**4. Trivial baselines, under correlated-unit accounting.** Without a trivial baseline a model is compared to zero instead of to the cheapest thing that works. Without correlated-unit accounting the sample size is inflated by homology. Both were committed here and both changed conclusions.

**What the protocol costs.** The ceiling is free. The map controls are two extra forward passes per variant. The context twins are one extra pass per arm. The baselines are arithmetic. None of this needs a compute argument, which is the point of costing it in evaluations rather than hours.

<!-- FIGURE: gate diagram — the four controls as sequential gates, each exit labelled
     with the claim that died there. Drawn in the artifact; needs exporting as PNG. -->

## The cleanest result: codon tokenization buys nothing

If a genomic model's problem were that it cannot see codons, the fix would be to give it codons. Someone built that model, and scored zero-shot it is no better.

The setup is unusually clean. Boshar et al. trained a 3-mer variant of Nucleotide Transformer v2 50M specifically because codon-level resolution was where genomic models lost to protein models under fine-tuning. A 3-mer token is exactly a codon. The two models are identical in every respect that normally confounds a comparison — 512 hidden dimensions, 12 layers, 16 heads, the same 850-genome corpus — and differ only in vocabulary, 4,107 tokens against 75.

It had never been scored zero-shot. On the same 25 assays, 3-mer minus 6-mer is **-0.0156, interval [-0.0426, +0.0119]**, with the 3-mer higher in 9 of them. The interval contains zero. The point estimate is negative, and the right reading is not that codon tokens hurt — my own log carries a standing instruction not to claim that — but that giving a genomic model codons does not buy it protein-level signal.

<!-- FIGURE: tokenizer contrast — 3-mer and 6-mer against BLOSUM62 and ESM-2 on one
     axis, showing the tokenizer gap is ~1/15th the gap to a substitution matrix. -->

Three things make this a result rather than another null. It is not a power failure: both arms sit 0.241 to 0.257 below BLOSUM62 with attenuation ceilings of 0.866 and 0.900, so the measurement could have seen an effect this size several times over. It is internally checked: the 6-mer arm reproduces the published -0.0132 exactly. And it carries a falsifiable prediction — if fine-tuned genomic models do well on protein tasks by learning the codon lookup table through their head, their fine-tuned performance should largely survive frameshifting the input. That is cheap, it is stated before anyone runs it, and it would separate the two readings of Boshar et al.'s result.

One sampling lesson sits alongside it, because it nearly went the other way. At 14 of 25 assays the tokenizer difference read -0.0302 with an interval excluding zero. It did not survive the remaining eleven.

## The case study: Evo 2 against a substitution matrix

![Mean Spearman across 25 deep mutational scanning assays](/assets/images/biologos-transfer/spearman-comparison.png)

**Figure.** Mean Spearman across the 25 assays. ESM-2 650M reaches 0.4655, a chemistry ridge fit leave-one-cluster-out reaches 0.2860, Evo 2 7B reaches 0.2658, BLOSUM62 alone reaches 0.2282, and Nucleotide Transformer v2 50M sits at -0.0132.

ESM-2 and the Nucleotide Transformer are compared like-for-like: same assays, same masked-marginal protocol, same region. Evo 2 is not, and the figure would mislead without saying so. It is autoregressive, scored by summed token log-likelihood rather than masked marginals, and in 22 of the 25 assays it was scored on a capped subsample of at most 1,500 variants — 19% of the mutations in the largest assay. The assays match; the variant sets and the scoring rule do not.

Evo 2 minus BLOSUM62 is **+0.0376, interval [-0.012, +0.087]**, higher in 14 of 25. The interval contains zero, but a failure to reject is not equivalence, and this is the distinction the page would be worst to blur. Grouped into 21 protein clusters the difference is +0.0398, and the smallest effect the comparison could reliably have caught is about 0.083 — **37% of BLOSUM62's own score**. Detecting the observed effect at 80% power would need roughly 92 clusters against the 21 available.

Pushed further: equivalence within a symmetric margin holds exactly when the 90% interval sits inside it, so the smallest margin these data could support is **0.0884, or 40% of BLOSUM62's own cluster-level score**. Nobody accepts "equivalent to within 40% of the baseline" as equivalence. The defensible claim is the narrow one — this study fails to reject a difference, and is not powered to show there is none.

Against the fitted chemistry features Evo 2 is behind at -0.0202, an interval that also contains zero, and that comparison is not like-for-like either, since the ridge is supervised and leave-one-cluster-out fitted while Evo 2 is zero-shot.

The Nucleotide Transformer family carries nothing at any scale tested. Extrapolated to 7B its trend predicts +0.028 against the +0.266 measured, short by a factor of 9.5. Two caveats belong on that figure. All four per-size means have intervals containing zero, so the family is flat in *level* and monotone only in *order*; the fit exists to grant the scaling account its best case, not because these data establish a trend. And the slope is not significant at p = 0.083 by exact permutation over all 24 orderings of four points — which is the floor of that test, so four points cannot produce a smaller number however clean the ordering looks. The 9.5 is better read as a lower bound on the gap than as a prediction.

## Four claims I withdrew, and which gate caught each

Three were caught by a specific control, which is the evidence the controls work. The fourth was caught by nothing but a wider model set, which is the evidence they are not sufficient.

**Gate 1 — a reading-frame result, retracted.** A genomic model appeared unable to distinguish a gene from the same gene read one nucleotide out of frame. The "frameshift" was a rotation, which apart from one wrap junction is real genomic sequence read one base later. Rank the four conditions by whether they produce a genuine genomic string and the entire table reproduces with no appeal to reading frame. The replacement probe, calibrated against a 3-periodic Markov positive control, turned out to be underpowered rather than null — which is a different thing to report.

**Gate 2 — a representation-level transfer claim, falsified by its own control.** A probe on genomic embeddings scored +0.141 on unseen residues. It scores +0.143 after frameshifting and +0.129 on the reverse complement. A representation invariant to destroying the reading frame is not protein-level: under any encoding the codon determines the amino acid, so the nucleotides at a varying site already *are* residue identity.

![A probe scoring 0.141 on held-out residues, 0.143 frameshifted, and 0.129 on the reverse complement](/assets/images/biologos-transfer/frame-control.png)

**Figure.** The probe scores about the same on held-out residues (0.141), frameshifted (0.143), and on the reverse complement (0.129). It drops only under a synonymous scramble (0.064), which changes codons without changing amino acids — so it is reading codon identity, not protein structure.

**Gate 3 — a context dose-response that was measuring composition.** Real genomic context made one model monotonically worse, trend -0.771, and composition-matched shuffled flanks carrying no genomic information reproduce it at -0.633. A second model with a wider window produced a clean positive trend of +0.536 that its shuffled twins fully account for. On this landscape, context trends run in both directions from noise.

**No gate caught this one — a general claim that was too general.** "A genomic model carries no protein-fitness signal" held for the Nucleotide Transformer family and was written as though it held for genomic models. Evo 2 refutes it, and the claim had to be narrowed to the family it was measured on.

## Where this sits

The closest prior work reaches an apparently opposite answer, and reconciling the two is part of the result. Boshar et al. (2024), in *Bioinformatics*, fine-tune Nucleotide Transformer v2 500M on five protein tasks and match or beat ESM-2 on three. They do not use a non-model baseline, a map-destroying control, or a noise ceiling, and they do not evaluate zero-shot variant effect at all.

The difference is diagnostic rather than awkward. A fine-tuned readout can recover residue identity from nucleotides through exactly the codon channel control 2 exposes — the head learns the lookup table — while a bare likelihood cannot. So "a genomic model can be fine-tuned to do protein tasks" and "a genomic model's likelihood carries no protein-fitness signal beyond a substitution matrix" are both true, and the gap between them is the thing worth naming.

**Concurrent work overlapping directly.** [The Mechanistic Invariance Test](https://arxiv.org/abs/2604.06549) (Cheng and Zhang, ICLR 2026) reaches my regulatory-arm result independently and better powered: five genomic models including Evo2-1B, a 650-sequence benchmark with scrambled controls, universal strand-blindness, and a 100-parameter position-aware PWM at perfect performance where billion-parameter models fail. They also find that larger models show *stronger* compositional bias, so scale amplifies the failure rather than correcting it. That arm of my work should be read as corroborated rather than novel, and I would rather say so than have a reader discover it.

## Outside biology

The general form: whenever a representation *A* determines a property *P* of modality *B* through a known map, a claim that *A* encodes *P* at *B*'s level has to rule out the map itself. Claims of that shape are made for multimodal encoders, for code models said to reason about natural language, and for any system credited with a capability it was not trained on.

The four controls do not generalize equally, and saying so is more useful than claiming they do. **The noise ceiling generalizes cleanly** and is the most portable piece: it needs only an invariance the model ought to respect, not an exact map, so paraphrase sets, augmentation orbits and equivalent programs all supply fibres. **The map-destroying controls degrade**, because outside biology the map is approximate, so a manipulation that destroys it perturbs other things too and the control becomes evidence rather than proof. **The twins and baselines are not novel anywhere** — they are standard practice frequently skipped, and what this project adds with respect to them is a demonstration of what skipping them cost.

## What I would attack first

A page whose contribution is a validity protocol should be judged hardest on its own validity, so: the strongest attack is that **Evo 2's +0.266 has never been given control 2.** Section 17 took the only other genomic transfer signal measured here, +0.141, and showed it was entirely codon leakage. Evo 2 has had no frameshift, no reverse complement, no codon marginalisation and no noise ceiling. Until it does, "weak genuine transfer" and "a 7B-scale codon lookup" are not separated by anything in my data, and the mechanism I argue for predicts the second. The experiment is two extra forward passes per variant.

Two smaller ones worth stating. The Evo 2 numbers come from a single run on one GPU host, so there is no run-to-run variance attached to the figure the case study rests on. And every assay in the panel has measured homologs, so the regime a practitioner most wants a model for — a sequence with no measured relatives — is untested throughout.

## Code and data

Everything is at [github.com/saanviiyer/biologos](https://github.com/saanviiyer/biologos), with one runner per experiment and `results/` holding the tables every number above is read from. The full findings log, including the corrections ledger, is `docs/FINDINGS.md`. A check that re-derives every headline number from the result files and fails on drift is `scripts/check_reported_numbers.py` — it caught a wrong figure on its first run.

biologos is independent research, and it is a measurement rather than an attempt to build a better model.
