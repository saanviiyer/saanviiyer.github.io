// Subtle neural-network background: drifting neurons that occasionally fire,
// with a rare RGB-split glitch. Clean and low-contrast so text stays readable.
(function () {
  var canvas = document.getElementById('neural-bg');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var ACCENT = '70,111,131';       // Muted blue from the editorial palette
  var LINK_DIST = 175;             // connection radius (css px)
  var W, H, DPR;
  var nodes = [];

  function size() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.width = window.innerWidth * DPR;
    H = canvas.height = window.innerHeight * DPR;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    seed();
  }

  function seed() {
    var count = Math.max(28, Math.min(85, Math.round((window.innerWidth * window.innerHeight) / 21000)));
    nodes = [];
    for (var i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.06 * DPR,
        vy: (Math.random() - 0.5) * 0.06 * DPR,
        r: (Math.random() * 1.4 + 1) * DPR,
        fire: 0,
        next: Math.random() * 480
      });
    }
  }

  function frame(animate) {
    var md = LINK_DIST * DPR;
    ctx.clearRect(0, 0, W, H);

    var i, n;
    if (animate) {
      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        if (n.fire > 0.001) n.fire *= 0.94; else n.fire = 0;
        if (--n.next <= 0) { n.fire = 1; n.next = 220 + Math.random() * 520; }
      }
    }

    // edges
    for (i = 0; i < nodes.length; i++) {
      var a = nodes[i];
      for (var j = i + 1; j < nodes.length; j++) {
        var b = nodes[j];
        var dx = a.x - b.x, dy = a.y - b.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < md) {
          var base = 1 - d / md;
          var fire = a.fire > b.fire ? a.fire : b.fire;
          var alpha = base * (0.08 + 0.32 * fire);
          ctx.strokeStyle = 'rgba(' + ACCENT + ',' + alpha.toFixed(3) + ')';
          ctx.lineWidth = (0.55 + fire * 0.9) * DPR;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // nodes
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      ctx.fillStyle = 'rgba(' + ACCENT + ',' + (0.16 + 0.6 * n.fire).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * (1 + n.fire * 0.9), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop() { frame(true); raf = requestAnimationFrame(loop); }
  var raf;

  function glitchOnce() {
    var d = 14000 + Math.random() * 13000;
    setTimeout(function () {
      canvas.classList.add('glitch');
      setTimeout(function () { canvas.classList.remove('glitch'); }, 360);
      glitchOnce();
    }, d);
  }

  window.addEventListener('resize', size);
  size();

  if (reduce) {
    frame(false); // single static render
  } else {
    loop();
    glitchOnce();
  }
})();
