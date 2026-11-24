---
layout: post
title: "What I found when I measured the models we use to design proteins"
date: 2026-11-11
tag: "Essay"
section: technical
math: true
excerpt: "Eight projects, one question. A protein model's score decides which variants reach a wet lab, so I kept asking whether that score survives the moment a search starts optimizing against it. Mostly it does not, and the thing that beats it is usually a count of how many mutations a variant carries."
permalink: /writing/measuring-bio-models/
---

**TL;DR.** Over two years I ran eight audits of the models and agents that pick which proteins get made. The pattern held across all of them. A zero-shot protein language model ranks measured PET-hydrolase activity at a within-study Spearman of +0.007 across 504 variants, while a count of how many mutations a variant carries reaches +0.251. A verifier that scores an agent's proposals passes a gate at AUROC 0.991 and then adds 0.028 good candidates per batch over picking at random, where an honest scorer adds 1.082. A design pipeline that samples mutational signatures improves its objective by 0.0736, and a control matched only on base-substitution composition reaches 0.0764. A probe that recommends design actions hits 38% top-1 accuracy on familiar targets and 0% on held-out ones. None of these are exotic failures. They are what you find when you compare the score against the decision it is used to make, and run the control that keeps the confound while destroying the claimed structure.

## The setup

A lab that engineers an enzyme can measure a few dozen variants a week. The design space has millions. So the lab computes a score for every candidate, sorts, and sends the top of the list to the bench. That score is a proxy, a computable stand-in for a slow measurement. Protein language models like ESM-2 are the popular choice, because they give a likelihood for any sequence without being trained on your assay.

The moment the lab sorts by that proxy, the proxy stops describing the design space and starts choosing it. I wrote a long [methods guide](/writing/evaluating-ai-for-biology/) on the statistics behind this, and I will not repeat the derivations here. This post is the other half: what happened when I ran the measurements on live systems.

I had one advantage that most evaluation work does not. For several of these landscapes, the experiment already exists. Someone measured every variant and published the table. When the ground truth is a lookup, the counterfactual stops being a modeling assumption and becomes arithmetic. I could ask what a method would have selected, and then look up what that selection was worth.

## The proxy loses to a mutation count

The first audit, which I called Gauntlet, used a corpus of published PET-hydrolase engineering campaigns. These are enzymes that break down plastic, and the engineering goal is usually activity or thermal stability. I scored every variant with ESM-2 650M masked marginals and correlated the score against the measured outcome.

The correlations have to be computed inside each study and never pooled, because assay conditions differ. One group measures activity on amorphous film at 50°C and another on crystalline powder at 70°C, and pooling those produces a number that describes the literature's sampling rather than the enzyme.

Within studies, across 504 variants and 25 studies, ESM-2 reached a sample-size-weighted Spearman of **+0.007** on activity. The sign was positive in 13 of 24 studies, which a sign test puts at p = 0.84. That is not a weak signal. That is no signal. On melting temperature it reached **−0.211**.

Then I ran the baselines, which is the part most benchmark papers skip. BLOSUM62, a substitution matrix from 1992, reached −0.105 on activity. Hydropathy reached +0.042. And a count of how many mutations the variant carries, a number you can compute without any model at all, reached **+0.251** on activity and **+0.497** on stability, positive in 12 of 14 studies (p = 0.013). The mutation count's confidence interval was the only one that excluded zero on both axes.

This result is uncomfortable but it is not mysterious once you see the mechanism. A masked-marginal score is a sum over mutated positions, and each mutation subtracts some likelihood. So the score falls mechanically with edit count. In this corpus ESM-2's score correlated with mutation count at −0.43 for activity and −0.45 for stability. The model was partly reading how many changes a variant carries, and in a corpus where more-mutated variants tend to be worse, that is enough to produce a correlation that looks like biology.

The control is to partial out mutation count and see what remains. Doing that moves activity from +0.007 to **+0.196** and stability from −0.211 to **+0.154**. So there is a real signal, and it is smaller than the raw number, and it points the opposite way from what the stability result first suggested. The negative sign was an artifact of a confound, not evidence that the model is anti-predictive.

## Correlation is not what the campaign is buying

Benchmarks report rank correlation over a whole assay. A campaign acts on the top of the list. These are different quantities, and the next audit asked how far apart they are.

