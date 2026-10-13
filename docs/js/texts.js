// Every visible text comes from content/texts.de.js (window.TEXTS).
//   t('path.to.key', …args)  returns the text; entries written as functions
//                             build a sentence around runtime values.
// Placeholders in the HTML are filled on load:
//   data-t="key"        → textContent      data-t-html="key"  → innerHTML
//   data-t-aria="key"   → aria-label       data-t-title="key" → title
// A missing key prints a warning in the console.
(() => {
  const lookup = path => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), window.TEXTS);
  window.t = (path, ...args) => {
    const v = lookup(path);
    if (v === undefined) { console.warn('content/texts: missing "' + path + '"'); return ''; }
    return typeof v === 'function' ? v(...args) : v;
  };
  const fill = (root = document) => {
    root.querySelectorAll('[data-t]').forEach(el => { el.textContent = window.t(el.dataset.t); });
    root.querySelectorAll('[data-t-html]').forEach(el => { el.innerHTML = window.t(el.dataset.tHtml); });
    root.querySelectorAll('[data-t-aria]').forEach(el => { el.setAttribute('aria-label', window.t(el.dataset.tAria)); });
    root.querySelectorAll('[data-t-title]').forEach(el => { el.title = window.t(el.dataset.tTitle); });
  };
  if (window.TEXTS && window.TEXTS.lang) document.documentElement.lang = window.TEXTS.lang;
  if (window.TEXTS && window.TEXTS.pageTitle) document.title = window.TEXTS.pageTitle;
  const meta = document.querySelector('meta[name="description"]');
  if (meta && window.TEXTS && window.TEXTS.description) meta.content = window.TEXTS.description;
  fill();
  window.SCAPE = window.SCAPE || {};
  window.SCAPE.fillTexts = fill;
})();
