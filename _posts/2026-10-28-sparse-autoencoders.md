---
layout: post
title: "Sparse autoencoders, from superposition to steering"
dek: "Two of my favorite sparse autoencoder guides, combined into one interactive walkthrough"
date: 2026-10-28
tag: "Interpretability"
section: technical
math: true
permalink: /writing/sparse-autoencoders/
---

<link rel="stylesheet" href="/assets/css/forward-training.css?v=3">
<link rel="stylesheet" href="/assets/css/sae-post.css?v=2">

Two guides taught me sparse autoencoders, Adam Karvonen's [An Intuitive Explanation of Sparse Autoencoders for LLM Interpretability](https://adamkarvonen.github.io/machine_learning/2024/06/11/sae-intuitions.html) and [A gentle introduction to sparse autoencoders](https://www.lesswrong.com/posts/8YnHuN55XJTDwGPMr/a-gentle-introduction-to-sparse-autoencoders) on LessWrong. This post follows their explanations and their examples, combined into one walkthrough, and I credit each idea to the guide it comes from. I added one thing. **Every figure trains a real sparse autoencoder in your browser** on a toy model where I planted the true features, so you can watch each idea happen. The full version lives in my [live playground]({{ '/playground/sae/' | relative_url }}). At the end I collect the sparse autoencoder papers from my reading list that I keep coming back to.

## Why look inside a model

The LessWrong guide starts from the problem. Since language models took off, we have had one clear way to study them. We feed text in and read what comes out, and everything in between stays a black box. Interpretability aims to give us tools that go past input and output.

Sparse autoencoders belong to **mechanistic interpretability**, which the LessWrong guide describes as a bet that we can reverse engineer a language model into something like a computer program. People call it bottom-up because it searches for small, function-like mechanisms that combine into the final output.

Karvonen adds the first obstacle. The natural unit to study is a single neuron, but **individual neurons do not line up with single concepts**. He cites one neuron in a language model that responded to academic citations, English dialogue, HTTP requests and Korean text all at once. Researchers call this **superposition**. The model spreads concepts across combinations of neurons.

## Features as directions

The LessWrong guide then sets up the central idea. A language model stacks attention blocks and MLPs, and each layer outputs a vector of numbers. The guide calls the space of all those vectors the neuron activation space, and it focuses on MLP outputs because people think of the MLP as the part that does the reasoning.

If we take the bottom-up view, we should be able to break each activation into more basic vectors that each match an atomic concept, such as "German shepherd" or "San Francisco". The guide calls these **features**. It names the vector the **feature vector**, names its meaning the **feature description**, and writes the activation as a weighted sum.

$$
\mathbf{x} \;=\; \sum_{i=1}^{F} w_i \, \mathbf{f}_i
$$

Here $\mathbf{x}$ is the activation, $F$ counts the features, each $\mathbf{f}_i$ is a unit-length feature vector, and the **feature activation** $w_i$ says how strongly feature $i$ appears. The guide suggests thinking of features as the variables in the model's hypothetical program.

The figure below shows this picture in a toy I built. I gave a layer 3 neurons and planted 6 concept directions. Every dot is one input, made from one or two concepts. The model only sees the grey cloud.

<figure class="ft-fig">
  <div class="ft-card" data-sae="cloud"></div>
  <figcaption><strong>Six features in three neurons.</strong> Reveal the concepts and turn on their directions. Each input lies along the direction of the concept it contains, or in the thin fan between two of them. A sparse autoencoder has to find those directions using only the grey cloud.</figcaption>
</figure>

## Sparsity and superposition

The LessWrong guide draws two implications from this setup.

**Sparsity.** Most things in the world need only a few concepts to describe them. The guide's example is a coffee mug. Its size, color and function matter, and the names of planets and algebraic theories do not. So for any one input, most feature activations sit at zero. Karvonen makes the same point from the data side. A single celebrity's birthplace might show up in fewer than one in a billion training tokens, yet large models learn that fact and countless others.

**Superposition.** We want our vocabulary of concepts to be as large as possible, but activations only have $n$ dimensions. Once the vocabulary passes $n$ features, the vectors can no longer all be independent, so they start to interfere. **The superposition hypothesis says the model learns feature vectors that are almost orthogonal, which lets many features share a small space.** The guide notes that the Johnson–Lindenstrauss lemma lets the number of nearly orthogonal directions grow exponentially with dimension. Karvonen suggests superposition appears because the training data holds more facts and concepts than the model has neurons.

