(function () {
  "use strict";

  const state = {
    stations: [],
    currentStationId: null,
    currentVariable: "temperature",
    currentData: null,
    plot: null,
    playTimer: null,
  };

  const el = {
    variableSelect: document.getElementById("variable-select"),
    select: document.getElementById("station-select"),
    chart: document.getElementById("chart"),
    tooltip: document.getElementById("tooltip"),
    legendLabelCold: document.getElementById("legend-label-cold"),
    legendLabelWarm: document.getElementById("legend-label-warm"),
    legendGradient: document.getElementById("legend-gradient"),
    legendPeriods: document.getElementById("legend-periods"),
    deviationYear: document.getElementById("deviation-year"),
    deviationValue: document.getElementById("deviation-value"),
    deviationPeriodLabel: document.getElementById("deviation-period-label"),
    slider: document.getElementById("year-slider"),
    playBtn: document.getElementById("play-btn"),
    readout: document.getElementById("timeline-readout"),
    compareTitle: document.getElementById("compare-title"),
    compareHeadline: document.getElementById("compare-headline"),
    compareChart: document.getElementById("compare-chart"),
    viewToggle: document.getElementById("view-toggle"),
    methodologyDay: document.getElementById("methodology-day"),
    methodologyYear: document.getElementById("methodology-year"),
    methodologyPeriod: document.getElementById("methodology-period"),
  };

  const DEFAULT_STATION_ID = "01420"; // Frankfurt/Main
  const VIEW_STORAGE_KEY = "scapeViewMode";
  const MOBILE_QUERY = "(max-width: 699px)";

  // All variable-specific presentation lives here so the render functions
  // below stay generic. Add a new variable by adding an entry here plus a
  // matching output folder from scripts/build_data.py.
  const VARIABLE_CONFIG = {
    temperature: {
      label: "Temperatur",
      axisSuffix: "°",
      yMin: null,
      colorStops: ["#2b3990", "#f2e6c9", "#d35b22"],
      legendCold: "kälteres Jahr",
      legendWarm: "wärmeres Jahr",
      aboveColor: "#dd2a26",
      belowColor: "#2b3990",
      chartAriaLabel: "Verlauf der Tagesmitteltemperatur für jedes verfügbare Jahr",
      formatMetric: (v) => `${v.toFixed(1)} °C`,
      formatDiff: (diff) => `${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(1)} °C`,
      incompleteLabel: "unvollständige Messreihe",
      formatDayTooltip: (stat, dateLabel) =>
        `<b>${dateLabel}</b><br/>Durchschnitt: ${stat.mean}°C<br/>` +
        `<span class="tt-cold">kälteste: ${stat.min}°C (${stat.minYear})</span><br/>` +
        `<span class="tt-warm">wärmste: ${stat.max}°C (${stat.maxYear})</span>`,
      formatReadout: (year, amt, diff, periodA) =>
        `Jahr ${year} — Mitteltemperatur: ${amt.toFixed(1)} °C — ` +
        `Abweichung ggü. Referenzperiode ${periodA.start}–${periodA.end}: ${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(1)} °C`,
      formatCompareHeadline: (pa, pb, diff) =>
        `${pb.start}–${pb.end} war im Jahresmittel <strong>${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(1)} °C ${diff >= 0 ? "wärmer" : "kühler"}</strong> ` +
        `als ${pa.start}–${pa.end}.`,
      methodology: {
        day: "<strong>Tagesmitteltemperatur:</strong> An jeder Wetterstation wird die Temperatur mehrmals täglich gemessen. Der Mittelwert dieser Messungen ergibt einen einzigen Wert pro Tag — die Tagesmitteltemperatur.",
        year: "<strong>Jahresmitteltemperatur:</strong> Der Durchschnitt aller rund 365 Tagesmittelwerte eines Kalenderjahres ergibt die Jahresmitteltemperatur. Jede dünne Linie im Diagramm oben zeigt den Tagesverlauf genau eines Jahres.",
        period: "<strong>Klimareferenzperiode:</strong> Der Durchschnitt der Jahresmitteltemperaturen über 30 Jahre ergibt das Klimamittel einer Referenzperiode. Die beiden gestrichelten Linien zeigen die offiziellen Referenzperioden 1961–1990 und 1991–2020.",
      },
    },
    precipitation: {
      label: "Niederschlag",
      axisSuffix: " mm",
      yMin: 0,
      colorStops: ["#d35b22", "#f2e6c9", "#1ca3d6"],
      legendCold: "trockeneres Jahr",
      legendWarm: "nasseres Jahr",
      aboveColor: "#1ca3d6",
      belowColor: "#d35b22",
      chartAriaLabel: "Kumulierter Niederschlag im Jahresverlauf für jedes verfügbare Jahr",
      formatMetric: (v) => `${v.toFixed(0)} mm`,
      formatDiff: (diff) => `${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(0)} mm`,
      incompleteLabel: "unvollständige Messreihe",
      formatDayTooltip: (stat, dateLabel) =>
        `<b>bis ${dateLabel}</b><br/>im Schnitt: ${stat.mean} mm<br/>` +
        `<span class="tt-cold">am wenigsten: ${stat.min} mm (${stat.minYear})</span><br/>` +
        `<span class="tt-warm">am meisten: ${stat.max} mm (${stat.maxYear})</span>`,
      formatReadout: (year, amt, diff, periodA) =>
        `Jahr ${year} — Jahresniederschlag: ${amt.toFixed(0)} mm — ` +
        `Abweichung ggü. Referenzperiode ${periodA.start}–${periodA.end}: ${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(0)} mm`,
      formatCompareHeadline: (pa, pb, diff) =>
        `${pb.start}–${pb.end} brachte im Schnitt <strong>${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(0)} mm ${diff >= 0 ? "mehr" : "weniger"} Niederschlag pro Jahr</strong> ` +
        `als ${pa.start}–${pa.end}.`,
      methodology: {
        day: "<strong>Tagesniederschlag:</strong> An jeder Wetterstation wird die gefallene Niederschlagsmenge (Regen, Schnee als Wasseräquivalent) einmal täglich gemessen — ein Wert pro Tag in Millimetern.",
        year: "<strong>Jahresniederschlag:</strong> Die Summe aller Tageswerte eines Kalenderjahres ergibt den Jahresniederschlag. Jede Linie im Diagramm oben zeigt die aufsummierte (kumulierte) Niederschlagsmenge im Verlauf genau eines Jahres.",
        period: "<strong>Klimareferenzperiode:</strong> Der Durchschnitt der Jahresniederschläge über 30 Jahre ergibt den mittleren Jahresniederschlag einer Referenzperiode. Die gestrichelten Linien zeigen die offiziellen Referenzperioden 1961–1990 und 1991–2020.",
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
    const res = await fetch("data/processed/stations_index.json");
    state.stations = await res.json();
    state.stations.sort((a, b) => a.name.localeCompare(b.name, "de"));
    buildStationOptions();

    state.plot = window.SpaghettiPlot.create({
      svgEl: el.chart,
      tooltipEl: el.tooltip,
      onColorScaleReady: renderLegend,
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
      opt.textContent = `${s.name} (${s.first_year}–${s.last_year})`;
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

    el.chart.setAttribute("aria-label", config.chartAriaLabel);
    el.legendLabelCold.textContent = config.legendCold;
    el.legendLabelWarm.textContent = config.legendWarm;
    el.legendLabelCold.style.color = config.colorStops[0];
    el.legendLabelWarm.style.color = config.colorStops[2];
    el.methodologyDay.innerHTML = config.methodology.day;
    el.methodologyYear.innerHTML = config.methodology.year;
    el.methodologyPeriod.innerHTML = config.methodology.period;

    state.plot.render(data, {
      colorStops: config.colorStops,
      axisSuffix: config.axisSuffix,
      yMin: config.yMin,
      aboveColor: config.aboveColor,
      belowColor: config.belowColor,
      formatDayTooltip: config.formatDayTooltip,
    });
    renderPeriodLegend(data);
    setupTimeline(data);
    renderCompare(data);
  }

  function renderLegend(colorScale, minAmt, maxAmt) {
    const width = 180;
    const height = 12;
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
      { cls: "period-a", label: `Klimareferenzperiode ${data.period_a.start}–${data.period_a.end}` },
      { cls: "period-b", label: `Klimareferenzperiode ${data.period_b.start}–${data.period_b.end}` },
    ];
    for (const item of items) {
      const span = document.createElement("span");
      span.className = `period-swatch ${item.cls}`;
      span.innerHTML = `<span class="swatch-line"></span>${item.label}`;
      el.legendPeriods.appendChild(span);
    }
    el.deviationPeriodLabel.textContent = `(vs. ${data.period_a.start}–${data.period_a.end})`;
  }

  function setupTimeline(data) {
    const years = data.years;
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

    updateReadout(years[years.length - 1]);
  }

  function setDeviation(diff, config) {
    if (diff === null || diff === undefined) {
      el.deviationValue.textContent = "–";
      el.deviationValue.style.color = "";
      return;
    }
    el.deviationValue.textContent = config.formatDiff(diff);
    el.deviationValue.style.color = diff >= 0 ? config.aboveColor : config.belowColor;
  }

  function updateReadout(year) {
    const data = state.currentData;
    const config = VARIABLE_CONFIG[state.currentVariable];
    el.deviationYear.textContent = year || "–";
    if (!year) {
      el.readout.textContent = " ";
      setDeviation(null, config);
      return;
    }
    const amt = data.annual_metric[year];
    const baseline = data.period_a.mean_annual_metric;

    if (amt === undefined) {
      el.readout.textContent = `Jahr ${year}: ${config.incompleteLabel}`;
      setDeviation(null, config);
      return;
    }
    const diff = amt - baseline;
    setDeviation(diff, config);
    el.readout.textContent = config.formatReadout(year, amt, diff, data.period_a);
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
    const diff = pb.mean_annual_metric - pa.mean_annual_metric;

    el.compareTitle.textContent = `Klimavergleich für ${meta.name}`;
    el.compareHeadline.innerHTML = config.formatCompareHeadline(pa, pb, diff);

    const svg = d3.select(el.compareChart);
    svg.selectAll("*").remove();
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
