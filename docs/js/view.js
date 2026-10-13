// Chooses the phone or desktop layout before the page paints (style guide 5.2).
// Load it in <head> with the app's name:  <script src="js/view.js" data-app="galton"></script>
// The width decides automatically; the header toggle (.view-toggle) overrides
// it, and the choice is remembered for this app only.
(() => {
  const app = (document.currentScript && document.currentScript.dataset.app) || location.pathname;
  const KEY = 'scapeViewMode:' + app;
  const QUERY = '(max-width: 999px)';
  const mql = window.matchMedia(QUERY);
  const read = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const auto = () => (mql.matches ? 'mobile' : 'desktop');
  const stored = read();
  let mode = stored === 'mobile' || stored === 'desktop' ? stored : auto();
  document.documentElement.dataset.view = mode;

  // "Desktop-Ansicht" on a phone shows the real desktop page, zoomed out like
  // any desktop website, instead of squeezing two columns into 400 px.
  const DESKTOP_WIDTH = 1100;
  let viewportDefault = null;
  const fitViewport = () => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    if (viewportDefault === null) viewportDefault = meta.getAttribute('content');
    const narrow = screen.width < 1000;   // a phone or small tablet, not a narrow desktop window
    const scale = (screen.width / DESKTOP_WIDTH).toFixed(3);
    meta.setAttribute('content', mode === 'desktop' && narrow
      ? 'width=' + DESKTOP_WIDTH + ', initial-scale=' + scale + ', minimum-scale=' + scale
      : viewportDefault);
  };
  fitViewport();

  const label = btn => {
    const k = (window.TEXTS && window.TEXTS.kit) || {};
    const toDesktop = mode === 'mobile';
    btn.textContent = toDesktop ? (k.viewToDesktop || 'Desktop-Ansicht') : (k.viewToMobile || 'Handy-Ansicht');
    btn.setAttribute('aria-label', toDesktop ? (k.viewToDesktopAria || btn.textContent) : (k.viewToMobileAria || btn.textContent));
  };
  const set = (m, remember) => {
    mode = m;
    document.documentElement.dataset.view = m;
    fitViewport();
    if (remember) { try { localStorage.setItem(KEY, m); } catch (e) { /* private mode */ } }
    document.querySelectorAll('.view-toggle').forEach(label);
    window.dispatchEvent(new CustomEvent('scape:viewchange', { detail: m }));
    window.dispatchEvent(new Event('resize'));
  };

  window.SCAPE = window.SCAPE || {};
  window.SCAPE.view = { get: () => mode, set, key: KEY };

  mql.addEventListener('change', () => { if (!read()) set(auto(), false); });
  document.addEventListener('DOMContentLoaded', () => {
    fitViewport();
    document.querySelectorAll('.view-toggle').forEach(btn => {
      label(btn);
      btn.addEventListener('click', () => set(mode === 'mobile' ? 'desktop' : 'mobile', true));
    });
  });
})();
