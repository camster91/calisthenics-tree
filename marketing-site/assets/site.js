/* Calisthenics Tree marketing site: the only script.
 *
 * APP_URL is the ONE place the app's base URL is configured. Every link to
 * the app carries data-app-path="/some/path"; this script rewrites its href
 * to APP_URL + path. The hrefs written in the HTML are no-JS fallbacks that
 * point at the default; see README.md to update them in one command.
 */
(function () {
  'use strict';

  var APP_URL = 'https://workout.ashbi.ca';

  document.documentElement.classList.add('js');

  var base = APP_URL.replace(/\/+$/, '');
  var links = document.querySelectorAll('[data-app-path]');
  for (var i = 0; i < links.length; i++) {
    links[i].setAttribute('href', base + links[i].getAttribute('data-app-path'));
  }

  var toggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      nav.classList.toggle('is-open', open);
    };
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
  }
})();