I took 70 units from four corpora, 41 ProteinGym assays, 16 SSMuLA combinatorial libraries, rubisco's three kinetic axes, and the PETase corpus, and compared each unit's reported correlation against the value of the selection it produces.

At the top 10%, the squared rank association between the two was **0.50**. At the top 1%, where real campaigns operate, it fell to **0.16**. Three of 41 ProteinGym assays produced worse-than-random top-1% selections despite positive reported correlations, the worst at −0.300 selection value from a reported +0.105.

There is also an offset that depends on which benchmark family a result comes from. At equal reported correlation, SSMuLA libraries yielded **+0.265** more selection value than ProteinGym assays (p = 0.0001), and a second scorer reproduced the gap at +0.252 (p = 0.0003). So the same reported correlation means different things depending on which corpus produced it, which makes cross-paper comparison of benchmark numbers weaker than it looks.

I also tried to build a diagnostic out of this. The skew of a model's score distribution predicted selection value within one benchmark family, which was promising, so I pre-registered it. It then reversed sign across families, and reversed again on a fourth corpus. I reported it as a failed diagnostic. I had already written it up as a positive result before the cross-family check killed it.

The honest boundary on all of this is that a supervised recipe I tested improves selection by +0.035 alongside +0.031 in correlation, so the two do track each other in some regimes. The critique is scoped to the regime where the reported metric does not capture the decision, which is the tight-budget, multi-mutant campaign.

## When the verifier is the thing that fails

An agent that designs proteins usually has a verifier: something that checks the agent's proposals before they consume a measurement. I wanted to know whether the verifier itself holds up, so I built a setting where it can be scored against ground truth. On 41 deep mutational scans, nearly every action the agent can take has a recorded experimental outcome, so the verifier's judgment can be compared against what actually happened. Across 4,920 trials:

An honest zero-shot scorer passes the trust gate at AUROC 0.663 and adds **+1.082** good candidates per batch over random selection. A scorer that has memorized the observations used for evaluation passes the gate at AUROC **0.991**, passes 100% of the time, and adds **+0.028**. It ranks above the honest scorer on the gate and performs at chance in the loop. Certifying it costs about 1.05 good candidates every batch.

A second attack leaves every measured candidate untouched and corrupts only the unmeasured pool. Any gate that evaluates on measured data returns identical statistics, because the attack lives entirely where the gate is not looking. It costs 1.24 good candidates per batch.

The natural response is to detect the attack. Sequential probing of top-ranked candidates catches **99.2%** of the naive pool-side attack at a 25% probe budget. It then recovers about **10%** of the lost value, because detecting that your ranking is corrupt tells you not to trust it and does not tell you what to do instead. Falling back to a model trained in-house does better, recovering 17% at a 25% probe and 47% at 384 measurements, and it overtakes the supplied scorer after roughly 115 measurements. The exchange rate for auditing never gets better than about 3.6 honest candidates given up per adversarial candidate recovered.

Forward validation, where you only score the verifier on data collected after it was fixed, removes the leakage advantage. It is not a complete fix. The fully leaked scorer still passes 34.8% of the time at a forward AUROC of 0.495, which is close to the false-pass floor you would get from pure noise at that sample size.

I also found four smaller verifier pathologies, and withdrew a fifth. On 13 tasks an adaptive policy looked worse per round by 0.184 good candidates, which was a clean negative result until I ran all 41 tasks and the difference came out at +0.010. The withdrawal is in the paper's appendix.

## Composition explains most of what looked like structure

Two of these projects examined a design pipeline that samples mutations from COSMIC mutational signatures, scores the resulting proteins with ESM-2, and moves toward a target region of representation space. Mutational signatures are patterns of base substitution with characteristic sequence context, so the obvious question is whether the pipeline uses the context or only the base-substitution composition.

The control is a generator matched on composition with the trinucleotide context scrambled. Context scrambling moved the separation between destinations by only **0.0081 ± 0.0016** against a seed floor of 0.0014, while composition alone accounted for 0.029 to 0.059. Context explains 14 to 28% of what the pipeline does.

In the design campaign itself, the signature sampler improved the objective by **0.0736 ± 0.0030** against an unguided baseline at 0.0218. The composition-matched control reached **0.0764 ± 0.0021**. The sampler had no advantage over a generator that knows nothing except which base substitutions to make. Adding Metropolis selection changed nothing measurable.

