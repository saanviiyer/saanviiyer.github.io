---
layout: post
title: "biologos, and whether a genomic model knows protein function"
date: 2026-10-03
tag: "Research"
section: technical
thumb: /assets/images/biologos-transfer/spearman-comparison.png
permalink: /thinking/biologos-transfer/
excerpt: "I matched genomic and protein models on the same 25 deep mutational scanning assays, and a genomic model at Evo 2 scale does not clear a substitution matrix."
---

**TL;DR.** I built biologos to ask whether a model trained on DNA knows anything about protein function, measured against a protein model on the same 25 deep mutational scanning assays. A genomic model at Evo 2 7B scale does acquire some protein-fitness signal, reaching a mean Spearman of 0.266, but that is statistically indistinguishable from the BLOSUM62 substitution matrix at 0.228, it is beaten by a handful of hand-picked chemical properties, and it sits far below ESM-2 650M at 0.466. The Nucleotide Transformer family carries no signal at any scale I tested. Much of this project is a corrections ledger, because four earlier results turned out to be artifacts of how I asked the question.

## I built biologos to test whether a model trained on DNA knows protein function

I started biologos because DNA and protein are two encodings of one molecule related by a map that is exactly known, which makes biology a clean place to ask a question the rest of machine learning can only ask loosely. A genomic language model is trained on DNA sequences, a protein language model is trained on amino-acid sequences, and the question is whether a genomic model that appears to know something about proteins has actually transferred that knowledge or is reading an artifact of how the question was set up.

The measurement uses deep mutational scanning assays, which are experiments that measure the fitness effect of many single mutations to a protein. I matched every scorer on the same 25 assays and measured the Spearman correlation between the scorer and the measured effects, so a genomic model, a protein model, a substitution matrix, and a few chemical properties all answer the same question on the same data.

## A genomic model does not clear a substitution matrix

![Mean Spearman across 25 deep mutational scanning assays for a protein model, a chemistry ridge, Evo 2 7B, BLOSUM62, and the Nucleotide Transformer](/assets/images/biologos-transfer/spearman-comparison.png)

**Figure 1.** Mean Spearman across the 25 assays, with 95% intervals. ESM-2 650M, a protein model, reaches 0.4655. A chemistry ridge fit leave-one-cluster-out reaches 0.2860. Evo 2 7B, a genomic model, reaches 0.2658. BLOSUM62 alone reaches 0.2282. The Nucleotide Transformer v2 50M sits at -0.0132.

The comparison that matters is Evo 2 against the substitution matrix. Evo 2 minus BLOSUM62 is +0.0376, with an interval of [-0.012, +0.087] that contains zero, and Evo 2 is higher in 14 of the 25 assays. Against five fitted chemical features Evo 2 is behind, at -0.0202.

So a genomic model at Evo 2 scale does acquire protein-fitness signal, and the careful way to state it is that the signal is statistically indistinguishable from a substitution matrix, is beaten by five hand-chosen chemical properties, and sits far below a protein model. The Nucleotide Transformer family carries no signal at all at any scale I tested, and its scaling trend does not reach Evo 2, because extrapolated to 7B it predicts +0.024 against the +0.266 measured, short by a factor of eleven.

## Four things I got wrong first

The corrections are the point, so I list them before anyone leans on the headline.

I retracted a reading-frame result. A genomic model appeared unable to tell a gene from the same gene read one nucleotide out of frame, but the frameshift was a rotation, which apart from one wrap junction is actual genomic sequence read one base later. Once I rank the four conditions by whether they produce a actual genomic string, the whole table reproduces with no appeal to reading frame.

I falsified a representation-transfer claim with its own control. A probe on genomic embeddings scored +0.141 on unseen residues, which read as weak transfer, and then it scored +0.143 after frameshifting and +0.129 on the reverse complement. A representation that is invariant to destroying the reading frame is not protein-level, because under any encoding the codon determines the amino acid, so the nucleotides at a varying site already are residue identity.

![A probe scoring 0.141 on held-out residues, 0.143 frameshifted, and 0.129 on the reverse complement](/assets/images/biologos-transfer/frame-control.png)

**Figure 2.** The transfer probe scores about the same on held-out residues (0.141), on frameshifted input (0.143), and on the reverse complement (0.129), so it is invariant to destroying the reading frame. It drops only under a synonymous scramble (0.064), which changes codons without changing amino acids, so the probe is reading codon identity, which determines the amino acid, rather than protein-level structure.

I found a context dose-response that was measuring composition. Actual genomic context made one model monotonically worse, with a trend of -0.771, and composition-matched shuffled flanks that carry no genomic information reproduce it at -0.633. A second model with a wider window produced a clean positive trend that its shuffled twins fully account for, so context trends on this landscape run in both directions from noise.

I made a general claim that was too general. "A genomic model carries no protein-fitness signal" held for the Nucleotide Transformer family and was written as though it held for genomic models, and Evo 2 refutes it. The corrected claim is the one above: at Evo 2 scale the signal exists and does not clear a substitution matrix.

## Acknowledgements

biologos is independent research, and it is a measurement rather than an attempt to build a better model. The code is at github.com/saanviiyer/biologos.
