---
layout: post
title: "The probe works and the understanding is not there"
date: 2026-09-28
tag: "Research"
permalink: /thinking/the-probe-works-and-the-understanding-is-not-there/
excerpt: "What a protein-model stress test taught me about representation, generalization, and evaluation."
---

*What a protein-model stress test taught me about representation, generalization, and evaluation. By Saanvi S. Subramanian.*

I trained an inverse classifier to predict which mutational signature had pushed a protein embedding in a particular direction. On familiar signatures, it reached an AUC of 0.94. That number looked like a result. Then I removed entire signatures from training and asked the classifier to identify them. Top-1 accuracy fell to 0.7%.

The probe worked, and the understanding was not there.

That gap changed how I think about claims that a model "represents" a concept. A probe can recover information from an activation without showing that the model has learned a portable abstraction. It may be reading a signature-specific fingerprint, a confound, or a feature that only exists inside the original data distribution. If the representation is supposed to support prediction, planning, or design, treat decodability as the start of the evaluation.

This result came out of PRISM, a pipeline I built to study whether mutational processes leave directional traces in protein representation space. The starting point was biological. Cancer mutational signatures describe characteristic patterns of nucleotide substitutions. I wanted to know whether those processes could systematically move the proteins they alter toward different functional regions, rather than looking like undirected noise once translated into amino acids.

The pipeline simulates all 78 COSMIC single-base-substitution signatures on protein-coding sequences, translates the resulting sequences, embeds wild-type and mutant proteins with ESM-2 650M, and compares each mutant cloud with a library of Pfam domain centroids. In one result, SBS17a repeatedly moved sequences toward PF17041 across two independent Pfam clan runs. That was interesting because the same direction appeared in separate protein contexts.

But "the embeddings move" is only a geometric observation. It does not yet tell me why they move, whether the direction corresponds to a biological mechanism, or whether a model can recognize the same kind of shift when the surface pattern changes. The inverse classifier gave me a way to make one of those assumptions testable.

AUC 0.94 says that, among signatures represented during training, the embedding shifts are highly separable. The 0.7% top-1 result asks for something harder: it removes entire signatures from training, then tests whether the classifier can identify those unseen mechanisms. On that test, the apparent structure mostly disappears. In-distribution decodability asks whether information is present. Held-out transfer asks whether that information is organized into something reusable.

That is why I reserve "understood" for representations that survive transfer, intervention, and selection. A probe can be right for the wrong reason. Even worse, the aggregate score can make that wrong reason look robust.

The held-out collapse was not the only warning. A composition-matched control recovered 72% of the original embedding movement. Protein length explained 92.5% of the variation in displacement. Those numbers narrow the claim. ESM-2 geometry is sensitive to biologically ordinary properties that can line up with a functional axis.

This is the part of evaluation I find most important. A strong baseline changes the question. After the composition and length controls, the useful question is no longer "does SBS17a move embeddings?" It becomes "what residual movement remains after simple sequence properties are removed, does it recur across families, and which residues causally carry it?"

The same pattern appears when a representation becomes a target rather than a measurement. In a separate stress test, learned fitness proxies looked respectable across the full dataset, with Spearman correlation around 0.53. Among the top-ranked variants, where a design system would actually concentrate its effort, utility fell to about 0.15. An unconstrained optimizer pushed the proxy five standard deviations past the natural-protein floor while producing sequences that were not credible proteins.

Average predictive performance and decision quality are different objects. A model can preserve a broad ranking over ordinary examples while giving its largest rewards to pathological ones. Selection pressure turns small blind spots into the entire output distribution.

I now want three kinds of evidence before I make a strong claim about what a model has learned. First, transfer: hold out whole mechanisms, families, environments, or tasks. Second, causal intervention: ablate or steer the proposed feature and test whether behavior changes in the predicted direction. Third, optimization pressure: let selection search against the metric, then inspect top candidates and out-of-distribution behavior.

The protein setting makes the failure concrete, but the underlying problem is broader. A world model can encode enough information for a probe to recover state, action, or reward labels while still learning the wrong decomposition of the environment. For me, this connects representation learning, world models, and AI alignment. The shared question is whether the abstraction remains reliable under the pressure created by its use.

Claims about a model's internal structure should cash out in predictions that survive new mechanisms, causal intervention, and selection. Otherwise, "the model knows X" often means only "I can decode X from examples that look like the training set."

The 0.94 result did exactly what a good probe should do: it located a regularity worth explaining. The mistake would have been to stop there. A probe should generate the next experiment. I want to build evaluations that make those distinctions unavoidable. The most important models will not stay inside the distribution where their scores were calibrated. Our evidence about them should be built for that setting from the start.
