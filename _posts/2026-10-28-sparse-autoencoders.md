---
layout: post
title: "Sparse autoencoders, from superposition to steering"
dek: "What a sparse autoencoder does, why it works, and where it can break, with a live toy to check each step"
date: 2026-10-28
tag: "Interpretability"
section: technical
math: true
permalink: /writing/sparse-autoencoders/
---

I learned sparse autoencoders from two primers, Adam Karvonen's [intuitive explanation](https://adamkarvonen.github.io/machine_learning/2024/06/11/sae-intuitions.html) and [a gentle introduction on LessWrong](https://www.lesswrong.com/posts/8YnHuN55XJTDwGPMr/a-gentle-introduction-to-sparse-autoencoders). The LessWrong piece explains why anyone wants a sparse autoencoder. Karvonen explains how the machine actually behaves. This post weaves the two together in the order I wish I had read them, and **every section points to a chapter of my [live sparse autoencoder]({{ '/playground/sae/' | relative_url }}), where you can watch the idea happen in your browser.**

## Why look inside at all

For most of the history of large language models, we had one way to study them. We fed in text and read what came out. Everything in between stayed a black box. Interpretability tries to open that box, and mechanistic interpretability makes the boldest bet. It assumes we can reverse engineer a trained network into something like a program, with parts that each do one job.

If the network runs a program, its variables should live in the activations. A transformer stacks attention blocks and MLPs, and each layer writes a vector of numbers. The space of all those vectors is the **activation space**. **The working hypothesis says that each activation vector adds up a handful of meaningful directions.**

$$
\mathbf{x} \;=\; \sum_{i=1}^{F} w_i \, \mathbf{f}_i
$$

Here $\mathbf{x}$ is the activation, each $\mathbf{f}_i$ is a unit-length **feature vector**, and $w_i$ says how strongly feature $i$ shows up. The LessWrong primer adds a useful split. The vector is the feature, and the human meaning we attach to it, such as "German shepherd" or "San Francisco", is the **feature description**. A sparse autoencoder tries to recover the vectors and the weights. People then supply the descriptions.

## Sparsity and superposition

Two ideas make this hypothesis interesting rather than trivial.

**Sparsity.** Any one input involves very few concepts. A sentence about a coffee mug touches size, color and use, and it has nothing to do with planets or group theory. So for any given input, almost every $w_i$ sits at zero.

**Superposition.** A model wants a vocabulary of concepts far larger than its number of neurons. Once it holds more feature vectors than dimensions, the vectors cannot all sit at right angles, so they start to overlap. **The superposition hypothesis says the model packs in many more features than dimensions by making them almost, but not quite, orthogonal.** High-dimensional space makes this cheap. The Johnson–Lindenstrauss lemma implies the number of nearly orthogonal directions grows exponentially with dimension.

Sparsity is what makes superposition affordable. Two overlapping features interfere only when they fire together, and sparse features rarely do.

Superposition also explains why reading single neurons fails. The feature directions do not line up with the neuron axes, so one neuron responds to several unrelated features. Researchers call that neuron **polysemantic**.

In [chapter 1]({{ '/playground/sae/' | relative_url }}) of the interactive I pack 6 concepts into 3 neurons, so you can rotate the activation space and see the overlap directly. In chapter 2 you pick a neuron and watch four of the six concepts drive it.

## From an autoencoder to a sparse one

An ordinary autoencoder compresses. It squeezes an input through a narrow hidden layer and learns to rebuild the input on the other side. People call the squeeze encoding and the rebuild decoding.

A sparse autoencoder flips the shape. **Its hidden layer runs much wider than its input, because each hidden unit should become one feature, and a wider layer holds a bigger vocabulary.** Anthropic's largest dictionary had about 34 million features. To stop the wide layer from simply copying the input, training adds a penalty that pushes most hidden units to zero on every input.

The forward pass has three steps.

$$
\mathbf{c} = \operatorname{ReLU}(W_{\text{enc}}\,\mathbf{x} + \mathbf{b}_{\text{enc}}), \qquad
\hat{\mathbf{x}} = W_{\text{dec}}\,\mathbf{c} + \mathbf{b}_{\text{dec}}
$$

The encoder scores every feature, ReLU zeros the negative scores, and the decoder rebuilds the input. Karvonen draws each of these vectors as a row of cells that get darker as the value grows, and I copied that picture in [chapter 4]({{ '/playground/sae/' | relative_url }}). It shows the key fact at a glance. Almost all the cells in the code $\mathbf{c}$ stay blank.

**Each column of the decoder is a feature vector.** The reconstruction adds up those columns, each scaled by its code value, which is exactly the equation from the first section. The decoder columns play the role of $\mathbf{f}_i$, and the code values play the role of $w_i$. In chapter 4 I draw that sum head to tail in 3D, and the rebuilt point lands next to the original.

A subtle point from Karvonen surprised me. The encoder vector and the decoder vector for the same feature differ. In the autoencoders he examined, their median cosine similarity sat near 0.5. The decoder only has to say what the feature looks like. The encoder also has to decide whether the feature is present, so it must tilt away from other features that overlap with it.

## The loss and the sparsity knob

