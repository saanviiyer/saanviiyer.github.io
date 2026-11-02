/* Figures for "Interpretable neural networks to understand human behavior and
   learning". Each figure mounts into an element with data-ir="name". Numbers
   shown as measurements come from the post's own results; anything schematic
   says so in its caption. Styles come from forward-training.css. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var REDUCE = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var FIG = {};

  /* ---------- small helpers ---------- */
  function S(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function H(tag, attrs, parent, text) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function svgRoot(root, w, h, label) {
    return S('svg', { viewBox: '0 0 ' + w + ' ' + h, role: 'img', 'aria-label': label }, root);
  }
  function T(p, x, y, text, cls, style, anchor) {
    return S('text', { x: x, y: y, class: cls || 'ft-t', style: style || null, 'text-anchor': anchor || null }, p, text);
  }
  function line(p, x1, y1, x2, y2, style) { return S('line', { x1: x1, y1: y1, x2: x2, y2: y2, style: style }, p); }
  function ctrls(root) { return H('div', { class: 'ft-controls' }, root); }
  function btn(c, label, fn) {
    var b = H('button', { type: 'button', class: 'ft-btn' }, c, label);
    b.addEventListener('click', fn);
    return b;
  }
  function range(c, label, min, max, step, val, fn) {
    var w = H('label', { class: 'ft-range' }, c);
    H('span', null, w, label);
    var i = H('input', { type: 'range', min: min, max: max, step: step, value: val }, w);
    i.addEventListener('input', function () { fn(parseFloat(i.value)); });
    return i;
  }
  function out(c) { return H('span', { class: 'ft-readout' }, c); }
  function press(group, on) {
    group.forEach(function (b) { b.setAttribute('aria-pressed', b === on ? 'true' : 'false'); });
  }
  // Small seeded generator, so the schematic traces stay the same on every visit.
  function rng(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }
  function gauss(r) {
    return Math.sqrt(-2 * Math.log(Math.max(r(), 1e-9))) * Math.cos(2 * Math.PI * r());
  }

  /* ---------- animation loop, running only for figures on screen ---------- */
  var items = [];
  function register(root, tick) {
    var it = { tick: tick, on: false, t: 0 };
    items.push(it);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { it.on = e.isIntersecting; });
      }, { rootMargin: '120px 0px' }).observe(root);
    } else it.on = true;
    tick(0, 0, REDUCE);
  }
  var prev = 0;
  function frame(ts) {
    var dt = prev ? Math.min(0.05, (ts - prev) / 1000) : 0.016;
    prev = ts;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.on) { it.t += dt; it.tick(it.t, dt, false); }
    }
    requestAnimationFrame(frame);
  }

  /* =====================================================================
     1. Play the task yourself (schematic settings)
     ===================================================================== */
  var SHAPES = [
    'M24 6 A18 18 0 1 1 23.9 6 Z',
    'M8 8 H40 V40 H8 Z',
    'M24 5 L44 41 H4 Z',
    'M24 3 L45 24 L24 45 L3 24 Z',
    'M24 4 L30 18 L45 19 L33 29 L37 44 L24 36 L11 44 L15 29 L3 19 L18 18 Z',
    'M14 5 H34 L45 24 L34 43 H14 L3 24 Z',
    'M18 4 H30 V18 H44 V30 H30 V44 H18 V30 H4 V18 H18 Z',
    'M24 4 L44 19 L36 43 H12 L4 19 Z'
  ];
  var ARMCOL = ['var(--ft-input)', 'var(--ft-output)', 'var(--ft-noise)', 'var(--ft-dfa)'];
  FIG.play = function (root) {
    var TOTAL = 45, BLOCK = 15, kind = 'drift', cued = true, r = rng(7);
    var worth, trial, score, picks, hist, shapeSet;

    var arms = H('div', { style: 'display:flex;justify-content:center;gap:14px;flex-wrap:wrap;min-height:84px;align-items:center;' }, root);
    var status = H('p', { class: 'ft-readout', style: 'text-align:center;margin:10px 0 4px;font-family:"Libre Franklin",sans-serif;font-size:0.86rem;color:var(--muted);' }, root);
    var plot = H('div', { style: 'margin-top:8px;' }, root);

    var c = ctrls(root);
    var bDrift = btn(c, 'drift (4 arms)', function () { kind = 'drift'; press([bDrift, bProb], bDrift); start(); });
    var bProb = btn(c, 'probabilistic (2 arms)', function () { kind = 'prob'; press([bDrift, bProb], bProb); start(); });
    var bCue = btn(c, 'cued', function () { cued = true; press([bCue, bUn], bCue); start(); });
    var bUn = btn(c, 'uncued', function () { cued = false; press([bCue, bUn], bUn); start(); });
    btn(c, 'start again', start);
    press([bDrift, bProb], bDrift);
    press([bCue, bUn], bCue);

    function newWorld() {
      var n = kind === 'drift' ? 4 : 2, out = [], cur = [], i, t;
      if (kind === 'drift') for (i = 0; i < n; i++) cur.push(20 + r() * 60);
      else cur = r() < 0.5 ? [0.7, 0.3] : [0.3, 0.7];
      for (t = 0; t < TOTAL; t++) {
        if (t && t % BLOCK === 0) {
          if (kind === 'drift') cur = cur.map(function (v) { return v + (r() < 0.5 ? -24 : 24); });
          else cur = [cur[1], cur[0]];
        }
        if (kind === 'drift') cur = cur.map(function (v) {
          var x = v + 5.9 * gauss(r);
          x = x < 1 ? 2 - x : x;
          x = x > 100 ? 200 - x : x;
          return Math.max(1, Math.min(100, x));
        });
        out.push(cur.slice());
      }
      return out;
    }
    function drawArms() {
      arms.textContent = '';
      var blockN = Math.floor(trial / BLOCK), off = cued ? blockN * worth[0].length : 0;
      worth[0].forEach(function (_, a) {
        var b = H('button', {
          type: 'button',
          'aria-label': 'Choose arm ' + a,
          style: 'background:none;border:1px solid var(--ft-edge);border-radius:12px;padding:10px;cursor:pointer;width:76px;height:76px;'
        }, arms);
        var s = S('svg', { viewBox: '0 0 48 48', width: 52, height: 52 }, b);
        S('path', { d: SHAPES[(a + off) % SHAPES.length], style: 'fill:' + ARMCOL[a] }, s);
        b.addEventListener('click', function () { choose(a); });
      });
    }
    function choose(a) {
      if (trial >= TOTAL) return;
      var w = worth[trial][a];
      var pts = kind === 'drift' ? Math.round(w) : (r() < w ? 100 : 0);
      hist.push({ t: trial, a: a, pts: pts });
      score += pts;
      trial++;
      var note = 'Trial ' + trial + ' of ' + TOTAL + '. That arm paid ' + pts + ' points. Total: ' + score + '.';
      if (trial % BLOCK === 0 && trial < TOTAL) {
        note += cued ? ' The shapes changed, so a block just changed.' : '';
        drawArms();
      }
      status.textContent = trial >= TOTAL ? 'You finished with ' + score + ' points. Here is what you could not see while playing.' : note;
      if (trial >= TOTAL) drawPlot();
    }
    function drawPlot() {
      plot.textContent = '';
      var svg = svgRoot(plot, 860, 300, 'The hidden value of each arm over the game, with block changes and your choices marked.');
      var X0 = 70, X1 = 840, Y0 = 14, Y1 = 180, n = worth[0].length;
      var top = kind === 'drift' ? 100 : 1;
      function X(t) { return X0 + t / (TOTAL - 1) * (X1 - X0); }
      function Y(v) { return Y1 - v / top * (Y1 - Y0); }
      line(svg, X0, Y1, X1, Y1, 'stroke:var(--ft-grid)');
      line(svg, X0, Y0, X0, Y1, 'stroke:var(--ft-grid)');
      for (var b = BLOCK; b < TOTAL; b += BLOCK) line(svg, X(b), Y0, X(b), 280, 'stroke:var(--muted);stroke-opacity:.5;stroke-dasharray:2 4');
      T(svg, 60, Y0 + 10, kind === 'drift' ? '100' : '1.0', 'ft-tm', null, 'end');
      T(svg, 60, Y1, '0', 'ft-tm', null, 'end');
      for (var a = 0; a < n; a++) {
        var d = '';
        for (var t = 0; t < TOTAL; t++) d += (t ? 'L' : 'M') + X(t).toFixed(1) + ' ' + Y(worth[t][a]).toFixed(1);
        S('path', { d: d, style: 'fill:none;stroke-width:2;stroke:' + ARMCOL[a] }, svg);
        T(svg, 60, 205 + a * 20, 'arm ' + a, 'ft-tm', null, 'end');
      }
      hist.forEach(function (h) {
        S('circle', {
          cx: X(h.t), cy: 201 + h.a * 20, r: 4.5,
          style: (kind === 'prob' && h.pts === 0) ? 'fill:none;stroke-width:1.6;stroke:' + ARMCOL[h.a] : 'fill:' + ARMCOL[h.a]
        }, svg);
      });
    }
    function start() {
      worth = newWorld();
      trial = 0; score = 0; hist = [];
      plot.textContent = '';
      status.textContent = 'Pick a shape. You have ' + TOTAL + ' choices, and the block changes every ' + BLOCK + '.';
      drawArms();
    }
    start();
  };

  /* =====================================================================
     2. Learning rate: steady and slow, or fast and thrown by luck (schematic)
     ===================================================================== */
  FIG.rate = function (root) {
    var svg = svgRoot(root, 860, 330, 'A value estimate following random 100 and 0 outcomes. The chance of 100 points drops halfway through. A low learning rate gives a smooth, slow estimate. A high learning rate reacts fast and jumps after every outcome.');
    var X0 = 70, X1 = 840, Y0 = 18, Y1 = 262, N = 80, CH = 40;
    function X(t) { return X0 + t / (N - 1) * (X1 - X0); }
    function Y(v) { return Y1 - v / 100 * (Y1 - Y0); }
    var r = rng(21), outcomes = [], truth = [], i;
    for (i = 0; i < N; i++) {
      var p = i < CH ? 0.8 : 0.2;
      truth.push(p * 100);
      outcomes.push(r() < p ? 100 : 0);
    }
    [0, 50, 100].forEach(function (v) {
      line(svg, X0, Y(v), X1, Y(v), 'stroke:var(--ft-grid)');
      T(svg, 60, Y(v) + 4, String(v), 'ft-tm', null, 'end');
    });
    line(svg, X(CH), Y0, X(CH), Y1, 'stroke:var(--muted);stroke-opacity:.5;stroke-dasharray:2 4');
    T(svg, X(CH) + 8, Y0 + 10, 'the arm gets worse here', 'ft-tm');
    T(svg, (X0 + X1) / 2, 292, 'trial', 'ft-tm', null, 'middle');
    var yl = T(svg, 22, (Y0 + Y1) / 2, 'estimated value', 'ft-tm', null, 'middle');
    yl.setAttribute('transform', 'rotate(-90 22 ' + (Y0 + Y1) / 2 + ')');
    var dt = '';
    truth.forEach(function (v, t) { dt += (t ? 'L' : 'M') + X(t).toFixed(1) + ' ' + Y(v).toFixed(1); });
    S('path', { d: dt, style: 'fill:none;stroke:var(--ft-true);stroke-width:1.6;stroke-dasharray:6 5' }, svg);
    var dots = outcomes.map(function (o, t) {
      return S('circle', { cx: X(t), cy: Y(o), r: 3, style: 'fill:var(--ft-output)' }, svg);
    });
    var path = S('path', { style: 'fill:none;stroke:var(--ft-apical);stroke-width:2.8;stroke-linejoin:round' }, svg);
    T(svg, X0, 318, 'dots: points on each trial', 'ft-tm', 'fill:var(--ft-output)');
    T(svg, X0 + 210, 318, 'dashed: true average', 'ft-tm', 'fill:var(--ft-true)');
    T(svg, X0 + 390, 318, 'magenta: the learner\'s estimate', 'ft-tm', 'fill:var(--ft-apical)');

    var w = 0.15, shown = N, playing = !REDUCE;
    var c = ctrls(root);
    var pb = btn(c, playing ? 'pause' : 'replay', function () {
      playing = !playing;
      if (playing && shown >= N) shown = 0;
      pb.textContent = playing ? 'pause' : 'replay';
    });
    range(c, 'learning rate w', 0.02, 0.9, 0.01, w, function (v) { w = v; draw(); });
    var ro = out(c);
    function draw() {
      var est = [], v = 50, t, d = '';
      for (t = 0; t < N; t++) { v = (1 - w) * v + w * outcomes[t]; est.push(v); }
      var last = Math.max(1, Math.floor(shown));
      for (t = 0; t < last; t++) d += (t ? 'L' : 'M') + X(t).toFixed(1) + ' ' + Y(est[t]).toFixed(1);
      path.setAttribute('d', d);
      dots.forEach(function (e, k) { e.style.opacity = k < last ? 0.75 : 0.12; });
      var cross = -1;
      for (t = CH; t < N; t++) if (est[t] < 50) { cross = t - CH + 1; break; }
      var m = 0, s = 0;
      for (t = 15; t < CH; t++) m += est[t];
      m /= (CH - 15);
      for (t = 15; t < CH; t++) s += (est[t] - m) * (est[t] - m);
      s = Math.sqrt(s / (CH - 15));
      ro.innerHTML = 'w = <b>' + w.toFixed(2) + '</b>. Trials to notice the change: <b>' + (cross < 0 ? 'more than ' + (N - CH) : cross) + '</b>. Wobble while nothing changes: <b>' + s.toFixed(0) + ' points</b>.';
    }
    draw();
    register(svg, function (t, dt, still) {
      if (still) { shown = N; draw(); return; }
      if (!playing) return;
      shown += dt * 16;
      if (shown >= N) { shown = N; playing = false; pb.textContent = 'replay'; }
      draw();
    });
  };

  /* =====================================================================
     3. The disRNN and its bottleneck (penalties and values as measured)
     ===================================================================== */
  FIG.bottleneck = function (root) {
    var P = [0.001, 0.002, 0.003, 0.004, 0.005, 0.01, 0.05];
    var OPEN = [4.7, 3.7, 3.2, 2.9, 2.7, 2.0, 1.0];
    var LIK = [0.508, 0.492, 0.466, 0.458, 0.442, 0.406, 0.287];
    var svg = svgRoot(root, 860, 330, 'Inputs for the arm chosen, the points and the cue pass through five latents, which then produce the probability of each next choice. Raising the penalty closes latents.');
    var inY = [80, 165, 250], latY = [45, 105, 165, 225, 285], LX = 430, IX = 150, OX = 720;
    var names = ['arm chosen', 'points', 'cue'];
    var wires = [], lat = [];
    inY.forEach(function (y) {
      latY.forEach(function (ly, l) {
        wires.push({ l: l, a: { x: IX + 62, y: y }, b: { x: LX - 26, y: ly }, e: line(svg, IX + 62, y, LX - 26, ly, 'stroke:var(--ft-input);stroke-width:1.2') });
      });
    });
    latY.forEach(function (ly, l) {
      wires.push({ l: l, a: { x: LX + 26, y: ly }, b: { x: OX - 66, y: 165 }, e: line(svg, LX + 26, ly, OX - 66, 165, 'stroke:var(--ft-output);stroke-width:1.2') });
    });
    inY.forEach(function (y, i) {
      S('rect', { x: IX - 62, y: y - 19, width: 124, height: 38, rx: 10, style: 'fill:var(--ft-card);stroke:var(--ft-input);stroke-width:1.6' }, svg);
      T(svg, IX, y + 5, names[i], 'ft-t', null, 'middle');
    });
    latY.forEach(function (ly, l) {
      var g = S('g', null, svg);
      S('path', { d: 'M' + (LX - 12) + ' ' + (ly - 22) + ' C' + (LX - 34) + ' ' + (ly - 48) + ' ' + (LX + 34) + ' ' + (ly - 48) + ' ' + (LX + 12) + ' ' + (ly - 22), style: 'fill:none;stroke:var(--ft-apical);stroke-width:1.2;stroke-opacity:.6', 'stroke-dasharray': '3 3' }, g);
      S('circle', { cx: LX, cy: ly, r: 25, style: 'fill:var(--ft-apical)' }, g);
      lat.push(g);
    });
    S('rect', { x: OX - 66, y: 134, width: 150, height: 62, rx: 10, style: 'fill:var(--ft-card);stroke:var(--ft-output);stroke-width:1.6' }, svg);
    T(svg, OX + 9, 161, 'probability of', 'ft-t', null, 'middle');
    T(svg, OX + 9, 180, 'each next choice', 'ft-t', null, 'middle');
    var pulses = [];
    for (var k = 0; k < 14; k++) pulses.push({ e: S('circle', { r: 3, style: 'fill:var(--ink)' }, svg), w: wires[k * 3 % wires.length], s: k / 14 });

    var idx = 4, c = ctrls(root);
    var sl = range(c, 'bottleneck penalty', 0, 6, 1, idx, function (v) { idx = v; draw(); });
    sl.setAttribute('aria-label', 'Bottleneck penalty');
    var ro = out(c);
    function open(l) { return Math.max(0.1, Math.min(1, OPEN[idx] - l)); }
    function draw() {
      lat.forEach(function (g, l) { g.style.opacity = open(l); });
      wires.forEach(function (w) { w.e.style.opacity = 0.05 + 0.4 * (open(w.l) - 0.1); });
      ro.innerHTML = 'penalty <b>' + P[idx] + '</b>: <b>' + OPEN[idx].toFixed(1) + '</b> open latents on average, held-out likelihood <b>' + LIK[idx].toFixed(3) + '</b>' + (idx === 4 ? ' (the setting of the best fit)' : '');
    }
    draw();
    register(svg, function (t, dt, still) {
      pulses.forEach(function (p) {
        if (still) { p.e.style.opacity = 0; return; }
        p.s += dt * 0.45;
        if (p.s > 1) { p.s -= 1; p.w = wires[Math.floor(Math.random() * wires.length)]; }
        p.e.setAttribute('cx', p.w.a.x + (p.w.b.x - p.w.a.x) * p.s);
        p.e.setAttribute('cy', p.w.a.y + (p.w.b.y - p.w.a.y) * p.s);
        p.e.style.opacity = open(p.w.l) < 0.5 ? 0 : 0.7;
      });
    });
  };

  /* =====================================================================
     4. Drive latent 3 with the table measured on the best fit
     ===================================================================== */
  FIG.flip = function (root) {
    var N = null;
    var ON = [[N, N, N, N, N], [N, N, N, N, N], [2, 2, 2, 2, 2], [3, 2, 2, 2, 2]];
    var OFF = [[N, N, 24, 10, 8], [N, N, N, 4, 2], [N, N, N, N, N], [N, N, N, N, N]];
    var LEVELS = [0, 25, 50, 75, 100], DEMO = [[2, 2], [0, 4], [3, 0], [1, 4]];
    var state = 0, arm = 2, lev = 2, run = 0, auto = !REDUCE, clock = 0, demo = 0;
    var svg = svgRoot(root, 860, 190, 'A lamp shows whether latent 3 is on, next to a row of recent trials.');
    var lamp = S('circle', { cx: 92, cy: 92, r: 58, style: 'stroke:var(--ft-apical);stroke-width:3;transition:fill .2s' }, svg);
    var word = T(svg, 92, 100, 'off', 'ft-h', null, 'middle');
    T(svg, 92, 176, 'latent 3', 'ft-tm', null, 'middle');
    T(svg, 190, 100, 'recent trials, newest on the right (each number is the arm chosen)', 'ft-tm');
    var trail = [], tg = S('g', null, svg);

    var status = out(H('div', { class: 'ft-controls' }, root));
    var c = ctrls(root), armBtns = [], levBtns = [];
    [0, 1, 2, 3].forEach(function (a) {
      armBtns.push(btn(c, 'arm ' + a, function () { stop(); if (arm !== a) run = 0; arm = a; trial(); }));
    });
    var c2 = ctrls(root);
    H('span', null, c2, 'points');
    LEVELS.forEach(function (v, i) {
      levBtns.push(btn(c2, String(v), function () { stop(); if (lev !== i) run = 0; lev = i; render(); }));
    });
    var ab = btn(c2, auto ? 'stop demo' : 'run demo', function () {
      auto = !auto;
      ab.textContent = auto ? 'stop demo' : 'run demo';
    });
    function stop() { auto = false; ab.textContent = 'run demo'; }
    function need() { return (state ? OFF : ON)[arm][lev]; }
    function trial() {
      run++;
      trail.push({ a: arm, s: state });
      if (trail.length > 36) trail.shift();
      var n = need();
      if (n != null && run >= n) { state = 1 - state; run = 0; trail[trail.length - 1].s = state; }
      render();
    }
    function render() {
      press(armBtns, armBtns[arm]);
      press(levBtns, levBtns[lev]);
      lamp.style.fill = state ? 'var(--ft-apical)' : 'var(--ft-card)';
      word.textContent = state ? 'on' : 'off';
      word.style.fill = state ? 'var(--ft-card)' : 'var(--ink)';
      var n = need();
      status.innerHTML = '<b>Arm ' + arm + ' at ' + LEVELS[lev] + ' points.</b> ' + (n == null
        ? (state ? 'This choice never turns latent 3 off.' : 'This choice never turns latent 3 on.')
        : 'Turns latent 3 ' + (state ? 'off' : 'on') + ' after ' + n + ' trials in a row. So far: ' + run + '.');
      tg.textContent = '';
      trail.forEach(function (d, i) {
        var x = 196 + i * 17.5;
        S('rect', { x: x, y: 116, width: 14, height: 34, rx: 3, style: 'fill:' + (d.s ? 'var(--ft-apical)' : 'var(--ft-grid)') }, tg);
        T(tg, x + 7, 138, String(d.a), 'ft-tm', d.s ? 'fill:var(--ft-card)' : null, 'middle');
      });
    }
    render();
    register(svg, function (t, dt, still) {
      if (still || !auto) return;
      clock += dt;
      if (clock < 0.42) return;
      clock = 0;
      // Step through the demo, moving on once the lamp has flipped.
      var s0 = state;
      arm = DEMO[demo][0]; lev = DEMO[demo][1];
      trial();
      if (state !== s0) demo = (demo + 1) % DEMO.length;
    });
  };

  /* =====================================================================
     5. The two-rate test on each population (measured)
     ===================================================================== */
  FIG.tworate = function (root) {
    var DATA = {
      planted: { label: 'planted switch', a: 0.679, b: 0.239, p: 'p = 4.9 × 10⁻²¹', n: 130, say: 'The player has a real switch from 0.2 to 0.6, and the test finds it.' },
      plain: { label: 'no switch', a: 0.374, b: 0.357, p: 'p = 0.12', n: 116, say: 'The player has one fixed rate of 0.3, and the test stays quiet.' },
      people: { label: 'people', a: 0.80, b: 0.83, p: 'p = 0.86', n: 458, say: 'The same test finds no speed-up in people.' }
    };
    var svg = svgRoot(root, 860, 270, 'Bar chart of two fitted learning rates: one after recent arm 2 or 3 use, and one otherwise.');
    var X0 = 240, X1 = 800, ys = [54, 128];
    function W(v) { return v * (X1 - X0); }
    T(svg, X0 - 12, ys[0] + 26, 'after arm 2 or 3 use', 'ft-t', null, 'end');
    T(svg, X0 - 12, ys[1] + 26, 'otherwise', 'ft-t', null, 'end');
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
      line(svg, X0 + W(v), 34, X0 + W(v), 200, 'stroke:var(--ft-grid)');
      T(svg, X0 + W(v), 222, v.toFixed(2), 'ft-tm', null, 'middle');
    });
    T(svg, X0 + W(0.5), 252, 'fitted learning rate', 'ft-tm', null, 'middle');
    var A = S('rect', { x: X0, y: ys[0], height: 40, rx: 4, style: 'fill:var(--ft-apical)' }, svg);
    var B = S('rect', { x: X0, y: ys[1], height: 40, rx: 4, style: 'fill:var(--ft-input)' }, svg);
    var LA = T(svg, 0, ys[0] + 26, '', 'ft-t ft-b');
    var LB = T(svg, 0, ys[1] + 26, '', 'ft-t ft-b');
    var cur = { a: 0, b: 0 }, goal = DATA.planted;
    var c = ctrls(root), bs = [];
    Object.keys(DATA).forEach(function (k) {
      bs.push(btn(c, DATA[k].label, function () { goal = DATA[k]; press(bs, this); update(); }));
    });
    press(bs, bs[0]);
    var ro = out(c);
    function update() { ro.innerHTML = goal.p + ', n = ' + goal.n + '. <b>' + goal.say + '</b>'; }
    function draw() {
      A.setAttribute('width', W(cur.a)); B.setAttribute('width', W(cur.b));
      LA.setAttribute('x', X0 + W(cur.a) + 8); LA.textContent = cur.a.toFixed(2);
      LB.setAttribute('x', X0 + W(cur.b) + 8); LB.textContent = cur.b.toFixed(2);
    }
    update();
    register(svg, function (t, dt, still) {
      if (still) { cur.a = goal.a; cur.b = goal.b; draw(); return; }
      var k = Math.min(1, dt * 7);
      cur.a += (goal.a - cur.a) * k;
      cur.b += (goal.b - cur.b) * k;
      draw();
    });
  };

  /* ---------- hover definitions ---------- */
  function initDefs() {
    var defs = document.querySelectorAll('.ft-def');
    Array.prototype.forEach.call(defs, function (d) {
      var pop = d.querySelector('.ft-pop');
      if (!pop) return;
      function place() {
        d.style.setProperty('--ft-shift', '0px');
        d.classList.remove('ft-below');
        var rc = pop.getBoundingClientRect(), vw = document.documentElement.clientWidth, shift = 0;
        if (rc.left < 10) shift = 10 - rc.left; else if (rc.right > vw - 10) shift = vw - 10 - rc.right;
        d.style.setProperty('--ft-shift', shift + 'px');
        if (rc.top < 84) d.classList.add('ft-below');
      }
      d.addEventListener('mouseenter', place);
      d.addEventListener('focus', place);
      d.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = !d.classList.contains('is-open');
        Array.prototype.forEach.call(defs, function (o) { o.classList.remove('is-open'); });
        if (open) { place(); d.classList.add('is-open'); }
      });
    });
    document.addEventListener('click', function () {
      Array.prototype.forEach.call(defs, function (o) { o.classList.remove('is-open'); });
    });
  }

  function mountAll() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-ir]'), function (el) {
      var f = FIG[el.getAttribute('data-ir')];
      if (!f) return;
      try { f(el); } catch (err) { if (window.console) console.error('figure ' + el.getAttribute('data-ir') + ' failed', err); }
    });
    initDefs();
    if (!REDUCE) requestAnimationFrame(frame);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll); else mountAll();
})();