The two ideas depend on each other, and the next figure shows why. It packs features into a 2D plane, and each feature reads its value back by measuring along its own direction. With sparse inputs, one feature fires at a time and the readout stays close to the truth even with many features. With dense inputs, the overlaps add up and the readouts go wrong.

<figure class="ft-fig">
  <div class="ft-card" data-sae="superposition"></div>
  <figcaption><strong>Sparsity makes superposition affordable.</strong> Up to four features fit in 2D with no harmful overlap, because each one ignores the others' negative projections. Add a fifth and the directions start to overlap. Sparse inputs barely notice the overlap, but dense inputs pile it up into readout errors.</figcaption>
</figure>

The LessWrong guide sums up four questions that this leaves us with. How can we recover feature vectors and feature activations from neuron activations? How can we attach a meaning to each recovered vector? How can we make the set of features as large as possible? And how can we make the decomposition sparse? Sparse autoencoders answer all four.

## From an autoencoder to a sparse autoencoder

Both guides start from the ordinary autoencoder. In Karvonen's example, an autoencoder takes a 100 dimensional input, compresses it to 50 dimensions with an encoder, and rebuilds 100 dimensions with a decoder. The LessWrong guide notes that autoencoders were first designed for dimensionality reduction and compression. The compression makes the rebuild imperfect.

A sparse autoencoder changes the shape. For language models, Karvonen explains, the hidden layer is usually **larger** than the input. That alone makes the task trivial, since the network could copy the input with an identity matrix and teach us nothing. So training adds a sparsity penalty. In his example, a 100 dimensional input expands to 200 hidden units, and the autoencoder learns to keep only about 20 of them nonzero. The LessWrong guide explains the payoff. The hidden activations become the feature activations, the decoder weights become the feature vectors, and the width of the hidden layer sets how many features we can find. If we want a million features, we use a million hidden units.

Where do the inputs come from? Karvonen walks through GPT-3, which has 96 layers and passes a 12,288 dimensional vector per token from layer to layer. You train one sparse autoencoder per location, so studying every layer output means 96 separate autoencoders. The LessWrong guide notes that Anthropic trained on a middle layer, where abstract features seemed most likely, and that later work mostly reads the residual stream.

## One forward pass

Karvonen boils the whole model down to **a matrix, then a ReLU, then a matrix**. With an expansion factor of 4 on GPT-3, the encoder maps 12,288 dimensions to 49,152, the ReLU zeros every negative value, and the decoder maps back to 12,288. He notes that people typically aim for fewer than 100 nonzero values in that 49,152 dimensional code.

$$
\mathbf{c} = \operatorname{ReLU}(W_{\text{enc}}\,\mathbf{x} + \mathbf{b}_{\text{enc}}), \qquad
\hat{\mathbf{x}} = W_{\text{dec}}\,\mathbf{c} + \mathbf{b}_{\text{dec}}
$$

Karvonen draws each vector as a row of cells colored by value, and the figure below copies that style for my toy. The encoder scores all 12 features, the ReLU leaves only a few, and the decoder rebuilds the input. On the left, the decoder's work plays out in 3D.

<figure class="ft-fig">
  <div class="ft-card" data-sae="forward"></div>
  <figcaption><strong>A matrix, a ReLU, a matrix.</strong> Each cell holds one number, and darker cells hold larger ones. The code stays mostly blank. In 3D, the decoder rebuilds the input by laying the active decoder vectors head to tail, each stretched by its code value, and the rebuilt point x̂ lands next to x.</figcaption>
</figure>

**The decoder holds the features.** Karvonen's example makes this concrete. Suppose GPT-3 represents "Golden Retriever" with some 12,288 dimensional vector. The decoder is a matrix, but you can read it as a stack of 49,152 vectors of that same length. If decoder vector 317 learned the Golden Retriever concept, then whenever code element 317 turns on, the autoencoder adds a scaled Golden Retriever vector into its reconstruction. In interpretability jargon, decoder vectors are linear representations of features. The math behind it is simple, because multiplying a vector by a matrix just takes a weighted sum of the matrix's rows.

Karvonen also explains that a feature has two halves. **The encoder vector detects the concept while keeping interference from other concepts low, and the decoder vector represents the true feature direction.** The two differ in practice, with a median cosine similarity of about 0.5. His diagram shows a code where only two features fire. If one stands for red and the other for a sphere, the model might be representing a red sphere.

## The loss, and the sparsity knob

Karvonen describes the loss as the usual reconstruction error plus a sparsity penalty. The most common penalty takes the L1 norm of the encoded representation, not of the weights, and multiplies it by an **L1 coefficient**.