Training balances two goals.

$$
\mathcal{L} \;=\; \lVert \mathbf{x} - \hat{\mathbf{x}} \rVert^2 \;+\; \lambda \sum_j c_j
$$

The first term rewards faithful reconstruction. The second, an L1 penalty, rewards using few features. People also normalize each decoder column to unit length, because otherwise the model could cheat by shrinking codes and stretching decoder columns to dodge the penalty.

**The coefficient $\lambda$ sets the whole trade-off.** Set it too low and the code stays dense, the reconstruction looks perfect, and each feature mixes several concepts. Set it too high and features die, and the reconstruction degrades because the penalty shrinks every value. In my toy, $\lambda = 0.02$ explains all the variance but recovers only about half the planted concepts, while $\lambda = 1.2$ recovers all of them and explains only about half the variance. You can reproduce both in [chapter 6]({{ '/playground/sae/' | relative_url }}).

Many groups now skip $\lambda$ entirely. A TopK autoencoder keeps only the $k$ largest code values per input and zeros the rest, so you choose the sparsity directly. OpenAI used this approach to train autoencoders on GPT-4. Karvonen recommends BatchTopK, which keeps the top values across a whole batch, so busy inputs can use more features and quiet ones fewer.

In [chapter 5]({{ '/playground/sae/' | relative_url }}) I train the toy live. The decoder arrows start in random directions and swing onto the hidden concept rays, and a few never fire at all.

## Naming the features

Training gives you vectors, not meanings. To name a feature, you run a large pile of text through the model, collect the snippets where that feature fires hardest, and look for what they share. Anthropic drew its text from The Pile and Common Crawl. If the top snippets all mention restaurants and cafés, the feature might get the description "food places".

This method rests on an assumption. **A feature has to fire on inputs that share one coherent meaning.** Sparsity helps here. A dense feature fires on almost everything, so its top examples share nothing. A sparse feature fires rarely, so its top examples tend to hang together.

[Chapter 7]({{ '/playground/sae/' | relative_url }}) holds a tiny version of [Neuronpedia](https://www.neuronpedia.org/), the public atlas of autoencoder features. Each card shows a feature's top inputs. Because I planted the concepts myself, I can also check whether each label is right, which you can never do on a real model.

## Testing a feature by steering

A list of examples can fool you. Maybe a feature correlates with a topic without actually representing it. The stronger test intervenes. **Add a feature's decoder vector to the activation, scaled up, and see whether the model's behavior moves toward that meaning.**

Anthropic ran this test on a feature that fired for the Golden Gate Bridge. As they turned it up, Claude steered more and more of its answers toward the bridge, and at the extreme it described itself as the bridge. That result is much harder to explain away than a list of examples.

Steering also points to new interfaces. The LessWrong primer mentions demos with sliders that make an image more cat-like or a text more formal by turning features up or down. In [chapter 8]({{ '/playground/sae/' | relative_url }}) you drag a slider and watch one input slide along a feature arrow while only that feature's code changes.

## Where it can break

Both primers end with caution, and I agree with them.

**Dead features waste compute.** A dead feature almost never fires. Anthropic reported about 65% dead features in its largest autoencoder. You can watch a few arrows die in my toy.

**Superposition itself remains unproven.** Autoencoders find useful features, but that does not show that models store concepts as nearly orthogonal directions. Some researchers argue that autoencoders find compositions of features rather than the atomic units.

**The linear picture might be too simple.** Networks apply nonlinearities at every layer, so it is surprising that activations decompose this cleanly into sums. The decomposition might work well enough to be useful and still miss how the model computes.

**One layer is not the whole model.** Most of this work trains one autoencoder on one layer. Reading the full computation needs features at every layer and a way to connect them.

## What I take from this

A sparse autoencoder does not add information. It reorganizes it. It trades dense, polysemantic neurons for a wide, sparse code where single units line up with single concepts, and that alignment is what makes features readable and steerable. I built the [toy]({{ '/playground/sae/' | relative_url }}) because on a real model you never see the true features, so you cannot tell when the method fails. In the toy you can.

## References

1. Adam Karvonen, [An intuitive explanation of sparse autoencoders for LLM interpretability](https://adamkarvonen.github.io/machine_learning/2024/06/11/sae-intuitions.html), 2024.
2. [A gentle introduction to sparse autoencoders](https://www.lesswrong.com/posts/8YnHuN55XJTDwGPMr/a-gentle-introduction-to-sparse-autoencoders), LessWrong, 2024.
3. Elhage et al., [Toy models of superposition](https://transformer-circuits.pub/2022/toy_model/index.html), 2022.
4. Bricken et al., [Towards monosemanticity](https://transformer-circuits.pub/2023/monosemantic-features/index.html), 2023.
5. Templeton et al., [Scaling monosemanticity](https://transformer-circuits.pub/2024/scaling-monosemanticity/index.html), 2024.
6. Gao et al., [Scaling and evaluating sparse autoencoders](https://arxiv.org/abs/2406.04093), 2024.
7. Bussmann et al., [BatchTopK sparse autoencoders](https://arxiv.org/abs/2412.06410), 2024.
