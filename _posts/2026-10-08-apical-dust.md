---
layout: post
title: "Apical Dust: cortical feedback for a backprop-free learning rule"
date: 2026-10-08
tag: "Research"
section: technical
permalink: /thinking/apical-dust/
thumb: /assets/images/apical-dust/thumb.png
excerpt: "I added a learned top-down feedback pathway to Q Labs' Dust, a rule that trains transformers with noise instead of a backward pass. As an unbiased control variate it lowers test loss at small populations at about the same compute, and the gain fades by K=256."
---

I was interested in Q Labs' new research on Dust because it is the first zeroth-order method competitive with backpropagation at pretraining transformers, and because at heart it is a biologically flavored learning rule. Noise in the activations, a reward signal, and a local update are the same three ingredients as three-factor plasticity in the brain. My own recent work asks a skeptical question about rules like this: what do biologically constrained learning algorithms actually buy once the comparisons are fair? In my post on [brain-inspired algorithms](/thinking/brain-inspired-algorithms/), the prequel to this one, the answer was less than reported, because a fair baseline erased the advantage locality was supposed to give. Dust made me want to ask the constructive version. If I add one more piece of cortical machinery, top-down feedback onto apical dendrites, does training get better at the same population, and does the gain survive the same scrutiny? This is my independent follow-up to Q Labs' Dust paper, and it is not affiliated with Q Labs.

**TL;DR.**