$$
\mathcal{L} \;=\; \lVert \mathbf{x} - \hat{\mathbf{x}} \rVert^2 \;+\; \lambda \sum_j c_j
$$

He calls the coefficient a crucial hyperparameter, because it sets the trade-off between sparsity and reconstruction accuracy. He also makes a point I find striking. **Nobody optimizes these models for interpretability.** Interpretable features fall out as a side effect of asking for sparsity and reconstruction. Implementations usually add extras too, and the most common one constrains the length of each decoder vector.

The LessWrong guide adds why sparsity helps the meaning. If every feature fired on all our diverse text, no feature would have a clear description. Sparsity lets only the most important features fire, so each description can rest on a few examples. It also nudges the autoencoder toward a more efficient reconstruction in which feature vectors interfere less.

Watch a sparse autoencoder train on my toy. The decoder vectors start in random directions, then swing onto the hidden concept directions and leave fading trails. A few never fire and stay grey.

<figure class="ft-fig">
  <div class="ft-card" data-sae="train"></div>
  <figcaption><strong>Training, live.</strong> Each arrow is one decoder vector, and I color it once it lands on a concept. Dashed lines mark the concepts I planted. Grey dashed arrows are dead features that never found an input to fire on.</figcaption>
</figure>

Karvonen describes how researchers compare autoencoders. They plot **L0**, the average number of nonzero code values, against **Loss Recovered**, how much of the model's loss survives when you swap in the reconstruction. The two trade off, and better methods push the curve toward the corner. The figure below sweeps λ on my toy. Lacking a language model to recover loss from, I plot variance explained instead, and I shade each point by how many planted concepts that autoencoder found.

<figure class="ft-fig">
  <div class="ft-card" data-sae="tradeoff"></div>
  <figcaption><strong>The trade-off, swept live.</strong> Your browser trains 13 autoencoders when this figure scrolls into view. Low λ keeps many features on and explains nearly everything but finds few concepts. High λ finds every concept but explains less. Drag λ to read off any point.</figcaption>
</figure>

Both guides point past the L1 penalty. The LessWrong guide mentions k-sparse autoencoders, which OpenAI used and which always keep exactly k hidden units on. In a 2024 update, Karvonen calls the plain ReLU autoencoder outdated except as a baseline and names **BatchTopK** as his preferred design. It keeps the top k values across a batch and zeros the rest, so k sets the sparsity directly, with no penalty to tune and steady training. He lists TopK and JumpReLU as other strong options. The squares in the figure above show TopK on my toy.

## Naming the features

How do we learn what a feature means? The LessWrong guide describes the pipeline Anthropic used. They ran a large set of texts through the model, drawn from The Pile and Common Crawl. For each feature they collected the passages where it fired hardest and wrote a description that fit them, such as "food places". The core assumption says **features tend to fire on tokens that share one coherent meaning**.

Karvonen is blunter about the practice. Researchers look at the top-activating inputs and give a gut reaction. Often the result reads cleanly, like Anthropic's features for the Golden Gate Bridge, neuroscience or tourist attractions. Sometimes it does not, like a Pythia feature that fires on the last token of a relative clause or prepositional phrase modifying a sentence's subject.

Try the gut-reaction method on my toy. Pick a feature, read the inputs that fire it hardest, and guess its concept.

<figure class="ft-fig">
  <div class="ft-card" data-sae="labels"></div>
  <figcaption><strong>Label a feature by its top inputs.</strong> Each row shows the planted concepts in one input. On a real model you would read text instead of colored squares, and you could never check your answer. Here I can, by comparing the decoder vector with the concept I planted.</figcaption>
</figure>

## Steering with a feature

Labels from examples could be coincidence. The LessWrong guide asks how we can know that a random looking vector really means the Golden Gate Bridge. Both guides give the same answer. Because decoder vectors have the same shape as the model's activations, **we can add a decoder vector straight into the activations, scaled up or down, and watch what the model does**. When Anthropic boosted the Golden Gate Bridge feature, Claude mentioned the bridge in every response, and at the extreme it came to think it was the bridge. Karvonen notes that his Golden Retriever feature would work the same way on GPT-3.

<figure class="ft-fig">
  <div class="ft-card" data-sae="steer"></div>
  <figcaption><strong>Steering.</strong> I add α times one decoder vector to an input. The input slides along that feature's direction, and in the code that one feature switches on while the others hold still.</figcaption>
</figure>

