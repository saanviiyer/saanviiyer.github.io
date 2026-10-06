/* Module 6: SHA-256 and the avalanche effect. Module 7: RSA signatures with the key from the RSA lab. */
(function () {
  'use strict';
  const { $, esc, g, pill, info, debounce, hex2, utf8, iroot, modPow, modPowTrace, parseBig, traceTable, tick, pick, randInt, modInv, gcd } = TD;

  /* ---------- SHA-256 from scratch ---------- */
  // The constants are the first 32 fractional bits of square and cube roots of the first primes. Computed exactly here.
  const PR = TD.SMALL_PRIMES.slice(0, 64).map(BigInt);
  const M32 = (1n << 32n) - 1n;
  const H0 = PR.slice(0, 8).map(p => Number(iroot(p << 64n, 2) & M32));
  const K = PR.map(p => Number(iroot(p << 96n, 3) & M32));
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));

  function pad(bytes) {
    const len = bytes.length, total = Math.ceil((len + 9) / 64) * 64, out = new Uint8Array(total);
    out.set(bytes); out[len] = 0x80;
    const bits = BigInt(len) * 8n;
    for (let i = 0; i < 8; i++) out[total - 1 - i] = Number((bits >> BigInt(8 * i)) & 255n);
    return out;
  }
  function sha256(bytes) {
    const m = pad(bytes), H = H0.slice(), W = new Uint32Array(64);
    for (let off = 0; off < m.length; off += 64) {
      for (let t = 0; t < 16; t++) W[t] = (m[off + 4 * t] << 24) | (m[off + 4 * t + 1] << 16) | (m[off + 4 * t + 2] << 8) | m[off + 4 * t + 3];
      for (let t = 16; t < 64; t++) {
        const s0 = rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3);
        const s1 = rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10);
        W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g2, h] = H;
      for (let t = 0; t < 64; t++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25), ch = (e & f) ^ (~e & g2);
        const T1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22), maj = (a & b) ^ (a & c) ^ (b & c);
        const T2 = (S0 + maj) >>> 0;
        h = g2; g2 = f; f = e; e = (d + T1) >>> 0; d = c; c = b; b = a; a = (T1 + T2) >>> 0;
      }
      [a, b, c, d, e, f, g2, h].forEach((v, i) => (H[i] = (H[i] + v) >>> 0));
    }
    return H.map(v => v.toString(16).padStart(8, '0')).join('');
  }
  const shaText = s => sha256(utf8(s));
  TD.sha256 = sha256; TD.shaText = shaText;
  const SELFTEST = shaText('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

  const hexBits = h => h.split('').map(c => parseInt(c, 16).toString(2).padStart(4, '0')).join('');

  /* ================= SHA-256 tab ================= */
  const root = $('#tab-sha');
  root.innerHTML = `
  <header class="tab-head">
    <span class="eyebrow">Module 6</span>
    <h2>SHA-256</h2>
    <p class="lede">A ${g('hash', 'hash function')} turns any input, a word or a whole film, into a 256-bit fingerprint. The same input always gives the same fingerprint. Change a single character and the fingerprint changes beyond recognition.</p>
    <p>Hashes have no key and cannot be decrypted. They are used to check that data was not altered, to store passwords, and inside every digital signature.</p>
  </header>
  <section class="block">
    <header><span class="eyebrow">Avalanche</span><h3>Two nearly identical inputs</h3></header>
    <div class="prose"><p>The ${g('avalanche', 'avalanche effect')} means one changed input bit flips about half of the 256 output bits, and which half looks random. That makes it impossible to steer a hash toward a chosen value, or to learn anything about the input from the output.</p></div>
    <div class="bench">
      <div class="two">
        <div class="field"><label for="sha-a">Input A</label><input id="sha-a" class="inp" autocomplete="off" spellcheck="false" value="Send Bob 100 dollars"></div>
        <div class="field"><label for="sha-b">Input B</label><input id="sha-b" class="inp" autocomplete="off" spellcheck="false" value="Send Bob 900 dollars"></div>
      </div>
      <div class="row tight"><button type="button" class="btn small" id="sha-flip">Make B equal A with one bit flipped</button><span class="small dim">${SELFTEST ? 'Self-test: SHA-256("abc") matches the published answer.' : 'Self-test failed.'}</span></div>
      <div id="sha-out"></div>
    </div>
  </section>
  <section class="block">
    <header><span class="eyebrow">Inside</span><h3>How SHA-256 works</h3></header>
    <div class="explain">
      <div class="prose">
        <p>The message is padded to a multiple of 64 bytes, then processed one 64-byte chunk at a time. Eight 32-bit working words start from fixed constants. Each chunk stirs them through 64 rounds of rotations, XORs and additions. The chunk's result is added back to the eight words, and the final eight words, written in hex, are the hash.</p>
        <p>The constants are the first 32 bits of the fractional parts of square roots and cube roots of the first primes. They are "nothing up my sleeve" numbers: anyone can check that nobody picked them to hide a weakness. This page computes them from the primes instead of copying them.</p>
      </div>
      <div class="math"><span class="lab">The math, per round t</span>
        Ch(e,f,g) = (e ∧ f) ⊕ (¬e ∧ g) &nbsp;&nbsp; Maj(a,b,c) = (a ∧ b) ⊕ (a ∧ c) ⊕ (b ∧ c)<br>
        Σ₀(a) = rotr²(a) ⊕ rotr¹³(a) ⊕ rotr²²(a) &nbsp;&nbsp; Σ₁(e) = rotr⁶(e) ⊕ rotr¹¹(e) ⊕ rotr²⁵(e)<br>
        T₁ = h + Σ₁(e) + Ch(e,f,g) + Kₜ + Wₜ, &nbsp; T₂ = Σ₀(a) + Maj(a,b,c)<br>
        then shift: h←g, g←f, f←e, e←d+T₁, d←c, c←b, b←a, a←T₁+T₂ (all mod 2³²)</div>
    </div>
    <div class="bench">
      <h5 class="sub">Padding for input A</h5>
      <div id="sha-pad"></div>
      <details class="more"><summary>The constants, computed from the primes</summary><div id="sha-const"></div></details>
    </div>
  </section>
  <section class="block"><header><span class="eyebrow">Practice</span><h3>Try it yourself</h3></header><div id="sha-ch"></div></section>`;

  function updateSha() {
    const a = $('#sha-a').value, b = $('#sha-b').value;
    const ha = shaText(a), hb = shaText(b), ba = hexBits(ha), bb = hexBits(hb);
    let diff = 0; for (let i = 0; i < 256; i++) if (ba[i] !== bb[i]) diff++;
    const ia = [...utf8(a)], ib = [...utf8(b)];
    let inDiff = 0; const L = Math.max(ia.length, ib.length);
    for (let i = 0; i < L; i++) { const x = (ia[i] ?? 0) ^ (ib[i] ?? 0); inDiff += x.toString(2).replace(/0/g, '').length; }
    const mark = (h, o) => h.split('').map((c, i) => (c !== o[i] ? `<span class="d">${c}</span>` : c)).join('');
    $('#sha-out').innerHTML = `
      <div class="digests">
        <div><span class="flabel">SHA-256(A)</span><div class="digest">${mark(ha, hb)}</div></div>
        <div><span class="flabel">SHA-256(B)</span><div class="digest">${mark(hb, ha)}</div></div>
      </div>
      <p class="small">${a === b ? info('The inputs are identical, so the hashes are too') : `The inputs differ in ${inDiff} bit${inDiff === 1 ? '' : 's'}${ia.length !== ib.length ? ' and in length' : ''}. The hashes differ in <strong>${diff} of 256 bits</strong> (${(diff / 2.56).toFixed(0)}%). A random pair would differ in about 128, give or take 8.`}</p>
      <div class="bits" role="img" aria-label="${diff} of 256 output bits differ">${[...ba].map((c, i) => `<span class="bit${c !== bb[i] ? ' diff' : ''}"></span>`).join('')}</div>
      <p class="small dim legend"><span class="key k-diff"></span>bit differs <span class="key k-same"></span>bit matches. Highlighted hex digits differ.</p>`;
    const p = pad(utf8(a));
    const n = utf8(a).length;
    $('#sha-pad').innerHTML = `<p class="small">"${esc(a.length > 40 ? a.slice(0, 40) + '…' : a)}" is ${n} bytes. Add one byte 0x80 (a 1 bit then zeros), then zero bytes, then the length in bits (${n * 8}) as an 8-byte number, so the total is ${p.length} bytes, ${p.length / 64} chunk${p.length > 64 ? 's' : ''} of 64.</p>
      <div class="hexdump">${[...p].map((x, i) => `<span class="${i < n ? 'hx-m' : i === n ? 'hx-1' : i >= p.length - 8 ? 'hx-l' : 'hx-0'}">${hex2(x)}</span>`).join('')}</div>
      <p class="small dim legend"><span class="key k-m"></span>message <span class="key k-1"></span>0x80 marker <span class="key k-0"></span>zero fill <span class="key k-l"></span>length</p>`;
  }
  $('#sha-const').innerHTML = `<p class="small">Initial values: H<sub>i</sub> = first 32 bits of the fractional part of √(prime i), for the first 8 primes. Round constants: K<sub>t</sub> = first 32 bits of the fractional part of ∛(prime t), for the first 64 primes. Computed here as ⌊√(p · 2⁶⁴)⌋ and ⌊∛(p · 2⁹⁶)⌋ with BigInt, keeping the low 32 bits.</p>
    <div class="scroll"><table class="tbl compact"><thead><tr><th>prime</th><th>H</th></tr></thead><tbody>${H0.map((h, i) => `<tr><td>${PR[i]}</td><td>${h.toString(16).padStart(8, '0')}</td></tr>`).join('')}</tbody></table></div>
    <div class="hexdump">${K.map(k => `<span>${k.toString(16).padStart(8, '0')}</span>`).join('')}</div>`;
  ['#sha-a', '#sha-b'].forEach(s => $(s).addEventListener('input', debounce(updateSha, 60)));
  $('#sha-flip').addEventListener('click', () => {
    const a = $('#sha-a').value || 'a';
    const i = a.length - 1, c = a.charCodeAt(i) ^ 1;
    $('#sha-b').value = a.slice(0, i) + String.fromCharCode(c);
    updateSha();
  });
  updateSha();

  const prefixCheck = k => v => {
    const parts = v.split('|');
    if (parts.length !== 2) return { ok: false, msg: 'Type two inputs separated by a | character, like cat|dog.' };
    const [x, y] = parts;
    if (x === y) return { ok: false, msg: 'The two inputs must be different.' };
    const hx = shaText(x), hy = shaText(y);
    const ok = hx.slice(0, k) === hy.slice(0, k);
    return { ok, msg: `SHA-256("${esc(x)}") starts ${hx.slice(0, k + 4)}…, SHA-256("${esc(y)}") starts ${hy.slice(0, k + 4)}…` };
  };
  TD.challenge($('#sha-ch'), 'Hunt for near-collisions', [
    () => ({ q: `<p>Find two different inputs whose SHA-256 hashes start with the same hex digit. Type them separated by |, like <span class="mono">cat|dog</span>.</p>`, check: prefixCheck(1),
      hint: 'There are only 16 possible first digits. Try a handful of words with the avalanche demo above and compare the first digit.',
      solution: 'With 16 possibilities, after about 5 random inputs two of them probably share a first digit. This is the birthday bound: collisions appear after about the square root of the number of possible outputs.' }),
    () => ({ q: `<p>Harder: find two different inputs whose hashes share the first <strong>two</strong> hex digits. Same format.</p>`, check: prefixCheck(2),
      hint: 'There are 256 possible two-digit prefixes, so expect to try about 20 inputs. Numbered inputs like a1, a2, a3 are a quick way to search.',
      solution: `This takes about √256 = 16 to 20 tries. Matching all 64 digits would take about √(2²⁵⁶) = 2¹²⁸ tries, which is why nobody has ever found a SHA-256 ${g('collision', 'collision')}.` }),
    () => {
      const words = ['apple', 'river', 'crypto', 'prime', 'lattice', 'cipher', 'hello'];
      const w = pick(words), h = shaText(w);
      return { q: `<p>Which word from this list has a SHA-256 hash starting with <span class="mono">${h.slice(0, 6)}</span>? ${words.join(', ')}.</p>`, check: v => v.trim().toLowerCase() === w,
        hint: 'Type candidates into input A above and watch the first digits.', solution: `SHA-256("${w}") = ${h}. You found it by trying candidates, which is all anyone can do. That is the ${g('preimage', 'preimage')} resistance of a hash.` };
    },
  ]);

  /* ================= Signatures tab ================= */
  const sg = $('#tab-sign');
  sg.innerHTML = `
  <header class="tab-head">
    <span class="eyebrow">Module 7</span>
    <h2>Digital signatures</h2>
    <p class="lede">A ${g('signature', 'digital signature')} runs RSA backwards. The owner of the private key does the "decrypt" operation on a hash of the message. Anyone with the public key can undo it and check that the result matches the message.</p>
    <p>Only the private key can produce a value that the public key turns back into the right hash. So a valid signature proves who signed, and that not a single character has changed since.</p>
  </header>
  <section class="block">
    <div class="explain">
      <div class="math"><span class="lab">The math</span>sign: h = SHA-256(message) mod n, &nbsp; s = h<sup>d</sup> mod n<br>verify: compute h′ from the received message, check s<sup>e</sup> mod n = h′</div>
      <p class="warn small">Toy concession. A real hash is 256 bits, far larger than this lab's n, so here it is reduced mod n. That makes forgeries easy with a small n, and the forgery search below shows exactly how easy. Real signatures use n of 2048 bits or more with ${g('pss', 'PSS')} padding and never shrink the hash.</p>
    </div>
    <div class="bench">
      <div id="sg-key"></div>
      <h5 class="sub">1. Sign</h5>
      <div class="field"><label for="sg-msg">Message</label><input id="sg-msg" class="inp" autocomplete="off" value="I owe Alice 5 dollars."></div>
      <div id="sg-sign"></div>
    </div>
    <div class="bench">
      <h5 class="sub">2. Someone receives it and verifies</h5>
      <div class="two">
        <div class="field"><label for="sg-rmsg">Received message</label><input id="sg-rmsg" class="inp" autocomplete="off"></div>
        <div class="field"><label for="sg-rsig">Received signature</label><input id="sg-rsig" class="inp num" inputmode="numeric" autocomplete="off"></div>
      </div>
      <div class="row tight">
        <button type="button" class="btn small" id="sg-t1">Tamper: change one character</button>
        <button type="button" class="btn small" id="sg-t2">Tamper: change the signature</button>
        <button type="button" class="btn small ghost" id="sg-reset">Restore the original</button>
      </div>
      <div id="sg-verify"></div>
    </div>
    <div class="bench">
      <h5 class="sub">3. Why the real thing needs big numbers: forge a signature</h5>
      <p class="small">With a small n there are only n possible values of h. An attacker tries variations of a message they would like you to have signed until one lands on the same h as your genuine message. Your old signature then verifies the forgery.</p>
      <div class="field"><label for="sg-evil">Message the attacker wants</label><input id="sg-evil" class="inp" autocomplete="off" value="I owe Mallory 900 dollars."></div>
      <div class="row"><button type="button" class="btn primary" id="sg-forge">Search for a forgery</button></div>
      <div id="sg-forge-out"></div>
    </div>
  </section>
  <section class="block"><header><span class="eyebrow">Practice</span><h3>Try it yourself</h3></header><div id="sg-ch"></div></section>`;

  const K_ = () => TD.state.rsa;
  const hOf = (msg, n) => BigInt('0x' + shaText(msg)) % n;
  let sig = null, signedMsg = '';
  function renderSign() {
    const k = K_();
    if (!k.valid) {
      $('#sg-key').innerHTML = `<p class="warn">Build an RSA key in the RSA lab first. This tab signs with it.</p>`;
      ['#sg-sign', '#sg-verify'].forEach(s => ($(s).innerHTML = '')); sig = null; return;
    }
    $('#sg-key').innerHTML = `<div class="keycards">
      <div class="keycard priv"><div class="k-top"><span class="k-title">Signer's private key</span><span class="k-who">from the RSA lab</span></div><div class="k-val">(d, n) = (${k.d}, ${k.n})</div></div>
      <div class="keycard pub"><div class="k-top"><span class="k-title">Public key for verifying</span><span class="k-who">anyone has it</span></div><div class="k-val">(e, n) = (${k.e}, ${k.n})</div></div></div>`;
    const msg = $('#sg-msg').value, full = shaText(msg), h = BigInt('0x' + full) % k.n;
    sig = modPow(h, k.d, k.n); signedMsg = msg;
    $('#sg-sign').innerHTML = `<div class="math">
      SHA-256(message) = <span class="wrap-any">${full}</span><br>
      as a number mod n: h = ${h}<br>
      s = h<sup>d</sup> mod n = ${h}<sup>${k.d}</sup> mod ${k.n} = <strong>${sig}</strong></div>
      <details class="more"><summary>Square-and-multiply for the signature</summary>${traceTable(modPowTrace(h, k.d, k.n))}</details>`;
    $('#sg-rmsg').value = msg; $('#sg-rsig').value = String(sig);
    renderVerify();
  }
  function renderVerify() {
    const k = K_(); if (!k.valid || sig === null) return;
    const m = $('#sg-rmsg').value, s = parseBig($('#sg-rsig').value);
    if (s === null || s < 0n || s >= k.n) { $('#sg-verify').innerHTML = `<p class="small">${pill(false, `The signature must be a whole number between 0 and ${k.n - 1n}`)}</p>`; return; }
    const h2 = hOf(m, k.n), v = modPow(s, k.e, k.n), ok = v === h2;
    const changedMsg = m !== signedMsg, changedSig = s !== sig;
    let why;
    if (ok && (changedMsg || changedSig)) why = `It verifies anyway. With n = ${k.n} only ${k.n} values of h exist, so roughly 1 tampered message in ${k.n} collides by chance. A real 2048-bit setup makes this chance about 2<sup>−256</sup>.`;
    else if (ok) why = 'The received message and signature are exactly what the signer produced.';
    else if (changedMsg && changedSig) why = 'Both the message and the signature changed.';
    else if (changedMsg) why = 'The message changed, so its hash changed completely (avalanche), and the signature no longer matches it.';
    else if (changedSig) why = 'The signature changed. Raising it to e gives an unrelated number, not the hash.';
    else why = '';
    $('#sg-verify').innerHTML = `<div class="math">
      h′ = SHA-256(received message) mod n = ${h2}<br>
      s<sup>e</sup> mod n = ${s}<sup>${k.e}</sup> mod ${k.n} = ${v}<br>
      ${v} ${ok ? '=' : '≠'} ${h2}</div>
      <p class="verdict ${ok ? 'ok' : 'bad'}">${ok ? 'Valid signature' : 'Invalid signature'}</p>
      <p class="small">${why}</p>`;
  }
  $('#sg-msg').addEventListener('input', debounce(renderSign, 120));
  ['#sg-rmsg', '#sg-rsig'].forEach(s => $(s).addEventListener('input', debounce(renderVerify, 80)));
  $('#sg-t1').addEventListener('click', () => {
    const m = $('#sg-rmsg').value || 'x', i = m.search(/\d/) >= 0 ? m.search(/\d/) : Math.floor(m.length / 2);
    const c = m[i], rep = /\d/.test(c) ? String((+c + 4) % 10) : c === 'e' ? 'a' : 'e';
    $('#sg-rmsg').value = m.slice(0, i) + rep + m.slice(i + 1); renderVerify();
  });
  $('#sg-t2').addEventListener('click', () => { const k = K_(); const s = parseBig($('#sg-rsig').value) ?? 0n; $('#sg-rsig').value = String((s + 1n) % k.n); renderVerify(); });
  $('#sg-reset').addEventListener('click', () => { $('#sg-rmsg').value = signedMsg; $('#sg-rsig').value = String(sig); renderVerify(); });
  $('#sg-forge').addEventListener('click', async () => {
    const k = K_(), out = $('#sg-forge-out');
    if (!k.valid || sig === null) { out.innerHTML = `<p class="small">${pill(false, 'Build an RSA key first')}</p>`; return; }
    if (k.n > 50000000n) { out.innerHTML = `<p class="small">${info('n is too large for a quick search')} Expect about ${k.n} tries. That is the point: size protects you. Pick smaller primes in the lab to see a forgery.</p>`; return; }
    const target = hOf(signedMsg, k.n), base = $('#sg-evil').value.replace(/\s+$/, '');
    out.innerHTML = `<p class="small dim">Trying variations…</p>`; await tick();
    const t0 = performance.now();
    let found = null, i = 0;
    const variant = i => `${base}${' '.repeat(i % 4)}${i >= 4 ? ` #${Math.floor(i / 4)}` : ''}`;
    while (i < 4000000) {
      const cand = variant(i);
      if (cand !== signedMsg && hOf(cand, k.n) === target) { found = cand; break; }
      i++;
      if (i % 20000 === 0) await tick();
    }
    const ms = performance.now() - t0;
    if (!found) { out.innerHTML = `<p class="small">${pill(false, `No forgery in ${i.toLocaleString()} tries`)}</p>`; return; }
    out.innerHTML = `<div class="math">After ${(i + 1).toLocaleString()} tries (${ms.toFixed(0)} ms):<br>
      "<strong>${esc(found)}</strong>"<br>
      h = SHA-256(forgery) mod n = ${hOf(found, k.n)}, the same as your genuine message.<br>
      Your signature s = ${sig}: s<sup>e</sup> mod n = ${modPow(sig, k.e, k.n)} ${pill(true, 'verifies the forgery')}</div>
      <div class="row"><button type="button" class="btn small" id="sg-useforge">Put the forgery into the verifier</button></div>`;
    $('#sg-useforge').addEventListener('click', () => { $('#sg-rmsg').value = found; $('#sg-rsig').value = String(sig); renderVerify(); $('#sg-verify').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  });
  TD.on('rsakey', renderSign);
  renderSign();

  TD.challenge($('#sg-ch'), 'Signatures', [
    () => {
      const n = 3233n, e = 17n, d = 2753n, h = BigInt(randInt(2, 3000)), good = Math.random() < 0.5;
      const s = good ? modPow(h, d, n) : (modPow(h, d, n) + BigInt(randInt(1, 50))) % n;
      const ok = modPow(s, e, n) === h;
      return { q: `<p>Public key (e, n) = (17, 3233). A message has h = ${h}. Its claimed signature is s = ${s}. Is the signature valid? Answer yes or no.</p>`,
        check: v => /^(y|n)/i.test(v) && /^y/i.test(v) === ok, hint: 'Compute s<sup>17</sup> mod 3233 and compare it with h.',
        solution: `${s}<sup>17</sup> mod 3233 = ${modPow(s, e, n)}, ${ok ? 'which equals h, so yes' : `which is not ${h}, so no`}.` };
    },
    () => {
      const n = 187n, d = 23n, h = BigInt(randInt(2, 180)), s = modPow(h, d, n);
      return { q: `<p>Private key (d, n) = (23, 187). Sign the hash value h = ${h}.</p>`, check: TD.numCheck(s), hint: 's = h<sup>d</sup> mod n.', solution: `${h}<sup>23</sup> mod 187 = ${s}. Check: ${s}<sup>7</sup> mod 187 = ${modPow(s, 7n, n)}.` };
    },
  ]);
})();
