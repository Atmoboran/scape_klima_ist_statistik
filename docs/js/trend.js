(function () {
  "use strict";

  const state = {
    stations: [],
    currentStationId: null,
    currentVariable: "temperature",
    currentData: null,
    activePeriod: "period_a",
    plot: null,
  };

  const el = {
    variableSelect: document.getElementById("trend-variable-select"),
    select: document.getElementById("trend-station-select"),
    chart: document.getElementById("trend-chart"),
    tooltip: document.getElementById("trend-tooltip"),
    periodToggle: document.getElementById("trend-period-toggle"),
    perDecade: document.getElementById("trend-per-decade"),
    totalLabel: document.getElementById("trend-total-label"),
    totalChange: document.getElementById("trend-total-change"),
    caption: document.getElementById("trend-caption"),
    viewToggle: document.getElementById("view-toggle"),
  };

  const VARIABLE_CONFIG = window.VARIABLE_CONFIG;
  const DEFAULT_STATION_ID = "01420"; // Frankfurt/Main
  const VIEW_STORAGE_KEY = "scapeViewMode";
  const MOBILE_QUERY = "(max-width: 699px)";

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

    state.plot = window.AnnualTrendPlot.create({
      svgEl: el.chart,
      tooltipEl: el.tooltip,
      onTrendReady: renderTrendSummary,
    });

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
      `Abweichung des ${config.valueLabel === "Jahresmittel" ? "Jahresmittels" : "Jahreswerts"} von ${config.label} von der Referenzperiode, Jahr für Jahr`
    );
    el.totalLabel.textContent = `Seit ${data.years[0]}`;

    renderPeriodToggle(data);

    state.plot.render(data, {
      colorStops: config.colorStops,
      axisSuffix: config.axisSuffix,
      axisUnit: config.axisUnit,
      activePeriod: state.activePeriod,
      formatValue: config.formatValue,
      formatDiff: config.formatDiff,
      incompleteLabel: config.incompleteLabel,
    });
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
    const data = state.currentData;
    const config = VARIABLE_CONFIG[state.currentVariable];

    renderPeriodToggle(data);
    state.plot.render(data, {
      colorStops: config.colorStops,
      axisSuffix: config.axisSuffix,
      axisUnit: config.axisUnit,
      activePeriod: state.activePeriod,
      formatValue: config.formatValue,
      formatDiff: config.formatDiff,
      incompleteLabel: config.incompleteLabel,
    });
  }

  function renderTrendSummary(trend) {
    const config = VARIABLE_CONFIG[state.currentVariable];
    if (!trend) {
      el.perDecade.textContent = "–";
      el.totalChange.textContent = "–";
      el.caption.innerHTML =
        "Für die aktuell ausgewählte Referenzperiode liegen bei dieser Station zu wenige vollständige Jahre vor, " +
        "um einen Trend zu berechnen.";
      return;
    }
    el.perDecade.textContent = config.formatDiff(trend.slopePerYear * 10);
    el.totalChange.textContent = config.formatDiff(trend.totalChange);
    el.caption.innerHTML =
      "Jeder Balken zeigt, wie weit das Jahr über (rot/orange) oder unter (blau) dem Mittel der Referenzperiode lag. " +
      "Die schwarze Linie ist der lineare Trend über die gesamte Messreihe.";
  }

  main();
})();
