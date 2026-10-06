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
excerpt: "This summer, through the NeuroAI Neuromatch program, I explored brain-inspired learning algorithms. In this post we test whether locality actually reduces catastrophic forgetting, and once the baseline is tuned as hard as the rule, the advantage shrinks to under a third of a point."
---

This summer, through the NeuroAI track of the Neuromatch program, I spent my time on brain-inspired learning algorithms, the family of rules that train a network the way a brain might rather than with backpropagation. In this post we'll start by asking why anyone expects these rules to forget less than backpropagation. We'll then build a fair way to test that claim, one that separates forgetting less from simply learning less. Finally, we'll watch what happens to three of these rules once the comparison is honest. The short version is that once each rule is matched to backpropagation at the same learning accuracy, the retention advantage of locality is under a third of a point, while rehearsal, the mechanism everyone already knew worked, adds more than ten.

## Why would a brain-inspired rule forget less?

Let's start with the motivation, since it is the reason the whole line of work exists. A brain learns one thing after another for a lifetime and mostly keeps what it learned. An artificial network does not: train it on a new task and it tends to overwrite the old one, a failure called catastrophic forgetting. That contrast is what makes brain-inspired algorithms tempting to anyone working on continual learning, because the brain is the existence proof that continual learning is possible, and the brain does not run backpropagation.

Backpropagation needs two things a biological synapse does not plausibly have. It has to carry an error signal backward through the exact transpose of the forward weights, which would require a neuron to know the strength of every connection downstream of it, and it needs the forward pass to pause while that backward pass runs. Brain-inspired, or local, learning rules drop both requirements: each weight updates from signals available right where it sits. The appealing story is that this locality is not only more biologically realistic but functionally better, that it is part of why brains forget less. That story is what I wanted to check, because in most of the papers I read the local rule arrives bundled with something else, like sparsity or replay, and the retention gets credited to locality by association.

## The three rules

Each rule is a different way of assigning credit without backpropagation's weight transport.

- **Feedback alignment** keeps the forward pass but sends the error backward through fixed random weights instead of the transpose of the forward weights, so the network never has to read its own forward connections to learn.
- **Direct feedback alignment** goes further and projects the output error straight to each hidden layer through its own fixed random connection, skipping the layer-by-layer backward chain entirely.
- **Predictive coding** has each layer try to predict the activity of the layer below it, and learning is driven by the local mismatch between prediction and reality, which under some conditions approximates backpropagation using only local signals.

All three are biologically motivated, and all three have been reported, in one setting or another, to help with forgetting. The rest of the post is about whether any of that help survives a fair comparison.

## A fair test: forgetting less, or just learning less?

Here is the question that decides everything. A rule that learns each new task less well also has less to forget, so if you read off raw retention you reward the rule that learned the least. To turn that confound into an instrument, I weakened backpropagation along a ladder of eleven settings that vary only the number of epochs and the learning rate, never adding any retention mechanism. The setup is class-incremental Split-CIFAR-10, five tasks of two classes each with a single growing head and no task labels at test time, which is the hard version of the problem, and I ran Split-CIFAR-100 and Split-FashionMNIST as replications. Every arm trains the same two-layer MLP, so the learning rule is the only thing that changes.

Within each seed, backward transfer, the change in accuracy on earlier tasks after training on later ones, turns out to be almost a deterministic function of learning accuracy, with an R-squared of 0.995. Holding out each rung of the ladder in turn, that relation predicts backward transfer to a mean absolute error of 1.09 points over 224 held-out predictions, which is what sets how small a difference the instrument can honestly resolve. With the instrument in hand, I scored each rule against backpropagation at the same learning accuracy, tuning the baseline as carefully as the rule, with an equal budget on a held-out split, and I corrected each remaining difference for the small accuracy gap that was left.

![Backward transfer against learning accuracy on Split-CIFAR-10 and Split-CIFAR-100, where local rules sit on the backpropagation curve and replay sits above it](/assets/images/engram-continual-learning/locality.png)

In the figure above, the backpropagation ladder traces a curve: as a run learns the new task better, it forgets the old ones more, and that trade-off is what the instrument captures. The point of the plot is where each rule falls relative to that curve. The local rules sit on the backpropagation curve, so at any given learning accuracy they forget about as much as backpropagation does, while only replay sits above it. Locality, in other words, does not move the trade-off; it just moves you along it.

## What the rules do once the comparison is honest

Now we can read off the numbers. Under matched learning accuracy, feedback alignment differed from backpropagation by -0.08 points, with a 95% interval of [-0.21, +0.05], and direct feedback alignment by -0.11 points, [-0.28, +0.06]. Both intervals contain zero, so neither rule reduces forgetting once the baseline is tuned fairly. Predictive coding retained 0.21 points more, [+0.11, +0.31], p = 0.001, and I had pre-specified that a local rule retaining significantly better at matched learning would refute my hypothesis, so I report it as a refutation rather than hiding it, while noting that 0.21 points is about a fifth of the instrument's own held-out error and that its sign flips without the gap correction. Replay, added to backpropagation as a positive control, improved retention by 10.6 points, [+10.0, +11.1], roughly fifty times the predictive-coding effect.

![Departure from the null for each learning rule, with and without replay, where the rules sit within the null band and every replay arm is about ten points above it](/assets/images/engram-continual-learning/neurreps.png)

The second figure says the same thing a different way. Each credit-assignment rule sits inside the null band, the scatter you would expect from rules that do nothing special for retention, while adding replay lifts every one of them about ten points above it. (The representational geometry does differ between rules, shown in the left panel, but that difference does not translate into a difference in forgetting.)

One caveat belongs right next to that bound. Split-CIFAR-10 with a growing head retains very little in absolute terms, about 0.7 points, so the protocol sits near a floor where there is not much forgetting left to prevent. When I rescored within each task's own classes to lift the measurement off that floor, the ordering held, with replay still clearly ahead and no local rule retaining better, though the instrument then resolved retention only to about five points. Split-FashionMNIST failed as a quantitative instrument, with 12.29 points of held-out error, so I do not quote retention differences from it. The honest scope of the claim is Split-CIFAR-10 and Split-CIFAR-100 under this protocol.

## Why this matters beyond the brain

I care about this well past neuroscience. Continued training of a deployed model, whether fine-tuning or reinforcement learning from human feedback, can erase capabilities and safety behaviors the model had before, which is catastrophic forgetting with a deployment address. The one constraint this work adds to that problem is a measurement discipline: any method that looks like it protects earlier behavior has to be compared at matched learning of the new task, because a model that learned less of the new task will also have overwritten less of the old one, and will look like it forgot less for the wrong reason.

The result I came out of the summer with is a quiet one, and I think quiet negatives are worth writing down. Locality is a good reason to study these rules, and it is not, on this protocol, the reason forgetting goes down. Rehearsal is.

## Acknowledgements

This work grew out of the NeuroAI track of the Neuromatch program, where I spent the summer on brain-inspired learning algorithms. It is otherwise independent research, and I will release the code when the project is public.
