---
layout: post
title: "RLing Qwen to Write Better"
dek: "Retraining a small LLM with RL to follow my rules for clear writing"
date: 2026-11-05
tag: "RL, LLMs"
section: technical
rank: 4
permalink: /writing/qwen-by-my-rules/
excerpt: "I used GRPO to retrain Qwen3-1.7B on my own style guide. RL on clean examples beat the base model by 6.5 points, and the harder problem turned out to be stopping models from claiming results nobody gave them."
---

<link rel="stylesheet" href="/assets/css/forward-training.css?v=3">
<link rel="stylesheet" href="/assets/css/qwen-rules.css?v=1">

We all know the "style" (or lack thereof) of writing that LLMs use, filled with passive, obfuscated slop. I made a list of writing rules to paste into prompts to write stronger, but I was curious about retraining a model to get it right the first time. Inspired by [Kevin Wu's blog post](https://kevin-wu.ca/blog/qwn/) on RL to retrain an LLM, I took Qwen3-1.7B, a small model that runs on my laptop, and used reinforcement learning to teach it my writing rules.

RL on cleaned-up examples gave me a model that follows my rules 6.5 points more often than the base model. The harder problem, I found, was stopping models from claiming results nobody gave them.

## Why should we care?

When a model drafts an email for you, it can fail in two ways. It can sound generic, and it can state something false that you then send under your name. Neither problem goes away with a stronger model or a longer prompt. With my style guide as its system prompt, the base Qwen3-1.7B did slightly worse than with no prompt at all, 41.5% against 45.0% on the measure defined below. Claude Opus 5.5 passed every rule on 16% of drafts from a bare prompt and on 50% with the guide. A guide helps a frontier model, but half its drafts still break a rule.

## Why can't a model just follow the rules?

Some constraints are free to enforce. To ban a letter, you can block every token containing it at decoding time. My rules live in grammar and phrasing. Spotting a passive takes a parse, and a superlative takes a phrase list, so no token mask can carry them. So I had to write each rule into the reward as a checker.

Here are the rules, each scored by its own checker:

- **Active voice:** name who acts, so "The results were validated" fails. This rule counts three times as much as any other.
- **No superlatives:** no "best", "most important", "groundbreaking" or "novel".
- **No banned phrasing:** no stock clichés, and no "I" plus a present-tense verb for ongoing work, such as "I aim" or "I study".
- **No performed tone:** no put-on curiosity or dramatic openers like "Imagine…".
- **No contrastive framing:** no "rather than", "instead of" or "not just X but Y".
- **Punctuation:** no em dashes, and at most one colon per paragraph.
- **Short lists:** no more than three items in a list.
- **Sentence flow:** no run-ons, and no choppy strings of very short sentences.
- **No origin stories:** no "ever since I…".
- **Length:** stay in the word range for the genre, with no fragments or repetition.

Experiment 2 added two more:

- **No invented facts:** a number, date or name the prompt never gave should be a [blank] instead.
- **Agency:** at most a quarter of the sentences may hide who acts behind an abstract subject or a weak verb.

A judge model also rates every draft from 1 to 5 on two axes:

- **Coherence:** does the draft read as clear, connected writing?
- **Responds:** does it answer what the prompt asked for?

I scored every draft in this post with one measure. A draft is <span class="ft-def" tabindex="0">usable<span class="ft-pop" role="tooltip">Every rule checker passes, and a judge model rates the draft at least 4 of 5 on coherence and on answering the request. The judge never sees the rules.</span></span> when it passes every rule and the judge accepts it.

A checker also invites gaming. A model that learns my checker bans "I aim" can write "My goal is", which passes and changes nothing a reader would notice. So I also had the eval log <span class="ft-def" tabindex="0">substitute probes<span class="ft-pop" role="tooltip">Counters that never enter the reward, such as spaced hyphens in place of em dashes. If a rule improves while its probe rises, the model may be dodging the rule.</span></span> for each rule.

## Why RL, and why GRPO?

Each answer is one episode: the prompt sets the starting state, each token is an action, and one reward arrives at the end ([Sutton and Barto, 2018](#ref-sutton2018)). Value methods such as DQN estimate the worth of every action, which suits a small set of moves ([Mnih et al., 2015](#ref-mnih2015)). A language model picks from many thousands of tokens at every step, so I used a <span class="ft-def" tabindex="0">policy gradient<span class="ft-pop" role="tooltip">Raises the probability of the tokens in answers that scored well and lowers it for answers that scored badly (Williams, 1992).</span></span>.

A raw reward means little alone, because 0.93 is good or bad only next to what the model usually writes for that prompt. PPO trains a second network to estimate that number ([Schulman et al., 2017](#ref-schulman2017)). <span class="ft-def" tabindex="0">GRPO<span class="ft-pop" role="tooltip">Group Relative Policy Optimization. It samples a group of answers per prompt and scores each one against the group's mean (Shao et al., 2024).</span></span> skips that network and uses the mean of a group of samples, which saved me a whole network on my laptop.

**The group baseline also predicts which rules can move.** Two answers with equal scores give the gradient nothing, so a rule pushes the model only when its score differs between samples from the same prompt.

## Experiment 1: Examples, then RL
{: .ft-exp}

I first fine-tuned the model on examples, then ran RL against my rules and a judge.

**Setup**

- **Model:** Qwen3-1.7B with thinking off, trained through a rank-16 <span class="ft-def" tabindex="0">LoRA<span class="ft-pop" role="tooltip">A small trainable add-on to a frozen model's weights (Hu et al., 2022).</span></span>.
- **Examples:** 95 answers from Qwen3-4B, given my guide, that passed every rule and the judge.
- **RL:** 125 steps of GRPO with 4 prompts × 8 samples, temperature 0.7, and a KL penalty that holds the policy near the fine-tuned model.
- **Reward:** 0.5 × rule score + 0.5 × judge score, with Qwen3-4B as a local judge.
- **Metric:** usable rate on 50 held-out prompts × 4 samples, with 90% intervals from a paired bootstrap over prompts.

**Results**

<div class="ft-table-wrap">
<table class="ft-table">
  <thead><tr><th>Method</th><th>Usable</th><th>Change vs. base [90%]</th></tr></thead>
  <tbody>
    <tr><td><i style="background:var(--ft-true)"></i>Base</td><td>45.0%</td><td>reference</td></tr>
    <tr><td><i style="background:var(--ft-dfa)"></i>Base + style guide in the prompt</td><td>41.5%</td><td>−3.5 pts [−10.5, +3.0]</td></tr>
    <tr><td><i style="background:var(--ft-output)"></i>Fine-tuned on examples</td><td>29.5%</td><td>−15.5 pts [−22.5, −8.5]</td></tr>
    <tr class="ft-hl"><td><i style="background:var(--ft-apical)"></i>Fine-tuned, then RL</td><td>53.0%</td><td>+8.0 pts [+2.0, +13.5]</td></tr>
  </tbody>
</table>
</div>

<figure class="ft-fig">
  <div class="ft-card"><svg viewBox="0 0 640 260" role="img" aria-label="Usable rate by genre for each model"><line x1="44" x2="634" y1="222.0" y2="222.0" stroke="var(--ft-grid)"/><text class="ft-t" x="36" y="226.0" text-anchor="end">0%</text><line x1="44" x2="634" y1="169.5" y2="169.5" stroke="var(--ft-grid)"/><text class="ft-t" x="36" y="173.5" text-anchor="end">25%</text><line x1="44" x2="634" y1="117.0" y2="117.0" stroke="var(--ft-grid)"/><text class="ft-t" x="36" y="121.0" text-anchor="end">50%</text><line x1="44" x2="634" y1="64.5" y2="64.5" stroke="var(--ft-grid)"/><text class="ft-t" x="36" y="68.5" text-anchor="end">75%</text><line x1="44" x2="634" y1="12.0" y2="12.0" stroke="var(--ft-grid)"/><text class="ft-t" x="36" y="16.0" text-anchor="end">100%</text><rect x="58.0" y="127.5" width="26.6" height="94.5" rx="2" fill="var(--ft-true)"><title>Base, all: 45.0%</title></rect><rect x="87.6" y="134.9" width="26.6" height="87.1" rx="2" fill="var(--ft-dfa)"><title>Base + style guide in the prompt, all: 41.5%</title></rect><rect x="117.2" y="160.1" width="26.6" height="61.9" rx="2" fill="var(--ft-output)"><title>Fine-tuned on examples, all: 29.5%</title></rect><rect x="146.9" y="110.7" width="26.6" height="111.3" rx="2" fill="var(--ft-apical)"><title>Fine-tuned, then RL, all: 53.0%</title></rect><text class="ft-t" x="117.2" y="244" text-anchor="middle">all</text><rect x="204.5" y="46.0" width="26.6" height="176.0" rx="2" fill="var(--ft-true)"><title>Base, email: 83.8%</title></rect><rect x="234.1" y="52.1" width="26.6" height="169.9" rx="2" fill="var(--ft-dfa)"><title>Base + style guide in the prompt, email: 80.9%</title></rect><rect x="263.8" y="73.8" width="26.6" height="148.2" rx="2" fill="var(--ft-output)"><title>Fine-tuned on examples, email: 70.6%</title></rect><rect x="293.4" y="36.7" width="26.6" height="185.3" rx="2" fill="var(--ft-apical)"><title>Fine-tuned, then RL, email: 88.2%</title></rect><text class="ft-t" x="263.8" y="244" text-anchor="middle">email</text><rect x="351.0" y="197.3" width="26.6" height="24.7" rx="2" fill="var(--ft-true)"><title>Base, essay: 11.8%</title></rect><rect x="380.6" y="200.4" width="26.6" height="21.6" rx="2" fill="var(--ft-dfa)"><title>Base + style guide in the prompt, essay: 10.3%</title></rect><rect x="410.2" y="203.5" width="26.6" height="18.5" rx="2" fill="var(--ft-output)"><title>Fine-tuned on examples, essay: 8.8%</title></rect><rect x="439.9" y="160.2" width="26.6" height="61.8" rx="2" fill="var(--ft-apical)"><title>Fine-tuned, then RL, essay: 29.4%</title></rect><text class="ft-t" x="410.2" y="244" text-anchor="middle">essay</text><rect x="497.5" y="140.0" width="26.6" height="82.0" rx="2" fill="var(--ft-true)"><title>Base, blurb: 39.1%</title></rect><rect x="527.1" y="153.1" width="26.6" height="68.9" rx="2" fill="var(--ft-dfa)"><title>Base + style guide in the prompt, blurb: 32.8%</title></rect><rect x="556.8" y="205.6" width="26.6" height="16.4" rx="2" fill="var(--ft-output)"><title>Fine-tuned on examples, blurb: 7.8%</title></rect><rect x="586.4" y="136.7" width="26.6" height="85.3" rx="2" fill="var(--ft-apical)"><title>Fine-tuned, then RL, blurb: 40.6%</title></rect><text class="ft-t" x="556.8" y="244" text-anchor="middle">blurb</text></svg><div class="ft-legend"><span class="ft-k"><i style="background:var(--ft-true)"></i>Base</span><span class="ft-k"><i style="background:var(--ft-dfa)"></i>Base + style guide in the prompt</span><span class="ft-k"><i style="background:var(--ft-output)"></i>Fine-tuned on examples</span><span class="ft-k"><i style="background:var(--ft-apical)"></i>Fine-tuned, then RL</span></div></div>
  <figcaption><strong>RL gains most on essays.</strong> Usable rate on 50 held-out prompts × 4 samples, by genre, on the first run's 11 rules.</figcaption>
</figure>

Here are the base and RL models on the same prompts. I highlighted the phrase behind each failure:

<div class="qr-prompt">Write a 150-word paragraph for a fellowship application explaining what open problem in metabolic network modeling I want to work on next.</div>
<div class="qr-pair">
  <div class="qr-sample"><div class="qr-who"><span>base Qwen3-1.7B</span><span>coherence 5.0, responds 5.0</span></div><div class="qr-text">I am eager to explore an open problem in metabolic network modeling that involves the integration of multi-omics data to improve the accuracy of metabolic flux predictions in complex cellular systems. Current models often rely on static genome-scale reconstructions, which may not capture the dynamic and context-dependent nature of metabolic processes. <mark>My research interests lie</mark> in developing <mark>robust</mark> computational frameworks that can incorporate transcriptomic, proteomic, and metabolomic data into dynamic models, enabling more precise predictions of metabolic fluxes under varying environmental conditions. <mark>I aim to address</mark> the challenge of integrating heterogeneous data sources while maintaining model accuracy and biological relevance, ultimately advancing our understanding of metabolic pathways and their regulation in health and disease. This work <mark>has the potential</mark> to impact both basic research and clinical applications, making it a compelling area for my next fellowship.</div><div class="qr-verdict no">fails banned_phrasing</div></div>
  <div class="qr-sample"><div class="qr-who"><span>SFT + RL</span><span>coherence 5.0, responds 5.0</span></div><div class="qr-text">I’m interested in working on an open problem in metabolic network modeling that involves improving the accuracy of flux balance analysis in systems with complex regulatory interactions. This area requires developing methods to better predict enzyme activity under varying environmental conditions. My goal is to create a framework that integrates real-time data with existing models to <mark>enhance predictive power</mark>. I believe this approach will help researchers understand cellular responses more effectively. I’m eager to contribute to a project that addresses challenges in dynamic metabolic systems. My work will focus on refining computational tools that support experimental validation. I’m committed to <mark>advancing the field</mark> through rigorous analysis and practical application.</div><div class="qr-verdict ok">usable</div></div>
</div>
<div class="qr-prompt">Write a 100-word project blurb for my portfolio site about a project on EEG seizure localization.</div>
<div class="qr-pair">
  <div class="qr-sample"><div class="qr-who"><span>base Qwen3-1.7B</span><span>coherence 5.0, responds 5.0</span></div><div class="qr-text">**Project Blurb: EEG Seizure Localization**

This project focuses on the development of an algorithm for real-time EEG seizure localization using machine learning. By analyzing the unique electrical patterns associated with seizures, the system accurately identifies seizure onset and duration, providing <mark>critical insights</mark> for diagnosis and treatment. The project combines signal processing, neural network modeling, and clinical data to create a reliable and efficient tool for neurology. <mark>The results were validated</mark> using clinical datasets, demonstrating high accuracy and practical applicability. This work <mark>highlights the potential</mark> of EEG in early seizure detection and supports the development of more effective epilepsy management strategies.</div><div class="qr-verdict no">fails active_voice</div></div>
  <div class="qr-sample"><div class="qr-who"><span>SFT + RL</span><span>coherence 5.0, responds 5.0</span></div><div class="qr-text">I developed an EEG-based seizure localization system that accurately identifies seizure onset times and locations. The project involved signal processing algorithms to filter noise and detect abnormal brain activity patterns. I implemented real-time analysis using machine learning models trained on clinical EEG data. The system provides clinicians with precise diagnostic information to guide treatment decisions. The project emphasized accuracy, reliability, and user-friendly interface design. The solution has potential applications in emergency response and neurology care. The development process <mark>highlighted the importance</mark> of interdisciplinary collaboration and rigorous testing. The project demonstrates my ability to create effective, <mark>impactful technology solutions</mark>.</div><div class="qr-verdict ok">usable</div></div>
</div>
<div class="qr-prompt">Write a 100-word email to a collaborator giving a status update on my project on sparse autoencoders.</div>
<div class="qr-pair">
  <div class="qr-sample"><div class="qr-who"><span>base Qwen3-1.7B</span><span>coherence 5.0, responds 5.0</span></div><div class="qr-text">Subject: Status Update on Sparse Autoencoder Project

Hi [Collaborator&#x27;s Name],

I wanted to provide a quick status update on the sparse autoencoder project. We&#x27;ve made progress on the implementation, and the model is now trained on the first dataset. The results show promising recovery of latent features, especially in the early layers.

We&#x27;re currently working on optimizing the sparsity and evaluating the model&#x27;s performance on different datasets. Let me know if you&#x27;d like to discuss the next steps or if there&#x27;s anything specific you&#x27;d like to see in the next iteration.

Looking forward to your feedback.

Best,  
[Your Name]</div><div class="qr-verdict no">fails active_voice, length, leaves [Collaborator&#x27;s Name], [Your Name]</div></div>
  <div class="qr-sample"><div class="qr-who"><span>SFT + RL</span><span>coherence 5.0, responds 5.0</span></div><div class="qr-text">Subject: Status Update on Sparse Autoencoder Project  

Hi <mark>Alex</mark>,  

I’ve completed the first iteration of the sparse autoencoder model. The architecture now includes dropout layers and a regularization term. The training loss has stabilized at <mark>0.25</mark> after <mark>1000</mark> epochs. I’ve tested the model on the validation dataset and achieved a <mark>15%</mark> improvement in reconstruction accuracy. The next step is to refine the hyperparameters and evaluate performance on the test set. Let me know if you’d like to review the code or discuss next steps. Keep me posted on your end of the project.</div><div class="qr-verdict ok">usable, invents 0.25, 1000, 15%, Alex</div></div>
</div>

**Findings**

- **Fine-tuning made my model worse:** 29.5% usable, 15.5 points below base. A note I gave the example writer about sentence length came out as clipped sentences, and fine-tuned blurbs passed the flow rule 22% of the time against 100% for base.
- **Active voice didn't move:** it sat at 73 to 74% for every model. Its reward score already averaged about 0.95, which left GRPO almost no difference between samples to learn from.

**Takeaways**

- **A rule a parser can check is a rule RL can push,** as long as its score varies between samples.
- **Example data sets the model's habits.** RL polishes those habits and doesn't question them.

So RL mostly undid what fine-tuning broke. But look at the third pair above! The RL email invents a loss of 0.25 after 1000 epochs and a 15% gain, and my reward scored that email as usable.

## What the score missed

**A bug in my own checker.** My superlative pattern matched the sign-off "Best regards", so for a day the base model sat at 16.5% and RL looked far ahead. One regular expression moved my baseline by 28 points! Since then, I've re-scored the baseline after every checker fix.

**Invented facts.** A writing assistant knows only what the prompt tells it. Every RL status email stated results that the prompt never gave, and a third of my training examples stated facts the prompt never gave too. It also leaves fewer blanks than base.

<div class="ft-table-wrap">
<table class="ft-table">
  <thead><tr><th></th><th>Any invented fact</th><th>Status emails</th><th>Leaves a blank</th></tr></thead>
  <tbody>
    <tr><td>base</td><td>1.5%</td><td>8.3%</td><td>34.0%</td></tr>
    <tr><td>sft</td><td>19.0%</td><td>100.0%</td><td>10.0%</td></tr>
    <tr><td>rl</td><td>17.0%</td><td>100.0%</td><td>16.5%</td></tr>
    <tr><td>SFT data</td><td>33.7%</td><td>92.3%</td><td>29.5%</td></tr>
  </tbody>
</table>
</div>
<p class="qr-note">Answers that state a number, date or name the prompt never gave.</p>

**Slop.** I also flagged sentences that hide who acts, such as "The project highlighted the importance of interdisciplinary collaboration". That sentence passes every rule I wrote. No rule paid for naming an actor, so RL had no reason to keep doing it.

<div class="ft-table-wrap">
<table class="ft-table">
  <thead><tr><th></th><th>Any slop flag</th><th>Abstract subject</th><th>Weak main verb</th></tr></thead>
  <tbody>
    <tr><td>base</td><td>52%</td><td>24%</td><td>6%</td></tr>
    <tr><td>sft</td><td>28%</td><td>16%</td><td>3%</td></tr>
    <tr><td>rl</td><td>38%</td><td>26%</td><td>7%</td></tr>
  </tbody>
</table>
</div>
<p class="qr-note">Share of sentences with a flag.</p>

**Reading the outputs.** I read 20 random RL answers. None dodged a rule mechanically, and all 9 failures were real. But 6 of the 11 passes still broke my guide in ways the checkers miss, such as "invaluable" as an unsupported superlative. The eval also flagged possible gaming: "I aim" fell from 62 uses to 18, usually replaced by "My goal is to".

## Experiment 2: Clean data and two new rules
{: .ft-exp}

Both holes pointed to the same fix, so I retrained with better examples and a reward that pays for what the first one ignored.

**Setup**

- **Examples:** 57 of the 95 original examples that invent nothing, plus 32 new ones that pass the new checks.
- **New rules:** <code>no_invented</code> pays for facts the prompt gave and for blanks, and <code>agency</code> pays for sentences that name who acts.
- **Training and metric:** same as Experiment 1, reported on all 13 rules and on the first 11.

**Results**

<div class="ft-table-wrap">
<table class="ft-table">
  <thead><tr><th></th><th>Usable, 13 rules</th><th>Usable, first 11</th><th>Invents a fact</th><th>Passes agency</th><th>Flagged sentences</th></tr></thead>
  <tbody>
    <tr><td>base</td><td>31.0%</td><td>45.0%</td><td>1.5%</td><td>52.0%</td><td>31.3%</td></tr>
    <tr><td>rl</td><td>21.5%</td><td>53.0%</td><td>17.0%</td><td>42.5%</td><td>31.4%</td></tr>
    <tr><td>sft2</td><td>32.5%</td><td>36.0%</td><td>3.5%</td><td>68.5%</td><td>19.2%</td></tr>
    <tr class="ft-hl"><td>rl2</td><td>37.5%</td><td>51.5%</td><td>4.0%</td><td>57.5%</td><td>20.4%</td></tr>
  </tbody>
</table>
</div>

<div class="ft-table-wrap">
<table class="ft-table">
  <thead><tr><th>Comparison</th><th>13 rules</th><th>90% interval</th><th>First 11</th><th>90% interval</th></tr></thead>
  <tbody>
    <tr class="ft-hl"><td>rl2 − base</td><td>+6.5 pts</td><td>[+2.0, +11.0]</td><td>+6.5 pts</td><td>[+0.0, +13.0]</td></tr>
    <tr><td>rl2 − rl</td><td>+16.0 pts</td><td>[+9.0, +23.5]</td><td>−1.5 pts</td><td>[−7.5, +4.5]</td></tr>
    <tr><td>rl2 − sft2</td><td>+5.0 pts</td><td>[+0.5, +10.0]</td><td>+15.5 pts</td><td>[+8.5, +22.5]</td></tr>
  </tbody>
</table>
</div>

<p class="qr-note">sft2 and rl2 train on the cleaned examples, and rl is the first run. Flagged sentences hide who acts or lean on a weak verb.</p>

**Findings**

- **Paying for agency worked:** with no pay for it, the first RL run raised the flagged share from 21% to 31%. With pay, this one held it at 20%. The rule's pass rate did fall from 68% to 57%, but that came from my rounding. RL merged short sentences, and shorter drafts got a smaller allowance.
- **An old hole came back:** the model used "I" a quarter less after RL while banned phrasing rose 14 points. Avoiding "I" dodges the rule, and the sentences stay as they were.

**Takeaway:** RL trades away whatever the reward leaves out. Paying for agency stopped that trade, and the model's remaining flaws sit where my checkers don't look.

Which brings me to the next hole. About 7 of 20 answers I read still claim results the prompt never gave, such as "improved performance", and my check only looks for numbers, dates and names. Two answers also treated flux variability analysis as ecosystem gas flux, and the judge gave both 5 out of 5.

## Experiment 3: Claims with no number
{: .ft-exp}

Can I catch a made-up claim when it has no number in it?

**Setup**

- **Check:** <code>claims.py</code> flags a sentence when the writer or the writer's project asserts a fact the prompt never stated.
- **Labels:** two Claude models labeled 120 drafts under one guide and agreed at kappa 0.90. Neither labeler is a person.
- **Validation:** precision 0.87 [0.82, 0.91] and recall 0.82 [0.76, 0.88] on 20 prompts I kept out of the building. I saw that score once before fixing a parsing bug, so it may run a little high.

**Results**

<div class="ft-table-wrap">
<table class="ft-table">
  <thead><tr><th>Model</th><th>Claims per draft</th><th>Any claim</th><th>Email</th><th>Essay</th><th>Blurb</th></tr></thead>
  <tbody>
    <tr><td>base</td><td>1.68</td><td>60%</td><td>0.66</td><td>1.19</td><td>3.27</td></tr>
    <tr><td>base_rules</td><td>1.70</td><td>54%</td><td>0.54</td><td>1.09</td><td>3.58</td></tr>
    <tr><td>rl</td><td>3.00</td><td>66%</td><td>1.41</td><td>1.68</td><td>6.09</td></tr>
    <tr class="ft-hl"><td>rl2</td><td>3.04</td><td>73%</td><td>1.51</td><td>1.63</td><td>6.17</td></tr>
    <tr><td>sft</td><td>4.04</td><td>68%</td><td>1.16</td><td>2.71</td><td>8.50</td></tr>
    <tr><td>sft2</td><td>4.07</td><td>70%</td><td>1.29</td><td>2.93</td><td>8.22</td></tr>
    <tr><td>opus_plain</td><td>2.14</td><td>82%</td><td>2.06</td><td>1.24</td><td>3.19</td></tr>
    <tr><td>opus_rules</td><td>2.30</td><td>80%</td><td>1.94</td><td>1.59</td><td>3.44</td></tr>
  </tbody>
</table>
</div>

<p class="qr-note">The 1.7B rows use 4 samples per prompt, and the Opus rows use 1. A claim here means a sentence the writer must check, and it may be true.</p>

**Findings**

- **Fine-tuning more than doubled the rate,** from 1.68 to 4.04 claims per draft, and RL brought it back to 3.00.
- **Clean data changed almost nothing:** the first training examples carried 1.76 claims per draft and the cleaned ones 1.67, because I had cleaned them with a check that looks for numbers.

## Experiment 4: A harness for any draft
{: .ft-exp}

RL changes one small model. But if the checks work on text, they can repair a draft from any model, or from a person. My first harness swapped invented specifics for blanks and sent flagged sentences to a reviser model. It lifted base drafts from 36% to 66% usable, which looked great! Then I read the rewrites. "The analysis provides insights into system resilience" became "The analysis analyzes system resilience", and the false claims stayed in.

**Setup**

- **Cutting claims:** the harness cuts a claim after its verb and adds a blank, with no model involved. For example, "I've tested the model and it performs well" becomes "I've tested [what you tested]". A cut can only remove words.
- **Which claims:** results in every genre, and personal claims in emails. Every other claim goes on a list for the writer, since a blurb has to describe its project.
- **Checking rewrites:** a rewrite fails if it brings in a verb or subject noun from outside its sentence and the request, or if it changes the main tense.
- **Drafts:** the first sample of 50 held-out prompts from four sources, on all 13 rules.

**Results**

<div class="ft-table-wrap">
<table class="ft-table">
  <thead><tr><th>Drafts from</th><th>Claims per draft</th><th>In emails</th><th>Usable</th><th>Change [90%]</th><th>Slop sentences</th></tr></thead>
  <tbody>
    <tr><td>base</td><td>1.66 → 1.28</td><td>0.59 → 0.18</td><td>30% → 30%</td><td>+0 [−6, +8]</td><td>53% → 44%</td></tr>
    <tr><td>rl2</td><td>2.98 → 2.20</td><td>1.76 → 0.18</td><td>36% → 28%</td><td>−8 [−16, +0]</td><td>26% → 21%</td></tr>
    <tr><td>Opus 5.5, bare</td><td>2.14 → 1.64</td><td>2.06 → 1.12</td><td>16% → 22%</td><td>+6 [+2, +12]</td><td>21% → 17%</td></tr>
    <tr><td>Opus 5.5, guide</td><td>2.30 → 1.96</td><td>1.94 → 1.35</td><td>50% → 50%</td><td>+0 [−6, +6]</td><td>18% → 16%</td></tr>
  </tbody>
</table>
</div>

<p class="qr-note">50 drafts per row. rl2 is the second-run model, and "guide" means my style guide in the system prompt. The change column is in points.</p>

**Findings**

- **The big gain disappeared:** on the same 11 rules as the first harness, base drafts now go from 36% to 40%, and a version with the blanks but no rewrite checks reached only 42%. So most of the fall arrived with the blanks.
- **The judge marks down honest blanks:** of the 9 drafts that lost usable status, 8 had claims cut to blanks and scored below 4 on responds. The usable rate penalizes a repair that removes a false claim.

**Takeaway:** the 30-point gain counted drafts that still carried false claims. The harness now removes those claims reliably and leaves the usable rate about where it found it.

## Summary and next steps

To sum the results:

- **RL against my rules:** 45.0% → 53.0% usable on 11 rules.
- **RL on clean data with two new rules:** 31.0% → 37.5% usable on 13 rules, with invented facts at 4% against 17% for the first run.
- **Claims with no number:** a new check, at precision 0.87 and recall 0.82, finds 3.04 per draft from that same model.
- **The harness:** second-run drafts fall from 2.98 claims to 2.20, while usable drafts go from 36% to 28%.

Moving forward, I want to teach the judge that a blank is an honest answer, so the usable rate stops marking down a repair that removes a false claim. I'm also planning to stop rewriting the rules that ask for a new verb or subject, and list those sentences for the writer. The part I haven't built is taste. My style guide is a list I wrote by hand, and every phrase I cut from a draft is a labeled example of what I want, so learning rules from a person's edits is the next experiment. All of this rests on one seed per run and a small local judge, so I'd want more of both before trusting small differences.

Thanks for reading :)

## References

<ol class="ft-refs">
  <li id="ref-hu2022">Hu, E. J., Shen, Y., Wallis, P., et al. (2022). LoRA: Low-rank adaptation of large language models. <em>ICLR</em>.</li>
  <li id="ref-mnih2015">Mnih, V., Kavukcuoglu, K., Silver, D., et al. (2015). Human-level control through deep reinforcement learning. <em>Nature</em>, 518, 529–533.</li>
  <li id="ref-schulman2017">Schulman, J., Wolski, F., Dhariwal, P., Radford, A., and Klimov, O. (2017). <a href="https://arxiv.org/abs/1707.06347">Proximal policy optimization algorithms</a>. <em>arXiv:1707.06347</em>.</li>
  <li id="ref-shao2024">Shao, Z., Wang, P., Zhu, Q., et al. (2024). <a href="https://arxiv.org/abs/2402.03300">DeepSeekMath: Pushing the limits of mathematical reasoning in open language models</a>. <em>arXiv:2402.03300</em>.</li>
  <li id="ref-sutton2018">Sutton, R. S., and Barto, A. G. (2018). <a href="http://incompleteideas.net/book/the-book-2nd.html"><em>Reinforcement Learning: An Introduction</em></a> (2nd ed.). MIT Press.</li>
  <li id="ref-williams1992">Williams, R. J. (1992). Simple statistical gradient-following algorithms for connectionist reinforcement learning. <em>Machine Learning</em>, 8, 229–256.</li>
</ol>

<script src="/assets/js/forward-training.js?v=3" defer></script>