The LessWrong guide sees steering as the start of new interfaces. For most of their history we could only put text in and take text out. Feature control adds degrees of freedom, like a demo with sliders that make an image more cat-like or more cowboy, or Linus Lee's Prism for text models. It also flags open problems. Nobody knows how far to push a feature, whether equal pushes have equal effects on different features, or how to make an autoencoder find the specific features we want.

## Where it gets hard

Karvonen names **evaluation** as the main challenge. Natural language gives us no measurable ground truth, so we judge features by looking at examples. L0 and Loss Recovered help, but neither is used in training, since L0 has no gradient and Loss Recovered costs too much to compute. That leaves layers of mismatch. The training loss stands in for the proxy metrics, the metrics stand in for our judgment of interpretability, and that judgment stands in for the real goal of understanding the model. Some important concepts might not be easy to interpret at all. He also passes on a warning from OpenAI. An infinitely wide autoencoder could reach perfect Loss Recovered with an L0 of 1 and still teach us nothing.

The LessWrong guide lists more open questions. **Dead features** almost never fire, and Anthropic found about 65% of its largest autoencoder's features dead, which wastes compute as people scale to tens of millions of features. Nobody has proven superposition itself, and one argument says these autoencoders find compositions of features rather than atomic ones. Most work also studies activations rather than weights, and a single layer rather than the whole model. Finally, it seems surprising that activations decompose into linear sums at all when the network runs nonlinearities everywhere.

Both guides still end hopeful. Karvonen argues that an objective as simple as reconstruction plus sparsity would not find interpretable features unless the model had learned something meaningful, and he connects the work to Anthropic's goal of an MRI for models. The LessWrong guide calls sparse autoencoders probably the first concrete result showing that mechanistic interpretability can work. For hands-on practice, Karvonen recommends Callum McDougall's Colab notebook.

## Papers I keep coming back to

These are the sparse autoencoder papers from my own reading list that I return to most. Each takes one of the open questions above further. Filter by theme, and open a card for my one-paragraph summary.

<div class="sp-filter">
  <button class="ft-btn" type="button" data-t="all" aria-pressed="true">all</button>
  <button class="ft-btn" type="button" data-t="real">are the features real</button>
  <button class="ft-btn" type="button" data-t="models">across models</button>
  <button class="ft-btn" type="button" data-t="vision">beyond language</button>
  <button class="ft-btn" type="button" data-t="recipe">the recipe</button>
</div>

