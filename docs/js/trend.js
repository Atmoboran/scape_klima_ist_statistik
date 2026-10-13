// Page "Klimatrend" (trend.html): annual bars with a 10-year moving average,
// or the distribution of daily values (bell curve) for one year against the
// reference period, by season, with its own timeline. Tasks and topics.
(() => {
  'use strict';

  const KIS = window.KIS;
  const VARIABLE_CONFIG = window.VARIABLE_CONFIG;
  const $ = id => document.getElementById(id);

  const state = {
    stations: [],
    currentStationId: null,
    currentVariable: 'temperature',
    currentData: null,
    activePeriod: 'period_a',
    chartType: 'annual', // "annual" (per-year bars) or "distribution" (bell-curve shift)
    season: 'full', // "full" | "winter" | "spring" | "summer" | "autumn" - distribution only
    annualPlot: null,
    distPlot: null,
    distPlayTimer: null,
    seenEarly: false, // tasks: a year before 1970 / after 2010 seen in the distribution view
    seenLate: false
  };

  const el = {
    variableSelect: $('trend-variable-select'),
    select: $('trend-station-select'),
    frame: $('stage-frame'),
    chart: $('trend-chart'),
    tooltip: $('trend-tooltip'),
    modeToggle: $('trend-mode-toggle'),
    periodToggle: $('trend-period-toggle'),
    caption: $('trend-caption'),
    seasonGroup: $('dist-season-group'),
    seasonToggle: $('dist-season-toggle'),
    annualWrap: $('trend-annual-wrap'),
    distWrap: $('trend-distribution-wrap'),
    distTimelineWrap: $('dist-timeline-wrap'),
    distCaption: $('dist-caption'),
    distChart: $('distribution-chart'),
    distributionYear: $('distribution-year'),
    distributionStationLabel: $('distribution-station-label'),
    distSlider: $('dist-year-slider'),
    distYearStart: $('dist-year-start'),
    distYearEnd: $('dist-year-end'),
    distPlayBtn: $('dist-play-btn'),
    distPlayLabel: $('dist-play-label'),
    distPrevBtn: $('dist-prev-btn'),
    distNextBtn: $('dist-next-btn')
  };

  const SEASON_KEYS = ['full', 'winter', 'spring', 'summer', 'autumn'];
  const seasonLabel = () => (state.season === 'full' ? null : t('trend.seasons.' + state.season));

  // ---- first hint + tasks ---------------------------------------------------
  const hintBadge = window.SCAPE.badge(el.frame);
  hintBadge.show(t('trend.badge'));
  const firstTouch = () => hintBadge.hide();

  const tasks = window.SCAPE.tasks($('trend-tasks'));
  const warmestYear = () => {
    const am = state.currentData.annual_metric;
    return Object.keys(am).reduce((best, y) => (best === null || am[y] > am[best] ? y : best), null);
  };
  const onAnnualYear = (year, type) => {
    if (type === 'pointerdown') firstTouch();
    if (state.currentVariable !== 'temperature') return;
    if (String(year) === warmestYear() && tasks.done('warmest')) KIS.status(t('trend.tasks.doneWarmest', year));
  };
  const noteDistYear = year => {
    if (state.chartType !== 'distribution' || state.currentVariable !== 'temperature' || !year) return;
    if (year < 1970) state.seenEarly = true;
    if (year > 2010) state.seenLate = true;
    if (state.seenEarly && state.seenLate && tasks.done('dist')) KIS.status(t('trend.tasks.doneDist'));
  };

  const main = async () => {
    state.stations = await KIS.loadStations();
    KIS.fillStationSelect(el.select, state.stations);

    state.annualPlot = window.AnnualTrendPlot.create({
      svgEl: el.chart,
      tooltipEl: el.tooltip,
      onYear: onAnnualYear
    });
    state.distPlot = window.DistributionPlot.create({ svgEl: el.distChart });
    renderModeToggle();
    renderSeasonToggle();
    setupDistTimeline();

    el.select.addEventListener('change', () => {
      firstTouch();
      loadAndRender(el.select.value, state.currentVariable);
    });
    el.variableSelect.addEventListener('change', () => {
      firstTouch();
      loadAndRender(state.currentStationId, el.variableSelect.value);
    });

    const defaultStation = state.stations.find(s => s.station_id === KIS.DEFAULT_STATION_ID) || state.stations[0];
    await loadAndRender(defaultStation.station_id, state.currentVariable);
  };

  const loadAndRender = async (stationId, variableKey) => {
    stopDistPlaying();
    state.currentStationId = stationId;
    state.currentVariable = variableKey;
    el.select.value = stationId;
    el.variableSelect.value = variableKey;

    const data = await KIS.loadJSON(`data/processed/${variableKey}/${stationId}.json`);
    state.currentData = data;
    const config = VARIABLE_CONFIG[variableKey];

    el.chart.setAttribute('aria-label', t('trend.annualAria', config.label, data.years[0], data.years[data.years.length - 1]));
    el.distChart.setAttribute('aria-label', t('trend.distributionAria', config.label));
    KIS.fillVariableNotes(config);
    KIS.fillStationNote(data);

    renderPeriodToggle(data);
    setupDistYearBounds(data);
    renderAnnual();
    renderDistribution();
  };

  const renderModeToggle = () => {
    const items = ['annual', 'distribution'].map(key => ({ key, label: t('trend.modes.' + key) }));
    KIS.fillSeg(el.modeToggle, items, state.chartType, setChartType);
  };

  const setChartType = type => {
    firstTouch();
    if (state.chartType === type) return;
    if (type !== 'distribution') stopDistPlaying();
    state.chartType = type;
    renderModeToggle();
    updateChartVisibility();
    if (type === 'distribution') {
      // the chart was hidden while it was drawn last; draw it at its real size now
      renderDistribution(true);
    } else {
      renderAnnual();
    }
  };

  const updateChartVisibility = () => {
    const isDist = state.chartType === 'distribution';
    el.annualWrap.hidden = isDist;
    el.caption.hidden = isDist;
    el.tooltip.hidden = true;
    el.seasonGroup.hidden = !isDist;
    el.distTimelineWrap.hidden = !isDist;
    el.distWrap.hidden = !isDist;
    el.distCaption.hidden = !isDist;
  };

  const renderSeasonToggle = () => {
    const items = SEASON_KEYS.map(key => ({ key, label: t('trend.seasons.' + key) }));
    KIS.fillSeg(el.seasonToggle, items, state.season, setSeason);
  };

  const setSeason = key => {
    if (state.season === key) return;
    state.season = key;
    renderSeasonToggle();
    renderDistribution(true);
  };

  const renderPeriodToggle = data => {
    const items = ['period_a', 'period_b'].map(key => ({ key, label: `${data[key].start}–${data[key].end}` }));
    KIS.fillSeg(el.periodToggle, items, state.activePeriod, setActivePeriod);
  };

  const setActivePeriod = key => {
    firstTouch();
    if (state.activePeriod === key) return;
    state.activePeriod = key;
    renderPeriodToggle(state.currentData);
    renderAnnual();
    renderDistribution(true);
  };

  const renderAnnual = () => {
    const data = state.currentData;
    const config = VARIABLE_CONFIG[state.currentVariable];
    state.annualPlot.render(data, {
      colorStops: config.colorStops,
      axisSuffix: config.axisSuffix,
      axisUnit: config.axisUnit,
      yMin: config.yMin,
      activePeriod: state.activePeriod,
      formatValue: config.formatValue,
      formatDiff: config.formatDiff,
      incompleteLabel: config.incompleteLabel
    });
    const period = data[state.activePeriod];
    const tooFewYears = period.mean_annual_metric === null || period.mean_annual_metric === undefined;
    el.caption.innerHTML = tooFewYears ? t('common.periodTooFewYears') : t('trend.annualCaption');
  };

  // preserveYear: keep the year the distribution timeline is scrubbed to
  // (used when only the reference period or season changes).
  function renderDistribution(preserveYear) {
    const data = state.currentData;
    const config = VARIABLE_CONFIG[state.currentVariable];
    state.distPlot.render(data, {
      colorStops: config.colorStops,
      axisSuffix: config.axisSuffix,
      axisUnit: config.axisUnit,
      dailyIsCumulative: !!config.dailyIsCumulative,
      activePeriod: state.activePeriod,
      season: state.season,
      formatValue: config.formatValue,
      preserveYear: !!preserveYear
    });
    const years = data.years;
    const idx = preserveYear ? Math.min(+el.distSlider.value, years.length - 1) : years.length - 1;
    el.distSlider.value = idx;
    updateDistYearBadge(years[idx]);
    updateDistCaption(data);
  }

  const updateDistYearBadge = year => {
    el.distributionYear.textContent = year || t('dash');
    el.distributionStationLabel.textContent = t('trend.badgeSub', seasonLabel(), state.currentData.meta.name);
    noteDistYear(year);
  };

  const updateDistCaption = data => {
    const period = data[state.activePeriod];
    if (period.mean_annual_metric === null || period.mean_annual_metric === undefined) {
      el.distCaption.innerHTML = t('common.periodTooFewYears');
      return;
    }
    let html = t('trend.distributionCaption', seasonLabel(), period.start, period.end);
    if (state.season === 'full' && state.currentVariable === 'temperature') html += t('trend.bimodalNote');
    el.distCaption.innerHTML = html;
  };

  const setupDistYearBounds = data => {
    const years = data.years;
    el.distYearStart.textContent = years[0];
    el.distYearEnd.textContent = years[years.length - 1];
    el.distSlider.min = 0;
    el.distSlider.max = years.length - 1;
    el.distSlider.value = years.length - 1;
  };

  const showDistYear = idx => {
    const year = state.currentData.years[idx];
    el.distSlider.value = idx;
    state.distPlot.setYear(year);
    updateDistYearBadge(year);
  };

  const setupDistTimeline = () => {
    el.distSlider.addEventListener('input', () => {
      stopDistPlaying();
      showDistYear(+el.distSlider.value);
    });
    el.distPlayBtn.addEventListener('click', () => {
      if (state.distPlayTimer) stopDistPlaying();
      else startDistPlaying();
    });
    el.distPrevBtn.addEventListener('click', () => stepDistYear(-1));
    el.distNextBtn.addEventListener('click', () => stepDistYear(1));
  };

  const stepDistYear = delta => {
    stopDistPlaying();
    const years = state.currentData.years;
    showDistYear(Math.min(years.length - 1, Math.max(0, +el.distSlider.value + delta)));
  };

  const startDistPlaying = () => {
    const years = state.currentData.years;
    KIS.setPlaying(el.distPlayBtn, el.distPlayLabel, true);
    let idx = +el.distSlider.value;
    state.distPlayTimer = setInterval(() => {
      idx = (idx + 1) % years.length;
      showDistYear(idx);
    }, 550);
  };

  function stopDistPlaying() {
    if (state.distPlayTimer) {
      clearInterval(state.distPlayTimer);
      state.distPlayTimer = null;
    }
    KIS.setPlaying(el.distPlayBtn, el.distPlayLabel, false);
  }

  updateChartVisibility();
  main().catch(e => console.error(e));
})();
