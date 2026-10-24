---
layout: post
title: "Apical Dust: Brain-inspired Backprop-Free Pretraining"
date: 2026-10-12
tag: "Guide"
section: technical
rank: 4
math: true
thumb: /assets/images/apical-dust/fig3.svg
permalink: /writing/brain-like-learning/
redirect_from:
  - /thinking/brain-like-learning/
  - /thinking/apical-dust/
  - /thinking/brain-like-algorithms/
  - /thinking/brain-inspired-algorithms/
  - /thinking/backprop-free-pretraining/
  - /thinking/engram-continual-learning/
excerpt: "The brain learns continually from a forward process, which raises two questions I tested. Whether a local learning rule forgets less, and whether borrowing more cortical machinery trains a network better in place of backpropagation. On a fair comparison rehearsal drives retention while locality adds almost nothing. And a learned apical-feedback pathway buys back population in a backprop-free learner, while exposing two ways Dust is mistuned."
---

**TL;DR.** The brain does not use backpropagation, and instead learns continually from a forward process. So, does a biologically plausible, local learning rule retain more than backpropagation? On class-incremental Split-CIFAR-10 with a fair comparison, the answer is no. Once I match each rule to backpropagation at the same learning accuracy, **locality's retention margin is 0.21 points, while a plain replay buffer adds 10.6**, so rehearsal accounts for the gain. But does borrowing more of the brain's machinery train a backprop-free network better? A little. I added a learned top-down feedback pathway, modeled on cortical apical dendrites, to Q Labs' Dust, the first zeroth-order method that pretrains transformers about as well as backpropagation. This pathway acted as an unbiased control variate, and gave **the same benefit as a population 1.6 to 2 times larger at small random sample counts**, at about the same wall-clock cost, though the gain faded by 256 draws. Two takeaways matter beyond the biology. **I cannot rank gradient estimators by per-step cosine similarity to the backpropagation gradient when their bias differs**, and Dust struggles to train its token embeddings, because an embedding needs credit from future tokens that shape later predictions and Dust delivers that credit weakly. Backpropagation still performs better at this scale.