<div class="sp-papers">
  <div class="sp-paper" data-t="real">
    <div class="tg">are the features real</div>
    <h4><a href="https://arxiv.org/abs/2607.20596" target="_blank" rel="noopener">Are Single-Token Sparse Autoencoder Features Causally Necessary?</a></h4>
    <div class="by">Cho et al., 2026</div>
    <details><summary>why I like it</summary><p>It tests the steering logic at scale. The authors zero-ablate 3.9M single-token features across six models and three autoencoder families. Deleting one lowers the model's logit for its token in 178 of 208 layer conditions. But the families disagree. GemmaScope and BatchTopK features hold causal weight, while LlamaScope features turn out locally redundant, so the training recipe shapes what a feature means.</p></details>
  </div>
  <div class="sp-paper" data-t="real">
    <div class="tg">are the features real</div>
    <h4><a href="https://arxiv.org/abs/2309.10312" target="_blank" rel="noopener">Rigorously Assessing Natural Language Explanations of Neurons</a></h4>
    <div class="by">Huang et al., 2023</div>
    <details><summary>why I like it</summary><p>It checks the gut-reaction labeling step. The authors score GPT-4's explanations of GPT-2 XL neurons in two ways, whether the neuron fires on exactly the inputs the explanation names, and whether it causally carries that concept. Even the most confident explanations show high error rates and little causal effect.</p></details>
  </div>
  <div class="sp-paper" data-t="real">
    <div class="tg">are the features real</div>
    <h4><a href="https://arxiv.org/abs/2412.09565" target="_blank" rel="noopener">Obfuscated Activations Bypass LLM Latent-Space Defenses</a></h4>
    <div class="by">Bailey et al., 2024</div>
    <details><summary>why I like it</summary><p>It shows that monitors built on activations, sparse autoencoders included, can be fooled. Attacks reshape a model's activations so the monitors miss harmful behavior while the behavior survives. Activations turn out far more malleable than the clean feature picture suggests, though obfuscation does cost performance on harder tasks.</p></details>
  </div>
  <div class="sp-paper" data-t="models">
    <div class="tg">across models</div>
    <h4><a href="https://arxiv.org/abs/2410.06981" target="_blank" rel="noopener">Quantifying Feature Space Universality Across Large Language Models via Sparse Autoencoders</a></h4>
    <div class="by">Lan et al., 2024</div>
    <details><summary>why I like it</summary><p>It asks whether different models learn the same features. Even when autoencoders on two models find different individual features, the spaces those features span look similar once you allow rotations. If that holds, interpretability findings could carry from one model to another.</p></details>
  </div>
  <div class="sp-paper" data-t="models">
    <div class="tg">across models</div>
    <h4><a href="https://arxiv.org/abs/2502.03714" target="_blank" rel="noopener">Universal Sparse Autoencoders</a></h4>
    <div class="by">Thasarathan et al., 2025</div>
    <details><summary>why I like it</summary><p>It trains one overcomplete autoencoder on several vision models at once. The autoencoder reads activations from any model and reconstructs any other, so its dictionary captures concepts the models share, from colors and textures up to parts and objects.</p></details>
  </div>
  <div class="sp-paper" data-t="models">
    <div class="tg">across models</div>
    <h4><a href="https://arxiv.org/abs/2506.06609" target="_blank" rel="noopener">Transferring Linear Features Across Language Models With Model Stitching</a></h4>
    <div class="by">Chen et al., 2025</div>
    <details><summary>why I like it</summary><p>It maps one model's residual stream onto another's with an affine map and carries a sparse autoencoder across. Small and large models turn out to share much of their representation space, and starting a large model's autoencoder from a transferred small one cuts the training cost by about half.</p></details>
  </div>
  <div class="sp-paper" data-t="vision">
    <div class="tg">beyond language</div>
    <h4><a href="https://arxiv.org/abs/2504.08729" target="_blank" rel="noopener">Steering CLIP's Vision Transformer with Sparse Autoencoders</a></h4>
    <div class="by">Joseph et al., 2025</div>
    <details><summary>why I like it</summary><p>It brings the whole pipeline to vision. Autoencoders on CLIP's vision transformer show different sparsity patterns than language models do. About 10 to 15% of neurons and features can steer the output, and the autoencoder supplies thousands more steerable features than the raw neurons. Suppressing features improves results on CelebA, Waterbirds and typographic attacks.</p></details>
  </div>
  <div class="sp-paper" data-t="vision">
    <div class="tg">beyond language</div>
    <h4><a href="https://arxiv.org/abs/2506.11976" target="_blank" rel="noopener">How Visual Representations Map to Language Feature Space in Multimodal LLMs</a></h4>
    <div class="by">Venhoff et al., 2025</div>
    <details><summary>why I like it</summary><p>It uses a frozen language model's own autoencoders as probes. Only a linear adapter connects the vision encoder, so the autoencoders stay aligned with the language model and show, layer by layer, where visual inputs start to land on language features.</p></details>
  </div>
  <div class="sp-paper" data-t="recipe">
    <div class="tg">the recipe</div>
    <h4><a href="https://arxiv.org/abs/2506.04859" target="_blank" rel="noopener">Sparse Autoencoders, Again?</a></h4>
    <div class="by">Lu et al., 2025</div>
    <details><summary>why I like it</summary><p>It argues the standard recipe has barely changed in decades and formalizes weaknesses in both sparse and variational autoencoders. The authors propose a hybrid and prove its global minima recover data spread across a union of manifolds. My toy has exactly that shape, a union of rays and fans.</p></details>
  </div>
</div>

## References

1. Adam Karvonen, [An Intuitive Explanation of Sparse Autoencoders for LLM Interpretability](https://adamkarvonen.github.io/machine_learning/2024/06/11/sae-intuitions.html), 2024.
2. [A gentle introduction to sparse autoencoders](https://www.lesswrong.com/posts/8YnHuN55XJTDwGPMr/a-gentle-introduction-to-sparse-autoencoders), LessWrong, 2024.
3. Elhage et al., [Toy models of superposition](https://transformer-circuits.pub/2022/toy_model/index.html), 2022.
4. Bricken et al., [Towards monosemanticity](https://transformer-circuits.pub/2023/monosemantic-features/index.html), 2023.
5. Templeton et al., [Scaling monosemanticity](https://transformer-circuits.pub/2024/scaling-monosemanticity/index.html), 2024.
6. Gao et al., [Scaling and evaluating sparse autoencoders](https://arxiv.org/abs/2406.04093), 2024.
7. Bussmann et al., [BatchTopK sparse autoencoders](https://arxiv.org/abs/2412.06410), 2024.

<script src="/assets/js/forward-training.js?v=3" defer></script>
<script src="/assets/js/sae-post.js?v=2" defer></script>
