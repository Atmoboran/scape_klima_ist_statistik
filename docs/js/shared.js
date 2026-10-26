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

  // ---- seasons ------------------------------------------------------------------------
  // Day-of-year ranges (1-365, Feb 29 dropped by build_data.py) of the four
  // meteorological seasons as [startDoy, endDoy, yearOffset]. Winter is
  // labelled by the year its Jan/Feb fall in: last year's December plus this
  // year's Jan/Feb. "full" (or anything else) is the whole calendar year.
  const SEASON_RANGES = {
    winter: [[335, 365, -1], [1, 59, 0]],
    spring: [[60, 151, 0]],
    summer: [[152, 243, 0]],
    autumn: [[244, 334, 0]]
  };

  // Per-day values of a strand; precipitation strands are a running total
  // (see build_data.py) and are differenced back into daily amounts.
  const dailyValues = (strand, isCumulative) => {
    if (!isCumulative) return strand;
    const out = new Array(strand.length);
    let prev = 0;
    for (let i = 0; i < strand.length; i++) {
      // a missing day stays missing (and doesn't reset the running total)
      if (strand[i] === null || strand[i] === undefined) { out[i] = null; continue; }
      out[i] = strand[i] - prev;
      prev = strand[i];
    }
    return out;
  };

  // Every valid daily value of one labelled year of a season.
  const seasonValues = (data, year, season, isCumulative) => {
    const ranges = SEASON_RANGES[season] || [[1, 365, 0]];
    const out = [];
    for (const [startDoy, endDoy, yearOffset] of ranges) {
      const strand = data.strands[String(+year + yearOffset)];
      if (!strand) continue;
      const daily = dailyValues(strand, isCumulative);
      for (let doy = startDoy; doy <= endDoy; doy++) {
        const v = daily[doy - 1];
        if (v !== null && v !== undefined) out.push(v);
      }
    }
    return out;
  };

  // Only years the build marked complete (listed in annual_metric) count;
  // winter also needs the previous December.
  const seasonComplete = (data, year, season) =>
    (season === 'winter' ? [+year - 1, +year] : [+year]).every(y => data.annual_metric[String(y)] !== undefined);

  // One number per year/season: mean of its days, or their sum (aggregate "sum").
  const summarise = (values, aggregate) => {
    const sum = values.reduce((a, b) => a + b, 0);
    return aggregate === 'sum' ? sum : sum / values.length;
  };

  // The station data as seen through one season: annual_metric holds the
  // season's value per complete year, and both reference periods get the
  // mean of those. "full" returns the data unchanged (the build's own values).
  const seasonalData = (data, season, config) => {
    if (!SEASON_RANGES[season]) return data;
    const annual = {};
    for (const y of data.years) {
      if (!seasonComplete(data, y, season)) continue;
      const values = seasonValues(data, y, season, !!config.dailyIsCumulative);
      if (values.length) annual[String(y)] = summarise(values, config.aggregate);
    }
    const period = p => {
      const vals = Object.keys(annual).filter(y => +y >= p.start && +y <= p.end).map(y => annual[y]);
      return Object.assign({}, p, { mean_annual_metric: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null });
    };
    return Object.assign({}, data, { annual_metric: annual, period_a: period(data.period_a), period_b: period(data.period_b) });
  };

  // ---- reference period select (both pages) ----------------------------------------
  const fillPeriodSelect = (select, data, activeKey) => {
    select.innerHTML = '';
    for (const key of ['period_a', 'period_b']) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = `${data[key].start}–${data[key].end}`;
      select.appendChild(opt);
    }
    select.value = activeKey;
  };

  // ---- play button (icon only, inside the chart) -------------------------------------
  const setPlaying = (btn, playing) => {
    btn.classList.toggle('playing', playing);
    btn.setAttribute('aria-label', t(playing ? 'timeline.stopAria' : 'timeline.playAria'));
  };

  // ---- tasks dialog ------------------------------------------------------------------
  // Opens the <dialog> from a button; a click on the dimmed backdrop closes it too.
  const wireDialog = (openBtn, dialog, closeBtn) => {
    openBtn.addEventListener('click', () => {
      if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
    });
    const close = () => { if (dialog.close) dialog.close(); else dialog.removeAttribute('open'); };
    closeBtn.addEventListener('click', close);
    dialog.addEventListener('click', e => { if (e.target === dialog) close(); });
  };

  // Tolerant number input: decimal comma, real minus, "+", spaces and units.
  const parseAnswer = text => {
    const cleaned = String(text).replace(/[−–]/g, '-').replace(/\s/g, '').replace(/,/g, '.').replace(/[^0-9.+-]/g, '');
    if (!/\d/.test(cleaned)) return null;
    const v = parseFloat(cleaned);
    return Number.isFinite(v) ? v : null;
  };

  // Tasks with an answer field and a "Prüfen" button.
  //   items: [{ key: 'daily.quiz.dev2003', args: [stationName, …], answer, digits, tolerance }]
  // Texts come from <key>.question / .unit / .hint / .solved in content/texts.de.js.
  const quiz = (list, progressEl, items) => {
    list.innerHTML = '';
    let solved = 0;
    const progress = () => { progressEl.textContent = t('quiz.progress', solved, items.length); };
    for (const item of items) {
      const li = document.createElement('li');
      li.className = 'quiz-item';
      const q = document.createElement('p');
      q.className = 'quiz-q';
      q.textContent = t(item.key + '.question', ...item.args);
      const form = document.createElement('form');
      form.className = 'quiz-row';
      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'decimal';
      input.autocomplete = 'off';
      input.className = 'quiz-input';
      input.setAttribute('aria-label', t('quiz.answerAria'));
      const unit = document.createElement('span');
      unit.className = 'quiz-unit';
      unit.textContent = t(item.key + '.unit');
      const btn = document.createElement('button');
      btn.type = 'submit';
      btn.className = 'btn quiz-check';
      btn.textContent = t('quiz.check');
      const feedback = document.createElement('p');
      feedback.className = 'quiz-feedback';
      feedback.setAttribute('aria-live', 'polite');
      form.append(input, unit, btn);
      li.append(q, form, feedback);
      list.appendChild(li);

      form.addEventListener('submit', e => {
        e.preventDefault();
        if (li.classList.contains('done')) return;
        const v = parseAnswer(input.value);
        li.classList.remove('wrong');
        if (v === null) { feedback.textContent = t('quiz.empty'); return; }
        const right = Number(item.answer.toFixed(item.digits || 0));
        if (Math.abs(v - right) <= (item.tolerance || 0) + 1e-9) {
          li.classList.add('done');
          input.disabled = true;
          btn.disabled = true;
          feedback.textContent = t(item.key + '.solved', item.args[0], signedIf(item, right));
          solved++;
          progress();
        } else {
          li.classList.add('wrong');
          feedback.innerHTML = `${t('quiz.wrong')} <b>${t('quiz.hintLabel')}</b> ${t(item.key + '.hint')}`;
        }
      });
    }
    progress();
  };
  // Deviations read "+1,8", plain values "2018" / "401".
  const signedIf = (item, v) => (item.signed ? signed(v, item.digits || 0) : num(v, item.digits || 0));

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

  window.KIS = {
    num, signed, tick, loadJSON, loadStations, fillStationSelect,
    fillVariableNotes, fillStationNote, fillSeg, fillPeriodSelect, setPlaying, wireDialog, quiz, parseAnswer,
    placeTooltip, debounce,
    seasons: { RANGES: SEASON_RANGES, values: seasonValues, complete: seasonComplete, summarise, seasonalData },
    // LOCAL: default station when the page opens (Frankfurt/Main)
    DEFAULT_STATION_ID: '01420'
  };
})();