**Code.** The apical-feedback follow-up is at [github.com/saanviiyer/apical-dust](https://github.com/saanviiyer/apical-dust).

## The brain learns from local signals

Approaching model training from a neuroscience angle lets us optimize artificial networks with the operating principles of our biological ones. The benefit of understanding how the brain learns is in evolution: our brains have evolved over millions of years, and as the most capable learners we know, many of the open problems in AI, catastrophic forgetting, continual learning, pretraining efficiency, are ones biology already handles inside a three-pound organ.

After reading *Backpropagation and the Brain* last summer, it was clear the brain learns without backpropagation. A biological circuit physically cannot run a backward pass that reuses the exact transpose of its forward weights, called the **weight-transport problem**, and it cannot thread a global error signal precisely backward through every layer. Biological synapses update from local quantities, roughly presynaptic activity, postsynaptic activity, and a neuromodulatory third factor that stands in for reward or surprise. That is **three-factor plasticity**, and it is local in both space and time.

**The cortex learns forward.** Backpropagation needs two things a biological circuit lacks. It needs the backward path to use the exact transpose of the forward weights, the weight-transport problem, and it needs a global error signal threaded precisely backward through every layer. Biological synapses update from local quantities, roughly presynaptic activity, postsynaptic activity, and a neuromodulatory third factor that stands in for reward or surprise. That is three-factor plasticity, and it is local in both space and time.

A fourth ingredient that the brain uses, and machine learning rarely copies, is top-down feedback. Bottom-up input lands on the basal dendrites near the cell body, and top-down feedback from higher areas lands on a separate part of the neuron, the apical dendrite up in the tuft. Guerguiev, Lillicrap and Richards built a learning rule on this anatomy, and their model treats the apical signal as a local teaching signal that tells the cell which way to change. Another line of work asks where errors originate at the apical dendrites when top-down feedback mismatches the activity the cell predicted. I come back to this later.

This gap is usually framed as a problem for biological plausibility. It is just as interesting for machine learning, and it splits into two questions. If the brain learns continually from a forward process and a small sample of past experience, then its machinery is a candidate solution to catastrophic forgetting, the failure where a network trained on a new task overwrites the weights that encoded the old one. And if a backprop-free rule can be pushed to train as well as backpropagation, that can dramatically change model training. First I test the forgetting question, then the training question.

The appealing version of the forgetting question is that locality itself buys retention. A backpropagation update couples every weight to every other through the global error, so learning a new task can move any weight relevant for an old one. A local rule moves a weight only from signals available at that synapse, so the rule should disturb unrelated structure less and forget less. Researchers usually test this claim with feedback alignment, direct feedback alignment, and predictive coding, and some reports credit all three rules with forgetting less than backpropagation.

The trouble with that literature is a confound that is easy to miss. **A rule that learns each new task less well also has less to forget.** If a method only reaches 70% on the new task where backpropagation reaches 90%, it has written less into the shared weights, so of course it overwrites less of the old task. Comparing forgetting across methods is valid only once you hold learning fixed. I was suspicious going in, because in most of the papers I read the local rule arrived bundled with something else, like sparsity or replay, and the write-ups credited the retention to locality anyway.

Each of these three rules assigns credit in a different way, and each avoids the weight-transport problem in backprop.

- **Feedback alignment** keeps the forward pass and sends the error backward through fixed random weights in place of the transpose of the forward weights.
- **Direct feedback alignment** goes further and sends the output error straight to each hidden layer through its own fixed random connection, skipping the layer-by-layer backward chain.
- **Predictive coding** has each layer try to predict the activity of the layer below it, and the local mismatch between prediction and actual activity drives learning, which under some conditions approximates backpropagation using only local signals.

All three are biologically motivated, and reports credit all three with helping on forgetting. The rest of this half asks whether that help holds up once the comparison is fair.

## A fair test that separates forgetting from learning

I first built a measuring instrument. I weakened backpropagation across eleven settings that vary only epochs and learning rate, holding out any mechanism that protects old tasks. I measured backward transfer, the change in accuracy on earlier tasks after training on later ones, against how well the network learned the new task. The task is class-incremental Split-CIFAR-10, five tasks of two classes each with a single growing head and no task labels at test time, the hard version of the problem, with Split-CIFAR-100 and Split-FashionMNIST as replications. Every arm trains the same two-layer network, so the learning rule is the only thing that changes.

Within each seed, **backward transfer turned out to be almost a deterministic function of learning accuracy, with an $$R^2$$ of 0.995.** Holding out each setting in turn, that relationship predicted backward transfer to a mean absolute error of 1.09 points over 224 held-out predictions. I scored each rule against backpropagation at the same learning accuracy, tuned the baseline as hard as the rule, and corrected each remaining difference for the small accuracy gap left over.

<figure class="ba-fig">
  <div class="ba-wrap"><canvas id="ba-plot"></canvas></div>
  <div class="ba-controls">
    <button id="ba-play" type="button">pause</button>
    <input id="ba-slider" type="range" min="62" max="90" value="90" aria-label="Accuracy at which the baseline is compared">
    <span class="ba-readout">apparent edge of locality <b id="ba-edge">+4.3</b> pts</span>
  </div>
  <figcaption><strong>The fair comparison.</strong> Backward transfer falls along one curve as a network learns each task better, so comparing a local rule against backpropagation trained to a higher accuracy makes the rule look like it forgets less. Slide the baseline down to the rule's own learning accuracy and the apparent edge collapses to the measured +0.21 points, while replay stays about 10.6 points above the curve. Axes are schematic. The matched edge (+0.21) and replay (+10.6) are measured on class-incremental Split-CIFAR-10.</figcaption>
</figure>

Matched this way, the bio-plausible rules stop looking special. Feedback alignment differed from backpropagation by -0.08 points, with a 95% interval of [-0.21, +0.05], and direct feedback alignment by -0.11, [-0.28, +0.06]. Both intervals contain zero, so **both rules forget at about the backpropagation rate once the baseline is tuned fairly.** Predictive coding retained 0.21 points more, [+0.11, +0.31], p = 0.001. I had said ahead of time that a local rule retaining better at matched learning would refute my hypothesis, so I report predictive coding as a refutation, and I note that 0.21 points is about a fifth of the instrument's own error and that the gap correction alone flips its sign. I read this as the locality advantage being an artifact of a baseline that was allowed to learn more. **Locality of credit assignment leaves forgetting about where it was.**

![Backward transfer against learning accuracy on Split-CIFAR-10 and Split-CIFAR-100, where local rules sit on the backpropagation curve and replay sits above it](/assets/images/engram-continual-learning/locality.png)

**Figure 1.** Backward transfer against learning accuracy on Split-CIFAR-10 and Split-CIFAR-100. The backpropagation ladder traces the trade-off between learning a new task and forgetting earlier ones, so local rules that fall on the curve forget about as much as backpropagation at a matched learning accuracy, and only replay sits above it. Locality moves you along the trade-off. It does not shift the trade-off itself.

Forgetting can be reduced with replay, which I added as a positive control. It rehearses a small sample of earlier data while learning the new task, and **it improved retention by 10.6 points, [+10.0, +11.1], about fifty times the predictive-coding effect.** Rehearsal accounts for the gain, which matches a plain reading of the brain. The hippocampus replays experience during rest and sleep, and replay is among the most clearly established biological mechanisms for retention.

![Departure from the null for each learning rule, with and without replay, where the rules sit within the null band and every replay arm is about ten points above it](/assets/images/engram-continual-learning/neurreps.png)

**Figure 2.** Departure from the null for each learning rule, with and without replay. Each credit-assignment rule sits inside the null band, the scatter expected from rules that do nothing special for retention, while adding replay lifts every arm about ten points above it. The left panel shows the representational geometry differs between rules, but that difference does not become a difference in forgetting.

One limit here. Split-CIFAR-10 with a growing head keeps little to begin with, about 0.7 points, so the setup sits near a floor where little forgetting remains to prevent. I rescored within each task's own classes to lift the measurement off that floor, and the ordering held, with replay still ahead and the local rules still matched, although the instrument then resolved retention only to about five points. Split-FashionMNIST was too noisy to serve as a quantitative instrument, at 12.29 points of held-out error, so I withhold retention differences from that dataset. The defensible scope covers Split-CIFAR-10 and Split-CIFAR-100 under this protocol.

The conclusion from the continual-learning side is a null, worth stating cleanly because the opposite is so often assumed. **A learning rule that assigns credit locally, in a brain-like way, leaves catastrophic forgetting about where it was.** Local describes where a rule gets its signals, not a retention mechanism. This matters past neuroscience, because a deployed model that keeps training through fine-tuning or reinforcement learning from human feedback can erase abilities and safety behaviors it held before, which gives catastrophic forgetting a deployment address. Any method that claims to protect earlier behavior faces one first question: did the comparison hold learning of the new task fixed against backpropagation?

## A more constructive question

A null result is a slightly unsatisfying place to end, so I changed the framing. The new question asks whether adding a piece of cortical machinery to a backprop-free learner helps it train better in the first place, and Q Labs' Dust gives me the testbed. Dust is the first zeroth-order method that competes with backpropagation at pretraining transformers. It builds its rule from noise in the activations, a reward signal, and a local update, the same three ingredients as three-factor plasticity, running entirely on the forward pass. Some details of Dust's internals, and some benchmark numbers in this section, come from meeting notes I am still verifying, and I flag the unverified numbers where they appear. This research is independent and unaffiliated with Q Labs.

Backprop-free rules are worth taking seriously because of backpropagation's limits. Backpropagation needs continuous differentiable operations, which excludes discrete jumps, open loops, and external program execution. Q Labs describes backpropagation as an efficiency crutch that imposes rigid constraints on scaled compute, and proposes forward-pass search-based learning with an analogy to AlphaGo Zero. I treat that view of backpropagation as Q Labs' framing, something still short of established fact.

More specifically, Dust works by node perturbation, injecting Gaussian noise into the output of every linear layer, independently at each token, and rewarding each token's noise by how much that noise lowered the loss. Older evolutionary strategies such as AGReL perturb weights instead, and weight perturbation suffers extreme variance across billions of parameters. Each token acts as one member of a population, so a single forward pass tests thousands of perturbations at once, free of a backward pass and of weight transport, which is why Dust is competitive at pretraining where other zeroth-order methods stall. The reward-weighted noise estimates the error at each layer's output, and the outer product of that error with the layer's input gives the weight gradient, the same update backpropagation forms. Dust assigns credit through Centered Loss Reduction, which subtracts the baseline mean loss of the perturbed variations, with a discount factor γ for delayed multi-token credit. The cost is variance, because with K draws and a d-dimensional layer output the noise in the per-token estimate scales roughly with d/K. Dust reduces that noise by increasing the population, which costs compute, and I wanted to know whether a biological mechanism could remove some of the noise more cheaply.

Their follow-up, the Noise speedrun, argues that another 1,000-fold gain will need credit assignment, optimizers and architectures designed together. This post is a small, independent contribution to the credit-assignment and optimizer parts of that program.

The speedrun numbers set the scale of what Dust does and where it stalls. It evaluates a 37.7M-parameter GPT model on 10M tokens from FineWeb, with zero backward passes allowed. Dust reached a record validation loss of 4.167 in 1.76 hours on 8 H100 GPUs. With SGD the gap to backprop was 0.051, so **Dust matches backpropagation closely under SGD, then stalls once Adam and a learning-rate cooldown enter.** With Adam plus a learning-rate cooldown backprop improved to 3.769 while **Dust stalled, widening the gap to 0.398.** The proposed mechanism is that per-step cosine similarity checks mask a systematic estimator bias, since memoryless SGD averages out zero-mean noise while Adam's momentum accumulates directional bias across steps and drives optimization off course. That mechanism matches the bias pattern I found at small scale, which is one reason I focus on the averaging test below. These benchmark numbers are among those I am still verifying, so they need checking before anyone leans on them.

I added one more cortical ingredient, top-down feedback onto apical dendrites. Each layer gets a learned linear prediction of its own output error from the network's output error, estimated from forward passes only, so the method stays entirely on the forward pass. I fit the learned feedback map by ridge regression against true output errors, and I use the map as an unbiased control variate. The next section states the method in full. The feedback matters most at small populations, 16 draws per token, and becomes redundant by 256 draws, where raw noise averages out on its own.

## Feedback onto the apical dendrite

Cortical pyramidal neurons receive bottom-up input on their basal dendrites. Top-down feedback from higher areas arrives on a separate apical dendrite. Several models of cortical learning treat the apical signal as a local, approximate error that tells each neuron which way to change (Guerguiev, Lillicrap and Richards, 2017). The signal stays approximate, so the brain must learn it somehow. Lansdell, Prakash and Kording (2020) proposed that the brain learns its feedback weights from noise. Neurons jitter, a neuromodulatory reward reports the outcome, and the correlation between the two trains the feedback pathway. Dust already has the noise and the reward, but it lacks the pathway.

Apical adds it, and for every module $$m$$ I keep a feedback matrix $$B_m$$ that maps the network's output error at a token, $$e_t$$, to a predicted error at the module's output.

$$
\begin{aligned}
\hat g_{\text{pred}}(t) &= B_m\, e_t \\
e_t &= \text{Dust estimate of } \partial \mathcal{L} / \partial\, \text{logits}_t \quad \text{(jitter the cached logits; no derivatives)} \\
B_m &= \text{EMA ridge regression of Dust's estimates } \hat g(t) \text{ on } e_t
\end{aligned}
$$

Every step stays zeroth-order, so I estimate the output error by perturbing the logits, which costs only one more cross-entropy evaluation. I fit the feedback weights by regressing Dust's noisy estimates on $$e_t$$. The noise in those estimates is independent of $$e_t$$, so it averages out of the fit.

A prediction of the gradient can enter the update in three ways. The ways differ in how much they trust the prediction.

1. **Feedback only.** Update with $$B_m e_t$$ alone, as in learned feedback alignment (Lillicrap et al., 2016; Nøkland, 2016). Noise trains the pathway, and the prediction alone moves the weights. The variance is low, and the update is biased wherever a linear map from the output error falls short of the true gradient.
2. **Control variate (Apical).** Remove the part of each reward that the feedback already explains, estimate only the remainder from noise, and add the prediction back.

   $$
   \begin{aligned}
   r'(t) &= r(t) + \sigma \, \big\langle \hat g_{\text{pred}}(t),\, a(t) \big\rangle \\
   \hat g(t) &= \hat g_{\text{pred}}(t) - \frac{1}{K\sigma} \sum_{k=1}^{K} r'_k(t)\, a_k(t)
   \end{aligned}
   $$

   In expectation, the correction term cancels the prediction, so the estimate stays unbiased for any $$B_m$$. A poor feedback map therefore leaves the expected update unharmed. Its noise now scales with the size of the remainder $$g - \hat g_{\text{pred}}$$ in place of $$g$$.
3. **Precision-weighted.** Shrink the remainder toward the prediction according to its estimated reliability. Predictive-coding models of cortex weigh prediction errors by precision in this way (Feldman and Friston, 2010). I estimate the reliability online from how well the two halves of the population agree.

## Setup

Every run fits on a laptop GPU.

- Data: character-level tiny Shakespeare (65 symbols), split 90/5/5 into train, validation and test.
- Model: GPT-style transformer with 2 layers, width 128, 4 heads and context 64. Each step uses 8 sequences (512 tokens), for 1000 steps.
- Optimizer: SGD with momentum 0.9 and a constant learning rate. I tuned the rate per method and population on seed 0, over {0.003, 0.01, 0.03, 0.1} at K=16 and 64, and over {0.01, 0.03} at K=256. Each cell then runs three seeds at the tuned rate. A seed fixes the initialization and the data order, so I can pair seeds across methods.
- Metric: test loss at the best validation checkpoint, as in the Dust paper.
- Populations: K = 16, 64 and 256. K counts draws per module per step. Each of the 13 jittered modules gets its own K draws, and the logits get 4K.

This version of Dust is a faithful and simplified reimplementation. It uses one noise scale (σ = 0.05) for every layer, and its layer norms use a fixed gain. In the first version, I credited attention keys and values with a discounted sum of future token losses (γ = 0.9). The paper scores them by alignment with the error at the attention output, and Result 4 replaces my rule with the paper's. Absolute numbers differ from the paper's.

I first measured the per-step cosine between each estimate and the backprop gradient on the same batch, at a partly trained checkpoint, the same alignment analysis the Dust paper uses. By this measure the feedback looks like a clear win. At K=16, **the precision-weighted estimate on the MLP input layer reaches 0.78, higher than Dust reaches at K=256.** Feedback alone does almost as well on most layers, and the unbiased control variate falls between the two. I read Figure 3 at first as strong support for the feedback, and Result 2 breaks that reading.

<p class="fig-legend"><span style="color:#7059AE">&#9679;</span> Dust &nbsp; <span style="color:#2D5C9E">&#9679;</span> Apical (unbiased) &nbsp; <span style="color:#B8433B">&#9679;</span> Precision-weighted &nbsp; <span style="color:#9A7516">&#9679;</span> Feedback only</p>

<img src="/assets/images/apical-dust/fig1.svg" alt="Per-step cosine to backprop against population for four estimators, across MLP input, attention output, and keys. The precision-weighted estimate is highest on the MLP, Dust lowest.">

**Figure 3. Per-step alignment with backprop.** Cosine between each estimated weight gradient and the backprop gradient on the same batch, against population, averaged over layers of each type and 4 batches. Checkpoint is 300 backprop steps. Feedback fitted for 40 steps before measuring.

Training disagreed with Figure 3, because the estimate with the best per-step cosine trained the worst. At K=16, **the precision-weighted version trained worse than plain Dust, even with about three times the per-step cosine.** Per-step cosine mixes two kinds of error. Noise is fresh every step, and momentum averages it out over roughly ten steps. Bias points the same way every step, so momentum adds the bias up.

I separated the two kinds of error by fixing one batch and averaging more and more independent K=16 estimates. The cosine of an unbiased estimator approaches 1 as the average grows. A biased estimator levels off below 1, at a height set by its bias. Dust and the control variate keep rising, and on the values layer both reach 0.92 at 256 estimates, while the feedback-based estimates stall. On the keys layer they barely move, 0.14 for feedback only and 0.37 for precision-weighted, against 0.91 for Dust.

The keys show the cause, because later tokens read the key at token t, so the true gradient of that key depends on errors that occur after t. The feedback pathway sees only the error at t, so it misses that credit. The same limit applies, less severely, to values, and to any gradient that depends on a token's own Jacobian, which a single linear map averages away.

<p class="fig-legend"><span style="color:#7059AE">&#9679;</span> Dust &nbsp; <span style="color:#2D5C9E">&#9679;</span> Apical (unbiased) &nbsp; <span style="color:#B8433B">&#9679;</span> Precision-weighted &nbsp; <span style="color:#9A7516">&#9679;</span> Feedback only</p>

<img src="/assets/images/apical-dust/fig2.svg" alt="Cosine to backprop of the mean of N averaged K=16 estimates on one fixed batch. Dust and Apical keep rising toward 1; feedback-only and precision-weighted level off, worst on the keys layer.">

**Figure 4. Averaging separates noise from bias.** Cosine to the backprop gradient of the mean of N independent K=16 estimates on a single fixed batch. Unbiased estimators (Dust, Apical) keep rising toward 1. Biased ones (feedback only, precision-weighted) level off. The embedding layers (not shown) level off near 0.7 for every method. Result 4 traces that plateau to Dust's credit rule for embeddings.

This result bears on tuning Dust. The Dust paper shortlists noise scales and credit decays by their cosine to backprop on a single batch, then lets training choose among them. **A single-batch cosine rewards any change that trades noise for bias.** The averaging curve costs a few hundred extra estimates on one batch, and it shows the bias as the height where the curve levels off. I would use that height as the screen. Readers can run the same check more widely by measuring cosine similarity across sample sizes from 1 to 4,096 and confirming whether a persistent bias plateau appears.

## The statistic that ranks estimators backwards

This finding changes a decision the Dust team makes in practice, and I rank it the most useful one in this essay. The Dust paper shortlists hyperparameters, including noise scales and credit decays, by cosine similarity to the backpropagation gradient on a single batch, and training then chooses among the shortlisted candidates. **A single-batch cosine rewards any change that trades noise for bias.** My feedback-weighted estimator triples per-step cosine on the MLP, from 0.26 to 0.78 at $$K=16$$, and **still trains worse by 0.044 nats**, because its error points the same way every step and momentum sums that bias across training. Averaging gives the correct ordering at a modest cost: I average each estimator across many independent estimates on one batch, and I read the bias from the height where the curve levels off.

<figure class="cm-fig">
  <div class="cm-wrap"><canvas id="cm-plot"></canvas></div>
  <div class="cm-controls">
    <button id="cm-play" type="button">pause</button>
    <input id="cm-slider" type="range" min="1" max="200" value="1" aria-label="Number of batches averaged">
    <span class="cm-readout">averaged cosine to backprop, feedback-weighted <b id="cm-a">0.00</b>, control variate <b id="cm-b">0.00</b></span>
  </div>
  <figcaption><strong>Why single-batch cosine misleads.</strong> Both estimators are noisy, so on one batch the feedback-weighted update (pink) often points closer to the true backprop gradient (grey) than the unbiased control variate (berry). Average the updates over many batches and it flips. The control variate's average converges onto the gradient, while the feedback-weighted average stays locked at an angle, because its error is a systematic bias. Vectors are schematic. The backwards ranking and the averaging fix are the measured result.</figcaption>
</figure>

If single-batch cosine is the filter that picks which estimator or hyperparameter to scale, it will prefer the biased one, which looks aligned every step and quietly accumulates error through momentum. The averaging test costs one extra loop and gives the right ordering.

The same bias story shows up at noise scale in the speedrun numbers above, where the control variate matters most at 16 draws per token and fades by 256 draws.

Kept unbiased, the feedback helps where Dust is noisiest. **Apical has lower test loss than Dust in every seed-paired comparison at K=16 and K=64.** It also varies less across seeds, which is what variance reduction should do, and watching the seed spread shrink made me trust the mechanism more. At K=256 the advantage is gone, and Apical wins 2 of 3 pairs, by -0.001 on average.

| Method | K = 16 | K = 64 | K = 256 |
| --- | --- | --- | --- |
| Dust | 2.510 ± 0.006 | 2.488 ± 0.010 | 2.473 ± 0.001 |
| **Apical (unbiased control variate)** | **2.498 ± 0.004** | **2.478 ± 0.004** | **2.473 ± 0.001** |
| Apical − Dust, paired | -0.012 (3 of 3) | -0.010 (3 of 3) | -0.001 (2 of 3) |
| Precision-weighted | 2.554 ± 0.004 | 2.487 ± 0.007 | not run |
| Feedback only | 2.634 (1 seed) | not run | not run |
| Backprop | 2.394 ± 0.007 | | |

<img src="/assets/images/apical-dust/fig3.svg" alt="Final test loss for each method across K=16, 64, 256. Seed dots with a mean tick, and backprop at 2.394 as a dashed line. Apical sits left of Dust at K=16 and K=64 and ties at K=256.">

**Figure 5. Final test loss across the population ladder.** Dots are seeds, the black tick is the mean, and the dashed line is backprop. Feedback only is left out because it was run on one seed.

<p class="fig-legend"><span style="color:#15202A">&#9644;</span> Backprop &nbsp; <span style="color:#7059AE">&#9679;</span> Dust &nbsp; <span style="color:#2D5C9E">&#9679;</span> Apical (unbiased) &nbsp; <span style="color:#B8433B">&#9679;</span> Precision-weighted</p>

<img src="/assets/images/apical-dust/fig4.svg" alt="Validation loss over 1000 training steps at K=16. Precision-weighted falls behind within the first hundred steps; Dust and Apical track each other below it, backprop lowest.">

**Figure 6. Validation loss during training at K=16**, mean of 3 seeds. The precision-weighted version falls behind within the first hundred steps and never catches up.

To express the K=16 gain as population, I interpolated Dust's loss log-linearly between K=16 and K=64. **Apical at K=16 matches Dust with about 33 draws, roughly twice the population.** Apical closes about 53% of the gap between Dust at K=16 and Dust at K=64.

The control variate substantially reduces variance at small virtual population sizes, for example 16 draws per token, and becomes redundant at large population sizes, for example 256 draws, where raw noise averages out naturally. That matches what I measured.

Equal population can still mean unequal cost, so I timed both methods. In the sweep, my first Apical implementation took about twice as long per run as Dust at K=16. At that price, Dust could double its population and match Apical. Almost all of the overhead was waste. The code repeated a clean forward pass and a logit jitter, computed split-half estimates even when they went unused, and inverted a 65-by-65 matrix that forced a GPU-to-CPU sync every step. The method itself adds one small matrix product per module plus the regression update. That is about 1% of the arithmetic of the perturbed forward passes.

With the waste removed, the median step time of Apical relative to Dust, over three interleaved rounds, was 0.86x at K=16, 1.22x at K=64 and 0.95x at K=256. Other jobs shared the machine, so I read these times as equal within about 20%. The optimized code does the same math with a different random stream. One K=16 run with it reached 2.500, against 2.502 for the original code on the same seed. At K=16 the gain is worth about a doubling of population, which is well above a 20% cost, so **the gain survives matched compute.** My first implementation would have erased it.

The averaging test also locates the remaining bias in Dust itself. On Dust's own estimates, with 1024 independent estimates averaged on one batch, my original Dust reaches cosine 0.98 on queries, attention outputs and the MLP. **It reaches only 0.88 on keys and values and 0.71 on the token embedding.** Two credit rules explain the gap, the first being that my reimplementation credited keys and values with a discounted sum of downstream token losses, which is cruder than the paper's rule, the second that it credited each embedding only for its own token's loss. The Dust paper makes the same choice. As I read its Section 2.3, only keys, values, gates and value embeddings receive credit from future tokens. However, the embedding at token t enters the residual stream, and later tokens read it through attention, so its true gradient includes their losses.

I made two changes. For attention internals I implemented the paper's rule. It jitters queries, keys or values, recomputes only that block's attention output from cached activations, and scores each jitter per head by its alignment with the estimated error at the attention output. Keys and values also get credit from later tokens (γ = 0.97). For embeddings, where the paper stops short of this, I added future-token credit (γ = 0.9). In the averaging test, **keys rise from 0.88 to 0.95 and the token embedding from 0.71 to 0.78**, still climbing at 1024 estimates. Values stay near 0.87, so some bias remains there.

Dust's discount factor γ for delayed multi-token credit, with γ equal to 0.9 in the action plan, is the same family of problem as the embedding fix. Credit has to reach the place and time where it belongs, and the places it misses show up as a stall.

Both changes make each single estimate noisier, so training has to decide. **The embedding credit carries most of the gain.** The attention rule alone hurts at K=16, where its extra noise costs more than the bias it removes. Combined with the embedding credit, it helps at larger populations.

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

I tuned learning rates on seed 0 over {0.01, 0.03} at K=16 and 64, and the fixed variants reuse 0.03 directly at K=256, because that rate won for the fixed variants at K=64 and for the original Dust at K=256. The table reports differences of means pooled across seeds for the combined rows. Against my original Dust, the fixed version lowers test loss by 0.036 at K=64 and 0.030 at K=256, which **closes about 38% of the K=256 gap to backpropagation.** The fixed Dust at K=64 already beats the original Dust at K=256. The ladder still flattens, gaining only 0.009 from K=64 to K=256, so bias still sets the floor.

On the fixed Dust, the feedback pathway gains more at K=16, -0.020 in all three seed pairs, against -0.012 on the original Dust. The averaging test predicts this pattern, because the fixed estimator carries less bias and more noise per step, and a control variate removes noise. In population terms, **the gain equals about 1.6 times the population** on the fixed Dust's steeper ladder. At K=64 the difference is -0.008, with one of three pairs better, which I read as inconclusive. Apical on the fixed Dust at K=16 reaches 2.489, level with the original Dust at K=64 (2.488) at a quarter of the draws.

## What I would test at Dust's scale

My runs cover the low end of Dust's population ladder on a toy task, while the Dust paper runs from K=64 to 16k on FineWeb with models up to 243M parameters. Three checks would show whether these mechanisms carry over. If the Dust team reads two sections of this essay, I want it to be the bias section and this one.

The first check tests the embedding credit, and it costs nothing to try. My context held 64 tokens across 2 layers, and the embedding stalled at 0.71. Longer contexts and more layers let more later tokens read each embedding, so I expect the truncation bias to grow, and the averaging test on one FineWeb batch would show the effect in minutes.

The second check tests the averaging plateau as a tuning screen. The paper's cosine picks one set of candidates and the plateau picks another, and training runs will show which screen picks better candidates.

The third check tests the control variate across the full ladder, where it earns its value at small populations and a compute-bound speedrun lives. A richer feedback map offers the natural extension: a nonlinear map, or a map that also sees future errors for keys and values, keeps the estimate unbiased and can only predict more of the gradient or less.

Three action items remain open. I still need to tune the sequence-level token discount (γ = 0.9), deploy the learned apical feedback map into Noise training scripts to stabilize small-batch variance, and re-evaluate post-correction performance across both SGD and Adam to confirm whether the 0.398 gap closes.

## Limitations

The continual-learning result is scoped to class-incremental Split-CIFAR-10 with a growing head, which sits near a retention floor, and the architectures compared are feedforward convolutional networks, so this speaks to credit-assignment rules under this protocol. A wider-window replication on recurrent or sequential networks is the obvious next step.

The apical result is a demonstration on a specific backprop-free rule at small model scale, covering one small model, one character-level dataset, 512k training tokens and SGD only. Dust's effects appear at much larger scale, and mine may fade there. With three seeds per cell, the improvement at K=16 and 64 is consistent (6 of 6 pairs) but small, between -0.001 and -0.020 per pair. Populations of 16, 64 and 256 only, and Apical on the fixed Dust at 256 remains unrun. I chose the credit decays (γ = 0.97 for keys and values, 0.9 for embeddings) from gradient cosines on one batch, ahead of any training. Timings come from a shared laptop GPU and are accurate to about 20%, the trained results use the first implementation, and I checked the optimized one on one seed only. The feedback map is linear in the current token's output error. Backprop is still ahead at this scale, reaching 2.394 nats against 2.443 for the best Dust at K=256.

Both experiments stop short of a claim about the brain itself. They are claims about what specific brain-inspired mechanisms do inside specific networks, measured against a baseline tuned as hard as the method.

## Acknowledgements

The continual-learning work grew out of the NeuroAI track of the Neuromatch program, where I spent the summer on brain-inspired learning algorithms. It is otherwise independent research, and I will release the code when the project is public. The Dust follow-up is independent research, unaffiliated with Q Labs, and its code is at [github.com/saanviiyer/apical-dust](https://github.com/saanviiyer/apical-dust).

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

<style>
  .ba-fig .ba-wrap { width: 100%; aspect-ratio: 16 / 8.5; background: var(--read-card, #fffdf7); border: 1px solid var(--read-card-edge, #efe7d7); border-radius: 12px; }
  .ba-fig .ba-wrap canvas { width: 100%; height: 100%; display: block; }
  .ba-fig .ba-controls { display: flex; align-items: center; gap: 14px; margin-top: 10px; font-family: var(--sans); font-size: 0.82rem; color: var(--muted); flex-wrap: wrap; }
  .ba-fig .ba-controls button { font-family: var(--sans); font-size: 0.76rem; border: 1px solid var(--accent); color: var(--accent); background: transparent; border-radius: 999px; padding: 4px 15px; cursor: pointer; }
  .ba-fig .ba-controls input[type=range] { flex: 1; min-width: 150px; accent-color: var(--accent); }
  .ba-fig .ba-readout b { color: var(--accent); }
</style>
<script>
(function(){
  var cv=document.getElementById('ba-plot'); if(!cv||!cv.getContext)return;
  var ctx=cv.getContext('2d'); var DPR=Math.min(2,window.devicePixelRatio||1);
  var PC_ACC=0.62, PC_EDGE=0.21, REPLAY_EDGE=10.6, MAXY=10, MINY=-8, A0=0.35, A1=0.90;
  function bwt(a){ return 2 - 8*(a-A0)/(A1-A0); }
  function col(v,f){ try{var c=getComputedStyle(document.documentElement).getPropertyValue(v).trim();return c||f;}catch(e){return f;} }
  var slider=document.getElementById('ba-slider'), btn=document.getElementById('ba-play'), ed=document.getElementById('ba-edge');
  var comp=0.90, playing=true, dir=-1;
  function resize(){var w=cv.clientWidth,h=cv.clientHeight;cv.width=Math.max(1,w*DPR);cv.height=Math.max(1,h*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);}
  function X(a,w){var L=54,R=18;return L+(a-A0)/(A1-A0)*(w-L-R);}
  function Y(v,h){var T=18,B=40;return T+(MAXY-v)/(MAXY-MINY)*(h-T-B);}
  function dot(x,y,r,c){ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fillStyle=c;ctx.fill();}
  function draw(){
    var w=cv.clientWidth,h=cv.clientHeight; ctx.clearRect(0,0,w,h);
    var acc=col('--accent','#a8324a'), mut='#9a9183';
    ctx.strokeStyle='#e4dcce'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(X(A0,w),Y(MAXY,h)); ctx.lineTo(X(A0,w),Y(MINY,h)); ctx.lineTo(X(A1,w),Y(MINY,h)); ctx.stroke();
    ctx.fillStyle=mut; ctx.font='11px Inter,system-ui,sans-serif'; ctx.textAlign='center';
    ctx.save(); ctx.translate(16,h/2); ctx.rotate(-Math.PI/2); ctx.fillText('backward transfer (retention)',0,0); ctx.restore();
    ctx.fillText('learning accuracy on the new task',(X(A0,w)+X(A1,w))/2,h-12);
    ctx.strokeStyle=mut; ctx.lineWidth=2; ctx.beginPath();
    for(var a=A0;a<=A1+1e-9;a+=0.01){var x=X(a,w),y=Y(bwt(a),h); if(a<=A0)ctx.moveTo(x,y); else ctx.lineTo(x,y);} ctx.stroke();
    ctx.fillStyle=mut; ctx.textAlign='left'; ctx.fillText('backprop ladder', X(0.74,w), Y(bwt(0.74),h)+16);
    dot(X(0.5,w),Y(bwt(0.5)+0.1,h),3.5,'rgba(168,50,74,0.4)');
    dot(X(0.55,w),Y(bwt(0.55)+0.1,h),3.5,'rgba(168,50,74,0.4)');
    var cx=X(comp,w), cyC=Y(bwt(comp),h);
    ctx.setLineDash([4,4]); ctx.strokeStyle='rgba(168,50,74,0.3)'; ctx.beginPath(); ctx.moveTo(cx,Y(MAXY,h)); ctx.lineTo(cx,Y(MINY,h)); ctx.stroke();
    var pcy=Y(bwt(PC_ACC)+PC_EDGE,h);
    ctx.strokeStyle=acc; ctx.lineWidth=2.5; ctx.beginPath(); ctx.moveTo(cx,pcy); ctx.lineTo(cx,cyC); ctx.stroke(); ctx.setLineDash([]);
    dot(cx,cyC,4,mut);
    dot(X(PC_ACC,w),pcy,5.5,acc);
    var ry=Y(bwt(PC_ACC)+REPLAY_EDGE,h); dot(X(PC_ACC,w),ry,5.5,'#cf4d87');
    ctx.font='600 11px Inter,system-ui,sans-serif'; ctx.fillStyle=acc; ctx.textAlign='left';
    ctx.fillText('predictive coding', X(PC_ACC,w)+9, pcy+4);
    ctx.fillStyle='#cf4d87'; ctx.fillText('replay', X(PC_ACC,w)+9, ry+4);
    var e=(bwt(PC_ACC)+PC_EDGE)-bwt(comp); if(ed) ed.textContent='+'+(e<1?e.toFixed(2):e.toFixed(1));
    if(slider&&document.activeElement!==slider) slider.value=String(Math.round(comp*100));
  }
  function loop(){ if(playing){ comp+=0.0012*dir; if(comp<=PC_ACC){comp=PC_ACC;dir=1;} if(comp>=0.90){comp=0.90;dir=-1;} } draw(); requestAnimationFrame(loop); }
  if(slider) slider.addEventListener('input',function(){playing=false;if(btn)btn.textContent='play';comp=slider.value/100;});
  if(btn) btn.addEventListener('click',function(){playing=!playing;btn.textContent=playing?'pause':'play';});
  window.addEventListener('resize',resize); resize(); loop();
})();
</script>

<style>
  .cm-fig .cm-wrap { width: 100%; aspect-ratio: 16 / 8.5; background: var(--read-card, #fffdf7); border: 1px solid var(--read-card-edge, #efe7d7); border-radius: 12px; }
  .cm-fig .cm-wrap canvas { width: 100%; height: 100%; display: block; }
  .cm-fig .cm-controls { display: flex; align-items: center; gap: 14px; margin-top: 10px; font-family: var(--sans); font-size: 0.8rem; color: var(--muted); flex-wrap: wrap; }
  .cm-fig .cm-controls button { font-family: var(--sans); font-size: 0.76rem; border: 1px solid var(--accent); color: var(--accent); background: transparent; border-radius: 999px; padding: 4px 15px; cursor: pointer; }
  .cm-fig .cm-controls input[type=range] { flex: 1; min-width: 150px; accent-color: var(--accent); }
  .cm-fig .cm-readout b { color: var(--accent); }
</style>
<script>
(function(){
  var cv=document.getElementById('cm-plot'); if(!cv||!cv.getContext)return;
  var ctx=cv.getContext('2d'); var DPR=Math.min(2,window.devicePixelRatio||1);
  function col(v,f){try{var c=getComputedStyle(document.documentElement).getPropertyValue(v).trim();return c||f;}catch(e){return f;}}
  var seed=11; function rnd(){seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;}
  function randn(){var u=rnd()||1e-9,v=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(6.283185*v);}
  var MAXN=200, A=[], B=[]; // precompute per-batch sample vectors
  var biasAng=0.68; // ~0.78 cosine target for feedback-weighted average
  for(var i=0;i<MAXN;i++){
    // feedback-weighted: true*cos + bias component + noise -> biased average
    A.push({x: 0.9+randn()*0.55, y: Math.sin(biasAng)*0.9 + randn()*0.55});
    // control variate: true + larger noise -> unbiased average, noisy per-step
    B.push({x: 1.0+randn()*0.95, y: randn()*0.95});
  }
  var n=1, playing=true;
  var slider=document.getElementById('cm-slider'), btn=document.getElementById('cm-play'), ca=document.getElementById('cm-a'), cb=document.getElementById('cm-b');
  function resize(){var w=cv.clientWidth,h=cv.clientHeight;cv.width=Math.max(1,w*DPR);cv.height=Math.max(1,h*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);}
  function avg(arr,k){var sx=0,sy=0;for(var i=0;i<k;i++){sx+=arr[i].x;sy+=arr[i].y;}return {x:sx/k,y:sy/k};}
  function cosTo(v){var m=Math.hypot(v.x,v.y)||1e-9;return v.x/m;}
  function arrow(cx,cy,vx,vy,scale,c,lw){var ex=cx+vx*scale,ey=cy-vy*scale;ctx.strokeStyle=c;ctx.fillStyle=c;ctx.lineWidth=lw;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(ex,ey);ctx.stroke();var a=Math.atan2(cy-ey,ex-cx);ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(ex-9*Math.cos(a-0.4),ey+9*Math.sin(a-0.4));ctx.lineTo(ex-9*Math.cos(a+0.4),ey+9*Math.sin(a+0.4));ctx.closePath();ctx.fill();}
  function draw(){
    var w=cv.clientWidth,h=cv.clientHeight; ctx.clearRect(0,0,w,h);
    var acc=col('--accent','#a8324a'), pink='#cf4d87', mut='#b7ad9c';
    var cx=w*0.18, cy=h*0.56, S=Math.min(w*0.5,h*0.7);
    var k=Math.max(1,Math.min(MAXN,Math.round(n)));
    // faint recent samples
    ctx.globalAlpha=0.16;
    for(var i=Math.max(0,k-18);i<k;i++){ arrow(cx,cy,A[i].x,A[i].y,S*0.5,pink,1); arrow(cx,cy,B[i].x,B[i].y,S*0.5,acc,1); }
    ctx.globalAlpha=1;
    // true gradient (unit right)
    arrow(cx,cy,1,0,S,mut,3);
    ctx.fillStyle=mut; ctx.font='600 12px Inter,system-ui,sans-serif'; ctx.textAlign='left';
    ctx.fillText('true backprop gradient', cx+S*1.0-6, cy-8);
    var aA=avg(A,k), aB=avg(B,k);
    arrow(cx,cy,aA.x,aA.y, S/Math.max(1,Math.hypot(aA.x,aA.y)), pink,3);
    arrow(cx,cy,aB.x,aB.y, S/Math.max(1,Math.hypot(aB.x,aB.y)), acc,3);
    var cA=cosTo(aA), cB=cosTo(aB);
    if(ca) ca.textContent=cA.toFixed(2); if(cb) cb.textContent=cB.toFixed(2);
    ctx.textAlign='left'; ctx.font='600 11px Inter,system-ui,sans-serif';
    ctx.fillStyle=pink; ctx.fillText('feedback-weighted (biased)', w*0.58, h*0.3);
    ctx.fillStyle=acc; ctx.fillText('control variate (unbiased)', w*0.58, h*0.3+18);
    ctx.fillStyle=mut; ctx.font='11px Inter,system-ui,sans-serif'; ctx.fillText('batches averaged: '+k, w*0.58, h*0.3+40);
    if(slider&&document.activeElement!==slider) slider.value=String(k);
  }
  function loop(){ if(playing){ n+=0.9; if(n>=MAXN){n=1;} } draw(); requestAnimationFrame(loop); }
  if(slider) slider.addEventListener('input',function(){playing=false;if(btn)btn.textContent='play';n=+slider.value;});
  if(btn) btn.addEventListener('click',function(){playing=!playing;btn.textContent=playing?'pause':'play';});
  window.addEventListener('resize',resize); resize(); loop();
})();
</script>
