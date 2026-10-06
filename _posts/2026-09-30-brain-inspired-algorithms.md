---
layout: post
title: "Brain-inspired algorithms, and what a fair baseline does to them"
date: 2026-09-30
tag: "Research"
section: technical
thumb: /assets/images/engram-continual-learning/locality.png
permalink: /thinking/brain-inspired-algorithms/
redirect_from:
  - /thinking/engram-continual-learning/
excerpt: "This summer, through the NeuroAI Neuromatch program, I explored brain-inspired learning algorithms and tested whether locality actually reduces catastrophic forgetting. Once the baseline is tuned as hard as the rule, the advantage shrinks to under a third of a point."
---

**TL;DR.** This summer I joined the NeuroAI track of Neuromatch to work on brain-inspired learning algorithms, the family of rules that try to train a network the way a brain might rather than with backpropagation. The hope attached to them is that they forget less. I built a project called engram to test that directly: do biologically inspired local learning rules reduce catastrophic forgetting once they are compared against backpropagation at the same learning accuracy? I tested feedback alignment, direct feedback alignment, and predictive coding on Split-CIFAR-10. Two of the three were indistinguishable from backpropagation. Predictive coding retained 0.21 points more [95% CI +0.11, +0.31], about a fifth of my instrument's own held-out error of 1.09 points. Replay, the positive control, added 10.6 points. So on this protocol, locality itself buys under a third of a point, and the thing that actually works is the one everyone already knew worked.

## Why brain-inspired algorithms, and why forgetting

A brain learns one thing after another for a lifetime and mostly keeps what it learned. An artificial network does not. Train it on a new task and it tends to overwrite the old one, a failure called catastrophic forgetting. That contrast is the reason brain-inspired algorithms are interesting to people who care about continual learning: the brain is the existence proof that continual learning is possible, and the brain does not run backpropagation.

Backpropagation needs two things a biological synapse does not plausibly have. It needs to carry an error signal backward through the exact transpose of the forward weights, which means a neuron would have to know the strength of every connection downstream of it, and it needs the forward pass to pause while that backward pass runs. Brain-inspired, or local, learning rules drop those requirements: each weight updates from signals available right where it sits. The appealing story is that this locality is not just more realistic but functionally better, that it is part of why brains forget less. That is the story I wanted to check, because in most papers the local rule arrives bundled with something else, like sparsity or replay, and the retention gets credited to locality by association. I wanted to know whether locality itself does any work.

## The three rules I tested

Each rule is a different way of assigning credit without backpropagation's weight transport.

- **Feedback alignment** keeps the forward pass but sends the error backward through fixed random weights instead of the transpose of the forward weights, so the network never needs to read its own forward connections to learn.
- **Direct feedback alignment** goes further and projects the output error straight to each hidden layer through its own fixed random connection, skipping the layer-by-layer backward chain entirely.
- **Predictive coding** has each layer try to predict the activity of the layer below it, and learning is driven by the local mismatch between prediction and reality, which under some conditions approximates backpropagation using only local signals.

All three are biologically motivated, and all three have been reported, in one setting or another, to help with forgetting. The experiment is whether any of that help survives a fair comparison.

## I built engram to test local rules against a fair baseline

The setup is class-incremental Split-CIFAR-10: five tasks of two classes each, a single growing output head, and no task labels at test time, which is the hard version of the problem. I ran Split-FashionMNIST and Split-CIFAR-100, ten tasks of ten classes, as replications. Every rule trains the same two-layer MLP with 256 hidden units, so the only thing that changes between arms is the learning rule. I measure retention as backward transfer, the change in accuracy on earlier tasks after training on later ones. The headline comparison uses 16 seeds, and each seed gives every method the identical task stream, so the differences are paired rather than pooled.

## Matching learning accuracy is the whole experiment

