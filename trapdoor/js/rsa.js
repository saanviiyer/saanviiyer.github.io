/* Module 1: RSA lab. Key generation, playground, worked example, why it works, attacks corner, challenges. */
(function () {
  'use strict';
  const { $, $$, esc, g, mod, gcd, gcdSteps, egcd, egcdTable, modInv, modPow, modPowTrace, trialDivision, parseBig,
    iroot, bitLen, pill, info, short, debounce, tick, utf8, fromUtf8, bytesToBig, bigToBytes, traceTable, randomPrime, randInt, pick } = TD;
  const root = $('#tab-rsa');
  const PRIMES = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113,
    127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251];
  const MAXP = 10n ** 12n;
  const S = TD.state.rsa;

  const step = (n, title, body) => `<li class="step"><div class="step-n" aria-hidden="true">${n}</div><div class="step-body"><h4><span class="sr">Step ${n}. </span>${title}</h4>${body}</div></li>`;

  root.innerHTML = `
  <header class="tab-head">
    <span class="eyebrow">Module 1</span>
    <h2>RSA lab</h2>
    <p class="lede">RSA is a lock with two different keys. The ${g('publickey', 'public key')} locks a message, and anyone may hold it. The ${g('privatekey', 'private key')} unlocks it, and only its owner holds it.</p>
    <p>It rests on a ${g('trapdoor', 'trapdoor function')}. Multiplying two primes takes a moment. Splitting the product back into those primes, called ${g('factoring', 'factoring')}, is hopelessly slow once the primes have hundreds of digits. The person who chose the primes keeps them as a shortcut.</p>
    <nav class="toc" aria-label="Sections of the RSA lab">
      <button type="button" class="btn small" data-jump="rsa-keygen">Key generation</button>
      <button type="button" class="btn small" data-jump="rsa-play">Encrypt and decrypt</button>
      <button type="button" class="btn small" data-jump="rsa-worked">Worked example</button>
      <button type="button" class="btn small" data-jump="rsa-why">Why it works</button>
      <button type="button" class="btn small" data-jump="rsa-attacks">Attacks corner</button>
      <button type="button" class="btn small" data-jump="rsa-try">Try it</button>
    </nav>
  </header>

  <section class="block" id="rsa-keygen">
    <header><span class="eyebrow">Part 1</span><h3>Key generation</h3></header>
    <div class="explain">
      <div class="prose">
        <p>You pick two secret primes and multiply them into a public number n. Then you derive two exponents that undo each other: e for locking and d for unlocking. Every number below is live. Change one and everything after it recomputes.</p>
      </div>
    </div>
    <ol class="steps">
      ${step(1, 'Pick two primes, p and q', `
        <p class="small">A ${g('prime', 'prime')} has no divisors except 1 and itself. To test a number we use ${g('trial', 'trial division')}: divide by 2, then by odd numbers, up to the square root. If n = a × b, one of a or b is at most √n, so searching past the square root can never find anything new.</p>
        <div class="row">
          <div class="field"><label for="rsa-p">p</label><input id="rsa-p" class="inp num" inputmode="numeric" autocomplete="off" value="61"></div>
          <div class="field"><label for="rsa-q">q</label><input id="rsa-q" class="inp num" inputmode="numeric" autocomplete="off" value="53"></div>
          <button type="button" class="btn" id="rsa-rand">Random pair from the list</button>
        </div>
        <div class="field">
          <div class="row tight"><span class="flabel">Prime list. A click fills</span>
            <span class="seg" role="group" aria-label="Which prime the list fills">
              <button type="button" aria-pressed="true" data-target="p">p</button><button type="button" aria-pressed="false" data-target="q">q</button>
            </span></div>
          <div class="chips" id="rsa-chips">${PRIMES.map(x => `<button type="button" class="chip" data-prime="${x}">${x}</button>`).join('')}</div>
        </div>
        <div class="two"><div id="rsa-pcheck"></div><div id="rsa-qcheck"></div></div>
        <div id="rsa-pqmsg"></div>`)}
      ${step(2, 'Compute n and φ(n)', `
        <p class="small">n is the public ${g('modulus', 'modulus')}. φ(n), said "phi of n", is ${g('totient', 'Euler\'s totient')}: how many numbers from 1 to n share no factor with n. For two distinct primes it is simply (p − 1)(q − 1). Whoever knows p and q gets φ(n) instantly. Whoever only knows n has to factor it first.</p>
        <div id="rsa-nphi" class="math"></div>`)}
      ${step(3, 'Choose the public exponent e', `
        <p class="small">e must satisfy 1 &lt; e &lt; φ(n) and be ${g('coprime', 'coprime')} to φ(n), meaning gcd(e, φ(n)) = 1. Otherwise no matching d exists. We check with the ${g('euclid', 'Euclidean algorithm')}: divide, keep the remainder, divide again. The last nonzero remainder is the ${g('gcd', 'greatest common divisor')}.</p>
        <div class="row">
          <div class="field"><label for="rsa-e">e</label><input id="rsa-e" class="inp num" inputmode="numeric" autocomplete="off" value="17"></div>
          <div class="field"><span class="flabel">Valid choices</span><div class="chips" id="rsa-esugg"></div></div>
        </div>
        <div id="rsa-echeck"></div>`)}
      ${step(4, 'Compute the private exponent d', `
        <p class="small">d undoes e. We need e × d to leave remainder 1 when divided by φ(n), which makes d the ${g('inverse', 'modular inverse')} of e. The ${g('egcd', 'extended Euclidean algorithm')} runs the same divisions as step 3 and also tracks how to write each remainder as s·φ(n) + t·e. Each new row is the row two above minus q times the row above. When the remainder reaches 1, t is the inverse.</p>
        <div id="rsa-dcalc"></div>`)}
      ${step(5, 'Your key pair', `<div id="rsa-keys"></div>`)}
    </ol>
  </section>

  <section class="block" id="rsa-play">
    <header><span class="eyebrow">Part 2</span><h3>Encrypt and decrypt</h3></header>
    <div class="explain">
      <div class="prose">
        <p>RSA works on numbers, not letters. First each character becomes its byte value, its ${g('encoding', 'ASCII code')}. If n is large enough, several bytes are packed into one ${g('block', 'block')}. Every block m must be smaller than n.</p>
        <p>Raising a number to the power 17 one multiplication at a time is fine. Real exponents have hundreds of digits, so RSA uses ${g('sqmul', 'square-and-multiply')}, which needs about two operations per bit of the exponent. Pick a row in a table to see its steps.</p>
      </div>
      <div class="math"><span class="lab">The math</span>encrypt: c = m<sup>e</sup> mod n<br>decrypt: m = c<sup>d</sup> mod n</div>
    </div>
    <div class="bench">
      <div class="row">
        <div class="field"><label for="pl-n">n</label><input id="pl-n" class="inp num" inputmode="numeric" autocomplete="off"></div>
        <div class="field"><label for="pl-e">e</label><input id="pl-e" class="inp num" inputmode="numeric" autocomplete="off"></div>
        <div class="field"><label for="pl-d">d</label><input id="pl-d" class="inp num" inputmode="numeric" autocomplete="off"></div>
        <button type="button" class="btn" id="pl-sync">Use the key from Part 1</button>
      </div>
      <div id="pl-keystat"></div>
      <div class="field"><label for="pl-msg">Message</label><input id="pl-msg" class="inp" autocomplete="off" value="HELLO" maxlength="80"></div>
      <h5 class="sub">1. Text to numbers</h5>
      <div id="pl-encode"></div>
      <h5 class="sub">2. Encrypt each block with the public key</h5>
      <div id="pl-enc"></div>
      <div id="pl-enc-trace" class="trace"></div>
      <div id="pl-ct-out"></div>
    </div>
    <div class="bench">
      <h5 class="sub">3. Decrypt with the private key</h5>
      <div class="field"><label for="pl-ct">Ciphertext blocks, separated by commas or spaces</label><textarea id="pl-ct" class="inp" rows="2" spellcheck="false"></textarea></div>
      <div class="row"><button type="button" class="btn small" id="pl-ct-reset">Use the ciphertext above</button></div>
      <div id="pl-dec"></div>
      <div id="pl-dec-trace" class="trace"></div>
      <div id="pl-dec-out"></div>
    </div>
  </section>

  <section class="block" id="rsa-worked">
    <header><span class="eyebrow">Part 3</span><h3>One complete worked example</h3></header>
    <div class="bench" id="rsa-worked-body"></div>
  </section>

  <section class="block" id="rsa-why">
    <header><span class="eyebrow">Part 4</span><h3>Why decryption undoes encryption</h3></header>
    <div class="explain">
      <div class="prose">
        <p>Encrypting raises m to the power e. Decrypting raises the result to the power d. Together that is m raised to e × d. The keys were built so that e × d is exactly one more than a multiple of φ(n). Call it e × d = 1 + k × φ(n).</p>
        <p>Euler noticed a pattern in remainders. Take a number that shares no factor with n and keep multiplying it by itself mod n. The remainders go round in a cycle, and the cycle length always divides φ(n). So raising to any multiple of φ(n) lands exactly on 1. The k × φ(n) part of the exponent collapses to 1, and the single leftover m is all that remains.</p>
      </div>
      <div class="math"><span class="lab">The formal statement</span>${g('euler', 'Euler\'s theorem')}: if gcd(m, n) = 1, then m<sup>φ(n)</sup> ≡ 1 (mod n).<br><br>
        Since e·d = 1 + k·φ(n):<br>
        m<sup>e·d</sup> = m<sup>1 + k·φ(n)</sup> = m · (m<sup>φ(n)</sup>)<sup>k</sup> ≡ m · 1<sup>k</sup> = m (mod n).<br><br>
        <span class="dim">If m shares a factor with n (m is a multiple of p or q), the result still holds. Apply ${g('fermat', 'Fermat\'s little theorem')} mod p and mod q separately and join them with the ${g('crt', 'Chinese remainder theorem')}.</span></div>
    </div>
    <div class="bench">
      <div class="row">
        <div class="field"><label for="why-m">Pick any m below n</label><input id="why-m" class="inp num" inputmode="numeric" autocomplete="off" value="65"></div>
      </div>
      <div id="why-out"></div>
    </div>
  </section>

  <section class="block" id="rsa-attacks">
    <header><span class="eyebrow">Part 5 · advanced</span><h3>Attacks corner</h3></header>
    <div class="prose"><p>RSA is only as strong as the way it is used. Each panel below breaks a badly built RSA setup in your browser, using only public information. The fixes are the reasons real RSA looks the way it does.</p></div>

    <div class="bench" id="atk-factor">
      <h4>Small n: just factor it</h4>
      <p class="small">The public key contains n. If n is small enough to factor, an attacker gets p and q, then φ(n), then d. Your key from Part 1 is tiny, so this takes a fraction of a second.</p>
      <div class="row"><button type="button" class="btn primary" id="atk-factor-go">Break the key from Part 1</button></div>
      <div id="atk-factor-out"></div>
    </div>

    <div class="bench" id="atk-size">
      <h4>How big is big enough?</h4>
      <p class="small">Drag the slider to change the size of n in bits. The estimates use published records and standard formulas. They are rough, and they say so where they are.</p>
      <div class="field"><label for="ks-range">Size of n: <strong id="ks-bits" class="mono"></strong></label>
        <input id="ks-range" type="range" min="0" max="0" step="1" value="0"></div>
      <div id="ks-out"></div>
      <div class="row"><button type="button" class="btn" id="ks-live">Generate and factor one live</button></div>
      <div id="ks-live-out"></div>
    </div>

    <div class="bench" id="atk-smalle">
      <h4>Small e without padding</h4>
      <p class="small">e = 3 makes encryption fast, and it is safe with proper ${g('padding', 'padding')}. Without padding a short message m is small, so m³ never even reaches n. The "mod n" does nothing, and an ordinary cube root recovers m. Sending the same message to three people is worse: ${g('hastad', 'Håstad\'s broadcast attack')} rebuilds m³ with the ${g('crt', 'Chinese remainder theorem')} even when the message is longer.</p>
      <div class="row">
        <div class="field grow"><label for="se-msg">Secret message</label><input id="se-msg" class="inp" value="attack at dawn" maxlength="60" autocomplete="off"></div>
        <button type="button" class="btn primary" id="se-go">Generate three 512-bit keys with e = 3</button>
      </div>
      <div id="se-out"><p class="small dim">Press the button to generate keys. It takes about a second.</p></div>
    </div>

    <div class="bench" id="atk-cm">
      <h4>Common modulus</h4>
      <p class="small">An organization hands two people the same n but different exponents e₁ and e₂. Someone sends both of them the same message. An eavesdropper sees c₁ and c₂ and recovers m without any private key. The ${g('egcd', 'extended Euclidean algorithm')} finds s₁, s₂ with s₁·e₁ + s₂·e₂ = 1, and then c₁<sup>s₁</sup> · c₂<sup>s₂</sup> = m<sup>s₁e₁ + s₂e₂</sup> = m.</p>
      <div class="row">
        <div class="field"><label for="cm-e2">Second exponent e₂</label><input id="cm-e2" class="inp num" inputmode="numeric" value="7"></div>
        <div class="field"><label for="cm-m">Message m</label><input id="cm-m" class="inp num" inputmode="numeric" value="1234"></div>
      </div>
      <div id="cm-out"></div>
    </div>

    <div class="bench" id="atk-pq">
      <h4>p and q must be large, random and distinct</h4>
      <div class="sub-grid">
        <div class="sub-panel">
          <h5 class="sub">Distinct: what if p = q?</h5>
          <div class="row">
            <div class="field"><label for="pq-same">p = q</label><input id="pq-same" class="inp num" inputmode="numeric" value="61"></div>
            <div class="field"><label for="pq-same-e">e</label><input id="pq-same-e" class="inp num" inputmode="numeric" value="7"></div>
          </div>
          <div id="pq-same-out"></div>
        </div>
        <div class="sub-panel">
          <h5 class="sub">Far apart: what if p and q are close?</h5>
          <p class="small">${g('fermatfact', 'Fermat factorization')} writes n = a² − b² = (a − b)(a + b). Start at a = ⌈√n⌉ and step up until a² − n is a perfect square. When p and q are close, the first try usually wins.</p>
          <div class="row">
            <div class="field"><label for="ff-p">p</label><input id="ff-p" class="inp num" inputmode="numeric" value="10007"></div>
            <div class="field"><label for="ff-q">q</label><input id="ff-q" class="inp num" inputmode="numeric" value="10009"></div>
            <button type="button" class="btn small" id="ff-close">Close pair</button>
            <button type="button" class="btn small" id="ff-far">Far pair</button>
          </div>
          <div id="ff-out"></div>
        </div>
        <div class="sub-panel">
          <h5 class="sub">Random: what if two keys share a prime?</h5>
          <p class="small">A weak random number generator, common in devices that boot with little entropy, can hand the same p to two different keys. Then gcd(n₁, n₂) = p, and Euclid finds it in a few dozen divisions. Researchers in 2012 recovered private keys for tens of thousands of real network devices this way.</p>
          <div class="row"><button type="button" class="btn" id="sp-go">Make two keys with a shared prime</button></div>
          <div id="sp-out"></div>
        </div>
      </div>
    </div>
  </section>

  <section class="block" id="rsa-try">
    <header><span class="eyebrow">Practice</span><h3>Try it yourself</h3></header>
    <div class="ch-grid"><div id="rsa-ch1"></div><div id="rsa-ch2"></div></div>
  </section>`;

  root.addEventListener('click', e => {
    const j = e.target.closest('[data-jump]');
    if (j) document.getElementById(j.dataset.jump).scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });

  /* ================= Part 1: key generation ================= */
  const pIn = $('#rsa-p'), qIn = $('#rsa-q'), eIn = $('#rsa-e');
  let target = 'p';

  function primeReport(name, n) {
    if (n === null) return { ok: false, html: `<div class="check"><p class="small">${pill(false, `${name} is not a whole number`)}</p></div>` };
    if (n > MAXP) return { ok: false, html: `<div class="check"><p class="small">${pill(false, 'Too large for this demo')} Keep ${name} below 10<sup>12</sup> so trial division stays quick. Real keys use primes with about 300 digits, tested with ${g('probprime', 'probabilistic tests')}.</p></div>` };
    if (n < 2n) return { ok: false, html: `<div class="check"><p class="small">${pill(false, `${name} = ${n} is not prime`)} Primes start at 2.</p></div>` };
    const t = trialDivision(n);
    const rows = [...t.head];
    const hidden = t.tested - t.head.length - t.tail.length;
    const tr = r => `<tr class="${r.r === 0n ? 'hit-bad' : ''}"><td>${n} mod ${r.d}</td><td>${r.r}</td></tr>`;
    let body = rows.map(tr).join('');
    if (hidden > 0) body += `<tr><td colspan="2" class="l dim">… ${hidden.toLocaleString()} more divisors, none divide evenly …</td></tr>`;
    body += t.tail.map(tr).join('');
    const approx = Math.sqrt(Number(n));
    const verdict = t.prime ? pill(true, `${name} = ${n} is prime`) : pill(false, `${name} = ${n} is not prime: ${t.factor} × ${n / t.factor}`);
    const intro = t.lim < 2n
      ? `√${n} ≈ ${approx.toFixed(2)}, so there is nothing to test.`
      : `√${n} ≈ ${approx.toFixed(2)}, so test divisors up to ${t.lim}. ${t.tested.toLocaleString()} division${t.tested === 1 ? '' : 's'}.`;
    return {
      ok: t.prime,
      html: `<div class="check"><p class="small">${verdict}</p><p class="small dim">${intro}</p>
        ${t.tested ? `<div class="scroll"><table class="tbl compact"><thead><tr><th>test</th><th>remainder</th></tr></thead><tbody>${body}</tbody></table></div>` : ''}</div>`,
    };
  }

  function euclidLines(a, b) {
    const { g: gg, rows } = gcdSteps(a, b);
    const shown = rows.length > 14 ? [...rows.slice(0, 10), null, ...rows.slice(-3)] : rows;
    return {
      g: gg,
      html: shown.map(r => r ? `${r.a} = ${r.q} × ${r.b} + ${r.r}` : `<span class="dim">… ${rows.length - 13} more rows …</span>`).join('<br>'),
    };
  }

  function egcdHTML(phi, e) {
    const rows = egcdTable(phi, e);
    const body = rows.map((r, i) => {
      const last = r.r === 0n, hit = r.r === 1n;
      return `<tr class="${hit ? 'hit' : ''} ${last ? 'dimrow' : ''}"><td>${i}</td><td>${r.q === null ? '' : r.q}</td><td>${r.r}</td><td>${r.s}</td><td>${r.t}</td>
        <td class="l">${last ? 'remainder 0, stop' : `${r.s}·${phi} + ${r.t < 0n ? '(' + r.t + ')' : r.t}·${e} = ${r.s * phi + r.t * e}`}</td></tr>`;
    }).join('');
    const one = rows.find(r => r.r === 1n);
    const d = mod(one.t, phi);
    return {
      d,
      html: `<div class="scroll"><table class="tbl">
        <thead><tr><th>row</th><th>q</th><th>remainder r</th><th>s</th><th>t</th><th class="l">check: s·φ(n) + t·e = r</th></tr></thead>
        <tbody>${body}</tbody></table></div>
        <div class="math">The highlighted row says ${one.s}·φ(n) + ${one.t}·e = 1.<br>
        Read it mod φ(n): the φ(n) term vanishes, so ${one.t} · e ≡ 1.<br>
        d = ${one.t} mod ${phi} = <strong>${d}</strong><br>
        Check: e × d = ${e} × ${d} = ${e * d} = ${(e * d) / phi} × ${phi} + ${(e * d) % phi} ${pill((e * d) % phi === 1n, 'remainder 1')}</div>`,
    };
  }

  function waiting(msg) { return `<p class="small dim">${msg}</p>`; }

  function updateKeygen() {
    const p = parseBig(pIn.value), q = parseBig(qIn.value), e = parseBig(eIn.value);
    const pr = primeReport('p', p), qr = primeReport('q', q);
    pIn.classList.toggle('invalid', !pr.ok); qIn.classList.toggle('invalid', !qr.ok);
    $('#rsa-pcheck').innerHTML = pr.html; $('#rsa-qcheck').innerHTML = qr.html;
    $$('.chip[data-prime]', root).forEach(c => c.setAttribute('aria-pressed', String(c.dataset.prime === String(p) || c.dataset.prime === String(q))));
    let ok = pr.ok && qr.ok, msg = '';
    if (ok && p === q) { ok = false; msg = `<p class="warn">p and q must be different. With p = q, n = p² and anyone can recover p with a square root. The attacks corner shows this.</p>`; }
    $('#rsa-pqmsg').innerHTML = msg;
    const invalidate = (from) => {
      if (from <= 2) $('#rsa-nphi').innerHTML = waiting('Waiting for two different primes.');
      if (from <= 3) { $('#rsa-echeck').innerHTML = waiting('Waiting for n and φ(n).'); $('#rsa-esugg').innerHTML = ''; }
      if (from <= 4) $('#rsa-dcalc').innerHTML = waiting('Waiting for a valid e.');
      $('#rsa-keys').innerHTML = waiting('Your keys appear here once every step above passes.');
      S.valid = false; TD.emit('rsakey', S);
    };
    if (!ok) return invalidate(2);

    const n = p * q, phi = (p - 1n) * (q - 1n);
    $('#rsa-nphi').innerHTML = `n = p × q = ${p} × ${q} = <strong>${n}</strong><br>
      φ(n) = (p − 1)(q − 1) = ${p - 1n} × ${q - 1n} = <strong>${phi}</strong>
      ${n < 256n ? `<br><span class="warn-inline">n is below 256, so one block cannot hold even one byte of text. The math below still works, but the playground needs bigger primes.</span>` : ''}`;

    const cands = [3n, 5n, 7n, 11n, 13n, 17n, 257n, 65537n].filter(c => c < phi && gcd(c, phi) === 1n);
    $('#rsa-esugg').innerHTML = cands.map(c => `<button type="button" class="chip" data-e="${c}" aria-pressed="${c === e}">${c}</button>`).join('') || '<span class="small dim">none of the usual ones fit</span>';

    if (e === null) { eIn.classList.add('invalid'); $('#rsa-echeck').innerHTML = `<p class="small">${pill(false, 'e must be a whole number')}</p>`; return invalidate(4); }
    if (!(e > 1n && e < phi)) {
      eIn.classList.add('invalid');
      $('#rsa-echeck').innerHTML = `<p class="small">${pill(false, `e must be between 1 and ${phi}, exclusive`)}</p>`;
      return invalidate(4);
    }
    const eu = euclidLines(phi, e);
    eIn.classList.toggle('invalid', eu.g !== 1n);
    $('#rsa-echeck').innerHTML = `<div class="math"><span class="lab">gcd(φ(n), e) by Euclid</span>${eu.html}</div>
      <p class="small">${eu.g === 1n ? pill(true, `gcd(${phi}, ${e}) = 1, so e = ${e} is allowed`) : pill(false, `gcd(${phi}, ${e}) = ${eu.g}, so e = ${e} shares a factor with φ(n)`)}${eu.g === 1n ? '' : ' Pick another e. The chips above are guaranteed to work.'}</p>`;
    if (eu.g !== 1n) return invalidate(4);

    const dc = egcdHTML(phi, e);
    $('#rsa-dcalc').innerHTML = dc.html;
    const d = dc.d;
    Object.assign(S, { p, q, n, phi, e, d, valid: true });
    $('#rsa-keys').innerHTML = `
      <div class="keycards">
        <div class="keycard pub">
          <div class="k-top"><span class="k-title">Public key</span><span class="k-who">share it with anyone</span></div>
          <div class="k-val">(e, n) = (${e}, ${n})</div>
          <div class="row"><button type="button" class="btn small" data-copy="e=${e}, n=${n}">Copy</button></div>
        </div>
        <div class="keycard priv">
          <div class="k-top"><span class="k-title">Private key</span><span class="k-who">keep it secret</span></div>
          <div class="k-val">(d, n) = (${d}, ${n})</div>
          <div class="row"><button type="button" class="btn small" data-copy="d=${d}, n=${n}">Copy</button></div>
        </div>
      </div>
      <p class="small dim">Both keys flow into the playground below and the Signatures tab automatically. After key generation, p, q and φ(n) = ${phi} must be destroyed or kept as secret as d. Anyone who learns them can rebuild d.</p>`;
    TD.emit('rsakey', S);
  }
  const updateKeygenSoon = debounce(updateKeygen, 120);
  [pIn, qIn, eIn].forEach(i => i.addEventListener('input', updateKeygenSoon));

  root.addEventListener('click', e => {
    const t = e.target.closest('.seg [data-target]');
    if (t) { target = t.dataset.target; $$('.seg [data-target]', root).forEach(b => b.setAttribute('aria-pressed', String(b === t))); return; }
    const c = e.target.closest('[data-prime]');
    if (c) {
      (target === 'p' ? pIn : qIn).value = c.dataset.prime;
      if (target === 'p') { target = 'q'; $$('.seg [data-target]', root).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.target === 'q'))); }
      updateKeygen(); return;
    }
    const ce = e.target.closest('[data-e]');
    if (ce) { eIn.value = ce.dataset.e; updateKeygen(); }
  });
  $('#rsa-rand').addEventListener('click', () => {
    const big = PRIMES.filter(x => x > 16);
    let a = pick(big), b = pick(big);
    while (b === a) b = pick(big);
    pIn.value = a; qIn.value = b;
    const phi = BigInt((a - 1) * (b - 1));
    if (gcd(parseBig(eIn.value) ?? 0n, phi) !== 1n) eIn.value = String([17n, 7n, 5n, 3n, 11n, 13n].find(c => gcd(c, phi) === 1n));
    updateKeygen();
  });

  /* ================= Part 2: playground ================= */
  const nIn = $('#pl-n'), peIn = $('#pl-e'), pdIn = $('#pl-d'), msgIn = $('#pl-msg'), ctIn = $('#pl-ct');
  let encSel = 0, decSel = 0, ctDirty = false, lastCt = '';

  function syncFromLab() {
    if (!S.valid) return;
    nIn.value = S.n; peIn.value = S.e; pdIn.value = S.d;
    ctDirty = false;
    updatePlay();
  }
  TD.on('rsakey', () => { syncFromLab(); updateWhy(); });
  $('#pl-sync').addEventListener('click', syncFromLab);

  function blockBytes(n) { let k = 0; while (256n ** BigInt(k + 1) <= n) k++; return k; }
  const show = b => (b >= 33 && b < 127 ? esc(String.fromCharCode(b)) : b === 32 ? '␣' : '·');

  function updatePlay() {
    const n = parseBig(nIn.value), e = parseBig(peIn.value), d = parseBig(pdIn.value);
    const stat = $('#pl-keystat');
    if (n === null || e === null || d === null || n < 2n) {
      stat.innerHTML = `<p class="small">${pill(false, 'Fill in n, e and d with whole numbers')}</p>`;
      ['#pl-encode', '#pl-enc', '#pl-enc-trace', '#pl-ct-out', '#pl-dec', '#pl-dec-trace', '#pl-dec-out'].forEach(s => ($(s).innerHTML = ''));
      return;
    }
    const k = blockBytes(n);
    stat.innerHTML = S.valid && n === S.n && e === S.e && d === S.d
      ? `<p class="small">${info('Using your key from Part 1')}</p>`
      : `<p class="small">${info('Using a custom key')} Encryption and decryption only match when e and d really come from the same key.</p>`;
    if (k === 0) {
      $('#pl-encode').innerHTML = `<p class="warn">n = ${n} is too small to hold a single byte (0 to 255). Choose primes whose product is above 255, for example 61 and 53.</p>`;
      ['#pl-enc', '#pl-enc-trace', '#pl-ct-out'].forEach(s => ($(s).innerHTML = ''));
      updateDec(); return;
    }
    const bytes = [...utf8(msgIn.value)];
    if (!bytes.length) {
      $('#pl-encode').innerHTML = `<p class="small dim">Type a message above.</p>`;
      ['#pl-enc', '#pl-enc-trace', '#pl-ct-out'].forEach(s => ($(s).innerHTML = ''));
      updateDec(); return;
    }
    const nonAscii = bytes.some(b => b > 127);
    const blocks = [];
    for (let i = 0; i < bytes.length; i += k) { const bs = bytes.slice(i, i + k); blocks.push({ bs, m: bytesToBig(bs) }); }
    const chars = [...msgIn.value];
    $('#pl-encode').innerHTML = `
      <div class="maps">${bytes.map((b, i) => `<span class="map"><b>${show(b)}</b><i>${b}</i></span>`).join('')}</div>
      ${nonAscii ? `<p class="small dim">Characters outside ASCII take several bytes (UTF-8), so some characters above show as more than one number.</p>` : ''}
      <p class="small">${k === 1
        ? `n = ${n} holds one byte per block, because 256 ≤ ${n} &lt; 256² = 65536. Each code above is one block m.`
        : `n = ${n} holds ${k} bytes per block, because 256<sup>${k}</sup> ≤ n. Each block packs its bytes in base 256, like digits: for example ${blocks[0].bs.join(', ')} → ${blocks[0].bs.map((b, i) => `${b}·256<sup>${blocks[0].bs.length - 1 - i}</sup>`).join(' + ')} = ${blocks[0].m}.`}</p>`;
    const cs = blocks.map(b => modPow(b.m, e, n));
    encSel = Math.min(encSel, blocks.length - 1);
    const repeats = new Set(blocks.map(b => b.m.toString())).size < blocks.length;
    $('#pl-enc').innerHTML = `<div class="scroll"><table class="tbl pick" id="pl-enc-tbl">
      <thead><tr><th>block</th><th class="l">text</th><th>m</th><th>c = m<sup>${e}</sup> mod ${n}</th></tr></thead>
      <tbody>${blocks.map((b, i) => `<tr data-i="${i}" class="${i === encSel ? 'sel' : ''}" tabindex="0"><td>${i + 1}</td><td class="l">${b.bs.map(show).join('')}</td><td>${b.m}</td><td><strong>${cs[i]}</strong></td></tr>`).join('')}</tbody></table></div>
      ${repeats ? `<p class="warn">Repeated blocks give repeated ciphertexts. This is ${g('textbook', 'textbook RSA')}, which is ${g('deterministic', 'deterministic')}, so an eavesdropper can spot repeated letters without decrypting anything. Real RSA adds random ${g('oaep', 'OAEP padding')} first.</p>` : ''}`;
    $('#pl-enc-trace').innerHTML = `<details class="more" open><summary>Square-and-multiply for block ${encSel + 1}</summary>${traceTable(modPowTrace(blocks[encSel].m, e, n))}</details>`;
    const ctStr = cs.join(', ');
    $('#pl-ct-out').innerHTML = `<div class="row"><div class="out grow"><span class="flabel">Ciphertext</span><span class="mono">${ctStr}</span></div><button type="button" class="btn small" data-copy="${ctStr}">Copy</button></div>`;
    lastCt = ctStr;
    if (!ctDirty) ctIn.value = ctStr;
    updateDec();
  }

  function updateDec() {
    const n = parseBig(nIn.value), d = parseBig(pdIn.value);
    if (n === null || d === null) return;
    const parts = ctIn.value.split(/[\s,;]+/).filter(Boolean);
    if (!parts.length) { $('#pl-dec').innerHTML = `<p class="small dim">Paste ciphertext blocks to decrypt.</p>`; $('#pl-dec-trace').innerHTML = ''; $('#pl-dec-out').innerHTML = ''; return; }
    const cs = parts.map(parseBig);
    const bad = cs.findIndex(c => c === null || c < 0n || c >= n);
    if (bad >= 0) { $('#pl-dec').innerHTML = `<p class="small">${pill(false, `Block ${bad + 1} is not a whole number between 0 and n − 1`)}</p>`; $('#pl-dec-trace').innerHTML = ''; $('#pl-dec-out').innerHTML = ''; return; }
    const ms = cs.map(c => modPow(c, d, n));
    const all = ms.flatMap(m => (m === 0n ? [0] : bigToBytes(m)));
    decSel = Math.min(decSel, cs.length - 1);
    $('#pl-dec').innerHTML = `<div class="scroll"><table class="tbl pick" id="pl-dec-tbl">
      <thead><tr><th>block</th><th>c</th><th>m = c<sup>${d}</sup> mod ${n}</th><th class="l">bytes</th><th class="l">text</th></tr></thead>
      <tbody>${cs.map((c, i) => { const bs = ms[i] === 0n ? [0] : bigToBytes(ms[i]); return `<tr data-i="${i}" class="${i === decSel ? 'sel' : ''}" tabindex="0"><td>${i + 1}</td><td>${c}</td><td><strong>${ms[i]}</strong></td><td class="l">${bs.join(' ')}</td><td class="l">${bs.map(show).join('')}</td></tr>`; }).join('')}</tbody></table></div>`;
    $('#pl-dec-trace').innerHTML = `<details class="more"><summary>Square-and-multiply for block ${decSel + 1}</summary>${traceTable(modPowTrace(cs[decSel], d, n))}</details>`;
    const text = fromUtf8(all);
    const match = ctIn.value.split(/[\s,;]+/).filter(Boolean).join(', ') === lastCt && text === msgIn.value;
    $('#pl-dec-out').innerHTML = `<div class="out"><span class="flabel">Decrypted message</span><span class="mono big-out">${esc(text)}</span></div>
      ${match ? `<p class="small">${pill(true, 'Matches the original message')}</p>` : ''}`;
  }

  const updatePlaySoon = debounce(updatePlay, 120);
  [nIn, peIn, pdIn, msgIn].forEach(i => i.addEventListener('input', updatePlaySoon));
  ctIn.addEventListener('input', () => { ctDirty = true; debounce(updateDec, 120)(); });
  $('#pl-ct-reset').addEventListener('click', () => { ctDirty = false; ctIn.value = lastCt; updateDec(); });
  const pickRow = (tblSel, fn) => e => {
    const tr = e.target.closest(`${tblSel} tbody tr[data-i]`);
    if (!tr) return;
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    if (e.type === 'keydown') e.preventDefault();
    fn(+tr.dataset.i);
  };
  ['click', 'keydown'].forEach(ev => {
    root.addEventListener(ev, pickRow('#pl-enc-tbl', i => { encSel = i; updatePlay(); }));
    root.addEventListener(ev, pickRow('#pl-dec-tbl', i => {
      decSel = i; updateDec();
      const det = $('#pl-dec-trace details'); if (det) det.open = true;
    }));
  });

  /* ================= Part 3: worked example ================= */
  (function worked() {
    const p = 61n, q = 53n, n = p * q, phi = (p - 1n) * (q - 1n), e = 17n, d = modInv(e, phi);
    const m1 = 72n, m2 = 73n, c1 = modPow(m1, e, n), c2 = modPow(m2, e, n);
    const k = (e * d - 1n) / phi;
    $('#rsa-worked-body').innerHTML = `
      <p class="small">Small primes, the message "HI", every number shown. Each line follows from the one before.</p>
      <ol class="worked">
        <li><b>Choose primes.</b> p = 61 and q = 53. √61 ≈ 7.8 and none of 2, 3, 5, 7 divide 61. √53 ≈ 7.3 and none of them divide 53 either.</li>
        <li><b>Modulus.</b> n = 61 × 53 = ${n}.</li>
        <li><b>Totient.</b> φ(n) = 60 × 52 = ${phi}.</li>
        <li><b>Public exponent.</b> e = 17. Euclid: 3120 = 183 × 17 + 9, 17 = 1 × 9 + 8, 9 = 1 × 8 + 1, so gcd(3120, 17) = 1.</li>
        <li><b>Private exponent.</b> d = ${d}, because 17 × ${d} = ${e * d} = ${k} × ${phi} + 1.</li>
        <li><b>Publish</b> (e, n) = (17, ${n}). <b>Keep</b> (d, n) = (${d}, ${n}).</li>
        <li><b>Encode.</b> "H" = 72 and "I" = 73 in ASCII.</li>
        <li><b>Encrypt.</b> 72<sup>17</sup> mod ${n} = ${c1} and 73<sup>17</sup> mod ${n} = ${c2}. Send ${c1}, ${c2}.</li>
        <li><b>Decrypt.</b> ${c1}<sup>${d}</sup> mod ${n} = ${modPow(c1, d, n)} and ${c2}<sup>${d}</sup> mod ${n} = ${modPow(c2, d, n)}.</li>
        <li><b>Decode.</b> 72, 73 → "HI".</li>
      </ol>
      <details class="more"><summary>Every step of 72<sup>17</sup> mod ${n}</summary>${traceTable(modPowTrace(m1, e, n))}</details>
      <details class="more"><summary>Every step of ${c1}<sup>${d}</sup> mod ${n}</summary>${traceTable(modPowTrace(c1, d, n))}</details>
      <div class="row"><button type="button" class="btn primary" id="worked-load">Load this example into the lab</button></div>`;
    $('#worked-load').addEventListener('click', () => {
      pIn.value = '61'; qIn.value = '53'; eIn.value = '17'; msgIn.value = 'HI';
      updateKeygen();
      document.getElementById('rsa-keygen').scrollIntoView({ behavior: 'smooth' });
    });
  })();

  /* ================= Part 4: why it works ================= */
  function updateWhy() {
    const out = $('#why-out');
    if (!S.valid) { out.innerHTML = waiting('Build a key in Part 1 first.'); return; }
    const { n, phi, e, d } = S;
    const m = parseBig($('#why-m').value);
    if (m === null || m < 1n || m >= n) { out.innerHTML = `<p class="small">${pill(false, `Pick m between 1 and ${n - 1n}`)}</p>`; return; }
    const g1 = gcd(m, n), k = (e * d - 1n) / phi;
    let cycle = '';
    if (g1 === 1n && phi <= 2000000n) {
      let x = m % n, ord = 1;
      const first = [x];
      while (x !== 1n) { x = x * m % n; ord++; if (first.length < 8) first.push(x); }
      cycle = `<p class="small">Powers of ${m} mod ${n}: ${first.join(', ')}${ord > first.length ? ', …' : ''}. They return to 1 after ${ord} steps. ${ord} divides φ(n) = ${phi}, since ${phi} = ${phi / BigInt(ord)} × ${ord}.</p>`;
    }
    out.innerHTML = `<div class="math">
      gcd(${m}, ${n}) = ${g1}${g1 === 1n ? '' : '  (m shares a factor with n, the CRT argument covers this case)'}<br>
      ${m}<sup>φ(n)</sup> mod n = ${m}<sup>${phi}</sup> mod ${n} = <strong>${modPow(m, phi, n)}</strong><br>
      e·d = ${e} × ${d} = ${e * d} = 1 + ${k} × ${phi}<br>
      ${m}<sup>e·d</sup> mod n = <strong>${modPow(m, e * d, n)}</strong> ${pill(modPow(m, e * d, n) === m, 'back to m')}</div>${cycle}`;
  }
  $('#why-m').addEventListener('input', debounce(updateWhy, 120));

  /* ================= Part 5: attacks ================= */
  // 5a. factor the lab key
  $('#atk-factor-go').addEventListener('click', () => {
    const out = $('#atk-factor-out');
    if (!S.valid) { out.innerHTML = waiting('Build a key in Part 1 first.'); return; }
    const { n, e, d } = S;
    const t0 = performance.now();
    const t = trialDivision(n, { maxTests: 5000000 });
    const ms = performance.now() - t0;
    if (!t.factor) { out.innerHTML = `<p class="small">${pill(false, 'Gave up')} No factor in ${t.tested.toLocaleString()} divisions. This n is beyond the in-browser demo.</p>`; return; }
    const p = t.factor, q = n / p, phi = (p - 1n) * (q - 1n), d2 = modInv(e, phi);
    out.innerHTML = `<div class="math">
      Attacker knows only (e, n) = (${e}, ${n}).<br>
      Trial division finds ${n} = ${p} × ${q} after ${t.tested.toLocaleString()} division${t.tested === 1 ? '' : 's'} (${ms.toFixed(1)} ms).<br>
      φ(n) = ${p - 1n} × ${q - 1n} = ${phi}<br>
      d = e<sup>−1</sup> mod φ(n) = <strong>${d2}</strong> ${pill(d2 === d, d2 === d ? 'same as the real private key' : 'mismatch')}</div>`;
  });

  // 5b. key size slider
  const SIZES = [16, 24, 32, 40, 48, 52, 64, 96, 128, 192, 256, 384, 512, 640, 768, 829, 1024, 1536, 2048, 3072, 4096, 7680, 15360];
  const range = $('#ks-range');
  range.max = String(SIZES.length - 1); range.value = String(SIZES.indexOf(48));
  let measuredRate = null;
  const NIST = { 1024: 80, 2048: 112, 3072: 128, 7680: 192, 15360: 256 };
  const gnfsLog2 = b => { const ln = b * Math.LN2; return Math.cbrt(64 / 9) * Math.cbrt(ln) * Math.pow(Math.log(ln), 2 / 3) / Math.LN2; };
  function fmtTimeLog10(l10) { // l10 = log10(seconds)
    if (l10 < -3) return 'under a millisecond';
    const s = Math.pow(10, l10);
    if (l10 < 0) return `${(s * 1000).toFixed(0)} milliseconds`;
    if (s < 120) return `${s.toFixed(s < 10 ? 1 : 0)} seconds`;
    if (s < 7200) return `${(s / 60).toFixed(0)} minutes`;
    if (s < 172800) return `${(s / 3600).toFixed(0)} hours`;
    if (s < 3.156e7 * 2) return `${(s / 86400).toFixed(0)} days`;
    const ly = l10 - Math.log10(3.156e7);
    if (ly < 6) return `${Math.round(Math.pow(10, ly)).toLocaleString()} years`;
    const uni = ly - Math.log10(1.38e10);
    return `about 10<sup>${ly.toFixed(0)}</sup> years${uni > 0 ? `, ${uni < 3 ? `${Math.round(Math.pow(10, uni)).toLocaleString()} times` : `10<sup>${uni.toFixed(0)}</sup> times`} the age of the universe` : ''}`;
  }
  function verdictFor(b) {
    if (b <= 52) return ['bad', 'Breakable in your browser', 'Trial division finishes in about a second or less. Try it with the button below.'];
    if (b <= 128) return ['bad', 'Trivial', 'Smarter algorithms such as the quadratic sieve or Pollard\'s rho factor this in seconds on a laptop, even though trial division alone would be slow.'];
    if (b <= 256) return ['bad', 'Trivial', 'Minutes on a laptop with free factoring software.'];
    if (b <= 384) return ['bad', 'Easy', 'Hours on a laptop.'];
    if (b <= 512) return ['bad', 'Broken', '512-bit RSA was first factored in public in 1999. Today it costs hours on rented cloud servers.'];
    if (b <= 768) return ['bad', 'Broken', 'RSA-768 was factored in 2009, with roughly 2000 CPU core-years of work.'];
    if (b <= 829) return ['bad', 'Broken', 'RSA-250 (829 bits) was factored in 2020 using about 2700 core-years. It is the largest RSA challenge number factored in public.'];
    if (b <= 1024) return ['warn', 'Retired', 'Never factored in public, but within reach of a well-funded attacker. NIST stopped allowing it for new signatures after 2013.'];
    if (b <= 1536) return ['warn', 'Below standard', 'No public break, but below today\'s 2048-bit minimum.'];
    if (b <= 2048) return ['ok', 'Current minimum', 'About 112-bit security. No known classical attack comes close.'];
    if (b <= 4096) return ['ok', 'Strong', 'About 128-bit security from 3072 bits upward. Recommended for protection beyond 2030.'];
    return ['ok', 'Very strong', `About ${NIST[b] || 192}-bit security. Keys this large are rare because they are slow.`];
  }
  function updateSize() {
    const b = SIZES[+range.value];
    $('#ks-bits').textContent = `${b} bits`;
    const digits = Math.ceil(b * Math.log10(2));
    const tdLog2 = b / 2 - 1; // odd divisors up to sqrt(n)
    const tdTime = fmtTimeLog10(tdLog2 * Math.log10(2) - 9);
    const tdMine = measuredRate ? fmtTimeLog10(tdLog2 * Math.log10(2) - Math.log10(measuredRate)) : null;
    const gl = gnfsLog2(b);
    const [cls, label, text] = verdictFor(b);
    $('#ks-out').innerHTML = `
      <p class="small"><span class="pill ${cls}">${label}</span> ${text}</p>
      <div class="scroll"><table class="tbl kv">
        <tbody>
          <tr><th class="l">Size of n</th><td class="l">${b} bits, about ${digits} decimal digits</td></tr>
          <tr><th class="l">Trial division</th><td class="l">about 2<sup>${tdLog2}</sup> divisions, so ${tdTime} at a billion divisions per second${tdMine ? `, or ${tdMine} at the rate your browser just measured` : ''}</td></tr>
          <tr><th class="l">Number field sieve</th><td class="l">${b >= 256 ? `about 2<sup>${gl.toFixed(0)}</sup> operations by the textbook formula, so ${fmtTimeLog10(gl * Math.log10(2) - 18)} on an exascale supercomputer doing 10<sup>18</sup> operations per second. The formula drops constant factors, so treat it as an order of magnitude.` : 'Not the right tool at this size. Simpler methods win.'}</td></tr>
          <tr><th class="l">${g('securitybits', 'Security level')}</th><td class="l">${NIST[b] ? `${NIST[b]} bits (NIST SP 800-57 equivalence)` : b < 1024 ? 'below 80 bits, considered broken' : 'between the standard sizes 1024, 2048, 3072, 7680, 15360'}</td></tr>
          <tr><th class="l">Quantum</th><td class="l">${g('shor', 'Shor\'s algorithm')} on a large fault-tolerant quantum computer would factor any of these sizes. None capable of it exists today.</td></tr>
        </tbody></table></div>`;
    $('#ks-live').disabled = b > 52;
    $('#ks-live').textContent = b > 52 ? 'Live factoring stops at 52 bits' : `Generate and factor a ${b}-bit n live`;
  }
  range.addEventListener('input', updateSize);
  $('#ks-live').addEventListener('click', async () => {
    const b = SIZES[+range.value];
    if (b > 52) return;
    const btn = $('#ks-live'), out = $('#ks-live-out');
    btn.disabled = true;
    const half = b / 2;
    let p = randomPrime(half), q = randomPrime(half);
    while (q === p) q = randomPrime(half);
    const n = Number(p * q);
    const lim = Math.floor(Math.sqrt(n));
    out.innerHTML = `<p class="small">n = ${n}. Dividing by 2 and every odd number up to ${lim.toLocaleString()}…</p>`;
    await tick();
    const t0 = performance.now();
    let dv = 3, found = n % 2 === 0 ? 2 : 0, count = 1;
    while (!found && dv <= lim) {
      const stop = Math.min(lim, dv + 4000000);
      for (; dv <= stop; dv += 2) { count++; if (n % dv === 0) { found = dv; break; } }
      if (!found) { await tick(); }
    }
    const ms = performance.now() - t0;
    measuredRate = count / Math.max(ms / 1000, 1e-4);
    out.innerHTML = `<div class="math">n = ${n} = <strong>${found} × ${n / found}</strong><br>${count.toLocaleString()} divisions in ${ms.toFixed(0)} ms, about ${Math.round(measuredRate / 1e6)} million divisions per second in your browser.</div>
      <p class="small dim">The table above now also uses your measured rate. Every 2 extra bits of n doubles the work for trial division.</p>`;
    btn.disabled = false;
    updateSize();
  });
  updateSize();

  // 5c. small e
  let seKeys = null;
  $('#se-go').addEventListener('click', async () => {
    const btn = $('#se-go');
    btn.disabled = true; btn.textContent = 'Generating primes…';
    await tick();
    const ok3 = x => x % 3n === 2n; // then gcd(3, x - 1) = 1
    seKeys = [];
    for (let i = 0; i < 3; i++) {
      const p = randomPrime(256, ok3); let q = randomPrime(256, ok3);
      while (q === p) q = randomPrime(256, ok3);
      seKeys.push({ n: p * q });
      await tick();
    }
    btn.disabled = false; btn.textContent = 'Generate three new keys';
    updateSmallE();
  });
  $('#se-msg').addEventListener('input', debounce(() => seKeys && updateSmallE(), 150));
  function updateSmallE() {
    const out = $('#se-out');
    const bytes = [...utf8($('#se-msg').value)];
    if (!bytes.length) { out.innerHTML = waiting('Type a message.'); return; }
    const m = bytesToBig(bytes), [k1, k2, k3] = seKeys;
    const c1 = modPow(m, 3n, k1.n);
    const wraps = m ** 3n >= k1.n;
    const r1 = iroot(c1, 3), ok1 = r1 ** 3n === c1;
    const part1 = `
      <h5 class="sub">One recipient</h5>
      <div class="math">
        n₁ = ${short(k1.n)} <span class="dim">(${bitLen(k1.n)} bits)</span><br>
        m = "${esc($('#se-msg').value)}" as a number = ${short(m)} <span class="dim">(${bitLen(m)} bits, so m³ has about ${bitLen(m ** 3n)} bits)</span><br>
        c = m³ mod n₁ = ${short(c1)}<br>
        ${wraps ? `m³ is larger than n₁, so the reduction did wrap around this time.` : `m³ &lt; n₁, so c is exactly m³. The "mod n" never did anything.`}<br>
        Attacker: ∛c = ${short(r1)} → ${ok1 ? `<strong>"${esc(fromUtf8(bigToBytes(r1)))}"</strong> ${pill(true, 'recovered')}` : `${pill(false, 'not an exact cube')} The cube root fails once the message passes about ${Math.floor(bitLen(k1.n) / 3 / 8)} bytes. Keep going.`}
      </div>`;
    const minN = [k1, k2, k3].reduce((a, k) => (k.n < a ? k.n : a), k1.n);
    let part2;
    if (m >= minN) part2 = `<p class="small">${pill(false, 'Message too long')} m must be smaller than every n.</p>`;
    else {
      const cs = [k1, k2, k3].map(k => modPow(m, 3n, k.n));
      const N = k1.n * k2.n * k3.n;
      let C = 0n;
      const terms = [k1, k2, k3].map((k, i) => { const Ni = N / k.n, yi = modInv(Ni, k.n); C += cs[i] * Ni * yi; return { Ni, yi }; });
      C %= N;
      const r = iroot(C, 3), ok = r ** 3n === C;
      part2 = `
        <h5 class="sub">The same message to three recipients</h5>
        <div class="math">
          c₁ = m³ mod n₁ = ${short(cs[0])}<br>c₂ = m³ mod n₂ = ${short(cs[1])}<br>c₃ = m³ mod n₃ = ${short(cs[2])}<br><br>
          N = n₁·n₂·n₃ <span class="dim">(${bitLen(N)} bits)</span>. For each i: Nᵢ = N / nᵢ and yᵢ = Nᵢ<sup>−1</sup> mod nᵢ.<br>
          ${terms.map((t, i) => `y${'₁₂₃'[i]} = ${short(t.yi)}`).join('<br>')}<br>
          C = Σ cᵢ·Nᵢ·yᵢ mod N = ${short(C)}<br>
          C ≡ m³ mod every nᵢ and m³ &lt; N, so C = m³ exactly.<br>
          ∛C → ${ok ? `<strong>"${esc(fromUtf8(bigToBytes(r)))}"</strong> ${pill(true, 'recovered from three ciphertexts')}` : pill(false, 'not an exact cube')}
        </div>
        ${wraps ? '' : `<p class="small dim">This message is short, so m³ fits under every n and the three ciphertexts are the same number. Type a message longer than about ${Math.floor(bitLen(k1.n) / 3 / 8)} characters to see the plain cube root fail while the broadcast attack still succeeds.</p>`}`;
    }
    out.innerHTML = part1 + part2 + `<p class="small"><strong>The fix.</strong> ${g('oaep', 'OAEP')} padding fills each block with randomness up to the full size of n, so m³ always wraps many times and the three ciphertexts are of different numbers.</p>`;
  }

  // 5d. common modulus (uses the lab key's n)
  function updateCM() {
    const out = $('#cm-out');
    if (!S.valid) { out.innerHTML = waiting('Build a key in Part 1 first.'); return; }
    const { n, phi, e: e1 } = S;
    const e2 = parseBig($('#cm-e2').value);
    let m = parseBig($('#cm-m').value);
    if (e2 === null || e2 < 2n || e2 >= phi || gcd(e2, phi) !== 1n) { out.innerHTML = `<p class="small">${pill(false, `e₂ must be coprime to φ(n) = ${phi}`)}</p>`; return; }
    if (gcd(e1, e2) !== 1n) { out.innerHTML = `<p class="small">${pill(false, `gcd(e₁, e₂) = ${gcd(e1, e2)}`)} The attack needs e₁ and e₂ coprime. Try another e₂.</p>`; return; }
    if (m === null || m < 2n || m >= n) { out.innerHTML = `<p class="small">${pill(false, `m must be between 2 and ${n - 1n}`)}</p>`; return; }
    if (gcd(m, n) !== 1n) { out.innerHTML = `<p class="small">${pill(false, 'm shares a factor with n')} Pick another m. (Doing so would also hand the attacker a factor of n.)</p>`; return; }
    const c1 = modPow(m, e1, n), c2 = modPow(m, e2, n);
    const { x: s1, y: s2 } = egcd(e1, e2);
    const part = (c, s) => (s < 0n ? modPow(modInv(c, n), -s, n) : modPow(c, s, n));
    const rec = part(c1, s1) * part(c2, s2) % n;
    const fmtPart = (c, s, i) => s < 0n ? `(c${i}<sup>−1</sup>)<sup>${-s}</sup> = ${modInv(c, n)}<sup>${-s}</sup> mod n = ${part(c, s)}` : `c${i}<sup>${s}</sup> mod n = ${part(c, s)}`;
    out.innerHTML = `<div class="math">
      Shared n = ${n}, e₁ = ${e1} (your key), e₂ = ${e2}<br>
      c₁ = m<sup>${e1}</sup> mod n = ${c1}, c₂ = m<sup>${e2}</sup> mod n = ${c2}<br><br>
      <span class="lab">Attacker, using only n, e₁, e₂, c₁, c₂</span>
      Extended Euclid: ${s1} × ${e1} + ${s2} × ${e2} = ${s1 * e1 + s2 * e2}<br>
      ${fmtPart(c1, s1, '₁')}<br>
      ${fmtPart(c2, s2, '₂')}<br>
      m = ${part(c1, s1)} × ${part(c2, s2)} mod n = <strong>${rec}</strong> ${pill(rec === m, rec === m ? 'message recovered' : 'mismatch')}</div>
      <p class="small dim">A negative power means using the modular inverse, found with extended Euclid. The fix is simple: never share n between key pairs.</p>`;
  }
  ['#cm-e2', '#cm-m'].forEach(s => $(s).addEventListener('input', debounce(updateCM, 120)));
  TD.on('rsakey', updateCM);

  // 5e. p = q
  function updateSame() {
    const out = $('#pq-same-out');
    const p = parseBig($('#pq-same').value), e = parseBig($('#pq-same-e').value);
    if (p === null || p > 100000n || !trialDivision(p).prime) { out.innerHTML = `<p class="small">${pill(false, 'Use a prime below 100000')}</p>`; return; }
    if (e === null || e < 3n) { out.innerHTML = `<p class="small">${pill(false, 'e must be at least 3')}</p>`; return; }
    const n = p * p, wrong = (p - 1n) ** 2n, right = p * (p - 1n);
    const dW = modInv(e, wrong), dR = modInv(e, right);
    if (dW === null || dR === null) { out.innerHTML = `<p class="small">${pill(false, 'e shares a factor with φ')} Try e = 7 or 11.</p>`; return; }
    const m = 42n % n, c = modPow(m, e, n), mW = modPow(c, dW, n), mR = modPow(c, dR, n);
    out.innerHTML = `<div class="math">
      n = ${p}² = ${n}. Attacker: √${n} = <strong>${iroot(n, 2)}</strong>, done.<br><br>
      The usual formula also breaks. (p − 1)(q − 1) would give ${wrong}, but the true φ(p²) = p(p − 1) = ${right}.<br>
      Encrypt m = ${m}: c = ${c}.<br>
      d from the wrong φ = ${dW}: decrypts to ${mW} ${pill(mW === m, mW === m ? 'works by luck' : 'wrong message')}<br>
      d from the true φ = ${dR}: decrypts to ${mR} ${pill(mR === m, 'correct')}</div>`;
  }
  ['#pq-same', '#pq-same-e'].forEach(s => $(s).addEventListener('input', debounce(updateSame, 120)));
  updateSame();

  // 5f. Fermat factorization
  function updateFermat() {
    const out = $('#ff-out');
    const p = parseBig($('#ff-p').value), q = parseBig($('#ff-q').value);
    if (p === null || q === null || p < 3n || q < 3n || p > 10n ** 9n || q > 10n ** 9n) { out.innerHTML = `<p class="small">${pill(false, 'Use two odd numbers between 3 and 10⁹')}</p>`; return; }
    if (p % 2n === 0n || q % 2n === 0n) { out.innerHTML = `<p class="small">${pill(false, 'Both must be odd')}</p>`; return; }
    const n = p * q;
    let a = iroot(n, 2); if (a * a < n) a++;
    const rows = [];
    let steps = 0, found = null;
    const t0 = performance.now();
    while (steps < 3000000) {
      steps++;
      const b2 = a * a - n, b = iroot(b2, 2), sq = b * b === b2;
      if (rows.length < 6 || sq) rows.push({ a, b2, b, sq, i: steps });
      if (sq) { found = { a, b }; break; }
      a++;
    }
    const ms = performance.now() - t0;
    const body = rows.map((r, k) => `${k === 6 && rows[5].i + 1 < r.i ? `<tr><td colspan="4" class="l dim">… ${(r.i - rows[5].i - 1).toLocaleString()} more tries …</td></tr>` : ''}
      <tr class="${r.sq ? 'hit' : ''}"><td>${r.i}</td><td>${r.a}</td><td>${r.b2}</td><td class="l">${r.sq ? `= ${r.b}², a perfect square` : 'not a square'}</td></tr>`).join('');
    out.innerHTML = `<p class="small">n = ${n}, ⌈√n⌉ = ${iroot(n, 2) + (iroot(n, 2) ** 2n < n ? 1n : 0n)}</p>
      <div class="scroll"><table class="tbl"><thead><tr><th>try</th><th>a</th><th>a² − n</th><th class="l"></th></tr></thead><tbody>${body}</tbody></table></div>
      ${found ? `<p class="small">${pill(true, `Factored in ${steps.toLocaleString()} ${steps === 1 ? 'try' : 'tries'}`)} n = (a − b)(a + b) = ${found.a - found.b} × ${found.a + found.b}. ${ms > 5 ? `(${ms.toFixed(0)} ms)` : ''}</p>` : `<p class="small">${pill(false, 'Stopped after 3,000,000 tries')}</p>`}
      <p class="small dim">The number of tries grows with the gap between p and q. With random 1024-bit primes the gap is astronomically large and this method is useless.</p>`;
  }
  ['#ff-p', '#ff-q'].forEach(s => $(s).addEventListener('input', debounce(updateFermat, 200)));
  $('#ff-close').addEventListener('click', () => {
    const p = randomPrime(26); let q = p + 2n;
    while (!TD.isProbablePrime(q)) q += 2n;
    $('#ff-p').value = p; $('#ff-q').value = q; updateFermat();
  });
  $('#ff-far').addEventListener('click', () => { $('#ff-p').value = randomPrime(12); $('#ff-q').value = randomPrime(18); updateFermat(); });
  updateFermat();

  // 5g. shared prime
  $('#sp-go').addEventListener('click', () => {
    const p = randomPrime(32); let q1 = randomPrime(32), q2 = randomPrime(32);
    while (q1 === p) q1 = randomPrime(32);
    while (q2 === p || q2 === q1) q2 = randomPrime(32);
    const n1 = p * q1, n2 = p * q2;
    const eu = euclidLines(n1 > n2 ? n1 : n2, n1 > n2 ? n2 : n1);
    $('#sp-out').innerHTML = `<div class="math">
      n₁ = ${n1}<br>n₂ = ${n2}<br><span class="lab">gcd(n₁, n₂) by Euclid</span>${eu.html}<br><br>
      gcd = <strong>${eu.g}</strong>, a shared prime. So n₁ = ${eu.g} × ${n1 / eu.g} and n₂ = ${eu.g} × ${n2 / eu.g}. Both keys are broken.</div>
      <p class="small dim">Factoring either n alone by trial division would take about 2<sup>31</sup> divisions. Euclid needed ${gcdSteps(n1, n2).rows.length}.</p>`;
  });

  /* ================= challenges ================= */
  const smallP = PRIMES.filter(x => x < 60);
  const twoPrimes = list => { const a = pick(list); let b = pick(list); while (b === a) b = pick(list); return [BigInt(a), BigInt(b)]; };
  const pickE = phi => [3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n].find(c => gcd(c, phi) === 1n);
  TD.challenge($('#rsa-ch1'), 'Key generation', [
    () => {
      const [p, q] = twoPrimes(smallP), phi = (p - 1n) * (q - 1n);
      return { q: `<p>p = ${p} and q = ${q}. What is φ(n)?</p>`, check: TD.numCheck(phi), hint: 'φ(n) = (p − 1)(q − 1).', solution: `φ(n) = (${p} − 1)(${q} − 1) = ${p - 1n} × ${q - 1n} = ${phi}` };
    },
    () => {
      const [p, q] = twoPrimes(smallP), phi = (p - 1n) * (q - 1n), e = pickE(phi), d = modInv(e, phi);
      return { q: `<p>p = ${p}, q = ${q}, e = ${e}. What is d?</p>`, check: TD.numCheck(d),
        hint: `First φ(n) = ${phi}. Then find d with ${e} × d mod ${phi} = 1. Extended Euclid works, or test 1 + ${phi}, 1 + 2×${phi}, … until one divides by ${e}.`,
        solution: `φ(n) = ${phi}. ${e} × ${d} = ${e * d} = ${(e * d) / phi} × ${phi} + 1, so d = ${d}.` };
    },
    () => {
      const [p, q] = twoPrimes(smallP), phi = (p - 1n) * (q - 1n);
      const bad = [2n, 3n, 4n, 5n, 6n, 7n, 9n, 11n, 13n].filter(x => gcd(x, phi) !== 1n && x < phi);
      const good = [3n, 5n, 7n, 11n, 13n, 17n].filter(x => gcd(x, phi) === 1n && x < phi);
      const e = Math.random() < 0.5 && bad.length ? pick(bad) : pick(good);
      const ok = gcd(e, phi) === 1n;
      return { q: `<p>φ(n) = ${phi}. Is e = ${e} a valid public exponent? Answer yes or no.</p>`,
        check: v => /^y/i.test(v) === ok && /^(y|n)/i.test(v), hint: 'e is valid exactly when gcd(e, φ(n)) = 1.',
        solution: `gcd(${e}, ${phi}) = ${gcd(e, phi)}, so ${ok ? 'yes, it is valid' : 'no, it shares a factor with φ(n)'}.` };
    },
  ]);
  TD.challenge($('#rsa-ch2'), 'Encrypt and decrypt', [
    () => {
      const [p, q] = [11n, 17n], n = p * q, phi = 160n, e = 7n, d = modInv(e, phi), m = BigInt(randInt(2, 180)), c = modPow(m, e, n);
      return { q: `<p>Decrypt c = ${c} with the private key (d, n) = (${d}, ${n}).</p>`, check: TD.numCheck(m),
        hint: `Compute ${c}<sup>${d}</sup> mod ${n}. Use the playground with n = ${n}, d = ${d}, or square-and-multiply by hand.`,
        solution: `${c}<sup>${d}</sup> mod ${n} = ${m}. Check: ${m}<sup>${e}</sup> mod ${n} = ${c}.` };
    },
    () => {
      const [p, q] = twoPrimes(PRIMES.filter(x => x > 20 && x < 120)), n = p * q, phi = (p - 1n) * (q - 1n), e = pickE(phi), d = modInv(e, phi);
      const ch = String.fromCharCode(randInt(65, 90)), c = modPow(BigInt(ch.charCodeAt(0)), e, n);
      return { q: `<p>One capital letter was encrypted with the public key (e, n) = (${e}, ${n}). The private exponent is d = ${d}. The ciphertext is ${c}. Which letter is it?</p>`,
        check: v => v.trim().toUpperCase() === ch || TD.parseBig(v) === BigInt(ch.charCodeAt(0)),
        hint: `Decrypt to a number between 65 (A) and 90 (Z), then look up the ASCII code.`,
        solution: `${c}<sup>${d}</sup> mod ${n} = ${ch.charCodeAt(0)}, which is "${ch}".` };
    },
    () => {
      const n = 3233n, e = 17n, m = BigInt(randInt(2, 99)), c = modPow(m, e, n);
      return { q: `<p>Encrypt m = ${m} with the public key (e, n) = (17, 3233).</p>`, check: TD.numCheck(c),
        hint: 'Compute m<sup>17</sup> mod 3233. 17 = 10001 in binary: square four times, multiplying by m at the first and last bit.',
        solution: `${m}<sup>17</sup> mod 3233 = ${c}` };
    },
  ]);

  updateKeygen();
  if (!S.valid) updatePlay();
})();
