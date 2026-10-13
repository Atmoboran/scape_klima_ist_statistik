// Helpers shared by both pages (index.html "Tagesverlauf", trend.html
// "Klimatrend"): number formatting, data loading, station picker, the
// inline info notes and topics that follow the chosen variable/station,
// the play button and tooltip placement. Exposed as window.KIS.
(() => {
  'use strict';

  // ---- numbers: decimal comma, real minus, thousands point from 5 digits ----
  const num = (v, digits = 0) => {
    const s = Math.abs(v).toFixed(digits);
    const [int, frac] = s.split('.');
    const grouped = int.length >= 5 ? int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : int;
    const neg = v < 0 && Number(s) !== 0;
    return (neg ? '−' : '') + grouped + (frac ? ',' + frac : '');
  };
  const signed = (v, digits = 0) => (v >= 0 ? '+' : '') + num(v, digits);
  // Axis tick: integers stay integers, fractions get one decimal.
  const tick = d => num(d, Number.isInteger(d) ? 0 : 1);

  // ---- data ----------------------------------------------------------------
  // The station files are JSON next to the page; browsers only load them
  // over http(s) (GitHub Pages, any static server), not from file://.
  const showLoadError = () => {
    const el = document.getElementById('load-error');
    if (el) el.hidden = false;
  };
  const loadJSON = async path => {
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error(res.status + ' ' + path);
      return await res.json();
    } catch (e) {
      showLoadError();
      throw e;
    }
  };

  const loadStations = async () => {
    const stations = await loadJSON('data/processed/stations_index.json');
    stations.sort((a, b) => a.name.localeCompare(b.name, window.TEXTS.lang));
    return stations;
  };

  const fillStationSelect = (select, stations) => {
    select.innerHTML = '';
    for (const s of stations) {
      const opt = document.createElement('option');
      opt.value = s.station_id;
      opt.textContent = s.name;
      select.appendChild(opt);
    }
  };

  // ---- info notes and topics that follow the current variable/station ------
  const setHTML = (id, html) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  };

  const fillVariableNotes = config => {
    setHTML('variable-note', `<p>${config.generalInfo}</p>`);
    setHTML('topic-chart', `<p>${config.chartExplanation}</p>`);
    setHTML('topic-calc',
      `<p>${t('common.meanExplanation')}</p>` +
      `<p>${config.methodology.day}</p>` +
      `<p>${config.methodology.year}</p>` +
      `<p>${config.methodology.period}</p>`);
    setHTML('topic-climate', `<p>${config.methodology.context}</p>`);
  };

  const fillStationNote = data => {
    const note = document.getElementById('station-note');
    if (!note) return;
    const meta = data.meta;
    const dl = document.createElement('dl');
    dl.className = 'facts';
    const rows = [
      [t('common.station.coordinates'), t('common.station.formatCoordinates', num(meta.lat, 4), num(meta.lon, 4))],
      [t('common.station.elevation'), t('common.station.formatElevation', num(meta.elevation_m))],
      [t('common.station.state'), meta.bundesland],
      [t('common.station.years'), `${data.years[0]}–${data.years[data.years.length - 1]}`]
    ];
    for (const [label, value] of rows) {
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      dl.append(dt, dd);
    }
    note.innerHTML = '';
    const head = document.createElement('p');
    head.innerHTML = `<b>${meta.name}</b>`;
    note.append(head, dl);
  };

  // ---- segmented buttons (black = selected) ----------------------------------
  const fillSeg = (box, items, activeKey, onPick) => {
    box.innerHTML = '';
    for (const item of items) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn';
      btn.setAttribute('aria-pressed', String(item.key === activeKey));
      btn.textContent = item.label;
      btn.addEventListener('click', () => onPick(item.key));
      box.appendChild(btn);
    }
  };

  // ---- play button (yellow main action) ------------------------------------------
  const setPlaying = (btn, labelEl, playing) => {
    btn.classList.toggle('playing', playing);
    labelEl.textContent = t(playing ? 'timeline.stop' : 'timeline.play');
    btn.setAttribute('aria-label', t(playing ? 'timeline.stopAria' : 'timeline.playAria'));
  };

  // ---- tooltip inside the chart frame ---------------------------------------------
  const placeTooltip = (tooltipEl, frameEl, clientX, clientY) => {
    const box = frameEl.getBoundingClientRect();
    const tw = tooltipEl.offsetWidth;
    const th = tooltipEl.offsetHeight;
    const margin = 6;
    let left = clientX - box.left - tw / 2;
    left = Math.max(margin, Math.min(left, box.width - tw - margin));
    let top = clientY - box.top - th - 14;
    if (top < margin) top = clientY - box.top + 18; // flip below the pointer near the top edge
    tooltipEl.style.left = left + 'px';
    tooltipEl.style.top = top + 'px';
  };

  const debounce = (fn, ms) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  };

  // Tasks status line under the task list.
  const status = text => {
    const el = document.getElementById('task-status');
    if (el) el.textContent = text;
  };

  window.KIS = {
    num, signed, tick, loadJSON, loadStations, fillStationSelect,
    fillVariableNotes, fillStationNote, fillSeg, setPlaying, placeTooltip, debounce, status,
    // LOCAL: default station when the page opens (Frankfurt/Main)
    DEFAULT_STATION_ID: '01420'
  };
})();
