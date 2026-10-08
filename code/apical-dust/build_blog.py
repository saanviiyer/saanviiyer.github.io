import json, math
import figs

rows = figs.summary()
R = lambda m, K: rows[(m, K)]
f3 = lambda x: f'{x:.3f}'
pm = lambda m, K: f'{R(m, K)["mean"]:.3f} ± {R(m, K)["sd"]:.3f}'
d16, l16 = figs.paired(rows, 'apicalcv', 'dust', 16)
d64, l64 = figs.paired(rows, 'apicalcv', 'dust', 64)
p16, _ = figs.paired(rows, 'apical', 'dust', 16)
p64, _ = figs.paired(rows, 'apical', 'dust', 64)
gainK = R('dust', 16)['mean'] - R('dust', 64)['mean']
equivK = 16 * 4 ** (-d16 / gainK)
fb16 = json.load(open('results/fbonly_K16_lr0.01_s0.json'))['test_at_best']
bias = json.load(open('results/bias.json'))
bk = lambda m, l, n: bias[m][str(n)][l]
d256, l256 = figs.paired(rows, 'apicalcv', 'dust', 256)
wins256 = sum(x < 0 for x in l256)
TIME = {16: 0.86, 64: 1.22, 256: 0.95}  # median step-time ratio, optimized Apical / Dust (bench2.log)
fast16 = json.load(open('results/apicalfast_K16_lr0.01_s0.json'))['test_at_best']

def legend(keys):
    return '<div class="legend">' + ''.join(
        f'<span><i style="background:{figs.COL[k]}"{" class=dash" if k == "bp" else ""}></i>{figs.LABEL[k]}</span>' for k in keys) + '</div>'

