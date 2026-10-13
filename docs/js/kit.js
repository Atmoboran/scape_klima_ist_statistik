// SCAPE° app kit – behaviour shared by every app (style guide 6 and 7):
//   * fullscreen button on every .stage-frame
//   * info buttons ("i") that open an inline note
//   * the pulsing first-hint badge on a simulation: SCAPE.badge(frame)
//   * tasks that unlock the Merke box: SCAPE.tasks(root)
//   * kiosk mode (?kiosk): back to the start after 3 minutes without touch
//   * staff panel (?dev, Shift+D or the faint footer link): SCAPE.dev
//   * minimum on-screen size for canvas text: SCAPE.minFont(ctx)
// Load after content/texts.de.js and js/texts.js, before the app's scripts.
(() => {
  const S = (window.SCAPE = window.SCAPE || {});
  const kt = key => ((window.TEXTS && window.TEXTS.kit) || {})[key] || '';
  const params = new URLSearchParams(location.search);
  const root = document.documentElement;

  // ---- header height (the desktop stage sizes itself below it) ----------
  const measureHead = () => {
    const top = document.querySelector('.top');
    if (top) root.style.setProperty('--head-h', (root.dataset.view === 'desktop' ? top.offsetHeight : 0) + 'px');
  };
  measureHead();
  window.addEventListener('resize', measureHead);

  // ---- fullscreen ---------------------------------------------------------
  const ICON = '<svg class="enter" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>' +
               '<svg class="exit" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
  const isFull = f => document.fullscreenElement === f || f.classList.contains('is-full');
  const relayout = () => requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  S.addFullscreen = frame => {
    if (frame.querySelector(':scope > .fs-btn')) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fs-btn';
    b.innerHTML = ICON;
    const label = () => b.setAttribute('aria-label', isFull(frame) ? kt('fullscreenExit') : kt('fullscreenEnter'));
    label();
    b.addEventListener('click', () => {
      if (isFull(frame)) {
        if (document.fullscreenElement) document.exitFullscreen(); else { frame.classList.remove('is-full'); document.body.style.overflow = ''; }
      } else if (frame.requestFullscreen) {
        frame.requestFullscreen().catch(() => { frame.classList.add('is-full'); document.body.style.overflow = 'hidden'; label(); relayout(); });
      } else {
        frame.classList.add('is-full'); document.body.style.overflow = 'hidden';
      }
      label(); relayout();
    });
    document.addEventListener('fullscreenchange', () => { label(); relayout(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && frame.classList.contains('is-full')) { frame.classList.remove('is-full'); document.body.style.overflow = ''; label(); relayout(); } });
    frame.appendChild(b);
  };
  document.querySelectorAll('.stage-frame:not([data-no-fs])').forEach(S.addFullscreen);

  // ---- info buttons -------------------------------------------------------
  S.wireInfo = (scope = document) => {
    scope.querySelectorAll('.info[aria-controls]').forEach(btn => {
      if (btn.dataset.wired) return;
      btn.dataset.wired = '1';
      const note = document.getElementById(btn.getAttribute('aria-controls'));
      if (!note) return;
      btn.setAttribute('aria-expanded', 'false');
      if (!btn.hasAttribute('aria-label')) btn.setAttribute('aria-label', kt('infoAria'));
      if (!btn.textContent.trim()) btn.textContent = 'i';
      note.hidden = true;
      btn.addEventListener('click', () => {
        const open = note.hidden;
        note.hidden = !open;
        btn.setAttribute('aria-expanded', String(open));
      });
    });
  };
  S.wireInfo();

  // ---- first-hint badge ---------------------------------------------------
  // const hint = SCAPE.badge(frame); hint.show('Ziehe Rot in Position'); … hint.hide();
  S.badge = frame => {
    let el = frame.querySelector(':scope > .hint-badge');
    if (!el) { el = document.createElement('div'); el.className = 'hint-badge'; el.hidden = true; frame.appendChild(el); }
    return {
      show(text) { el.textContent = text; el.hidden = false; },
      hide() { el.hidden = true; },
      get shown() { return !el.hidden; }
    };
  };

  // ---- tasks + Merke box ---------------------------------------------------
  // <div class="tasks" id="…"><ul><li data-task="a">…</li></ul></div>  +  <div class="merke locked" data-for="…">
  S.tasks = box => {
    const items = [...box.querySelectorAll('li[data-task]')];
    const merke = document.querySelector('.merke[data-for="' + box.id + '"]');
    const api = {
      done(id) {
        const li = items.find(x => x.dataset.task === id);
        if (!li || li.classList.contains('done')) return false;
        li.classList.add('done');
        if (items.every(x => x.classList.contains('done')) && merke) merke.classList.remove('locked');
        return true;
      },
      isDone: id => !!items.find(x => x.dataset.task === id && x.classList.contains('done')),
      reset() { items.forEach(x => x.classList.remove('done')); if (merke) merke.classList.add('locked'); }
    };
    return api;
  };
  document.querySelectorAll('.merke .locked-note:empty').forEach(n => { n.textContent = kt('merkeLocked'); });

  // ---- kiosk mode: back to the start after 3 minutes without touch ----------
  S.kiosk = params.has('kiosk');
  if (S.kiosk) {
    root.classList.add('kiosk');
    const IDLE_MS = 3 * 60 * 1000;
    let timer = 0;
    const restart = () => {
      if (typeof S.onIdle === 'function') S.onIdle();
      else location.replace(location.pathname + location.search);
    };
    const poke = () => { clearTimeout(timer); timer = setTimeout(restart, IDLE_MS); };
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(ev => window.addEventListener(ev, poke, { passive: true }));
    poke();
  }

  // ---- staff panel: ?dev, Shift+D or the faint "(dev)" link -----------------
  S.dev = params.has('dev') || location.hash === '#dev';
  const setDev = on => {
    S.dev = on;
    root.classList.toggle('dev', on);
    window.dispatchEvent(new CustomEvent('scape:dev', { detail: on }));
  };
  S.setDev = setDev;
  root.classList.toggle('dev', S.dev);
  document.addEventListener('keydown', e => {
    if (e.shiftKey && (e.key === 'D' || e.key === 'd') && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) setDev(!S.dev);
  });
  document.querySelectorAll('[data-dev-link]').forEach(a => {
    if (!a.textContent.trim()) a.textContent = kt('devLink') || '(dev)';
    a.addEventListener('click', () => setDev(!S.dev));
  });

  // ---- canvas text never smaller than px on screen --------------------------
  S.minFont = (ctx, px = 12) => {
    const cw = ctx.canvas.clientWidth, a = ctx.getTransform().a;
    return cw && a ? px * ctx.canvas.width / (cw * a) : 0;
  };
})();
