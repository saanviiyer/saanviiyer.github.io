/* Module 5: AES-128, one block through all ten rounds, with every intermediate state. */
(function () {
  'use strict';
  const { $, $$, esc, g, pill, info, debounce, hex2, utf8, randInt, pick } = TD;

  /* ---------- GF(2^8) and the S-box, built from scratch ---------- */
  function gmul(a, b) {
    let p = 0;
    for (let i = 0; i < 8; i++) {
      if (b & 1) p ^= a;
      const hi = a & 0x80;
      a = (a << 1) & 0xff;
      if (hi) a ^= 0x1b; // reduce by x^8 + x^4 + x^3 + x + 1
      b >>= 1;
    }
    return p;
  }
  const INV = new Uint8Array(256);
  for (let a = 1; a < 256; a++) for (let b = 1; b < 256; b++) if (gmul(a, b) === 1) { INV[a] = b; break; }
  const rotl8 = (x, s) => ((x << s) | (x >> (8 - s))) & 0xff;
  const affine = b => b ^ rotl8(b, 1) ^ rotl8(b, 2) ^ rotl8(b, 3) ^ rotl8(b, 4) ^ 0x63;
  const SBOX = Array.from({ length: 256 }, (_, a) => affine(INV[a]));
  const RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

  const toState = bytes => [0, 1, 2, 3].map(r => [0, 1, 2, 3].map(c => bytes[r + 4 * c]));
  const fromState = s => { const out = []; for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) out.push(s[r][c]); return out; };
  const copy = s => s.map(r => r.slice());

  function expandKey(key) {
    const w = [], detail = [];
    for (let i = 0; i < 4; i++) w.push(key.slice(4 * i, 4 * i + 4));
    for (let i = 4; i < 44; i++) {
      let t = w[i - 1].slice();
      const d = { i, prev: t.slice() };
      if (i % 4 === 0) {
        t = [t[1], t[2], t[3], t[0]]; d.rot = t.slice();
        t = t.map(b => SBOX[b]); d.sub = t.slice();
        t[0] ^= RCON[i / 4 - 1]; d.rcon = RCON[i / 4 - 1]; d.afterRcon = t.slice();
      }
      w.push(w[i - 4].map((b, k) => b ^ t[k]));
      d.w4 = w[i - 4]; d.out = w[i];
      detail.push(d);
    }
    const rk = r => [0, 1, 2, 3].map(row => [0, 1, 2, 3].map(c => w[4 * r + c][row]));
    return { w, detail, rk };
  }

  const subBytes = s => s.map(r => r.map(b => SBOX[b]));
  const shiftRows = s => s.map((r, i) => r.map((_, c) => r[(c + i) % 4]));
  const MIX = [[2, 3, 1, 1], [1, 2, 3, 1], [1, 1, 2, 3], [3, 1, 1, 2]];
  const mixColumns = s => { const o = copy(s); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[r][c] = MIX[r].reduce((acc, k, j) => acc ^ gmul(k, s[j][c]), 0); return o; };
  const addRoundKey = (s, k) => s.map((r, i) => r.map((b, c) => b ^ k[i][c]));

  function encryptTrace(input, key) {
    const K = expandKey(key), steps = [];
    let s = toState(input);
    steps.push({ round: 0, op: 'Input', before: null, after: copy(s) });
    const push = (round, op, fn, k) => { const before = s; s = fn(s); steps.push({ round, op, before, after: copy(s), key: k }); };
    push(0, 'AddRoundKey', x => addRoundKey(x, K.rk(0)), K.rk(0));
    for (let r = 1; r <= 10; r++) {
      push(r, 'SubBytes', subBytes);
      push(r, 'ShiftRows', shiftRows);
      if (r < 10) push(r, 'MixColumns', mixColumns);
      push(r, 'AddRoundKey', x => addRoundKey(x, K.rk(r)), K.rk(r));
    }
    return { steps, out: fromState(s), K };
  }

  // FIPS-197 Appendix C.1 known-answer test
  const KAT = { pt: '00112233445566778899aabbccddeeff', key: '000102030405060708090a0b0c0d0e0f', ct: '69c4e0d86a7b0430d8cdb78070b4c55a' };
  const toHex = bs => bs.map(hex2).join('');
  const parseHex = h => { h = h.replace(/\s+/g, '').toLowerCase(); return /^[0-9a-f]{32}$/.test(h) ? h.match(/../g).map(x => parseInt(x, 16)) : null; };
  const selfTest = toHex(encryptTrace(parseHex(KAT.pt), parseHex(KAT.key)).out) === KAT.ct;

  const OPS = {
    Input: {
      plain: 'The 16 input bytes are poured into a 4 × 4 grid called the state, column by column: bytes 0 to 3 fill the first column, 4 to 7 the second, and so on.',
      math: 'state[r][c] = input[r + 4c]',
    },
    SubBytes: {
      plain: 'Every byte is swapped for another using a fixed lookup table, the S-box. This is the only step that is not a simple linear mix, and it is what stops the cipher from being solved with straightforward algebra. Click a byte to see its lookup.',
      math: 'S(x) = A · x<sup>−1</sup> ⊕ 0x63, where x<sup>−1</sup> is the inverse in GF(2⁸) (0 maps to 0) and A rotates and XORs the bits: b ⊕ rotl(b,1) ⊕ rotl(b,2) ⊕ rotl(b,3) ⊕ rotl(b,4).',
    },
    ShiftRows: {
      plain: 'Row r slides left by r places, wrapping around. Row 0 stays put. After this step each column holds bytes that came from four different columns, so the next MixColumns blends bytes that started far apart.',
      math: 'state′[r][c] = state[r][(c + r) mod 4]',
    },
    MixColumns: {
      plain: 'Each column is multiplied by a fixed 4 × 4 matrix. Every output byte depends on all four bytes of its column, so a change to one byte spreads to the whole column. Two rounds of ShiftRows plus MixColumns spread one changed byte across the entire state. Click a column to see the arithmetic.',
      math: '[2 3 1 1; 1 2 3 1; 1 1 2 3; 3 1 1 2] × column, in GF(2⁸): "+" is XOR, "× 2" is a left shift that XORs in 0x1b on overflow, "× 3" is (× 2) ⊕ the byte.',
    },
    AddRoundKey: {
      plain: 'The state is combined with this round\'s 16-byte key using XOR. This is the only step that touches the key, and without it the other steps would be a public scramble anyone could undo.',
      math: 'state′[r][c] = state[r][c] ⊕ roundKey[r][c]',
    },
  };

  const root = $('#tab-aes');
  root.innerHTML = `
  <header class="tab-head">
    <span class="eyebrow">Module 5</span>
    <h2>AES-128</h2>
    <p class="lede">${g('aes', 'AES')} is a ${g('symmetric', 'symmetric')} ${g('blockcipher', 'block cipher')}: the same 16-byte key encrypts and decrypts, one 16-byte block at a time. It is what actually encrypts your data once a key exchange like Diffie-Hellman has agreed on a key.</p>
    <p>AES-128 runs 10 ${g('round', 'rounds')}. Each round applies four simple steps to a 4 × 4 grid of bytes. None of them is strong alone. Repeated ten times with different ${g('roundkey', 'round keys')}, they make every output bit depend on every input bit and every key bit.</p>
  </header>
  <section class="block">
    <div class="bench">
      <div class="two">
        <div class="field"><label for="aes-pt">Plaintext block</label><input id="aes-pt" class="inp" autocomplete="off" spellcheck="false" value="${KAT.pt}"></div>
        <div class="field"><label for="aes-key">Key</label><input id="aes-key" class="inp" autocomplete="off" spellcheck="false" value="${KAT.key}"></div>
      </div>
      <div class="row tight">
        <span class="flabel">Inputs are</span>
        <span class="seg" role="group" aria-label="Input format"><button type="button" aria-pressed="true" data-fmt="hex">32 hex digits</button><button type="button" aria-pressed="false" data-fmt="text">text, up to 16 characters</button></span>
        <button type="button" class="btn small" id="aes-kat">Load the FIPS-197 test vector</button>
      </div>
      <div id="aes-inmsg"></div>
      <div class="stepper">
        <button type="button" class="btn" id="aes-prev">Back</button>
        <input id="aes-range" type="range" min="0" max="40" value="0" aria-label="Step through AES">
        <button type="button" class="btn primary" id="aes-next">Next step</button>
      </div>
      <div class="aes-title"><span class="eyebrow" id="aes-round"></span><h4 id="aes-op"></h4></div>
      <div class="explain"><p class="small" id="aes-plain"></p><div class="math small" id="aes-math"></div></div>
      <div class="aes-flow" id="aes-flow"></div>
      <div id="aes-detail"></div>
      <div id="aes-out"></div>
      <details class="more"><summary>The ${'key schedule'}: all 44 words</summary><div id="aes-ks"></div></details>
    </div>
  </section>
  <section class="block"><header><span class="eyebrow">Practice</span><h3>Try it yourself</h3></header><div id="aes-ch"></div></section>`;

  let fmt = 'hex', trace = null, idx = 0, focus = null;
  function readInputs() {
    const a = $('#aes-pt').value, b = $('#aes-key').value;
    if (fmt === 'hex') {
      const pt = parseHex(a), key = parseHex(b);
      return { pt, key, err: !pt ? 'The plaintext must be exactly 32 hex digits (16 bytes).' : !key ? 'The key must be exactly 32 hex digits (16 bytes).' : null };
    }
    const enc = s => { const bs = [...utf8(s)]; if (bs.length > 16) return null; const pad = 16 - bs.length; return [...bs, ...Array(pad).fill(pad)].slice(0, 16); };
    const pt = enc(a), key = enc(b);
    return { pt, key, err: !pt ? 'The plaintext is longer than 16 bytes. AES encrypts one 16-byte block, and longer messages need a mode of operation.' : !key ? 'The key text is longer than 16 bytes.' : null, padded: true };
  }
  function grid(s, { cls = '', changed = null, clickable = '', caption = '' } = {}) {
    const cells = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const ch = changed && changed[r][c] !== s[r][c];
      const f = focus && ((focus.type === 'cell' && focus.r === r && focus.c === c) || (focus.type === 'col' && focus.c === c));
      cells.push(`<button type="button" class="cell${ch ? ' changed' : ''}${f ? ' focus' : ''}" ${clickable ? `data-cell="${r},${c}"` : 'tabindex="-1"'} aria-label="row ${r} column ${c}: ${hex2(s[r][c])}">${hex2(s[r][c])}</button>`);
    }
    return `<figure class="state-fig ${cls}"><div class="state">${cells.join('')}</div><figcaption>${caption}</figcaption></figure>`;
  }
  function render() {
    const inp = readInputs();
    $('#aes-inmsg').innerHTML = inp.err ? `<p class="small">${pill(false, inp.err)}</p>`
      : `<p class="small">${inp.padded ? `${info('Text mode')} Bytes are UTF-8, padded to 16 with PKCS#7 (each pad byte holds the pad length). Plaintext hex ${toHex(inp.pt)}, key hex ${toHex(inp.key)}.` : ''}</p>`;
    if (inp.err) { trace = null; ['#aes-flow', '#aes-detail', '#aes-out', '#aes-ks'].forEach(s => ($(s).innerHTML = '')); return; }
    trace = encryptTrace(inp.pt, inp.key);
    idx = Math.min(idx, trace.steps.length - 1);
    $('#aes-range').max = String(trace.steps.length - 1);
    drawStep();
    const ct = toHex(trace.out);
    const kat = toHex(inp.pt) === KAT.pt && toHex(inp.key) === KAT.key;
    $('#aes-out').innerHTML = `<div class="row"><div class="out grow"><span class="flabel">Ciphertext after round 10</span><span class="mono">${ct}</span></div><button type="button" class="btn small" data-copy="${ct}">Copy</button></div>
      <p class="small">${kat ? pill(ct === KAT.ct, ct === KAT.ct ? 'Matches the FIPS-197 published answer' : 'Does not match FIPS-197') : info(`Self-test against FIPS-197: ${selfTest ? 'passed' : 'failed'}`)} This shows a single block. Real use needs a ${g('mode', 'mode of operation')} such as GCM.</p>`;
    $('#aes-ks').innerHTML = `<p class="small">The 16-byte key gives words w0 to w3. Each later word is w[i−4] ⊕ w[i−1], except every fourth word, where w[i−1] is first rotated one byte left, run through the S-box and XORed with a round constant. Round r uses w[4r] to w[4r+3] as its columns.</p>
      <div class="scroll"><table class="tbl compact"><thead><tr><th>i</th><th>w[i−1]</th><th>rotate</th><th>S-box</th><th>⊕ Rcon</th><th>w[i−4]</th><th>w[i]</th></tr></thead><tbody>
      ${trace.K.w.slice(0, 4).map((w, i) => `<tr><td>${i}</td><td colspan="5" class="l dim">from the key</td><td>${toHex(w)}</td></tr>`).join('')}
      ${trace.K.detail.map(d => `<tr class="${d.rot ? 'hit' : ''}"><td>${d.i}</td><td>${toHex(d.prev)}</td><td>${d.rot ? toHex(d.rot) : ''}</td><td>${d.sub ? toHex(d.sub) : ''}</td><td>${d.rot ? `${hex2(d.rcon)} → ${toHex(d.afterRcon)}` : ''}</td><td>${toHex(d.w4)}</td><td><strong>${toHex(d.out)}</strong></td></tr>`).join('')}
      </tbody></table></div>`;
  }
  function drawStep() {
    if (!trace) return;
    const st = trace.steps[idx];
    $('#aes-range').value = String(idx);
    $('#aes-prev').disabled = idx === 0; $('#aes-next').disabled = idx === trace.steps.length - 1;
    $('#aes-round').textContent = st.op === 'Input' ? 'Start' : `Round ${st.round} of 10 · step ${idx} of ${trace.steps.length - 1}`;
    $('#aes-op').innerHTML = st.op === 'Input' ? 'The state' : `${g(st.op.toLowerCase(), st.op)}${st.round === 10 && st.op === 'AddRoundKey' ? ', final' : ''}${st.round === 10 && st.op === 'ShiftRows' ? ' (round 10 skips MixColumns)' : ''}`;
    $('#aes-plain').textContent = OPS[st.op].plain;
    $('#aes-math').innerHTML = OPS[st.op].math;
    const clickable = st.op === 'SubBytes' || st.op === 'MixColumns' || st.op === 'AddRoundKey';
    if (focus && ((focus.type === 'col') !== (st.op === 'MixColumns'))) focus = null;
    let flow;
    if (st.op === 'Input') flow = grid(st.after, { caption: 'state' });
    else if (st.op === 'AddRoundKey') flow = `${grid(st.before, { caption: 'before', clickable })}<span class="op-sym">⊕</span>${grid(st.key, { caption: `round key ${st.round}`, cls: 'key' })}<span class="op-sym">=</span>${grid(st.after, { changed: st.before, caption: 'after', clickable })}`;
    else flow = `${grid(st.before, { caption: 'before', clickable })}<span class="op-sym">→</span>${grid(st.after, { changed: st.before, caption: 'after, changed bytes highlighted', clickable })}`;
    $('#aes-flow').innerHTML = flow;
    $('#aes-detail').innerHTML = detail(st);
  }
  function detail(st) {
    const h = x => `0x${hex2(x)}`;
    if (st.op === 'SubBytes') {
      const { r, c } = focus && focus.type === 'cell' ? focus : { r: 0, c: 0 };
      const x = st.before[r][c], iv = INV[x];
      return `<div class="math small"><span class="lab">Byte at row ${r}, column ${c}${focus ? '' : ' (click any byte)'}</span>
        S-box lookup: row ${x >> 4} (high hex digit ${(x >> 4).toString(16)}), column ${x & 15} (low digit ${(x & 15).toString(16)}) → ${h(SBOX[x])}<br>
        How the table entry is built: inverse of ${h(x)} in GF(2⁸) is ${h(iv)}${x ? ` (check: ${h(x)} × ${h(iv)} = ${h(gmul(x, iv))})` : ' (0 has no inverse, so it maps to 0)'}<br>
        affine step: ${h(iv)} ⊕ rotl1 ⊕ rotl2 ⊕ rotl3 ⊕ rotl4 ⊕ 0x63 = ${h(affine(iv))}</div>`;
    }
    if (st.op === 'MixColumns') {
      const c = focus && focus.type === 'col' ? focus.c : 0;
      const col = [0, 1, 2, 3].map(r => st.before[r][c]);
      return `<div class="math small"><span class="lab">Column ${c}${focus ? '' : ' (click any byte to pick its column)'}</span>
        ${[0, 1, 2, 3].map(r => `out[${r}] = ${MIX[r].map((k, j) => `${k}·${hex2(col[j])}`).join(' ⊕ ')} = ${MIX[r].map((k, j) => hex2(gmul(k, col[j]))).join(' ⊕ ')} = <strong>${hex2(st.after[r][c])}</strong>`).join('<br>')}</div>`;
    }
    if (st.op === 'AddRoundKey') {
      const { r, c } = focus && focus.type === 'cell' ? focus : { r: 0, c: 0 };
      const a = st.before[r][c], k = st.key[r][c], bin = x => x.toString(2).padStart(8, '0');
      return `<div class="math small"><span class="lab">Byte at row ${r}, column ${c}${focus ? '' : ' (click any byte)'}</span>
        &nbsp;&nbsp;${bin(a)} (${hex2(a)})<br>⊕ ${bin(k)} (${hex2(k)})<br>= ${bin(a ^ k)} (<strong>${hex2(a ^ k)}</strong>)</div>`;
    }
    if (st.op === 'ShiftRows') return `<div class="math small">row 0: no shift<br>row 1: left by 1<br>row 2: left by 2<br>row 3: left by 3</div>`;
    return '';
  }
  root.addEventListener('click', e => {
    const f = e.target.closest('[data-fmt]');
    if (f) {
      fmt = f.dataset.fmt;
      $$('[data-fmt]', root).forEach(b => b.setAttribute('aria-pressed', String(b === f)));
      if (fmt === 'text') { $('#aes-pt').value = 'Two One Nine Two'; $('#aes-key').value = 'Thats my Kung Fu'; }
      else { $('#aes-pt').value = KAT.pt; $('#aes-key').value = KAT.key; }
      render(); return;
    }
    const cell = e.target.closest('[data-cell]');
    if (cell && trace) {
      const [r, c] = cell.dataset.cell.split(',').map(Number);
      focus = trace.steps[idx].op === 'MixColumns' ? { type: 'col', c } : { type: 'cell', r, c };
      drawStep();
    }
  });
  $('#aes-kat').addEventListener('click', () => {
    fmt = 'hex'; $$('[data-fmt]', root).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.fmt === 'hex')));
    $('#aes-pt').value = KAT.pt; $('#aes-key').value = KAT.key; render();
  });
  $('#aes-prev').addEventListener('click', () => { idx = Math.max(0, idx - 1); focus = null; drawStep(); });
  $('#aes-next').addEventListener('click', () => { idx = Math.min(trace.steps.length - 1, idx + 1); focus = null; drawStep(); });
  $('#aes-range').addEventListener('input', () => { idx = +$('#aes-range').value; focus = null; drawStep(); });
  ['#aes-pt', '#aes-key'].forEach(s => $(s).addEventListener('input', debounce(render, 150)));
  render();

  /* ---------- challenges ---------- */
  const hexCheck = want => v => { const x = v.trim().toLowerCase().replace(/^0x/, ''); return /^[0-9a-f]{1,2}$/.test(x) && parseInt(x, 16) === want; };
  TD.challenge($('#aes-ch'), 'AES', [
    () => {
      const x = randInt(0, 255);
      return { q: `<p>What does SubBytes turn the byte 0x${hex2(x)} into? Use the S-box detail above: pick any SubBytes step, then check your answer.</p>`, check: hexCheck(SBOX[x]),
        hint: `Step to a SubBytes stage and click a byte. The S-box row is the first hex digit (${(x >> 4).toString(16)}) and the column is the second (${(x & 15).toString(16)}).`,
        solution: `S(0x${hex2(x)}) = 0x${hex2(SBOX[x])}. The inverse of 0x${hex2(x)} in GF(2⁸) is 0x${hex2(INV[x])}, and the affine step gives 0x${hex2(SBOX[x])}.` };
    },
    () => {
      const a = randInt(0, 255), k = randInt(0, 255);
      return { q: `<p>AddRoundKey: what is 0x${hex2(a)} ⊕ 0x${hex2(k)}? Answer in hex.</p>`, check: hexCheck(a ^ k),
        hint: 'Write both in binary and XOR bit by bit: 1 where they differ.',
        solution: `${a.toString(2).padStart(8, '0')} ⊕ ${k.toString(2).padStart(8, '0')} = ${(a ^ k).toString(2).padStart(8, '0')} = 0x${hex2(a ^ k)}` };
    },
    () => {
      const x = randInt(0, 255);
      return { q: `<p>In MixColumns, what is 2 · 0x${hex2(x)} in GF(2⁸)? Answer in hex.</p>`, check: hexCheck(gmul(2, x)),
        hint: 'Shift left by one bit and drop the overflow. If the top bit was 1, XOR the result with 0x1b.',
        solution: `0x${hex2(x)} = ${x.toString(2).padStart(8, '0')}. Shifted: ${((x << 1) & 0xff).toString(2).padStart(8, '0')}${x & 0x80 ? ', top bit was 1, so XOR 0x1b' : ''} → 0x${hex2(gmul(2, x))}` };
    },
  ]);
})();
