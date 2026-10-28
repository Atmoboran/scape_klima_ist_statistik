// The page (index.html): one set of pickers - variable, station, reference
// period, season - and one year timeline drive three views of the same data:
//   1 Verlauf      one line per year (monthly bars for sunshine), day by day
//   2 Häufigkeit   distribution of the days of one year vs. the reference period
//   3 Trend        one bar per year with a 10-year moving average
// The view is in the URL hash (#verlauf, #haeufigkeit, #trend), so a view can
// be linked to directly. Also: readout, legends, tasks dialog, topics and the
// comparison of the two reference periods.
(() => {
  'use strict';

  const KIS = window.KIS;
  const VARIABLE_CONFIG = window.VARIABLE_CONFIG;
  const C = window.THEME.klimastatistik;
  const $ = id => document.getElementById(id);
  const VIEWS = ['verlauf', 'haeufigkeit', 'trend'];
  const SEASON_KEYS = ['full', 'winter', 'spring', 'summer', 'autumn'];

  const state = {
    stations: [],
    stationId: null,
    variable: 'temperature',
    data: null,      // station data as loaded
    seasonal: null,  // the same, seen through the chosen season (KIS.seasons.seasonalData)
    period: 'period_a',
    season: 'full',
    view: 'verlauf',
    ranges: null,    // lowest/highest annual value of all stations (Trend y-axis floor)
    diffScale: null, // colour of the deviation in the readout
    playTimer: null
  };

  const el = {
    variableSelect: $('variable-select'),
    stationSelect: $('station-select'),
    periodSelect: $('period-select'),
    seasonToggle: $('season-toggle'),
    question: $('view-question'),
    chart: $('chart'),
    chartBar: $('chart-bar'),
    distChart: $('distribution-chart'),
    trendChart: $('trend-chart'),
    tooltip: $('tooltip'),
    verlaufLegend: $('verlauf-legend'),
    barLegend: $('bar-legend'),
    readoutYear: $('readout-year'),
    readoutValueLabel: $('readout-value-label'),
    readoutValue: $('readout-value'),
    readoutDeviation: $('readout-deviation'),
    slider: $('year-slider'),
    yearStart: $('timeline-year-start'),
    yearEnd: $('timeline-year-end'),
    playBtn: $('play-btn'),
    prevBtn: $('prev-year-btn'),
    nextBtn: $('next-year-btn'),
    topicChart: $('topic-chart'),
    climateTopic: $('topic-climate-details'),
    compare: $('compare'),
    compareTitle: $('compare-title'),
    compareHeadline: $('compare-headline'),
    compareLegend: $('compare-legend'),
    compareChart: $('compare-chart')
  };

  const config = () => VARIABLE_CONFIG[state.variable];
  const currentYear = () => (state.data ? state.data.years[+el.slider.value] : null);
  const seasonLabel = () => (state.season === 'full' ? null : t('seasons.' + state.season));

  // ---- first interaction: the play button stops glowing ---------------------
  const firstTouch = () => el.playBtn.classList.remove('pulse');

  // ---- plots ----------------------------------------------------------------
  const plots = {};
  const createPlots = () => {
    plots.lines = window.SpaghettiPlot.create({ svgEl: el.chart, tooltipEl: el.tooltip, onPointer: firstTouch });
    plots.bars = window.MonthlyBarPlot.create({ svgEl: el.chartBar, tooltipEl: el.tooltip, onPointer: firstTouch });
    plots.dist = window.DistributionPlot.create({ svgEl: el.distChart, tooltipEl: el.tooltip, onPointer: firstTouch });
    plots.trend = window.AnnualTrendPlot.create({
      svgEl: el.trendChart,
      tooltipEl: el.tooltip,
      // a tap on a bar picks that year on the timeline
      onYear: (year, type) => {
        if (type !== 'pointerdown') return;
        firstTouch();
        const idx = state.data.years.indexOf(+year);
        if (idx >= 0) { stopPlaying(); setYearIndex(idx); }
      }
    });
  };

  // Draws the visible view at its real size. Hidden views are drawn when they are opened.
  const renderView = () => {
    const cfg = config();
    const data = state.data;
    const year = currentYear();
    if (state.view === 'verlauf') {
      const bar = cfg.chartType === 'bar';
      el.chart.toggleAttribute('hidden', bar);
      el.chartBar.toggleAttribute('hidden', !bar);
      el.verlaufLegend.hidden = bar;
      el.barLegend.hidden = !bar;
      const plot = bar ? plots.bars : plots.lines;
      (bar ? el.chartBar : el.chart).setAttribute('aria-label', cfg.chartAriaLabel);
      plot.render(data, {
        colorStops: cfg.colorStops, axisSuffix: cfg.axisSuffix, axisUnit: cfg.axisUnit, digits: cfg.digits,
        maxAbsDev: cfg.maxAbsDev, yMin: cfg.yMin, aboveColor: cfg.aboveColor, belowColor: cfg.belowColor,
        formatDayTooltip: cfg.formatDayTooltip, formatMonthTooltip: cfg.formatMonthTooltip,
        formatValue: cfg.formatValue, formatDiff: cfg.formatDiff,
        activePeriod: state.period,
        seasonMonths: state.season === 'full' ? null : KIS.seasons.MONTHS[state.season]
      });
      plot.setYear(year);
    } else if (state.view === 'haeufigkeit') {
      el.distChart.setAttribute('aria-label', t('haeufigkeit.aria', cfg.label));
      plots.dist.render(data, {
        colorStops: cfg.colorStops, axisSuffix: cfg.axisSuffix, axisUnit: cfg.axisUnit,
        dailyIsCumulative: !!cfg.dailyIsCumulative, histogram: cfg.histogram,
        activePeriod: state.period, season: state.season, formatValue: cfg.formatValue
      });
      plots.dist.setYear(year);
    } else {
      el.trendChart.setAttribute('aria-label', t('trend.aria', cfg.label, data.years[0], data.years[data.years.length - 1]));
      plots.trend.render(state.seasonal, {
        colorStops: cfg.colorStops, axisSuffix: cfg.axisSuffix, axisUnit: cfg.axisUnit,
        yFloor: trendRange()[0],
        yCeil: trendRange()[1],
        activePeriod: state.period,
        formatValue: cfg.formatValue, formatDiff: cfg.formatDiff, incompleteLabel: cfg.incompleteLabel
      });
      plots.trend.setYear(year);
    }
  };

  // Trend: the lowest and highest value of all stations for this variable and
  // season, rounded outwards to a step that only depends on that overall
  // range - the same y-axis at every station (data/processed/annual_ranges.json).
  const trendRange = () => {
    const v = state.ranges && state.ranges[state.variable];
    const r = v && (state.season === 'full' ? v : v.seasons && v.seasons[state.season]);
    if (!r) return [null, null];
    const step = d3.tickStep(r.min, r.max, 6);
    return [Math.floor(r.min / step) * step, Math.ceil(r.max / step) * step];
  };

  // ---- views ------------------------------------------------------------------
  const setView = view => {
    if (!VIEWS.includes(view)) view = 'verlauf';
    state.view = view;
    document.querySelectorAll('.nav [data-view]').forEach(a => {
      if (a.dataset.view === view) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    document.querySelectorAll('.chart-pane[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== view; });
    el.tooltip.hidden = true;
    el.question.textContent = t('views.' + view + '.question');
    if (state.data) {
      renderView();
      updateTopic();
    }
  };
  const viewFromHash = () => location.hash.replace('#', '');

  // ---- readout: year, value and deviation of the chosen season ----------------
  const buildDiffScale = () => {
    const base = state.seasonal[state.period].mean_annual_metric;
    const diffs = Object.values(state.seasonal.annual_metric).map(v => v - base);
    if (base === null || base === undefined || !diffs.length) return null;
    const maxAbs = Math.max(...diffs.map(Math.abs)) || 1;
    return d3.scaleLinear().domain([-maxAbs, 0, maxAbs]).range(config().colorStops).interpolate(d3.interpolateRgb).clamp(true);
  };

  const updateReadout = () => {
    const cfg = config();
    const year = currentYear();
    el.readoutValueLabel.textContent = state.season === 'full' ? cfg.valueLabel : cfg.seasonValueLabel(t('seasons.stems.' + state.season));
    el.readoutYear.textContent = year || t('dash');
    const amt = year ? state.seasonal.annual_metric[String(year)] : undefined;
    const base = state.seasonal[state.period].mean_annual_metric;
    el.readoutDeviation.style.color = '';
    if (amt === undefined) {
      el.readoutValue.textContent = year ? cfg.incompleteLabel : t('dash');
      el.readoutDeviation.textContent = t('dash');
      return;
    }
    el.readoutValue.textContent = cfg.formatValue(amt);
    if (base === null || base === undefined) {
      el.readoutDeviation.textContent = t('dash');
      return;
    }
    const diff = amt - base;
    el.readoutDeviation.textContent = cfg.formatDiff(diff);
    el.readoutDeviation.style.color = state.diffScale ? state.diffScale(diff) : '';
  };

  // ---- legends and the "Was sehe ich auf dem Diagramm?" text -------------------
  const updateLegends = () => {
    const cfg = config();
    const p = state.data[state.period];
    const gradient = `linear-gradient(to right, ${cfg.colorStops.join(', ')})`;
    document.querySelectorAll('.legend-gradient').forEach(g => { g.style.background = gradient; });
    document.querySelectorAll('.legend-cold').forEach(n => { n.textContent = cfg.legendCold; });
    document.querySelectorAll('.legend-warm').forEach(n => { n.textContent = cfg.legendWarm; });
    document.querySelectorAll('.legend-period').forEach(n => { n.textContent = `${p.start}–${p.end}`; });
    document.querySelectorAll('.legend-dist-period').forEach(n => { n.textContent = t('legends.distReference', p.start, p.end); });
    $('bar-legend-year-swatch').style.background = cfg.aboveColor;
    $('bar-legend-period-swatch').style.background = C.periodBar;
    $('bar-legend-period-label').textContent = t('legends.barPeriod', p.start, p.end);
  };

  const updateTopic = () => {
    const cfg = config();
    const p = state.seasonal[state.period];
    let html;
    if (state.view === 'verlauf') {
      html = cfg.chartExplanation;
    } else if (p.mean_annual_metric === null || p.mean_annual_metric === undefined) {
      html = t('common.periodTooFewYears');
    } else if (state.view === 'haeufigkeit') {
      html = t('haeufigkeit.caption', seasonLabel(), p.start, p.end);
      if (state.season === 'full' && state.variable === 'temperature') html += t('haeufigkeit.bimodalNote');
      if (cfg.histogramNote) html += cfg.histogramNote;
    } else {
      html = t('trend.caption', seasonLabel());
    }
    if (state.season !== 'full') html += t('seasonNote', seasonLabel());
    el.topicChart.innerHTML = `<p>${html}</p>`;
  };

  // ---- timeline ---------------------------------------------------------------
  const setYearIndex = idx => {
    el.slider.value = idx;
    const year = currentYear();
    if (state.view === 'verlauf') (config().chartType === 'bar' ? plots.bars : plots.lines).setYear(year);
    else if (state.view === 'haeufigkeit') plots.dist.setYear(year);
    else plots.trend.setYear(year);
    updateReadout();
  };

  const stepYear = delta => {
    firstTouch();
    stopPlaying();
    const n = state.data.years.length;
    setYearIndex(Math.min(n - 1, Math.max(0, +el.slider.value + delta)));
  };

  const startPlaying = () => {
    KIS.setPlaying(el.playBtn, true);
    state.playTimer = setInterval(() => setYearIndex((+el.slider.value + 1) % state.data.years.length), 550);
  };

  function stopPlaying() {
    if (state.playTimer) {
      clearInterval(state.playTimer);
      state.playTimer = null;
    }
    KIS.setPlaying(el.playBtn, false);
  }

  // ---- pickers -----------------------------------------------------------------
  const renderSeasonToggle = () => {
    const items = SEASON_KEYS.map(key => ({ key, label: t('seasons.' + key) }));
    KIS.fillSeg(el.seasonToggle, items, state.season, key => {
      firstTouch();
      if (key === state.season) return;
      state.season = key;
      renderSeasonToggle();
      refresh();
    });
  };

  // Everything that depends on variable, station, period or season.
  const refresh = () => {
    state.seasonal = KIS.seasons.seasonalData(state.data, state.season, config());
    state.diffScale = buildDiffScale();
    updateLegends();
    renderView();
    updateReadout();
    updateTopic();
    if (el.climateTopic.open) renderCompare(state.data);
  };

  const load = async (stationId, variable) => {
    stopPlaying();
    const keepYear = currentYear();
    state.stationId = stationId;
    state.variable = variable;
    el.stationSelect.value = stationId;
    el.variableSelect.value = variable;
    state.data = await KIS.loadJSON(`data/processed/${variable}/${stationId}.json`);
    const years = state.data.years;
    el.yearStart.textContent = years[0];
    el.yearEnd.textContent = years[years.length - 1];
    el.slider.min = 0;
    el.slider.max = years.length - 1;
    // stay on the year being looked at when switching station or variable
    const idx = keepYear ? years.indexOf(keepYear) : -1;
    el.slider.value = idx >= 0 ? idx : years.length - 1;
    KIS.fillPeriodSelect(el.periodSelect, state.data, state.period);
    KIS.fillVariableNotes(config());
    KIS.fillStationNote(state.data);
    refresh();
  };

  // ---- tasks dialog: questions about the default station (Frankfurt/Main) ------
  // Grouped by view, each with easy and hard tasks; every answer is computed
  // from the data, counting days the same way as the charts do.
  const setupQuiz = async () => {
    KIS.wireDialog($('tasks-open'), $('tasks-dialog'), $('tasks-close'));
    const id = KIS.DEFAULT_STATION_ID;
    const [temp, rain] = await Promise.all([
      KIS.loadJSON(`data/processed/temperature/${id}.json`),
      KIS.loadJSON(`data/processed/precipitation/${id}.json`)
    ]);
    const name = temp.meta.name;
    const am = temp.annual_metric;
    const pa = temp.period_a;
    const has = v => v !== null && v !== undefined;
    const best = (map, cmp) => Object.keys(map).reduce((b, y) => (b === null || cmp(map[y], map[b]) ? y : b), null);
    const days = (year, season, test) => KIS.seasons.values(temp, year, season, false).filter(test).length;
    const item = (view, level, task, answer, opts) =>
      (has(answer) ? Object.assign({ key: `tasks.${view}.${level}.${task}`, args: [name], answer, digits: 0, tolerance: 0 }, opts) : null);

    // Verlauf
    const aug2018 = temp.strands['2018'] ? temp.strands['2018'][212] : null; // 1 August = day 213
    // Häufigkeit: the 20-21 °C column of 2025, counted with the chart's own bands
    const bands = window.DistributionPlot.bands(temp, false, VARIABLE_CONFIG.temperature.histogram);
    let band2025 = null;
    if (bands && temp.strands['2025']) {
      const i = bands.index(20.5);
      if (bands.edge(i) === 20 && bands.edge(i + 1) === 21) {
        band2025 = window.DistributionPlot.countDays(KIS.seasons.values(temp, 2025, 'full', false), bands)[i];
      }
    }
    const refSummer = temp.years.filter(y => y >= pa.start && y <= pa.end && KIS.seasons.complete(temp, y, 'summer'))
      .flatMap(y => KIS.seasons.values(temp, y, 'summer', false));
    // Trend
    const lastTen = temp.years.slice(-10).filter(y => am[y] !== undefined);
    const summers = KIS.seasons.seasonalData(temp, 'summer', { aggregate: 'mean' }).annual_metric;

    const groups = [
      { view: 'verlauf', easy: [
        item('verlauf', 'easy', 'dev2003', am['2003'] !== undefined && has(pa.mean_annual_metric) ? am['2003'] - pa.mean_annual_metric : null, { digits: 1, tolerance: 0.1, signed: true }),
        item('verlauf', 'easy', 'rain2018', rain.annual_metric['2018'], { tolerance: 5 })
      ], hard: [
        item('verlauf', 'hard', 'aug2018', aug2018, { digits: 1, tolerance: 0.1 }),
        item('verlauf', 'hard', 'periods', has(pa.mean_annual_metric) && has(temp.period_b.mean_annual_metric) ? temp.period_b.mean_annual_metric - pa.mean_annual_metric : null, { digits: 1, tolerance: 0.1 })
      ] },
      { view: 'haeufigkeit', easy: [
        item('haeufigkeit', 'easy', 'band2025', band2025),
        item('haeufigkeit', 'easy', 'summerMean', refSummer.length ? refSummer.reduce((a, b) => a + b, 0) / refSummer.length : null, { digits: 1, tolerance: 0.1 })
      ], hard: [
        item('haeufigkeit', 'hard', 'hot2003', am['2003'] !== undefined ? days(2003, 'full', v => v >= 20) : null),
        item('haeufigkeit', 'hard', 'frost2025', KIS.seasons.complete(temp, 2025, 'winter') ? days(2025, 'winter', v => v < 0) : null)
      ] },
      { view: 'trend', easy: [
        item('trend', 'easy', 'warmest', +best(am, (a, b) => a > b)),
        item('trend', 'easy', 'coldest', +best(am, (a, b) => a < b))
      ], hard: [
        has(pa.mean_annual_metric) && lastTen.length
          ? Object.assign(item('trend', 'hard', 'lastTen', lastTen.filter(y => am[y] > pa.mean_annual_metric).length), { args: [name, lastTen[0], lastTen[lastTen.length - 1]] })
          : null,
        item('trend', 'hard', 'summerMax', Object.keys(summers).length ? +best(summers, (a, b) => a > b) : null)
      ] }
    ].map((g, i) => ({
      num: i + 1,
      title: t('views.' + g.view + '.nav'),
      levels: ['easy', 'hard'].map(level => ({ level, label: t('tasks.levels.' + level), items: g[level].filter(Boolean) }))
    }));
    KIS.quiz($('quiz'), $('quiz-progress'), groups);
  };

  const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const monthlySumsFromDaily = series => {
    const sums = [];
    let dayIdx = 0;
    for (let m = 0; m < 12; m++) {
      let sum = 0;
      let any = false;
      for (let d = 0; d < MONTH_LENGTHS[m]; d++, dayIdx++) {
        const v = series[dayIdx];
        if (v !== null && v !== undefined) {
          sum += v;
          any = true;
        }
      }
      sums.push(any ? sum : null);
    }
    return sums;
  };

  // ---- period comparison chart (inside the topic "Was hat das mit dem Klimawandel zu tun?") ----
  const renderCompare = data => {
    const meta = data.meta;
    const pa = data.period_a;
    const pb = data.period_b;
    const config = VARIABLE_CONFIG[state.variable];

    el.compareTitle.textContent = t('compare.title', meta.name);
    const svg = d3.select(el.compareChart);
    svg.selectAll('*').remove();

    if (pa.mean_annual_metric === null || pb.mean_annual_metric === null) {
      const missing = pa.mean_annual_metric === null ? pa : pb;
      el.compareHeadline.textContent = t('compare.tooFewYears', missing.start, missing.end);
      el.compareLegend.innerHTML = '';
      return;
    }

    const diff = pb.mean_annual_metric - pa.mean_annual_metric;
    el.compareHeadline.innerHTML = config.formatCompareHeadline(pa, pb, diff, KIS.num(Math.abs(diff), config.digits));

    const isBar = config.chartType === 'bar';
    el.compareLegend.innerHTML = '';
    for (const item of [
      { color: C.periodA, label: `${pa.start}–${pa.end}` },
      { color: C.periodB, label: `${pb.start}–${pb.end}` }
    ]) {
      const span = document.createElement('span');
      span.className = 'legend-item';
      const swatch = document.createElement('span');
      swatch.className = isBar ? 'swatch-box' : 'swatch-line';
      swatch.style.color = item.color;
      span.append(swatch, item.label);
      el.compareLegend.appendChild(span);
    }

    // Drawn at the real pixel size, so axis text keeps its CSS size on phones.
    const W = Math.max(280, el.compareChart.clientWidth || el.compare.clientWidth || 800);
    const H = Math.round(Math.max(260, Math.min(420, W * 0.5)));
    svg.attr('viewBox', `0 0 ${W} ${H}`).attr('height', H);
    if (isBar) renderCompareBars(svg, pa, pb, config, W, H);
    else renderCompareLines(svg, pa, pb, config, W, H);
  };

  // Variables whose main chart is a daily line (temperature, precipitation):
  // period_a vs period_b as two lines over the day of year, gap shaded.
  const renderCompareLines = (svg, pa, pb, config, W, H) => {
    const M = { top: 46, right: 12, bottom: 28, left: 40 }; // same frame as the main charts: legend strip on top
    const innerW = W - M.left - M.right;
    const innerH = H - M.top - M.bottom;

    const x = d3.scaleLinear().domain([1, 365]).range([0, innerW]);
    const values = pa.daily_series.concat(pb.daily_series).filter(v => v !== null);
    const yDomain = d3.extent(values);
    if (config.yMin !== null) yDomain[0] = config.yMin;
    const y = d3.scaleLinear().domain(yDomain).nice().range([innerH, 0]);

    const g = svg.append('g').attr('transform', `translate(${M.left},${M.top})`);
    const monthStarts = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
    const months = t('months');
    const every = innerW < 420 ? 2 : 1;
    g.append('g').attr('class', 'axis month-axis').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickValues(monthStarts.filter((d, i) => i % every === 0))
        .tickFormat(d => months[monthStarts.indexOf(d)]));
    g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(5).tickFormat(d => KIS.tick(d)));
    // the unit stands above the y-axis, as in the main charts
    g.append('text').attr('class', 'axis-unit-label').attr('x', 0).attr('y', -8).attr('text-anchor', 'middle').text(config.axisUnit);

    const rows = pa.daily_series.map((v, i) => ({ doy: i + 1, a: v, b: pb.daily_series[i] }));
    const areaWarmer = d3.area()
      .defined(d => d.a !== null && d.b !== null && d.b >= d.a)
      .x(d => x(d.doy)).y0(d => y(d.a)).y1(d => y(d.b));
    const areaCooler = d3.area()
      .defined(d => d.a !== null && d.b !== null && d.b < d.a)
      .x(d => x(d.doy)).y0(d => y(d.a)).y1(d => y(d.b));
    g.append('path').datum(rows).attr('d', areaWarmer).attr('fill', C.periodB).attr('opacity', 0.18);
    g.append('path').datum(rows).attr('d', areaCooler).attr('fill', C.periodA).attr('opacity', 0.18);

    const line = d3.line().defined(d => d[1] !== null).x(d => x(d[0])).y(d => y(d[1]));
    for (const [period, color] of [[pa, C.periodA], [pb, C.periodB]]) {
      g.append('path')
        .datum(period.daily_series.map((v, i) => [i + 1, v]))
        .attr('d', line).attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2.5);
    }
  };

  // Variables whose main chart is monthly bars (sunshine): period_a vs
  // period_b as a grouped bar pair per month.
  const renderCompareBars = (svg, pa, pb, config, W, H) => {
    const M = { top: 46, right: 12, bottom: 28, left: 40 };
    const innerW = W - M.left - M.right;
    const innerH = H - M.top - M.bottom;

    const monthLabels = t('months');
    const sumsA = monthlySumsFromDaily(pa.daily_series);
    const sumsB = monthlySumsFromDaily(pb.daily_series);
    const x = d3.scaleBand().domain(monthLabels).range([0, innerW]).paddingInner(0.35).paddingOuter(0.1);
    const xSub = d3.scaleBand().domain(['a', 'b']).range([0, x.bandwidth()]).padding(0.12);

    const allVals = sumsA.concat(sumsB).filter(v => v !== null);
    const maxV = allVals.length ? Math.max(...allVals) : 1;
    const yMin = config.yMin !== null ? config.yMin : 0;
    const y = d3.scaleLinear().domain([yMin, maxV || 1]).nice().range([innerH, 0]);

    const g = svg.append('g').attr('transform', `translate(${M.left},${M.top})`);
    const every = innerW < 420 ? 2 : 1;
    g.append('g').attr('class', 'axis month-axis').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickValues(monthLabels.filter((d, i) => i % every === 0)));
    g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(5).tickFormat(d => KIS.tick(d)));
    // the unit stands above the y-axis, as in the main charts
    g.append('text').attr('class', 'axis-unit-label').attr('x', 0).attr('y', -8).attr('text-anchor', 'middle').text(config.axisUnit);

    const rows = monthLabels.map((month, i) => ({ month, a: sumsA[i], b: sumsB[i] }));
    const groups = g.selectAll('g.compare-month-group')
      .data(rows, d => d.month)
      .join('g')
      .attr('class', 'compare-month-group')
      .attr('transform', d => `translate(${x(d.month)},0)`);

    groups.each(function (d) {
      const bars = [
        { key: 'a', val: d.a, color: C.periodA },
        { key: 'b', val: d.b, color: C.periodB }
      ].filter(b => b.val !== null);
      d3.select(this).selectAll('rect').data(bars, b => b.key).join('rect')
        .attr('x', b => xSub(b.key))
        .attr('width', xSub.bandwidth())
        .attr('y', b => y(b.val))
        .attr('height', b => innerH - y(b.val))
        .attr('fill', b => b.color);
    });
  };


  // ---- start ----------------------------------------------------------------
  const main = async () => {
    createPlots();
    setView(viewFromHash());
    window.addEventListener('hashchange', () => setView(viewFromHash()));
    renderSeasonToggle();

    [state.stations, state.ranges] = await Promise.all([
      KIS.loadStations(),
      KIS.loadJSON('data/processed/annual_ranges.json')
    ]);
    KIS.fillStationSelect(el.stationSelect, state.stations);

    el.stationSelect.addEventListener('change', () => { firstTouch(); load(el.stationSelect.value, state.variable); });
    el.variableSelect.addEventListener('change', () => { firstTouch(); load(state.stationId, el.variableSelect.value); });
    el.periodSelect.addEventListener('change', () => { firstTouch(); state.period = el.periodSelect.value; refresh(); });
    el.slider.addEventListener('input', () => { firstTouch(); stopPlaying(); setYearIndex(+el.slider.value); });
    el.playBtn.addEventListener('click', () => {
      firstTouch();
      if (state.playTimer) stopPlaying(); else startPlaying();
    });
    el.prevBtn.addEventListener('click', () => stepYear(-1));
    el.nextBtn.addEventListener('click', () => stepYear(1));
    // the comparison sits in a collapsed topic: draw it at its real width once it opens
    el.climateTopic.addEventListener('toggle', () => { if (el.climateTopic.open && state.data) renderCompare(state.data); });
    window.addEventListener('resize', KIS.debounce(() => { if (state.data && el.climateTopic.open) renderCompare(state.data); }, 200));

    const start = state.stations.find(s => s.station_id === KIS.DEFAULT_STATION_ID) || state.stations[0];
    await load(start.station_id, state.variable);
  };

  main().catch(e => console.error(e));
  setupQuiz().catch(e => console.error(e));
})();
