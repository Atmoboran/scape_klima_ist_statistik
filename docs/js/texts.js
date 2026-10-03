// Fills the page's text placeholders from window.TEXTS (content/texts.de.js):
// data-t → textContent, data-t-html → innerHTML, data-t-aria → aria-label.
(function () {
  "use strict";

  function lookup(path) {
    const value = path.split(".").reduce((obj, key) => (obj == null ? undefined : obj[key]), window.TEXTS);
    if (value === undefined) console.warn(`content/texts: missing entry "${path}"`);
    return value === undefined ? "" : value;
  }

  document.documentElement.lang = window.TEXTS.lang;
  for (const node of document.querySelectorAll("[data-t]")) node.textContent = lookup(node.dataset.t);
  for (const node of document.querySelectorAll("[data-t-html]")) node.innerHTML = lookup(node.dataset.tHtml);
  for (const node of document.querySelectorAll("[data-t-aria]")) node.setAttribute("aria-label", lookup(node.dataset.tAria));
})();
