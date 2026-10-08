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
excerpt: "This summer, through the NeuroAI Neuromatch program, I worked on brain-inspired learning algorithms. I expected to show one of them forgets less than backpropagation. Once I tuned the baseline as hard as the rule, the advantage came out under a third of a point."
---

This summer I joined the NeuroAI track of the Neuromatch program and spent it on brain-inspired learning algorithms, the rules that train a network the way a brain might instead of with backpropagation. I went in expecting to show that one of them forgets less than backpropagation. In this post I walk through why anyone expects that, how I built a fair test for it, and what I found once the comparison was fair. The answer surprised me. Once I matched each rule to backpropagation at the same learning accuracy, the advantage of locality came out under a third of a point, while plain rehearsal added more than ten.

## Why would a brain-inspired rule forget less?

A brain learns one thing after another for a lifetime and keeps most of it. An artificial network does not. Train it on a new task and it tends to overwrite the old one, which people call catastrophic forgetting. That gap is what makes brain-inspired rules interesting for continual learning, because the brain is proof that continual learning is possible and the brain does not run backpropagation.

Backpropagation needs two things a biological synapse probably does not have. It has to send an error signal backward through the exact transpose of the forward weights, which would mean a neuron knows the strength of every connection downstream of it, and it needs the forward pass to pause while the backward pass runs. Local learning rules drop both of those. Each weight updates from signals available right where it sits. The claim I wanted to check is that this locality also makes the network forget less. I was suspicious of it going in, because in most of the papers I read the local rule arrived bundled with something else, like sparsity or replay, and the retention got credited to locality anyway.

## The three rules I tested

Each rule assigns credit without backpropagation's weight transport, in a different way.

- **Feedback alignment** keeps the forward pass but sends the error backward through fixed random weights instead of the transpose of the forward weights, so the network never has to read its own forward connections to learn.
- **Direct feedback alignment** goes further and sends the output error straight to each hidden layer through its own fixed random connection, skipping the layer-by-layer backward chain.
- **Predictive coding** has each layer try to predict the activity of the layer below it, and learning is driven by the local mismatch between prediction and reality, which under some conditions approximates backpropagation using only local signals.

All three are biologically motivated, and all three have been reported somewhere to help with forgetting. The rest of the post asks whether that help holds up once the comparison is fair.

## A fair test that separates forgetting from learning

Here is the problem that decides everything. A rule that learns each new task less well also has less to forget, so if you read off raw retention you reward the rule that learned the least. To turn that into a number I could trust, I weakened backpropagation across eleven settings that change only the number of epochs and the learning rate, never adding anything that protects old tasks. The task is class-incremental Split-CIFAR-10, five tasks of two classes each with a single growing head and no task labels at test time, which is the hard version of the problem, and I ran Split-CIFAR-100 and Split-FashionMNIST as replications. Every arm trains the same two-layer network, so the learning rule is the only thing that changes.

Within each seed, backward transfer, the change in accuracy on earlier tasks after training on later ones, turned out to be almost a fixed function of learning accuracy, with an R-squared of 0.995. I was surprised it was that tight. Holding out each setting in turn, that relationship predicts backward transfer to a mean absolute error of 1.09 points over 224 held-out predictions, which tells me how small a difference I can actually trust. With that in hand, I scored each rule against backpropagation at the same learning accuracy, tuned the baseline as hard as the rule, and corrected each remaining difference for the small accuracy gap left over.

![Backward transfer against learning accuracy on Split-CIFAR-10 and Split-CIFAR-100, where local rules sit on the backpropagation curve and replay sits above it](/assets/images/engram-continual-learning/locality.png)

In the figure above, the backpropagation ladder traces a curve. As a run learns the new task better it forgets the old ones more, and that trade-off is what the ladder captures. What matters is where each rule falls against that curve. The local rules sit right on it, so at a given learning accuracy they forget about as much as backpropagation does, and only replay sits above. Locality does not move the trade-off, it just moves you along it.

## What the rules do once the comparison is fair

Now I can read off the numbers. Under matched learning accuracy, feedback alignment differed from backpropagation by -0.08 points, with a 95% interval of [-0.21, +0.05], and direct feedback alignment by -0.11, [-0.28, +0.06]. Both intervals contain zero, so neither rule forgets less once the baseline is tuned fairly. Predictive coding retained 0.21 points more, [+0.11, +0.31], p = 0.001. I had said ahead of time that a local rule retaining better at matched learning would refute my hypothesis, so I report predictive coding as a refutation rather than burying it, while noting that 0.21 points is about a fifth of the instrument's own error and that its sign flips without the gap correction. Replay, which I added as a positive control, improved retention by 10.6 points, [+10.0, +11.1], about fifty times the predictive-coding effect.

![Departure from the null for each learning rule, with and without replay, where the rules sit within the null band and every replay arm is about ten points above it](/assets/images/engram-continual-learning/neurreps.png)

The second figure says the same thing another way. Each credit-assignment rule sits inside the null band, the scatter I would expect from rules that do nothing special for retention, and adding replay lifts every one of them about ten points above it. The representational geometry does differ between rules, shown in the left panel, but that difference does not turn into a difference in forgetting.

One limit belongs right next to that number. Split-CIFAR-10 with a growing head keeps very little to begin with, about 0.7 points, so the setup sits near a floor where there is not much forgetting left to prevent. When I rescored within each task's own classes to lift it off that floor the ordering held, with replay still ahead and no local rule retaining better, though the instrument then resolved retention only to about five points. Split-FashionMNIST did not work as a quantitative instrument, at 12.29 points of held-out error, so I do not quote retention differences from it. The defensible scope is Split-CIFAR-10 and Split-CIFAR-100 under this protocol.

## Why this matters beyond the brain

I care about this past neuroscience. When a deployed model keeps training, through fine-tuning or reinforcement learning from human feedback, it can erase abilities and safety behaviors it had before, which is catastrophic forgetting with a deployment address. The one thing this work adds is a measurement rule. Any method that looks like it protects earlier behavior has to be compared at matched learning of the new task, because a model that learned less of the new task also overwrote less of the old one, and it will look like it forgot less for the wrong reason.

I came out of the summer with a negative result, and I think results like this are worth writing down. Locality is a good reason to study these rules. On this protocol it is not the reason forgetting goes down. Rehearsal is.

## Acknowledgements

This work grew out of the NeuroAI track of the Neuromatch program, where I spent the summer on brain-inspired learning algorithms. It is otherwise independent research, and I will release the code when the project is public.
