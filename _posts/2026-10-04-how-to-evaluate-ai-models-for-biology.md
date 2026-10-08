---
layout: post
title: "How to evaluate AI models for biology"
date: 2026-10-04
tag: "Essay"
section: technical
thumb: /assets/images/eval-biology-article/winners-curse.png
math: true
permalink: /thinking/how-to-evaluate-ai-models-for-biology/
excerpt: "A field argument: a measurement is only trustworthy if it still means what it claims once a model or a search optimizes against it."
---

**TL;DR.** across protein models, agents, verifiers, and safety benchmarks, the same failure keeps appearing: a score looks healthy on a benchmark and stops meaning anything in the place it is actually used. i think the fix is one idea, applied everywhere. an evaluation is only trustworthy if it still means what it claims once a model or a search optimizes against it, and that is a property you have to test on purpose, with trivial baselines, top-tail utility, confound controls, and held-out transfer, not something a single benchmark number can tell you.

## the question, and why it matters now

when a protein model aces a benchmark, what did we actually learn? for a long time the answer did not matter much, because the score was a leaderboard entry. it matters now because the score has become an objective. a lab cannot measure every candidate in the wet lab, so it ranks thousands or millions of designs by a computable score and keeps the top ones, and a safety team sets a threshold on a benchmark and treats crossing it as evidence. a proxy is a computable stand-in for a slow measurement, and the moment a search starts choosing the candidates a proxy likes best, the proxy is not describing the world anymore, it is steering it.

that shift changes what a good evaluation has to prove. it is no longer enough to show that a score correlates with the truth on ordinary examples. you have to show that the score keeps its meaning at the exact edge a search selects, and under the exact pressure the model is put under. the rest of this piece is six ways that property fails in practice, each one from a measurement i ran, and then the protocol i use to catch them.

## the core failure is selection on error

start with the simplest version. write a score as the true quality plus an error term,

$$ s = f^{*} + \varepsilon $$

where the first term is the true quality you care about and the second is the model's mistake on that candidate. on an average example the error is just noise and the correlation looks fine. now let a search look at many candidates and keep the one with the highest score. the kept candidate is the one where the error happened to be most favorable, so the error of the selected item is the maximum of many draws, and

$$ \mathbb{E}\big[\max_{i \le n} \varepsilon_i\big] \text{ grows with } n. $$

the more you search, the more of the score is error rather than quality. this is the winner's curse, and it is why a proxy that looks healthy in bulk can be useless once you optimize it.

![Proxy of the kept candidate rises steeply while true quality rises slowly as search budget grows](/assets/images/eval-biology-article/winners-curse.png)

**Figure 1.** a simulation of the mechanism. each candidate's proxy is its true quality plus independent error, and a search keeps the highest proxy. as the search considers more candidates, the kept candidate's proxy climbs steeply while its true quality lags, so the gap between the two is the selected error. this is drawn from Gaussian quality and Gaussian error, not fit to any dataset.

## bulk correlation is the wrong statistic

the practical consequence is that the number benchmarks report, a bulk correlation across a whole dataset, is measured in the wrong place. selection happens in the top tail, and that is where you have to look. i tested this directly: i measured whether a scorer's benchmark correlation predicts the value of the designs a search actually selects with it. the agreement weakens as selection sharpens, from a squared rank association of 0.50 when keeping the top 10% to 0.16 when keeping the top 1%, and three of 41 assays give worse-than-random top-1% selections despite positive correlations.

![Selection utility against bulk Spearman, squared association 0.50 at top 10 percent and 0.16 at top 1 percent](/assets/images/projects/plm/rq2/benchmark-decay.png)

**Figure 2.** selection utility against the bulk Spearman that gets reported, on ESM-2 650M. the same reported correlation buys 0.50 of the squared association with selection value at the top 10% and only 0.16 at the top 1%, and the benchmark family matters more than the score. the recommendation is to report top-k utility and enrichment, not bulk correlation alone.

## a score has to beat a trivial baseline and survive a confound

before you credit a score with understanding, make it clear two low bars. it has to beat a trivial baseline, and the part of it that looks like signal has to survive a control for the obvious confounds. both bars are easy to state and often failed. on 504 measured PET-hydrolase variants, a zero-shot protein model ranks activity at a Spearman of 0.01 while a plain count of mutations reaches 0.25, so the expensive score adds nothing over counting.

![Zero-shot ESM-2 ranks PETase activity near zero while a mutation count reaches 0.25](/assets/images/projects/eval/gauntlet-proxy-audit.png)

**Figure 3.** within-study rank correlation with measured outcomes for four scorers. the ESM-2 650M zero-shot score sits near zero on PET-hydrolytic activity, below a hydropathy feature and well below a mutation count.

the confound control is the other bar. a mutational signature appeared to steer proteins toward a specific family in a protein model's embedding space, which looked like a biological finding. then the controls spoke. a composition-matched scramble, which keeps the amino-acid makeup and destroys the signature's structure, reproduced 72% of the movement on the steering readout, and about 34% on a second readout, while protein length alone explained 94.1% of how far sequences moved. what is left that is specific to the signature is small.

![A composition-matched scramble reproduces 72 percent of the embedding movement](/assets/images/prism-signature-steering/scramble.png)

**Figure 4.** the measured signature direction moves held-out embeddings toward the target family by 0.0425, and a composition-matched scramble keeps 72% of that at 0.0306. a movement in a representation is not a biological finding until it survives composition and length.

