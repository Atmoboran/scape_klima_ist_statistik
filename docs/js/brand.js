// Fills the brand slots of the page from THEME.brand (theme/theme.js):
//   [data-brand="logo"]  wordmark markup
//   [data-brand="name"]  the institution's name inside running text
//   [data-brand="line"]  the footer line ("SCAPE° – Wetter. Klima. Mensch.")
// and sets the page title suffix, favicon and browser colour.
(() => {
  const B = (window.THEME && window.THEME.brand) || {};
  const each = (sel, fn) => document.querySelectorAll(sel).forEach(fn);
  each('[data-brand="logo"]', el => {
    el.innerHTML = B.logoHtml || B.name || '';
    if (B.logoLabel && !el.hasAttribute('aria-label')) el.setAttribute('aria-label', B.logoLabel);
  });
  each('[data-brand="name"]', el => { el.textContent = B.name || ''; });
  each('[data-brand="line"]', el => { el.textContent = B.line || ''; el.hidden = !B.line; });
  if (B.titleSuffix && !document.title.includes(B.titleSuffix)) document.title += B.titleSuffix;
  if (B.themeColor) {
    let m = document.querySelector('meta[name="theme-color"]');
    if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
    m.content = B.themeColor;
  }
  if (B.favicon) {
    const l = document.createElement('link');
    l.rel = 'icon';
    l.href = 'data:image/svg+xml,' + encodeURIComponent(B.favicon);
    document.head.appendChild(l);
  }
})();
