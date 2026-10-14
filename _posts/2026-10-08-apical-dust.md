---
layout: post
title: "Apical Dust, a cortical feedback pathway for a backprop-free learning rule"
date: 2026-10-08
tag: "Research"
section: technical
permalink: /thinking/apical-dust/
math: true
thumb: /assets/images/apical-dust/thumb.png
excerpt: "I added a learned top-down feedback pathway to Q Labs' Dust as an unbiased control variate. At small populations it is worth about 1.6 to 2 times the population at the same wall-clock cost. Along the way I found that per-step cosine to backprop ranks gradient estimators backwards when their bias differs, and that Dust's embeddings need credit from future tokens."
---

Q Labs' Dust is the first zeroth-order method that trains a transformer about as well as backpropagation does. Their follow-up, the Noise speedrun, argues that another 1,000-fold gain will need credit assignment, optimizers and architectures designed together. This post is a small, independent contribution to the credit-assignment and optimizer parts of that program. It is not affiliated with Q Labs.

My background is in neuroscience, and Dust looked familiar to me. It puts noise into neural activity, scores the noise with a reward, and updates each weight from local quantities. Synapses in the brain are thought to learn with the same three ingredients, a rule called three-factor plasticity. In the brain, a fourth ingredient helps: top-down feedback that arrives on a separate part of the neuron, the apical dendrite, and tells the cell which way to change. Dust has no such pathway. I added one and asked whether it buys back some of the population, and therefore compute, that Dust spends on noise.

## TL;DR

1. **A learned feedback pathway, used as a control variate, is worth about twice the population at small K and costs about the same per step.** The estimator stays unbiased. Test loss improves over Dust in all 6 seed-paired runs at K=16 and K=64 (-0.012 and -0.010 nats per character). On a less biased Dust (item 3), the gain at K=16 grows to -0.020 (3 of 3 seeds). The gain is gone by K=256, as variance reduction predicts.
2. **Per-step cosine to backprop ranked my estimators backwards.** A feedback-weighted estimator tripled per-step cosine on the MLP (0.26 to 0.78 at K=16) and still trained worse (+0.044). Its error points the same way every step, and momentum adds that error up. A simple averaging test separates bias from noise and gave the right ranking. The test matters for Dust because the paper uses cosine on a single batch to shortlist hyperparameters.
3. **Token embeddings need credit from future tokens.** The Dust paper gives future-token credit only to attention internals. My averaging test shows that the embedding gradient then stalls at cosine 0.71 to backprop. Crediting the embedding for later tokens raises the stall point to 0.78 and lowers test loss by about 0.03 at K=64 and K=256.
4. **Backprop is still ahead at this scale.** It reaches 2.394, against 2.443 for my best Dust at K=256.

All of these results come from a 2-layer character-level model trained on 512k tokens, so they show mechanisms. They are not scaling results. The last section lists the checks I would run at Dust's scale.

## Where Dust spends its compute

Dust adds Gaussian noise to the output of every linear layer, independently at every token. It rewards each token's noise by how much that noise lowered the loss. Each token thus acts as one member of a population, and one forward pass tests thousands of perturbations. The reward-weighted noise estimates the error at each layer's output. The outer product of that error with the layer's input gives the weight gradient, which is the same update backprop forms.

The cost is variance. With K draws and a d-dimensional layer output, the noise in the per-token estimate scales roughly with d/K. Dust reduces that noise by increasing the population, which costs compute. I wanted to know whether a biological mechanism could remove some of the noise more cheaply.

## The biological idea, feedback onto the apical dendrite

Cortical pyramidal neurons receive bottom-up input on their basal dendrites. Top-down feedback from higher areas arrives on a separate apical dendrite. Several models of cortical learning treat the apical signal as a local, approximate error that tells each neuron which way to change (Guerguiev, Lillicrap and Richards, 2017). The signal is never exact, so the brain must learn it somehow. Lansdell, Prakash and Kording (2020) proposed that the brain learns its feedback weights from noise. Neurons jitter, a neuromodulatory reward reports the outcome, and the correlation between the two trains the feedback pathway. Dust already has the noise and the reward. It lacks the pathway.

Apical adds it. For every module $$m$$, I keep a feedback matrix $$B_m$$. It maps the network's output error at a token, $$e_t$$, to a predicted error at the module's output.

