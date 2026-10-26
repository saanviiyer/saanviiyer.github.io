---
layout: post
title: "Our brains don't run on backprop, so why do our models?"
dek: "Training without backprop using local learning rules & forward-only transformers"
date: 2026-10-25
tag: "NeuroAI"
section: technical
rank: 4
math: true
thumb: /assets/images/forward-training/sketch-apical.webp
permalink: /writing/apical-dust/
redirect_from:
  - /writing/brain-like-learning/
  - /writing/forward-training/
  - /thinking/brain-like-learning/
  - /thinking/apical-dust/
  - /thinking/brain-like-algorithms/
  - /thinking/brain-inspired-algorithms/
  - /thinking/backprop-free-pretraining/
  - /thinking/engram-continual-learning/
excerpt: "Biological circuits cannot run backprop. I test whether brain-like local learning rules forget less (they do not, once learning is held fixed), then add a cortical top-down feedback pathway to Q Labs' Dust, a forward-only transformer pretraining method, as an unbiased control variate that is worth about twice the population."
---

<link rel="stylesheet" href="/assets/css/forward-training.css?v=3">

Most deep learning architectures rely on backpropagation to optimize weight matrices and compute exact gradients by propagating continuous error signals backwards through network layers. In contrast, biological neural circuits in the mammalian brain physically cannot execute backprop, relying instead on forward learning.

