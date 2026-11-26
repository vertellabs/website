/* Vertel Labs — under construction page: intro, Colombo clock and the light/dark coin.
   Contact opens into WhatsApp (chat.vertellabs.com) and Email (a plain mailto link, no form). */
(function () {
  'use strict';

  /* intro: once the page has loaded, wait until the coin is full, then fade the intro away */
  var intro = document.getElementById('intro');
  if (intro) {
    var introCoin = intro.querySelector('.cl-coin');
    var LOOP = 3600, FULL = 1660, LAST = 2300;   // match cl-trace in site.css: full coin from 46% to 64%
    var hideIntro = function () {
      var a = introCoin.getAnimations ? introCoin.getAnimations()[0] : null;
      if (a) a.pause();                          // keep the coin full while it fades
      intro.classList.add('is-done');
      document.documentElement.classList.remove('intro-on');   // dots spread out from the coin
      setTimeout(function () { intro.remove(); }, 700);
    };
    var whenFull = function () {
      var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var a = introCoin.getAnimations ? introCoin.getAnimations()[0] : null;
      if (calm || !a || a.currentTime == null) { hideIntro(); return; }
      var t = a.currentTime % LOOP;
      var wait = (t >= FULL && t <= LAST) ? 0 : (FULL - t + LOOP) % LOOP;
      setTimeout(hideIntro, wait + 100);
    };
    if (document.readyState === 'complete') whenFull();
    else window.addEventListener('load', whenFull);
  }

  /* contact: the pill opens into WhatsApp + Email (the liquid motion is all in site.css) */
  var ct = document.getElementById('contact');
  var ctBtn = document.getElementById('contact-toggle');
  if (ct && ctBtn) {
    var setOpen = function (open) {
      if (ct.classList.contains('is-open') && !open) ct.classList.add('was-open');   // runs the "sucked back in" drops
      ct.classList.toggle('is-open', open);
      ctBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      ctBtn.setAttribute('aria-label', open ? 'Close contact options' : 'Contact us');
    };
    setOpen(false);
    ctBtn.addEventListener('click', function () { setOpen(!ct.classList.contains('is-open')); });
    // close on Escape, or a tap/click anywhere else on the page
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && ct.classList.contains('is-open')) { setOpen(false); ctBtn.focus(); }
    });
    document.addEventListener('pointerdown', function (e) {
      if (ct.classList.contains('is-open') && !e.target.closest('.ct-toggle, .ct-opt')) setOpen(false);
    });
    drawLiquid(ct);
  }

  /* The liquid, drawn by the graphics chip (WebGL).
     The white shapes in .ct-goo still do all the moving (site.css), but they are invisible here:
     each frame this reads where they are and paints the liquid itself. For every pixel it does
     the same sum the old SVG filter did — how much "blurred shape" reaches this point (blur 9px),
     cut back to a hard edge so close shapes melt into one — plus a 1px rim and a soft shadow.
     The browser's own SVG filter did that work on the main processor: phones redrew it slowly
     (stutter) and sometimes didn't clean up after it (leftover strips). Here the whole canvas is
     painted fresh every frame, at full sharpness, and only while something is moving.
     Without WebGL the SVG filter stays in charge. */
  function drawLiquid(ct) {
    var goo = ct.querySelector('.ct-goo');
    if (!goo) return;
    var cv = document.createElement('canvas');
    var gl;
    try { gl = cv.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true }); } catch (e) { gl = null; }
    if (!gl) return;

    var MAX = 24;          // shapes plus the overlaps between them
    var VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
    var FS = [
      'precision highp float;',
      'uniform vec2 uSize;',            // canvas size in CSS px
      'uniform float uScale;',          // device px per CSS px
      'uniform vec4 uBox[' + MAX + '];', // centre x, centre y, half width, half height (CSS px, y down)
      'uniform vec2 uRad[' + MAX + '];', // corner radius, weight (+ a shape, − an overlap; small drops weigh less)
      'uniform int uN;',
      'uniform vec3 uFill; uniform vec3 uRim; uniform vec3 uShadow;',
      'float sdBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }',
      // Blurred amount of shape at a point: the normal curve of its distance (blur = 9px).
      // The blur of several shapes is the sum of their blurs minus the blur of where they
      // overlap, so an overlap counts once — necks form between shapes, nothing bulges.
      'float field(vec2 p){ float f = 0.0;',
      '  for (int i = 0; i < ' + MAX + '; i++){ if (i >= uN) break;',
      '    vec4 b = uBox[i]; float d = sdBox(p - b.xy, b.zw, uRad[i].x);',
      '    f += uRad[i].y / (1.0 + exp(1.7017 * d / 9.0)); }',
      '  return clamp(f, 0.0, 1.0); }',
      'void main(){',
      '  vec2 p = vec2(gl_FragCoord.x, uSize.y * uScale - gl_FragCoord.y) / uScale;',
      '  float F = field(p);',
      '  float af = clamp(24.0 * F - 11.0, 0.0, 1.0);',               // the liquid (same cut as the SVG filter)
      '  float ar = clamp(24.0 * (F + 0.0443) - 11.0, 0.0, 1.0);',    // 1px wider: the rim
      '  float as = min(field(p - vec2(0.0, 7.0)), 1.0) * 0.1;',      // shadow, 7px lower
      '  float r1 = ar * (1.0 - af); float s1 = as * (1.0 - af) * (1.0 - ar);',
      '  gl_FragColor = vec4(uFill * af + uRim * r1 + uShadow * s1, af + r1 + s1);',
      '}'
    ].join('\n');

    function shader(type, src) {
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src); gl.compileShader(sh);
      return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
    }
    var vs = shader(gl.VERTEX_SHADER, VS), fs = shader(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);  // one big triangle
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {};
    ['uSize', 'uScale', 'uBox', 'uRad', 'uN', 'uFill', 'uRim', 'uShadow'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

    cv.className = 'ct-canvas';
    cv.setAttribute('aria-hidden', 'true');
    goo.parentNode.insertBefore(cv, goo.nextSibling);
    ct.classList.add('has-canvas');

    var shapes = goo.querySelectorAll('.ct-shape');
    var boxes = new Float32Array(MAX * 4), rads = new Float32Array(MAX * 2);
    var probe = document.createElement('canvas').getContext('2d');
    var raf = 0, dead = false;

    function rgb(v) {      // any CSS colour → [r, g, b] from 0 to 1
      probe.fillStyle = '#000';
      probe.fillStyle = (v || '').trim() || '#000';
      var c = probe.fillStyle, m;
      if (c.charAt(0) === '#') return [parseInt(c.substr(1, 2), 16) / 255, parseInt(c.substr(3, 2), 16) / 255, parseInt(c.substr(5, 2), 16) / 255];
      m = c.match(/[\d.]+/g);
      return [m[0] / 255, m[1] / 255, m[2] / 255];
    }

    // distance from a point to a rounded box (negative inside)
    function sd(px, py, b) {
      var qx = Math.abs(px - b.x) - b.w + b.r, qy = Math.abs(py - b.y) - b.h + b.r;
      var ox = Math.max(qx, 0), oy = Math.max(qy, 0);
      return Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(qx, qy), 0) - b.r;
    }
    // is rounded box a wholly inside rounded box b? (checks points round a's outline)
    function inside(a, b) {
      var k = a.r * 0.2929;   // a corner's 45° point, measured from the box corner
      var pts = [[a.x - a.w, a.y], [a.x + a.w, a.y], [a.x, a.y - a.h], [a.x, a.y + a.h],
                 [a.x - a.w + k, a.y - a.h + k], [a.x + a.w - k, a.y - a.h + k],
                 [a.x - a.w + k, a.y + a.h - k], [a.x + a.w - k, a.y + a.h - k]];
      for (var i = 0; i < pts.length; i++) if (sd(pts[i][0], pts[i][1], b) > 0.01) return false;
      return true;
    }
    // the overlap of two rounded boxes, as a rounded box (or null if they don't touch)
    function overlap(a, b) {
      var l = Math.max(a.x - a.w, b.x - b.w), r = Math.min(a.x + a.w, b.x + b.w);
      var t = Math.max(a.y - a.h, b.y - b.h), btm = Math.min(a.y + a.h, b.y + b.h);
      if (r - l < 0.5 || btm - t < 0.5) return null;
      var w = (r - l) / 2, h = (btm - t) / 2;
      var o = { x: l + w, y: t + h, w: w, h: h, r: Math.min(Math.max(a.r, b.r), w, h) };
      // the boxes may only touch at rounded corners: check the overlap really is inside both
      return sd(o.x, o.y, a) < 0 && sd(o.x, o.y, b) < 0 ? o : null;
    }

    function draw() {
      if (dead) return;
      var g = goo.getBoundingClientRect(), box = ct.getBoundingClientRect();
      var s = Math.min(window.devicePixelRatio || 1, 3);
      var W = Math.max(1, Math.round(g.width * s)), H = Math.max(1, Math.round(g.height * s));
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      cv.style.left = (g.left - box.left) + 'px';
      cv.style.top = (g.top - box.top) + 'px';
      cv.style.width = g.width + 'px';
      cv.style.height = g.height + 'px';

      // the shapes, as rounded boxes (centre, half size, corner radius)
      var list = [];
      for (var i = 0; i < shapes.length; i++) {
        var r = shapes[i].getBoundingClientRect();
        if (r.width < 0.5 || r.height < 0.5) continue;
        var cr = getComputedStyle(shapes[i]).borderTopLeftRadius;
        var rad = cr.indexOf('%') > 0 ? r.width * parseFloat(cr) / 100 : parseFloat(cr) || 0;
        list.push({ x: r.left - g.left + r.width / 2, y: r.top - g.top + r.height / 2,
                    w: r.width / 2, h: r.height / 2, r: Math.min(rad, r.width / 2, r.height / 2) });
      }
      // a shape lying wholly inside another adds nothing to the liquid
      list = list.filter(function (a, ia) {
        return !list.some(function (b, ib) { return ib !== ia && inside(a, b) && (b.w * b.h > a.w * a.h || ib < ia); });
      });
      var n = 0;
      function put(b, sign) {
        if (n >= MAX) return;
        var m = Math.min(b.w, b.h);
        boxes[n * 4] = b.x; boxes[n * 4 + 1] = b.y; boxes[n * 4 + 2] = b.w; boxes[n * 4 + 3] = b.h;
        rads[n * 2] = Math.min(b.r, m);
        rads[n * 2 + 1] = sign * (1 - Math.exp(-m * m / 162));   // a 9px blur leaves small drops fainter: they melt away
        n++;
      }
      list.forEach(function (b) { put(b, 1); });
      // where two shapes overlap, take the overlap away once so it isn't counted twice
      for (var a = 0; a < list.length; a++) for (var b = a + 1; b < list.length; b++) {
        var o = overlap(list[a], list[b]);
        if (o) put(o, -1);
      }
      var css = getComputedStyle(ct);
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U.uSize, g.width, g.height);
      gl.uniform1f(U.uScale, s);
      gl.uniform4fv(U.uBox, boxes);
      gl.uniform2fv(U.uRad, rads);
      gl.uniform1i(U.uN, n);
      gl.uniform3fv(U.uFill, rgb(css.getPropertyValue('--vl-surface')));
      gl.uniform3fv(U.uRim, rgb(css.getPropertyValue('--vl-border')));
      gl.uniform3fv(U.uShadow, rgb(css.getPropertyValue('--vl-ink')));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function moving() {
      var a = goo.getAnimations ? goo.getAnimations({ subtree: true }) : [];
      for (var i = 0; i < a.length; i++) if (a[i].playState === 'running') return true;
      return false;
    }
    function frame() {
      raf = 0;
      draw();
      if (moving()) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }

    // if the graphics chip drops the canvas, hand back to the SVG filter
    cv.addEventListener('webglcontextlost', function (e) {
      e.preventDefault(); dead = true; ct.classList.remove('has-canvas'); cv.remove();
    });

    // redraw whenever a shape starts moving, the panel opens/closes, the size or theme changes
    goo.addEventListener('transitionrun', kick);
    goo.addEventListener('animationstart', kick);
    new MutationObserver(kick).observe(ct, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', kick);
    }
    window.addEventListener('resize', kick);
    window.addEventListener('load', kick);
    draw();
  }

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* local time in Colombo, shown in the header */
  var clock = document.getElementById('clock');
  if (clock && window.Intl) {
    try {
      var fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit', hour12: false });
      var tick = function () { clock.textContent = fmt.format(new Date()); };
      // change exactly when the minute turns
      var next = function () { tick(); setTimeout(next, 60000 - Date.now() % 60000 + 50); };
      next();
    } catch (e) { /* keep "GMT+5:30" */ }
  }

  /* light / dark coin switch */
  var root = document.documentElement;
  var coin = document.getElementById('theme-coin');
  var deviceDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var metaTheme = document.querySelectorAll('meta[name="theme-color"]');

  function currentTheme() {
    var t = root.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return deviceDark && deviceDark.matches ? 'dark' : 'light';
  }
  function syncCoin() {
    var dark = currentTheme() === 'dark';
    if (coin) {
      coin.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      coin.setAttribute('aria-pressed', dark ? 'true' : 'false');
    }
    // browser bar colour follows the page (tokens: ground-dark / ground-light)
    metaTheme.forEach(function (m) { m.setAttribute('content', dark ? '#141213' : '#F7F6F3'); });
  }
  function applyTheme(next) {
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('vl-theme', next); } catch (e) { /* private mode: still switches */ }
    syncCoin();
  }

  if (coin) {
    syncCoin();
    var face = coin.querySelector('.coin');
    var tossing = false;

    var TURN = 850;      // one full turn of the coin (ms)
    var TURN_AT = .45;   // the moment the Vertel side faces us (180°; see the keyframes below)

    // The new theme pours out of the coin like liquid: a blob whose edge wobbles in three waves
    // and calms to a clean circle as it reaches the corners. The frames are written as CSS
    // @keyframes (vt-liquid, started by site.css), so the blob is in place from the first frame.
    var liquidStyle = document.createElement('style');
    document.head.appendChild(liquidStyle);
    function liquidFrames(x, y, R) {
      var N = 72, STEPS = 30, css = '@keyframes vt-liquid{';
      for (var s = 0; s <= STEPS; s++) {
        var t = s / STEPS;
        var r = R * (1 - Math.pow(1 - t, 3));          // pours out fast, slows near the edges
        var wob = .17 * Math.pow(1 - t, 1.3);         // wobbly at first, perfectly round at the end
        var pts = [];
        for (var i = 0; i < N; i++) {
          var a = i / N * Math.PI * 2;
          var k = 1 + wob * (.55 * Math.sin(3 * a + t * 9) + .3 * Math.sin(5 * a - t * 13 + 1) + .15 * Math.sin(8 * a + t * 17 + 2));
          pts.push((x + Math.cos(a) * r * k).toFixed(1) + 'px ' + (y + Math.sin(a) * r * k).toFixed(1) + 'px');
        }
        css += (t * 100).toFixed(2) + '%{clip-path:polygon(' + pts.join(',') + ')}';
      }
      return css + '}';
    }

    function revealTheme(next) {
      var update = function () { applyTheme(next); };
      if (!document.startViewTransition) { update(); return; }
      var r = coin.getBoundingClientRect();
      var x = r.left + r.width / 2, y = r.top + r.height / 2;
      var radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      liquidStyle.textContent = liquidFrames(x, y, Math.ceil(radius * 1.03));
      root.classList.add('vt-coin');
      var vt = document.startViewTransition(update);
      vt.finished.catch(function () {}).then(function () { root.classList.remove('vt-coin'); });
    }

    coin.addEventListener('click', function () {
      if (tossing) return;
      var from = currentTheme();
      var next = from === 'dark' ? 'light' : 'dark';
      var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (still || !face.animate) { applyTheme(next); return; }

      // The flip: the coin turns over in place — the Vertel side passes by halfway — and comes
      // round onto the new mode's side, going a touch past it and settling back. No lift, no shine.
      tossing = true;
      applyIconOnly(from);                       // keep the current icon on the front until it is hidden
      var flip = face.animate([
        { offset: 0,   transform: 'rotateY(0deg)',   easing: 'cubic-bezier(.55, 0, 1, 1)' },   // gathers speed
        { offset: .45, transform: 'rotateY(180deg)', easing: 'cubic-bezier(.3, .5, .3, 1)' },  // Vertel side: same speed on, then slows
        { offset: .86, transform: 'rotateY(368deg)', easing: 'cubic-bezier(.4, 0, .4, 1)' },   // a touch past
        { offset: 1,   transform: 'rotateY(360deg)' }                                          // settles
      ], { duration: TURN });

      // Vertel side up: the front is out of sight, so it changes to the new icon now,
      // and the new theme pours out of the coin
      setTimeout(function () { applyIconOnly(next); revealTheme(next); }, TURN * TURN_AT);
      var done = function () { clearIconOnly(); tossing = false; };
      flip.finished.then(done, done);
    });

    // show the next theme's icon on the coin before the page itself changes
    function applyIconOnly(next) {
      coin.querySelector('.icon-sun').style.display = next === 'light' ? 'block' : 'none';
      coin.querySelector('.icon-moon').style.display = next === 'dark' ? 'block' : 'none';
    }
    function clearIconOnly() {
      coin.querySelector('.icon-sun').style.display = '';
      coin.querySelector('.icon-moon').style.display = '';
    }
    // if the visitor hasn't chosen, follow the device when it changes
    if (deviceDark && deviceDark.addEventListener) deviceDark.addEventListener('change', syncCoin);
  }
})();