- **Apical** adds a learned feedback pathway to [Dust](https://qlabs.sh/research/dust). Each layer gets a linear prediction of its own output error from the network's output error. Both errors are estimated from forward passes only, and the feedback weights are learned from Dust's own estimates.
- Used as a **control variate**, the feedback leaves the estimate unbiased and lowers its variance. Test loss improves over Dust in all 6 seed-paired runs at small populations: -0.012 at K=16 and -0.010 at K=64 nats per character. With redundant work removed, an Apical step costs about the same wall-clock time as a Dust step.
- At K=16 that gain is what log-linear interpolation puts at Dust with about 33 draws, roughly twice the population.
- The gain fades as the population grows. At K=256 the paired difference is -0.001, a tie. Dust's own ladder flattens there too, still 0.079 above backprop, which points to bias that no variance reduction can remove.
- Trusting the feedback more is a trap. A precision-weighted version roughly triples per-step cosine to backprop, from 0.26 to 0.78 on the MLP at K=16, yet trains worse (+0.044 at K=16). Its estimate is biased, and momentum accumulates bias while it averages away noise.
- Backprop is still ahead at this scale: 2.394 against 2.473 for Apical at K=256.

## Where Dust leaves room

Dust trains a transformer without backpropagation. It adds Gaussian noise to the output of every linear layer, independently at every token, and rewards each token's noise by how much it lowered the loss. Every token becomes a member of a population, so one forward pass evaluates thousands of perturbations. The reward-weighted noise estimates the error at each layer's output, and its outer product with the layer's input is the weight gradient. The Dust paper shows this approaches backprop as the population grows.

The cost is variance. With K draws and a d-dimensional layer output, the per-token estimate has noise that scales roughly with d/K. Dust buys accuracy with population, which is compute. This post asks whether a biological idea can buy some of that accuracy back more cheaply.

## The biological idea, feedback onto the apical dendrite

Cortical pyramidal neurons receive bottom-up input on their basal dendrites and top-down feedback on a separate apical dendrite. Several models of cortical learning treat the apical signal as a local, approximate error that tells each neuron which way to change (Guerguiev, Lillicrap and Richards, 2017). That signal is never exact. Lansdell, Prakash and Kording (2020) proposed that the brain could learn its feedback weights from noise. Neurons jitter, a neuromodulatory reward reports the outcome, and the correlation trains the feedback pathway. Dust already has the noise and the reward. It is missing the pathway.

Apical adds it. For every module m I keep a feedback matrix `B_m` that maps the network's output error at a token, `e_t`, to a predicted error at that module's output.

```
g_pred(t)  =  B_m · e_t
e_t        =  Dust estimate of dLoss/dlogits at token t   (jitter the cached logits; no derivatives)
B_m        =  EMA ridge regression of Dust's estimates g(t) on e_t
```

Everything stays zeroth-order. The output error is itself estimated by perturbing the logits, which costs only a cross-entropy re-evaluation. The feedback weights are fit by regressing Dust's noisy estimates on `e_t`. Because the noise in those estimates is independent of `e_t`, it averages out of the fit.

## Three ways to use the feedback

A prediction of the gradient can enter the update in three ways. They differ in how far they trust it.

1. **Feedback only.** Update with `B_m e_t` alone, as in learned feedback alignment. Noise trains the pathway but never touches the weights directly. Low variance, but biased wherever a linear map from the output error cannot express the true gradient.
2. **Control variate (Apical).** Subtract the part of each reward that the feedback already explains, estimate only the residual from noise, then add the prediction back.

   ```
   r'(t)  =  r(t) + sigma · <g_pred(t), a(t)>
   g(t)   =  g_pred(t) − (1/K·sigma) Sum_draws r'(t) a(t)
   ```

   The expected correction cancels the prediction exactly, so the estimate stays unbiased whatever `B_m` is. Its noise now scales with the size of the residual `g − g_pred`, not with `g`.
3. **Precision-weighted.** Shrink the residual toward the prediction by its estimated reliability, the way predictive-coding models weigh prediction errors by precision (Feldman and Friston, 2010). The reliability comes online from the agreement between the two halves of the population.

## Setup

Everything is small enough to run on a laptop GPU, so read the numbers as a mechanism study, not a scaling result.

- Character-level tiny Shakespeare (65 symbols), split 90/5/5 into train, validation and test.
- GPT-style transformer: 2 layers, width 128, 4 heads, context 64. Batch of 8 sequences (512 tokens) per step, 1000 steps.
- SGD with momentum 0.9 and a constant learning rate, tuned per method and population on seed 0 over {0.003, 0.01, 0.03, 0.1} at K=16 and 64, and over {0.01, 0.03} at K=256. Three seeds per cell at the tuned rate. Each seed fixes the initialization and data order, so seeds pair across methods.
- I report test loss at the best validation checkpoint, as in the Dust paper.
- Populations K = 16, 64 and 256. K counts draws per module per step. Each of the 13 jittered modules gets its own K draws, and the logits get 4K.

My Dust is a faithful but simplified reimplementation. Attention keys and values are credited through a discounted sum of future token losses (gamma = 0.9) rather than the paper's attention-output alignment. Every layer uses one noise scale (sigma = 0.05). Layer norms have no learned gain. Absolute numbers will not match the paper's.

## Result 1: feedback makes every step look much better

I first measured the per-step cosine between each estimate and the backprop gradient on the same batch, at a partly trained checkpoint, as in the Dust paper's alignment analysis. By that measure the feedback is a huge win. At K=16 the precision-weighted estimate on the MLP input layer reaches 0.78, higher than Dust reaches at K=256. Feedback alone does almost as well on most layers. The unbiased control variate sits in between.

<p class="fig-legend"><span style="color:#7059AE">&#9679;</span> Dust &nbsp; <span style="color:#2D5C9E">&#9679;</span> Apical (unbiased) &nbsp; <span style="color:#B8433B">&#9679;</span> Precision-weighted &nbsp; <span style="color:#9A7516">&#9679;</span> Feedback only</p>

<img src="/assets/images/apical-dust/fig1.svg" alt="Per-step cosine to backprop against population for four estimators, across MLP input, attention output, and keys. The precision-weighted estimate is highest on the MLP, Dust lowest.">

**Figure 1. Per-step alignment with backprop.** Cosine between each estimated weight gradient and the backprop gradient on the same batch, against population, averaged over layers of each type and 4 batches. Checkpoint: 300 backprop steps. Feedback fitted for 40 steps before measuring.

## Result 2: the estimates that look best are biased

The training sweep disagreed. The precision-weighted version trained worse than plain Dust at K=16, despite roughly three times the cosine. Per-step cosine mixes two different kinds of error. Noise is fresh every step, and momentum averages it out over roughly ten steps. Bias points the same way every step, and momentum adds it up.

To separate the two, I fixed one batch and averaged more and more independent K=16 estimates. An unbiased estimator approaches cosine 1 as the average grows, while a biased one levels off. Dust and the control variate keep rising: on the values layer they reach 0.92 and 0.92 at 256 estimates. The feedback-based estimates stall, and on the keys layer they barely move: 0.14 for feedback only and 0.37 precision-weighted, against 0.91 for Dust.

The keys show why. A key at token t is read by later tokens, so its true gradient depends on errors that have not happened yet at t. The feedback pathway only sees the error at t, so it cannot represent that credit. The same holds, less severely, for values and for anything whose gradient depends on a token's own Jacobian, which a single linear map averages away.

<p class="fig-legend"><span style="color:#7059AE">&#9679;</span> Dust &nbsp; <span style="color:#2D5C9E">&#9679;</span> Apical (unbiased) &nbsp; <span style="color:#B8433B">&#9679;</span> Precision-weighted &nbsp; <span style="color:#9A7516">&#9679;</span> Feedback only</p>

<img src="/assets/images/apical-dust/fig2.svg" alt="Cosine to backprop of the mean of N averaged K=16 estimates on one fixed batch. Dust and Apical keep rising toward 1; feedback-only and precision-weighted level off, worst on the keys layer.">

**Figure 2. Averaging separates noise from bias.** Cosine to the backprop gradient of the mean of N independent K=16 estimates on a single fixed batch. Unbiased estimators (Dust, Apical) keep rising toward 1. Biased ones (feedback only, precision-weighted) level off. The embedding layers (not shown) level off near 0.7 for every method, which reflects Dust's own truncated credit for future tokens.

## Result 3: the unbiased version trains better than Dust, while noise dominates

Kept unbiased, the feedback helps where Dust is noisiest. Apical has lower test loss than Dust in every seed-paired comparison at K=16 and K=64, and it varies less across seeds, which is what variance reduction should do. At K=256 the advantage is gone: Apical wins 2 of 3 pairs, by -0.001 on average.

| Method | K = 16 | K = 64 | K = 256 |
| --- | --- | --- | --- |
| Dust | 2.510 ± 0.006 | 2.488 ± 0.010 | 2.473 ± 0.001 |
| **Apical (unbiased control variate)** | **2.498 ± 0.004** | **2.478 ± 0.004** | **2.473 ± 0.001** |
| Apical − Dust, paired | -0.012 (3 of 3) | -0.010 (3 of 3) | -0.001 (2 of 3) |
| Precision-weighted | 2.554 ± 0.004 | 2.487 ± 0.007 | not run |
| Feedback only | 2.634 (1 seed) | not run | not run |
| Backprop | 2.394 ± 0.007 | | |

<img src="/assets/images/apical-dust/fig3.svg" alt="Final test loss for each method across K=16, 64, 256. Seed dots with a mean tick, and backprop at 2.394 as a dashed line. Apical sits left of Dust at K=16 and K=64 and ties at K=256.">

**Figure 3. Final test loss across the population ladder.** Dots are seeds, the black tick is the mean, and the dashed line is backprop. Feedback only is left out because it was run on one seed.

<p class="fig-legend"><span style="color:#15202A">&#9644;</span> Backprop &nbsp; <span style="color:#7059AE">&#9679;</span> Dust &nbsp; <span style="color:#2D5C9E">&#9679;</span> Apical (unbiased) &nbsp; <span style="color:#B8433B">&#9679;</span> Precision-weighted</p>

<img src="/assets/images/apical-dust/fig4.svg" alt="Validation loss over 1000 training steps at K=16. Precision-weighted falls behind within the first hundred steps; Dust and Apical track each other below it, backprop lowest.">

**Figure 4. Validation loss during training at K=16**, mean of 3 seeds. The precision-weighted version falls behind within the first hundred steps and never catches up.

## Does the gain survive matched compute?

Equal population is not equal cost, so I timed it. In the sweep, my first implementation of Apical took about twice as long as Dust per run at K=16. At that price, Dust could simply double its population and match it. Almost all of that overhead was waste: a repeated clean forward pass, a second logit jitter, split-half estimates computed even when unused, and a 65-by-65 matrix inverse that forced a GPU-to-CPU sync every step. The method itself adds one small matrix product per module plus the regression update, about 1% of the arithmetic of the perturbed forward passes.

With that waste removed, the median step time of Apical relative to Dust, over three interleaved rounds, was 0.86x at K=16, 1.22x at K=64 and 0.95x at K=256. The machine was shared with other jobs, so read these as equal within about 20%. The optimized path does the same math with a different random stream, and one K=16 run with it reached 2.500 against 2.502 for the original on the same seed. At K=16 the gain is worth about a doubling of population, well above a 20% cost, so it survives matched compute. It would not have survived the first implementation.

## What the feedback buys, and what it does not

At K=16 the unbiased feedback pathway closes about 53% of the gap between Dust at K=16 and Dust at K=64. The benefit shrinks as Dust's own noise falls: -0.012, then -0.010, then -0.001 at K=256. That is what a control variate should do. It removes variance, and once variance is small there is little left for it to remove.

What remains is bias, and no control variate removes it. Dust's own ladder flattens between K=64 and K=256 at about 2.473, still 0.079 above backprop. The averaging test behind Figure 2 shows where that bias sits: even with 256 estimates averaged, the embedding layers stay near cosine 0.7 for every method, because this Dust credits most layers only for their own token's loss and gives keys and values just a discounted share of the future. The Dust paper approaches backprop at populations in the thousands, with a better credit rule for attention than mine. A better feedback pathway cannot fix bias in the estimator it corrects.

The more general lesson is about how to evaluate gradient estimators. Per-step cosine to backprop, the natural diagnostic, ranked these methods almost exactly backwards. An estimator can align better on every step and still train worse when its error is systematic. Any biologically inspired shortcut that trades noise for structure should be checked by averaging, as in Figure 2, before it is trusted in training.

## Limits

- One small model, one character-level dataset, 512k training tokens and SGD only. The Dust paper's effects appear at much larger scale, and these may not carry over.
- Three seeds per cell. The improvement at K=16 and 64 is consistent (6 of 6 pairs) but small, between -0.001 and -0.020 per pair.
- Populations of 16, 64 and 256. The Dust paper's ladder runs from 64 to 16k, so I only cover its low end, and the gain is already gone by 256.
- Timings come from a shared laptop GPU and are accurate to about 20%. The trained results use the first implementation; the optimized one was checked on one seed only.
- The feedback map is linear in the current token's output error. A richer pathway, for example one that also sees future errors for keys and values, could predict more of the gradient. The control variate keeps it safe to try.

## References

1. Dahal, Mandal, Gülbahar and Vegesna. Dust: Pretraining Transformers Without Backpropagation. Q Labs, 2026. [qlabs.sh/research/dust](https://qlabs.sh/research/dust)
2. Lansdell, Prakash and Kording. Learning to solve the credit assignment problem. ICLR, 2020.
3. Guerguiev, Lillicrap and Richards. Towards deep learning with segregated dendrites. eLife, 2017.
4. Lillicrap, Cownden, Tweed and Akerman. Random synaptic feedback weights support error backpropagation for deep learning. Nature Communications, 2016.
5. Nøkland. Direct feedback alignment provides learning in deep neural networks. NeurIPS, 2016.
6. Frémaux and Gerstner. Neuromodulated spike-timing-dependent plasticity, and theory of three-factor learning rules. Frontiers in Neural Circuits, 2016.
7. Fiete and Seung. Gradient learning in spiking neural networks by dynamic perturbation of conductances. Physical Review Letters, 2006.
8. Feldman and Friston. Attention, uncertainty, and free-energy. Frontiers in Human Neuroscience, 2010.
9. Werfel, Xie and Seung. Learning curves for stochastic gradient descent in linear feedforward networks. NeurIPS, 2003.

## Code

The code is at [github.com/saanviiyer/saanviiyer.github.io/tree/main/code/apical-dust](https://github.com/saanviiyer/saanviiyer.github.io/tree/main/code/apical-dust): apical.py (training), probe.py (Figure 1), bias.py (Figure 2), and sweep.py (Figures 3 and 4). This is independent research and a follow-up to Dust, not affiliated with Q Labs.
