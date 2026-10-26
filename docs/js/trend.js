// Page "Klimatrend" (trend.html): annual bars with a 10-year moving average,
// or the distribution of daily values (bell curve) for one year against the
// reference period, by season, with play controls next to the year slider. Tasks
// dialog and topics.
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
    distPlayTimer: null
  };

  const el = {
    variableSelect: $('trend-variable-select'),
    select: $('trend-station-select'),
    frame: $('stage-frame'),
    chart: $('trend-chart'),
    tooltip: $('trend-tooltip'),
    modeToggle: $('trend-mode-toggle'),
    periodSelect: $('trend-period-select'),
    topicChart: $('topic-chart'),
    seasonGroup: $('dist-season-group'),
    seasonToggle: $('dist-season-toggle'),
    annualWrap: $('trend-annual-wrap'),
    distWrap: $('trend-distribution-wrap'),
    distTimelineWrap: $('dist-timeline-wrap'),
    distChart: $('distribution-chart'),
    distributionYear: $('distribution-year'),
    distributionStationLabel: $('distribution-station-label'),
    distributionDev: $('distribution-dev'),
    distSlider: $('dist-year-slider'),
    distYearStart: $('dist-year-start'),
    distYearEnd: $('dist-year-end'),
    distPlayBtn: $('dist-play-btn'),
    distPrevBtn: $('dist-prev-btn'),
    distNextBtn: $('dist-next-btn')
  };

  const SEASON_KEYS = ['full', 'winter', 'spring', 'summer', 'autumn'];
  const seasonLabel = () => (state.season === 'full' ? null : t('trend.seasons.' + state.season));

  // ---- first interaction: the play button stops glowing ---------------------
  const firstTouch = () => el.distPlayBtn.classList.remove('pulse');
  const onAnnualYear = () => {};

  // ---- tasks dialog: questions about Frankfurt/Main --------------------------
  const setupQuiz = async () => {
    KIS.wireDialog($('tasks-open'), $('tasks-dialog'), $('tasks-close'));
    const id = KIS.DEFAULT_STATION_ID;
    const [temp, rain] = await Promise.all([
      KIS.loadJSON(`data/processed/temperature/${id}.json`),
      KIS.loadJSON(`data/processed/precipitation/${id}.json`)
    ]);
    const name = temp.meta.name;
    const am = temp.annual_metric;
    const pa = temp.period_a.mean_annual_metric;
    const items = [];
    const lastTen = temp.years.slice(-10).filter(y => am[y] !== undefined);
    if (pa !== null && lastTen.length) {
      items.push({
        key: 'trend.quiz.lastTen', args: [name, lastTen[0], lastTen[lastTen.length - 1]],
        answer: lastTen.filter(y => am[y] > pa).length, digits: 0, tolerance: 0
      });
    }
    const coldest = Object.keys(am).reduce((best, y) => (best === null || am[y] < am[best] ? y : best), null);
    if (coldest) items.push({ key: 'trend.quiz.coldest', args: [name], answer: +coldest, digits: 0, tolerance: 0 });
    if (rain.annual_metric['2018'] !== undefined) {
      items.push({ key: 'trend.quiz.rain2018', args: [name], answer: rain.annual_metric['2018'], digits: 0, tolerance: 5 });
    }
    KIS.quiz($('quiz'), $('quiz-progress'), items);
  };

  const main = async () => {
    state.stations = await KIS.loadStations();
    KIS.fillStationSelect(el.select, state.stations);

    state.annualPlot = window.AnnualTrendPlot.create({
      svgEl: el.chart,
      tooltipEl: el.tooltip,
      onYear: onAnnualYear
    });
    state.distPlot = window.DistributionPlot.create({ svgEl: el.distChart, onYearStats: showDistDeviation });
    renderModeToggle();
    renderSeasonToggle();
    setupDistTimeline();
    el.periodSelect.addEventListener('change', () => setActivePeriod(el.periodSelect.value));

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

    KIS.fillPeriodSelect(el.periodSelect, data, state.activePeriod);
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
    el.tooltip.hidden = true;
    el.seasonGroup.hidden = !isDist;
    el.distTimelineWrap.hidden = !isDist;
    el.distWrap.hidden = !isDist;
    if (state.currentData) updateCaption();
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

  const setActivePeriod = key => {
    firstTouch();
    if (state.activePeriod === key) return;
    state.activePeriod = key;
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
      activePeriod: state.activePeriod,
      formatValue: config.formatValue,
      formatDiff: config.formatDiff,
      incompleteLabel: config.incompleteLabel
    });
    updateCaption();
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
      aggregate: config.aggregate,
      activePeriod: state.activePeriod,
      season: state.season,
      formatValue: config.formatValue,
      preserveYear: !!preserveYear
    });
    const years = data.years;
    const idx = preserveYear ? Math.min(+el.distSlider.value, years.length - 1) : years.length - 1;
    el.distSlider.value = idx;
    updateDistYearBadge(years[idx]);
    updateCaption();
  }

  const updateDistYearBadge = year => {
    el.distributionYear.textContent = year || t('dash');
    el.distributionStationLabel.textContent = t('trend.badgeSub', seasonLabel(), state.currentData.meta.name);
  };

  // The explanation of the current view lives in the topic "Was sehe ich auf dem Diagramm?" below.
  const updateCaption = () => {
    const period = state.currentData[state.activePeriod];
    let html;
    if (period.mean_annual_metric === null || period.mean_annual_metric === undefined) {
      html = t('common.periodTooFewYears');
    } else if (state.chartType === 'distribution') {
      html = t('trend.distributionCaption', seasonLabel(), period.start, period.end);
      if (state.season === 'full' && state.currentVariable === 'temperature') html += t('trend.bimodalNote');
    } else {
      html = t('trend.annualCaption');
    }
    el.topicChart.innerHTML = `<p>${html}</p>`;
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

  // Deviation of the shown year (or season) from the reference period, under the year.
  const showDistDeviation = stats => {
    const config = VARIABLE_CONFIG[state.currentVariable];
    const period = state.currentData[state.activePeriod];
    if (!stats || stats.diff === null) {
      el.distributionDev.textContent = stats ? config.incompleteLabel : '';
      el.distributionDev.style.color = '';
      return;
    }
    el.distributionDev.textContent = t('trend.distDeviation', config.formatDiff(stats.diff), period.start, period.end);
    el.distributionDev.style.color = stats.diff > 0 ? config.aboveColor : stats.diff < 0 ? config.belowColor : '';
  };

  const setupDistTimeline = () => {
    el.distSlider.addEventListener('input', () => {
      stopDistPlaying();
      showDistYear(+el.distSlider.value);
    });
    el.distPlayBtn.addEventListener('click', () => {
      firstTouch();
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
    KIS.setPlaying(el.distPlayBtn, true);
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
    KIS.setPlaying(el.distPlayBtn, false);
  }

  updateChartVisibility();
  main().catch(e => console.error(e));
  setupQuiz().catch(e => console.error(e));
})();
