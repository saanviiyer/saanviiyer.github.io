---
layout: post
title: "Can language models find the Demon? LLMs playing Blood on the Clocktower"
dek: "Testing whether the complexity of world-building in each script predicts where LLM players fail"
date: 2026-11-05
tag: "RL, games"
section: technical
rank: 4
math: true
permalink: /writing/botc-llms/
published: false
excerpt: "World-building in Blood on the Clocktower is linear-time in Trouble Brewing, NP-complete once the script is generalized, and undecidable in Bad Moon Rising and Sects & Violets. I plan to test whether that hierarchy predicts where frontier LLMs fail, and whether a small solver-backed agent trained with self-play beats them."
---

<link rel="stylesheet" href="/assets/css/forward-training.css?v=3">
<style>
  article.rp { overflow-x: clip; }
  .ft-todo { border-left: 3px solid var(--ft-edge); padding: 6px 0 6px 14px; color: var(--ft-muted, #777); font-style: italic; }
</style>

On 1 November 2026, Distributed Cognition reported that VINCO, a reinforcement learning agent with about 0.5M parameters, reached first place on the colonist.io 1v1 Catan ladder after less than a day of training on two GPUs ([Lass, 2026](#ref-vinco)). The same agent won 9 of 10 games against Opus 5.5 and against Fable 5.1 at high reasoning effort. Catan has hidden information and dice, so the result says that a small specialist can plan under uncertainty better than a model with trillions of parameters.

Catan hides only a few cards. In a <span class="ft-def" tabindex="0">social deduction game<span class="ft-pop" role="tooltip">A game in which an informed evil minority hides among an uninformed good majority. The good team must find the evil players from public talk, votes and deaths.</span></span>, almost everything is hidden, and other players lie to you on purpose. I want to know if the Catan result carries over to that setting, and I want to use a game where we already know how hard the reasoning is in theory.

**Status.** This post is a plan. I describe the game, the theory, the agents and the experiments. Every results section is empty until I run the games, and I mark each one. Terms in <span class="ft-def" tabindex="0">magenta<span class="ft-pop" role="tooltip">Like this. Hover over a magenta term for a short definition.</span></span> have a definition on hover.

## Why Blood on the Clocktower?

Blood on the Clocktower (BotC) is a social deduction game for 5 to 15 players ([Medway, 2022](#ref-medway2022)). A human <span class="ft-def" tabindex="0">Storyteller<span class="ft-pop" role="tooltip">The game master. The Storyteller knows every role, runs the night, gives each player their private information, and makes the rule choices that the rules leave open.</span></span> runs the game. Each player gets a secret character. Good players are <span class="ft-def" tabindex="0">Townsfolk<span class="ft-pop" role="tooltip">Good characters with helpful abilities, for example the Empath, who learns how many of their living neighbours are evil.</span></span> or <span class="ft-def" tabindex="0">Outsiders<span class="ft-pop" role="tooltip">Good characters whose abilities hurt the good team, for example the Drunk, who thinks they are a Townsfolk and gets false information.</span></span>. Evil players are Minions and one Demon. The Demon kills at night, and the good team wins if it executes the Demon during the day.

The core skill in BotC is <span class="ft-def" tabindex="0">world-building<span class="ft-pop" role="tooltip">Finding an assignment of hidden roles and unseen night actions that agrees with every public claim and event. Each such assignment is a "world".</span></span>. A player hears claims such as "I am the Empath and I got a 1 last night", and asks which assignments of roles explain everything that happened. A theory such as "Player C is the Demon" survives only if at least one valid world contains it.

Charlie Yang's recent paper on the complexity of BotC gives the reason this game is a good test ([Yang, 2026](#ref-yang2026)). It classifies world-building for each official script.

<div class="ft-table-wrap">
<table class="ft-table">
  <thead><tr><th>Script</th><th>Players</th><th>World-building complexity</th><th>Source of difficulty</th></tr></thead>
  <tbody>
    <tr><td>Trouble Brewing (TB)</td><td>5 to 15</td><td>\(O(t)\), linear in days</td><td>Few roles and a constant state space, so a dynamic program over days decides it</td></tr>
    <tr><td>Generalized TB</td><td>unbounded, duplicates allowed</td><td>NP-complete</td><td>Virgin and Investigator gadgets encode Vertex Cover</td></tr>
    <tr><td>Bad Moon Rising (BMR)</td><td>7 to 15</td><td>Undecidable</td><td>The Gossip may make any public statement, and a kill happens only if it is true</td></tr>
    <tr><td>Sects &amp; Violets (S&amp;V)</td><td>7 to 15</td><td>Undecidable</td><td>The Artist may ask the Storyteller any yes/no question</td></tr>
  </tbody>
</table>
</div>

For regular TB, Yang shows that the number of possible <span class="ft-def" tabindex="0">Grimoires<span class="ft-pop" role="tooltip">The Storyteller's record of the true game state: who has which character, who is poisoned or drunk, and so on.</span></span> is bounded by a constant, about \(\binom{22}{15}\cdot 15!\cdot 15^2\). A program then checks each candidate against the transcript one day at a time. The constant is very large, but the method is exact. So TB has a solver that is correct by construction, and I can use it to grade every LLM deduction.

The undecidability results need a careful reading. They come from statements such as "Turing machine \(M\) halts on input \(w\)". Real players never say that. The practical point for this project is different. In BMR and S&V, the information in the game depends on what free-text statements mean, and an exact solver cannot handle free text in general. An LLM reads free text without effort, so these scripts are where I expect an LLM to have an advantage over a solver, if it has one anywhere.

Yang also defines <span class="ft-def" tabindex="0">minimum-lying world-building<span class="ft-pop" role="tooltip">Given a transcript and a number ℓ, decide if a valid world exists in which at most ℓ good players lied. With ℓ = 0 this is ordinary world-building.</span></span>. Real good players sometimes bluff, and if any good player can lie, every contradiction has an excuse. The minimum-lying form asks how few good-player lies explain the game, and Yang suggests MaxSAT as the solver. I use it as the reference for the experiments where good players may bluff.

## My question

Does the complexity hierarchy predict where LLM players fail? I split this question into two parts. The first part is deduction alone. Given a fixed transcript, can an LLM find the set of valid worlds? The second part is play. In a full game with public talk and votes, does better deduction turn into more wins, and does a small trained agent beat the LLMs the way VINCO did in Catan?

My predictions, written before any game, are these. LLM deduction accuracy will fall as the number of days \(t\) grows in TB, even though the exact problem stays linear-time. Accuracy will fall faster on generalized TB instances as the Vertex Cover graph grows. In BMR and S&V, the gap between the solver-backed agent and the LLMs will shrink, because the solver must restrict the language of Gossip statements and Artist questions.

## The environment

I am building a text engine for BotC in Python. The engine plays the Storyteller, gives each seat its private information, and records a public transcript of claims, nominations, votes and deaths. Every seat receives the same text interface, so a seat can be an LLM, a scripted bot or a trained agent.

An automated Storyteller is the hardest part. For TB, the rulebook gives the Storyteller a small set of legal choices, such as what false number to show a poisoned Empath. The engine picks among them with a fixed policy that aims to keep the game balanced, and it logs every choice so that I can replay any game. For BMR and S&V, I restrict free text. Gossip statements must come from a grammar over the Grimoire, for example "Player 4 is a Minion" or "At least two Outsiders are in play". Artist questions use the same grammar. This restriction makes world-building decidable again. I report it as a limit of the study and not as a property of the real scripts.

**Setup**

- **Scripts:** TB, BMR and S&V at their official character lists, plus generalized TB instances built from Yang's Vertex Cover reduction.
- **Player counts:** 7, 10 and 13 for full games, so every script uses its standard role split.
- **Talk:** each day has a fixed number of public speaking rounds and private whisper slots, with a token limit per message, so that a long-winded model gains nothing from length.
- **Logging:** the full Grimoire, every Storyteller choice and every message, so that the solver can grade each claim after the game.

## The agents

**LLM players.** Frontier models play every seat on a team. Each model gets the official character sheet, the rules summary, its private information and the public transcript so far. Each model uses its highest reasoning setting, as in the Catan comparison.

**Solver-backed agent.** For TB, this agent runs the exact world enumeration from Yang's linear-time proof after each event. For BMR and S&V, it runs the same enumeration over the restricted grammar. It keeps a probability over worlds by counting them, with every legal Storyteller choice equally likely. Its talk is simple. As a good player it states its true character and information, and as an evil player it picks a bluff that keeps the most worlds open for the good team. This agent tests how far exact deduction alone gets you.

**Trained agent.** This agent is the counterpart to VINCO. It uses the solver's world probabilities as input, and a small policy network chooses nominations, votes and which claims to believe. I train it with self-play in the engine, with offline RL on solver-bot games first, as the Catan team did. The network stays under 1M parameters. Its talk comes from a fixed template, because the question is whether better decisions win games, and template talk keeps language skill out of that comparison.

## Experiment 1: Deduction without play
{: .ft-exp}

This experiment removes the social game. I give each model a finished transcript and ask, for each player, the probability that they are the Demon. The exact answer is the share of valid worlds in which that player is the Demon, which the solver computes.

**Setup**

- **Transcripts:** solver-bot games from the engine, cut at day \(t = 1\) to \(6\), with 200 transcripts per script and day.
- **Generalized TB:** Vertex Cover reduction instances on random graphs of 4 to 12 vertices. Each instance has a known answer, so I can grow the hard core of the problem while keeping the prose the same length.
- **Metrics:** <span class="ft-def" tabindex="0">Brier score<span class="ft-pop" role="tooltip">The mean squared gap between a predicted probability and the true outcome. Lower is better, and 0 is perfect.</span></span> against the true Demon, and total variation distance against the solver's exact distribution. The second metric matters because a model can guess the Demon well while it reasons about worlds badly.
- **Consistency check:** when a model names a player as "certainly good", I test whether any valid world makes that player evil. This counts confident errors that are impossible under the rules.

**Results**

<p class="ft-todo">Pending. Brier score and total variation distance by script and by day, with 95% bootstrap intervals over transcripts.</p>

## Experiment 2: Full games
{: .ft-exp}

This experiment is the main comparison. Every game seats one agent type on the good team and a fixed evil team, then swaps.

**Setup**

- **Tables:** all-LLM, all-solver-bot and all-trained-agent good teams against each evil team, for every pair of agent types.
- **Games per cell:** 100 per script and player count, with seats and characters rotated so that no agent always gets the same character.
- **Metrics:** good-team win rate with a <span class="ft-def" tabindex="0">Wilson interval<span class="ft-pop" role="tooltip">A confidence interval for a proportion that behaves well when the proportion is near 0 or 1, or the sample is small.</span></span>, the day on which the Demon is executed, and the share of executions that hit an evil player.
- **Design choice:** the Catan comparison played each LLM for 10 games against one agent, and it reported that the comparison was not a round-robin. I use a full round-robin with more games per cell, so that each difference has an interval.

**Results**

<p class="ft-todo">Pending. Win-rate table by script and agent pairing.</p>

## Experiment 3: Lies from the good team
{: .ft-exp}

Real good players bluff. A Fortune Teller may claim to be an Outsider so that the Demon does not kill them. This experiment allows a good bluff with a fixed probability, and it asks if each agent still finds the Demon.

**Setup**

- **Bluff rate:** 0, 10% and 25% of good players make one false claim during a game.
- **Reference:** the MaxSAT solution to minimum-lying world-building, which gives the smallest number of good lies that explains the transcript.
- **Metric:** how often an agent explains a contradiction by accusing an honest good player instead of the true liar, against the MaxSAT reference.

**Results**

<p class="ft-todo">Pending.</p>

## What would change my mind

If LLMs match the solver on TB deduction at every \(t\), then the complexity of the exact problem does not limit them, and the Catan result does not carry over to deduction. If the trained agent wins at deduction but loses full games to LLMs, then persuasion and lie detection matter more than world-building in this game, and I would need talk in the action space to make a fair specialist. If the solver-bot beats the LLMs on BMR and S&V as well, then my grammar restriction removed the part of those scripts that makes them hard, and I would report the result as a statement about the restricted game only.

## Limits

An automated Storyteller is not a human Storyteller. Human Storytellers bend information to keep a game close, and my fixed policy does not copy that well. The restricted grammar for Gossip and Artist changes the undecidable scripts into decidable ones, so Experiment 2 on BMR and S&V tests a smaller game. LLMs probably saw BotC strategy guides and play reports in pretraining, while the trained agent saw only the rules. I treat that as part of what an LLM brings to the table.

Thanks for reading, and I'd love ideas for which characters to add first :)

## References

<ol class="ft-refs">
  <li id="ref-yang2026">Yang, C. (2026). Computational complexity of Blood on the Clocktower. Manuscript, California Institute of Technology.</li>
  <li id="ref-vinco">Lass (2026). Solving 1v1 Catan. Distributed Cognition. <a href="http://distributed.inc/research/solving-1v1-catan/">distributed.inc/research/solving-1v1-catan</a></li>
  <li id="ref-medway2022">Medway, S. (2022). <em>Blood on the Clocktower: Rulebook and Almanac</em> (Trouble Brewing, Bad Moon Rising, Sects &amp; Violets). The Pandemonium Institute.</li>
  <li id="ref-braverman2008">Braverman, M., Etesami, O., and Mossel, E. (2008). Mafia: a theoretical study of players and coalitions in a partial information environment. <em>Annals of Applied Probability</em>, 18(3), 825–846.</li>
  <li id="ref-xu2023">Xu, Y., et al. (2023). Exploring large language models for communication games: an empirical study on Werewolf. arXiv:2309.04658.</li>
  <li id="ref-cicero2022">Meta Fundamental AI Research Diplomacy Team (FAIR) et al. (2022). Human-level play in the game of Diplomacy by combining language models with strategic reasoning. <em>Science</em>, 378, 1067–1074.</li>
</ol>