html = f'''<title>Apical Dust</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
/* Layout: one essay column (~40rem) with figures breaking slightly wider; method colors are fixed across every figure. */
:root {{
  --paper: #F2F4F6; --ink: #15202A; --muted: #5B6773; --rule: #D3D9DF; --rule-strong: #8A96A2; --grid: #E2E7EC; --panel: #FFFFFF;
  --c-bp: #15202A; --c-dust: #7059AE; --c-cv: #2D5C9E; --c-pw: #B8433B; --c-fb: #9A7516;
  --display: "Bricolage Grotesque", "Helvetica Neue", Arial, sans-serif;
  --body: "Source Serif 4", Georgia, "Times New Roman", serif;
  --mono: "JetBrains Mono", ui-monospace, Menlo, monospace;
}}
@media (prefers-color-scheme: dark) {{
  :root:not([data-theme="light"]) {{
    --paper: #0F151B; --ink: #E2E8EE; --muted: #93A0AC; --rule: #26313B; --rule-strong: #5F6C78; --grid: #1C252E; --panel: #151D25;
    --c-bp: #E2E8EE; --c-dust: #A592E3; --c-cv: #76A1E3; --c-pw: #E06D63; --c-fb: #D4AA4A; color-scheme: dark;
  }}
}}
:root[data-theme="dark"] {{
  --paper: #0F151B; --ink: #E2E8EE; --muted: #93A0AC; --rule: #26313B; --rule-strong: #5F6C78; --grid: #1C252E; --panel: #151D25;
  --c-bp: #E2E8EE; --c-dust: #A592E3; --c-cv: #76A1E3; --c-pw: #E06D63; --c-fb: #D4AA4A; color-scheme: dark;
}}
body {{ background: var(--paper); color: var(--ink); font-family: var(--body); font-size: 1.0625rem; line-height: 1.65; }}
.wrap {{ max-width: 46rem; margin: 0 auto; padding-inline: 20px; padding-block: 3.5rem 5rem; display: grid; gap: 2.75rem; }}
.col {{ max-width: 40rem; display: grid; gap: 1.1rem; }}
h1, h2, h3 {{ font-family: var(--display); text-wrap: balance; margin: 0; letter-spacing: -0.01em; }}
h1 {{ font-size: clamp(2rem, 5.5vw, 3rem); line-height: 1.08; font-weight: 700; }}
h2 {{ font-size: 1.5rem; font-weight: 700; padding-top: 0.5rem; }}
h3 {{ font-size: 1.1rem; font-weight: 500; }}
p, ul, ol {{ margin: 0; }}
ul, ol {{ padding-left: 1.2rem; display: grid; gap: 0.45rem; }}
a {{ color: var(--c-cv); text-underline-offset: 3px; }}
a:focus-visible {{ outline: 2px solid var(--c-cv); outline-offset: 2px; }}
.label {{ font-family: var(--mono); font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }}
.dek {{ font-size: 1.2rem; color: var(--ink); }}
.byline {{ font-family: var(--mono); font-size: 0.78rem; color: var(--muted); }}
.num {{ font-family: var(--mono); font-size: 0.9em; font-variant-numeric: tabular-nums; white-space: nowrap; }}
.tldr {{ background: var(--panel); border: 1px solid var(--rule); border-radius: 4px; padding: 1.25rem 1.4rem; display: grid; gap: 0.75rem; }}
.tldr ul {{ gap: 0.6rem; }}
.eq {{ font-family: var(--mono); font-size: 0.9rem; background: var(--panel); border-left: 2px solid var(--c-cv); padding: 0.75rem 1rem; overflow-x: auto; white-space: pre; line-height: 1.7; }}
figure {{ margin: 0; display: grid; gap: 0.6rem; }}
figure svg {{ width: 100%; height: auto; display: block; overflow: visible; }}
.figscroll {{ overflow-x: auto; }}
.figscroll svg {{ min-width: 560px; }}
figcaption {{ font-size: 0.9rem; color: var(--muted); max-width: 40rem; }}
figcaption b {{ color: var(--ink); font-weight: 600; }}
.legend {{ display: flex; flex-wrap: wrap; gap: 0.35rem 1.1rem; font-family: var(--mono); font-size: 0.75rem; color: var(--muted); }}
.legend span {{ display: inline-flex; align-items: center; gap: 0.45rem; }}
.legend i {{ width: 16px; height: 3px; display: inline-block; border-radius: 1px; }}
.legend i.dash {{ background: repeating-linear-gradient(90deg, var(--c-bp) 0 5px, transparent 5px 8px) !important; }}
svg .tk {{ font-family: var(--mono); font-size: 10.5px; fill: var(--muted); }}
svg .tk2 {{ font-family: var(--mono); font-size: 11px; fill: var(--ink); }}
svg .al {{ font-family: var(--mono); font-size: 11px; fill: var(--muted); }}
svg .pt {{ font-family: var(--display); font-size: 13px; font-weight: 500; fill: var(--ink); }}
.tablewrap {{ overflow-x: auto; }}
table {{ border-collapse: collapse; width: 100%; min-width: 30rem; font-size: 0.95rem; }}
th {{ text-align: left; font-family: var(--mono); font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); font-weight: 500; padding: 0 0.75rem 0.5rem 0; border-bottom: 1px solid var(--ink); }}
td {{ padding: 0.55rem 0.75rem 0.55rem 0; border-bottom: 1px solid var(--rule); font-variant-numeric: tabular-nums; }}
td.n {{ font-family: var(--mono); font-size: 0.85rem; }}
tr.hl td {{ font-weight: 600; }}
.note {{ font-size: 0.92rem; color: var(--muted); }}
.refs {{ font-size: 0.88rem; color: var(--muted); }}
.refs li {{ padding-left: 0.2rem; }}
footer {{ font-family: var(--mono); font-size: 0.75rem; color: var(--muted); border-top: 1px solid var(--rule); padding-top: 1rem; }}
</style>

<main class="wrap">
<header class="col">
  <p class="label">A sequel to Dust · October 2026</p>
  <h1>Apical Dust: a learned feedback pathway for training transformers without a backward pass</h1>
  <p class="dek">Dust estimates gradients from noise. Cortex pairs noise-driven plasticity with top-down feedback onto apical dendrites. Adding that feedback to Dust as an unbiased control variate lowers test loss at small populations, at about the same compute. The gain fades by K=256, and trusting the feedback more than a control variate does makes things worse.</p>
  <p class="byline">Small-scale study · character-level transformer · 3 seeds per cell</p>
</header>

<section class="col">
  <p>I was interested in Q Labs' new research on Dust because it is the first zeroth-order method competitive with backpropagation at pretraining transformers, and because at heart it is a biologically flavored learning rule. Noise in the activations, a reward signal and a local update are the same three ingredients as three-factor plasticity in the brain. My own recent work asks a skeptical question about rules like this: what do biologically constrained learning algorithms actually buy once the comparisons are fair? In continual learning, the answer has often been less than reported. Dust made me want to ask the constructive version. If I add one more piece of cortical machinery, top-down feedback onto apical dendrites, does training get better at the same population, and does the gain survive the same scrutiny?</p>
</section>

<section class="tldr" aria-label="Summary">
  <p class="label">TL;DR</p>
  <ul>
    <li><b>Apical</b> adds a learned feedback pathway to <a href="https://qlabs.sh/research/dust">Dust</a>. Each layer gets a linear prediction of its own output error from the network's output error. Both errors are estimated from forward passes only, and the feedback weights are learned from Dust's own estimates.</li>
    <li>Used as a <b>control variate</b>, the feedback leaves the estimate unbiased and lowers its variance. Test loss improves over Dust in all 6 seed-paired runs at small populations: <span class="num">{d16:+.3f}</span> at K=16 and <span class="num">{d64:+.3f}</span> at K=64 nats per character. With redundant work removed, an Apical step costs about the same wall-clock time as a Dust step.</li>
    <li>At K=16 that gain is what log-linear interpolation puts at Dust with about <b><span class="num">{equivK:.0f}</span></b> draws, roughly twice the population.</li>
    <li>The gain fades as the population grows. At K=256 the paired difference is <span class="num">{d256:+.3f}</span>, a tie. Dust's own ladder flattens there too, still <span class="num">{R("dust",256)["mean"] - R("bp",0)["mean"]:.3f}</span> above backprop, which points to bias that no variance reduction can remove.</li>
    <li>Trusting the feedback more is a trap. A precision-weighted version roughly triples per-step cosine to backprop, from <span class="num">{{PROBE16}}</span> to <span class="num">{{PROBEPW16}}</span> on the MLP at K=16, yet trains worse (<span class="num">{p16:+.3f}</span> at K=16). Its estimate is biased, and momentum accumulates bias while it averages away noise.</li>
    <li>Backprop is still ahead at this scale: <span class="num">{f3(R("bp", 0)["mean"])}</span> against <span class="num">{f3(R("apicalcv", 256)["mean"])}</span> for Apical at K=256.</li>
  </ul>
</section>

<section class="col">
  <h2>Where Dust leaves room</h2>
  <p>Dust trains a transformer without backpropagation. It adds Gaussian noise to the output of every linear layer, independently at every token, and rewards each token's noise by how much it lowered the loss. Every token becomes a member of a population, so one forward pass evaluates thousands of perturbations. The reward-weighted noise estimates the error at each layer's output, and its outer product with the layer's input is the weight gradient. The Dust paper shows this approaches backprop as the population grows.</p>
  <p>The cost is variance. With K draws and a d-dimensional layer output, the per-token estimate has noise that scales roughly with d/K. Dust buys accuracy with population, which is compute. This post asks whether a biological idea can buy some of that accuracy back more cheaply.</p>
</section>

<section class="col">
  <h2>The biological idea: feedback onto the apical dendrite</h2>
  <p>Cortical pyramidal neurons receive bottom-up input on their basal dendrites and top-down feedback on a separate apical dendrite. Several models of cortical learning treat the apical signal as a local, approximate error that tells each neuron which way to change (Guerguiev, Lillicrap and Richards, 2017). That signal is never exact. Lansdell, Prakash and Kording (2020) proposed that the brain could learn its feedback weights from noise. Neurons jitter, a neuromodulatory reward reports the outcome, and the correlation trains the feedback pathway. Dust already has the noise and the reward. It is missing the pathway.</p>
  <p>Apical adds it. For every module m we keep a feedback matrix <var>B<sub>m</sub></var> that maps the network's output error at a token, <var>e<sub>t</sub></var>, to a predicted error at that module's output.</p>
  <div class="eq">ĝ_pred(t)  =  B_m · e_t
e_t        =  Dust estimate of dLoss/dlogits at token t   (jitter the cached logits; no derivatives)
B_m        =  EMA ridge regression of Dust's estimates ĝ(t) on e_t</div>
  <p>Everything stays zeroth-order. The output error is itself estimated by perturbing the logits, which costs only a cross-entropy re-evaluation. The feedback weights are fit by regressing Dust's noisy estimates on <var>e<sub>t</sub></var>. Because the noise in those estimates is independent of <var>e<sub>t</sub></var>, it averages out of the fit.</p>
</section>

<section class="col">
  <h2>Three ways to use the feedback</h2>
  <p>A prediction of the gradient can enter the update in three ways. They differ in how far they trust it.</p>
  <ol>
    <li><b>Feedback only.</b> Update with <var>B<sub>m</sub> e<sub>t</sub></var> alone, as in learned feedback alignment. Noise trains the pathway but never touches the weights directly. Low variance, but biased wherever a linear map from the output error cannot express the true gradient.</li>
    <li><b>Control variate (Apical).</b> Subtract the part of each reward that the feedback already explains, estimate only the residual from noise, then add the prediction back.
      <div class="eq">r'(t)  =  r(t) + σ · ⟨ĝ_pred(t), a(t)⟩
ĝ(t)   =  ĝ_pred(t) − (1/Kσ) Σ_draws r'(t) a(t)</div>
      The expected correction cancels the prediction exactly, so the estimate stays unbiased whatever <var>B<sub>m</sub></var> is. Its noise now scales with the size of the residual <var>g − ĝ<sub>pred</sub></var>, not with <var>g</var>.</li>
    <li><b>Precision-weighted.</b> Shrink the residual toward the prediction by its estimated reliability, the way predictive-coding models weigh prediction errors by precision (Feldman and Friston, 2010). The reliability comes online from the agreement between the two halves of the population.</li>
  </ol>
</section>

<section class="col">
  <h2>Setup</h2>
  <p>Everything is small enough to run on a laptop GPU, so read the numbers as a mechanism study, not a scaling result.</p>
  <ul>
    <li>Character-level tiny Shakespeare (65 symbols), split 90/5/5 into train, validation and test.</li>
    <li>GPT-style transformer: 2 layers, width 128, 4 heads, context 64. Batch of 8 sequences (512 tokens) per step, 1000 steps.</li>
    <li>SGD with momentum 0.9 and a constant learning rate, tuned per method and population on seed 0 over {{0.003, 0.01, 0.03, 0.1}} at K=16 and 64, and over {{0.01, 0.03}} at K=256. Three seeds per cell at the tuned rate. Each seed fixes the initialization and data order, so seeds pair across methods.</li>
    <li>We report test loss at the best validation checkpoint, as in the Dust paper.</li>
    <li>Populations K = 16, 64 and 256. K counts draws per module per step. Each of the 13 jittered modules gets its own K draws, and the logits get 4K.</li>
  </ul>
  <p class="note">Our Dust is a faithful but simplified reimplementation. Attention keys and values are credited through a discounted sum of future token losses (γ = 0.9) rather than the paper's attention-output alignment. Every layer uses one noise scale (σ = 0.05). Layer norms have no learned gain. Absolute numbers will not match the paper's.</p>
</section>

<section class="col">
  <h2>Result 1: feedback makes every step look much better</h2>
  <p>We first measured the per-step cosine between each estimate and the backprop gradient on the same batch, at a partly trained checkpoint, as in the Dust paper's alignment analysis. By that measure the feedback is a huge win. At K=16 the precision-weighted estimate on the MLP input layer reaches <span class="num">{{PROBEPW16}}</span>, higher than Dust reaches at K=256. Feedback alone does almost as well on most layers. The unbiased control variate sits in between.</p>
</section>
<figure>
  {legend(['dust', 'cv', 'pw', 'fb'])}
  <div class="figscroll">{figs.fig_probe()}</div>
  <figcaption><b>Figure 1. Per-step alignment with backprop.</b> Cosine between each estimated weight gradient and the backprop gradient on the same batch, against population, averaged over layers of each type and 4 batches. Checkpoint: 300 backprop steps. Feedback fitted for 40 steps before measuring.</figcaption>
</figure>

<section class="col">
  <h2>Result 2: the estimates that look best are biased</h2>
  <p>The training sweep disagreed. The precision-weighted version trained worse than plain Dust at K=16, despite roughly three times the cosine. Per-step cosine mixes two different kinds of error. Noise is fresh every step, and momentum averages it out over roughly ten steps. Bias points the same way every step, and momentum adds it up.</p>
  <p>To separate the two, we fixed one batch and averaged more and more independent K=16 estimates. An unbiased estimator approaches cosine 1 as the average grows, while a biased one levels off. Dust and the control variate keep rising: on the values layer they reach <span class="num">{bk("dust","v",256):.2f}</span> and <span class="num">{bk("cv","v",256):.2f}</span> at 256 estimates. The feedback-based estimates stall, and on the keys layer they barely move: <span class="num">{bk("fb","k",256):.2f}</span> for feedback only and <span class="num">{bk("pw","k",256):.2f}</span> precision-weighted, against <span class="num">{bk("dust","k",256):.2f}</span> for Dust.</p>
  <p>The keys show why. A key at token t is read by later tokens, so its true gradient depends on errors that have not happened yet at t. The feedback pathway only sees the error at t, so it cannot represent that credit. The same holds, less severely, for values and for anything whose gradient depends on a token's own Jacobian, which a single linear map averages away.</p>
</section>
<figure>
  {legend(['dust', 'cv', 'pw', 'fb'])}
  <div class="figscroll">{figs.fig_bias()}</div>
  <figcaption><b>Figure 2. Averaging separates noise from bias.</b> Cosine to the backprop gradient of the mean of N independent K=16 estimates on a single fixed batch. Unbiased estimators (Dust, Apical) keep rising toward 1. Biased ones (feedback only, precision-weighted) level off. The embedding layers (not shown) level off near 0.7 for every method, which reflects Dust's own truncated credit for future tokens.</figcaption>
</figure>

<section class="col">
  <h2>Result 3: the unbiased version trains better than Dust, while noise dominates</h2>
  <p>Kept unbiased, the feedback helps where Dust is noisiest. Apical has lower test loss than Dust in every seed-paired comparison at K=16 and K=64, and it varies less across seeds, which is what variance reduction should do. At K=256 the advantage is gone: Apical wins {wins256} of 3 pairs, by <span class="num">{d256:+.3f}</span> on average.</p>
</section>
<div class="tablewrap">
<table>
  <thead><tr><th>Method</th><th>K = 16</th><th>K = 64</th><th>K = 256</th></tr></thead>
  <tbody>
    <tr><td>Dust</td><td class="n">{pm("dust",16)}</td><td class="n">{pm("dust",64)}</td><td class="n">{pm("dust",256)}</td></tr>
    <tr class="hl"><td>Apical (unbiased control variate)</td><td class="n">{pm("apicalcv",16)}</td><td class="n">{pm("apicalcv",64)}</td><td class="n">{pm("apicalcv",256)}</td></tr>
    <tr><td>Apical − Dust, paired</td><td class="n">{d16:+.3f} (3 of 3)</td><td class="n">{d64:+.3f} (3 of 3)</td><td class="n">{d256:+.3f} ({wins256} of 3)</td></tr>
    <tr><td>Precision-weighted</td><td class="n">{pm("apical",16)}</td><td class="n">{pm("apical",64)}</td><td class="n">not run</td></tr>
    <tr><td>Feedback only</td><td class="n">{fb16:.3f} (1 seed)</td><td class="n">not run</td><td class="n">not run</td></tr>
    <tr><td>Backprop</td><td class="n" colspan="3">{pm("bp",0)}</td></tr>
  </tbody>
</table>
</div>
<figure>
  <div class="figscroll">{figs.fig_dots(rows)}</div>
  <figcaption><b>Figure 3. Final test loss across the population ladder.</b> Dots are seeds, the black tick is the mean, and the dashed line is backprop. Feedback only is left out because it was run on one seed.</figcaption>
</figure>
<figure>
  {legend(['bp', 'dust', 'apicalcv', 'apical'])}
  <div class="figscroll">{figs.fig_curves(16)}</div>
  <figcaption><b>Figure 4. Validation loss during training at K=16</b>, mean of 3 seeds. The precision-weighted version falls behind within the first hundred steps and never catches up.</figcaption>
</figure>

<section class="col">
  <h2>Does the gain survive matched compute?</h2>
  <p>Equal population is not equal cost, so we timed it. In the sweep, my first implementation of Apical took about twice as long as Dust per run at K=16. At that price, Dust could simply double its population and match it. Almost all of that overhead was waste: a repeated clean forward pass, a second logit jitter, split-half estimates computed even when unused, and a 65-by-65 matrix inverse that forced a GPU-to-CPU sync every step. The method itself adds one small matrix product per module plus the regression update, about 1% of the arithmetic of the perturbed forward passes.</p>
  <p>With that waste removed, the median step time of Apical relative to Dust, over three interleaved rounds, was <span class="num">{TIME[16]:.2f}×</span> at K=16, <span class="num">{TIME[64]:.2f}×</span> at K=64 and <span class="num">{TIME[256]:.2f}×</span> at K=256. The machine was shared with other jobs, so read these as equal within about 20%. The optimized path does the same math with a different random stream, and one K=16 run with it reached <span class="num">{fast16:.3f}</span> against <span class="num">{rows[("apicalcv",16)]["vals"][0]:.3f}</span> for the original on the same seed. At K=16 the gain is worth about a doubling of population, well above a 20% cost, so it survives matched compute. It would not have survived the first implementation.</p>

  <h2>What the feedback buys, and what it does not</h2>
  <p>At K=16 the unbiased feedback pathway closes about {100*(-d16)/gainK:.0f}% of the gap between Dust at K=16 and Dust at K=64. The benefit shrinks as Dust's own noise falls: <span class="num">{d16:+.3f}</span>, then <span class="num">{d64:+.3f}</span>, then <span class="num">{d256:+.3f}</span> at K=256. That is what a control variate should do. It removes variance, and once variance is small there is little left for it to remove.</p>
  <p>What remains is bias, and no control variate removes it. Dust's own ladder flattens between K=64 and K=256 at about <span class="num">{R("dust",256)["mean"]:.3f}</span>, still <span class="num">{R("dust",256)["mean"] - R("bp",0)["mean"]:.3f}</span> above backprop. The averaging test behind Figure 2 shows where that bias sits: even with 256 estimates averaged, the embedding layers stay near cosine 0.7 for every method, because this Dust credits most layers only for their own token's loss and gives keys and values just a discounted share of the future. The Dust paper approaches backprop at populations in the thousands, with a better credit rule for attention than ours. A better feedback pathway cannot fix bias in the estimator it corrects.</p>
  <p>The more general lesson is about how to evaluate gradient estimators. Per-step cosine to backprop, the natural diagnostic, ranked these methods almost exactly backwards. An estimator can align better on every step and still train worse when its error is systematic. Any biologically inspired shortcut that trades noise for structure should be checked by averaging, as in Figure 2, before it is trusted in training.</p>
</section>

<section class="col">
  <h2>Limits</h2>
  <ul>
    <li>One small model, one character-level dataset, 512k training tokens and SGD only. The Dust paper's effects appear at much larger scale, and these may not carry over.</li>
    <li>Three seeds per cell. The improvement at K=16 and 64 is consistent (6 of 6 pairs) but small, between <span class="num">{max(l16+l64):+.3f}</span> and <span class="num">{min(l16+l64):+.3f}</span> per pair.</li>
    <li>Populations of 16, 64 and 256. The Dust paper's ladder runs from 64 to 16k, so we only cover its low end, and our gain is already gone by 256.</li>
    <li>Timings come from a shared laptop GPU and are accurate to about 20%. The trained results use the first implementation; the optimized one was checked on one seed only.</li>
    <li>The feedback map is linear in the current token's output error. A richer pathway, for example one that also sees future errors for keys and values, could predict more of the gradient. The control variate keeps it safe to try.</li>
  </ul>
</section>

<section class="col">
  <h2>References</h2>
  <ol class="refs">
    <li>Dahal, Mandal, Gülbahar and Vegesna. Dust: Pretraining Transformers Without Backpropagation. Q Labs, 2026. <a href="https://qlabs.sh/research/dust">qlabs.sh/research/dust</a></li>
    <li>Lansdell, Prakash and Kording. Learning to solve the credit assignment problem. ICLR, 2020.</li>
    <li>Guerguiev, Lillicrap and Richards. Towards deep learning with segregated dendrites. eLife, 2017.</li>
    <li>Lillicrap, Cownden, Tweed and Akerman. Random synaptic feedback weights support error backpropagation for deep learning. Nature Communications, 2016.</li>
    <li>Nøkland. Direct feedback alignment provides learning in deep neural networks. NeurIPS, 2016.</li>
    <li>Frémaux and Gerstner. Neuromodulated spike-timing-dependent plasticity, and theory of three-factor learning rules. Frontiers in Neural Circuits, 2016.</li>
    <li>Fiete and Seung. Gradient learning in spiking neural networks by dynamic perturbation of conductances. Physical Review Letters, 2006.</li>
    <li>Feldman and Friston. Attention, uncertainty, and free-energy. Frontiers in Human Neuroscience, 2010.</li>
    <li>Werfel, Xie and Seung. Learning curves for stochastic gradient descent in linear feedforward networks. NeurIPS, 2003.</li>
  </ol>
</section>

<footer>Independent follow-up to Dust. Code: apical.py (training), probe.py (Figure 1), bias.py (Figure 2), sweep.py (Figures 3 and 4).</footer>
</main>
'''
pr = figs.PROBE
html = html.replace('{PROBE16}', f'{pr["dust"][16]["fc1"]:.2f}').replace('{PROBEPW16}', f'{pr["pw"][16]["fc1"]:.2f}')
open('../apical-dust-blog.html', 'w').write(html)
print('ok', round(equivK, 1), round(-d16 / gainK, 3))