Here is the trap that makes most retention comparisons unfair. A rule that learns each new task less well also has less to forget, so if you just read off raw retention you reward the rule that learned the least. To turn that confound into an instrument, I weakened backpropagation along a ladder of eleven settings that vary only the number of epochs and the learning rate, never adding any retention mechanism. Within each seed, backward transfer turns out to be almost a deterministic function of learning accuracy, with an R-squared of 0.995. Holding out each rung of the ladder in turn, that relation predicts backward transfer to a mean absolute error of 1.09 points [0.99, 1.20] over 224 held-out predictions, which sets how small a difference the instrument can honestly resolve.

I then scored each rule against backpropagation at the same learning accuracy, and I tuned the baseline as carefully as I tuned each rule, with an equal tuning budget on a held-out validation split and learning rates swept separately per dataset, so any gap that remains belongs to the rule and not to a handicapped baseline. Matching is never exact, so I corrected each remaining difference for the small learning-accuracy gap that was left.

![Backward transfer against learning accuracy on Split-CIFAR-10 and Split-CIFAR-100, where local rules sit on the backpropagation curve and replay sits above it](/assets/images/engram-continual-learning/locality.png)

**Figure 1.** Backward transfer against learning accuracy. The backpropagation ladder traces a curve, the local rules fall on that same curve, and only replay sits above it, so locality does not move the forgetting-versus-learning trade-off.

## All of the results, at matched learning

Under matched learning accuracy, feedback alignment differed from backpropagation by -0.08 points [-0.21, +0.05] and direct feedback alignment by -0.11 points [-0.28, +0.06]. Both intervals include zero, so neither rule reduces forgetting once the baseline is tuned fairly. Predictive coding retained 0.21 points more [+0.11, +0.31], p = 0.001. Before the gap correction its raw difference was -0.6 points, so even its sign depends on that correction. I had pre-specified that a local rule retaining significantly better at matched learning accuracy would refute my hypothesis, and predictive coding meets that condition, so I report it as a refutation rather than hiding it, while noting that 0.21 points is about a fifth of the instrument's own held-out error. Replay, added to backpropagation as a positive control, improved retention by 10.6 points [+10.0, +11.1], about fifty times the predictive-coding effect. The summary is that any retention advantage from locality on this protocol is under a third of a point, while the mechanism that stores and re-shows old data moves the needle by double digits.

That bound comes with a limit I have to state next to it. Split-CIFAR-10 with a growing head retains very little in absolute terms, about 0.7 points, so the protocol sits near a floor where there is not much forgetting left to prevent. When I rescored within each task's own classes to lift the measurement off that floor, the ordering held, with replay still clearly ahead and no local rule retaining better, but the curve then resolved retention only to about five points. Split-FashionMNIST failed as a quantitative instrument, with 12.29 points of held-out error, so I do not quote retention differences from it. The honest scope of the claim is Split-CIFAR-10 and Split-CIFAR-100 under this protocol.

![Departure from the null for each learning rule, with and without replay, where the rules sit within the null band and every replay arm is about ten points above it](/assets/images/engram-continual-learning/neurreps.png)

**Figure 2.** The right panel shows each rule's departure from the null band. The credit-assignment rules sit within the null scatter, while adding replay lifts every rule about ten points above it. The left panel shows how the representational geometry of each rule changes across the five tasks, which differs between rules without changing the retention story.

## Forgetting is an alignment problem too

I care about this well beyond neuroscience. Continued training of a deployed model, whether fine-tuning or reinforcement learning from human feedback, can erase capabilities and safety behaviors the model had before. That is catastrophic forgetting with a deployment address, and it is why a retention result matters outside the study of the brain. Engram adds one constraint to that problem: any method that seems to protect earlier behavior has to be compared at matched learning of the new task, because a model that learned less of the new task will also have overwritten less of the old one, and will look like it forgot less for the wrong reason. If the apparent advantage disappears under matched tuning, that is exactly what this experiment was built to catch.

The result I came out of the summer with is a quiet one, and I think quiet negatives are worth publishing. Locality is a good reason to study these rules, and it is not, on this protocol, the reason forgetting goes down. Rehearsal is.

## Acknowledgements

This work grew out of the NeuroAI track of the Neuromatch program, where I spent the summer on brain-inspired learning algorithms. Engram is otherwise independent research, and I will release the code when the project is public.