I also built a fidelity ladder on S669, a stability dataset of 669 variants, to ask what a benchmark of this size can resolve at all. Composition-only features reach AUC 0.597. ESM-2 650M reaches 0.592. A burial-weighted potential reaches 0.607. FoldX, which does actual physics, reaches 0.644. With a paired bootstrap clustered by protein, no scorer's advantage over composition excludes zero. The benchmark can only resolve improvements above roughly 0.047 AUC, which is larger than most of the differences people report on it.

## The representation cannot tell the actions apart

The companion result, with Gabriela Lobinska, asked something prior to whether the agent's hypotheses are right: can the representation it acts through distinguish its own candidate actions?

The action space is 78 COSMIC signatures, so there are 3,003 pairs. In COSMIC's own 96-channel space, the median pairwise distance is 0.815. After the pipeline turns each signature into mutations and scores them with ESM-2, the median distance between outcomes is **0.0068**, a compression of roughly 120 times. **1,780 of 3,003 pairs (59.3%)** are more than 0.5 apart as signatures and less than 0.011 apart as outcomes. Against a composition-matched control, the structured action's advantage is **−0.0027**, with an interval from −0.0063 to +0.0012.

Part of this collapse was a bug in my own pipeline, and finding it changed what the result means. Translating a mutated coding sequence and stopping at the first stop codon truncated **25.8%** of mutants to one-residue placeholders. The number of placeholders explained up to **R² = 0.870** of the distance between destinations. So a large part of the geometry I was measuring was the length distribution of my own translation step. After controlling for length, the collapsed fraction is 23.8% for ESM-2 8M and 72.5% for the 650M model, which is a wide enough spread that I report both rather than one catalogue-wide figure.

The held-out test is where the probe result turns over. A recommender that predicts which signature to use reaches **26.2%** top-1 accuracy under the length-controlled readout against 1.3% for the strongest frequency baseline, and **38%** on targets it has seen. Held out a target, it falls to **0%**. Held out whole mutational processes, it reaches 0.8%, which is near chance. The thing it learned was which actions work on these proteins, not which actions work.

And since the optimizer and the validator share the ESM-2 representation, validating in that same space is weak evidence by construction. Optimization drives the target distance past the range any natural protein occupies, which is the shape of a proxy being exploited rather than satisfied.

## Measuring the half of the objective nobody optimizes

Specificity is two-sided. A binder has to bind its target and avoid everything else. Almost every in-silico objective scores only the first half.

The ParD3 antitoxin landscape lets you measure both, because Lite and colleagues assayed all **7,882** variants at three positions against both the cognate partner and a non-cognate one. I built reinforcement learning design environments on that table, with the budget denominated in assays and the oracle's noise calibrated from the published replicates.

Cross-reactivity is common: 29.4% of strong binders for one partner also bind the other. Pricing the off-target into the reward roughly doubles the number of local optima on identical data, from 4 to 11 on one task. A specificity-aware margin reward reaches a success rate of 1.00 with a crosstalk rate of **0.00** from 200 assays onward on both tasks, while affinity-only rewards never get crosstalk below 0.10 at any budget up to 800.

The control that mattered most was the one that isolates where the value lives. Pay for the counter-screen, collect the data, and then ignore it in the reward. That performs as badly as never measuring at all. On the harder task, having the counter-screen data is worth −0.03 and using it is worth +0.30. The information is not the asset. Pricing it is.

On this landscape, ESM-2's likelihood is anti-predictive of specificity, at AUC 0.151 on a discrimination set. It is similar on BPTI. But on SKEMPI it is +0.048 with an interval spanning zero, so the claim has to be scoped to dense two-sided mutational scans rather than stated as a general property of protein language models. Scoping it that way was a correction to an earlier, broader version of the claim.

## A genomic model that does not transfer, and the ways I fooled myself

Genomic language models train on DNA. If one of them predicts protein fitness, that is a transfer result worth having. I tested it across 25 deep mutational scanning assays with every scorer matched on the same assays, reporting mean Spearman with intervals.

ESM-2 650M, a protein model, reaches **+0.4655**. Fitted chemistry features with leave-one-cluster-out validation reach +0.2860. Evo 2 7B, the genomic model, reaches **+0.2658**. BLOSUM62 reaches **+0.2282**. The difference between Evo 2 and a 1992 substitution matrix is **+0.0376**, with an interval from −0.012 to +0.087, higher in 14 of 25 assays. Evo 2 also sits 0.0202 behind the fitted chemistry features.

