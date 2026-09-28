(function () {
  "use strict";

  const state = {
    stations: [],
    currentStationId: null,
    currentVariable: "temperature",
    currentData: null,
    activePeriod: "period_a",
    chartType: "annual", // "annual" (per-year bar chart) or "distribution" (bell-curve shift)
    season: "full", // "full" | "winter" | "spring" | "summer" | "autumn" - distribution mode only
    annualPlot: null,
    distPlot: null,
    distPlayTimer: null,
  };

  const el = {
    variableSelect: document.getElementById("trend-variable-select"),
    select: document.getElementById("trend-station-select"),
    chart: document.getElementById("trend-chart"),
    tooltip: document.getElementById("trend-tooltip"),
    modeToggle: document.getElementById("trend-mode-toggle"),
    periodToggle: document.getElementById("trend-period-toggle"),
    caption: document.getElementById("trend-caption"),
    seasonGroup: document.getElementById("dist-season-group"),
    seasonToggle: document.getElementById("dist-season-toggle"),
    annualWrap: document.getElementById("trend-annual-wrap"),
    distWrap: document.getElementById("trend-distribution-wrap"),
    distTimelineWrap: document.getElementById("dist-timeline-wrap"),
    distCaption: document.getElementById("dist-caption"),
    distChart: document.getElementById("distribution-chart"),
    distributionYear: document.getElementById("distribution-year"),
    distributionStationLabel: document.getElementById("distribution-station-label"),
    distSlider: document.getElementById("dist-year-slider"),
    distYearStart: document.getElementById("dist-year-start"),
    distYearEnd: document.getElementById("dist-year-end"),
    distPlayBtn: document.getElementById("dist-play-btn"),
    distPrevBtn: document.getElementById("dist-prev-btn"),
    distNextBtn: document.getElementById("dist-next-btn"),
    viewToggle: document.getElementById("view-toggle"),
  };

  const VARIABLE_CONFIG = window.VARIABLE_CONFIG;
  const DEFAULT_STATION_ID = "01420"; // Frankfurt/Main
  const VIEW_STORAGE_KEY = "scapeViewMode";
  const MOBILE_QUERY = "(max-width: 699px)";

  const SEASON_ITEMS = [
    { key: "full", label: "Jahr" },
    { key: "winter", label: "Winter" },
    { key: "spring", label: "Frühling" },
    { key: "summer", label: "Sommer" },
    { key: "autumn", label: "Herbst" },
  ];
  const SEASON_LABEL_BY_KEY = Object.fromEntries(SEASON_ITEMS.map((s) => [s.key, s.label]));

  function setViewMode(mode) {
    document.documentElement.setAttribute("data-view", mode);
    el.viewToggle.textContent = mode === "mobile" ? "Desktop-Ansicht" : "Mobile-Ansicht";
    el.viewToggle.setAttribute(
      "aria-label",
      mode === "mobile" ? "Zur Desktop-Ansicht wechseln" : "Zur Mobile-Ansicht wechseln"
    );
  }

  function setupViewToggle() {
    setViewMode(document.documentElement.getAttribute("data-view") || "mobile");

    el.viewToggle.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-view") === "mobile" ? "desktop" : "mobile";
      setViewMode(next);
      try {
        localStorage.setItem(VIEW_STORAGE_KEY, next);
      } catch (e) {}
    });

    const mql = window.matchMedia(MOBILE_QUERY);
    const onViewportChange = (e) => {
      let hasOverride = false;
      try {
        hasOverride = localStorage.getItem(VIEW_STORAGE_KEY) !== null;
      } catch (err) {}
      if (!hasOverride) setViewMode(e.matches ? "mobile" : "desktop");
    };
    if (mql.addEventListener) mql.addEventListener("change", onViewportChange);
  }

  async function main() {
    setupViewToggle();
    const res = await fetch("data/processed/stations_index.json");
    state.stations = await res.json();
    state.stations.sort((a, b) => a.name.localeCompare(b.name, "de"));
    buildStationOptions();

    state.annualPlot = window.AnnualTrendPlot.create({
      svgEl: el.chart,
      tooltipEl: el.tooltip,
    });
    state.distPlot = window.DistributionPlot.create({
      svgEl: el.distChart,
    });
    renderModeToggle();
    renderSeasonToggle();
    setupDistTimeline();

    el.select.addEventListener("change", () => loadAndRender(el.select.value, state.currentVariable));
    el.variableSelect.addEventListener("change", () => loadAndRender(state.currentStationId, el.variableSelect.value));

    const defaultStation = state.stations.find((s) => s.station_id === DEFAULT_STATION_ID) || state.stations[0];
    await loadAndRender(defaultStation.station_id, state.currentVariable);
  }

  function buildStationOptions() {
    el.select.innerHTML = "";
    for (const s of state.stations) {
      const opt = document.createElement("option");
      opt.value = s.station_id;
      opt.textContent = s.name;
      el.select.appendChild(opt);
    }
  }

  async function loadAndRender(stationId, variableKey) {
    stopDistPlaying();
    state.currentStationId = stationId;
    state.currentVariable = variableKey;
    el.select.value = stationId;
    el.variableSelect.value = variableKey;

    const res = await fetch(`data/processed/${variableKey}/${stationId}.json`);
    const data = await res.json();
    state.currentData = data;
    const config = VARIABLE_CONFIG[variableKey];

    el.chart.setAttribute(
      "aria-label",
      `${config.label} je Jahr im Vergleich zur Referenzperiode, ${data.years[0]}–${data.years[data.years.length - 1]}`
    );
    el.distChart.setAttribute(
      "aria-label",
      `Verteilung der Tageswerte (${config.label}) im Vergleich zur Referenzperiode`
    );

    renderPeriodToggle(data);
    setupDistYearBounds(data);
    renderAnnual();
    renderDistribution();
  }

  function renderModeToggle() {
    el.modeToggle.innerHTML = "";
    const items = [
      { key: "annual", label: "Jahresbalken" },
      { key: "distribution", label: "Verteilung" },
    ];
    for (const item of items) {
      const btn = document.createElement("button");
      btn.type = "button";
      const active = state.chartType === item.key;
      btn.className = `period-toggle-btn${active ? " active" : ""}`;
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      btn.textContent = item.label;
      btn.addEventListener("click", () => setChartType(item.key));
      el.modeToggle.appendChild(btn);
    }
  }

  function setChartType(type) {
    if (state.chartType === type) return;
    if (type !== "distribution") stopDistPlaying();
    state.chartType = type;
    renderModeToggle();
    updateChartVisibility();
  }

  function updateChartVisibility() {
    const isDist = state.chartType === "distribution";
    el.annualWrap.style.display = isDist ? "none" : "";
    el.caption.style.display = isDist ? "none" : "";
    el.seasonGroup.style.display = isDist ? "" : "none";
    el.distTimelineWrap.style.display = isDist ? "" : "none";
    el.distWrap.style.display = isDist ? "" : "none";
    el.distCaption.style.display = isDist ? "" : "none";
  }

  function renderSeasonToggle() {
    el.seasonToggle.innerHTML = "";
    for (const item of SEASON_ITEMS) {
      const btn = document.createElement("button");
      btn.type = "button";
      const active = state.season === item.key;
      btn.className = `period-toggle-btn${active ? " active" : ""}`;
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      btn.textContent = item.label;
      btn.addEventListener("click", () => setSeason(item.key));
      el.seasonToggle.appendChild(btn);
    }
  }

  function setSeason(key) {
    if (state.season === key) return;
    state.season = key;
    renderSeasonToggle();
    renderDistribution(true);
  }

  function renderPeriodToggle(data) {
    el.periodToggle.innerHTML = "";
    const items = [
      { key: "period_a", label: `${data.period_a.start}–${data.period_a.end}` },
      { key: "period_b", label: `${data.period_b.start}–${data.period_b.end}` },
    ];
    for (const item of items) {
      const btn = document.createElement("button");
      btn.type = "button";
      const active = state.activePeriod === item.key;
      btn.className = `period-toggle-btn${active ? " active" : ""}`;
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      btn.textContent = item.label;
      btn.addEventListener("click", () => setActivePeriod(item.key));
      el.periodToggle.appendChild(btn);
    }
  }

  function setActivePeriod(key) {
    if (state.activePeriod === key) return;
    state.activePeriod = key;
    renderPeriodToggle(state.currentData);
    renderAnnual();
    renderDistribution(true);
  }

  function renderAnnual() {
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
      incompleteLabel: config.incompleteLabel,
    });
    updateCaption(data);
  }

  function updateCaption(data) {
    const period = data[state.activePeriod];
    if (period.mean_annual_metric === null || period.mean_annual_metric === undefined) {
      el.caption.innerHTML =
        "Für die aktuell ausgewählte Referenzperiode liegen bei dieser Station zu wenige vollständige Jahre vor, " +
        "um einen verlässlichen Vergleich zu berechnen.";
      return;
    }
    el.caption.innerHTML =
      "Jeder Balken zeigt den tatsächlichen Jahreswert. Die gestrichelte Linie markiert das Mittel der Referenzperiode, " +
      "die Farbe die Abweichung davon. Die schwarze Linie ist der gleitende 10-Jahres-Durchschnitt.";
  }

  // preserveYear: keep whichever year the distribution timeline is
  // currently scrubbed to (used when only the reference period changes),
  // rather than jumping back to the most recent year.
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
      preserveYear: !!preserveYear,
    });
    const years = data.years;
    const idx = preserveYear ? Math.min(+el.distSlider.value, years.length - 1) : years.length - 1;
    el.distSlider.value = idx;
    updateDistYearBadge(years[idx]);
    updateDistCaption(data);
  }

  function updateDistYearBadge(year) {
    const data = state.currentData;
    el.distributionYear.textContent = year || "–";
    const seasonLabel = state.season === "full" ? null : SEASON_LABEL_BY_KEY[state.season];
    el.distributionStationLabel.textContent = seasonLabel ? `${seasonLabel} · ${data.meta.name}` : data.meta.name;
  }

  function updateDistCaption(data) {
    const period = data[state.activePeriod];
    if (period.mean_annual_metric === null || period.mean_annual_metric === undefined) {
      el.distCaption.innerHTML =
        "Für die aktuell ausgewählte Referenzperiode liegen bei dieser Station zu wenige vollständige Jahre vor, " +
        "um einen verlässlichen Vergleich zu berechnen.";
      return;
    }
    const seasonLabel = state.season === "full" ? null : SEASON_LABEL_BY_KEY[state.season];
    const subject = seasonLabel ? `${seasonLabel}-Tageswerte` : "Tageswerte";
    let html =
      `Die farbige Fläche zeigt, wie die ${subject} im ausgewählten Jahr verteilt sind. Die gestrichelte Linie ist ` +
      `dieselbe Verteilung für die Referenzperiode <strong>${period.start}–${period.end}</strong>. ` +
      `Nutze den Regler, um durch die einzelnen Jahre zu blättern.`;
    if (state.season === "full" && state.currentVariable === "temperature") {
      html +=
        " Bei der Ganzjahresansicht ist die Verteilung oft zweigipflig: Die Temperatur ändert sich um die kältesten " +
        "Wintertage und die wärmsten Sommertage herum am langsamsten, weshalb sich die Tageswerte dort häufen — " +
        "probiere Winter oder Sommer aus, um die einzelnen Jahreszeiten für sich zu sehen.";
    }
    el.distCaption.innerHTML = html;
  }

  function setupDistYearBounds(data) {
    const years = data.years;
    el.distYearStart.textContent = years[0];
    el.distYearEnd.textContent = years[years.length - 1];
    el.distSlider.min = 0;
    el.distSlider.max = years.length - 1;
    el.distSlider.value = years.length - 1;
  }

  function setupDistTimeline() {
    el.distSlider.oninput = () => {
      stopDistPlaying();
      const years = state.currentData.years;
      const year = years[+el.distSlider.value];
      state.distPlot.setYear(year);
      updateDistYearBadge(year);
    };

    el.distPlayBtn.onclick = () => {
      if (state.distPlayTimer) stopDistPlaying();
      else startDistPlaying();
    };

    el.distPrevBtn.onclick = () => stepDistYear(-1);
    el.distNextBtn.onclick = () => stepDistYear(1);
  }

  function stepDistYear(delta) {
    stopDistPlaying();
    const years = state.currentData.years;
    const idx = Math.min(years.length - 1, Math.max(0, +el.distSlider.value + delta));
    el.distSlider.value = idx;
    const year = years[idx];
    state.distPlot.setYear(year);
    updateDistYearBadge(year);
  }

  function startDistPlaying() {
    const years = state.currentData.years;
    el.distPlayBtn.classList.add("playing");
    el.distPlayBtn.innerHTML = "&#9724;";
    let idx = +el.distSlider.value;
    state.distPlayTimer = setInterval(() => {
      idx = (idx + 1) % years.length;
      el.distSlider.value = idx;
      const year = years[idx];
      state.distPlot.setYear(year);
      updateDistYearBadge(year);
    }, 550);
  }

  function stopDistPlaying() {
    if (state.distPlayTimer) {
      clearInterval(state.distPlayTimer);
      state.distPlayTimer = null;
    }
    el.distPlayBtn.classList.remove("playing");
    el.distPlayBtn.innerHTML = "&#9654;";
  }

  updateChartVisibility();
  main();
})();
