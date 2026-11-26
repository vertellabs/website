/* Vertel Labs — under construction page: intro, Colombo clock and the light/dark coin.
   The email pill is a plain mailto link (no form). */
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

    var SPEED = 600;   // flip and page change run together, both done in 0.6s

    // the new theme spreads out in a circle from the coin
    function revealTheme(next) {
      var update = function () { applyTheme(next); };
      if (!document.startViewTransition) { update(); return; }
      var r = coin.getBoundingClientRect();
      var x = r.left + r.width / 2, y = r.top + r.height / 2;
      var radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      // the wave itself is a CSS animation (vt-wave in site.css), so it is in place from the first frame
      root.style.setProperty('--vt-x', x + 'px');
      root.style.setProperty('--vt-y', y + 'px');
      root.style.setProperty('--vt-r', Math.ceil(radius) + 'px');
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

      // One flip: the coin turns over once (the Vertel mark on the back passes by) and comes
      // round to the new icon. The page starts changing at the same moment, so there's no wait.
      tossing = true;
      applyIconOnly(from);                       // keep the current icon on the front until halfway
      var flip = face.animate(
        [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(360deg)' }],
        { duration: SPEED, easing: 'cubic-bezier(.65, 0, .35, 1)' }   // symmetric: exactly 180° halfway
      );
      // halfway the back (Vertel mark) faces us, so the front can quietly change to the new icon
      setTimeout(function () { applyIconOnly(next); }, SPEED / 2);
      revealTheme(next);                         // pictures for both themes load with the page
      flip.finished.then(function () { clearIconOnly(); tossing = false; })
        .catch(function () { clearIconOnly(); tossing = false; });
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
