---
layout: post
title: "Engram, and what a fair baseline does to a bio-inspired rule"
date: 2026-09-30
tag: "Research"
permalink: /thinking/engram-continual-learning/
excerpt: "I tested whether a biologically inspired continual-learning rule still helps once the training budget and the baseline are matched, because forgetting is also what happens to alignment under continued training."
---

**TL;DR.** I built engram to test whether a biologically inspired continual-learning rule actually improves retention once the training budget and the comparison are matched, because a rule that only beats a weak baseline has not shown anything. The reason I care beyond biology is that forgetting is also what happens to a model's earlier behavior under continued training, which makes retention an alignment question and not only a neuroscience one. [DETAIL NEEDED: the headline retention result once the budget and comparators were matched, with the exact metric and its uncertainty.]

## I built engram to test a bio-inspired rule against a fair baseline

I started engram because biologically inspired learning rules are often reported as reducing catastrophic forgetting, and I wanted to know whether the improvement survives a fair comparison. Catastrophic forgetting is the familiar failure where a network trained on a new task loses what it learned on an earlier one, and continual learning is the effort to keep the earlier ability while still learning the new task. A rule can look good for a shallow reason, because it was compared against a baseline that was tuned less carefully or trained for a different budget, so the first thing I wanted was a comparison where those advantages are removed.

The setup is a controlled test on a sequence of tasks, where I train the bio-inspired rule and a plain baseline under the same conditions and measure how much of the earlier task each one retains. [DETAIL NEEDED: the datasets and task sequence, the architecture and its width, the number of seeds, and the retention metric I report.]

## Matching the training budget is the whole experiment

The core of engram is that the comparison has to be fair before any claim is allowed. I match the training budget, so both the bio-inspired rule and the baseline see the same number of updates and the same data exposure, and I tune the baseline as carefully as the rule rather than leaving it at a default. [DETAIL NEEDED: how I tuned each method, and whether tuning was done per dataset so a carried-over learning rate does not handicap one side.] This matters because a difference that only appears when the baseline is undertrained or undertuned is a statement about the comparison, not about the rule.

**Figure 1.** [FIGURE NEEDED: retention on the earlier task as a function of training budget, for the bio-inspired rule and the matched baseline, with seeds shown so the spread is visible.]

## What the fair comparison actually showed

[DETAIL NEEDED: the result once the comparison was fair, stated plainly with the metric, the effect size, and its uncertainty. If the advantage shrank or became statistically unclear under matched tuning, say so directly, since that is the honest outcome the experiment was built to detect.]

**Figure 2.** [FIGURE NEEDED: final retention for each method under matched budget and tuning, with per-seed points and an interval, so the reader can see whether the gap is real.]

## Forgetting is an alignment problem too

The reason engram is more than a bio-inspired curiosity is that the same failure shows up in alignment. When a model keeps training, its earlier behavior can drift or disappear in the same way an earlier task does, so a method that genuinely protected earlier abilities under a fair budget would be relevant well beyond neuroscience. I am careful not to overclaim here, because the honest version of this project is about whether the retention gain is real once the comparison is fair, and a negative or unclear result is still informative for that question.

## Acknowledgements

[DETAIL NEEDED: collaborators, supervisors, and any support to credit for engram.] The code is at github.com/saanviiyer/engram.

## Questions I need you to answer

1. What is the task sequence and dataset, the architecture and width, the number of seeds, and the retention metric you want reported?
2. How did you tune each method, and was tuning done per dataset so no method is handicapped by a carried-over hyperparameter?
3. What is the headline result under matched budget and tuning, with effect size and uncertainty, and do you want the unclear or negative version stated plainly?
4. Which figures already exist in the engram repo, and where, so I can embed them instead of the placeholders?
5. Who should I credit in the acknowledgements?