What makes this repository worth reading is not that number. It is the four things I got wrong before reaching it, which are listed above the results.

I claimed representation-level transfer at +0.141, then ran the control that should have destroyed it. Frameshifting the sequence gave +0.143. Reverse-complementing it gave +0.129. The probe was invariant to whether the DNA meant anything, so whatever it was reading was not the genetic code.

I reported a context dose-response, where more flanking sequence improved prediction, and it turned out to be measuring composition. The real sequences gave −0.771 and composition-matched shuffled sequences gave −0.633. A second model's +0.536 was fully accounted for by its shuffled twin.

I retracted a reading-frame result when I realized the "frameshift" I had constructed was a rotation, so it was still real genomic sequence read one base later. The replacement probe was underpowered rather than null, which is a different claim and a weaker one.

And I generalized "genomic models carry no protein-fitness signal" from the Nucleotide Transformer family, where the scaling trend extrapolates to +0.028 at 7B parameters. Evo 2 measured +0.266 at that size, which is 9.5 times the extrapolation. My generalization was refuted by my own later measurement.

## Generated sequence, and the artifact that looks like biology

The last audit asked whether a genomic model can serve as a proposal mechanism for mutation spectra. I built a seeded, version-pinned harness for Carbon and GENERator, prompting with the first 20% of a coding sequence and taking 50 continuations per gene, with the gene as the unit of analysis.

Carbon collapsed into repetition on **22.4%** of samples, ranging from 0% to 62% depending on the gene, against **0.08%** for GENERator. The per-gene gap is 22.3 percentage points with a bootstrap interval of 15.1 to 30.1 and a permutation p below 10⁻³. Both models use 6-mer tokenizers, and a single-nucleotide model showed no collapse at all, which points at tokenization rather than training data.

Alignment then amplifies the problem. Collapsed sequences inflate substitution counts 4.6 times. GENERator, with negligible collapse, still shows 2.8 times inflation, so alignment contributes its own artifact on top.

The spectrum question had a clean answer and a decisive control. Ten tests across etiology categories produced nothing surviving Benjamini-Hochberg correction, with the smallest raw p at 0.0167 becoming q = 0.167. The dominant component was SBS39, which has no assigned etiology. And the control that settles it: the prokaryote-trained model sits closer to the vertebrate spectrum (cosine 0.704) than the bacterial one (0.543), because both models were prompted with human genes. The output tracks the prompt, not the training corpus.

## What this adds up to

Six things keep recurring, and they are what I would check first on any new result in this area.

**The number reported and the number acted on are different constructs.** Correlation over a whole assay and value at the top 1% come apart precisely at the cutoff campaigns use, from 0.50 to 0.16 in my measurement. If a paper reports one and a lab acts on the other, the paper has not measured the thing.

**Run the trivial baseline before anything else.** Mutation count, BLOSUM62, hydropathy. In three independent settings across these projects a trivial baseline beat the model. This is the cheapest test available and it is the one most often missing.

**Composition and edit count are the confounds that imitate model skill.** A masked-marginal score falls mechanically with edit count, so in a corpus where more-mutated variants are worse, the proxy reads the corpus's construction. I measured this at −0.43 in one setting and −0.964 across 15 cells in another, where the model's correlation with an outcome was almost perfectly predicted by its correlation with a mutation count.

**Decodability is not transfer.** Hold out whole groups, not random rows. A probe at 38% on seen targets goes to 0% on held-out ones. Split choice moved one correlation from 0.155 to 0.923 on identical features, which is a larger effect than any model choice I tested.

**The evaluator is an attack surface, and detection is not recovery.** A gate at AUROC 0.991 certified a memorized scorer. Catching 99.2% of an attack recovered 10% of its cost.

**Corrections belong at the top of the file, not in a footnote.** Every one of these projects keeps a ledger of what died. Five claims cut down by controls in one, 13 retired claims in another, four listed above the results in a third. I have written up positive results and then killed them with a control I ran afterward, more than once. The ledger is the part that makes the rest of it worth believing, because a project with no retractions has either run no controls or not reported them.

The through line is simple enough to state in a sentence. A score is only worth what it is worth at the point where someone uses it to choose, under the pressure a search puts on it, after the obvious confound has been held fixed. Most of the scores I measured are worth less there than they look on a benchmark, and some of them are worth less than counting mutations.
