/* Trapdoor core: hand-written BigInt math, DOM helpers, shared state, glossary tips and the challenge widget.
   Nothing here calls a crypto library. The only browser crypto API used is crypto.getRandomValues, as a source of random bytes. */
(function () {
  'use strict';
  const TD = (window.TD = {});

  /* ---------- arithmetic on BigInt ---------- */
  const mod = (a, m) => { const r = a % m; return r < 0n ? r + m : r; };
  const abs = a => (a < 0n ? -a : a);
  const bitLen = n => (n <= 0n ? 0 : n.toString(2).length);

  function gcd(a, b) { a = abs(a); b = abs(b); while (b) [a, b] = [b, a % b]; return a; }

  // Euclidean algorithm, one row per division: a = q*b + r
  function gcdSteps(a, b) {
    const rows = [];
    while (b !== 0n) { const q = a / b, r = a % b; rows.push({ a, b, q, r }); a = b; b = r; }
    return { g: a, rows };
  }

  function egcd(a, b) {
    let r0 = a, r1 = b, s0 = 1n, s1 = 0n, t0 = 0n, t1 = 1n;
    while (r1 !== 0n) {
      const q = r0 / r1;
      [r0, r1] = [r1, r0 - q * r1];
      [s0, s1] = [s1, s0 - q * s1];
      [t0, t1] = [t1, t0 - q * t1];
    }
    return { g: r0, x: s0, y: t0 };
  }

  // Extended Euclid as a table. Every row keeps the invariant r = s*a + t*b.
  function egcdTable(a, b) {
    const rows = [{ q: null, r: a, s: 1n, t: 0n }, { q: null, r: b, s: 0n, t: 1n }];
    while (rows[rows.length - 1].r !== 0n) {
      const x = rows[rows.length - 2], y = rows[rows.length - 1], q = x.r / y.r;
      rows.push({ q, r: x.r - q * y.r, s: x.s - q * y.s, t: x.t - q * y.t });
    }
    return rows;
  }

  function modInv(a, m) { const { g, x } = egcd(mod(a, m), m); return g === 1n ? mod(x, m) : null; }

  function modPow(b, e, m) {
    if (m === 1n) return 0n;
    let r = 1n; b = mod(b, m);
    while (e > 0n) { if (e & 1n) r = r * b % m; b = b * b % m; e >>= 1n; }
    return r;
  }

  // Left-to-right square-and-multiply, recording every step.
  function modPowTrace(base, exp, m) {
    base = mod(base, m);
    const bits = exp.toString(2), steps = [];
    let r = 1n;
    for (let i = 0; i < bits.length; i++) {
      const before = r, sq = r * r % m, mul = bits[i] === '1', after = mul ? sq * base % m : sq;
      steps.push({ bit: bits[i], before, sq, mul, after, prefix: BigInt('0b' + bits.slice(0, i + 1)) });
      r = after;
    }
    return { result: r, bits, steps, base, exp, m };
  }

  // floor of the k-th root, by Newton's method from above
  function iroot(n, k) {
    if (n < 2n) return n;
    const K = BigInt(k);
    let x = 1n << BigInt(Math.ceil(bitLen(n) / k));
    for (;;) {
      const y = ((K - 1n) * x + n / x ** (K - 1n)) / K;
      if (y >= x) break;
      x = y;
    }
    while (x ** K > n) x--;
    while ((x + 1n) ** K <= n) x++;
    return x;
  }

  // Trial division by 2, then odd numbers, up to floor(sqrt(n)). Keeps a few rows for display.
  function trialDivision(n, { keepHead = 6, keepTail = 2, maxTests = Infinity } = {}) {
    const res = { n, prime: false, lim: 0n, tested: 0, head: [], tail: [], factor: null, gaveUp: false };
    if (n < 2n) return res;
    res.lim = iroot(n, 2);
    let d = 2n;
    while (d <= res.lim) {
      const r = n % d, row = { d, r };
      res.tested++;
      if (res.head.length < keepHead) res.head.push(row);
      else { res.tail.push(row); if (res.tail.length > keepTail) res.tail.shift(); }
      if (r === 0n) { res.factor = d; return res; }
      if (res.tested >= maxTests) { res.gaveUp = true; return res; }
      d = d === 2n ? 3n : d + 2n;
    }
    res.prime = true;
    return res;
  }

  /* ---------- randomness and probable primes ---------- */
  function randBytes(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return a; }
  function bytesToBig(bytes) { let x = 0n; for (const b of bytes) x = (x << 8n) | BigInt(b); return x; }
  function bigToBytes(x) { const out = []; while (x > 0n) { out.unshift(Number(x & 255n)); x >>= 8n; } return out; }
  function randBelow(n) {
    if (n <= 0n) return 0n;
    const bits = bitLen(n), mask = (1n << BigInt(bits)) - 1n;
    for (;;) { const x = bytesToBig(randBytes(Math.ceil(bits / 8))) & mask; if (x < n) return x; }
  }
  function randBits(bits) {
    const x = bytesToBig(randBytes(Math.ceil(bits / 8))) & ((1n << BigInt(bits)) - 1n);
    return x | (1n << BigInt(bits - 1));
  }
  const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  const SMALL_PRIMES = (() => {
    const out = [], sieve = new Uint8Array(2000);
    for (let i = 2; i < 2000; i++) if (!sieve[i]) { out.push(i); for (let j = i * i; j < 2000; j += i) sieve[j] = 1; }
    return out;
  })();

  // Miller-Rabin. Used to generate the large primes in the attacks corner, not shown step by step.
  function isProbablePrime(n, rounds = 24) {
    if (n < 2n) return false;
    for (const sp of SMALL_PRIMES) { const P = BigInt(sp); if (n === P) return true; if (n % P === 0n) return false; }
    let d = n - 1n, s = 0;
    while ((d & 1n) === 0n) { d >>= 1n; s++; }
    outer: for (let i = 0; i < rounds; i++) {
      const a = 2n + randBelow(n - 3n);
      let x = modPow(a, d, n);
      if (x === 1n || x === n - 1n) continue;
      for (let j = 1; j < s; j++) { x = x * x % n; if (x === n - 1n) continue outer; }
      return false;
    }
    return true;
  }
  function randomPrime(bits, ok = () => true) {
    for (;;) { const c = randBits(bits) | 1n; if (ok(c) && isProbablePrime(c)) return c; }
  }

  Object.assign(TD, {
    mod, abs, bitLen, gcd, gcdSteps, egcd, egcdTable, modInv, modPow, modPowTrace, iroot, trialDivision,
    randBytes, bytesToBig, bigToBytes, randBelow, randBits, randInt, pick, isProbablePrime, randomPrime, SMALL_PRIMES,
  });

  /* ---------- DOM helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const parseBig = s => { s = String(s ?? '').trim().replace(/[\s_]/g, ''); return /^-?\d+$/.test(s) ? BigInt(s) : null; };
  const pill = (ok, text) => `<span class="pill ${ok ? 'ok' : 'bad'}">${text}</span>`;
  const info = text => `<span class="pill info">${text}</span>`;
  const short = (x, keep = 10) => {
    const s = x.toString();
    return s.length <= keep * 2 + 3 ? s : `${s.slice(0, keep)}…${s.slice(-keep)} <span class="dim">(${s.length} digits)</span>`;
  };
  const debounce = (fn, ms = 140) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const tick = () => new Promise(r => setTimeout(r, 16));
  const utf8 = s => new TextEncoder().encode(s);
  const fromUtf8 = bytes => new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
  const hex2 = b => b.toString(16).padStart(2, '0');

  function copyText(text, btn) {
    const done = ok => {
      if (!btn) return;
      const old = btn.dataset.label || btn.textContent;
      btn.dataset.label = old;
      btn.textContent = ok ? 'Copied' : 'Select the text to copy';
      setTimeout(() => (btn.textContent = old), 1500);
    };
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove(); done(ok);
    };
    try { navigator.clipboard.writeText(text).then(() => done(true), fallback); } catch (e) { fallback(); }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-copy]');
    if (b) copyText(b.getAttribute('data-copy'), b);
  });

  // Square-and-multiply trace as a table
  function traceTable(t, { name = 'n', maxRows = 40 } = {}) {
    const rows = t.steps.map((s, i) => `<tr>
      <td>${i + 1}</td><td class="c">${s.bit}</td>
      <td>${s.before}² mod ${name} = ${s.sq}</td>
      <td>${s.mul ? `${s.sq} × ${t.base} mod ${name} = ${s.after}` : '<span class="dim">bit is 0, skip</span>'}</td>
      <td>${t.base}<sup>${s.prefix}</sup></td></tr>`);
    let body = rows;
    if (rows.length > maxRows) body = [...rows.slice(0, 12), `<tr><td colspan="5" class="l dim">… ${rows.length - 16} more rows …</td></tr>`, ...rows.slice(-4)];
    const sq = t.steps.length, mul = t.steps.filter(s => s.mul).length;
    const naive = t.exp > 1n ? t.exp - 1n : 0n;
    return `<p class="small">Compute <span class="mono">${t.base}<sup>${t.exp}</sup> mod ${t.m}</span>. In binary the exponent is <span class="mono">${t.bits}</span>. Read the bits left to right: square the running result for every bit, and also multiply by ${t.base} when the bit is 1.</p>
    <div class="scroll"><table class="tbl">
      <thead><tr><th>#</th><th class="c">bit</th><th>square</th><th>multiply if bit is 1</th><th>so far</th></tr></thead>
      <tbody>${body.join('')}</tbody></table></div>
    <p class="small">Result: <strong class="mono">${t.result}</strong>. That took ${sq} squarings and ${mul} multiplications, against ${naive} multiplications done one at a time.</p>`;
  }

  /* ---------- shared state and events ---------- */
  TD.state = { rsa: { valid: false } };
  const bus = new EventTarget();
  TD.on = (name, fn) => bus.addEventListener(name, e => fn(e.detail));
  TD.emit = (name, detail) => bus.dispatchEvent(new CustomEvent(name, { detail }));

  /* ---------- glossary terms inline ---------- */
  TD.GLOSSARY = {};
  function g(key, label) {
    const e = TD.GLOSSARY[key];
    if (!e) console.warn('Missing glossary term', key);
    return `<button type="button" class="gt" data-g="${key}">${label ?? (e ? e.term : key)}</button>`;
  }

  const tip = () => document.getElementById('tip');
  let tipFor = null, hideTimer = null;
  function showTip(el) {
    const e = TD.GLOSSARY[el.dataset.g], t = tip();
    if (!e || !t) return;
    clearTimeout(hideTimer);
    t.innerHTML = `<strong>${esc(e.term)}</strong><span>${e.def}</span><button type="button" class="tip-link" data-open-g="${el.dataset.g}">Open in glossary</button>`;
    t.hidden = false;
    const r = el.getBoundingClientRect(), w = t.offsetWidth, h = t.offsetHeight;
    let left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8), top = r.bottom + 8;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
    t.style.left = left + 'px'; t.style.top = top + 'px';
    tipFor = el;
  }
  function hideTip(now) {
    clearTimeout(hideTimer);
    const run = () => { const t = tip(); if (t) t.hidden = true; tipFor = null; };
    if (now) run(); else hideTimer = setTimeout(run, 220);
  }
  document.addEventListener('mouseover', e => {
    const el = e.target.closest('.gt');
    if (el && el !== tipFor) showTip(el);
    else if (e.target.closest('#tip')) clearTimeout(hideTimer);
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest('.gt') || e.target.closest('#tip')) hideTip(false);
  });
  document.addEventListener('focusin', e => { const el = e.target.closest('.gt'); if (el) showTip(el); });
  document.addEventListener('focusout', e => { if (e.target.closest('.gt')) hideTip(false); });
  document.addEventListener('click', e => {
    const open = e.target.closest('[data-open-g]');
    if (open) { hideTip(true); TD.openGlossary && TD.openGlossary(open.dataset.openG); return; }
    const el = e.target.closest('.gt');
    if (el) { if (tipFor === el && !tip().hidden) hideTip(true); else showTip(el); return; }
    if (!e.target.closest('#tip')) hideTip(true);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hideTip(true); });
  window.addEventListener('scroll', () => tipFor && hideTip(true), { passive: true });

  /* ---------- "Try it" challenges ---------- */
  let chCount = 0;
  // gens: functions returning { q, check(input) -> true | {ok, msg}, hint, solution }
  function challenge(el, title, gens) {
    if (!el) return;
    const id = 'challenge-' + (++chCount);
    el.classList.add('challenge');
    el.innerHTML = `
      <div class="ch-head"><span class="eyebrow">Try it</span><h4>${title}</h4></div>
      <div class="ch-q"></div>
      <form class="ch-form" novalidate>
        <label class="sr" for="${id}">Your answer</label>
        <input id="${id}" class="inp" autocomplete="off" spellcheck="false" placeholder="Your answer">
        <button class="btn primary" type="submit">Check</button>
      </form>
      <div class="ch-fb" aria-live="polite"></div>
      <div class="ch-actions">
        <button type="button" class="btn small ghost" data-a="hint">Hint</button>
        <button type="button" class="btn small ghost" data-a="sol">Show solution</button>
        <button type="button" class="btn small" data-a="next">New challenge</button>
      </div>
      <div class="ch-extra"></div>`;
    const q = $('.ch-q', el), fb = $('.ch-fb', el), ex = $('.ch-extra', el), inp = $('input', el);
    let gi = 0, cur;
    const next = () => { cur = gens[gi % gens.length](); gi++; q.innerHTML = cur.q; inp.value = ''; fb.innerHTML = ''; ex.innerHTML = ''; };
    $('form', el).addEventListener('submit', e => {
      e.preventDefault();
      const v = inp.value.trim();
      if (!v) { fb.innerHTML = info('Type an answer first'); return; }
      const r = cur.check(v), ok = r === true || (r && r.ok);
      fb.innerHTML = ok
        ? `${pill(true, 'Correct')} ${(r && r.msg) || ''}`
        : `${pill(false, 'Not yet')} ${(r && r.msg) || 'Check the arithmetic and try again, or open the hint.'}`;
    });
    el.addEventListener('click', e => {
      const a = e.target.closest('[data-a]');
      if (!a) return;
      if (a.dataset.a === 'hint') ex.innerHTML = `<p class="small">${cur.hint}</p>`;
      if (a.dataset.a === 'sol') ex.innerHTML = `<div class="math">${cur.solution}</div>`;
      if (a.dataset.a === 'next') next();
    });
    next();
  }
  const numCheck = expected => v => { const x = parseBig(v); return x !== null && x === BigInt(expected); };

  Object.assign(TD, {
    $, $$, esc, parseBig, pill, info, short, debounce, tick, utf8, fromUtf8, hex2, copyText, traceTable, g, challenge, numCheck,
  });
})();
