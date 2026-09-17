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
    openPopoverKind: null,
    openPopoverTrigger: null,
  };

  const el = {
    variableSelect: document.getElementById("variable-select"),
    select: document.getElementById("station-select"),
    variableInfoBtn: document.getElementById("variable-info-btn"),
    stationInfoBtn: document.getElementById("station-info-btn"),
    periodInfoBtn: document.getElementById("period-info-btn"),
    hintBtn: document.getElementById("hint-btn"),
    methodologyCalcBtn: document.getElementById("methodology-calc-btn"),
    methodologyClimateBtn: document.getElementById("methodology-climate-btn"),
    infoPopover: document.getElementById("info-popover"),
    infoPopoverTitle: document.getElementById("info-popover-title"),
    infoPopoverBody: document.getElementById("info-popover-body"),
    infoPopoverClose: document.getElementById("info-popover-close"),
    infoPopoverBackdrop: document.getElementById("info-popover-backdrop"),
    chart: document.getElementById("chart"),
    tooltip: document.getElementById("tooltip"),
    legendLabelCold: document.getElementById("legend-label-cold"),
    legendLabelWarm: document.getElementById("legend-label-warm"),
    legendGradient: document.getElementById("legend-gradient"),
    legendPeriods: document.getElementById("legend-periods"),
    deviationYear: document.getElementById("deviation-year"),
    deviationMean: document.getElementById("deviation-mean"),
    statLabelMean: document.getElementById("stat-label-mean"),
    deviationValue: document.getElementById("deviation-value"),
    deviationPeriodLabel: document.getElementById("deviation-period-label"),
    colorbarPeriodLabel: document.getElementById("colorbar-period-label"),
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
  };

  // Sums a 365-entry daily series into 12 monthly totals (null when a month
  // has no valid days at all) - used by the Klimavergleich bar comparison
  // for variables (sunshine) whose main chart is monthly bars, not lines.
  const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function monthlySumsFromDaily(series) {
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
  }

  const DEFAULT_STATION_ID = "01420"; // Frankfurt/Main
  const VIEW_STORAGE_KEY = "scapeViewMode";
  const MOBILE_QUERY = "(max-width: 699px)";

  // All variable-specific presentation lives in js/variable-config.js so it
  // can be shared with trend.js (the annual-trend page) without duplicating
  // the German copy in two places.
  const VARIABLE_CONFIG = window.VARIABLE_CONFIG;

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

    const mode = config.chartType === "bar" ? "bar" : "line";
    state.plotMode = mode;
    state.plot = mode === "bar" ? state.barPlot : state.spaghettiPlot;
    el.chart.style.display = mode === "bar" ? "none" : "";
    el.chartBar.style.display = mode === "bar" ? "" : "none";
    el.colorbarRow.style.display = mode === "bar" ? "none" : "";
    el.barLegendRow.style.display = mode === "bar" ? "" : "none";
    (mode === "bar" ? el.chartBar : el.chart).setAttribute("aria-label", config.chartAriaLabel);
    el.statLabelMean.textContent = config.valueLabel;
    el.legendLabelCold.textContent = config.legendCold;
    el.legendLabelWarm.textContent = config.legendWarm;
    el.legendLabelCold.style.color = config.colorStops[0];
    el.legendLabelWarm.style.color = config.colorStops[2];

    state.annualDiffScale = buildAnnualDiffScale(data, state.activePeriod, config.colorStops);

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
    refreshOpenPopover();
  }

  const MITTELWERT_EXPLANATION =
    "<strong>Mittelwert:</strong> Ein Mittelwert (Durchschnitt) fasst mehrere Messungen zu einem typischen Wert zusammen: " +
    "Man addiert alle Werte und teilt die Summe durch ihre Anzahl. Beispiel: Aus den drei Zahlen 10, 15 und 18 ergibt sich " +
    "(10 + 15 + 18) ÷ 3 = 14,3 als Mittelwert.";

  const REFERENZPERIODE_EXPLANATION =
    "Eine Referenzperiode ist ein fester, 30 Jahre langer Vergleichszeitraum, den die Weltorganisation für Meteorologie " +
    "als gemeinsamen Maßstab für das Klima festlegt. Der Durchschnitt dieser 30 Jahre gilt als „normales“ Klima, gegen das " +
    "einzelne Jahre verglichen werden. Diese App nutzt die beiden offiziellen Referenzperioden 1961–1990 und 1991–2020 — " +
    "der Wechsel zwischen ihnen zeigt, wie sich das Klimamittel selbst über die Zeit verschoben hat.";

  // All popover triggers (station details, variable info, chart usage hint,
  // methodology, climate context) share one dialog; this builds the
  // title/body for whichever "kind" was opened, always from current state so
  // it stays correct if the station/variable changes while a popover is open.
  function popoverContentFor(kind) {
    const data = state.currentData;
    const config = VARIABLE_CONFIG[state.currentVariable];
    switch (kind) {
      case "station": {
        const meta = data.meta;
        const dl = document.createElement("dl");
        dl.className = "info-popover-dl";
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
          dl.appendChild(dt);
          dl.appendChild(dd);
        }
        return { title: "Stationsdetails", bodyEl: dl };
      }
      case "variable":
        return { title: config.label, bodyHTML: `<p>${config.generalInfo}</p>` };
      case "period":
        return { title: "Referenzperiode", bodyHTML: `<p>${REFERENZPERIODE_EXPLANATION}</p>` };
      case "hint":
        return { title: "Was sehe ich auf dem Diagramm?", bodyHTML: `<p>${config.chartExplanation}</p>` };
      case "calc":
        return {
          title: "Wie werden diese Werte berechnet?",
          bodyHTML:
            `<p>${MITTELWERT_EXPLANATION}</p>` +
            `<p>${config.methodology.day}</p>` +
            `<p>${config.methodology.year}</p>` +
            `<p>${config.methodology.period}</p>`,
        };
      case "climate":
        return { title: "Was hat das mit dem Klimawandel zu tun?", bodyHTML: `<p>${config.methodology.context}</p>` };
      default:
        return { title: "", bodyHTML: "" };
    }
  }

  function openInfoPopover(kind, triggerEl) {
    const content = popoverContentFor(kind);
    el.infoPopoverTitle.textContent = content.title;
    el.infoPopoverBody.innerHTML = "";
    if (content.bodyEl) el.infoPopoverBody.appendChild(content.bodyEl);
    else el.infoPopoverBody.innerHTML = content.bodyHTML;

    if (state.openPopoverTrigger) state.openPopoverTrigger.setAttribute("aria-expanded", "false");
    state.openPopoverKind = kind;
    state.openPopoverTrigger = triggerEl || null;
    if (triggerEl) triggerEl.setAttribute("aria-expanded", "true");

    el.infoPopover.hidden = false;
    el.infoPopoverBackdrop.hidden = false;
  }

  function closeInfoPopover() {
    if (state.openPopoverTrigger) state.openPopoverTrigger.setAttribute("aria-expanded", "false");
    state.openPopoverKind = null;
    state.openPopoverTrigger = null;
    el.infoPopover.hidden = true;
    el.infoPopoverBackdrop.hidden = true;
  }

  // Called whenever the underlying data changes (station/variable switch) so
  // a popover left open while that happens shows content for the new state
  // instead of stale text from before the switch.
  function refreshOpenPopover() {
    if (state.openPopoverKind) openInfoPopover(state.openPopoverKind, state.openPopoverTrigger);
  }

  function setupInfoPopover() {
    const toggle = (kind, btn) => {
      if (!el.infoPopover.hidden && state.openPopoverKind === kind) closeInfoPopover();
      else openInfoPopover(kind, btn);
    };
    el.stationInfoBtn.addEventListener("click", () => toggle("station", el.stationInfoBtn));
    el.variableInfoBtn.addEventListener("click", () => toggle("variable", el.variableInfoBtn));
    el.periodInfoBtn.addEventListener("click", () => toggle("period", el.periodInfoBtn));
    el.hintBtn.addEventListener("click", () => toggle("hint", el.hintBtn));
    el.methodologyCalcBtn.addEventListener("click", () => toggle("calc", el.methodologyCalcBtn));
    el.methodologyClimateBtn.addEventListener("click", () => toggle("climate", el.methodologyClimateBtn));
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
  function buildAnnualDiffScale(data, activePeriodKey, colorStops) {
    const baselineMean = data[activePeriodKey].mean_annual_metric;
    if (baselineMean === null || baselineMean === undefined) return null;
    const diffs = Object.values(data.annual_metric).map((v) => v - baselineMean);
    if (!diffs.length) return null;
    const maxAbs = Math.max(...diffs.map(Math.abs)) || 1;
    return d3.scaleLinear().domain([-maxAbs, 0, maxAbs]).range(colorStops).interpolate(d3.interpolateRgb).clamp(true);
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
    el.colorbarPeriodLabel.textContent = `${active.start}–${active.end}`;
  }

  function setActivePeriod(key) {
    if (state.activePeriod === key) return;
    state.activePeriod = key;
    const data = state.currentData;
    const config = VARIABLE_CONFIG[state.currentVariable];

    state.annualDiffScale = buildAnnualDiffScale(data, state.activePeriod, config.colorStops);
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

    const isBar = config.chartType === "bar";
    el.compareLegend.innerHTML = "";
    for (const item of [
      { cls: "period-a", label: `${pa.start}–${pa.end}` },
      { cls: "period-b", label: `${pb.start}–${pb.end}` },
    ]) {
      const span = document.createElement("span");
      span.className = `compare-legend-item ${item.cls}`;
      span.innerHTML = isBar
        ? `<span class="swatch-box"></span>${item.label}`
        : `<span class="swatch-line"></span>${item.label}`;
      el.compareLegend.appendChild(span);
    }

    if (isBar) renderCompareBars(svg, pa, pb, config);
    else renderCompareLines(svg, pa, pb, config);
  }

  // Klimavergleich chart for variables whose main chart is a daily line
  // (temperature, precipitation): period_a vs period_b as two lines over the
  // day of year, with the warmer/cooler gap between them shaded.
  function renderCompareLines(svg, pa, pb, config) {
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

  // Klimavergleich chart for variables whose main chart is monthly bars
  // (sunshine): period_a vs period_b as a grouped bar pair per month,
  // mirroring the main chart's own year-vs-period bar layout.
  function renderCompareBars(svg, pa, pb, config) {
    const W = 800, H = 320, M = { top: 16, right: 24, bottom: 34, left: 48 };
    const innerW = W - M.left - M.right;
    const innerH = H - M.top - M.bottom;

    const monthLabels = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
    const sumsA = monthlySumsFromDaily(pa.daily_series);
    const sumsB = monthlySumsFromDaily(pb.daily_series);

    const x = d3.scaleBand().domain(monthLabels).range([0, innerW]).paddingInner(0.35).paddingOuter(0.1);
    const xSub = d3.scaleBand().domain(["a", "b"]).range([0, x.bandwidth()]).padding(0.12);

    const allVals = sumsA.concat(sumsB).filter((v) => v !== null);
    const maxV = allVals.length ? Math.max(...allVals) : 1;
    const yMin = config.yMin !== null ? config.yMin : 0;
    const y = d3.scaleLinear().domain([yMin, maxV || 1]).nice().range([innerH, 0]);

    const g = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);

    g.append("g").attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x))
      .call((sel) => sel.selectAll("text").attr("fill", "#6b6558").attr("font-family", "Jost, sans-serif"))
      .call((sel) => sel.selectAll("path,line").attr("stroke", "#e7ddc8"));
    g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat((d) => d + config.axisSuffix))
      .call((sel) => sel.selectAll("text").attr("fill", "#6b6558").attr("font-family", "Jost, sans-serif"))
      .call((sel) => sel.selectAll("path,line").attr("stroke", "#e7ddc8"));

    const rows = monthLabels.map((month, i) => ({ month, a: sumsA[i], b: sumsB[i] }));
    const groups = g
      .selectAll("g.compare-month-group")
      .data(rows, (d) => d.month)
      .join("g")
      .attr("class", "compare-month-group")
      .attr("transform", (d) => `translate(${x(d.month)},0)`);

    groups.each(function (d) {
      const bars = [
        { key: "a", val: d.a, color: "#2b3990" },
        { key: "b", val: d.b, color: "#dd2a26" },
      ].filter((b) => b.val !== null);
      d3.select(this)
        .selectAll("rect")
        .data(bars, (b) => b.key)
        .join("rect")
        .attr("x", (b) => xSub(b.key))
        .attr("width", xSub.bandwidth())
        .attr("y", (b) => y(b.val))
        .attr("height", (b) => innerH - y(b.val))
        .attr("fill", (b) => b.color);
    });
  }

  main();
})();
