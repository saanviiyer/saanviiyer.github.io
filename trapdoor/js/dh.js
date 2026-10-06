/* Module 2: Diffie-Hellman, and Module 3: ElGamal. */
(function () {
  'use strict';
  const { $, $$, esc, g, mod, gcd, modInv, modPow, modPowTrace, egcdTable, parseBig, pill, info, debounce, tick, traceTable, isProbablePrime, randInt, pick, iroot } = TD;

  /* ---------- helpers shared by DH and ElGamal ---------- */
  function orderOf(gv, p) { // multiplicative order of g mod p, only for small p
    let x = gv % p, k = 1n;
    while (x !== 1n) { x = x * gv % p; k++; if (k > p) return null; }
    return k;
  }
  function primitiveRoot(p) {
    const n = p - 1n, fs = [];
    let m = n;
    for (let d = 2n; d * d <= m; d++) if (m % d === 0n) { fs.push(d); while (m % d === 0n) m /= d; }
    if (m > 1n) fs.push(m);
    for (let c = 2n; c < p; c++) if (fs.every(f => modPow(c, n / f, p) !== 1n)) return c;
    return null;
  }
  const SMALL_SAFE = [23n, 47n, 59n, 83n, 107n, 167n, 179n, 227n, 263n, 347n, 359n, 383n, 467n, 479n, 503n, 563n, 587n, 719n, 839n, 863n, 887n, 983n];

  /* ---------- paint mixing ---------- */
  const hexToRgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const toLin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const toSrgb = c => { const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; return Math.round(Math.max(0, Math.min(1, v)) * 255); };
  // Paint behaves subtractively, so mix with a weighted geometric mean of linear reflectance.
  function mix(parts) {
    const W = parts.reduce((s, p) => s + p.w, 0);
    const ch = [0, 1, 2].map(i => Math.exp(parts.reduce((s, p) => s + p.w * Math.log(Math.max(0.002, toLin(hexToRgb(p.hex)[i]))), 0) / W));
    return '#' + ch.map(toSrgb).map(v => v.toString(16).padStart(2, '0')).join('');
  }
  const sw = (hex, label, sub = '') => `<div class="paint"><span class="blob" style="--c:${hex}"></span><span class="paint-l">${label}${sub ? `<span class="dim">${sub}</span>` : ''}</span></div>`;

  /* ================= Diffie-Hellman ================= */
  const root = $('#tab-dh');
  root.innerHTML = `
  <header class="tab-head">
    <span class="eyebrow">Module 2</span>
    <h2>Diffie-Hellman key exchange</h2>
    <p class="lede">Two people who have never met agree on a shared secret while an eavesdropper hears every word. Nothing secret is ever sent.</p>
    <p>The shared secret is then used as a key for fast ${g('symmetric', 'symmetric encryption')} such as AES. Every HTTPS connection you make does a version of this.</p>
  </header>

  <section class="block">
    <header><span class="eyebrow">The idea</span><h3>Mixing paint</h3></header>
    <div class="prose">
      <p>Alice and Bob agree in public on a common paint color. Each secretly picks a private color, stirs it into some common paint, and sends the mixture to the other. Then each stirs their own private color into the mixture they received.</p>
      <p>Both end up with one part common paint, one part Alice's color and one part Bob's color, so the same final shade. Eve heard everything. She has the common paint and both mixtures, but separating a mixture back into its ingredients is hard. If she pours the two mixtures together, she gets two parts common paint, which is a different shade.</p>
    </div>
    <div class="bench">
      <div class="row">
        <div class="field"><label for="pt-c">Common paint (public)</label><input id="pt-c" type="color" value="#e8c547"></div>
        <div class="field"><label for="pt-a">Alice's secret color</label><input id="pt-a" type="color" value="#b8325a"></div>
        <div class="field"><label for="pt-b">Bob's secret color</label><input id="pt-b" type="color" value="#2a6fb8"></div>
        <button type="button" class="btn" id="pt-rand">Random secrets</button>
      </div>
      <div class="trio" id="pt-flow"></div>
      <div class="scroll"><table class="tbl kv"><thead><tr><th class="l">Paint</th><th class="l">Real Diffie-Hellman</th></tr></thead><tbody>
        <tr><td class="l">Common paint</td><td class="l">Public numbers p and g</td></tr>
        <tr><td class="l">Secret colors</td><td class="l">Secret exponents a and b</td></tr>
        <tr><td class="l">Stirring in a color</td><td class="l">Raising to a power mod p</td></tr>
        <tr><td class="l">Mixtures sent across</td><td class="l">A = g<sup>a</sup> mod p and B = g<sup>b</sup> mod p</td></tr>
        <tr><td class="l">Unmixing is hard</td><td class="l">The ${g('dlog', 'discrete logarithm')} is hard</td></tr>
      </tbody></table></div>
    </div>
  </section>

  <section class="block">
    <header><span class="eyebrow">The real thing</span><h3>Step through the exchange</h3></header>
    <div class="explain">
      <div class="prose">
        <p>Alice and Bob agree on a large prime p and a ${g('generator', 'generator')} g. Alice picks a secret a and sends A = g<sup>a</sup> mod p. Bob picks a secret b and sends B = g<sup>b</sup> mod p. Alice computes B<sup>a</sup> and Bob computes A<sup>b</sup>. Both equal g<sup>ab</sup> mod p.</p>
        <p>Eve sees p, g, A and B. To get the secret she must recover a from A, the discrete logarithm problem. With p around 2048 bits nobody knows how to do that in any reasonable time.</p>
      </div>
      <div class="math"><span class="lab">The math</span>A = g<sup>a</sup> mod p, B = g<sup>b</sup> mod p<br>
        Alice: B<sup>a</sup> = (g<sup>b</sup>)<sup>a</sup> = g<sup>ab</sup> (mod p)<br>
        Bob: A<sup>b</sup> = (g<sup>a</sup>)<sup>b</sup> = g<sup>ab</sup> (mod p)</div>
    </div>
    <div class="bench">
      <div class="row">
        <div class="field"><label for="dh-p">p (prime)</label><input id="dh-p" class="inp num" inputmode="numeric" value="23"></div>
        <div class="field"><label for="dh-g">g</label><input id="dh-g" class="inp num" inputmode="numeric" value="5"></div>
        <div class="field"><label for="dh-a">Alice's secret a</label><input id="dh-a" class="inp num" inputmode="numeric" value="6"></div>
        <div class="field"><label for="dh-b">Bob's secret b</label><input id="dh-b" class="inp num" inputmode="numeric" value="15"></div>
        <button type="button" class="btn" id="dh-rand">Random secrets</button>
      </div>
      <div id="dh-check"></div>
      <div class="stepper">
        <button type="button" class="btn" id="dh-prev">Back</button>
        <span id="dh-stepno" class="mono small"></span>
        <button type="button" class="btn primary" id="dh-next">Next step</button>
        <button type="button" class="btn ghost" id="dh-all">Show all</button>
      </div>
      <p id="dh-caption" class="caption"></p>
      <div class="trio" id="dh-cols"></div>
      <div id="dh-traces"></div>
    </div>
    <div class="bench">
      <h4>Be Eve: brute-force the discrete log</h4>
      <p class="small">Eve tries a = 1, 2, 3, … and checks whether g<sup>a</sup> mod p equals A. For a small p this is instant. Each extra bit of p doubles the work for this method. Better methods exist, which is why real p has 2048 bits or more.</p>
      <div class="row"><button type="button" class="btn primary" id="dh-eve">Search for a</button></div>
      <div id="dh-eve-out"></div>
    </div>
  </section>
  <section class="block"><header><span class="eyebrow">Practice</span><h3>Try it yourself</h3></header><div id="dh-ch"></div></section>`;

  /* paint flow */
  function updatePaint() {
    const C = $('#pt-c').value, A = $('#pt-a').value, B = $('#pt-b').value;
    const CA = mix([{ hex: C, w: 1 }, { hex: A, w: 1 }]), CB = mix([{ hex: C, w: 1 }, { hex: B, w: 1 }]);
    const fa = mix([{ hex: C, w: 1 }, { hex: B, w: 1 }, { hex: A, w: 1 }]), fb = mix([{ hex: C, w: 1 }, { hex: A, w: 1 }, { hex: B, w: 1 }]);
    const eve = mix([{ hex: C, w: 2 }, { hex: A, w: 1 }, { hex: B, w: 1 }]);
    $('#pt-flow').innerHTML = `
      <div class="party alice"><h5>Alice</h5>
        ${sw(A, 'Secret color', 'never sent')}${sw(CA, 'Common + Alice', 'sent to Bob')}${sw(fa, 'Adds her secret to Bob\'s mix', 'shared secret')}</div>
      <div class="party public"><h5>Public channel, Eve listening</h5>
        ${sw(C, 'Common paint')}${sw(CA, 'Alice\'s mix in transit')}${sw(CB, 'Bob\'s mix in transit')}${sw(eve, 'Eve pours both mixes together', 'two parts common paint, wrong shade')}</div>
      <div class="party bob"><h5>Bob</h5>
        ${sw(B, 'Secret color', 'never sent')}${sw(CB, 'Common + Bob', 'sent to Alice')}${sw(fb, 'Adds his secret to Alice\'s mix', 'shared secret')}</div>`;
  }
  ['#pt-c', '#pt-a', '#pt-b'].forEach(s => $(s).addEventListener('input', updatePaint));
  $('#pt-rand').addEventListener('click', () => {
    const r = () => '#' + [0, 0, 0].map(() => randInt(30, 230).toString(16).padStart(2, '0')).join('');
    $('#pt-a').value = r(); $('#pt-b').value = r(); updatePaint();
  });
  updatePaint();

  /* modular exchange stepper */
  let cur = 1, dh = null;
  const STEPS = [
    'Alice and Bob agree in public on a prime p and a base g. Everyone, including Eve, can see these.',
    'Alice picks a secret a and computes A = g^a mod p. Bob does the same with his secret b.',
    'They swap A and B over the public channel. Eve copies both down.',
    'Each raises the number they received to their own secret. The results match.',
    'Eve has p, g, A and B, but not a or b. To get the secret she must solve a discrete logarithm.',
  ];
  function readDH() {
    const p = parseBig($('#dh-p').value), gv = parseBig($('#dh-g').value), a = parseBig($('#dh-a').value), b = parseBig($('#dh-b').value);
    const errs = [];
    if (p === null || p < 5n) errs.push('p must be a prime of at least 5');
    else if (p > 10n ** 30n) errs.push('Keep p below 10³⁰ for this demo');
    else if (!isProbablePrime(p)) errs.push(`p = ${p} is not prime`);
    if (!errs.length) {
      if (gv === null || gv < 2n || gv > p - 2n) errs.push(`g must be between 2 and ${p - 2n}`);
      if (a === null || a < 1n || a > p - 2n) errs.push(`a must be between 1 and ${p - 2n}`);
      if (b === null || b < 1n || b > p - 2n) errs.push(`b must be between 1 and ${p - 2n}`);
    }
    if (errs.length) return { errs };
    const A = modPow(gv, a, p), B = modPow(gv, b, p);
    return { p, g: gv, a, b, A, B, sA: modPow(B, a, p), sB: modPow(A, b, p) };
  }
  function renderDH() {
    dh = readDH();
    const chk = $('#dh-check');
    if (dh.errs) { chk.innerHTML = `<p class="small">${pill(false, dh.errs[0])}</p>`; $('#dh-cols').innerHTML = ''; $('#dh-traces').innerHTML = ''; return; }
    const { p, g: gv, a, b, A, B, sA, sB } = dh;
    let gen = '';
    if (p < 2000000n) {
      const ord = orderOf(gv, p);
      gen = ord === p - 1n
        ? `${info(`g = ${gv} is a primitive root`)} Its powers reach all ${p - 1n} nonzero values mod ${p}.`
        : `${info(`g = ${gv} only reaches ${ord} of the ${p - 1n} values`)} A smaller set is easier to search. ${primitiveRoot(p) ? `The smallest primitive root mod ${p} is ${primitiveRoot(p)}.` : ''}`;
    }
    chk.innerHTML = `<p class="small">${gen}</p>`;
    const vis = s => (s <= cur ? '' : ' hidden');
    $('#dh-stepno').textContent = `Step ${cur} of ${STEPS.length}`;
    $('#dh-caption').textContent = STEPS[cur - 1];
    $('#dh-prev').disabled = cur === 1; $('#dh-next').disabled = cur === STEPS.length;
    $('#dh-cols').innerHTML = `
      <div class="party alice"><h5>Alice</h5>
        <div class="fact"${vis(1)}>knows p = ${p}, g = ${gv}</div>
        <div class="fact secret"${vis(2)}>secret a = ${a}</div>
        <div class="fact"${vis(2)}>A = ${gv}<sup>${a}</sup> mod ${p} = <strong>${A}</strong></div>
        <div class="fact"${vis(3)}>receives B = ${B}</div>
        <div class="fact shared"${vis(4)}>s = B<sup>a</sup> = ${B}<sup>${a}</sup> mod ${p} = <strong>${sA}</strong></div></div>
      <div class="party public"><h5>Public channel</h5>
        <div class="fact"${vis(1)}>p = ${p}, g = ${gv}</div>
        <div class="fact"${vis(3)}>Alice → Bob: A = ${A}</div>
        <div class="fact"${vis(3)}>Bob → Alice: B = ${B}</div>
        <div class="fact eve"${vis(5)}>Eve knows p, g, A, B. She needs a with ${gv}<sup>a</sup> ≡ ${A} (mod ${p}).</div></div>
      <div class="party bob"><h5>Bob</h5>
        <div class="fact"${vis(1)}>knows p = ${p}, g = ${gv}</div>
        <div class="fact secret"${vis(2)}>secret b = ${b}</div>
        <div class="fact"${vis(2)}>B = ${gv}<sup>${b}</sup> mod ${p} = <strong>${B}</strong></div>
        <div class="fact"${vis(3)}>receives A = ${A}</div>
        <div class="fact shared"${vis(4)}>s = A<sup>b</sup> = ${A}<sup>${b}</sup> mod ${p} = <strong>${sB}</strong></div></div>`;
    $('#dh-traces').innerHTML = cur >= 4
      ? `<p class="small">${pill(sA === sB, sA === sB ? `Shared secret ${sA} on both sides` : 'Mismatch')}</p>
         <details class="more"><summary>Square-and-multiply for A = g<sup>a</sup> mod p</summary>${traceTable(modPowTrace(gv, a, p), { name: 'p' })}</details>
         <details class="more"><summary>Square-and-multiply for Alice's B<sup>a</sup> mod p</summary>${traceTable(modPowTrace(B, a, p), { name: 'p' })}</details>
         <details class="more"><summary>Square-and-multiply for Bob's A<sup>b</sup> mod p</summary>${traceTable(modPowTrace(A, b, p), { name: 'p' })}</details>`
      : '';
  }
  $('#dh-prev').addEventListener('click', () => { cur = Math.max(1, cur - 1); renderDH(); });
  $('#dh-next').addEventListener('click', () => { cur = Math.min(STEPS.length, cur + 1); renderDH(); });
  $('#dh-all').addEventListener('click', () => { cur = STEPS.length; renderDH(); });
  ['#dh-p', '#dh-g', '#dh-a', '#dh-b'].forEach(s => $(s).addEventListener('input', debounce(renderDH, 120)));
  $('#dh-rand').addEventListener('click', () => {
    const p = parseBig($('#dh-p').value);
    if (p === null || p < 5n) return;
    $('#dh-a').value = 2n + TD.randBelow(p - 4n); $('#dh-b').value = 2n + TD.randBelow(p - 4n); renderDH();
  });
  renderDH();

  $('#dh-eve').addEventListener('click', async () => {
    const out = $('#dh-eve-out');
    if (!dh || dh.errs) { out.innerHTML = `<p class="small">${pill(false, 'Fix the numbers above first')}</p>`; return; }
    const { p, g: gv, A, B, sA } = dh;
    const LIMIT = 3000000;
    out.innerHTML = '<p class="small dim">Searching…</p>';
    await tick();
    const t0 = performance.now();
    let x = gv % p, k = 1, found = null;
    while (k <= LIMIT) {
      if (x === A) { found = k; break; }
      x = x * gv % p; k++;
      if (k % 200000 === 0) await tick();
    }
    const ms = performance.now() - t0;
    if (found === null) {
      out.innerHTML = `<p class="small">${pill(false, `Gave up after ${LIMIT.toLocaleString()} tries (${ms.toFixed(0)} ms)`)} At this rate, trying all ${p - 1n} exponents would take ${((Number(p) / LIMIT) * ms / 1000 / 3600 / 24 / 365).toExponential(1)} years.</p>`;
      return;
    }
    const s = modPow(B, BigInt(found), p);
    out.innerHTML = `<div class="math">Found a = ${found}: ${gv}<sup>${found}</sup> mod ${p} = ${A} after ${found.toLocaleString()} tries (${ms.toFixed(1)} ms).<br>
      Eve computes B<sup>a</sup> = ${B}<sup>${found}</sup> mod ${p} = <strong>${s}</strong> ${pill(s === sA, s === sA ? 'she has the shared secret' : 'mismatch')}</div>`;
  });

  TD.challenge($('#dh-ch'), 'Diffie-Hellman', [
    () => {
      const p = pick(SMALL_SAFE), gv = primitiveRoot(p), a = BigInt(randInt(2, Number(p) - 2)), b = BigInt(randInt(2, Number(p) - 2)), B = modPow(gv, b, p), s = modPow(B, a, p);
      return { q: `<p>p = ${p}, g = ${gv}. You are Alice with secret a = ${a}. Bob sends B = ${B}. What is the shared secret?</p>`, check: TD.numCheck(s),
        hint: 'Alice computes B<sup>a</sup> mod p.', solution: `${B}<sup>${a}</sup> mod ${p} = ${s}. Bob gets the same from A<sup>b</sup> with b = ${b}.` };
    },
    () => {
      const p = pick(SMALL_SAFE), gv = primitiveRoot(p), a = BigInt(randInt(2, 12)), A = modPow(gv, a, p);
      return { q: `<p>p = ${p}, g = ${gv}, and Alice's secret is a = ${a}. What does she send?</p>`, check: TD.numCheck(A),
        hint: 'She sends A = g<sup>a</sup> mod p.', solution: `${gv}<sup>${a}</sup> mod ${p} = ${A}` };
    },
    () => {
      const p = pick([23n, 29n, 31n, 37n, 41n]), gv = primitiveRoot(p), a = BigInt(randInt(2, Number(p) - 2)), A = modPow(gv, a, p);
      return { q: `<p>Be Eve. p = ${p}, g = ${gv}, A = ${A}. Find Alice's secret a.</p>`,
        check: v => { const x = parseBig(v); return x !== null && x > 0n && modPow(gv, x, p) === A; },
        hint: `List ${gv}<sup>1</sup>, ${gv}<sup>2</sup>, … mod ${p} until you reach ${A}. Each power is the previous one times ${gv}, reduced mod ${p}.`,
        solution: `${gv}<sup>${a}</sup> mod ${p} = ${A}, so a = ${a}.` };
    },
  ]);

  /* ================= ElGamal ================= */
  const eg = $('#tab-elgamal');
  eg.innerHTML = `
  <header class="tab-head">
    <span class="eyebrow">Module 3</span>
    <h2>ElGamal encryption</h2>
    <p class="lede">ElGamal turns Diffie-Hellman into public-key encryption. Bob publishes his half of a Diffie-Hellman exchange once, as his public key. To send a message, Alice does her half on the spot and uses the shared secret as a mask.</p>
    <p>Because Alice picks a fresh random number every time, the same message encrypts differently every time. Textbook RSA cannot do that.</p>
  </header>
  <section class="block">
    <div class="explain">
      <div class="math"><span class="lab">The math</span>
        Key generation: pick prime p, generator g, secret x. Public key h = g<sup>x</sup> mod p.<br>
        Encrypt m (with 0 &lt; m &lt; p): pick a random ${g('ephemeral', 'one-time')} k.<br>
        &nbsp;&nbsp;c₁ = g<sup>k</sup> mod p &nbsp;&nbsp;(Alice's half of the exchange)<br>
        &nbsp;&nbsp;c₂ = m · h<sup>k</sup> mod p &nbsp;&nbsp;(the message times the shared secret)<br>
        Decrypt: s = c₁<sup>x</sup> mod p = g<sup>kx</sup> = h<sup>k</sup>, then m = c₂ · s<sup>−1</sup> mod p.</div>
    </div>
    <div class="bench">
      <h5 class="sub">1. Bob makes a key</h5>
      <div class="row">
        <div class="field"><label for="eg-p">p (prime)</label><input id="eg-p" class="inp num" inputmode="numeric" value="467"></div>
        <div class="field"><label for="eg-g">g</label><input id="eg-g" class="inp num" inputmode="numeric" value="2"></div>
        <div class="field"><label for="eg-x">Bob's secret x</label><input id="eg-x" class="inp num" inputmode="numeric" value="127"></div>
      </div>
      <div id="eg-key"></div>
      <h5 class="sub">2. Alice encrypts</h5>
      <div class="row">
        <div class="field"><label for="eg-m">Message m (a number below p)</label><input id="eg-m" class="inp num" inputmode="numeric" value="331"></div>
        <div class="field"><label for="eg-k">One-time k</label><input id="eg-k" class="inp num" inputmode="numeric" value="213"></div>
        <button type="button" class="btn" id="eg-newk">New random k</button>
      </div>
      <p class="small dim">To send a letter, use its ASCII code, for example A = 65.</p>
      <div id="eg-enc"></div>
      <h5 class="sub">3. Bob decrypts</h5>
      <div id="eg-dec"></div>
      <details class="more"><summary>Advanced: what goes wrong if k is reused</summary><div id="eg-reuse"></div></details>
    </div>
  </section>
  <section class="block"><header><span class="eyebrow">Practice</span><h3>Try it yourself</h3></header><div id="eg-ch"></div></section>`;

  function invTable(a, p) {
    const rows = egcdTable(p, a), one = rows.find(r => r.r === 1n);
    return `<div class="scroll"><table class="tbl compact"><thead><tr><th>q</th><th>r</th><th>t</th></tr></thead><tbody>
      ${rows.map(r => `<tr class="${r.r === 1n ? 'hit' : ''}"><td>${r.q ?? ''}</td><td>${r.r}</td><td>${r.t}</td></tr>`).join('')}</tbody></table></div>
      <p class="small">Remainder 1 appears with t = ${one.t}, so ${a}<sup>−1</sup> ≡ ${mod(one.t, p)} (mod ${p}).</p>`;
  }

  function renderEG() {
    const p = parseBig($('#eg-p').value), gv = parseBig($('#eg-g').value), x = parseBig($('#eg-x').value), m = parseBig($('#eg-m').value), k = parseBig($('#eg-k').value);
    const fail = msg => { $('#eg-key').innerHTML = `<p class="small">${pill(false, msg)}</p>`; ['#eg-enc', '#eg-dec', '#eg-reuse'].forEach(s => ($(s).innerHTML = '')); };
    if (p === null || p < 5n || p > 10n ** 30n || !isProbablePrime(p)) return fail('p must be a prime between 5 and 10³⁰');
    if (gv === null || gv < 2n || gv > p - 2n) return fail(`g must be between 2 and ${p - 2n}`);
    if (x === null || x < 1n || x > p - 2n) return fail(`x must be between 1 and ${p - 2n}`);
    const h = modPow(gv, x, p);
    $('#eg-key').innerHTML = `<div class="keycards">
      <div class="keycard pub"><div class="k-top"><span class="k-title">Public key</span><span class="k-who">(p, g, h)</span></div><div class="k-val">h = g<sup>x</sup> mod p = ${gv}<sup>${x}</sup> mod ${p} = ${h}</div></div>
      <div class="keycard priv"><div class="k-top"><span class="k-title">Private key</span><span class="k-who">kept by Bob</span></div><div class="k-val">x = ${x}</div></div></div>`;
    if (m === null || m < 1n || m >= p) { $('#eg-enc').innerHTML = `<p class="small">${pill(false, `m must be between 1 and ${p - 1n}`)}</p>`; $('#eg-dec').innerHTML = ''; return; }
    if (k === null || k < 1n || k > p - 2n) { $('#eg-enc').innerHTML = `<p class="small">${pill(false, `k must be between 1 and ${p - 2n}`)}</p>`; $('#eg-dec').innerHTML = ''; return; }
    const c1 = modPow(gv, k, p), hk = modPow(h, k, p), c2 = m * hk % p;
    $('#eg-enc').innerHTML = `<div class="math">
      c₁ = g<sup>k</sup> mod p = ${gv}<sup>${k}</sup> mod ${p} = <strong>${c1}</strong><br>
      shared mask h<sup>k</sup> mod p = ${h}<sup>${k}</sup> mod ${p} = ${hk}<br>
      c₂ = m · h<sup>k</sup> mod p = ${m} × ${hk} mod ${p} = <strong>${c2}</strong><br>
      Ciphertext: (c₁, c₂) = (${c1}, ${c2})</div>
      <p class="small dim">Press "New random k" a few times. The ciphertext changes every time, yet each one decrypts to the same m.</p>`;
    const s = modPow(c1, x, p), si = modInv(s, p), mm = c2 * si % p;
    $('#eg-dec').innerHTML = `<div class="math">
      s = c₁<sup>x</sup> mod p = ${c1}<sup>${x}</sup> mod ${p} = ${s} <span class="dim">(the same mask, without knowing k)</span><br>
      s<sup>−1</sup> mod p = ${si} <span class="dim">(check: ${s} × ${si} mod ${p} = ${s * si % p})</span><br>
      m = c₂ · s<sup>−1</sup> mod p = ${c2} × ${si} mod ${p} = <strong>${mm}</strong> ${pill(mm === m, 'recovered')}</div>
      <details class="more"><summary>Finding s<sup>−1</sup> with extended Euclid</summary>${invTable(s, p)}</details>`;
    // k reuse
    const m2 = (m * 7n + 3n) % p || 5n, c2b = m2 * hk % p;
    const rec = c2b * modInv(c2, p) % p * m % p;
    $('#eg-reuse').innerHTML = `<p class="small">Suppose Alice sends a second message m′ = ${m2} with the same k. Both ciphertexts share c₁ = ${c1}, and c₂′ = ${c2b}. If Eve ever learns the first message m = ${m} (say it was a standard greeting), she divides out the mask without any key:</p>
      <div class="math">m′ = c₂′ · c₂<sup>−1</sup> · m mod p = ${c2b} × ${modInv(c2, p)} × ${m} mod ${p} = <strong>${rec}</strong> ${pill(rec === m2, 'second message exposed')}</div>
      <p class="small dim">The same mistake in ElGamal-style signatures leaks the private key itself. That is how the PlayStation 3 signing key was extracted in 2010.</p>`;
  }
  ['#eg-p', '#eg-g', '#eg-x', '#eg-m', '#eg-k'].forEach(s => $(s).addEventListener('input', debounce(renderEG, 120)));
  $('#eg-newk').addEventListener('click', () => {
    const p = parseBig($('#eg-p').value); if (p === null || p < 5n) return;
    $('#eg-k').value = 2n + TD.randBelow(p - 4n); renderEG();
  });
  renderEG();

  TD.challenge($('#eg-ch'), 'ElGamal', [
    () => {
      const p = pick(SMALL_SAFE), gv = primitiveRoot(p), x = BigInt(randInt(2, Number(p) - 2)), h = modPow(gv, x, p);
      const m = BigInt(randInt(2, Number(p) - 1)), k = BigInt(randInt(2, Number(p) - 2)), c1 = modPow(gv, k, p), c2 = m * modPow(h, k, p) % p;
      const s = modPow(c1, x, p);
      return { q: `<p>p = ${p}, g = ${gv}, your private key is x = ${x}. Decrypt (c₁, c₂) = (${c1}, ${c2}).</p>`, check: TD.numCheck(m),
        hint: 'Compute s = c₁<sup>x</sup> mod p, then its inverse mod p, then multiply by c₂.',
        solution: `s = ${c1}<sup>${x}</sup> mod ${p} = ${s}. s<sup>−1</sup> = ${modInv(s, p)}. m = ${c2} × ${modInv(s, p)} mod ${p} = ${m}.` };
    },
    () => {
      const p = pick(SMALL_SAFE), gv = primitiveRoot(p), x = BigInt(randInt(2, 15)), h = modPow(gv, x, p);
      return { q: `<p>p = ${p}, g = ${gv}, private key x = ${x}. What is the public value h?</p>`, check: TD.numCheck(h), hint: 'h = g<sup>x</sup> mod p.', solution: `${gv}<sup>${x}</sup> mod ${p} = ${h}` };
    },
    () => {
      const p = pick(SMALL_SAFE), gv = primitiveRoot(p), h = modPow(gv, BigInt(randInt(2, 20)), p), m = BigInt(randInt(2, Number(p) - 1)), k = BigInt(randInt(2, 9));
      const c2 = m * modPow(h, k, p) % p;
      return { q: `<p>p = ${p}, g = ${gv}, Bob's public h = ${h}. Encrypt m = ${m} with k = ${k}. What is c₂? (c₁ = ${modPow(gv, k, p)}.)</p>`, check: TD.numCheck(c2),
        hint: 'c₂ = m · h<sup>k</sup> mod p.', solution: `h<sup>k</sup> = ${h}<sup>${k}</sup> mod ${p} = ${modPow(h, k, p)}. c₂ = ${m} × ${modPow(h, k, p)} mod ${p} = ${c2}.` };
    },
  ]);
})();
