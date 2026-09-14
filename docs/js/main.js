(function () {
  "use strict";

  const state = {
    stations: [],
    currentStationId: null,
    currentVariable: "temperature",
    currentData: null,
    activePeriod: "period_a",
    annualDiffScale: null,
    plot: null,
    playTimer: null,
  };

  const el = {
    variableSelect: document.getElementById("variable-select"),
    select: document.getElementById("station-select"),
    infoBtn: document.getElementById("station-info-btn"),
    infoPopover: document.getElementById("station-info-popover"),
    infoPopoverBody: document.getElementById("station-info-body"),
    infoPopoverClose: document.getElementById("station-info-close"),
    infoPopoverBackdrop: document.getElementById("info-popover-backdrop"),
    chart: document.getElementById("chart"),
    tooltip: document.getElementById("tooltip"),
    legendLabelCold: document.getElementById("legend-label-cold"),
    legendLabelWarm: document.getElementById("legend-label-warm"),
    legendGradient: document.getElementById("legend-gradient"),
    colorbarTickMin: document.getElementById("colorbar-tick-min"),
    colorbarTickMid: document.getElementById("colorbar-tick-mid"),
    colorbarTickMax: document.getElementById("colorbar-tick-max"),
    legendPeriods: document.getElementById("legend-periods"),
    deviationYear: document.getElementById("deviation-year"),
    deviationMean: document.getElementById("deviation-mean"),
    statLabelMean: document.getElementById("stat-label-mean"),
    deviationValue: document.getElementById("deviation-value"),
    deviationPeriodLabel: document.getElementById("deviation-period-label"),
    hint: document.getElementById("hint"),
    colorbarRow: document.getElementById("colorbar-row"),
    chartBar: document.getElementById("chart-bar"),
    barLegendRow: document.getElementById("bar-legend-row"),
    barLegendYearSwatch: document.getElementById("bar-legend-year-swatch"),
    barLegendYearLabel: document.getElementById("bar-legend-year-label"),
    barLegendPeriodSwatch: document.getElementById("bar-legend-period-swatch"),
    barLegendPeriodLabel: document.getElementById("bar-legend-period-label"),
    timelineYearStart: document.getElementById("timeline-year-start"),
    timelineYearEnd: document.getElementById("timeline-year-end"),
    slider: document.getElementById("year-slider"),
    playBtn: document.getElementById("play-btn"),
    prevYearBtn: document.getElementById("prev-year-btn"),
    nextYearBtn: document.getElementById("next-year-btn"),
    compareTitle: document.getElementById("compare-title"),
    compareHeadline: document.getElementById("compare-headline"),
    compareLegend: document.getElementById("compare-legend"),
    compareChart: document.getElementById("compare-chart"),
    viewToggle: document.getElementById("view-toggle"),
    methodologyDay: document.getElementById("methodology-day"),
    methodologyYear: document.getElementById("methodology-year"),
    methodologyPeriod: document.getElementById("methodology-period"),
    methodologyContext: document.getElementById("methodology-context"),
  };

  const DEFAULT_STATION_ID = "01420"; // Frankfurt/Main
  const VIEW_STORAGE_KEY = "scapeViewMode";
  const MOBILE_QUERY = "(max-width: 699px)";

  const HINT_TEXT = {
    line: "Fahre über das Diagramm, um einen Tag im Vergleich aller Jahre zu sehen. Nutze den Regler oben, um durch die einzelnen Jahre zu blättern.",
    bar: "Fahre über einen Monat, um das ausgewählte Jahr mit der Referenzperiode zu vergleichen. Nutze den Regler oben, um durch die einzelnen Jahre zu blättern.",
  };

  // All variable-specific presentation lives here so the render functions
  // below stay generic. Add a new variable by adding an entry here plus a
  // matching output folder from scripts/build_data.py.
  const VARIABLE_CONFIG = {
    temperature: {
      label: "Temperatur",
      axisSuffix: "°",
      axisUnit: "°C",
      yMin: null,
      // Fixed so the day-color scale (and its legend ticks) mean the same
      // deviation magnitude at every station - an adaptive per-station
      // domain would make the same color read as different values (and the
      // ticks jump around) when switching stations.
      maxAbsDev: 10,
      colorStops: ["#2b3990", "#f2e6c9", "#d35b22"],
      // High-contrast (WCAG AA) variants of colorStops[0]/[2] for use as
      // *text* color (legend labels, deviation figure) - the raw colorStops
      // include a pale midpoint that is unreadable as text.
      textCold: "#2b3990",
      textWarm: "#bc511e",
      legendCold: "kälter",
      legendWarm: "wärmer",
      valueLabel: "Jahresmittel",
      aboveColor: "#dd2a26",
      belowColor: "#2b3990",
      chartAriaLabel: "Verlauf der Tagesmitteltemperatur für jedes verfügbare Jahr",
      formatValue: (v) => `${v.toFixed(1)} °C`,
      formatDiff: (diff) => `${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(1)} °C`,
      incompleteLabel: "lückenhaft",
      formatDayTooltip: (stat, dateLabel) =>
        `<b>${dateLabel}</b><br/>Durchschnitt: ${stat.mean}°C<br/>` +
        `<span class="tt-cold">kälteste: ${stat.min}°C (${stat.minYear})</span><br/>` +
        `<span class="tt-warm">wärmste: ${stat.max}°C (${stat.maxYear})</span>`,
      formatCompareHeadline: (pa, pb, diff) =>
        `${pb.start}–${pb.end} war im Jahresmittel <strong>${Math.abs(diff).toFixed(1)} °C ${diff >= 0 ? "wärmer" : "kühler"}</strong> ` +
        `als ${pa.start}–${pa.end}.`,
      methodology: {
        day: "<strong>Tagesmitteltemperatur:</strong> An jeder Wetterstation wird die Temperatur mehrmals täglich gemessen. Der Mittelwert dieser Messungen ergibt einen einzigen Wert pro Tag — die Tagesmitteltemperatur.",
        year: "<strong>Jahresmitteltemperatur:</strong> Der Durchschnitt aller rund 365 Tagesmittelwerte eines Kalenderjahres ergibt die Jahresmitteltemperatur. Jede dünne Linie im Diagramm oben zeigt den Tagesverlauf genau eines Jahres.",
        period: "<strong>Klimareferenzperiode:</strong> Der Durchschnitt der Jahresmitteltemperaturen über 30 Jahre ergibt das Klimamittel einer Referenzperiode. Die beiden gestrichelten Linien zeigen die offiziellen Referenzperioden 1961–1990 und 1991–2020.",
        context:
          "Die über Jahrzehnte sichtbare Erwärmung passt zum globalen Trend: Treibhausgase wie CO₂ verstärken den natürlichen Treibhauseffekt der Erdatmosphäre, was die Klimaforschung als Haupttreiber der weltweiten Erwärmung seit der Industrialisierung einordnet. Einzelne Jahre schwanken durch natürliche Variabilität (z. B. Meeresströmungen, Vulkanausbrüche, einzelne Wetterlagen) stark um diesen langfristigen Trend — erst der Vergleich vieler Jahrzehnte macht das zugrunde liegende Muster überhaupt sichtbar.",
      },
    },
    precipitation: {
      label: "Niederschlag",
      axisSuffix: " mm",
      axisUnit: "mm",
      yMin: 0,
      maxAbsDev: 250,
      colorStops: ["#d35b22", "#f2e6c9", "#1ca3d6"],
      textCold: "#bc511e",
      textWarm: "#157aa0",
      legendCold: "trockener",
      legendWarm: "nasser",
      valueLabel: "Jahressumme",
      aboveColor: "#1ca3d6",
      belowColor: "#d35b22",
      chartAriaLabel: "Kumulierter Niederschlag im Jahresverlauf für jedes verfügbare Jahr",
      formatValue: (v) => `${v.toFixed(0)} mm`,
      formatDiff: (diff) => `${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(0)} mm`,
      incompleteLabel: "lückenhaft",
      formatDayTooltip: (stat, dateLabel) =>
        `<b>bis ${dateLabel}</b><br/>im Schnitt: ${stat.mean} mm<br/>` +
        `<span class="tt-cold">am wenigsten: ${stat.min} mm (${stat.minYear})</span><br/>` +
        `<span class="tt-warm">am meisten: ${stat.max} mm (${stat.maxYear})</span>`,
      formatCompareHeadline: (pa, pb, diff) =>
        `${pb.start}–${pb.end} brachte im Schnitt <strong>${Math.abs(diff).toFixed(0)} mm ${diff >= 0 ? "mehr" : "weniger"} Niederschlag pro Jahr</strong> ` +
        `als ${pa.start}–${pa.end}.`,
      methodology: {
        day: "<strong>Tagesniederschlag:</strong> An jeder Wetterstation wird die gefallene Niederschlagsmenge (Regen, Schnee als Wasseräquivalent) einmal täglich gemessen — ein Wert pro Tag in Millimetern.",
        year: "<strong>Jahresniederschlag:</strong> Die Summe aller Tageswerte eines Kalenderjahres ergibt den Jahresniederschlag. Jede Linie im Diagramm oben zeigt die aufsummierte (kumulierte) Niederschlagsmenge im Verlauf genau eines Jahres.",
        period: "<strong>Klimareferenzperiode:</strong> Der Durchschnitt der Jahresniederschläge über 30 Jahre ergibt den mittleren Jahresniederschlag einer Referenzperiode. Die gestrichelten Linien zeigen die offiziellen Referenzperioden 1961–1990 und 1991–2020.",
        context:
          "Anders als bei der Temperatur zeigt der Jahresniederschlag über die Zeit kein so eindeutiges Muster — das ist wissenschaftlich plausibel: Niederschlag hängt stark von großräumigen Wettermustern und großer Jahr-zu-Jahr-Schwankung ab, die einen langsamen Trend leicht überdecken. Die Klimaforschung geht eher davon aus, dass sich mit der Erwärmung die Verteilung des Niederschlags verändert — etwa häufigere Starkregenereignisse oder verschobene Jahreszeiten — als dass sich allein die Jahressumme gleichmäßig in eine Richtung entwickelt.",
      },
    },
    sunshine: {
      label: "Sonnenscheindauer",
      axisSuffix: " h",
      axisUnit: "h",
      yMin: 0,
      chartType: "bar",
      colorStops: ["#6b7280", "#f2e6c9", "#f0b429"],
      textCold: "#6b7280",
      textWarm: "#936a0a",
      legendCold: "trüber",
      legendWarm: "sonniger",
      valueLabel: "Jahressumme",
      aboveColor: "#f0b429",
      belowColor: "#6b7280",
      chartAriaLabel: "Monatliche Sonnenscheindauer des ausgewählten Jahres im Vergleich zur Referenzperiode",
      formatValue: (v) => `${v.toFixed(0)} h`,
      formatDiff: (diff) => `${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(0)} h`,
      incompleteLabel: "lückenhaft",
      formatDayTooltip: (stat, dateLabel) =>
        `<b>${dateLabel}</b><br/>Durchschnitt: ${stat.mean} h<br/>` +
        `<span class="tt-cold">am wenigsten: ${stat.min} h (${stat.minYear})</span><br/>` +
        `<span class="tt-warm">am meisten: ${stat.max} h (${stat.maxYear})</span>`,
      formatMonthTooltip: (monthLabel, year, yearVal, periodVal) =>
        `<b>${monthLabel}</b><br/>` +
        (yearVal !== null && yearVal !== undefined
          ? `${year}: <b>${yearVal.toFixed(0)} h</b><br/>`
          : `${year}: keine Daten<br/>`) +
        `Referenzperiode: ${periodVal !== null && periodVal !== undefined ? periodVal.toFixed(0) + " h" : "–"}`,
      formatCompareHeadline: (pa, pb, diff) =>
        `${pb.start}–${pb.end} brachte im Schnitt <strong>${Math.abs(diff).toFixed(0)} h ${diff >= 0 ? "mehr" : "weniger"} Sonnenschein pro Jahr</strong> ` +
        `als ${pa.start}–${pa.end}.`,
      methodology: {
        day:
          "<strong>Tagessonnenscheindauer:</strong> Gemessen wird, wie viele Stunden am Tag die Sonne direkt und ungehindert schien — diffuses Licht bei bedecktem Himmel zählt nicht mit. Traditionell erfassten das Sonnenscheinautographen nach Campbell-Stokes: Eine Glaskugel bündelt das Sonnenlicht wie eine Lupe und brennt bei ausreichender Intensität eine Spur in einen Registrierstreifen; heute übernehmen automatische Sensoren diese Messung. Die Einheit ist Stunden (h) pro Tag. Wichtigster Einflussfaktor ist die Bewölkung, aber auch Dunst, Feinstaub und andere Schwebteilchen in der Luft können die gemessene Sonnenscheindauer verringern — selbst bei auf den ersten Blick klarem Himmel.",
        year: "<strong>Jahressonnenscheindauer:</strong> Die Summe aller Tageswerte eines Kalenderjahres ergibt die jährliche Sonnenscheindauer. Jede Linie im Diagramm oben zeigt den Tagesverlauf genau eines Jahres.",
        period: "<strong>Klimareferenzperiode:</strong> Der Durchschnitt der Jahressonnenscheindauern über 30 Jahre ergibt die mittlere Sonnenscheindauer einer Referenzperiode. Die gestrichelten Linien zeigen die offiziellen Referenzperioden 1961–1990 und 1991–2020.",
        context:
          "Die Sonnenscheindauer wird von mehr als nur der Wolkenmenge beeinflusst: Feinstaub und Aerosole in der Atmosphäre — etwa aus Industrie, Verkehr oder Vulkanausbrüchen — können Sonnenlicht streuen oder reflektieren und so die gemessene Sonnenscheindauer verringern, auch ohne dass mehr Wolken am Himmel stehen. Für weite Teile Europas wird in der Forschung ein Rückgang der Sonnenscheindauer bis etwa in die 1980er-Jahre diskutiert ('Global Dimming'), gefolgt von einem Wiederanstieg seither ('Global Brightening'), der zeitlich mit einer verbesserten Luftreinhaltung zusammenfällt. Das ist eine plausible, wissenschaftlich diskutierte Erklärung für den großräumigen Trend — ob und wie deutlich sich dieses Muster in den Daten einer einzelnen Station zeigt, hängt von vielen lokalen Faktoren ab und lässt sich nicht allein aus dieser Grafik ableiten.",
      },
    },
  };

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
    setupInfoPopover();
    const res = await fetch("data/processed/stations_index.json");
    state.stations = await res.json();
    state.stations.sort((a, b) => a.name.localeCompare(b.name, "de"));
    buildStationOptions();

    state.spaghettiPlot = window.SpaghettiPlot.create({
      svgEl: el.chart,
      tooltipEl: el.tooltip,
      onColorScaleReady: renderLegend,
    });
    state.barPlot = window.MonthlyBarPlot.create({
      svgEl: el.chartBar,
      tooltipEl: el.tooltip,
    });
    state.plot = state.spaghettiPlot;

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
    stopPlaying();
    state.currentStationId = stationId;
    state.currentVariable = variableKey;
    el.select.value = stationId;
    el.variableSelect.value = variableKey;

    const res = await fetch(`data/processed/${variableKey}/${stationId}.json`);
    const data = await res.json();
    state.currentData = data;
    const config = VARIABLE_CONFIG[variableKey];

    const meta = data.meta;
    renderInfoPopover(meta, data);

    const mode = config.chartType === "bar" ? "bar" : "line";
    state.plotMode = mode;
    state.plot = mode === "bar" ? state.barPlot : state.spaghettiPlot;
    el.chart.style.display = mode === "bar" ? "none" : "";
    el.chartBar.style.display = mode === "bar" ? "" : "none";
    el.colorbarRow.style.display = mode === "bar" ? "none" : "";
    el.barLegendRow.style.display = mode === "bar" ? "" : "none";
    el.hint.textContent = HINT_TEXT[mode];
    (mode === "bar" ? el.chartBar : el.chart).setAttribute("aria-label", config.chartAriaLabel);
    el.statLabelMean.textContent = config.valueLabel;
    el.legendLabelCold.textContent = config.legendCold;
    el.legendLabelWarm.textContent = config.legendWarm;
    el.legendLabelCold.style.color = config.textCold;
    el.legendLabelWarm.style.color = config.textWarm;
    el.methodologyDay.innerHTML = config.methodology.day;
    el.methodologyYear.innerHTML = config.methodology.year;
    el.methodologyPeriod.innerHTML = config.methodology.period;
    el.methodologyContext.innerHTML = config.methodology.context;

    state.annualDiffScale = buildAnnualDiffScale(data, state.activePeriod, config);

    state.plot.render(data, {
      colorStops: config.colorStops,
      axisSuffix: config.axisSuffix,
      axisUnit: config.axisUnit,
      maxAbsDev: config.maxAbsDev,
      yMin: config.yMin,
      aboveColor: config.aboveColor,
      belowColor: config.belowColor,
      formatDayTooltip: config.formatDayTooltip,
      formatMonthTooltip: config.formatMonthTooltip,
      activePeriod: state.activePeriod,
    });
    renderPeriodLegend(data);
    renderBarLegend(data, config);
    setupTimeline(data);
    renderCompare(data);
  }

  function renderInfoPopover(meta, data) {
    el.infoPopoverBody.innerHTML = "";
    const rows = [
      ["Koordinaten", `${meta.lat.toFixed(4)}° N, ${meta.lon.toFixed(4)}° O`],
      ["Höhe", `${meta.elevation_m} m ü. NHN`],
      ["Bundesland", meta.bundesland],
      ["Aktive Jahre", `${data.years[0]}–${data.years[data.years.length - 1]}`],
    ];
    for (const [label, value] of rows) {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      el.infoPopoverBody.appendChild(dt);
      el.infoPopoverBody.appendChild(dd);
    }
  }

  function openInfoPopover() {
    el.infoPopover.hidden = false;
    el.infoPopoverBackdrop.hidden = false;
    el.infoBtn.setAttribute("aria-expanded", "true");
  }

  function closeInfoPopover() {
    el.infoPopover.hidden = true;
    el.infoPopoverBackdrop.hidden = true;
    el.infoBtn.setAttribute("aria-expanded", "false");
  }

  function setupInfoPopover() {
    el.infoBtn.addEventListener("click", () => {
      if (el.infoPopover.hidden) openInfoPopover();
      else closeInfoPopover();
    });
    el.infoPopoverClose.addEventListener("click", closeInfoPopover);
    el.infoPopoverBackdrop.addEventListener("click", closeInfoPopover);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !el.infoPopover.hidden) closeInfoPopover();
    });
  }

  function renderBarLegend(data, config) {
    if (state.plotMode !== "bar") return;
    el.barLegendYearSwatch.style.background = config.aboveColor;
    el.barLegendYearLabel.textContent = "Ausgewähltes Jahr";
    el.barLegendPeriodSwatch.style.background = "var(--ink-dim)";
    const period = data[state.activePeriod];
    el.barLegendPeriodLabel.textContent = `Referenzperiode ${period.start}–${period.end}`;
  }

  // A symmetric diverging scale over how far each complete year's annual
  // metric sits from the active reference period's mean - drives the shade
  // of the big deviation figure so it reflects magnitude, not just sign.
  // Uses accessible text-safe endpoint colors (not the raw chart colorStops,
  // whose pale midpoint would be unreadable as text) fading through a dark
  // neutral at zero, so every value stays WCAG AA-legible.
  function buildAnnualDiffScale(data, activePeriodKey, config) {
    const baselineMean = data[activePeriodKey].mean_annual_metric;
    if (baselineMean === null || baselineMean === undefined) return null;
    const diffs = Object.values(data.annual_metric).map((v) => v - baselineMean);
    if (!diffs.length) return null;
    const maxAbs = Math.max(...diffs.map(Math.abs)) || 1;
    return d3
      .scaleLinear()
      .domain([-maxAbs, 0, maxAbs])
      .range([config.textCold, "#17140f", config.textWarm])
      .interpolate(d3.interpolateRgb)
      .clamp(true);
  }

  function renderLegend(colorScale, minAmt, maxAmt) {
    const width = 180;
    const height = 10;
    el.legendGradient.setAttribute("viewBox", `0 0 ${width} ${height}`);
    el.legendGradient.innerHTML = "";
    const svg = d3.select(el.legendGradient);
    const gradId = "legend-grad";
    const defs = svg.append("defs");
    const grad = defs.append("linearGradient").attr("id", gradId).attr("x1", "0%").attr("x2", "100%");
    const stopCount = 12;
    for (let i = 0; i <= stopCount; i++) {
      const t = i / stopCount;
      const value = minAmt + t * (maxAmt - minAmt);
      grad.append("stop").attr("offset", `${t * 100}%`).attr("stop-color", colorScale(value));
    }
    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("rx", 4)
      .attr("fill", `url(#${gradId})`);

    const config = VARIABLE_CONFIG[state.currentVariable];
    el.colorbarTickMin.textContent = config.formatDiff(minAmt);
    el.colorbarTickMax.textContent = config.formatDiff(maxAmt);
  }

  function renderPeriodLegend(data) {
    el.legendPeriods.innerHTML = "";
    const items = [
      { key: "period_a", cls: "period-a", label: `${data.period_a.start}–${data.period_a.end}` },
      { key: "period_b", cls: "period-b", label: `${data.period_b.start}–${data.period_b.end}` },
    ];
    for (const item of items) {
      const btn = document.createElement("button");
      btn.type = "button";
      const active = state.activePeriod === item.key;
      btn.className = `period-toggle-btn ${item.cls}${active ? " active" : ""}`;
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      btn.textContent = item.label;
      btn.addEventListener("click", () => setActivePeriod(item.key));
      el.legendPeriods.appendChild(btn);
    }
    const active = data[state.activePeriod];
    el.deviationPeriodLabel.textContent = `(vs. ${active.start}–${active.end})`;
  }

  function setActivePeriod(key) {
    if (state.activePeriod === key) return;
    state.activePeriod = key;
    const data = state.currentData;
    const config = VARIABLE_CONFIG[state.currentVariable];

    state.annualDiffScale = buildAnnualDiffScale(data, state.activePeriod, config);
    state.plot.render(data, {
      colorStops: config.colorStops,
      axisSuffix: config.axisSuffix,
      axisUnit: config.axisUnit,
      maxAbsDev: config.maxAbsDev,
      yMin: config.yMin,
      aboveColor: config.aboveColor,
      belowColor: config.belowColor,
      formatDayTooltip: config.formatDayTooltip,
      formatMonthTooltip: config.formatMonthTooltip,
      activePeriod: state.activePeriod,
      preserveYear: true,
    });
    renderPeriodLegend(data);
    renderBarLegend(data, config);
    updateReadout(data.years[+el.slider.value]);
  }

  function setupTimeline(data) {
    const years = data.years;
    el.timelineYearStart.textContent = years[0];
    el.timelineYearEnd.textContent = years[years.length - 1];
    el.slider.min = 0;
    el.slider.max = years.length - 1;
    el.slider.value = years.length - 1;

    el.slider.oninput = () => {
      stopPlaying();
      const year = years[+el.slider.value];
      state.plot.setYear(year);
      updateReadout(year);
    };

    el.playBtn.onclick = () => {
      if (state.playTimer) {
        stopPlaying();
      } else {
        startPlaying();
      }
    };

    el.prevYearBtn.onclick = () => stepYear(-1);
    el.nextYearBtn.onclick = () => stepYear(1);

    updateReadout(years[years.length - 1]);
  }

  function stepYear(delta) {
    stopPlaying();
    const years = state.currentData.years;
    const idx = Math.min(years.length - 1, Math.max(0, +el.slider.value + delta));
    el.slider.value = idx;
    const year = years[idx];
    state.plot.setYear(year);
    updateReadout(year);
  }

  function setDeviation(diff, config) {
    if (diff === null || diff === undefined) {
      el.deviationValue.textContent = "–";
      el.deviationValue.style.color = "";
      return;
    }
    el.deviationValue.textContent = config.formatDiff(diff);
    el.deviationValue.style.color = state.annualDiffScale
      ? state.annualDiffScale(diff)
      : diff >= 0 ? config.aboveColor : config.belowColor;
  }

  function updateReadout(year) {
    const data = state.currentData;
    const config = VARIABLE_CONFIG[state.currentVariable];
    const period = data[state.activePeriod];
    el.deviationYear.textContent = year || "–";
    if (!year) {
      el.deviationMean.textContent = "–";
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
    if (baseline === null || baseline === undefined) {
      setDeviation(null, config);
      return;
    }
    setDeviation(amt - baseline, config);
  }

  function startPlaying() {
    const years = state.currentData.years;
    el.playBtn.classList.add("playing");
    el.playBtn.innerHTML = "&#9724;";
    let idx = +el.slider.value;
    state.playTimer = setInterval(() => {
      idx = (idx + 1) % years.length;
      el.slider.value = idx;
      const year = years[idx];
      state.plot.setYear(year);
      updateReadout(year);
    }, 550);
  }

  function stopPlaying() {
    if (state.playTimer) {
      clearInterval(state.playTimer);
      state.playTimer = null;
    }
    el.playBtn.classList.remove("playing");
    el.playBtn.innerHTML = "&#9654;";
  }

  function renderCompare(data) {
    const meta = data.meta;
    const pa = data.period_a;
    const pb = data.period_b;
    const config = VARIABLE_CONFIG[state.currentVariable];

    el.compareTitle.textContent = `Klimavergleich für ${meta.name}`;

    const svg = d3.select(el.compareChart);
    svg.selectAll("*").remove();

    if (pa.mean_annual_metric === null || pb.mean_annual_metric === null) {
      const missing = pa.mean_annual_metric === null ? `${pa.start}–${pa.end}` : `${pb.start}–${pb.end}`;
      el.compareHeadline.textContent =
        `Für die Referenzperiode ${missing} liegen bei dieser Station zu wenige vollständige Jahre vor, ` +
        `um einen verlässlichen Vergleich zu berechnen.`;
      el.compareLegend.innerHTML = "";
      return;
    }

    const diff = pb.mean_annual_metric - pa.mean_annual_metric;
    el.compareHeadline.innerHTML = config.formatCompareHeadline(pa, pb, diff);

    el.compareLegend.innerHTML = "";
    for (const item of [
      { cls: "period-a", label: `${pa.start}–${pa.end}` },
      { cls: "period-b", label: `${pb.start}–${pb.end}` },
    ]) {
      const span = document.createElement("span");
      span.className = `compare-legend-item ${item.cls}`;
      span.innerHTML = `<span class="swatch-line"></span>${item.label}`;
      el.compareLegend.appendChild(span);
    }

    const W = 800, H = 320, M = { top: 16, right: 20, bottom: 34, left: 44 };
    const innerW = W - M.left - M.right;
    const innerH = H - M.top - M.bottom;

    const x = d3.scaleLinear().domain([1, 365]).range([0, innerW]);
    const values = pa.daily_series.concat(pb.daily_series).filter((v) => v !== null);
    const yDomain = d3.extent(values);
    if (config.yMin !== null) yDomain[0] = config.yMin;
    const y = d3.scaleLinear().domain(yDomain).nice().range([innerH, 0]);

    const g = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);
    const monthStarts = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
    const monthLabels = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

    g.append("g").attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickValues(monthStarts).tickFormat((d, i) => monthLabels[i]))
      .call((sel) => sel.selectAll("text").attr("fill", "#6b6558").attr("font-family", "Jost, sans-serif"))
      .call((sel) => sel.selectAll("path,line").attr("stroke", "#e7ddc8"));
    g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat((d) => d + config.axisSuffix))
      .call((sel) => sel.selectAll("text").attr("fill", "#6b6558").attr("font-family", "Jost, sans-serif"))
      .call((sel) => sel.selectAll("path,line").attr("stroke", "#e7ddc8"));

    const rows = pa.daily_series.map((v, i) => ({
      doy: i + 1,
      a: v,
      b: pb.daily_series[i],
    }));

    const areaWarmer = d3.area()
      .defined((d) => d.a !== null && d.b !== null && d.b >= d.a)
      .x((d) => x(d.doy)).y0((d) => y(d.a)).y1((d) => y(d.b));
    const areaCooler = d3.area()
      .defined((d) => d.a !== null && d.b !== null && d.b < d.a)
      .x((d) => x(d.doy)).y0((d) => y(d.a)).y1((d) => y(d.b));

    g.append("path").datum(rows).attr("d", areaWarmer).attr("fill", "#dd2a26").attr("opacity", 0.18);
    g.append("path").datum(rows).attr("d", areaCooler).attr("fill", "#2b3990").attr("opacity", 0.18);

    const line = d3.line().defined((d) => d[1] !== null).x((d) => x(d[0])).y((d) => y(d[1]));

    g.append("path")
      .datum(pa.daily_series.map((v, i) => [i + 1, v]))
      .attr("d", line)
      .attr("fill", "none")
      .attr("stroke", "#2b3990")
      .attr("stroke-width", 2.5);

    g.append("path")
      .datum(pb.daily_series.map((v, i) => [i + 1, v]))
      .attr("d", line)
      .attr("fill", "none")
      .attr("stroke", "#dd2a26")
      .attr("stroke-width", 2.5);
  }

  main();
})();
