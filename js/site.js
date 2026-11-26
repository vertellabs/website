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
