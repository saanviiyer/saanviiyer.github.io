/* Figures for "Sparse autoencoders, from superposition to steering".
   Every figure runs a real sparse autoencoder in the browser on the same toy
   world as /playground/sae/: 6 planted concepts packed into 3 neurons. */
(function () {
  "use strict";

  // ---- seeded RNG and vector helpers ------------------------------------------
  var _s = 20261028;
  function rnd() { _s = (_s * 1103515245 + 12345) & 0x7fffffff; return _s / 0x7fffffff; }
  function randn() { var u = rnd() || 1e-9, v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185 * v); }
  function zeros(n) { var a = []; for (var i = 0; i < n; i++) a.push(0); return a; }
  function unit(v) { var m = Math.hypot(v[0], v[1], v[2]) || 1e-9; return [v[0] / m, v[1] / m, v[2] / m]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function scale(v, s) { return [v[0] * s, v[1] * s, v[2] * s]; }
  function css(name, fb) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb; }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  // ---- the toy world ----------------------------------------------------------
  var D = 3, K = 6, H = 12, N = 600, P_ON = 0.06;
  var NAMES = ['A', 'B', 'C', 'D', 'E', 'F'];
  var COLORS = ['#9c1c8c', '#2f93ab', '#d07a2a', '#3f8a3a', '#5b6fd0', '#cf4d87'];
  var g = (1 + Math.sqrt(5)) / 2;
  var GT = [[0, 1, g], [0, -1, g], [1, g, 0], [-1, g, 0], [g, 0, 1], [g, 0, -1]].map(unit);
  var X = [], Z = [], VAR = 0;
  (function () {
    for (var n = 0; n < N; n++) {
      var z = zeros(K), any = false;
      for (var k = 0; k < K; k++) if (rnd() < P_ON) { z[k] = 0.6 + rnd() * 0.9; any = true; }
      if (!any) z[(rnd() * K) | 0] = 0.6 + rnd() * 0.9;
      var x = [0, 0, 0];
      for (var i = 0; i < D; i++) { for (k = 0; k < K; k++) x[i] += z[k] * GT[k][i]; x[i] += randn() * 0.02; }
      X.push(x); Z.push(z);
    }
    var mu = [0, 0, 0];
    X.forEach(function (x) { for (var i = 0; i < D; i++) mu[i] += x[i] / N; });
    X.forEach(function (x) { for (var i = 0; i < D; i++) VAR += (x[i] - mu[i]) * (x[i] - mu[i]) / N; });
  })();
  function dominant(n) { var z = Z[n], b = 0; for (var k = 1; k < K; k++) if (z[k] > z[b]) b = k; return b; }

  // ---- a sparse autoencoder: ReLU(We x + be) then sum of decoder vectors ------
  function makeSAE(cfg) {
    var m = { cfg: cfg, step: 0, t: 0, lossHist: [] };
    function zl(a) { return a.map(function (r) { return Array.isArray(r) ? zeros(r.length) : 0; }); }
    m.We = []; m.be = []; m.Wd = [];
    for (var j = 0; j < H; j++) { var v = unit([randn(), randn(), randn()]); m.Wd.push(v.slice()); m.We.push(v.slice()); m.be.push(0); }
    var M = { We: zl(m.We), be: zl(m.be), Wd: zl(m.Wd) }, V = { We: zl(m.We), be: zl(m.be), Wd: zl(m.Wd) };
    m.trails = m.Wd.map(function (w) { return [w.slice()]; });
    m.encode = function (x) {
      var pre = [], code = [];
      for (var j = 0; j < H; j++) { var a = m.be[j] + dot(m.We[j], x); pre.push(a); code.push(a > 0 ? a : 0); }
      if (cfg.mode === 'topk') {
        var idx = code.map(function (c, j) { return [c, j]; }).sort(function (a, b) { return b[0] - a[0]; });
        for (var r = cfg.k; r < H; r++) code[idx[r][1]] = 0;
      }
      return { pre: pre, code: code };
    };
    m.decode = function (c) { var r = [0, 0, 0]; for (var j = 0; j < H; j++) if (c[j]) for (var i = 0; i < D; i++) r[i] += c[j] * m.Wd[j][i]; return r; };
    function adam(P, G, Mm, Vv, bs) {
      for (var a = 0; a < P.length; a++) {
        if (Array.isArray(P[a])) { adam(P[a], G[a], Mm[a], Vv[a], bs); continue; }
        var gg = G[a] / bs;
        Mm[a] = 0.9 * Mm[a] + 0.1 * gg; Vv[a] = 0.999 * Vv[a] + 0.001 * gg * gg;
        P[a] -= 0.01 * (Mm[a] / (1 - Math.pow(0.9, m.t))) / (Math.sqrt(Vv[a] / (1 - Math.pow(0.999, m.t))) + 1e-8);
      }
    }
    m.train = function (bs) {
      var gWe = zl(m.We), gbe = zl(m.be), gWd = zl(m.Wd), loss = 0;
      for (var b = 0; b < bs; b++) {
        var x = X[(rnd() * N) | 0], c = m.encode(x).code, r = m.decode(c), dr = [];
        for (var i = 0; i < D; i++) { var d = r[i] - x[i]; loss += d * d; dr.push(2 * d); }
        for (var j = 0; j < H; j++) {
          if (c[j] <= 0) continue;
          var dc = 0;
          if (cfg.mode === 'l1') { loss += cfg.lam * c[j]; dc = cfg.lam; }
          for (i = 0; i < D; i++) { gWd[j][i] += dr[i] * c[j]; dc += m.Wd[j][i] * dr[i]; }
          for (i = 0; i < D; i++) gWe[j][i] += dc * x[i];
          gbe[j] += dc;
        }
      }
      m.t++;
      adam(m.We, gWe, M.We, V.We, bs); adam(m.be, gbe, M.be, V.be, bs); adam(m.Wd, gWd, M.Wd, V.Wd, bs);
      for (var j2 = 0; j2 < H; j2++) m.Wd[j2] = unit(m.Wd[j2]);
      m.step++;
      if (m.step % 5 === 0) {
        m.lossHist.push(loss / bs);
        m.trails.forEach(function (tr, j) { tr.push(m.Wd[j].slice()); if (tr.length > 70) tr.shift(); });
      }
    };
    m.analyze = function () {
      var codes = X.map(function (x) { return m.encode(x).code; }), feats = [], mse = 0, l0 = 0;
      X.forEach(function (x, n) { var r = m.decode(codes[n]); for (var i = 0; i < D; i++) mse += (r[i] - x[i]) * (r[i] - x[i]) / N; });
      for (var j = 0; j < H; j++) {
        var fire = 0, acts = [];
        for (var n = 0; n < N; n++) { var c = codes[n][j]; if (c > 1e-3) { fire++; l0 += 1 / N; } acts.push([c, n]); }
        acts.sort(function (a, b) { return b[0] - a[0]; });
        var sims = GT.map(function (gv) { return dot(m.Wd[j], gv); }), best = 0;
        for (var k = 1; k < K; k++) if (sims[k] > sims[best]) best = k;
        var rate = fire / N, cls = rate < 0.01 ? 'dead' : sims[best] > 0.9 ? 'mono' : 'mixed';
        feats.push({ j: j, cls: cls, best: best, rate: rate, top: acts.slice(0, 8).filter(function (a) { return a[0] > 1e-3; }) });
      }
      var cov = {}; feats.forEach(function (f) { if (f.cls === 'mono') cov[f.best] = 1; });
      return { feats: feats, covered: Object.keys(cov).length, dead: feats.filter(function (f) { return f.cls === 'dead'; }).length, fve: Math.max(0, 1 - mse / VAR), l0: l0 };
    };
    m.fit = function (steps) { while (m.step < steps) m.train(32); return m; };
    return m;
  }
  var TARGET = 2400, MAIN = null;
  function main() { if (!MAIN) { MAIN = makeSAE({ mode: 'l1', lam: 0.4 }).fit(TARGET); MAIN.info = MAIN.analyze(); } return MAIN; }
  function fcol(f) { return f.cls === 'mono' ? COLORS[f.best] : null; }

  // ---- one animation loop, only for figures on screen -------------------------
  var ticks = [];
  function register(node, fn) {
    var rec = { on: false, fn: fn }; ticks.push(rec);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { rec.on = es[0].isIntersecting; }).observe(node);
    else rec.on = true;
  }
  (function loop(ts) { ticks.forEach(function (r) { if (r.on) r.fn(ts || 0); }); requestAnimationFrame(loop); })();

  // ---- a draggable 3D view onto activation space -------------------------------
  function View3D(canvas) {
    var v = this, ctx = canvas.getContext('2d'), drag = false, lx = 0, ly = 0;
    v.yaw = 0.7; v.pitch = 0.42; v.spin = true; v.moved = 0; v.onPick = null;
    v.size = function () {
      var DPR = Math.min(2, window.devicePixelRatio || 1), w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * DPR) || canvas.height !== Math.round(h * DPR)) { canvas.width = Math.round(w * DPR); canvas.height = Math.round(h * DPR); }
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); v.W = w; v.H = h; ctx.clearRect(0, 0, w, h);
      if (v.spin && !drag) v.yaw += 0.003;
      return ctx;
    };
    v.proj = function (p) {
      var cy = Math.cos(v.yaw), sy = Math.sin(v.yaw), cp = Math.cos(v.pitch), sp = Math.sin(v.pitch);
      var x1 = cy * p[0] + sy * p[1], y1 = -sy * p[0] + cy * p[1], z2 = cp * p[2] - sp * y1, y2 = sp * p[2] + cp * y1;
      var s = Math.min(v.W, v.H) / 4.6;
      return [v.W / 2 + s * x1, v.H * 0.56 - s * z2, y2];
    };
    v.line = function (a, b, col, w, dash, al) {
      var A = v.proj(a), B = v.proj(b); ctx.save(); ctx.globalAlpha = al == null ? 1 : al; ctx.strokeStyle = col; ctx.lineWidth = w || 1;
      if (dash) ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); ctx.restore();
    };
    v.arrow = function (a, b, col, w, al) {
      var A = v.proj(a), B = v.proj(b), ang = Math.atan2(B[1] - A[1], B[0] - A[0]), L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      ctx.save(); ctx.globalAlpha = al == null ? 1 : al; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w || 2;
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
      var hl = Math.min(10, L * 0.4);
      if (hl > 2) { ctx.beginPath(); ctx.moveTo(B[0], B[1]); ctx.lineTo(B[0] - hl * Math.cos(ang - 0.42), B[1] - hl * Math.sin(ang - 0.42)); ctx.lineTo(B[0] - hl * Math.cos(ang + 0.42), B[1] - hl * Math.sin(ang + 0.42)); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    };
    v.dot = function (p, r, col, al, ring) {
      var A = v.proj(p); ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(A[0], A[1], r, 0, 6.2832); ctx.fill();
      if (ring) { ctx.globalAlpha = 1; ctx.lineWidth = 2; ctx.strokeStyle = ring; ctx.stroke(); } ctx.restore();
    };
    v.label = function (p, t, col, size) {
      var A = v.proj(p); ctx.save(); ctx.fillStyle = col; ctx.font = (size || 11) + 'px "Libre Franklin", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, A[0], A[1]); ctx.restore();
    };
    v.axes = function () { var mu = css('--muted', '#6a2350'); for (var i = 0; i < 3; i++) { var e = [0, 0, 0]; e[i] = 2.1; var en = [0, 0, 0]; en[i] = -2.1; v.line(en, e, mu, 1, [3, 4], 0.35); v.label(scale(e, 1.1), 'n' + (i + 1), mu, 11); } };
    v.rays = function () { GT.forEach(function (gv, k) { v.line([0, 0, 0], scale(gv, 2.25), COLORS[k], 1.4, [5, 4], 0.75); v.label(scale(gv, 2.45), NAMES[k], COLORS[k], 13); }); };
    v.cloud = function (colorFn) {
      X.map(function (x, n) { return [v.proj(x)[2], n]; }).sort(function (a, b) { return a[0] - b[0]; }).forEach(function (o) {
        var s = colorFn(o[1]); v.dot(X[o[1]], s[2] || 2.4, s[0], s[1]);
      });
    };
    v.decoders = function (m, opts) {
      opts = opts || {}; var mu = css('--muted', '#6a2350');
      if (opts.trails) m.trails.forEach(function (tr, j) {
        if (tr.length < 2) return; var col = fcol(m.info.feats[j]) || mu;
        for (var q = 1; q < tr.length; q++) v.line(scale(tr[q - 1], 1.75), scale(tr[q], 1.75), col, 1.2, null, 0.5 * q / tr.length);
      });
      m.Wd.forEach(function (w, j) {
        var f = m.info.feats[j], col = fcol(f) || mu, hot = opts.hot === j;
        if (opts.hot != null && !hot) { v.arrow([0, 0, 0], scale(w, 1.75), col, 1.2, opts.dim == null ? 0.2 : opts.dim); return; }
        if (f.cls === 'dead') { v.line([0, 0, 0], scale(w, 1.75), mu, 1, [2, 3], 0.45); return; }
        v.arrow([0, 0, 0], scale(w, 1.75), col, hot ? 4 : 2.2, opts.alpha == null ? 0.9 : opts.alpha);
      });
    };
    canvas.addEventListener('pointerdown', function (e) { drag = true; v.moved = 0; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag) return; var dx = e.clientX - lx, dy = e.clientY - ly; v.moved += Math.abs(dx) + Math.abs(dy);
      v.yaw += dx * 0.008; v.pitch = Math.max(-1.4, Math.min(1.4, v.pitch + dy * 0.008)); lx = e.clientX; ly = e.clientY;
    });
    canvas.addEventListener('pointerup', function (e) {
      drag = false; canvas.style.cursor = 'grab';
      if (v.moved < 6 && v.onPick) {
        var r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, best = -1, bd = 1e9;
        X.forEach(function (x, n) { var p = v.proj(x), d = (p[0] - mx) * (p[0] - mx) + (p[1] - my) * (p[1] - my); if (d < bd) { bd = d; best = n; } });
        if (best >= 0 && bd < 400) v.onPick(best);
      }
    });
    canvas.style.cursor = 'grab'; canvas.style.touchAction = 'none';
  }

  // ---- small UI helpers ----------------------------------------------------------
  function controls(card) { var c = el('div', 'ft-controls'); card.appendChild(c); return c; }
  function button(parent, text, on) { var b = el('button', 'ft-btn', text); b.type = 'button'; b.addEventListener('click', on); parent.appendChild(b); return b; }
  function readout(parent) { var r = el('span', 'ft-readout'); parent.appendChild(r); return r; }
  function legendConcepts(card) {
    card.appendChild(el('div', 'ft-legend', NAMES.map(function (n, k) { return '<span class="ft-k"><i style="background:' + COLORS[k] + '"></i>concept ' + n + '</span>'; }).join('')));
  }
  function chips(n) {
    var z = Z[n], s = '<span class="sp-chips">';
    for (var k = 0; k < K; k++) { var a = Math.min(1, z[k] / 1.5); s += '<span class="sp-chip" style="background:' + COLORS[k] + ';opacity:' + (a > 0.03 ? (0.25 + 0.75 * a).toFixed(2) : 0.08) + '"></span>'; }
    return s + '</span>';
  }
  function cells(vals, color, maxAbs, signed) {
    return '<span class="sp-cells">' + vals.map(function (v) {
      var a = Math.min(1, Math.abs(v) / (maxAbs || 1)), col = signed && v < 0 ? '#2f93ab' : color, off = Math.abs(v) < 1e-3;
      return '<span class="sp-cell" title="' + v.toFixed(2) + '" style="background:' + (off ? 'transparent' : col) + ';opacity:' + (off ? 0.6 : (0.25 + 0.75 * a).toFixed(2)) + '"></span>';
    }).join('') + '</span>';
  }

  var FIGS = {};

  // 1. Superposition in 2D. Sparse inputs survive interference, dense ones do not.
  FIGS.superposition = function (card) {
    var cv = el('canvas'); cv.style.aspectRatio = '16 / 8'; card.appendChild(cv);
    var c = controls(card), n = 5, mode = 'sparse', z = [], shown = [0, 0], from = [0, 0], t0 = 0, last = -1e9;
    var rg = el('label', 'ft-range', 'features in 2D <input type="range" min="2" max="9" value="5"> <b class="ft-readout">5</b>'); c.appendChild(rg);
    var bS = button(c, 'sparse inputs', function () { mode = 'sparse'; sync(); last = -1e9; });
    var bD = button(c, 'dense inputs', function () { mode = 'dense'; sync(); last = -1e9; });
    var out = readout(c);
    function sync() { bS.setAttribute('aria-pressed', mode === 'sparse'); bD.setAttribute('aria-pressed', mode === 'dense'); }
    rg.querySelector('input').addEventListener('input', function () { n = +this.value; rg.querySelector('b').textContent = n; last = -1e9; });
    sync();
    var hue = function (i) { return 'hsl(' + Math.round(300 + i * 360 / 9) % 360 + ',58%,46%)'; };
    register(card, function (ts) {
      if (ts - last > 1600) {
        last = ts; z = zeros(n);
        if (mode === 'sparse') z[(rnd() * n) | 0] = 0.7 + 0.3 * rnd();
        else for (var i = 0; i < n; i++) if (rnd() < 0.5) z[i] = 0.5 + 0.5 * rnd();
        from = shown.slice(); t0 = ts;
      }
      var dirs = []; for (var i2 = 0; i2 < n; i2++) dirs.push([Math.cos(6.2832 * i2 / n + 0.3), Math.sin(6.2832 * i2 / n + 0.3)]);
      var x = [0, 0]; z.forEach(function (a, i) { if (dirs[i]) { x[0] += a * dirs[i][0]; x[1] += a * dirs[i][1]; } });
      var p = Math.min(1, (ts - t0) / 500); p = p * p * (3 - 2 * p);
      shown = [from[0] + (x[0] - from[0]) * p, from[1] + (x[1] - from[1]) * p];
      var DPR = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, Hh = cv.clientHeight, ctx = cv.getContext('2d');
      cv.width = W * DPR; cv.height = Hh * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var ink = css('--ink', '#17090f'), mu = css('--muted', '#6a2350'), cx = W * 0.27, cy = Hh / 2, R = Math.min(W * 0.22, Hh * 0.38);
      ctx.strokeStyle = css('--ft-grid', 'rgba(0,0,0,.08)'); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.stroke();
      dirs.forEach(function (d, i) {
        ctx.strokeStyle = hue(i); ctx.fillStyle = hue(i); ctx.lineWidth = 2.2; ctx.globalAlpha = z[i] ? 1 : 0.45;
        var ex = cx + R * d[0], ey = cy - R * d[1]; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.beginPath(); ctx.arc(ex, ey, 3.5, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1;
      });
      ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(cx + R * shown[0] * 0.75, cy - R * shown[1] * 0.75, 6, 0, 6.2832); ctx.fill();
      // readouts, each feature reads ReLU(d_i . x)
      var bx = W * 0.56, bw = W * 0.4, rowH = Math.min(24, (Hh - 30) / n), err = 0, maxOverlap = 0;
      for (var a = 0; a < n; a++) for (var b = a + 1; b < n; b++) maxOverlap = Math.max(maxOverlap, dirs[a][0] * dirs[b][0] + dirs[a][1] * dirs[b][1]);
      ctx.font = '11px "Libre Franklin", "Helvetica Neue", Arial, sans-serif'; ctx.fillStyle = mu; ctx.fillText('true strength (outline) and what each feature reads (fill)', bx, 16);
      dirs.forEach(function (d, i) {
        var r = Math.max(0, d[0] * shown[0] + d[1] * shown[1]), y = 26 + i * rowH; err += Math.abs(r - (z[i] || 0)) / n;
        ctx.fillStyle = hue(i); ctx.globalAlpha = 0.85; ctx.fillRect(bx, y, bw * Math.min(1.4, r) / 1.4, rowH * 0.62); ctx.globalAlpha = 1;
        ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.strokeRect(bx, y, Math.max(1, bw * (z[i] || 0) / 1.4), rowH * 0.62);
      });
      out.innerHTML = 'worst overlap <b>' + Math.max(0, maxOverlap).toFixed(2) + '</b>, readout error <b>' + err.toFixed(2) + '</b>';
    });
  };

  // 2. The activation cloud in 3D.
  FIGS.cloud = function (card) {
    var cv = el('canvas'); card.appendChild(cv); legendConcepts(card); var v = new View3D(cv), reveal = false, rays = false;
    var c = controls(card);
    var b1 = button(c, 'reveal the concepts', function () { reveal = !reveal; b1.setAttribute('aria-pressed', reveal); });
    var b2 = button(c, 'show concept directions', function () { rays = !rays; b2.setAttribute('aria-pressed', rays); });
    c.appendChild(el('span', 'ft-readout', 'drag to rotate'));
    register(card, function () {
      v.size(); v.axes(); if (rays) v.rays();
      var mu = css('--muted', '#6a2350');
      v.cloud(function (n) { return reveal ? [COLORS[dominant(n)], 0.75] : [mu, 0.45]; });
    });
  };

  // 3. One forward pass, cell by cell and head to tail.
  FIGS.forward = function (card) {
    var m = main(), row = el('div', 'sp-row'), cv = el('canvas'), side = el('div', 'sp-side');
    cv.style.aspectRatio = '1 / 1'; row.appendChild(cv); row.appendChild(side); card.appendChild(row);
    var v = new View3D(cv), n = 0, t0 = 0, paused = false, last = -1e9;
    var c = controls(card);
    var bp = button(c, 'pause', function () { paused = !paused; bp.textContent = paused ? 'play' : 'pause'; });
    button(c, 'next input', function () { pick((rnd() * N) | 0); });
    c.appendChild(el('span', 'ft-readout', 'or click any point'));
    function pick(k) { n = k; t0 = performance.now(); last = t0; render(); }
    v.onPick = pick;
    function render() {
      var x = X[n], e = m.encode(x), r = m.decode(e.code), mx = Math.max.apply(null, e.pre.map(Math.abs)) || 1, acc = css('--ft-apical', '#9c1c8c'), nav = css('--ft-true', '#26406e');
      var on = e.code.filter(function (a) { return a > 1e-3; }).length;
      side.innerHTML =
        '<div class="sp-vec"><span>true concepts</span>' + chips(n) + '</div>' +
        '<div class="sp-vec"><span>activation x</span>' + cells(x, nav, 1.6, true) + '</div>' +
        '<div class="sp-op">&darr; multiply by the encoder</div>' +
        '<div class="sp-vec"><span>scores</span>' + cells(e.pre, acc, mx, true) + '</div>' +
        '<div class="sp-op">&darr; ReLU zeros the negatives</div>' +
        '<div class="sp-vec"><span>sparse code</span>' + cells(e.code, acc, mx) + '</div>' +
        '<div class="sp-op">&darr; weighted sum of decoder vectors</div>' +
        '<div class="sp-vec"><span>reconstruction</span>' + cells(r, nav, 1.6, true) + '</div>' +
        '<p class="sp-note"><b>' + on + '</b> of ' + H + ' features fire on this input.</p>';
    }
    pick(0);
    register(card, function (ts) {
      if (!paused && ts - last > 3200) { pick((rnd() * N) | 0); }
      v.size(); v.axes(); v.rays();
      var mu = css('--muted', '#6a2350');
      v.cloud(function () { return [mu, 0.18, 1.8]; });
      var x = X[n], cd = m.encode(x).code, p = Math.min(1, (performance.now() - t0) / 1100), cur = [0, 0, 0];
      var act = cd.map(function (a, j) { return [a, j]; }).filter(function (a) { return a[0] > 1e-3; }).sort(function (a, b) { return b[0] - a[0]; });
      var nav = css('--ft-true', '#26406e');
      v.dot(x, 7, nav, 0.9); v.label(add(x, [0, 0, 0.3]), 'x', nav, 13);
      act.forEach(function (a, i) {
        var seg = Math.max(0, Math.min(1, p * act.length - i)); if (!seg) return;
        var nxt = add(cur, scale(m.Wd[a[1]], a[0] * seg)); v.arrow(cur, nxt, fcol(m.info.feats[a[1]]) || mu, 3, 0.95); cur = nxt;
      });
      if (p >= 1) { var acc = css('--ft-apical', '#9c1c8c'); v.dot(cur, 5, acc, 1, '#fff'); v.label(add(cur, [0, 0, -0.3]), 'x̂', acc, 13); }
    });
  };

  // 4. Training live. Decoder arrows swing onto the hidden concept directions.
  FIGS.train = function (card) {
    var cv = el('canvas'); card.appendChild(cv); legendConcepts(card);
    var v = new View3D(cv), m, c = controls(card), out;
    function reset() { m = makeSAE({ mode: 'l1', lam: 0.4 }); m.info = m.analyze(); }
    button(c, 'restart training', reset); out = readout(c); reset();
    register(card, function () {
      if (m.step < TARGET) { for (var i = 0; i < 3; i++) m.train(32); if (m.step % 15 === 0 || m.step >= TARGET) m.info = m.analyze(); }
      v.size(); v.axes(); v.rays();
      v.cloud(function (n) { return [COLORS[dominant(n)], 0.25, 1.8]; });
      v.decoders(m, { trails: true });
      out.innerHTML = 'step <b>' + m.step + '</b>, concepts found <b>' + m.info.covered + ' of 6</b>, features on per input <b>' + m.info.l0.toFixed(1) + '</b>, dead <b>' + m.info.dead + '</b>';
    });
  };

  // 5. The sparsity and reconstruction trade-off, swept live.
  FIGS.tradeoff = function (card) {
    var LAMS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.3, 0.4, 0.6, 0.8, 1.2], KS = [1, 2, 3], pts = [], tops = [], sel = 6, started = false;
    var cv = el('canvas'); cv.style.aspectRatio = '16 / 8'; card.appendChild(cv);
    card.appendChild(el('div', 'ft-legend', '<span class="ft-k"><i style="background:var(--ft-apical)"></i>L1 penalty, one point per λ</span><span class="ft-k"><i style="background:var(--ft-dust)"></i>TopK, one point per k</span><span class="ft-k">darker means more concepts found</span>'));
    var c = controls(card), rg = el('label', 'ft-range', 'λ <input type="range" min="0" max="9" value="6">'); c.appendChild(rg);
    var out = readout(c);
    rg.querySelector('input').addEventListener('input', function () { sel = +this.value; });
    function run() {
      started = true; var i = 0;
      (function next() {
        if (i < LAMS.length) { var m = makeSAE({ mode: 'l1', lam: LAMS[i] }).fit(TARGET), a = m.analyze(); pts.push({ l0: a.l0, fve: a.fve, cov: a.covered, dead: a.dead }); i++; setTimeout(next, 0); }
        else if (i < LAMS.length + KS.length) { var m2 = makeSAE({ mode: 'topk', k: KS[i - LAMS.length] }).fit(TARGET), a2 = m2.analyze(); tops.push({ l0: a2.l0, fve: a2.fve, cov: a2.covered }); i++; setTimeout(next, 0); }
      })();
    }
    register(card, function () {
      if (!started) run();
      var DPR = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, Hh = cv.clientHeight, ctx = cv.getContext('2d');
      cv.width = W * DPR; cv.height = Hh * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var mu = css('--muted', '#6a2350'), acc = css('--ft-apical', '#9c1c8c'), dust = css('--ft-dust', '#1f8aa3'), grid = css('--ft-grid', 'rgba(0,0,0,.08)');
      var L = 52, R = W - 16, T = 14, B = Hh - 36, xmax = 6;
      function px(l0) { return L + (R - L) * Math.min(l0, xmax) / xmax; }
      function py(f) { return B - (B - T) * f; }
      ctx.strokeStyle = grid; ctx.lineWidth = 1; ctx.fillStyle = mu; ctx.font = '11px "Libre Franklin", "Helvetica Neue", Arial, sans-serif';
      for (var q = 0; q <= 4; q++) { var y = py(q / 4); ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(R, y); ctx.stroke(); ctx.fillText((q * 25) + '%', 12, y + 4); }
      for (var x0 = 0; x0 <= xmax; x0++) ctx.fillText(x0, px(x0) - 3, B + 16);
      ctx.fillText('features on per input (L0)', (L + R) / 2 - 70, Hh - 4);
      ctx.save(); ctx.translate(10, (T + B) / 2 + 60); ctx.rotate(-Math.PI / 2); ctx.restore();
      ctx.strokeStyle = acc; ctx.lineWidth = 1.5; ctx.beginPath();
      pts.forEach(function (p, i) { var X0 = px(p.l0), Y0 = py(p.fve); if (i) ctx.lineTo(X0, Y0); else ctx.moveTo(X0, Y0); }); ctx.stroke();
      pts.forEach(function (p, i) {
        ctx.globalAlpha = 0.25 + 0.75 * p.cov / 6; ctx.fillStyle = acc; ctx.beginPath(); ctx.arc(px(p.l0), py(p.fve), i === sel ? 8 : 5, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1;
        if (i === sel) { ctx.strokeStyle = css('--ink', '#17090f'); ctx.lineWidth = 2; ctx.stroke(); }
      });
      tops.forEach(function (p) { ctx.globalAlpha = 0.25 + 0.75 * p.cov / 6; ctx.fillStyle = dust; ctx.fillRect(px(p.l0) - 5, py(p.fve) - 5, 10, 10); ctx.globalAlpha = 1; });
      if (pts.length < LAMS.length) { ctx.fillStyle = mu; ctx.fillText('training ' + (pts.length + 1) + ' of ' + LAMS.length + ' autoencoders', L + 10, T + 14); }
      var s = pts[sel];
      out.innerHTML = s ? 'λ <b>' + LAMS[sel] + '</b> keeps <b>' + s.l0.toFixed(1) + '</b> features on, explains <b>' + Math.round(100 * s.fve) + '%</b> of the variance, and finds <b>' + s.cov + ' of 6</b> concepts' : 'λ <b>' + LAMS[sel] + '</b>, still training';
    });
  };

  // 6. Name a feature from its top-activating inputs.
  FIGS.labels = function (card) {
    var m = main(), alive = m.info.feats.filter(function (f) { return f.cls !== 'dead'; }), cur = alive[0];
    var bar = el('div', 'ft-controls'); card.appendChild(bar); bar.appendChild(el('span', 'ft-readout', 'feature'));
    var box = el('div', 'sp-labels'); card.appendChild(box);
    alive.forEach(function (f) { var b = button(bar, String(f.j), function () { cur = f; show(); }); b.dataset.j = f.j; });
    function show() {
      bar.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', +b.dataset.j === cur.j); });
      var mx = cur.top.length ? cur.top[0][0] : 1;
      var html = '<p class="sp-note">The 8 inputs that fire feature ' + cur.j + ' hardest. Each row shows the concepts an input holds, and the bar shows how hard the feature fires. Which concept does it detect?</p>';
      cur.top.forEach(function (a) { html += '<div class="sp-top">' + chips(a[1]) + '<span class="sp-bar"><i style="width:' + (100 * a[0] / mx).toFixed(0) + '%"></i></span></div>'; });
      html += '<div class="ft-controls sp-guess">' + NAMES.map(function (nm, k) { return '<button class="ft-btn" type="button" data-k="' + k + '" style="border-color:' + COLORS[k] + ';color:' + COLORS[k] + '">' + nm + '</button>'; }).join('') + '<span class="ft-readout sp-verdict"></span></div>';
      box.innerHTML = html;
      box.querySelectorAll('.sp-guess button').forEach(function (b) {
        b.addEventListener('click', function () {
          var k = +b.dataset.k, v = box.querySelector('.sp-verdict');
          if (cur.cls !== 'mono') v.innerHTML = 'Trick question. This feature points between concepts, so no single label fits it.';
          else if (k === cur.best) v.innerHTML = '<b>Right.</b> Its decoder vector points at concept ' + NAMES[k] + '.';
          else v.innerHTML = 'Not quite. Its decoder vector points at concept <b>' + NAMES[cur.best] + '</b>.';
        });
      });
    }
    show();
  };

  // 7. Steering. Add a scaled decoder vector and watch the code respond.
  FIGS.steer = function (card) {
    var m = main(), row = el('div', 'sp-row'), cv = el('canvas'), side = el('div', 'sp-side');
    cv.style.aspectRatio = '1 / 1'; row.appendChild(cv); row.appendChild(side); card.appendChild(row);
    var v = new View3D(cv), alive = m.info.feats.filter(function (f) { return f.cls === 'mono'; });
    if (!alive.length) alive = m.info.feats.filter(function (f) { return f.cls !== 'dead'; });
    var st = { n: 3, f: alive[0], alpha: 0, auto: true };
    var c = controls(card); c.appendChild(el('span', 'ft-readout', 'feature'));
    alive.forEach(function (f) { var b = button(c, f.j + (f.cls === 'mono' ? ' (' + NAMES[f.best] + ')' : ''), function () { st.f = f; sync(); }); b.dataset.j = f.j; });
    var c2 = controls(card), rg = el('label', 'ft-range', 'scale α <input type="range" min="-10" max="25" value="0"> <b class="ft-readout">0.0</b>'); c2.appendChild(rg);
    var ba = button(c2, 'animate', function () { st.auto = !st.auto; sync(); });
    rg.querySelector('input').addEventListener('input', function () { st.auto = false; st.alpha = +this.value / 10; sync(); });
    v.onPick = function (n) { st.n = n; };
    function sync() { c.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', +b.dataset.j === st.f.j); }); ba.setAttribute('aria-pressed', st.auto); }
    sync();
    register(card, function (ts) {
      if (st.auto) { st.alpha = 1.3 + 1.3 * Math.sin(ts / 1000); rg.querySelector('input').value = Math.round(st.alpha * 10); }
      rg.querySelector('b').textContent = st.alpha.toFixed(1);
      var x0 = X[st.n], x1 = add(x0, scale(m.Wd[st.f.j], st.alpha)), c0 = m.encode(x0).code, c1 = m.encode(x1).code, col = fcol(st.f) || css('--ft-apical', '#9c1c8c');
      var mx = Math.max.apply(null, c0.concat(c1)) || 1, acc = css('--ft-apical', '#9c1c8c'), nav = css('--ft-true', '#26406e'), mu = css('--muted', '#6a2350');
      v.size(); v.axes(); v.rays();
      v.cloud(function () { return [mu, 0.15, 1.8]; });
      v.decoders(m, { hot: st.f.j, dim: 0.15 });
      v.dot(x0, 6, nav, 0.9); v.label(add(x0, [0, 0, 0.28]), 'x', nav, 12);
      v.arrow(x0, x1, col, 3.5, 0.95); v.dot(x1, 7, col, 1, '#fff');
      side.innerHTML = '<div class="sp-vec"><span>code before</span>' + cells(c0, acc, mx) + '</div><div class="sp-vec"><span>code after</span>' + cells(c1, acc, mx) + '</div>' +
        '<p class="sp-note">Feature ' + st.f.j + ' fires at <b>' + c0[st.f.j].toFixed(2) + '</b> before and <b>' + c1[st.f.j].toFixed(2) + '</b> after. ' + (st.alpha > 0.3 && c1[st.f.j] < 0.05 ? 'The push is not big enough yet. This input holds a concept the feature\'s encoder works to ignore. ' : '') + 'Click any point to steer a different input.</p>';
    });
  };

  // ---- mount -----------------------------------------------------------------------
  function mount() {
    document.querySelectorAll('[data-sae]').forEach(function (node) { var f = FIGS[node.getAttribute('data-sae')]; if (f) f(node); });
    // paper filter
    var bar = document.querySelector('.sp-filter');
    if (bar) bar.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = b.dataset.t;
        bar.querySelectorAll('button').forEach(function (o) { o.setAttribute('aria-pressed', o === b); });
        document.querySelectorAll('.sp-paper').forEach(function (p) { p.style.display = (t === 'all' || p.dataset.t === t) ? '' : 'none'; });
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