$$
\begin{aligned}
\hat g_{\text{pred}}(t) &= B_m\, e_t \\
e_t &= \text{Dust estimate of } \partial \mathcal{L} / \partial\, \text{logits}_t \quad \text{(jitter the cached logits; no derivatives)} \\
B_m &= \text{EMA ridge regression of Dust's estimates } \hat g(t) \text{ on } e_t
\end{aligned}
$$

Every step stays zeroth-order. I estimate the output error by perturbing the logits, which costs only one more cross-entropy evaluation. I fit the feedback weights by regressing Dust's noisy estimates on $$e_t$$. The noise in those estimates is independent of $$e_t$$, so it averages out of the fit.

## Three ways to use the feedback

A prediction of the gradient can enter the update in three ways. The ways differ in how much they trust the prediction.

1. **Feedback only.** Update with $$B_m e_t$$ alone, as in learned feedback alignment (Lillicrap et al., 2016; Nøkland, 2016). Noise trains the pathway but never moves the weights directly. The variance is low, but the update is biased wherever a linear map from the output error cannot express the true gradient.
2. **Control variate (Apical).** Remove the part of each reward that the feedback already explains, estimate only the remainder from noise, and add the prediction back.

   $$
   \begin{aligned}
   r'(t) &= r(t) + \sigma \, \big\langle \hat g_{\text{pred}}(t),\, a(t) \big\rangle \\
   \hat g(t) &= \hat g_{\text{pred}}(t) - \frac{1}{K\sigma} \sum_{k=1}^{K} r'_k(t)\, a_k(t)
   \end{aligned}
   $$

   In expectation, the correction term cancels the prediction, so the estimate stays unbiased for any $$B_m$$. A poor feedback map therefore cannot hurt the expected update. Its noise now scales with the size of the remainder $$g - \hat g_{\text{pred}}$$ and no longer with $$g$$.
3. **Precision-weighted.** Shrink the remainder toward the prediction according to its estimated reliability. Predictive-coding models of cortex weigh prediction errors by precision in this way (Feldman and Friston, 2010). I estimate the reliability online from how well the two halves of the population agree.

## Setup

Every run fits on a laptop GPU.

- Data: character-level tiny Shakespeare (65 symbols), split 90/5/5 into train, validation and test.
- Model: GPT-style transformer with 2 layers, width 128, 4 heads and context 64. Each step uses 8 sequences (512 tokens), for 1000 steps.
- Optimizer: SGD with momentum 0.9 and a constant learning rate. I tuned the rate per method and population on seed 0, over {0.003, 0.01, 0.03, 0.1} at K=16 and 64, and over {0.01, 0.03} at K=256. Each cell then runs three seeds at the tuned rate. A seed fixes the initialization and the data order, so I can pair seeds across methods.
- Metric: test loss at the best validation checkpoint, as in the Dust paper.
- Populations: K = 16, 64 and 256. K counts draws per module per step. Each of the 13 jittered modules gets its own K draws, and the logits get 4K.

My Dust is a faithful but simplified reimplementation. It uses one noise scale (σ = 0.05) for every layer, and its layer norms have no learned gain. In the first version, I credited attention keys and values with a discounted sum of future token losses (γ = 0.9). The paper instead scores them by alignment with the error at the attention output. Result 4 replaces my rule with the paper's. Absolute numbers will not match the paper's numbers.

## Result 1, the feedback makes every step look much better

First I measured the per-step cosine between each estimate and the backprop gradient on the same batch, at a partly trained checkpoint. The Dust paper uses the same alignment analysis. By this measure the feedback is a clear win. At K=16, the precision-weighted estimate on the MLP input layer reaches 0.78, which is higher than Dust reaches at K=256. Feedback alone does almost as well on most layers. The unbiased control variate falls between the two.

<p class="fig-legend"><span style="color:#7059AE">&#9679;</span> Dust &nbsp; <span style="color:#2D5C9E">&#9679;</span> Apical (unbiased) &nbsp; <span style="color:#B8433B">&#9679;</span> Precision-weighted &nbsp; <span style="color:#9A7516">&#9679;</span> Feedback only</p>

<img src="/assets/images/apical-dust/fig1.svg" alt="Per-step cosine to backprop against population for four estimators, across MLP input, attention output, and keys. The precision-weighted estimate is highest on the MLP, Dust lowest.">

**Figure 1. Per-step alignment with backprop.** Cosine between each estimated weight gradient and the backprop gradient on the same batch, against population, averaged over layers of each type and 4 batches. Checkpoint: 300 backprop steps. Feedback fitted for 40 steps before measuring.

## Result 2, the estimates that look best are biased

Training disagreed with Figure 1. At K=16, the precision-weighted version trained worse than plain Dust, even with about three times the per-step cosine. Per-step cosine mixes two kinds of error. Noise is fresh every step, and momentum averages it out over roughly ten steps. Bias points the same way every step, so momentum adds it up.

To separate the two kinds of error, I fixed one batch and averaged more and more independent K=16 estimates. The cosine of an unbiased estimator approaches 1 as the average grows. A biased estimator levels off below 1, at a height set by its bias. Dust and the control variate keep rising, and on the values layer both reach 0.92 at 256 estimates. The feedback-based estimates stall. On the keys layer they barely move: 0.14 for feedback only and 0.37 for precision-weighted, against 0.91 for Dust.

The keys show the cause. Later tokens read the key at token t, so the true gradient of that key depends on errors that occur after t. The feedback pathway sees only the error at t, so it cannot represent that credit. The same limit applies, less severely, to values, and to any gradient that depends on a token's own Jacobian, which a single linear map averages away.

<p class="fig-legend"><span style="color:#7059AE">&#9679;</span> Dust &nbsp; <span style="color:#2D5C9E">&#9679;</span> Apical (unbiased) &nbsp; <span style="color:#B8433B">&#9679;</span> Precision-weighted &nbsp; <span style="color:#9A7516">&#9679;</span> Feedback only</p>

<img src="/assets/images/apical-dust/fig2.svg" alt="Cosine to backprop of the mean of N averaged K=16 estimates on one fixed batch. Dust and Apical keep rising toward 1; feedback-only and precision-weighted level off, worst on the keys layer.">

**Figure 2. Averaging separates noise from bias.** Cosine to the backprop gradient of the mean of N independent K=16 estimates on a single fixed batch. Unbiased estimators (Dust, Apical) keep rising toward 1. Biased ones (feedback only, precision-weighted) level off. The embedding layers (not shown) level off near 0.7 for every method. Result 4 traces that plateau to Dust's credit rule for embeddings.

This result bears on how Dust is tuned. The Dust paper shortlists noise scales and credit decays by their cosine to backprop on a single batch, then lets training choose among them. A single-batch cosine rewards any change that trades noise for bias. The averaging curve costs a few hundred extra estimates on one batch, and it shows the bias as the height where the curve levels off. I would use that height as the screen.

## Result 3, the unbiased version trains better than Dust while noise dominates

Kept unbiased, the feedback helps where Dust is noisiest. Apical has lower test loss than Dust in every seed-paired comparison at K=16 and K=64. It also varies less across seeds, which is what variance reduction should do. At K=256 the advantage is gone: Apical wins 2 of 3 pairs, by -0.001 on average.

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

To express the K=16 gain as population, I interpolated Dust's loss log-linearly between K=16 and K=64. Apical at K=16 matches Dust with about 33 draws, roughly twice the population. Apical closes about 53% of the gap between Dust at K=16 and Dust at K=64.

## Does the gain survive matched compute?

Equal population does not mean equal cost, so I timed both methods. In the sweep, my first Apical implementation took about twice as long per run as Dust at K=16. At that price, Dust could double its population and match Apical. Almost all of the overhead was waste. The code repeated a clean forward pass and a logit jitter, computed split-half estimates even when they were unused, and inverted a 65-by-65 matrix that forced a GPU-to-CPU sync every step. The method itself adds one small matrix product per module plus the regression update. That is about 1% of the arithmetic of the perturbed forward passes.

With the waste removed, the median step time of Apical relative to Dust, over three interleaved rounds, was 0.86x at K=16, 1.22x at K=64 and 0.95x at K=256. Other jobs shared the machine, so I read these times as equal within about 20%. The optimized code does the same math with a different random stream. One K=16 run with it reached 2.500, against 2.502 for the original code on the same seed. At K=16 the gain is worth about a doubling of population, which is well above a 20% cost, so the gain survives matched compute. It would not have survived my first implementation.

## Result 4, fixing Dust's credit, then adding feedback again

The averaging test also locates the remaining bias in Dust itself. With 1024 independent estimates averaged on one batch, my original Dust reaches cosine 0.98 on queries, attention outputs and the MLP. It reaches only 0.88 on keys and values and 0.71 on the token embedding. Two credit rules explain the gap. First, my reimplementation credited keys and values with a discounted sum of downstream token losses, which is cruder than the paper's rule. Second, it credited each embedding only for its own token's loss. The Dust paper makes the same choice: as I read its Section 2.3, only keys, values, gates and value embeddings receive credit from future tokens. However, the embedding at token t enters the residual stream, and later tokens read it through attention, so its true gradient includes their losses.

I made two changes. For attention internals I implemented the paper's rule. It jitters queries, keys or values, recomputes only that block's attention output from cached activations, and scores each jitter per head by its alignment with the estimated error at the attention output. Keys and values also get credit from later tokens (γ = 0.97). For embeddings, which the paper does not cover this way, I added future-token credit (γ = 0.9). In the averaging test, keys rise from 0.88 to 0.95 and the token embedding from 0.71 to 0.78, still climbing at 1024 estimates. Values stay near 0.87, so some bias remains there.

Both changes make each single estimate noisier, so training has to decide. The embedding credit carries most of the gain. The attention rule alone hurts at K=16, where its extra noise costs more than the bias it removes. Combined with the embedding credit, it helps at larger populations.

| Test loss, nats/char | K = 16 | K = 64 | K = 256 |
| --- | --- | --- | --- |
| Original Dust (my reimplementation) | 2.510 ± 0.006 | 2.488 ± 0.010 | 2.473 ± 0.001 |
| + paper's attention credit | 2.529 ± 0.005 | 2.484 ± 0.006 | not run |
| + future credit for embeddings | 2.502 ± 0.006 | 2.464 ± 0.003 | 2.446 ± 0.006 |
| **+ both (fixed Dust)** | **2.509 ± 0.001** | **2.452 ± 0.016** | **2.443 ± 0.006** |
| Fixed − original, paired | -0.001 (1 of 3) | -0.036 (3 of 3) | -0.030 (3 of 3) |
| **Apical on fixed Dust** | **2.489 ± 0.004** | **2.444 ± 0.014** | not run |
| Apical − fixed Dust, paired | -0.020 (3 of 3) | -0.008 (1 of 3) | not run |
| Backprop | 2.394 ± 0.007 | | |

Learning rates were tuned on seed 0 over {0.01, 0.03} at K=16 and 64. At K=256 the fixed variants use 0.03 without a separate tune. That rate won for them at K=64 and for the original Dust at K=256.

The row closest to the paper's Dust is "+ paper's attention credit". Adding embedding credit to it lowers mean test loss from 2.529 to 2.509 at K=16 and from 2.484 to 2.452 at K=64. These are differences of means, not paired differences. Against my original Dust, the fixed version lowers test loss by 0.036 at K=64 and 0.030 at K=256, which closes about 38% of the K=256 gap to backprop. The fixed Dust at K=64 already beats the original at K=256. Its ladder still flattens, gaining only 0.009 from K=64 to K=256, so bias still sets the floor.

On the fixed Dust, the feedback pathway gains more at K=16: -0.020 in all three seed pairs, against -0.012 on the original. The averaging test predicts this. The fixed estimator is less biased but noisier per step, and noise is what a control variate removes. In population terms, the gain equals about 1.6 times the population on the fixed Dust's steeper ladder. At K=64 the difference is -0.008, with one of three pairs better, which is inconclusive. Apical on the fixed Dust at K=16 reaches 2.489, level with the original Dust at K=64 (2.488) with a quarter of the draws.

## What I would test at Dust's scale

My runs cover the low end of Dust's population ladder on a toy task. The Dust paper runs from K=64 to 16k on FineWeb with models up to 243M parameters. Four checks would show whether these mechanisms carry over.

The first check is the embedding credit, which costs nothing to try. With a context of 64 tokens and 2 layers, the embedding stalled at 0.71. With longer contexts and more layers, more later tokens read each embedding, so I expect the truncation bias to grow. The averaging test on one FineWeb batch would show this in minutes.

The second is the averaging plateau as a tuning screen. If the paper's cosine-picked candidates differ from the plateau-picked ones, the training runs will show which screen is right.

The third is the control variate across the full ladder. A control variate removes variance, so its gain should shrink as K grows, as it did here. Its value is at small populations, and a compute-bound speedrun lives at small populations.

The fourth is a richer feedback map. Because the control variate keeps the estimate unbiased, a nonlinear map, or one that also sees future errors for keys and values, cannot make the expected update worse. It can only predict more of the gradient or less.

## Limits

- One small model, one character-level dataset, 512k training tokens and SGD only. Dust's effects appear at much larger scale, and mine may not carry over.
- Three seeds per cell. The improvement at K=16 and 64 is consistent (6 of 6 pairs) but small, between -0.001 and -0.020 per pair.
- Populations of 16, 64 and 256 only. The original Apical gain is gone by 256, and I did not run Apical on the fixed Dust at 256.
- I chose the credit decays (γ = 0.97 for keys and values, 0.9 for embeddings) from gradient cosines on one batch. I did not tune them in training.
- Timings come from a shared laptop GPU and are accurate to about 20%. The trained results use the first implementation. I checked the optimized one on one seed only.
- The feedback map is linear in the current token's output error.

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
