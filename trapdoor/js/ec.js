/* Module 4: elliptic curves over a small finite field, point addition and doubling, scalar multiplication, ECDH. */
(function () {
  'use strict';
  const { $, $$, g, pill, info, debounce, randInt, pick } = TD;
  const root = $('#tab-ec');

  /* ---------- arithmetic mod a small prime, with Numbers ---------- */
  const m = (a, p) => ((a % p) + p) % p;
  function inv(a, p) {
    let [r0, r1, t0, t1] = [p, m(a, p), 0, 1];
    while (r1) { const q = Math.floor(r0 / r1); [r0, r1] = [r1, r0 - q * r1]; [t0, t1] = [t1, t0 - q * t1]; }
    return r0 === 1 ? m(t0, p) : null;
  }
  const isPrime = n => { if (n < 2 || n % 1) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };
  const O = null; // point at infinity
  const fmtP = P => (P ? `(${P[0]}, ${P[1]})` : 'O');
  const eq = (P, Q) => (P === Q) || (P && Q && P[0] === Q[0] && P[1] === Q[1]);

  // Returns the sum plus a human-readable derivation.
  function add(C, P, Q) {
    const { p, a } = C;
    if (!P) return { R: Q, lines: [`O is the identity, so O + Q = Q = ${fmtP(Q)}.`], kind: 'identity' };
    if (!Q) return { R: P, lines: [`O is the identity, so P + O = P = ${fmtP(P)}.`], kind: 'identity' };
    const [x1, y1] = P, [x2, y2] = Q;
    if (x1 === x2 && m(y1 + y2, p) === 0) return { R: O, lines: [`x₁ = x₂ and y₂ = −y₁ mod ${p}, so the line is vertical. P + Q = O, the point at infinity.`], kind: 'vertical' };
    let lam, lines = [];
    if (eq(P, Q)) {
      const num = m(3 * x1 * x1 + a, p), den = m(2 * y1, p), di = inv(den, p);
      lam = m(num * di, p);
      lines.push(`Doubling uses the tangent slope: λ = (3x₁² + a) / (2y₁) mod ${p}`);
      lines.push(`= (3·${x1}² + ${a}) / (2·${y1}) = ${num} / ${den} = ${num} × ${den}<sup>−1</sup> = ${num} × ${di} mod ${p} = <strong>${lam}</strong>`);
    } else {
      const num = m(y2 - y1, p), den = m(x2 - x1, p), di = inv(den, p);
      lam = m(num * di, p);
      lines.push(`Chord slope: λ = (y₂ − y₁) / (x₂ − x₁) mod ${p}`);
      lines.push(`= (${y2} − ${y1}) / (${x2} − ${x1}) = ${num} / ${den} = ${num} × ${den}<sup>−1</sup> = ${num} × ${di} mod ${p} = <strong>${lam}</strong>`);
    }
    const x3 = m(lam * lam - x1 - x2, p), y3 = m(lam * (x1 - x3) - y1, p);
    lines.push(`x₃ = λ² − x₁ − x₂ = ${lam}² − ${x1} − ${x2} mod ${p} = <strong>${x3}</strong>`);
    lines.push(`y₃ = λ(x₁ − x₃) − y₁ = ${lam}·(${x1} − ${x3}) − ${y1} mod ${p} = <strong>${y3}</strong>`);
    lines.push(`The line meets the curve a third time at (${x3}, ${m(-y3, p)}). Reflecting gives P + Q = <strong>(${x3}, ${y3})</strong>.`);
    return { R: [x3, y3], lam, third: [x3, m(-y3, p)], lines, kind: eq(P, Q) ? 'double' : 'chord' };
  }
  function mul(C, k, P) { // double-and-add, with trace
    let R = O; const steps = [];
    const bits = k.toString(2);
    for (const b of bits) {
      R = add(C, R, R).R; const dbl = R;
      if (b === '1') R = add(C, R, P).R;
      steps.push({ b, dbl, R });
    }
    return { R, steps, bits };
  }
  function points(C) {
    const pts = [];
    for (let x = 0; x < C.p; x++) { const r = m(x * x * x + C.a * x + C.b, C.p); for (let y = 0; y < C.p; y++) if (m(y * y, C.p) === r) pts.push([x, y]); }
    return pts;
  }
  function orderOfPoint(C, P) { let Q = P, k = 1; while (Q) { Q = add(C, Q, P).R; k++; if (k > 4 * C.p + 10) return null; } return k; }

  root.innerHTML = `
  <header class="tab-head">
    <span class="eyebrow">Module 4</span>
    <h2>Elliptic curves</h2>
    <p class="lede">An ${g('ec', 'elliptic curve')} is a set of points with a strange but consistent way of adding them. Adding a point to itself many times is fast. Working out how many times was used, from the result alone, is very hard.</p>
    <p>That one-way step does the same job as g<sup>a</sup> mod p in Diffie-Hellman, with much smaller numbers. A 256-bit curve key is about as strong as a 3072-bit RSA key.</p>
  </header>

  <section class="block">
    <header><span class="eyebrow">Intuition first</span><h3>Adding points on a real curve</h3></header>
    <div class="explain"><div class="prose">
      <p>Draw a straight line through two points P and Q on the curve. It always hits the curve at exactly one more point. Flip that point over the x-axis, and the result is P + Q. To add a point to itself, use the tangent line at that point.</p>
      <p>If the line is vertical, there is no third point on the page. We say it meets the ${g('infinity', 'point at infinity')}, O, which acts like zero.</p>
    </div></div>
    <div class="bench">
      <div class="row">
        <div class="field grow"><label for="rc-p">P, x-coordinate: <span id="rc-pv" class="mono"></span></label><input id="rc-p" type="range" min="-1.3" max="2.4" step="0.01" value="-1"></div>
        <div class="field grow"><label for="rc-q">Q, x-coordinate: <span id="rc-qv" class="mono"></span></label><input id="rc-q" type="range" min="-1.3" max="2.4" step="0.01" value="0.4"></div>
      </div>
      <div class="plot" id="rc-plot"></div>
      <p class="small dim">Curve: y² = x³ − x + 1 over the real numbers. Set both sliders to the same value to see doubling.</p>
    </div>
  </section>

  <section class="block">
    <header><span class="eyebrow">The real thing</span><h3>The same rule over a finite field</h3></header>
    <div class="explain">
      <div class="prose"><p>Cryptography uses whole numbers mod a prime p, a ${g('finitefield', 'finite field')}. The smooth curve becomes a scatter of dots, but the formulas are the same. Division becomes multiplication by a ${g('inverse', 'modular inverse')}. The "line" through two points wraps around the edges, shown as faint dots.</p>
      <p>Click a dot to set P, then another to set Q.</p></div>
      <div class="math"><span class="lab">The math</span>curve: y² ≡ x³ + ax + b (mod p), with 4a³ + 27b² ≢ 0<br>
        P + Q: λ = (y₂ − y₁)(x₂ − x₁)<sup>−1</sup><br>
        P + P: λ = (3x₁² + a)(2y₁)<sup>−1</sup><br>
        x₃ = λ² − x₁ − x₂, &nbsp;y₃ = λ(x₁ − x₃) − y₁ (all mod p)</div>
    </div>
    <div class="bench">
      <div class="row">
        <div class="field"><label for="ec-p">p (prime, at most 97)</label><input id="ec-p" class="inp num" inputmode="numeric" value="17"></div>
        <div class="field"><label for="ec-a">a</label><input id="ec-a" class="inp num" inputmode="numeric" value="2"></div>
        <div class="field"><label for="ec-b">b</label><input id="ec-b" class="inp num" inputmode="numeric" value="2"></div>
        <div class="field"><span class="flabel">Clicking sets</span>
          <span class="seg" role="group" aria-label="Which point a click sets"><button type="button" aria-pressed="true" data-ec="P">P</button><button type="button" aria-pressed="false" data-ec="Q">Q</button></span></div>
      </div>
      <div id="ec-info"></div>
      <div class="ec-layout">
        <div class="plot" id="ec-plot"></div>
        <div class="ec-side">
          <div class="row tight">
            <button type="button" class="btn primary" id="ec-add">P + Q</button>
            <button type="button" class="btn" id="ec-dbl">P + P</button>
          </div>
          <div id="ec-steps"></div>
        </div>
      </div>
    </div>
  </section>

  <section class="block">
    <header><span class="eyebrow">Building up</span><h3>Scalar multiplication and ECDH</h3></header>
    <div class="explain">
      <div class="prose"><p>${g('scalar', 'Scalar multiplication')} kG means G + G + … + G, k times. Double-and-add does it in about two steps per bit of k, just like square-and-multiply. Going backwards, from kG to k, is the elliptic curve discrete logarithm problem.</p>
      <p>${g('ecdh', 'ECDH')} is Diffie-Hellman with points. Alice publishes A = aG, Bob publishes B = bG, and both compute the shared point abG.</p></div>
      <div class="math"><span class="lab">The math</span>Alice: S = a·B = a·(bG)<br>Bob: S = b·A = b·(aG)<br>Both equal (ab)·G.</div>
    </div>
    <div class="bench">
      <div class="row">
        <div class="field"><label for="ec-G">Base point G</label><select id="ec-G" class="inp"></select></div>
        <div class="field"><label for="ec-ka">Alice's secret a</label><input id="ec-ka" class="inp num" inputmode="numeric" value="3"></div>
        <div class="field"><label for="ec-kb">Bob's secret b</label><input id="ec-kb" class="inp num" inputmode="numeric" value="7"></div>
      </div>
      <div id="ec-mults"></div>
      <div id="ec-dh"></div>
    </div>
  </section>
  <section class="block"><header><span class="eyebrow">Practice</span><h3>Try it yourself</h3></header><div id="ec-ch"></div></section>`;

  /* ---------- real curve sketch ---------- */
  function realCurve() {
    const f = x => x ** 3 - x + 1;
    const px = +$('#rc-p').value, qx = +$('#rc-q').value;
    $('#rc-pv').textContent = px.toFixed(2); $('#rc-qv').textContent = qx.toFixed(2);
    const W = 520, H = 360, X0 = -2, X1 = 3, Y0 = -4, Y1 = 4;
    const sx = x => ((x - X0) / (X1 - X0)) * W, sy = y => H - ((y - Y0) / (Y1 - Y0)) * H;
    const root3 = -1.3247179572;
    let up = '', dn = '';
    for (let i = 0; i <= 300; i++) {
      const x = root3 + (i / 300) ** 2 * (X1 - root3), y = Math.sqrt(Math.max(0, f(x)));
      up += `${i ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`; dn += `${i ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(-y).toFixed(1)}`;
    }
    const P = [px, Math.sqrt(f(px))], Q = [qx, Math.sqrt(f(qx))];
    const same = Math.abs(px - qx) < 1e-9;
    const lam = same ? (3 * px * px - 1) / (2 * P[1]) : (Q[1] - P[1]) / (Q[0] - P[0]);
    const x3 = lam * lam - P[0] - Q[0], yOn = lam * (x3 - P[0]) + P[1], R = [x3, -yOn];
    const lx0 = X0, lx1 = X1;
    const line = `<line x1="${sx(lx0)}" y1="${sy(P[1] + lam * (lx0 - P[0]))}" x2="${sx(lx1)}" y2="${sy(P[1] + lam * (lx1 - P[0]))}" class="ln"/>`;
    const inView = pt => pt[0] > X0 && pt[0] < X1 && pt[1] > Y0 && pt[1] < Y1;
    const dot = (pt, cls, label, dx = 8, dy = -8) => inView(pt) ? `<circle cx="${sx(pt[0])}" cy="${sy(pt[1])}" r="5.5" class="${cls}"/><text x="${sx(pt[0]) + dx}" y="${sy(pt[1]) + dy}" class="lbl">${label}</text>` : '';
    $('#rc-plot').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Real elliptic curve with chord through P and Q">
      <line x1="0" y1="${sy(0)}" x2="${W}" y2="${sy(0)}" class="axis"/><line x1="${sx(0)}" y1="0" x2="${sx(0)}" y2="${H}" class="axis"/>
      <path d="${up}" class="crv"/><path d="${dn}" class="crv"/>
      <clipPath id="rcclip"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath>
      <g clip-path="url(#rcclip)">${line}
        ${inView(R) ? `<line x1="${sx(x3)}" y1="${sy(yOn)}" x2="${sx(x3)}" y2="${sy(-yOn)}" class="refl"/>` : ''}</g>
      ${dot([x3, yOn], 'pt-third', '−R', 8, 14)}${dot(P, 'pt-p', 'P')}${same ? '' : dot(Q, 'pt-q', 'Q')}${dot(R, 'pt-r', same ? '2P' : 'P + Q')}
    </svg>
    <p class="small mono">${same ? '2P' : 'P + Q'} = (${x3.toFixed(3)}, ${R[1].toFixed(3)})${inView(R) ? '' : ' (off the edge of this view)'}</p>`;
  }
  ['#rc-p', '#rc-q'].forEach(s => $(s).addEventListener('input', realCurve));
  realCurve();

  /* ---------- finite field curve ---------- */
  let C = null, pts = [], P = null, Q = null, R = null, res = null, clickSets = 'P', isDbl = false;
  function readCurve() {
    const p = +$('#ec-p').value, a = +$('#ec-a').value, b = +$('#ec-b').value;
    if (!Number.isInteger(p) || !isPrime(p) || p < 5 || p > 97) return { err: 'p must be a prime between 5 and 97' };
    if (!Number.isInteger(a) || !Number.isInteger(b)) return { err: 'a and b must be whole numbers' };
    if (m(4 * a ** 3 + 27 * b ** 2, p) === 0) return { err: `4a³ + 27b² ≡ 0 mod ${p}, so the curve has a cusp or crossing and the addition rule breaks. Change a or b.` };
    return { p, a: m(a, p), b: m(b, p) };
  }
  function setupCurve() {
    const c = readCurve();
    if (c.err) { $('#ec-info').innerHTML = `<p class="small">${pill(false, c.err)}</p>`; $('#ec-plot').innerHTML = ''; C = null; return; }
    C = c; pts = points(C);
    P = pts.find(t => t[0] === 5 && t[1] === 1) || pts[0] || null;
    Q = pts.find(t => t[0] === 6 && t[1] === 3) || pts[Math.min(3, pts.length - 1)] || null;
    res = null;
    $('#ec-info').innerHTML = `<p class="small">${info(`${pts.length + 1} points`)} ${pts.length} dots plus the point at infinity O. Curve y² = x³ + ${C.a}x + ${C.b} mod ${C.p}.</p>`;
    const sel = $('#ec-G');
    const orders = pts.map(t => orderOfPoint(C, t));
    const best = orders.indexOf(Math.max(...orders));
    sel.innerHTML = pts.map((t, i) => `<option value="${i}" ${i === best ? 'selected' : ''}>${fmtP(t)}, order ${orders[i]}</option>`).join('');
    doAdd(false); drawPlot(); renderMults();
  }
  function drawPlot() {
    if (!C) return;
    const p = C.p, pad = 30, cell = Math.max(5, Math.min(26, Math.floor(480 / p))), W = pad + cell * (p - 1) + 16, H = W;
    const X = x => pad + x * cell, Y = y => H - pad - y * cell + 16;
    let grid = '';
    const tickStep = p > 40 ? 10 : p > 20 ? 5 : 1;
    for (let i = 0; i < p; i += tickStep) grid += `<text x="${X(i)}" y="${H - 6}" class="tick" text-anchor="middle">${i}</text><text x="${pad - 8}" y="${Y(i) + 4}" class="tick" text-anchor="end">${i}</text>`;
    let line = '';
    if (res && res.lam !== undefined && P) {
      for (let x = 0; x < p; x++) { const y = m(res.lam * (x - P[0]) + P[1], p); line += `<circle cx="${X(x)}" cy="${Y(y)}" r="${Math.max(1.5, cell / 9)}" class="lndot"/>`; }
    } else if (res && res.kind === 'vertical' && P) line = `<line x1="${X(P[0])}" y1="${Y(0)}" x2="${X(P[0])}" y2="${Y(p - 1)}" class="ln"/>`;
    const r = Math.max(3, cell / 3.2);
    const role = t => (eq(t, P) ? 'pt-p' : !isDbl && eq(t, Q) ? 'pt-q' : eq(t, R) ? 'pt-r' : res && res.third && eq(t, res.third) ? 'pt-third' : 'pt');
    const dots = pts.map((t, i) => `<circle cx="${X(t[0])}" cy="${Y(t[1])}" r="${r}" class="${role(t)} clickable" data-pt="${i}" tabindex="0" role="button" aria-label="Point ${t[0]}, ${t[1]}"><title>(${t[0]}, ${t[1]})</title></circle>`).join('');
    const lab = (t, s, dy = -r - 4) => (t ? `<text x="${X(t[0]) + r + 2}" y="${Y(t[1]) + dy}" class="lbl">${s}</text>` : '');
    const labels = (isDbl || eq(P, Q) ? lab(P, 'P') : lab(P, 'P') + lab(Q, 'Q', r + 12)) + (R ? lab(R, isDbl ? '2P' : 'P+Q') : '') + (res && res.third && !eq(res.third, R) ? lab(res.third, '−R', r + 12) : '');
    $('#ec-plot').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="group" aria-label="Points of the curve mod ${p}">
      <rect x="${pad - 6}" y="${Y(p - 1) - 6}" width="${cell * (p - 1) + 12}" height="${cell * (p - 1) + 12}" class="frame"/>
      ${grid}${line}${dots}${labels}</svg>
      <p class="small dim legend"><span class="key k-p"></span>P <span class="key k-q"></span>Q <span class="key k-r"></span>result <span class="key k-t"></span>third point on the line</p>`;
  }
  function doAdd(dbl) {
    if (!C || !P) { $('#ec-steps').innerHTML = ''; return; }
    const B = dbl ? P : Q;
    res = add(C, P, B); R = res.R;
    $('#ec-steps').innerHTML = `<div class="math"><span class="lab">${dbl ? `2P with P = ${fmtP(P)}` : `${fmtP(P)} + ${fmtP(Q)}`}</span>${res.lines.join('<br>')}</div>
      ${R ? `<p class="small">Check: ${R[1]}² mod ${C.p} = ${m(R[1] * R[1], C.p)} and ${R[0]}³ + ${C.a}·${R[0]} + ${C.b} mod ${C.p} = ${m(R[0] ** 3 + C.a * R[0] + C.b, C.p)} ${pill(m(R[1] * R[1], C.p) === m(R[0] ** 3 + C.a * R[0] + C.b, C.p), 'on the curve')}</p>` : ''}`;
    isDbl = dbl || eq(P, Q);
    drawPlot();
  }
  $('#ec-add').addEventListener('click', () => doAdd(false));
  $('#ec-dbl').addEventListener('click', () => doAdd(true));
  root.addEventListener('click', e => {
    const s = e.target.closest('[data-ec]');
    if (s) { clickSets = s.dataset.ec; $$('[data-ec]', root).forEach(b => b.setAttribute('aria-pressed', String(b === s))); return; }
    const d = e.target.closest('[data-pt]');
    if (d) choosePt(+d.dataset.pt);
  });
  root.addEventListener('keydown', e => { const d = e.target.closest('[data-pt]'); if (d && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); choosePt(+d.dataset.pt); } });
  function choosePt(i) {
    if (clickSets === 'P') { P = pts[i]; clickSets = 'Q'; } else { Q = pts[i]; clickSets = 'P'; }
    $$('[data-ec]', root).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ec === clickSets)));
    doAdd(eq(P, Q));
  }
  ['#ec-p', '#ec-a', '#ec-b'].forEach(s => $(s).addEventListener('input', debounce(setupCurve, 200)));

  function renderMults() {
    if (!C || !pts.length) { $('#ec-mults').innerHTML = ''; $('#ec-dh').innerHTML = ''; return; }
    const G = pts[+$('#ec-G').value];
    const n = orderOfPoint(C, G);
    const list = [];
    let T = G;
    for (let k = 1; k <= n; k++) { list.push(T); T = add(C, T, G).R; }
    $('#ec-mults').innerHTML = `<p class="small">G = ${fmtP(G)} has order ${n}: after ${n} additions it reaches O and the cycle repeats. Secrets are numbers from 1 to ${n - 1}.</p>
      <div class="scroll"><table class="tbl compact"><thead><tr><th>k</th>${list.map((_, i) => `<th>${i + 1}</th>`).join('')}</tr></thead>
      <tbody><tr><th>kG</th>${list.map(t => `<td>${fmtP(t)}</td>`).join('')}</tr></tbody></table></div>`;
    const a = parseInt($('#ec-ka').value, 10), b = parseInt($('#ec-kb').value, 10);
    if (!(a >= 1 && a < n && b >= 1 && b < n)) { $('#ec-dh').innerHTML = `<p class="small">${pill(false, `a and b must be between 1 and ${n - 1}`)}</p>`; return; }
    const A = mul(C, a, G), Bp = mul(C, b, G), SA = mul(C, a, Bp.R), SB = mul(C, b, A.R);
    const tr = (t, k, base) => `<div class="scroll"><table class="tbl compact"><thead><tr><th>bit</th><th>double</th><th>add ${fmtP(base)} if bit is 1</th></tr></thead><tbody>
      ${t.steps.map(s => `<tr><td>${s.b}</td><td>${fmtP(s.dbl)}</td><td>${s.b === '1' ? fmtP(s.R) : '<span class="dim">skip</span>'}</td></tr>`).join('')}</tbody></table></div>
      <p class="small">${k} in binary is ${t.bits}.</p>`;
    $('#ec-dh').innerHTML = `<div class="trio">
      <div class="party alice"><h5>Alice</h5><div class="fact secret">secret a = ${a}</div><div class="fact">A = aG = <strong>${fmtP(A.R)}</strong></div><div class="fact shared">S = aB = <strong>${fmtP(SA.R)}</strong></div></div>
      <div class="party public"><h5>Public</h5><div class="fact">curve, G = ${fmtP(G)}</div><div class="fact">A = ${fmtP(A.R)}</div><div class="fact">B = ${fmtP(Bp.R)}</div></div>
      <div class="party bob"><h5>Bob</h5><div class="fact secret">secret b = ${b}</div><div class="fact">B = bG = <strong>${fmtP(Bp.R)}</strong></div><div class="fact shared">S = bA = <strong>${fmtP(SB.R)}</strong></div></div></div>
      <p class="small">${pill(eq(SA.R, SB.R), eq(SA.R, SB.R) ? `Shared point ${fmtP(SA.R)}, which is ${(a * b) % n}G` : 'Mismatch')} In practice the x-coordinate of the shared point becomes the key.</p>
      <details class="more"><summary>Double-and-add for A = ${a}G</summary>${tr(A, a, G)}</details>
      <details class="more"><summary>Double-and-add for Alice's S = ${a}B</summary>${tr(SA, a, Bp.R)}</details>`;
  }
  ['#ec-G', '#ec-ka', '#ec-kb'].forEach(s => $(s).addEventListener('input', debounce(renderMults, 100)));
  setupCurve();

  /* ---------- challenges ---------- */
  const C17 = { p: 17, a: 2, b: 2 }, P17 = points(C17);
  const ptCheck = R => v => {
    const nums = v.match(/-?\d+/g);
    if (!R) return /^o$|infinity/i.test(v.trim());
    return !!nums && nums.length === 2 && +nums[0] === R[0] && +nums[1] === R[1];
  };
  TD.challenge($('#ec-ch'), 'Elliptic curves', [
    () => {
      let A = pick(P17), B = pick(P17);
      while (eq(A, B) || A[0] === B[0]) B = pick(P17);
      const r = add(C17, A, B);
      return { q: `<p>On y² = x³ + 2x + 2 mod 17, add ${fmtP(A)} + ${fmtP(B)}. Answer as (x, y).</p>`, check: ptCheck(r.R),
        hint: 'λ = (y₂ − y₁) × (x₂ − x₁)<sup>−1</sup> mod 17, then x₃ = λ² − x₁ − x₂ and y₃ = λ(x₁ − x₃) − y₁. You can check with the plot above set to p = 17, a = 2, b = 2.',
        solution: r.lines.join('<br>') };
    },
    () => {
      const A = pick(P17.filter(t => t[1] !== 0)), r = add(C17, A, A);
      return { q: `<p>On y² = x³ + 2x + 2 mod 17, compute 2P for P = ${fmtP(A)}. Answer as (x, y).</p>`, check: ptCheck(r.R),
        hint: 'λ = (3x₁² + a) × (2y₁)<sup>−1</sup> mod 17 with a = 2.', solution: r.lines.join('<br>') };
    },
    () => {
      const x = randInt(0, 16), y = randInt(0, 16), on = m(y * y, 17) === m(x ** 3 + 2 * x + 2, 17);
      return { q: `<p>Is (${x}, ${y}) on y² = x³ + 2x + 2 mod 17? Answer yes or no.</p>`, check: v => /^(y|n)/i.test(v) && /^y/i.test(v) === on,
        hint: 'Compute both sides mod 17 and compare.', solution: `y² mod 17 = ${m(y * y, 17)}, x³ + 2x + 2 mod 17 = ${m(x ** 3 + 2 * x + 2, 17)}. ${on ? 'Equal, so yes.' : 'Different, so no.'}` };
    },
  ]);
})();