## decodability is not understanding

a subtler failure lives at the representation level. a linear probe is a simple classifier read off a model's internal activations, and people take a probe that recovers a concept as evidence that the model represents it. but a probe can be right for the wrong reason. i trained a probe to name which mutational process produced an embedding shift, and on processes it saw in training it reached an AUC of 0.94. when i held out whole processes and asked it to name ones it had never seen, its top-1 accuracy fell to 0.775%, below a uniform guess.

![Inverse probe AUC 0.94 on seen signatures, 0.8 percent on held-out ones](/assets/images/prism-signature-steering/loso.png)

**Figure 5.** accuracy on processes held out of training sits below the uniform-guess line, while the same probe reaches an AUC of 0.94 on processes it has seen. the information is decodable without transferring, so decodability is the start of an evaluation, not the end of one.

## transfer and scale get overread

the same caution applies to claims that a model has transferred knowledge or that a capability is scaling. apparent transfer can be an artifact of how the question was asked. DNA and protein are two encodings of one molecule, so i matched a genomic model and a protein model on the same 25 deep mutational scanning assays. a genomic model at Evo 2 scale reaches a mean Spearman of 0.266, which is statistically indistinguishable from a BLOSUM62 substitution matrix at 0.228, and far below a protein model at 0.466. the clearest tell was a control: a probe read off genomic embeddings scored about the same after the reading frame was destroyed, which means it was reading codon identity, not protein-level structure.

![Evo 2 at 0.266 overlapping BLOSUM62 at 0.228, both far below ESM-2 at 0.466](/assets/images/biologos-transfer/spearman-comparison.png)

**Figure 6.** mean Spearman across 25 assays with 95% intervals and per-assay points. a genomic model's protein-fitness signal does not clear a substitution matrix, so the apparent transfer is weaker than the headline number suggests.

## when the evaluator is the attack surface

so far the model was the thing being measured. but in an agent loop the evaluator is itself a component, and a component can be gamed. i red-teamed a verifier, the part that decides which of an agent's proposals to keep, in a setting where ground truth exists so the actual quality of what it keeps can be measured. a fully leaked scorer reached an AUROC of 0.991 and added only 0.028 good candidates per batch over random, against 1.082 for an truthful scorer. worse, a probe that spot-checks a quarter of decisions detects 99.2% of attacks but recovers only about 10% of the lost value when its fallback is random selection, so catching an attack is not the same as undoing it. getting to 17% needs a second source of capability the attacker does not control, a model trained on the campaign's own measurements, which is a different fix from the detector.

![Good candidates over random fall as more of the batch is audited, for the truthful scorer](/assets/images/projects/plm/rq4/audit-sweep.png)

**Figure 7.** good candidates per batch over random, against the share of the batch spent on a random audit. the truthful run loses value to the audit faster than the audit recovers from the attacked one, so detection and recovery are different quantities and have to be reported separately.

## a protocol: evaluations that survive optimizers

the thread through all six is that the failure never shows up in the headline number and always shows up once you add the control. so i run the same battery on any score before i trust it. first, does it beat a trivial baseline like a mutation count or the longest answer. second, does it stay useful in the top-ranked region a search would actually act on, measured as top-k utility rather than bulk correlation. third, does the signal survive a confound control for composition, length, or writing style. fourth, does it transfer to cases the model never saw, tested by holding whole groups out. a fifth rule sits underneath the others: when a search selects the top candidate, the right null is not a random draw but one that mimics the selection, because that is the baseline the winner's curse is measured against.

two forward versions of this are worth naming. a white-box evaluation asks whether an assay property is even recoverable from a model's internal activations and whether that recovery survives a shift to unfamiliar families, which tests understanding rather than output correlation. a portable audit wraps any score, runs bounded search against it, and reports where the score and the actual quality first separate, so the audit travels across domains rather than being tuned to one.

## the biosecurity corollary

safety benchmarks inherit every one of these failures, and the stakes are higher because thresholds are keyed to them. on a hazardous-knowledge benchmark, a rule that never reads the question and picks the longest of four options scores 46.5% against 25% chance, and a classifier trained on the answer text alone reaches 34.6%, so part of the score is an artifact of how the options were written rather than knowledge.

![Longest-answer rule 46.5 percent and question-blind classifier 34.6 percent against 25 percent chance](/assets/images/wmdp-bio-audit/option-only.png)

**Figure 8.** two rules that never read the question still beat chance on a safety benchmark. the consequence is specific: a model's score is an upper bound on what it knows until the artifact share is subtracted, and a drop in that score under an intervention is not by itself evidence that knowledge was removed. an evaluation meant to gate deployment decisions has to measure the artifact before it measures the knowledge, and it should report aggregates rather than a recipe for exploiting the gap.

## what to do, and what this does not show

so, back to the question. when a model aces a benchmark for biology, what you have learned is that it is good at the benchmark, and whether it is good at the task is a separate claim that needs the battery above. the practical version is short: report top-k utility next to bulk correlation, publish the trivial baselines and the confound controls, hold whole groups out, and let a search attack the score before anyone keys a decision to it.

i want to be clear about the limits of this argument. each result here is a demonstration on one framework, model, or dataset, several reuse a small set of assays, and the protocol is a hypothesis about which diagnostics predict failure rather than a theorem. but the direction has held every time i have looked: the most important models will not stay inside the distribution where their scores were calibrated, and the evidence we trust about them should be built for that setting from the start.
