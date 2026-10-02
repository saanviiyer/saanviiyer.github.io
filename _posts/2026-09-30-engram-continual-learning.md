---
layout: post
title: "Engram, and what a fair baseline does to local learning rules"
date: 2026-09-30
tag: "Research"
permalink: /thinking/engram-continual-learning/
excerpt: "I compared three local learning rules against backpropagation at matched learning accuracy, and the retention advantage shrank to under a third of a point."
---

**TL;DR.** I built engram to test whether biologically inspired local learning rules still forget less than backpropagation once both are compared at the same learning accuracy. I compared feedback alignment, direct feedback alignment, and predictive coding against backpropagation on Split-CIFAR-10. Two of the three rules were indistinguishable from backpropagation. Predictive coding retained 0.21 points more [95% CI +0.11, +0.31], about a fifth of my instrument's own held-out error of 1.09 points. Replay, the positive control, added 10.6 points. I care about this beyond neuroscience because continued training of a deployed model can erase earlier capabilities and safety behaviors, which is catastrophic forgetting with a deployment address.

## I built engram to test local rules against a fair baseline

I started engram because biologically inspired learning rules are often reported to reduce catastrophic forgetting, and I wanted to know whether the improvement survives a fair comparison. Catastrophic forgetting is the failure where a network trained on a new task loses what it learned on an earlier one. In the published cases I looked at, the local rule arrives bundled with something else, such as sparsity or replay, and the retention gets credited to locality. I wanted to know whether locality itself does any work.

The setup is class-incremental Split-CIFAR-10: five tasks of two classes each, a single growing output head, and no task labels at test time. I ran Split-FashionMNIST and Split-CIFAR-100 (ten tasks of ten classes) as replications. Every rule trains the same two-layer MLP with 256 hidden units. I measure retention as backward transfer (BWT), the change in accuracy on earlier tasks after training on later ones. The headline comparison uses 16 seeds, and each seed gives every method the identical task stream so the differences are paired.

## Matching learning accuracy is the whole experiment

A rule that learns each new task less well also has less to forget, so a raw retention comparison rewards learning less. To measure that confound, I weakened backpropagation along a ladder of eleven settings that vary only the number of epochs and the learning rate, never adding a retention mechanism. Within each seed, backward transfer is almost a deterministic function of learning accuracy, with R² = 0.995. Holding out each condition in turn, that relation predicts backward transfer to a mean absolute error of 1.09 points [0.99, 1.20] over 224 held-out predictions, which sets how small a difference the instrument can resolve.

I scored each rule against backpropagation at the same learning accuracy. I matched learning accuracy and tuned the baseline as carefully as each rule, with an equal tuning budget per rule on a held-out validation split and learning rates swept separately per dataset, so any remaining gap belongs to the rule. Matching is never exact, so I corrected each difference for the small learning-accuracy gap that remained.

![Backward transfer against learning accuracy on Split-CIFAR-10 and Split-CIFAR-100, where local rules sit on the backpropagation curve and replay sits above it](/assets/images/engram-continual-learning/locality.png)

**Figure 1.** Backward transfer against learning accuracy. The backpropagation ladder traces a curve, the local rules fall on that same curve, and only replay sits above it, so locality does not move the forgetting-versus-learning trade-off.

## Two rules matched backpropagation, and the third cleared zero by 0.21 points

Under matched learning accuracy, feedback alignment differed from backpropagation by -0.08 points [-0.21, +0.05] and direct feedback alignment by -0.11 points [-0.28, +0.06]. Both intervals include zero. Predictive coding retained 0.21 points more [+0.11, +0.31], p = 0.001. Before the gap correction its raw difference was -0.6 points, so its sign depends on that correction. I had pre-specified that a local rule retaining significantly better at matched learning accuracy would refute my hypothesis, and predictive coding meets that condition, so I report it as a refutation. At 0.21 points it is about a fifth of the instrument's held-out error. Replay, added to backpropagation as a positive control, improved retention by 10.6 points [+10.0, +11.1], about fifty times the predictive-coding effect. Any retention advantage from locality on this protocol is under a third of a point.

That bound has a limit I have to state with it. Split-CIFAR-10 with a growing head retains very little, 0.7 points, so the protocol sits near a floor. When I rescored within each task's own classes to lift it off that floor, the ordering held, with replay still clearly ahead and no local rule retaining better, but the curve then resolved retention only to about five points. Split-FashionMNIST failed as a quantitative instrument, with 12.29 points of held-out error.

![Departure from the null for each learning rule, with and without replay, where the rules sit within the null band and every replay arm is about ten points above it](/assets/images/engram-continual-learning/neurreps.png)

**Figure 2.** The right panel shows each rule's departure from the null band. The credit-assignment rules sit within the null scatter, while adding replay lifts every rule about ten points above it. The left panel shows how the representational geometry of each rule changes across the five tasks.

## Forgetting is an alignment problem too

Continued training of a deployed model, whether fine-tuning or RLHF, can erase capabilities and safety behaviors the model had before. That is catastrophic forgetting with a deployment address, and it is why a retention result matters outside neuroscience. Engram adds one constraint to that problem: a method that seems to protect earlier behavior has to be compared at matched learning of the new task, because a model that learned less of the new task will also have overwritten less of the old one. If the gap disappears under matched tuning, that is the result this experiment was built to detect.

## Acknowledgements

Engram is independent research. I will release the code when the project is public.