**Code.** The Apical Dust experiments are at [github.com/saanviiyer/apical-dust](https://github.com/saanviiyer/apical-dust). Terms in <span class="ft-def" tabindex="0">magenta<span class="ft-pop" role="tooltip">Like this. Hover over a magenta term for a short definition.</span></span> have a definition on hover, and I'm excited about the animations! I've hand-drawn (poorly) some of the diagrams before my hand started hurting. See if you can spot them :P

## Why should we care?

The benefit to studying the biological brain is that it has the advantage of evolution. This evolved system has persisted and improved over billions of years, and the programmatic nature of nature suggests how our brains must be optimized for efficiency. Problems in existing model architecture like continual learning and catastrophic forgetting, and even pretraining and generalization and data efficiency, are already solved in the human brain, and reverse engineering and understanding our algorithms can help us find out exactly what is happening to inspire and enhance models.

## How do we know the brain doesn't use backprop?

**The weight transport problem.** Backprop requires the backward pass to execute matrix multiplications using the transpose of the forward weight matrices. However, biological synapses are unidirectional (axons send, dendrites receive). Additionally, the original *Backpropagation and the Brain* paper describes how a biological neuron possesses no biophysical mechanism to copy or mirror the forward synaptic weights to a feedback pathway ([Lillicrap et al., 2016](#ref-lillicrap2016); [Lillicrap et al., 2020](#ref-lillicrap2020)).

**Biological brains operate locally.** While backprop uses a continuous, global error signal back through deep layers, our brains do not have this centralized system to transmit layer by layer reverse chaining signals across billions of non-linear, spiking synapses. Three-factor plasticity describes how biological synaptic updates are spatio-temporally local and depend on three local signals, <span class="ft-def" tabindex="0">presynaptic activity<span class="ft-pop" role="tooltip">The input side of the synapse: the firing rate or spike timing of the neuron sending the signal.</span></span>, <span class="ft-def" tabindex="0">postsynaptic activity<span class="ft-pop" role="tooltip">The receiving side: how depolarized the neuron is, or whether its dendrite is producing a dendritic spike.</span></span>, and a <span class="ft-def" tabindex="0">neuromodulatory third factor<span class="ft-pop" role="tooltip">A spatially diffuse signal that broadcasts reward, surprise or error to many synapses at once. Dopamine is one example!</span></span>, instead of a global error signal ([Frémaux and Gerstner, 2016](#ref-fremaux2016)).

## So how do our brains work, if not backprop?

Biological neurons are separated by structure and function, as evidenced through dendrites. In the mammalian neocortex, the typical <span class="ft-def" tabindex="0">pyramidal neuron<span class="ft-pop" role="tooltip">The main excitatory neuron of the cortex, about two thirds of its neurons. Pyramidal neurons differ in function from most other cells in their long-range communication across brain areas.</span></span> has two sets of receiving antennas, denoted basal dendrites and apical dendrites. Basal dendrites correspond to bottom-up sensory input receivers near the soma, while apical dendrites are associated with top-down feedback signals from higher-order areas and reach into the outermost layer of the cortex. **Top-down feedback maps can be trained purely from local correlations between stochastic neural perturbations (like activation noise) and global neuromodulatory feedback signals** ([Guerguiev et al., 2017](#ref-guerguiev2017); [Lansdell et al., 2020](#ref-lansdell2020)).

<figure class="ft-fig">
  <div class="ft-card" data-ft="neuron"></div>
  <figcaption><strong>Two inputs, one neuron.</strong> A schematic pyramidal neuron, coloured the way every figure in this post is: blue for bottom-up input, magenta for top-down feedback, orange for output. Turn feedback off and the output falls back to single spikes. Coincident apical input turning spikes into bursts is one proposed way top-down signals could act as a local teaching signal (<a href="#ref-larkum2013">Larkum, 2013</a>).</figcaption>
</figure>

**I first tested whether these local learning rules can provide a solution towards continual learning. Local, biologically plausible learning rules (like <span class="ft-def" tabindex="0">Feedback Alignment<span class="ft-pop" role="tooltip">A hack around weight transport: instead of mirroring the forward weights, the error is sent back through a fixed random matrix. The forward weights adapt until the random feedback becomes useful, so the model learns to interpret a random language.</span></span>, <span class="ft-def" tabindex="0">Direct Feedback Alignment<span class="ft-pop" role="tooltip">Instead of passing the error back layer by layer, the final output error is piped to every hidden layer at once through its own random projection. More local than feedback alignment.</span></span>, and <span class="ft-def" tabindex="0">Predictive Coding<span class="ft-pop" role="tooltip">The brain as a prediction machine: each layer constantly predicts what the layer below it will do, and only the error in that prediction is passed along.</span></span>) have shown potential in protecting neural networks against catastrophic forgetting ([Lillicrap et al., 2016](#ref-lillicrap2016); [Nøkland, 2016](#ref-nokland2016); [Rao and Ballard, 1999](#ref-rao1999); [Whittington and Bogacz, 2017](#ref-whittington2017)). Continual learning and <span class="ft-def" tabindex="0">catastrophic forgetting<span class="ft-pop" role="tooltip">The overwriting of historical task representations when a network learns a new distribution (McCloskey and Cohen, 1989).</span></span> are two sides of the same coin, as continual learning requires acquiring new task distributions without inducing catastrophic forgetting, or the overwriting of historical task representations.**

Looking into how I could test local learning rules compared to backprop, I was surprised to see that most prior studies evaluate local learning rules against fully converged baselines without controlling for initial task learning accuracy. A learning rule that achieves lower task accuracy induces lower weight-space projection tensor updates. Put more simply, **local learning rules forgetting less can easily be confounded with them learning less overall**. So, to evaluate continual learning retention rigorously, it makes more sense to measure **<span class="ft-def" tabindex="0">backward transfer<span class="ft-pop" role="tooltip">Backward transfer (BWT): how much accuracy on earlier tasks changes after learning later ones. Negative means forgetting (Lopez-Paz and Ranzato, 2017).</span></span>** while holding learning accuracy on the new task strictly constant against a backprop baseline.

<figure class="ft-fig">
  <div class="ft-card" data-ft="confound"></div>
  <figcaption><strong>Learning less looks like forgetting less.</strong> Along backprop's trade-off curve, a network that learns more also forgets more. Compare a local rule against a backprop baseline that learned more and the rule looks protective; slide the comparison down to matched learning accuracy and the gap collapses to +0.21 points, the largest edge any local rule showed (predictive coding). Replay sits 10.6 points above the curve. The axes are schematic; the two gaps are measured.</figcaption>
</figure>

## Experiment 1: Local rules vs. backprop in continual learning
{: .ft-exp}

To rigorously test whether local learning rules protect against catastrophic forgetting, I evaluated Feedback Alignment (FA), Direct Feedback Alignment (DFA), and Predictive Coding (PC) against backpropagation on class-incremental Split-CIFAR-10 ([Krizhevsky, 2009](#ref-krizhevsky2009)). Every rule trains the same two-layer network, so credit assignment is the only thing that changes. Rather than force every rule to one accuracy, I built a ladder of eleven backprop runs weakened only by fewer epochs or a lower learning rate, and compared each rule with backprop at the same learning accuracy. I measured backward transfer (BWT) to quantify retention after learning subsequent tasks.

**Setup**

- **Benchmarks:** Split-CIFAR-10 (five tasks of two classes), with Split-CIFAR-100 and Split-FashionMNIST as replications. One growing output head and no task labels at test time.
- **Architecture:** a shared two-layer MLP, with a small ResNet as a replication ([He et al., 2016](#ref-he2016)).
- **Methods tested:** FA, DFA, PC, and backprop, each with and without a replay buffer.
- **Control method:** the eleven-run backprop ladder, matched to each rule's learning accuracy within each seed, with the small leftover gap corrected for.
- **Metric:** BWT against learning accuracy (accuracy on each task right after training on it), across 16 seeds.

Within each seed, **backward transfer turned out to be almost a deterministic function of learning accuracy: BWT = −1.44 × learning accuracy + 36.6, with an $$R^2$$ of 0.995.** Holding out each condition in turn, that line predicts backward transfer to within 1.09 points across 224 held-out predictions, so it works as a measuring instrument.

**Results**

<div class="ft-table-wrap">
<table class="ft-table">
  <thead><tr><th>Method</th><th>Learning accuracy</th><th>BWT (points)</th><th>Retention vs. backprop at matched learning</th></tr></thead>
  <tbody>
    <tr><td><i style="background:var(--ft-true)"></i>Backprop (full training)</td><td>83.5%</td><td>−82.8</td><td>reference</td></tr>
    <tr><td><i style="background:var(--ft-fa)"></i>Feedback Alignment (FA)</td><td>83.1%</td><td>−82.5</td><td>−0.08 [−0.21, +0.05]</td></tr>
    <tr><td><i style="background:var(--ft-dfa)"></i>Direct Feedback Alignment (DFA)</td><td>81.7%</td><td>−81.3</td><td>−0.11 [−0.28, +0.06]</td></tr>
    <tr><td><i style="background:var(--ft-pc)"></i>Predictive Coding (PC)</td><td>85.0%</td><td>−84.4</td><td>+0.21 [+0.11, +0.31]</td></tr>
    <tr class="ft-hl"><td><i style="background:var(--ft-replay)"></i>Backprop + replay</td><td>83.0%</td><td>−71.8</td><td>+10.6 [+10.0, +11.1]</td></tr>
    <tr class="ft-hl"><td><i style="background:var(--ft-replay)"></i>FA, DFA or PC + replay</td><td>80.3–84.1%</td><td>−67.6 to −73.6</td><td>+9.9 to +12.3</td></tr>
  </tbody>
</table>
</div>

Raw backward transfer sits near −83 points for every rule, because a single growing head forgets almost everything in this setting. The last column, retention at matched learning accuracy with its 95% interval, is the comparison that means something.

<figure class="ft-fig">
  <div class="ft-card" data-ft="bwt"></div>
  <figcaption><strong>Every rule forgets about as much as backprop.</strong> Each bar is how much less a rule forgets than backprop at the same learning accuracy, with its 95% interval, on Split-CIFAR-10 across 16 seeds. The three local rules sit within a third of a point of zero. Add replay to see the one change that moves retention.</figcaption>
</figure>

**Findings**

- **Feedback Alignment (FA):** learned to 83.1% against backprop's 83.5%. At matched learning accuracy it forgot 0.08 points more [−0.21, +0.05], p = 0.14, indistinguishable from backprop.
- **Direct Feedback Alignment (DFA):** learned to 81.7%. At matched learning accuracy it forgot 0.11 points more [−0.28, +0.06], p = 0.40, also indistinguishable.
- **Predictive Coding (PC):** learned the most, 85.0%, and retained 0.21 points more [+0.11, +0.31], p = 0.001. I had pre-registered that a local rule retaining better at matched learning would refute my hypothesis, so I report predictive coding as a refutation. But +0.21 points is under a fifth of the instrument's own 1.09-point error and fifty times smaller than replay.

**Takeaways**

- **Local rules do not inherently prevent catastrophic forgetting.** At matched learning accuracy, any advantage from locality is under a third of a point.
- **Forgetting tracks learning.** A rule that learns less forgets less for free, so a raw comparison measures the confound and not retention.
- **A replay buffer is necessary.** Replay lifts retention by 10.6 points for backprop and by 9.9 to 12.3 points for the local rules.

The relation holds on Split-CIFAR-100 and on a small ResNet ($$R^2 \ge 0.995$$), but it breaks on Split-FashionMNIST, where held-out error reaches 12.3 points, so I make no retention claims there.

Hmm… so it seems local credit assignment does not improve catastrophic forgetting.

But can these methods enhance forward-pass pretraining efficiency? I have high hopes for this because biologically plausible learning rules should theoretically perform better in biologically plausible scenarios like forward learning, as that is how the cortex functions!

## Dust: pretraining with forward passes only

I was inspired to pursue this question from Dust, Q Labs' backprop-free transformer pretraining approach ([Dahal et al., 2026](#ref-dust)). This is a <span class="ft-def" tabindex="0">zeroth-order<span class="ft-pop" role="tooltip">Trains a neural network without calculating gradients, so no backprop: it only ever evaluates the loss, and infers which way to move from how the loss responds to small random changes.</span></span> optimization designed to pretrain transformer architectures using exclusively forward evaluations. Sounds familiar, right?
Classic forward-only training strategies rely on **weight perturbation** (adding stochastic noise to estimate updates using just forward passes), but these scale poorly as a result of the millions to billions of parameters in the network ([Werfel et al., 2003](#ref-werfel2003); [Salimans et al., 2017](#ref-salimans2017)). Two well-known examples are <span class="ft-def" tabindex="0">evolution strategies<span class="ft-pop" role="tooltip">OpenAI's version of weight perturbation (Salimans et al., 2017). Each worker adds full-size random noise to every weight, runs the model forward, and reports its loss. The update moves the weights toward the noise directions that lowered the loss.</span></span> and <span class="ft-def" tabindex="0">EGGROLL<span class="ft-pop" role="tooltip">A newer evolution-strategies method built for very large models (Sarkar et al., 2025). It makes each noise sample low-rank, the product of two thin matrices, so a whole population of perturbed models costs far less memory and compute. It still perturbs the weights, so its noise grows with the parameter count.</span></span> ([Sarkar et al., 2025](#ref-sarkar2025)). Weight-perturbation variance explodes proportionally with total parameter count, which causes the gradient estimators to become too noisy.

Dust takes a different approach with **node perturbation** ([Fiete and Seung, 2006](#ref-fiete2006)), which injects Gaussian noise vector perturbations directly in the linear layer activation outputs at each token position, and provides a more local solution that scales with the activation output dimension as opposed to the total parameter count. This enables a single forward pass over a batch to evaluate thousands of candidate perturbations simultaneously.

<figure class="ft-fig ft-flip">
  <div class="ft-flip-inner">
    <div class="ft-face ft-front"><div class="ft-card" data-ft="perturbation"></div></div>
    <div class="ft-face ft-back"><img src="/assets/images/forward-training/sketch-perturbation.webp" alt="My hand-drawn sketch comparing weight perturbation (EGGROLL), which makes a noisy copy of every weight with variance proportional to the parameter count P, against node perturbation (Dust), which perturbs token activations with variance proportional to d over K." loading="lazy"></div>
  </div>
  <div class="ft-flip-bar"><button class="ft-flip-btn" type="button">Flip to see my sketch</button><span>or tap the animation</span></div>
  <figcaption><strong>Where the noise goes.</strong> Weight perturbation puts noise on every one of the P weights, so its variance grows with the parameter count. Node perturbation leaves the weights clean and adds independent noise to each layer output at every token, so one sequence pass tests many perturbations and the variance only grows with the activation width d, divided by the population K.</figcaption>
</figure>

Dust uses credit assignment via centered loss reduction, by computing scalar loss reductions for each token. A reward scalar is assigned to the perturbation at any individual token by accumulating downstream loss reductions discounted by a gamma factor. So with this, layers are perturbed in isolated passes using cached clean forward activations to eliminate noise interference across the deep Transformer blocks. Therefore, attention internals are scored per-head on alignment with estimated error vectors at the attention block output, and L2 normalization is used for optimization. Finally, the language model head is updated with this zeroth-order stochastic logit perturbation via single-pass cross-entropy evaluation at much lower computational cost.

<figure class="ft-fig ft-flip">
  <div class="ft-flip-inner">
    <div class="ft-face ft-front"><div class="ft-card" data-ft="credit"></div></div>
    <div class="ft-face ft-back"><img src="/assets/images/forward-training/sketch-credit.webp" alt="My hand-drawn sketch of Dust's credit assignment: token IDs, embeddings and transformer blocks feed a target block m whose clean input is cached, then later blocks, the LM head, logits and per-token losses." loading="lazy"></div>
  </div>
  <div class="ft-flip-bar"><button class="ft-flip-btn" type="button">Flip to see my sketch</button><span>or tap the animation</span></div>
  <figcaption><strong>Dust's credit assignment: which parts of the model contributed to the outcome?</strong> A clean forward pass saves the activations entering the target block m, so the expensive early blocks never run twice. The isolated pass then reuses that cache, perturbs block m, and reruns only the blocks downstream of it to read off per-token losses.</figcaption>
</figure>

$$
\begin{aligned}
c_s &= \bar L_s - L_s, \qquad r_t = \sum_{s \ge t} \gamma^{\,s-t}\, c_s \\
\hat e_t &= -\frac{1}{K\sigma} \sum_{i=1}^{K} r_t^{(i)}\, a_t^{(i)}, \qquad \Delta W_m = \sum_t \hat e_t\, x_t^{\top}
\end{aligned}
$$

<figure class="ft-fig ft-flip">
  <div class="ft-flip-inner">
    <div class="ft-face ft-front"><div class="ft-card" data-ft="isolated"></div></div>
    <div class="ft-face ft-back"><img src="/assets/images/forward-training/sketch-isolated-pass.webp" alt="My hand-drawn sketch of the isolated pass: cached input, selected MLP with noise added, downstream blocks, LM head and logits, per-token losses, centered loss reduction, the output error estimate, and the local weight update." loading="lazy"></div>
  </div>
  <div class="ft-flip-bar"><button class="ft-flip-btn" type="button">Flip to see my sketch</button><span>or tap the animation</span></div>
  <figcaption><strong>One isolated pass, step by step.</strong> The equations above, as a pipeline. The live panel underneath is real arithmetic in 128 dimensions: K noise draws, centred-loss rewards, and the estimate ê of the output error. It is unbiased, so more draws keep pulling it toward the true error, and at K = 16 it lands near the per-step cosine Dust shows on real MLP layers. The update keeps the same form as backprop's, error times input, even though the error came from forward passes alone.</figcaption>
</figure>

Dust is limited in its per-token gradient noise variance, as suppressing gradient noise in Dust means scaling to thousands of population draws, which incurs substantial compute overhead. But here, a top-down feedback pathway can provide an unbiased control variate that suppresses this variance without requiring these additional population draws and still retaining a backprop-free approach. Enter Apical Dust!

## Apical Dust

<figure class="ft-fig ft-flip">
  <div class="ft-flip-inner">
    <div class="ft-face ft-front"><div class="ft-card" data-ft="apical"></div></div>
    <div class="ft-face ft-back"><img src="/assets/images/forward-training/sketch-apical.webp" alt="My hand-drawn sketch comparing standard Dust, where the estimated error has high variance at small K, with Apical Dust, which adds a feedback map, a predicted error, adjusted perturbation rewards, and a residual estimate that stays unbiased for any feedback map." loading="lazy"></div>
  </div>
  <div class="ft-flip-bar"><button class="ft-flip-btn" type="button">Flip to see my sketch</button><span>or tap the animation</span></div>
  <figcaption><strong>Standard Dust vs. Apical Dust.</strong> Both estimators aim at the same gradient. Apical Dust first predicts it with a learned feedback map, then uses the noise only to estimate what the prediction missed, which is why its estimates cluster tighter around the same centre.</figcaption>
</figure>

I built a framework that adds on to Dust by integrating a top-down linear feedback pathway to suppress estimator variance, while also guaranteeing mathematical unbiasedness.

## Experiment 2: Forward pretraining with Apical Dust
{: .ft-exp}

Weight perturbation vs. node perturbation vs. Apical Dust:

<figure class="ft-fig">
  <div class="ft-card" data-ft="variance"></div>
  <figcaption><strong>How close does each step point to the true gradient?</strong> Each dartboard shows recent single-step estimates around the true gradient (navy). Weight perturbation is close to random, Dust is centred but noisy, and Apical Dust is centred with less spread. Raise K to tighten both. The curves are calibrated so Dust's per-step cosine at K = 16 matches the 0.26 measured on MLP layers, Apical's variance is set to the measured 2× population equivalence, and the weight-perturbation board assumes about 10⁴ parameters per activation dimension.</figcaption>
</figure>

**Setup**

- **Dataset:** character-level Tiny Shakespeare (65 symbols), 90/5/5 train/val/test split ([Karpathy, 2015](#ref-karpathy2015)).
- **Model architecture:** 2-layer, 128-width, 4-head GPT-style Transformer (context length 64).
- **Training parameters:** SGD with momentum 0.9, 8 sequences (512 tokens) per step for 1,000 steps.
- **Population sizes evaluated:** K = 16, 64, 256 across 3 random seeds.
- **Metric:** test loss (nats per character) at the best validation checkpoint.

**Results**

<div class="ft-table-wrap">
<table class="ft-table">
  <thead><tr><th>Method</th><th>K = 16</th><th>K = 64</th><th>K = 256</th></tr></thead>
  <tbody>
    <tr><td><i style="background:var(--ft-dust)"></i>Original Dust baseline</td><td>2.510 ± 0.006</td><td>2.488 ± 0.010</td><td>2.473 ± 0.001</td></tr>
    <tr class="ft-hl"><td><i style="background:var(--ft-apical)"></i>Apical Dust (mine)</td><td>2.498 ± 0.004</td><td>2.478 ± 0.004</td><td>2.473 ± 0.001</td></tr>
    <tr><td>Apical minus Dust (paired seeds)</td><td>−0.012 (3 of 3)</td><td>−0.010 (3 of 3)</td><td>−0.001 (2 of 3)</td></tr>
    <tr><td><i style="background:var(--ft-true)"></i>Exact backpropagation</td><td>2.394 ± 0.007</td><td>-</td><td>-</td></tr>
  </tbody>
</table>
</div>

<figure class="ft-fig">
  <div class="ft-card" data-ft="ladder"></div>
  <figcaption><strong>The population ladder.</strong> Test loss from the table, with error bars. Apical Dust beats Dust in every seed pair at K = 16 and 64, and the advantage is gone by K = 256, where raw noise averages out on its own. Read across from Apical at K = 16 to the Dust curve and it lands near K = 33. Toggle the fixed-Dust runs from the summary at the end.</figcaption>
</figure>

The initial naive implementation incurred GPU synchronization bottlenecks during CPU matrix inversion. Fixing host-device bottlenecks by keeping iterative online ridge regression directly on the GPU reduced execution overhead to match plain Dust:

- **Throughput overhead:** Apical Dust step times were only 1.04x to 1.07x plain Dust across K = 16, 64, 256.
- **Sample efficiency gain:** at K = 16, Apical Dust achieves the loss performance of plain Dust running at K = 33 (about 2x effective sample efficiency).
- **Diminishing returns at high K:** by K = 256, raw random perturbations naturally average out across tokens, causing the control variate advantage to fade as predicted.

For each neural module, Apical Dust maintains an online linear feedback matrix, which predicts module output error vectors directly from the network's token output error vector. This is derived through zeroth-order logit perturbation at the cost of a single additional cross-entropy evaluation. This matrix is updated with forward passes with <span class="ft-def" tabindex="0">ridge regression<span class="ft-pop" role="tooltip">Linear regression with a penalty on large weights. Unlike plain least squares, it overfits less to noisy targets, which matters here because the targets are Dust's own noisy estimates (Hoerl and Kennard, 1970).</span></span>, to fit it against Dust's noisy estimates.

But directly replacing gradient estimates with top-down feedback predictions introduces bias whenever a linear map fails to capture non-linear network dynamics. So, to work around the optimization corruption, I structured the feedback signal as an unbiased control variate to make the estimate more precise.

<figure class="ft-fig">
  <div class="ft-card" data-ft="cv"></div>
  <figcaption><strong>A control variate shrinks the noise, not the target.</strong> A toy two-dimensional picture. Dust's estimates (teal) scatter around the true gradient. Apical Dust's (magenta) scatter only by the part of the gradient the feedback map fails to predict, so a better map shrinks the cloud while it stays centred on the same point. At the default the variance halves, which is what the measured result says: Apical at K = 16 performs like Dust at K ≈ 33.</figcaption>
</figure>

Specifically, the algorithm I used was to predict the expected output error using top-down linear feedback, then adjust the perturbed reward signals, then estimate the residual from perturbation draws, and then add the prediction back. This provides a mathematical guarantee of unbiasedness, since the expected value of the stochastic perturbation correction term cancels out the linear prediction.

$$
\begin{aligned}
r'(t) &= r(t) + \sigma \, \big\langle \hat g_{\text{pred}}(t),\, a(t) \big\rangle \\
\hat g(t) &= \hat g_{\text{pred}}(t) - \frac{1}{K\sigma} \sum_{k=1}^{K} r'_k(t)\, a_k(t)
\end{aligned}
$$

<figure class="ft-fig">
  <div class="ft-card" data-ft="unbiased"></div>
  <figcaption><strong>Unbiased for any feedback map.</strong> Two running averages. Trusting the feedback prediction alone (pink) converges to wherever the prediction points. The control variate (magenta) adds a noisy correction whose average is exactly what the prediction got wrong, so it converges to the true gradient however wrong the map is. Turn the map further off and only the noise grows, never the bias.</figcaption>
</figure>

## Telling noise from bias

Obviously, my findings are limited in that they are from small-scale models. But to extrapolate this to scaled pretraining benchmarks like the Noise speedrun ([Q Labs, 2026](#ref-noise)), I want to first discuss how non-differentiable gradient estimators are evaluated during hyperparameter screening. While my experiments were in a small transformer with 64 context length, these results regarding the estimator bias will become severely magnified when scaling to 37.7M-parameter models operating on 2,048-token context lengths. In deeper context windows, the <span class="ft-def" tabindex="0">truncation bias<span class="ft-pop" role="tooltip">When a perturbation at one token is only credited with a limited window of later losses, its influence on every token after that window is dropped. The error points the same way every step, so it is bias, not noise, and longer contexts drop more of it.</span></span> in token credit assignment expands non-linearly.

**I noticed another issue with the standard practice in zeroth-order optimization of shortlisting parameters by measuring per-step cosine similarity against exact backpropagation gradients on a single data batch. Per-step cosine alignment exhibits a diagnostic paradox by failing to decouple zero-mean stochastic noise from persistent directional estimator bias. Single-batch cosine alignment rewards modifications that trade random variance for structured bias. For example, applying precision-weighted feedback ([Feldman and Friston, 2010](#ref-feldman2010)) to an MLP layer raised single-batch cosine similarity from 0.26 to 0.78 at K = 16, yet trained +0.044 nats worse in actual training runs.**

Let's revisit the optimizer interaction, as Dust shows that the mathematical impact of estimator bias depends on optimizer state dynamics. SGD averages out zero-mean gradient noise step-over-step, and on the 37.7M-parameter Noise benchmark, **Dust trained with SGD closely matches backpropagation with a minimal gap of 0.051!** But when trained with the Adam optimizer ([Kingma and Ba, 2015](#ref-kingma2015)) (optimized for momentum and context, the most popular approach for neural networks to converge faster), backprop reached 3.769 while plain Dust stalls at 4.167, demonstrating a wider performance gap.

So, how can we reliably decouple zero-mean stochastic noise from persistent directional bias? One simple way is with the Averaging Test™. My procedure is as follows:

1. Fix a single batch of training data.
2. Generate N independent gradient estimates using the non-differentiable estimator.
3. Compute the mean of the N estimates and calculate its cosine similarity against the exact backpropagation gradient.

<figure class="ft-fig">
  <div class="ft-card" data-ft="averaging"></div>
  <figcaption><strong>The Averaging Test, animated.</strong> Reused from the earlier version of this post. On one batch the biased feedback-weighted update (pink) often points closer to the true gradient than the unbiased control variate (magenta). Average more batches and it flips: the control variate converges onto the gradient while the biased average stays locked at an angle. Vectors are schematic; the backwards ranking is the measured result.</figcaption>
</figure>

While unbiased estimators steadily approach 1 as N tends to infinity, biased estimators plateau below this. This plateau height quantitatively isolates systematic bias in a few hundred estimates because averaging treats the two kinds of error differently. The average of N estimates equals the true gradient plus the bias plus a noise term. The noise is fresh on every draw, so it shrinks as 1/√N. The bias is the same on every draw, so it doesn't shrink at all. By N = 256 the noise has fallen to 1/16 of its size in a single estimate, so almost all of the remaining gap below cosine 1 is bias. The test needs only one fixed batch and one backprop gradient as the reference, so it runs in minutes. A full training run would take hours and would mix bias and noise together in the final loss.

## Where Dust's bias hides

Using this Averaging Test across the transformer layer types revealed interesting metrics about Dust, where I could pinpoint the token embedding truncation bias. Queries, attention outputs and the MLPs achieved a cosine plateau of ~0.98, while keys and values reached plateaus of ~0.88. But the token embeddings stalled with a plateau of 0.71.

<figure class="ft-fig">
  <div class="ft-card" data-ft="plateau"></div>
  <figcaption><strong>The embedding stalls first.</strong> The Averaging Test per layer type. Plateau heights are measured; the curve shapes leading up to them are schematic. Give the embeddings future-token credit to watch their plateau rise from 0.71 to 0.78.</figcaption>
</figure>

Looking into the original Dust architecture, Dust originally assigned gamma = 0 for token embeddings, which credited an embedding jitter only for its immediate token loss. But token embeddings also flow into the residual stream and influence later tokens through attention. When I gave embeddings future-token credit by setting gamma = 0.9, the Averaging Test plateau rose from 0.71 to 0.78.

## Summary and next steps

Wow, that was a lot! To sum the results:

- **Original Dust baseline:** 2.473 nats/char at K = 256.
- **Attention per-head credit alone (K = 16):** degrades loss to 2.529 nats/char due to added per-estimate variance.
- **Future embedding credit (γ = 0.9):** lowers loss to 2.446 nats/char (K = 256).
- **Fixed Dust (combined fixes):** achieves 2.452 nats/char at K = 64 and 2.443 nats/char at K = 256, closing ~38% of the gap to exact backpropagation (2.394 nats/char).
- **Apical control variate on fixed Dust (K = 16):** reaches 2.489 nats/char, matching original Dust at K = 64 (2.488 nats/char) with a quarter of the population draws.

Moving forward, there are several promising directions to build upon these results. First, I plan to use the Averaging Test to systematically audit credit-assignment bias across individual transformer layers, pinpointing exactly where gradient estimates degrade and how to correct them. Additionally, expanding the use of apical control variates can significantly boost sample efficiency, enabling accurate optimization even with small virtual population sizes. Finally, I aim to investigate whether eliminating directional estimator bias allows zeroth-order approaches to remain stable and close the performance gap under second-moment optimizers like Adam, ultimately bringing backprop-free transformer pretraining closer to practical, large-scale deployment.

I'd love to hear <span class="ft-def" tabindex="0">feedback<span class="ft-pop" role="tooltip">No pun intended.</span></span> on this project, so I can <span class="ft-def" tabindex="0">learn<span class="ft-pop" role="tooltip">Pun intended.</span></span>! Thanks for reading :)

## References

<ol class="ft-refs">
  <li id="ref-lillicrap2020">Lillicrap, T. P., Santoro, A., Marris, L., Akerman, C. J., and Hinton, G. (2020). Backpropagation and the brain. <em>Nature Reviews Neuroscience</em>, 21, 335–346.</li>
  <li id="ref-lillicrap2016">Lillicrap, T. P., Cownden, D., Tweed, D. B., and Akerman, C. J. (2016). Random synaptic feedback weights support error backpropagation for deep learning. <em>Nature Communications</em>, 7, 13276.</li>
  <li id="ref-nokland2016">Nøkland, A. (2016). Direct feedback alignment provides learning in deep neural networks. <em>NeurIPS</em>.</li>
  <li id="ref-rao1999">Rao, R. P. N., and Ballard, D. H. (1999). Predictive coding in the visual cortex: a functional interpretation of some extra-classical receptive-field effects. <em>Nature Neuroscience</em>, 2, 79–87.</li>
  <li id="ref-whittington2017">Whittington, J. C. R., and Bogacz, R. (2017). An approximation of the error backpropagation algorithm in a predictive coding network with local Hebbian synaptic plasticity. <em>Neural Computation</em>, 29, 1229–1262.</li>
  <li id="ref-fremaux2016">Frémaux, N., and Gerstner, W. (2016). Neuromodulated spike-timing-dependent plasticity, and theory of three-factor learning rules. <em>Frontiers in Neural Circuits</em>, 9, 85.</li>
  <li id="ref-larkum2013">Larkum, M. (2013). A cellular mechanism for cortical associations: an organizing principle for the cerebral cortex. <em>Trends in Neurosciences</em>, 36, 141–151.</li>
  <li id="ref-guerguiev2017">Guerguiev, J., Lillicrap, T. P., and Richards, B. A. (2017). Towards deep learning with segregated dendrites. <em>eLife</em>, 6, e22901.</li>
  <li id="ref-lansdell2020">Lansdell, B. J., Prakash, P. R., and Kording, K. P. (2020). Learning to solve the credit assignment problem. <em>ICLR</em>.</li>
  <li id="ref-mccloskey1989">McCloskey, M., and Cohen, N. J. (1989). Catastrophic interference in connectionist networks: the sequential learning problem. <em>Psychology of Learning and Motivation</em>, 24, 109–165.</li>
  <li id="ref-lopezpaz2017">Lopez-Paz, D., and Ranzato, M. (2017). Gradient episodic memory for continual learning. <em>NeurIPS</em>.</li>
  <li id="ref-krizhevsky2009">Krizhevsky, A. (2009). Learning multiple layers of features from tiny images. Technical report, University of Toronto.</li>
  <li id="ref-he2016">He, K., Zhang, X., Ren, S., and Sun, J. (2016). Deep residual learning for image recognition. <em>CVPR</em>.</li>
  <li id="ref-dust">Dahal, Mandal, Gülbahar, and Vegesna (2026). Dust: pretraining transformers without backpropagation. Q Labs. <a href="https://qlabs.sh/research/dust">qlabs.sh/research/dust</a></li>
  <li id="ref-noise">Q Labs (2026). The Noise speedrun, a backprop-free pretraining benchmark.</li>
  <li id="ref-salimans2017">Salimans, T., Ho, J., Chen, X., Sidor, S., and Sutskever, I. (2017). Evolution strategies as a scalable alternative to reinforcement learning. arXiv:1703.03864.</li>
  <li id="ref-sarkar2025">Sarkar, B., et al. (2025). Evolution strategies at the hyperscale (EGGROLL). arXiv preprint.</li>
  <li id="ref-fiete2006">Fiete, I. R., and Seung, H. S. (2006). Gradient learning in spiking neural networks by dynamic perturbation of conductances. <em>Physical Review Letters</em>, 97, 048104.</li>
  <li id="ref-werfel2003">Werfel, J., Xie, X., and Seung, H. S. (2003). Learning curves for stochastic gradient descent in linear feedforward networks. <em>NeurIPS</em>.</li>
  <li id="ref-hoerl1970">Hoerl, A. E., and Kennard, R. W. (1970). Ridge regression: biased estimation for nonorthogonal problems. <em>Technometrics</em>, 12, 55–67.</li>
  <li id="ref-feldman2010">Feldman, H., and Friston, K. J. (2010). Attention, uncertainty, and free-energy. <em>Frontiers in Human Neuroscience</em>, 4, 215.</li>
  <li id="ref-kingma2015">Kingma, D. P., and Ba, J. (2015). Adam: a method for stochastic optimization. <em>ICLR</em>.</li>
  <li id="ref-karpathy2015">Karpathy, A. (2015). The unreasonable effectiveness of recurrent neural networks (char-rnn and the Tiny Shakespeare dataset). Blog post.</li>
</ol>

<script src="/assets/js/forward-training.js?v=3" defer></script>
