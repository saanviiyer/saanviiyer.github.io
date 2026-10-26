/* Figures for "Our brains don't run on backprop, so why do our models?"
   Each figure mounts into an element with data-ft="name". Numbers drawn as
   measurements come from the post's own tables; anything schematic says so
   in its caption. Colours follow the post's key: input blue, noise green,
   output orange, backprop navy, weight perturbation red, Dust teal,
   Apical Dust magenta, bias pink. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var REDUCE = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var FIG = {};

  /* ---------- small helpers ---------- */
  function S(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
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
  function col(n) { return (n.indexOf('var(') === 0 || n.charAt(0) === '#') ? n : 'var(--ft-' + n + ')'; }
  // SVG text; parts may include {sub: '...'} for subscripts.
  function T(parent, x, y, parts, cls, style, anchor) {
    var t = S('text', { x: x, y: y, class: cls || 'ft-t', style: style || null, 'text-anchor': anchor || null }, parent);
    if (typeof parts === 'string') parts = [parts];
    var down = false;
    parts.forEach(function (p) {
      var s;
      if (typeof p === 'string') { s = S('tspan', down ? { dy: -4 } : null, t); s.textContent = p; down = false; }
      else { s = S('tspan', { dy: down ? 0 : 4, 'font-size': '72%' }, t); s.textContent = p.sub; down = true; }
    });
    return t;
  }
  function svgRoot(root, w, h, label) {
    return S('svg', { viewBox: '0 0 ' + w + ' ' + h, role: 'img', 'aria-label': label }, root);
  }
  function legend(root, items) {
    var l = H('div', { class: 'ft-legend' }, root);
    items.forEach(function (it) {
      var s = H('span', { class: 'ft-k' + (it[2] ? ' ft-k-dash' : '') }, l);
      var sw = H('i', null, s);
      if (it[2]) sw.style.borderTopColor = col(it[0]); else sw.style.background = col(it[0]);
      s.appendChild(document.createTextNode(it[1]));
    });
    return l;
  }
  function ctrls(root) { return H('div', { class: 'ft-controls' }, root); }
  function btn(c, label, fn) { var b = H('button', { type: 'button', class: 'ft-btn' }, c, label); b.addEventListener('click', fn); return b; }
  function range(c, label, min, max, step, val, fn) {
    var l = H('label', { class: 'ft-range' }, c);
    H('span', null, l, label);
    var i = H('input', { type: 'range', min: min, max: max, step: step, value: val, 'aria-label': label }, l);
    i.addEventListener('input', function () { fn(+i.value); });
    return i;
  }
  function out(c) { return H('span', { class: 'ft-readout' }, c); }
  function rng(seed) { var s = (seed >>> 0) || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function gauss(r) { var u = r() || 1e-9, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185307 * v); }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function ease(t) { t = clamp(t, 0, 1); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function line(p, x1, y1, x2, y2, style) { return S('line', { x1: x1, y1: y1, x2: x2, y2: y2, style: style }, p); }
  function arrow(parent, color, w) {
    var g = S('g', null, parent);
    var ln = S('line', { style: 'stroke:' + col(color) + ';stroke-width:' + (w || 2.5) + ';stroke-linecap:round' }, g);
    var hd = S('polygon', { style: 'fill:' + col(color) }, g);
    return {
      g: g,
      set: function (x1, y1, x2, y2, hs) {
        hs = hs || 9;
        var a = Math.atan2(y2 - y1, x2 - x1), bx = x2 - hs * Math.cos(a), by = y2 - hs * Math.sin(a);
        ln.setAttribute('x1', x1); ln.setAttribute('y1', y1); ln.setAttribute('x2', bx); ln.setAttribute('y2', by);
        var px = hs * 0.55 * Math.sin(a), py = hs * 0.55 * Math.cos(a);
        hd.setAttribute('points', x2 + ',' + y2 + ' ' + (bx + px) + ',' + (by - py) + ' ' + (bx - px) + ',' + (by + py));
      }
    };
  }
  function box(parent, x, y, w, h, lines, color, head) {
    var g = S('g', null, parent);
    var r = S('rect', { x: x, y: y, width: w, height: h, rx: 10, style: 'fill:var(--ft-card);stroke:' + col(color || 'var(--muted)') + ';stroke-width:1.6' }, g);
    var lh = 17, y0 = y + h / 2 - (lines.length - 1) * lh / 2 + 5;
    lines.forEach(function (ln, i) {
      var bold = i === 0 && head;
      T(g, x + w / 2, y0 + i * lh, ln, bold ? 'ft-t ft-b' : (i === 0 ? 'ft-t' : 'ft-tm'), bold ? 'fill:' + col(head) : null, 'middle');
    });
    var base = 'stroke:' + col(color || 'var(--muted)');
    return {
      g: g, rect: r,
      on: function (yes) {
        r.setAttribute('style', base + ';stroke-width:' + (yes ? 3 : 1.6) + ';fill:' + (yes ? 'color-mix(in srgb, ' + col(color || 'var(--muted)') + ' 13%, var(--ft-card))' : 'var(--ft-card)'));
      }
    };
  }
  function flowArrow(parent, x1, y1, x2, y2) {
    var a = arrow(parent, 'var(--muted)', 1.6); a.set(x1, y1, x2, y2, 8); a.g.setAttribute('opacity', '0.75'); return a;
  }

  /* ---------- shared animation loop, only runs figures that are on screen ---------- */
  var items = [];
  function register(root, tick) {
    var it = { tick: tick, on: false, t: 0 };
    items.push(it);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { it.on = e.isIntersecting; }); }, { rootMargin: '120px 0px' }).observe(root);
    } else it.on = true;
    tick(REDUCE ? 4 : 0, 0, REDUCE);
    return it;
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
     1. Pyramidal neuron: basal input, apical feedback, axon output
     ===================================================================== */
  FIG.neuron = function (root) {
    legend(root, [['input', 'bottom-up input (basal dendrites)'], ['apical', 'top-down feedback (apical tuft)'], ['output', 'output spikes (axon)']]);
    var svg = svgRoot(root, 860, 340, 'Animated pyramidal neuron. Blue pulses of bottom-up input travel along the basal dendrites to the cell body, magenta pulses of top-down feedback travel down the apical dendrite, and orange output spikes leave along the axon.');
    var dend = 'fill:none;stroke-linecap:round;stroke-width:';
    // apical (magenta)
    ['M430 196 L430 78', 'M430 78 Q395 62 360 40', 'M430 78 Q420 52 410 24', 'M430 78 Q446 50 455 22', 'M430 78 Q470 60 505 38', 'M430 150 Q405 136 375 128', 'M430 146 Q458 134 488 120']
      .forEach(function (d, i) { S('path', { d: d, style: dend + (i === 0 ? 5 : 3) + ';stroke:var(--ft-apical);opacity:.8' }, svg); });
    // basal (blue)
    ['M412 238 Q370 270 335 292', 'M422 242 Q405 285 392 318', 'M440 242 Q458 285 470 318', 'M450 238 Q492 268 528 290']
      .forEach(function (d) { S('path', { d: d, style: dend + '3;stroke:var(--ft-input);opacity:.8' }, svg); });
    // axon (orange)
    S('path', { d: 'M430 240 C430 282 520 300 640 300 L812 300', style: dend + '3;stroke:var(--ft-output);opacity:.8' }, svg);
    S('polygon', { points: '402,242 458,242 430,192', style: 'fill:var(--ink);opacity:.85' }, svg);

    T(svg, 474, 222, 'soma', 'ft-tm');
    T(svg, 548, 36, 'apical tuft (cortical layer 1)', 'ft-t ft-b', 'fill:var(--ft-apical)');
    T(svg, 548, 54, 'top-down feedback from higher areas', 'ft-tm');
    T(svg, 30, 272, 'basal dendrites', 'ft-t ft-b', 'fill:var(--ft-input)');
    T(svg, 30, 290, 'bottom-up input from lower areas', 'ft-tm');
    T(svg, 660, 288, 'axon: output spikes', 'ft-t ft-b', 'fill:var(--ft-output)');

    var routes = {
      apical: ['M360 40 Q395 62 430 78 L430 200', 'M410 24 Q420 52 430 78 L430 200', 'M455 22 Q446 50 430 78 L430 200', 'M505 38 Q470 60 430 78 L430 200'],
      basal: ['M335 292 Q370 270 412 238', 'M392 318 Q405 285 422 242', 'M470 318 Q458 285 440 242', 'M528 290 Q492 268 450 238'],
      axon: ['M430 240 C430 282 520 300 640 300 L812 300']
    };
    var paths = {};
    Object.keys(routes).forEach(function (k) {
      paths[k] = routes[k].map(function (d) { var p = S('path', { d: d, style: 'fill:none;stroke:none' }, svg); return { p: p, len: p.getTotalLength() }; });
    });
    var pool = [], live = [];
    for (var i = 0; i < 40; i++) pool.push(S('circle', { r: 5, style: 'opacity:0' }, svg));
    var r = rng(7), nextB = 0, nextA = 0.5, lastApical = -9, basalHits = 0, feedback = true;
    function spawn(kind, t, dur) {
      var c = pool.pop(); if (!c) return;
      var route = paths[kind][Math.floor(r() * paths[kind].length)];
      c.setAttribute('style', 'opacity:1;fill:' + col(kind === 'basal' ? 'input' : kind === 'apical' ? 'apical' : 'output'));
      live.push({ c: c, route: route, t0: t, dur: dur, kind: kind });
    }
    var c = ctrls(root);
    var fb = btn(c, 'top-down feedback: on', function () {
      feedback = !feedback;
      fb.textContent = 'top-down feedback: ' + (feedback ? 'on' : 'off');
      fb.setAttribute('aria-pressed', feedback ? 'true' : 'false');
      ro.innerHTML = feedback ? 'output: <b>bursts</b> when feedback coincides with input' : 'output: <b>single spikes</b> from bottom-up input alone';
    });
    fb.setAttribute('aria-pressed', 'true');
    var ro = out(c); ro.innerHTML = 'output: <b>bursts</b> when feedback coincides with input';

    register(svg, function (t, dt, still) {
      if (still) {
        [['basal', 0.5], ['apical', 0.6], ['axon', 0.4]].forEach(function (s) {
          var c2 = pool.pop(), route = paths[s[0]][0], pt = route.p.getPointAtLength(route.len * s[1]);
          c2.setAttribute('cx', pt.x); c2.setAttribute('cy', pt.y);
          c2.setAttribute('style', 'opacity:1;fill:' + col(s[0] === 'basal' ? 'input' : s[0] === 'apical' ? 'apical' : 'output'));
        });
        return;
      }
      if (t > nextB) { spawn('basal', t, 1.1); nextB = t + 0.35 + r() * 0.35; }
      if (feedback && t > nextA) { spawn('apical', t, 1.3); nextA = t + 1.0 + r() * 0.8; }
      for (var j = live.length - 1; j >= 0; j--) {
        var L = live[j], p = (t - L.t0) / L.dur;
        if (p >= 1) {
          L.c.setAttribute('style', 'opacity:0'); pool.push(L.c); live.splice(j, 1);
          if (L.kind === 'apical') lastApical = t;
          if (L.kind === 'basal') {
            basalHits++;
            if (feedback && t - lastApical < 0.9) { spawn('axon', t, 1.1); spawn('axon', t + 0.12, 1.1); spawn('axon', t + 0.24, 1.1); lastApical = -9; }
            else if (basalHits % 2 === 0) spawn('axon', t, 1.1);
          }
          continue;
        }
        if (p < 0) continue;
        var pt = L.route.p.getPointAtLength(L.route.len * p);
        L.c.setAttribute('cx', pt.x); L.c.setAttribute('cy', pt.y);
      }
    });
  };

  /* =====================================================================
     2. The confound: a rule that learns less also forgets less (schematic)
     ===================================================================== */
  FIG.confound = function (root) {
    legend(root, [['true', 'backprop trade-off curve'], ['pc', 'local rule (predictive coding)'], ['replay', 'backprop + replay']]);
    var svg = svgRoot(root, 860, 360, 'Schematic plot of backward transfer against learning accuracy. Comparing a local rule to backprop trained to a higher accuracy makes the rule look like it forgets less; at matched accuracy the gap nearly disappears, while replay sits far above the curve.');
    var X0 = 90, X1 = 820, Y0 = 26, Y1 = 300, A0 = 0.35, A1 = 0.90, B0 = -16, B1 = 13;
    function X(a) { return X0 + (a - A0) / (A1 - A0) * (X1 - X0); }
    function Y(b) { return Y1 - (b - B0) / (B1 - B0) * (Y1 - Y0); }
    function bwt(a) { return 2 - 16 * (a - A0) / (A1 - A0); }
    var RA = 0.5, EDGE = 0.21, REP = 10.6;
    [-10, 0, 10].forEach(function (b) { line(svg, X0, Y(b), X1, Y(b), b === 0 ? 'stroke:var(--muted);stroke-opacity:.45' : 'stroke:var(--ft-grid)'); });
    line(svg, X0, Y0, X0, Y1, 'stroke:var(--muted);stroke-opacity:.45');
    T(svg, X0 + (X1 - X0) / 2, 344, 'accuracy on the new task (schematic axis)', 'ft-tm', null, 'middle');
    var yl = T(svg, 24, (Y0 + Y1) / 2, 'backward transfer, higher = less forgetting', 'ft-tm', null, 'middle');
    yl.setAttribute('transform', 'rotate(-90 24 ' + (Y0 + Y1) / 2 + ')');
    var d = '';
    for (var a = A0; a <= A1 + 1e-9; a += 0.01) d += (d ? 'L' : 'M') + X(a).toFixed(1) + ' ' + Y(bwt(a)).toFixed(1);
    S('path', { d: d, style: 'fill:none;stroke:var(--ft-true);stroke-width:2.5' }, svg);
    T(svg, X(0.89), Y(bwt(0.89)) - 16, 'backprop: learn more, forget more', 'ft-tm', 'fill:var(--ft-true)', 'end');

    var guide = line(svg, 0, Y0, 0, Y1, 'stroke:var(--ft-true);stroke-opacity:.25;stroke-dasharray:4 4');
    var level = line(svg, X(RA), Y(bwt(RA) + EDGE), 0, Y(bwt(RA) + EDGE), 'stroke:var(--ft-pc);stroke-opacity:.5;stroke-dasharray:2 4');
    var bracket = line(svg, 0, 0, 0, 0, 'stroke:var(--ft-pc);stroke-width:3;stroke-linecap:round');
    var bp = S('circle', { r: 6.5, style: 'fill:var(--ft-true)' }, svg);
    S('circle', { cx: X(RA), cy: Y(bwt(RA) + EDGE), r: 7.5, style: 'fill:var(--ft-pc)' }, svg);
    T(svg, X(RA), Y(bwt(RA) + EDGE) - 15, 'local rule', 'ft-t ft-b', 'fill:var(--ft-pc)', 'middle');
    S('circle', { cx: X(RA), cy: Y(bwt(RA) + REP), r: 7.5, style: 'fill:var(--ft-replay)' }, svg);
    T(svg, X(RA) + 13, Y(bwt(RA) + REP) + 5, 'backprop + replay: +10.6 pts at matched learning (measured)', 'ft-t ft-b', 'fill:var(--ft-replay)');
    var tag = T(svg, 0, 0, 'backprop compared here', 'ft-tm', 'fill:var(--ft-true)');

    var cmp = 0.9, playing = !REDUCE, dir = -1;
    var c = ctrls(root);
    var pb = btn(c, playing ? 'pause' : 'play', function () { playing = !playing; pb.textContent = playing ? 'pause' : 'play'; });
    var sl = range(c, 'compare backprop at', 50, 90, 1, 90, function (v) { playing = false; pb.textContent = 'play'; cmp = v / 100; draw(); });
    var ro = out(c);
    function draw() {
      var x = X(cmp), yb = Y(bwt(cmp)), yr = Y(bwt(RA) + EDGE);
      guide.setAttribute('x1', x); guide.setAttribute('x2', x);
      level.setAttribute('x2', x);
      bracket.setAttribute('x1', x); bracket.setAttribute('x2', x); bracket.setAttribute('y1', yr); bracket.setAttribute('y2', yb);
      bp.setAttribute('cx', x); bp.setAttribute('cy', yb);
      tag.setAttribute('text-anchor', x > 700 ? 'end' : 'middle');
      tag.setAttribute('x', x > 700 ? x + 8 : x); tag.setAttribute('y', yb + 24);
      var e = (bwt(RA) + EDGE) - bwt(cmp);
      ro.innerHTML = 'apparent advantage of the local rule: <b>+' + e.toFixed(1) + ' pts</b>' + (cmp <= 0.505 ? ' (the measured edge at matched learning, the largest of any local rule)' : '');
      if (document.activeElement !== sl) sl.value = Math.round(cmp * 100);
    }
    draw();
    register(svg, function (t, dt, still) {
      if (still) { cmp = 0.5; draw(); return; }
      if (!playing) return;
      cmp += 0.09 * dt * dir;
      if (cmp <= 0.5) { cmp = 0.5; dir = 1; }
      if (cmp >= 0.9) { cmp = 0.9; dir = -1; }
      draw();
    });
  };

  /* =====================================================================
     3. Experiment 1 results: backward transfer per rule (measured)
     ===================================================================== */
  FIG.bwt = function (root) {
    // Retention vs backprop at matched learning accuracy, gap-corrected,
    // 16 seeds, Split-CIFAR-10 (locality study, matched-learning table).
    var rows = [
      ['Feedback alignment', 'fa', 'learned to 83.1%', -0.08, -0.21, 0.05],
      ['Direct feedback alignment', 'dfa', 'learned to 81.7%', -0.11, -0.28, 0.06],
      ['Predictive coding', 'pc', 'learned to 85.0%', 0.21, 0.11, 0.31],
      ['Backprop + replay', 'replay', 'learned to 83.0%', 10.6, 10.0, 11.1],
      ['FA + replay', 'replay', 'learned to 81.2%', 10.7, 10.2, 11.2],
      ['DFA + replay', 'replay', 'learned to 80.3%', 12.3, 11.8, 12.7],
      ['PC + replay', 'replay', 'learned to 84.1%', 9.9, 9.6, 10.2]
    ];
    var svg = svgRoot(root, 860, 420, 'Bar chart of how much less each rule forgets than backprop at matched learning accuracy. Feedback alignment -0.08, direct feedback alignment -0.11, predictive coding +0.21, all within a third of a point of zero. With replay: backprop +10.6, feedback alignment +10.7, direct feedback alignment +12.3, predictive coding +9.9.');
    var Z = 330, R = 820;
    function X(v) { return Z + v / 13 * (R - Z); }
    [-1, 0, 2, 4, 6, 8, 10, 12].forEach(function (v) {
      line(svg, X(v), 30, X(v), 390, v === 0 ? 'stroke:var(--muted);stroke-opacity:.6;stroke-width:1.4' : 'stroke:var(--ft-grid)');
      T(svg, X(v), 410, (v > 0 ? '+' : '') + v, 'ft-tm', null, 'middle');
    });
    T(svg, X(0) + 6, 20, 'no difference from backprop', 'ft-tm');
    var bars = rows.map(function (rw, i) {
      var y = 34 + i * 50, rep = i >= 3, g = S('g', rep ? { style: 'opacity:0;transition:opacity .5s' } : null, svg);
      T(g, 16, y + 16, rw[0], 'ft-t ft-b', 'fill:' + col(rw[1]));
      T(g, 16, y + 33, rw[2], 'ft-tm');
      var rect = S('rect', { x: X(0), y: y + 9, width: 0, height: 22, rx: 4, style: 'fill:' + col(rw[1]) + ';opacity:.85' }, g);
      var ci = line(g, X(rw[4]), y + 20, X(rw[5]), y + 20, 'stroke:var(--ink);stroke-width:2;opacity:0');
      S('title', null, rect).textContent = rw[0] + ': ' + (rw[3] > 0 ? '+' : '') + rw[3] + ' points [' + rw[4] + ', ' + rw[5] + ']';
      var fmt = function (n) { return (n > 0 ? '+' : '') + n.toFixed(Math.abs(n) < 1 ? 2 : 1); };
      var big = rw[3] > 5;
      var val = T(g, 0, y + 25, fmt(rw[3]) + ' [' + fmt(rw[4]) + ', ' + fmt(rw[5]) + ']', 'ft-t ft-b', 'fill:' + (big ? 'var(--ft-card)' : col(rw[1])));
      return { g: g, rect: rect, ci: ci, val: val, v: rw[3], hi: rw[5], big: big, shown: !rep, p: 0 };
    });
    var c = ctrls(root), showRep = false;
    var rb = btn(c, 'add a replay buffer', function () {
      showRep = !showRep;
      bars.slice(3).forEach(function (b) { b.shown = showRep; b.g.style.opacity = showRep ? 1 : 0; if (!showRep) b.p = 0; });
      rb.setAttribute('aria-pressed', showRep ? 'true' : 'false');
      rb.textContent = showRep ? 'remove the replay buffer' : 'add a replay buffer';
    });
    out(c).innerHTML = 'points of backward transfer, at matched learning accuracy, 95% intervals';
    register(svg, function (t, dt, still) {
      bars.forEach(function (b) {
        var target = b.shown ? 1 : 0;
        b.p = still ? target : b.p + (target - b.p) * Math.min(1, dt * 4);
        var e = ease(b.p), xe = X(b.v * e);
        b.rect.setAttribute('x', Math.min(X(0), xe)); b.rect.setAttribute('width', Math.max(Math.abs(xe - X(0)), b.p > 0.02 ? 2 : 0));
        b.ci.style.opacity = e;
        b.val.setAttribute('x', b.big ? X(0) + 12 : Math.max(X(b.hi), X(0)) + 10);
        b.val.style.opacity = e;
      });
    });
  };

  /* =====================================================================
     4. Weight perturbation vs node perturbation (flips to sketch 1)
     ===================================================================== */
  FIG.perturbation = function (root) {
    legend(root, [['input', 'input x'], ['noise', 'noise'], ['output', 'output y'], ['weight', 'weight perturbation'], ['dust', 'node perturbation (Dust)']]);
    var svg = svgRoot(root, 860, 370, 'Left: weight perturbation adds noise to every weight, so its noise has as many dimensions as the model has parameters. Right: node perturbation, used by Dust, adds noise to each layer output at every token, so one sequence pass tests many perturbations and the noise only scales with the activation width.');
    line(svg, 430, 20, 430, 350, 'stroke:var(--ft-grid);stroke-width:1.5');
    // left panel
    T(svg, 30, 32, 'Weight perturbation', 'ft-h', 'fill:var(--ft-weight)');
    T(svg, 212, 32, '(for example EGGROLL)', 'ft-tm');
    var ins = [100, 160, 220], outs = [100, 160, 220], edges = [];
    ins.forEach(function (yi) { outs.forEach(function (yo) { edges.push(line(svg, 80, yi, 330, yo, 'stroke:var(--ft-noise);stroke-width:2')); }); });
    ins.forEach(function (y) { S('circle', { cx: 80, cy: y, r: 10, style: 'fill:var(--ft-input)' }, svg); });
    outs.forEach(function (y) { S('circle', { cx: 330, cy: y, r: 10, style: 'fill:var(--ft-output)' }, svg); });
    T(svg, 80, 254, 'input x', 'ft-tm', 'fill:var(--ft-input)', 'middle');
    T(svg, 330, 254, 'output y', 'ft-tm', 'fill:var(--ft-output)', 'middle');
    T(svg, 205, 78, ['W + noise on every weight'], 'ft-t', 'fill:var(--ft-noise)', 'middle');
    T(svg, 30, 292, 'a noisy copy of every weight, one copy per pass', 'ft-tm');
    T(svg, 30, 318, 'noise dimension: P, the 10⁶ to 10⁹ parameters', 'ft-t');
    T(svg, 30, 342, 'variance grows with P', 'ft-t ft-b', 'fill:var(--ft-weight)');
    // right panel
    T(svg, 460, 32, 'Node perturbation', 'ft-h', 'fill:var(--ft-dust)');
    T(svg, 625, 32, '(Dust)', 'ft-tm');
    var ins2 = [80, 130, 180], outs2 = [80, 130, 180];
    ins2.forEach(function (yi) { outs2.forEach(function (yo) { line(svg, 490, yi, 650, yo, 'stroke:var(--muted);stroke-opacity:.35;stroke-width:1.5'); }); });
    ins2.forEach(function (y) { S('circle', { cx: 490, cy: y, r: 9, style: 'fill:var(--ft-input)' }, svg); });
    var halos = outs2.map(function (y) { return S('circle', { cx: 650, cy: y, r: 14, style: 'fill:none;stroke:var(--ft-noise);stroke-width:3' }, svg); });
    outs2.forEach(function (y) { S('circle', { cx: 650, cy: y, r: 9, style: 'fill:var(--ft-output)' }, svg); });
    T(svg, 570, 64, 'W stays clean', 'ft-tm', null, 'middle');
    T(svg, 680, 134, ['y + noise'], 'ft-t', 'fill:var(--ft-noise)');
    // token strip
    var toks = [];
    for (var k = 0; k < 6; k++) {
      var x = 470 + k * 60;
      S('rect', { x: x, y: 214, width: 50, height: 52, rx: 7, style: 'fill:var(--ft-card);stroke:var(--ft-output);stroke-width:1.4' }, svg);
      T(svg, x + 25, 230, k < 5 ? 'token ' + (k + 1) : 'token T', 'ft-tm', null, 'middle');
      var bs = [];
      for (var j = 0; j < 4; j++) bs.push(S('rect', { x: x + 9 + j * 9, y: 248, width: 6, height: 4, style: 'fill:var(--ft-noise)' }, svg));
      toks.push(bs);
    }
    T(svg, 460, 292, 'independent noise at every token: many perturbations in one pass', 'ft-tm');
    T(svg, 460, 318, 'noise dimension: d, the activation width', 'ft-t');
    T(svg, 460, 342, 'variance grows with d / K, for population size K', 'ft-t ft-b', 'fill:var(--ft-dust)');

    var r = rng(11), acc = 0;
    function jitter() {
      edges.forEach(function (e, i) {
        var n = gauss(r);
        e.setAttribute('style', 'stroke:var(--ft-noise);stroke-width:' + (1.2 + Math.abs(n) * 2.2).toFixed(2) + ';opacity:' + (0.35 + 0.6 * Math.min(1, Math.abs(gauss(r)) / 2)).toFixed(2));
        e.setAttribute('y1', ins[Math.floor(i / 3)] + gauss(r) * 2.5);
        e.setAttribute('y2', outs[i % 3] + gauss(r) * 2.5);
      });
      halos.forEach(function (h) { h.setAttribute('r', (13 + Math.abs(gauss(r)) * 5).toFixed(1)); });
      toks.forEach(function (bs) { bs.forEach(function (b) { var h = 3 + Math.abs(gauss(r)) * 9; b.setAttribute('y', 262 - h); b.setAttribute('height', h); }); });
    }
    jitter();
    register(svg, function (t, dt, still) { if (still) return; acc += dt; if (acc > 0.12) { acc = 0; jitter(); } });
  };

  /* =====================================================================
     5. Dust's forward architecture and caching (flips to sketch 2)
     ===================================================================== */
  FIG.credit = function (root) {
    legend(root, [['input', 'cached clean input'], ['noise', 'perturbation'], ['output', 'logits and losses'], ['dust', 'module being trained']]);
    var svg = svgRoot(root, 860, 330, 'Dust forward architecture. Phase one: a clean forward pass caches the inputs to the target block. Phase two: an isolated pass reuses the cache, perturbs the target block, and reruns only the blocks downstream of it to get per-token losses.');
    var phase = T(svg, 430, 24, '', 'ft-t ft-b', null, 'middle');
    var B = {};
    B.tok = box(svg, 14, 70, 60, 150, ['token', 'IDs'], 'var(--muted)');
    B.emb = box(svg, 92, 70, 70, 150, ['token +', 'position', 'embed.'], 'var(--muted)');
    B.pre = box(svg, 180, 70, 76, 150, ['blocks', '1 … m−1'], 'var(--muted)');
    var tg = S('g', null, svg);
    var tr = S('rect', { x: 274, y: 56, width: 200, height: 178, rx: 12, style: 'fill:var(--ft-card);stroke:var(--ft-dust);stroke-width:2.2' }, tg);
    T(tg, 374, 78, 'target block m', 'ft-t ft-b', 'fill:var(--ft-dust)', 'middle');
    var rowsY = [104, 136, 168, 202];
    ['layer norm', 'multi-head attention', 'layer norm', 'MLP (forward weights)'].forEach(function (s, i) {
      S('rect', { x: 290, y: rowsY[i] - 14, width: 168, height: 24, rx: 6, style: 'fill:none;stroke:var(--ft-grid)' }, tg);
      T(tg, 374, rowsY[i] + 3, s, i === 3 ? 'ft-t' : 'ft-tm', null, 'middle');
    });
    var mlpGlow = S('rect', { x: 290, y: 188, width: 168, height: 24, rx: 6, style: 'fill:var(--ft-noise);opacity:0' }, tg);
    B.post = box(svg, 492, 70, 76, 150, ['blocks', 'm+1 … L'], 'var(--muted)');
    B.head = box(svg, 586, 70, 64, 150, ['LM', 'head'], 'var(--muted)');
    B.log = box(svg, 668, 70, 76, 150, ['logits', ['z', { sub: '1' }, ' … z', { sub: 'T' }]], 'output');
    B.loss = box(svg, 762, 70, 84, 150, ['token', 'losses', ['L', { sub: '1' }, ' … L', { sub: 'T' }]], 'output');
    [[74, 92], [162, 180], [256, 274], [474, 492], [568, 586], [650, 668], [744, 762]].forEach(function (p) { flowArrow(svg, p[0] + 2, 145, p[1] - 2, 145); });
    var cache = S('rect', { x: 274, y: 262, width: 200, height: 46, rx: 10, style: 'fill:var(--ft-card);stroke:var(--ft-input);stroke-width:2' }, svg);
    var cacheFill = S('rect', { x: 276, y: 264, width: 0, height: 42, rx: 9, style: 'fill:var(--ft-input);opacity:.18' }, svg);
    T(svg, 374, 290, ['cached clean input x', { sub: '1:T' }], 'ft-t ft-b', 'fill:var(--ft-input)', 'middle');
    var dropLine = line(svg, 300, 234, 300, 262, 'stroke:var(--ft-input);stroke-width:2;stroke-dasharray:3 3;opacity:0');
    var dot = S('circle', { r: 7, style: 'fill:var(--ink)' }, svg);
    var drop = S('circle', { r: 5, style: 'fill:var(--ft-input);opacity:0' }, svg);
    var sparks = [];
    for (var i = 0; i < 8; i++) sparks.push(S('circle', { r: 2.6, style: 'fill:var(--ft-noise);opacity:0' }, svg));
    var early = [B.tok, B.emb, B.pre];
    var r = rng(5);
    register(svg, function (t, dt, still) {
      var cyc = 6.4, u = still ? 4.3 : t % cyc;
      if (u < 2.8) {
        phase.textContent = '1. Clean forward pass: inputs to block m are cached';
        phase.setAttribute('style', 'fill:var(--ink)');
        early.forEach(function (b) { b.g.setAttribute('opacity', 1); });
        var x = 44 + (u / 2.6) * (804 - 44);
        dot.setAttribute('cx', Math.min(x, 804)); dot.setAttribute('cy', 145); dot.setAttribute('style', 'fill:var(--ink)');
        var f = clamp((x - 274) / 200, 0, 1);
        cacheFill.setAttribute('width', 196 * f);
        dropLine.style.opacity = f > 0 && f < 1 ? 1 : 0;
        drop.style.opacity = f > 0 && f < 1 ? 1 : 0;
        drop.setAttribute('cx', 300); drop.setAttribute('cy', 234 + ((u * 3) % 1) * 28);
        sparks.forEach(function (s) { s.style.opacity = 0; });
        mlpGlow.style.opacity = 0;
        B.loss.on(false); B.log.on(false);
      } else {
        var v = (u - 2.8) / 3.0;
        phase.textContent = '2. Isolated pass: reuse the cache, perturb block m, rerun only what is downstream';
        phase.setAttribute('style', 'fill:var(--ft-noise)');
        early.forEach(function (b) { b.g.setAttribute('opacity', 0.28); });
        cacheFill.setAttribute('width', 196);
        dropLine.style.opacity = 0; drop.style.opacity = 0;
        var px, py;
        if (v < 0.22) { px = 374; py = 285 - (v / 0.22) * 85; }
        else { px = 374 + ((v - 0.22) / 0.7) * (804 - 374); py = 145 + Math.max(0, 55 - ((v - 0.22) / 0.12) * 55); }
        dot.setAttribute('cx', Math.min(px, 804)); dot.setAttribute('cy', py); dot.setAttribute('style', 'fill:var(--ft-noise)');
        mlpGlow.style.opacity = (v > 0.12 && v < 0.45) ? 0.22 : 0.08;
        sparks.forEach(function (s) {
          s.setAttribute('cx', 296 + r() * 156); s.setAttribute('cy', 192 + r() * 18);
          s.style.opacity = (v > 0.12 && v < 0.45) ? 0.9 : 0;
        });
        B.log.on(v > 0.75); B.loss.on(v > 0.85);
      }
    });
  };

  /* =====================================================================
     6. The isolated pass, step by step, plus a live Dust estimate
        (flips to sketch 3). The estimator panel is real arithmetic:
        d = 128, K draws, centred-loss rewards, e_hat = -1/(K sigma) sum r a.
     ===================================================================== */
  FIG.isolated = function (root) {
    legend(root, [['input', 'cached input'], ['noise', 'noise a'], ['output', 'logits and losses'], ['true', 'true error e'], ['dust', 'Dust estimate ê']]);
    var svg = svgRoot(root, 860, 480, 'The Dust isolated pass as a flow of steps, with a live estimate below. The estimate of the output error from K random draws points closer to the true error as K grows.');
    var steps = [
      box(svg, 8, 34, 148, 76, ['cached input', ['x', { sub: '1:T' }]], 'input', 'input'),
      box(svg, 180, 34, 160, 76, ['selected MLP', ['y', { sub: 't' }, ' += σ a', { sub: 't' }]], 'noise', 'noise'),
      box(svg, 364, 34, 168, 76, ['downstream blocks', '+ residual stream'], 'var(--muted)'),
      box(svg, 556, 34, 120, 76, ['LM head', 'and logits'], 'output', 'output'),
      box(svg, 700, 34, 152, 76, ['per-token losses', ['L', { sub: 's' }]], 'output', 'output'),
      box(svg, 552, 140, 300, 84, ['centred loss reduction', ['c', { sub: 's' }, ' = L̄', { sub: 's' }, ' − L', { sub: 's' }], ['r', { sub: 't' }, ' = Σ', { sub: 's ≥ t' }, ' γˢ⁻ᵗ c', { sub: 's' }]], 'dust', 'dust'),
      box(svg, 250, 140, 278, 84, ['output error estimate', ['ê', { sub: 't' }, ' = −(1 / Kσ) Σ', { sub: 'i' }, ' r', { sub: 't' }, ' a', { sub: 't' }], 'variance grows with d / K'], 'dust', 'dust'),
      box(svg, 8, 140, 218, 84, ['local weight update', ['ΔW', { sub: 'm' }, ' = Σ', { sub: 't' }, ' ê', { sub: 't' }, ' x', { sub: 't' }, 'ᵀ'], 'same form as backprop'], 'dust', 'dust')
    ];
    flowArrow(svg, 158, 72, 178, 72); flowArrow(svg, 342, 72, 362, 72); flowArrow(svg, 534, 72, 554, 72); flowArrow(svg, 678, 72, 698, 72);
    flowArrow(svg, 776, 112, 776, 138); flowArrow(svg, 550, 182, 530, 182); flowArrow(svg, 248, 182, 228, 182);
    line(svg, 8, 246, 852, 246, 'stroke:var(--ft-grid)');
    T(svg, 8, 272, 'Live: estimating the output error from K random draws (d = 128)', 'ft-t ft-b');
    var cx = 120, cy = 380, R = 80;
    S('circle', { cx: cx, cy: cy, r: R, style: 'fill:none;stroke:var(--ft-grid);stroke-width:1.5' }, svg);
    line(svg, cx - R, cy, cx + R, cy, 'stroke:var(--ft-grid)');
    var eA = arrow(svg, 'true', 3.5); eA.set(cx, cy, cx + R, cy, 11);
    T(svg, cx + R + 6, cy + 5, 'e', 'ft-t ft-b', 'fill:var(--ft-true)');
    var hA = arrow(svg, 'dust', 3.5);
    var hLab = T(svg, 0, 0, 'ê', 'ft-t ft-b', 'fill:var(--ft-dust)');
    var arc = S('path', { style: 'fill:none;stroke:var(--ft-dust);stroke-width:1.5;opacity:.6' }, svg);
    var ro1 = T(svg, 240, 330, '', 'ft-t');
    var ro2 = T(svg, 240, 354, '', 'ft-t ft-b', 'fill:var(--ft-dust)');
    T(svg, 240, 378, 'unbiased: more draws keep pulling ê toward e', 'ft-tm');
    // cos vs n mini plot
    var PX0 = 520, PX1 = 846, PY0 = 290, PY1 = 460;
    line(svg, PX0, PY1, PX1, PY1, 'stroke:var(--ft-grid)'); line(svg, PX0, PY0, PX0, PY1, 'stroke:var(--ft-grid)');
    line(svg, PX0, PY0, PX1, PY0, 'stroke:var(--ft-true);stroke-dasharray:3 4;opacity:.5');
    T(svg, PX1, PY0 - 6, 'cosine 1', 'ft-tm', null, 'end');
    T(svg, PX0, PY1 + 16, 'draws so far →', 'ft-tm');
    var curve = S('path', { style: 'fill:none;stroke:var(--ft-dust);stroke-width:2.5' }, svg);

    var D = 128, SIG = 0.05, K = 16, draws = null, sum = null, n = 0, tRun = 0, seed = 1, cosHist = [];
    function newRun() {
      var r = rng(seed++);
      draws = [];
      for (var i = 0; i < K; i++) {
        var a = new Float64Array(D), dot = 0;
        for (var j = 0; j < D; j++) { a[j] = gauss(r); }
        dot = a[0]; // true error e = unit vector along dimension 0
        var reward = -(SIG * dot + 0.5 * SIG * gauss(r)); // loss reduction with evaluation noise
        draws.push({ a: a, r: reward });
      }
      sum = new Float64Array(D); n = 0; tRun = 0; cosHist = [];
    }
    function addDraw() {
      var dr = draws[n];
      for (var j = 0; j < D; j++) sum[j] += -dr.r * dr.a[j] / SIG;
      n++;
      var norm = 0; for (var j2 = 0; j2 < D; j2++) norm += sum[j2] * sum[j2];
      var cs = norm > 0 ? sum[0] / Math.sqrt(norm) : 0;
      cosHist.push(cs);
      return cs;
    }
    function render(cs) {
      var ang = Math.acos(clamp(cs, -1, 1));
      var ex = cx + R * Math.cos(ang), ey = cy - R * Math.sin(ang);
      hA.set(cx, cy, ex, ey, 11);
      hLab.setAttribute('x', ex + 6); hLab.setAttribute('y', ey - 4);
      var ar = 34;
      arc.setAttribute('d', 'M' + (cx + ar) + ' ' + cy + ' A' + ar + ' ' + ar + ' 0 0 0 ' + (cx + ar * Math.cos(ang)) + ' ' + (cy - ar * Math.sin(ang)));
      ro1.textContent = 'draws so far: ' + n + ' of K = ' + K;
      ro2.textContent = 'cos(ê, e) = ' + cs.toFixed(2);
      var d = '';
      cosHist.forEach(function (v, i) {
        var x = PX0 + (cosHist.length > 1 ? i / (K - 1) : 0) * (PX1 - PX0), y = PY1 - clamp(v, 0, 1) * (PY1 - PY0);
        d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      });
      curve.setAttribute('d', d);
    }
    var c = ctrls(root);
    var Ks = [4, 8, 16, 32, 64, 128, 256];
    var kOut;
    range(c, 'population K', 0, 6, 1, 2, function (v) { K = Ks[v]; kOut.innerHTML = 'K = <b>' + K + '</b>'; newRun(); });
    kOut = out(c); kOut.innerHTML = 'K = <b>16</b>';
    newRun();
    var hi = 0, hiT = 0;
    register(svg, function (t, dt, still) {
      if (still) { while (n < K) addDraw(); render(cosHist[cosHist.length - 1]); steps.forEach(function (s, i) { s.on(i === 6); }); return; }
      hiT += dt; if (hiT > 0.9) { hiT = 0; hi = (hi + 1) % steps.length; }
      steps.forEach(function (s, i) { s.on(i === hi); });
      tRun += dt;
      var target = Math.min(K, Math.ceil((tRun / 1.8) * K));
      var cs = cosHist.length ? cosHist[cosHist.length - 1] : 0;
      while (n < target) cs = addDraw();
      if (n > 0) render(cs);
      if (tRun > 3.2) newRun();
    });
  };

  /* =====================================================================
     7. Standard Dust vs Apical Dust (flips to sketch 4)
     ===================================================================== */
  // Per-step cosine calibrated to the measured Dust MLP value (0.26 at K = 16);
  // Apical's variance is 0.48x Dust's, from "Apical at K = 16 ~ Dust at K = 33".
  function cosFor(kind, K) {
    var c = kind === 'dust' ? 220.8 : kind === 'apical' ? 0.48 * 220.8 : 2.2e6;
    return 1 / Math.sqrt(1 + c / K);
  }
  // 2-D spread whose expected cosine to a gradient of length Lg is cs.
  function sdFor(cs, Lg) { return Lg * Math.sqrt(Math.max(0, (1 / (cs * cs) - 1) / 2)); }
  var clipN = 0;
  // A clipped board: the true gradient (navy) ends at the centre, recent
  // estimates scatter around its tip, and a dashed ring marks one standard deviation.
  function scatterBoard(svg, cx, cy, R, color, Lg) {
    var id = 'ft-clip-' + (clipN++);
    var cp = S('clipPath', { id: id }, S('defs', null, svg));
    S('circle', { cx: cx, cy: cy, r: R }, cp);
    S('circle', { cx: cx, cy: cy, r: R, style: 'fill:none;stroke:var(--ft-grid);stroke-width:1.5' }, svg);
    var g = S('g', { 'clip-path': 'url(#' + id + ')' }, svg);
    var tip = [cx, cy - Lg / 2], base = [cx, cy + Lg / 2];
    var ring = S('circle', { cx: tip[0], cy: tip[1], r: 10, style: 'fill:none;stroke:' + col(color) + ';stroke-width:1.8;stroke-dasharray:5 4' }, g);
    var dots = [];
    for (var i = 0; i < 46; i++) dots.push(S('circle', { r: 3.3, style: 'fill:' + col(color) + ';opacity:0' }, g));
    var tru = arrow(svg, 'true', 3.4); tru.set(base[0], base[1], tip[0], tip[1], 9);
    var k = 0;
    return function (s, r, uniform) {
      var d = dots[k % dots.length];
      if (uniform) { var a = r() * 6.2832, rr = Math.sqrt(r()) * R; d.setAttribute('cx', cx + rr * Math.cos(a)); d.setAttribute('cy', cy + rr * Math.sin(a)); }
      else { d.setAttribute('cx', tip[0] + gauss(r) * s); d.setAttribute('cy', tip[1] + gauss(r) * s); }
      k++;
      dots.forEach(function (o, j) { var age = ((k - 1 - j) % dots.length + dots.length) % dots.length; o.style.opacity = (0.85 * (1 - age / dots.length)).toFixed(2); });
      ring.setAttribute('r', Math.min(s, R * 3).toFixed(1));
      ring.style.opacity = uniform ? 0 : 1;
    };
  }
  FIG.apical = function (root) {
    legend(root, [['true', 'true gradient'], ['noise', 'noise'], ['dust', 'standard Dust'], ['apical', 'Apical Dust']]);
    var svg = svgRoot(root, 860, 545, 'Standard Dust estimates the error from noise alone, which is high variance at small populations. Apical Dust predicts the error with a learned feedback map, uses the prediction as a control variate, and estimates only the residual from noise, staying unbiased.');
    T(svg, 30, 28, 'Standard Dust', 'ft-h', 'fill:var(--ft-dust)');
    T(svg, 440, 28, 'Apical Dust', 'ft-h', 'fill:var(--ft-apical)');
    var L = [
      box(svg, 30, 46, 360, 40, ['output error eₜ'], 'var(--muted)'),
      box(svg, 30, 112, 360, 40, ['activation noise aₜ'], 'noise', 'noise'),
      box(svg, 30, 178, 360, 52, ['estimated error êₜ', 'high variance at small K'], 'dust', 'dust')
    ];
    flowArrow(svg, 210, 88, 210, 110); flowArrow(svg, 210, 154, 210, 176);
    var R = [
      box(svg, 440, 46, 390, 38, ['output error êₜ'], 'var(--muted)'),
      box(svg, 440, 96, 390, 38, ['Bₘ feedback map, fit by ridge regression'], 'apical', 'apical'),
      box(svg, 440, 146, 390, 38, [['predicted error ĝ', { sub: 'pred' }, ' = B', { sub: 'm' }, ' ê', { sub: 't' }]], 'apical'),
      box(svg, 440, 196, 390, 38, [['adjust rewards r′ = r + σ ⟨ĝ', { sub: 'pred' }, ', a⟩']], 'noise'),
      box(svg, 440, 246, 390, 38, ['estimate only the residual from the K draws'], 'apical'),
      box(svg, 440, 296, 390, 46, ['prediction + residual', 'unbiased for any Bₘ: E[ĝ] = g'], 'apical', 'apical')
    ];
    [86, 136, 186, 236, 286].forEach(function (y) { flowArrow(svg, 635, y, 635, y + 9); });
    line(svg, 20, 362, 840, 362, 'stroke:var(--ft-grid)');
    T(svg, 210, 380, 'Dust estimates at K = 16', 'ft-tm', null, 'middle');
    T(svg, 635, 380, 'Apical Dust estimates at K = 16', 'ft-tm', null, 'middle');
    var dl = scatterBoard(svg, 210, 462, 72, 'dust', 26), da = scatterBoard(svg, 635, 462, 72, 'apical', 26);
    T(svg, 296, 452, 'same centre,', 'ft-tm');
    T(svg, 296, 468, 'wider ring', 'ft-tm');
    T(svg, 721, 452, 'same centre,', 'ft-tm');
    T(svg, 721, 468, 'about half the variance', 'ft-tm');
    T(svg, 430, 538, 'dashed ring: one standard deviation of the estimate around the true gradient (navy)', 'ft-tm', null, 'middle');
    var sD = sdFor(cosFor('dust', 16), 26), sA = sdFor(cosFor('apical', 16), 26);
    var r = rng(21), acc = 0, hi = 0, hiT = 0;
    for (var i = 0; i < 46; i++) { dl(sD, r); da(sA, r); }
    register(svg, function (t, dt, still) {
      if (still) { R.forEach(function (b, i) { b.on(i === 5); }); return; }
      acc += dt; if (acc > 0.08) { acc = 0; dl(sD, r); da(sA, r); }
      hiT += dt; if (hiT > 0.95) { hiT = 0; hi = (hi + 1) % R.length; }
      R.forEach(function (b, i) { b.on(i === hi); });
      L.forEach(function (b, i) { b.on(i === Math.min(2, Math.floor(hi / 2))); });
    });
  };

  /* =====================================================================
     8. Weight vs node vs Apical: per-step agreement with the true gradient
     ===================================================================== */
  FIG.variance = function (root) {
    legend(root, [['true', 'true gradient'], ['weight', 'weight perturbation'], ['dust', 'node perturbation (Dust)'], ['apical', 'Apical Dust']]);
    var svg = svgRoot(root, 860, 330, 'Three dartboards of gradient estimates around the true gradient. Weight perturbation is close to random, node perturbation is noisy but centred, and Apical Dust is centred with less spread. Raising the population K tightens the node and Apical estimates.');
    var kinds = [['weight', 'Weight perturbation', 150, 'variance grows with P'], ['dust', 'Node perturbation (Dust)', 430, 'variance grows with d / K'], ['apical', 'Apical Dust', 710, 'only the residual is noisy']];
    var boards = kinds.map(function (k) {
      T(svg, k[2], 30, k[1], 'ft-t ft-b', 'fill:' + col(k[0]), 'middle');
      T(svg, k[2], 48, k[3], 'ft-tm', null, 'middle');
      var f = scatterBoard(svg, k[2], 166, 96, k[0], 30);
      var ro = T(svg, k[2], 292, '', 'ft-t ft-b', 'fill:' + col(k[0]), 'middle');
      return { f: f, kind: k[0], ro: ro };
    });
    function feed(b) { b.f(b.kind === 'weight' ? 0 : sdFor(cosFor(b.kind, K), 30), r, b.kind === 'weight'); }
    var K = 16, r = rng(3), acc = 0;
    var c = ctrls(root), Ks = [16, 32, 64, 128, 256], kOut;
    range(c, 'population K', 0, 4, 1, 0, function (v) { K = Ks[v]; update(); });
    kOut = out(c);
    function update() {
      kOut.innerHTML = 'K = <b>' + K + '</b>. Apical at K = 16 matches Dust at K ≈ 33 (measured)';
      boards.forEach(function (b) { b.ro.textContent = 'per-step cosine ≈ ' + cosFor(b.kind, K).toFixed(2); });
    }
    update();
    for (var i = 0; i < 46; i++) boards.forEach(feed);
    register(svg, function (t, dt, still) {
      if (still) return;
      acc += dt; if (acc < 0.07) return; acc = 0;
      boards.forEach(feed);
    });
  };

  /* =====================================================================
     9. Experiment 2 results: test loss across the population ladder (measured)
     ===================================================================== */
  FIG.ladder = function (root) {
    legend(root, [['dust', 'Dust'], ['apical', 'Apical Dust'], ['true', 'exact backprop', true], ['dust', 'fixed Dust', true], ['apical', 'Apical on fixed Dust', true]]);
    var svg = svgRoot(root, 860, 380, 'Line chart of test loss in nats per character against population K. Dust: 2.510, 2.488, 2.473 at K 16, 64, 256. Apical Dust: 2.498, 2.478, 2.473. Backprop: 2.394. Fixed Dust: 2.509, 2.452, 2.443. Apical on fixed Dust: 2.489, 2.444.');
    var X0 = 110, X1 = 760, Y0 = 30, Y1 = 320, L0 = 2.38, L1 = 2.53;
    function X(K) { return X0 + (Math.log(K) / Math.LN2 - 4) / 4 * (X1 - X0); }
    function Y(l) { return Y1 - (l - L0) / (L1 - L0) * (Y1 - Y0); }
    [2.40, 2.44, 2.48, 2.52].forEach(function (l) { line(svg, X0, Y(l), X1, Y(l), 'stroke:var(--ft-grid)'); T(svg, X0 - 10, Y(l) + 4, l.toFixed(2), 'ft-tm', null, 'end'); });
    [16, 64, 256].forEach(function (K) { T(svg, X(K), Y1 + 22, 'K = ' + K, 'ft-tm', null, 'middle'); });
    var yl = T(svg, 30, (Y0 + Y1) / 2, 'test loss (nats/char), lower is better', 'ft-tm', null, 'middle');
    yl.setAttribute('transform', 'rotate(-90 30 ' + (Y0 + Y1) / 2 + ')');
    line(svg, X0, Y(2.394), X1, Y(2.394), 'stroke:var(--ft-true);stroke-width:2;stroke-dasharray:6 5');
    T(svg, X1 + 8, Y(2.394) + 4, 'backprop 2.394', 'ft-t ft-b', 'fill:var(--ft-true)');
    var ro;
    function series(data, color, dashed, label) {
      var g = S('g', null, svg), d = '';
      data.forEach(function (p, i) { d += (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); });
      var path = S('path', { d: d, style: 'fill:none;stroke:' + col(color) + ';stroke-width:2.6' + (dashed ? ';stroke-dasharray:7 5' : '') }, g);
      data.forEach(function (p) {
        line(g, X(p[0]), Y(p[1] - p[2]), X(p[0]), Y(p[1] + p[2]), 'stroke:' + col(color) + ';stroke-width:1.6');
        var cdot = S('circle', { cx: X(p[0]), cy: Y(p[1]), r: 5.5, tabindex: 0, style: 'fill:' + col(color) + ';cursor:pointer' }, g);
        var txt = label + ' at K = ' + p[0] + ': ' + p[1].toFixed(3) + ' ± ' + p[2].toFixed(3);
        S('title', null, cdot).textContent = txt;
        cdot.addEventListener('mouseenter', function () { ro.innerHTML = '<b>' + txt + '</b>'; });
        cdot.addEventListener('focus', function () { ro.innerHTML = '<b>' + txt + '</b>'; });
      });
      var len = path.getTotalLength();
      path.style.strokeDasharray = dashed ? '7 5' : len + ' ' + len;
      if (!dashed) path.style.strokeDashoffset = len;
      return { g: g, path: path, len: len, dashed: dashed };
    }
    var dust = series([[16, 2.510, 0.006], [64, 2.488, 0.010], [256, 2.473, 0.001]], 'dust', false, 'Dust');
    var apic = series([[16, 2.498, 0.004], [64, 2.478, 0.004], [256, 2.473, 0.001]], 'apical', false, 'Apical Dust');
    var fixd = series([[16, 2.509, 0.001], [64, 2.452, 0.016], [256, 2.443, 0.006]], 'dust', true, 'Fixed Dust');
    var fixa = series([[16, 2.489, 0.004], [64, 2.444, 0.014]], 'apical', true, 'Apical on fixed Dust');
    fixd.g.style.opacity = 0; fixa.g.style.opacity = 0;
    fixd.g.style.transition = fixa.g.style.transition = 'opacity .5s';
    // Apical at K = 16 vs Dust interpolated log-linearly
    var k33 = 16 * Math.pow(4, (2.498 - 2.510) / (2.488 - 2.510));
    var ann = S('g', null, svg);
    line(ann, X(16), Y(2.498), X(k33), Y(2.498), 'stroke:var(--ft-apical);stroke-width:1.6;stroke-dasharray:3 4');
    S('circle', { cx: X(k33), cy: Y(2.498), r: 7, style: 'fill:none;stroke:var(--ft-dust);stroke-width:2' }, ann);
    T(ann, X(k33) + 12, Y(2.498) - 10, 'Apical at K = 16 ≈ Dust at K ≈ 33', 'ft-t ft-b', 'fill:var(--ft-apical)');
    var c = ctrls(root);
    var tb = btn(c, 'show the fixed Dust runs', function () {
      var on = fixd.g.style.opacity !== '1';
      fixd.g.style.opacity = fixa.g.style.opacity = on ? 1 : 0;
      tb.textContent = on ? 'hide the fixed Dust runs' : 'show the fixed Dust runs';
      tb.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    ro = out(c); ro.innerHTML = 'hover a point for its value';
    var p = 0;
    register(svg, function (t, dt, still) {
      p = still ? 1 : Math.min(1, p + dt / 1.6);
      [dust, apic].forEach(function (s) { s.path.style.strokeDashoffset = s.len * (1 - ease(p)); });
      ann.style.opacity = clamp((p - 0.7) / 0.3, 0, 1);
    });
  };

  /* =====================================================================
     10. [f] A control variate shrinks variance as the feedback map improves
     ===================================================================== */
  FIG.cv = function (root) {
    legend(root, [['true', 'true gradient g'], ['apical', 'feedback prediction'], ['dust', 'Dust estimates'], ['apical', 'Apical Dust estimates']]);
    var svg = svgRoot(root, 860, 330, 'Toy picture of a control variate. Dust estimates scatter widely around the true gradient. Apical Dust estimates scatter only by the part the feedback map fails to predict, so a better feedback map shrinks the cloud while it stays centred on the true gradient.');
    var O = [90, 300], G = [240, -130];
    var cp = S('clipPath', { id: 'ft-clip-cv' }, S('defs', null, svg));
    S('rect', { x: 0, y: 0, width: 560, height: 330 }, cp);
    var cloud = S('g', { 'clip-path': 'url(#ft-clip-cv)' }, svg);
    var dDots = [], aDots = [];
    for (var i = 0; i < 70; i++) {
      dDots.push(S('circle', { r: 3.4, style: 'fill:var(--ft-dust);opacity:0' }, cloud));
      aDots.push(S('circle', { r: 3.4, style: 'fill:var(--ft-apical);opacity:0' }, cloud));
    }
    var gA = arrow(svg, 'true', 3.5); gA.set(O[0], O[1], O[0] + G[0], O[1] + G[1], 12);
    T(svg, O[0] + G[0] + 12, O[1] + G[1] + 18, 'g', 'ft-t ft-b', 'fill:var(--ft-true)');
    var pA = arrow(svg, 'apical', 2.5); pA.g.setAttribute('stroke-dasharray', '6 4');
    var pLab = T(svg, 0, 0, ['ĝ', { sub: 'pred' }], 'ft-t ft-b', 'fill:var(--ft-apical)');
    // variance bars
    var BX = 600, BY = 70, BH = 190;
    T(svg, BX, 40, 'variance of the estimate', 'ft-t ft-b');
    S('rect', { x: BX, y: BY, width: 70, height: BH, rx: 4, style: 'fill:var(--ft-dust);opacity:.85' }, svg);
    T(svg, BX + 35, BY + BH + 20, 'Dust', 'ft-tm', null, 'middle');
    var aBar = S('rect', { x: BX + 110, y: BY, width: 70, height: BH, rx: 4, style: 'fill:var(--ft-apical);opacity:.85' }, svg);
    T(svg, BX + 145, BY + BH + 20, 'Apical', 'ft-tm', null, 'middle');
    var aVal = T(svg, BX + 145, 0, '', 'ft-t ft-b', 'fill:var(--ft-apical)', 'middle');
    var q = 0.31, r = rng(9), k = 0, acc = 0;
    var c = ctrls(root), ro;
    range(c, 'share of the error the feedback map predicts', 0, 90, 1, 31, function (v) { q = v / 100; update(); });
    ro = out(c);
    function update() {
      var pred = [G[0] * q, G[1] * q];
      pA.set(O[0], O[1], O[0] + pred[0], O[1] + pred[1], 10);
      pA.g.style.opacity = q > 0.04 ? 1 : 0.2;
      pLab.setAttribute('x', O[0] + pred[0] - 34); pLab.setAttribute('y', O[1] + pred[1] + 4);
      var ratio = (1 - q) * (1 - q), h = BH * ratio;
      aBar.setAttribute('y', BY + BH - h); aBar.setAttribute('height', h);
      aVal.setAttribute('y', BY + BH - h - 8); aVal.textContent = ratio.toFixed(2) + '×';
      ro.innerHTML = 'variance <b>' + ratio.toFixed(2) + '×</b> Dust, worth about <b>' + (1 / ratio).toFixed(1) + '×</b> the population' + (Math.abs(q - 0.31) < 0.02 ? ' (the measured operating point)' : '');
    }
    update();
    function sample() {
      var s = 50, rd = dDots[k % 70], ra = aDots[k % 70];
      rd.setAttribute('cx', O[0] + G[0] + gauss(r) * s); rd.setAttribute('cy', O[1] + G[1] + gauss(r) * s);
      ra.setAttribute('cx', O[0] + G[0] + gauss(r) * s * (1 - q)); ra.setAttribute('cy', O[1] + G[1] + gauss(r) * s * (1 - q));
      k++;
      for (var i = 0; i < 70; i++) {
        var age = (k - 1 - i + 700) % 70, op = (0.75 * (1 - age / 70)).toFixed(2);
        dDots[i].style.opacity = op; aDots[i].style.opacity = op;
      }
    }
    for (var j = 0; j < 70; j++) sample();
    register(svg, function (t, dt, still) { if (still) return; acc += dt; if (acc > 0.05) { acc = 0; sample(); } });
  };

  /* =====================================================================
     11. [g] Unbiased for any feedback map: running means
     ===================================================================== */
  FIG.unbiased = function (root) {
    legend(root, [['true', 'true gradient g'], ['bias', 'feedback only (biased)'], ['apical', 'Apical Dust control variate (unbiased)']]);
    var svg = svgRoot(root, 860, 330, 'Running averages of two estimators. Using the feedback prediction alone converges to the wrong place whenever the feedback map is off. The control variate adds back a noisy correction whose average cancels the prediction, so its running average converges to the true gradient for any feedback map.');
    var O = [90, 290], G = [300, -190];
    var gA = arrow(svg, 'true', 3.5); gA.set(O[0], O[1], O[0] + G[0], O[1] + G[1], 12);
    T(svg, O[0] + G[0] + 10, O[1] + G[1] - 4, 'g', 'ft-t ft-b', 'fill:var(--ft-true)');
    var pA = arrow(svg, 'bias', 2.2); pA.g.setAttribute('stroke-dasharray', '6 4');
    var pLab = T(svg, 0, 0, ['ĝ', { sub: 'pred' }], 'ft-t ft-b', 'fill:var(--ft-bias)');
    var trF = S('polyline', { style: 'fill:none;stroke:var(--ft-bias);stroke-width:1.6;opacity:.7' }, svg);
    var trA = S('polyline', { style: 'fill:none;stroke:var(--ft-apical);stroke-width:1.6;opacity:.7' }, svg);
    var mF = S('circle', { r: 7, style: 'fill:var(--ft-bias)' }, svg);
    var mA = S('circle', { r: 7, style: 'fill:var(--ft-apical)' }, svg);
    var r1 = T(svg, 520, 120, '', 'ft-t');
    var r2 = T(svg, 520, 150, '', 'ft-t ft-b', 'fill:var(--ft-bias)');
    var r3 = T(svg, 520, 176, '', 'ft-t ft-b', 'fill:var(--ft-apical)');
    T(svg, 520, 210, ['the correction averages to g − ĝ', { sub: 'pred' }, ','], 'ft-tm');
    T(svg, 520, 228, 'so the prediction cancels out in expectation', 'ft-tm');
    var delta = 35, r = rng(4), n = 0, sF = [0, 0], sA = [0, 0], ptsF = [], ptsA = [], hold = 0;
    var c = ctrls(root);
    range(c, 'how wrong the feedback map is (degrees)', 0, 80, 1, 35, function (v) { delta = v; reset(); });
    function pred() { var a = -delta * Math.PI / 180, s = 0.8; return [s * (G[0] * Math.cos(a) - G[1] * Math.sin(a)), s * (G[0] * Math.sin(a) + G[1] * Math.cos(a))]; }
    function reset() {
      n = 0; sF = [0, 0]; sA = [0, 0]; ptsF = []; ptsA = []; hold = 0;
      var p = pred(); pA.set(O[0], O[1], O[0] + p[0], O[1] + p[1], 10);
      pLab.setAttribute('x', O[0] + p[0] + 8); pLab.setAttribute('y', O[1] + p[1] + 18);
    }
    function cosTo(v) { return (v[0] * G[0] + v[1] * G[1]) / (Math.hypot(v[0], v[1]) * Math.hypot(G[0], G[1]) || 1); }
    function step() {
      var p = pred(), res = Math.hypot(G[0] - p[0], G[1] - p[1]) / Math.hypot(G[0], G[1]);
      var f = [p[0] + gauss(r) * 14, p[1] + gauss(r) * 14];
      var a = [G[0] + gauss(r) * 150 * res, G[1] + gauss(r) * 150 * res];
      n++; sF[0] += f[0]; sF[1] += f[1]; sA[0] += a[0]; sA[1] += a[1];
      var mf = [sF[0] / n, sF[1] / n], ma = [sA[0] / n, sA[1] / n];
      ptsF.push((O[0] + mf[0]).toFixed(1) + ',' + (O[1] + mf[1]).toFixed(1));
      ptsA.push((O[0] + ma[0]).toFixed(1) + ',' + (O[1] + ma[1]).toFixed(1));
      if (ptsF.length > 160) { ptsF.shift(); ptsA.shift(); }
      trF.setAttribute('points', ptsF.join(' ')); trA.setAttribute('points', ptsA.join(' '));
      mF.setAttribute('cx', O[0] + mf[0]); mF.setAttribute('cy', O[1] + mf[1]);
      mA.setAttribute('cx', O[0] + ma[0]); mA.setAttribute('cy', O[1] + ma[1]);
      r1.textContent = 'estimates averaged: N = ' + n;
      r2.textContent = 'feedback only: cosine to g = ' + cosTo(mf).toFixed(3);
      r3.textContent = 'control variate: cosine to g = ' + cosTo(ma).toFixed(3);
    }
    reset();
    register(svg, function (t, dt, still) {
      if (still) { while (n < 400) step(); return; }
      if (n >= 400) { hold += dt; if (hold > 1.5) reset(); return; }
      for (var i = 0; i < 2; i++) step();
    });
  };

  /* =====================================================================
     12. [h] The Averaging Test: reused from the earlier Apical Dust post
     ===================================================================== */
  FIG.averaging = function (root) {
    legend(root, [['true', 'true backprop gradient'], ['bias', 'feedback-weighted (biased)'], ['apical', 'control variate (unbiased)']]);
    var cv = H('canvas', { role: 'img', 'aria-label': 'Averaging N noisy updates. The unbiased control variate average converges onto the true gradient, while the biased feedback-weighted average stays locked at an angle however many batches are averaged.' }, root);
    var ctx = cv.getContext('2d'), DPR = Math.min(2, window.devicePixelRatio || 1);
    function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
    var r = rng(11), MAXN = 200, A = [], B = [], biasAng = 0.68;
    for (var i = 0; i < MAXN; i++) {
      A.push({ x: 0.9 + gauss(r) * 0.55, y: Math.sin(biasAng) * 0.9 + gauss(r) * 0.55 });
      B.push({ x: 1.0 + gauss(r) * 0.95, y: gauss(r) * 0.95 });
    }
    var n = 1, playing = !REDUCE;
    var c = ctrls(root);
    var pb = btn(c, playing ? 'pause' : 'play', function () { playing = !playing; pb.textContent = playing ? 'pause' : 'play'; });
    var sl = range(c, 'batches averaged', 1, MAXN, 1, 1, function (v) { playing = false; pb.textContent = 'play'; n = v; draw(); });
    var ro = out(c);
    function resize() { var w = cv.clientWidth, h = cv.clientHeight; cv.width = Math.max(1, w * DPR); cv.height = Math.max(1, h * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
    function avg(arr, k) { var sx = 0, sy = 0; for (var i = 0; i < k; i++) { sx += arr[i].x; sy += arr[i].y; } return { x: sx / k, y: sy / k }; }
    function cosTo(v) { return v.x / (Math.hypot(v.x, v.y) || 1e-9); }
    function arw(cx, cy, vx, vy, s, c2, lw) {
      var ex = cx + vx * s, ey = cy - vy * s;
      ctx.strokeStyle = c2; ctx.fillStyle = c2; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
      var a = Math.atan2(cy - ey, ex - cx);
      ctx.beginPath(); ctx.moveTo(ex, ey);
      ctx.lineTo(ex - 9 * Math.cos(a - 0.4), ey + 9 * Math.sin(a - 0.4));
      ctx.lineTo(ex - 9 * Math.cos(a + 0.4), ey + 9 * Math.sin(a + 0.4));
      ctx.closePath(); ctx.fill();
    }
    function draw() {
      var w = cv.clientWidth, h = cv.clientHeight; ctx.clearRect(0, 0, w, h);
      var pink = css('--ft-bias'), acc = css('--ft-apical'), tru = css('--ft-true'), mut = css('--muted');
      var cx = w * 0.16, cy = h * 0.58, S2 = Math.min(w * 0.5, h * 0.7);
      var k = Math.max(1, Math.min(MAXN, Math.round(n)));
      ctx.globalAlpha = 0.16;
      for (var i = Math.max(0, k - 18); i < k; i++) { arw(cx, cy, A[i].x, A[i].y, S2 * 0.5, pink, 1); arw(cx, cy, B[i].x, B[i].y, S2 * 0.5, acc, 1); }
      ctx.globalAlpha = 1;
      arw(cx, cy, 1, 0, S2, tru, 3);
      ctx.fillStyle = tru; ctx.font = '600 12px "Libre Franklin", system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('true backprop gradient', cx + S2 + 10, cy + 4);
      var aA = avg(A, k), aB = avg(B, k);
      arw(cx, cy, aA.x, aA.y, S2 / Math.max(1, Math.hypot(aA.x, aA.y)), pink, 3);
      arw(cx, cy, aB.x, aB.y, S2 / Math.max(1, Math.hypot(aB.x, aB.y)), acc, 3);
      ctx.fillStyle = mut; ctx.font = '12px "Libre Franklin", system-ui, sans-serif';
      ctx.fillText('batches averaged: ' + k, w * 0.62, h * 0.16);
      ro.innerHTML = 'averaged cosine to backprop: feedback-weighted <b>' + cosTo(aA).toFixed(2) + '</b>, control variate <b>' + cosTo(aB).toFixed(2) + '</b>';
      if (document.activeElement !== sl) sl.value = k;
    }
    window.addEventListener('resize', function () { resize(); draw(); });
    resize();
    register(cv, function (t, dt, still) {
      if (still) { n = MAXN; draw(); return; }
      if (playing) { n += 0.9; if (n >= MAXN) n = 1; }
      draw();
    });
  };

  /* =====================================================================
     13. Where Dust's bias hides: averaging-test plateaus per layer type
     ===================================================================== */
  FIG.plateau = function (root) {
    legend(root, [['dust', 'queries, attention outputs, MLP'], ['output', 'keys and values'], ['bias', 'token embedding'], ['true', 'unbiased limit', true]]);
    var svg = svgRoot(root, 860, 350, 'Cosine to the backprop gradient against the number of estimates averaged. Queries, attention outputs and MLP plateau near 0.98, keys and values near 0.88, and the token embedding at 0.71, rising to 0.78 once embeddings get future-token credit.');
    var X0 = 90, X1 = 690, Y0 = 26, Y1 = 300;
    function X(N) { return X0 + Math.log(N) / Math.log(1024) * (X1 - X0); }
    function Y(c) { return Y1 - c * (Y1 - Y0); }
    [0, 0.25, 0.5, 0.75, 1].forEach(function (cc) { line(svg, X0, Y(cc), X1, Y(cc), 'stroke:var(--ft-grid)'); T(svg, X0 - 10, Y(cc) + 4, cc.toFixed(2), 'ft-tm', null, 'end'); });
    [1, 4, 16, 64, 256, 1024].forEach(function (N) { T(svg, X(N), Y1 + 20, String(N), 'ft-tm', null, 'middle'); });
    T(svg, (X0 + X1) / 2, Y1 + 42, 'number of estimates averaged, N (log scale)', 'ft-tm', null, 'middle');
    line(svg, X0, Y(1), X1, Y(1), 'stroke:var(--ft-true);stroke-width:1.6;stroke-dasharray:4 4');
    T(svg, X0 + 8, Y(1) - 8, 'an unbiased estimator keeps rising toward 1', 'ft-tm', 'fill:var(--ft-true)');
    function curveD(P) {
      var d = '';
      for (var i = 0; i <= 80; i++) { var N = Math.pow(1024, i / 80), cc = P * Math.sqrt(N / (N + 24)); d += (i ? 'L' : 'M') + X(N).toFixed(1) + ' ' + Y(cc).toFixed(1); }
      return d;
    }
    function series(P, color, label) {
      var p = S('path', { d: curveD(P), style: 'fill:none;stroke:' + col(color) + ';stroke-width:2.8' }, svg);
      var lab = T(svg, X1 + 8, Y(P) + 4, label, 'ft-t ft-b', 'fill:' + col(color));
      var len = p.getTotalLength(); p.style.strokeDasharray = len + ' ' + len; p.style.strokeDashoffset = len;
      return { p: p, lab: lab, len: len };
    }
    var ghost = S('path', { d: curveD(0.71), style: 'fill:none;stroke:var(--ft-bias);stroke-width:1.6;stroke-dasharray:3 4;opacity:0' }, svg);
    var s1 = series(0.98, 'dust', '≈ 0.98'), s2 = series(0.88, 'output', '≈ 0.88'), s3 = series(0.71, 'bias', '0.71');
    var Pemb = 0.71, target = 0.71, p = 0;
    var c = ctrls(root), ro;
    var tb = btn(c, 'give embeddings future-token credit (γ = 0.9)', function () {
      target = target === 0.71 ? 0.78 : 0.71;
      tb.setAttribute('aria-pressed', target === 0.78 ? 'true' : 'false');
    });
    ro = out(c);
    register(svg, function (t, dt, still) {
      p = still ? 1 : Math.min(1, p + dt / 1.5);
      [s1, s2, s3].forEach(function (s) { s.p.style.strokeDashoffset = s.len * (1 - ease(p)); });
      Pemb = still ? target : Pemb + (target - Pemb) * Math.min(1, dt * 5);
      s3.p.setAttribute('d', curveD(Pemb));
      s3.p.style.strokeDasharray = 'none';
      if (p < 1) s3.p.style.strokeDasharray = s3.len + ' ' + s3.len;
      s3.lab.setAttribute('y', Y(Pemb) + 4);
      s3.lab.textContent = target === 0.78 ? '0.71 → 0.78' : '0.71';
      ghost.style.opacity = target === 0.78 ? 0.6 : 0;
      ro.innerHTML = 'token embedding plateau: <b>' + Pemb.toFixed(2) + '</b>' + (target === 0.78 ? ' with γ = 0.9' : ' with γ = 0 (own-token credit only)');
    });
  };

  /* ---------- flip cards and hover definitions ---------- */
  function initFlips() {
    Array.prototype.forEach.call(document.querySelectorAll('.ft-flip'), function (fig) {
      var b = fig.querySelector('.ft-flip-btn'), front = fig.querySelector('.ft-front'), back = fig.querySelector('.ft-back');
      function set(on) {
        fig.classList.toggle('is-flipped', on);
        if (b) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.textContent = on ? 'Flip back to the animation' : 'Flip to see my sketch'; }
        if (front) front.setAttribute('aria-hidden', on ? 'true' : 'false');
        if (back) back.setAttribute('aria-hidden', on ? 'false' : 'true');
      }
      set(false);
      if (b) b.addEventListener('click', function () { set(!fig.classList.contains('is-flipped')); });
      var inner = fig.querySelector('.ft-flip-inner');
      if (inner) inner.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('button, input, select, a, label, .ft-controls, circle[tabindex]')) return;
        set(!fig.classList.contains('is-flipped'));
      });
    });
  }
  function initDefs() {
    var defs = document.querySelectorAll('.ft-def');
    Array.prototype.forEach.call(defs, function (d) {
      var pop = d.querySelector('.ft-pop'); if (!pop) return;
      function place() {
        d.style.setProperty('--ft-shift', '0px'); d.classList.remove('ft-below');
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
    document.addEventListener('click', function () { Array.prototype.forEach.call(defs, function (o) { o.classList.remove('is-open'); }); });
  }

  function mountAll() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-ft]'), function (el) {
      var f = FIG[el.getAttribute('data-ft')];
      if (!f) return;
      try { f(el); } catch (err) { if (window.console) console.error('figure ' + el.getAttribute('data-ft') + ' failed', err); }
    });
    initFlips();
    initDefs();
    if (!REDUCE) requestAnimationFrame(frame);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll); else mountAll();
})();
