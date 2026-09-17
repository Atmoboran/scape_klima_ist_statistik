(function () {
  "use strict";

  const state = {
    stations: [],
    currentStationId: null,
    currentVariable: "temperature",
    currentData: null,
    activePeriod: "period_a",
    displayMode: "relative", // "relative" (deviation from reference period) or "absolute" (actual value)
    plot: null,
  };

  const el = {
    variableSelect: document.getElementById("trend-variable-select"),
    select: document.getElementById("trend-station-select"),
    chart: document.getElementById("trend-chart"),
    tooltip: document.getElementById("trend-tooltip"),
    modeToggle: document.getElementById("trend-mode-toggle"),
    periodToggle: document.getElementById("trend-period-toggle"),
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
    });
    renderModeToggle();

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
      `${config.label} je Jahr im Vergleich zur Referenzperiode, ${data.years[0]}–${data.years[data.years.length - 1]}`
    );

    renderModeToggle();
    renderPeriodToggle(data);
    rerenderPlot();
  }

  function renderModeToggle() {
    el.modeToggle.innerHTML = "";
    const items = [
      { key: "relative", label: "Abweichung" },
      { key: "absolute", label: "Absolut" },
    ];
    for (const item of items) {
      const btn = document.createElement("button");
      btn.type = "button";
      const active = state.displayMode === item.key;
      btn.className = `period-toggle-btn${active ? " active" : ""}`;
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      btn.textContent = item.label;
      btn.addEventListener("click", () => setDisplayMode(item.key));
      el.modeToggle.appendChild(btn);
    }
  }

  function setDisplayMode(mode) {
    if (state.displayMode === mode) return;
    state.displayMode = mode;
    renderModeToggle();
    rerenderPlot();
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
    rerenderPlot();
  }

  function rerenderPlot() {
    const data = state.currentData;
    const config = VARIABLE_CONFIG[state.currentVariable];
    state.plot.render(data, {
      colorStops: config.colorStops,
      axisSuffix: config.axisSuffix,
      axisUnit: config.axisUnit,
      yMin: config.yMin,
      activePeriod: state.activePeriod,
      mode: state.displayMode,
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
      state.displayMode === "absolute"
        ? "Jeder Balken zeigt den tatsächlichen Jahreswert. Die gestrichelte Linie markiert das Mittel der Referenzperiode, " +
          "die Farbe zeigt die Abweichung davon. Die schwarze Linie ist der gleitende 10-Jahres-Durchschnitt."
        : "Jeder Balken zeigt, wie weit das Jahr über (rot/orange) oder unter (blau) dem Mittel der Referenzperiode lag. " +
          "Die schwarze Linie zeigt den gleitenden 10-Jahres-Durchschnitt.";
  }

  main();
})();
