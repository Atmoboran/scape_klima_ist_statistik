// Page "Tagesverlauf" (index.html): pickers, readout, chart (one line per
// year, or monthly bars for sunshine), reference period, timeline with play
// controls inside the chart, the tasks dialog, the period comparison chart
// and the topics below.
(() => {
  'use strict';

  const KIS = window.KIS;
  const VARIABLE_CONFIG = window.VARIABLE_CONFIG;
  const C = window.THEME.klimastatistik;
  const $ = id => document.getElementById(id);

  const state = {
    stations: [],
    currentStationId: null,
    currentVariable: 'temperature',
    currentData: null,
    activePeriod: 'period_a',
    annualDiffScale: null,
    plot: null,
    plotMode: 'line',
    playTimer: null
  };

  const el = {
    variableSelect: $('variable-select'),
    select: $('station-select'),
    frame: $('stage-frame'),
    chart: $('chart'),
    chartBar: $('chart-bar'),
    tooltip: $('tooltip'),
    legendLabelCold: $('legend-label-cold'),
    legendLabelWarm: $('legend-label-warm'),
    legendGradient: $('legend-gradient'),
    periodSelect: $('period-select'),
    deviationYear: $('deviation-year'),
    deviationMean: $('deviation-mean'),
    statLabelMean: $('stat-label-mean'),
    deviationValue: $('deviation-value'),
    colorbarPeriodLabel: $('colorbar-period-label'),
    colorbarRow: $('colorbar-row'),
    barLegendRow: $('bar-legend-row'),
    barLegendYearSwatch: $('bar-legend-year-swatch'),
    barLegendYearLabel: $('bar-legend-year-label'),
    barLegendPeriodSwatch: $('bar-legend-period-swatch'),
    barLegendPeriodLabel: $('bar-legend-period-label'),
    timelineYearStart: $('timeline-year-start'),
    timelineYearEnd: $('timeline-year-end'),
    slider: $('year-slider'),
    playBtn: $('play-btn'),
    prevYearBtn: $('prev-year-btn'),
    nextYearBtn: $('next-year-btn'),
    compare: $('compare'),
    compareTitle: $('compare-title'),
    compareHeadline: $('compare-headline'),
    compareLegend: $('compare-legend'),
    compareChart: $('compare-chart')
  };

  // ---- first interaction: the play button stops glowing ---------------------
  const firstTouch = () => el.playBtn.classList.remove('pulse');

  // ---- tasks dialog: questions about Frankfurt/Main temperature --------------
  const setupQuiz = async () => {
    KIS.wireDialog($('tasks-open'), $('tasks-dialog'), $('tasks-close'));
    const data = await KIS.loadJSON(`data/processed/temperature/${KIS.DEFAULT_STATION_ID}.json`);
    const am = data.annual_metric;
    const pa = data.period_a.mean_annual_metric;
    const pb = data.period_b.mean_annual_metric;
    const name = data.meta.name;
    const items = [];
    if (am['2003'] !== undefined && pa !== null) {
      items.push({ key: 'daily.quiz.dev2003', args: [name], answer: am['2003'] - pa, digits: 1, tolerance: 0.1, signed: true });
    }
    const warmest = Object.keys(am).reduce((best, y) => (best === null || am[y] > am[best] ? y : best), null);
    if (warmest) items.push({ key: 'daily.quiz.warmest', args: [name], answer: +warmest, digits: 0, tolerance: 0 });
    if (pa !== null && pb !== null) {
      items.push({ key: 'daily.quiz.periods', args: [name], answer: pb - pa, digits: 1, tolerance: 0.1 });
    }
    KIS.quiz($('quiz'), $('quiz-progress'), items);
  };

  // Sums a 365-entry daily series into 12 monthly totals (null when a month
  // has no valid days at all) - used by the comparison chart for variables
  // (sunshine) whose main chart is monthly bars, not lines.
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

  const renderOptions = (config, extra) => Object.assign({
    colorStops: config.colorStops,
    axisSuffix: config.axisSuffix,
    axisUnit: config.axisUnit,
    digits: config.digits,
    maxAbsDev: config.maxAbsDev,
    yMin: config.yMin,
    aboveColor: config.aboveColor,
    belowColor: config.belowColor,
    formatDayTooltip: config.formatDayTooltip,
    formatMonthTooltip: config.formatMonthTooltip,
    activePeriod: state.activePeriod
  }, extra || {});

  const main = async () => {
    state.stations = await KIS.loadStations();
    KIS.fillStationSelect(el.select, state.stations);

    state.spaghettiPlot = window.SpaghettiPlot.create({
      svgEl: el.chart,
      tooltipEl: el.tooltip,
      onColorScaleReady: renderLegend,
      onPointer: firstTouch
    });
    state.barPlot = window.MonthlyBarPlot.create({
      svgEl: el.chartBar,
      tooltipEl: el.tooltip,
      onPointer: firstTouch
    });
    state.plot = state.spaghettiPlot;

    el.select.addEventListener('change', () => {
      firstTouch();
      loadAndRender(el.select.value, state.currentVariable);
    });
    el.variableSelect.addEventListener('change', () => {
      firstTouch();
      loadAndRender(state.currentStationId, el.variableSelect.value);
    });
    el.slider.addEventListener('input', () => {
      firstTouch();
      stopPlaying();
      const year = state.currentData.years[+el.slider.value];
      showYear(year);
    });
    el.periodSelect.addEventListener('change', () => {
      firstTouch();
      setActivePeriod(el.periodSelect.value);
    });
    el.playBtn.addEventListener('click', () => {
      firstTouch();
      if (state.playTimer) stopPlaying();
      else startPlaying();
    });
    el.prevYearBtn.addEventListener('click', () => stepYear(-1));
    el.nextYearBtn.addEventListener('click', () => stepYear(1));
    window.addEventListener('resize', KIS.debounce(() => {
      if (state.currentData) renderCompare(state.currentData);
    }, 200));

    const defaultStation = state.stations.find(s => s.station_id === KIS.DEFAULT_STATION_ID) || state.stations[0];
    await loadAndRender(defaultStation.station_id, state.currentVariable);
  };

  const loadAndRender = async (stationId, variableKey) => {
    stopPlaying();
    state.currentStationId = stationId;
    state.currentVariable = variableKey;
    el.select.value = stationId;
    el.variableSelect.value = variableKey;

    const data = await KIS.loadJSON(`data/processed/${variableKey}/${stationId}.json`);
    state.currentData = data;
    const config = VARIABLE_CONFIG[variableKey];

    const mode = config.chartType === 'bar' ? 'bar' : 'line';
    state.plotMode = mode;
    state.plot = mode === 'bar' ? state.barPlot : state.spaghettiPlot;
    // SVG elements have no .hidden property - toggle the attribute
    el.chart.toggleAttribute('hidden', mode === 'bar');
    el.chartBar.toggleAttribute('hidden', mode !== 'bar');
    el.colorbarRow.hidden = mode === 'bar';
    el.barLegendRow.hidden = mode !== 'bar';
    (mode === 'bar' ? el.chartBar : el.chart).setAttribute('aria-label', config.chartAriaLabel);
    el.statLabelMean.textContent = config.valueLabel;
    el.legendLabelCold.textContent = config.legendCold;
    el.legendLabelWarm.textContent = config.legendWarm;
    KIS.fillVariableNotes(config);
    KIS.fillStationNote(data);

    state.annualDiffScale = buildAnnualDiffScale(data, state.activePeriod, config.colorStops);
    state.plot.render(data, renderOptions(config));
    renderPeriodLegend(data);
    renderBarLegend(data, config);
    setupTimeline(data);
    renderCompare(data);
  };

  const renderBarLegend = (data, config) => {
    if (state.plotMode !== 'bar') return;
    el.barLegendYearSwatch.style.background = config.aboveColor;
    el.barLegendYearLabel.textContent = t('daily.barLegendYear');
    el.barLegendPeriodSwatch.style.background = C.periodBar;
    const period = data[state.activePeriod];
    el.barLegendPeriodLabel.textContent = t('daily.barLegendPeriod', period.start, period.end);
  };

  // A symmetric diverging scale over how far each complete year's annual
  // metric sits from the active reference period's mean - drives the colour
  // of the deviation figure so it reflects magnitude, not just sign.
  const buildAnnualDiffScale = (data, activePeriodKey, colorStops) => {
    const baselineMean = data[activePeriodKey].mean_annual_metric;
    if (baselineMean === null || baselineMean === undefined) return null;
    const diffs = Object.values(data.annual_metric).map(v => v - baselineMean);
    if (!diffs.length) return null;
    const maxAbs = Math.max(...diffs.map(Math.abs)) || 1;
    return d3.scaleLinear().domain([-maxAbs, 0, maxAbs]).range(colorStops).interpolate(d3.interpolateRgb).clamp(true);
  };

  function renderLegend(colorScale, minAmt, maxAmt) {
    const width = 44;
    const height = 8;
    el.legendGradient.setAttribute('viewBox', `0 0 ${width} ${height}`);
    el.legendGradient.innerHTML = '';
    const svg = d3.select(el.legendGradient);
    const gradId = 'legend-grad';
    const grad = svg.append('defs').append('linearGradient').attr('id', gradId).attr('x1', '0%').attr('x2', '100%');
    const stopCount = 12;
    for (let i = 0; i <= stopCount; i++) {
      const f = i / stopCount;
      grad.append('stop').attr('offset', `${f * 100}%`).attr('stop-color', colorScale(minAmt + f * (maxAmt - minAmt)));
    }
    svg.append('rect').attr('width', width).attr('height', height).attr('fill', `url(#${gradId})`);
  }

  const renderPeriodLegend = data => {
    KIS.fillPeriodSelect(el.periodSelect, data, state.activePeriod);
    const active = data[state.activePeriod];
    el.colorbarPeriodLabel.textContent = `${active.start}–${active.end}`;
  };

  const setActivePeriod = key => {
    if (state.activePeriod === key) return;
    state.activePeriod = key;
    const data = state.currentData;
    const config = VARIABLE_CONFIG[state.currentVariable];
    state.annualDiffScale = buildAnnualDiffScale(data, state.activePeriod, config.colorStops);
    state.plot.render(data, renderOptions(config, { preserveYear: true }));
    renderPeriodLegend(data);
    renderBarLegend(data, config);
    updateReadout(data.years[+el.slider.value]);
  };

  const showYear = year => {
    state.plot.setYear(year);
    updateReadout(year);
  };

  const setupTimeline = data => {
    const years = data.years;
    el.timelineYearStart.textContent = years[0];
    el.timelineYearEnd.textContent = years[years.length - 1];
    el.slider.min = 0;
    el.slider.max = years.length - 1;
    el.slider.value = years.length - 1;
    updateReadout(years[years.length - 1]);
  };

  const stepYear = delta => {
    firstTouch();
    stopPlaying();
    const years = state.currentData.years;
    const idx = Math.min(years.length - 1, Math.max(0, +el.slider.value + delta));
    el.slider.value = idx;
    showYear(years[idx]);
  };

  const setDeviation = (diff, config) => {
    if (diff === null || diff === undefined) {
      el.deviationValue.textContent = t('dash');
      el.deviationValue.style.color = '';
      return;
    }
    el.deviationValue.textContent = config.formatDiff(diff);
    el.deviationValue.style.color = state.annualDiffScale
      ? state.annualDiffScale(diff)
      : diff >= 0 ? config.aboveColor : config.belowColor;
  };

  const updateReadout = year => {
    const data = state.currentData;
    const config = VARIABLE_CONFIG[state.currentVariable];
    const period = data[state.activePeriod];
    el.deviationYear.textContent = year || t('dash');
    if (!year) {
      el.deviationMean.textContent = t('dash');
      setDeviation(null, config);
      return;
    }
    const amt = data.annual_metric[year];
    const baseline = period.mean_annual_metric;
    if (amt === undefined) {
      el.deviationMean.textContent = config.incompleteLabel;
      setDeviation(null, config);
      return;
    }
    el.deviationMean.textContent = config.formatValue(amt);
    setDeviation(baseline === null || baseline === undefined ? null : amt - baseline, config);
  };

  const startPlaying = () => {
    const years = state.currentData.years;
    KIS.setPlaying(el.playBtn, true);
    let idx = +el.slider.value;
    state.playTimer = setInterval(() => {
      idx = (idx + 1) % years.length;
      el.slider.value = idx;
      showYear(years[idx]);
    }, 550);
  };

  function stopPlaying() {
    if (state.playTimer) {
      clearInterval(state.playTimer);
      state.playTimer = null;
    }
    KIS.setPlaying(el.playBtn, false);
  }

  // ---- period comparison chart (full width below the lab) -------------------
  const renderCompare = data => {
    const meta = data.meta;
    const pa = data.period_a;
    const pb = data.period_b;
    const config = VARIABLE_CONFIG[state.currentVariable];

    el.compareTitle.textContent = t('daily.compareTitle', meta.name);
    const svg = d3.select(el.compareChart);
    svg.selectAll('*').remove();

    if (pa.mean_annual_metric === null || pb.mean_annual_metric === null) {
      const missing = pa.mean_annual_metric === null ? pa : pb;
      el.compareHeadline.textContent = t('daily.compareTooFewYears', missing.start, missing.end);
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
    const W = Math.max(300, el.compareChart.clientWidth || el.compare.clientWidth || 800);
    const H = Math.round(Math.max(220, Math.min(360, W * 0.4)));
    svg.attr('viewBox', `0 0 ${W} ${H}`).attr('height', H);
    if (isBar) renderCompareBars(svg, pa, pb, config, W, H);
    else renderCompareLines(svg, pa, pb, config, W, H);
  };

  // Variables whose main chart is a daily line (temperature, precipitation):
  // period_a vs period_b as two lines over the day of year, gap shaded.
  const renderCompareLines = (svg, pa, pb, config, W, H) => {
    const M = { top: 16, right: 16, bottom: 34, left: 52 };
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
    g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(5).tickFormat(d => KIS.tick(d) + config.axisSuffix));

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
    const M = { top: 16, right: 16, bottom: 34, left: 56 };
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
    g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(5).tickFormat(d => KIS.tick(d) + config.axisSuffix));

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

  main().catch(e => console.error(e));
  setupQuiz().catch(e => console.error(e));
})();
