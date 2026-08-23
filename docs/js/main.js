(function () {
  "use strict";

  const state = {
    stations: [],
    currentStationId: null,
    currentData: null,
    plot: null,
    playTimer: null,
  };

  const el = {
    select: document.getElementById("station-select"),
    chart: document.getElementById("chart"),
    tooltip: document.getElementById("tooltip"),
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
  };

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
    buildSwitcher();

    state.plot = window.SpaghettiPlot.create({
      svgEl: el.chart,
      tooltipEl: el.tooltip,
      onColorScaleReady: renderLegend,
    });

    el.select.addEventListener("change", () => selectStation(el.select.value));
    await selectStation(state.stations[0].station_id);
  }

  function buildSwitcher() {
    el.select.innerHTML = "";
    for (const s of state.stations) {
      const opt = document.createElement("option");
      opt.value = s.station_id;
      opt.textContent = `${s.name} (${s.first_year}–${s.last_year})`;
      el.select.appendChild(opt);
    }
  }

  async function selectStation(stationId) {
    stopPlaying();
    state.currentStationId = stationId;
    el.select.value = stationId;

    const res = await fetch(`data/processed/${stationId}.json`);
    const data = await res.json();
    state.currentData = data;

    state.plot.render(data);
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

  function setDeviation(diff) {
    if (diff === null || diff === undefined) {
      el.deviationValue.textContent = "–";
      el.deviationValue.classList.remove("warmer", "cooler");
      return;
    }
    const sign = diff >= 0 ? "+" : "−";
    el.deviationValue.textContent = `${sign}${Math.abs(diff).toFixed(1)} °C`;
    el.deviationValue.classList.toggle("warmer", diff >= 0);
    el.deviationValue.classList.toggle("cooler", diff < 0);
  }

  function updateReadout(year) {
    const data = state.currentData;
    el.deviationYear.textContent = year || "–";
    if (!year) {
      el.readout.textContent = " ";
      setDeviation(null);
      return;
    }
    const amt = data.annual_mean_temp[year];
    const baseline = data.period_a.mean_annual_temperature;

    if (amt === undefined) {
      el.readout.textContent = `Jahr ${year}: unvollständige Messreihe`;
      setDeviation(null);
      return;
    }
    const diff = amt - baseline;
    setDeviation(diff);
    const sign = diff >= 0 ? "+" : "−";
    el.readout.textContent =
      `Jahr ${year} — Mitteltemperatur: ${amt.toFixed(1)} °C — ` +
      `Abweichung ggü. Referenzperiode ${data.period_a.start}–${data.period_a.end}: ${sign}${Math.abs(diff).toFixed(1)} °C`;
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
    const diff = pb.mean_annual_temperature - pa.mean_annual_temperature;
    const sign = diff >= 0 ? "+" : "−";
    const richtung = diff >= 0 ? "wärmer" : "kühler";

    el.compareTitle.textContent = `Klimavergleich für ${meta.name}`;
    el.compareHeadline.innerHTML =
      `${pb.start}–${pb.end} war im Jahresmittel <strong>${sign}${Math.abs(diff).toFixed(1)} °C ${richtung}</strong> ` +
      `als ${pa.start}–${pa.end}.`;

    const svg = d3.select(el.compareChart);
    svg.selectAll("*").remove();
    const W = 800, H = 320, M = { top: 16, right: 20, bottom: 34, left: 44 };
    const innerW = W - M.left - M.right;
    const innerH = H - M.top - M.bottom;

    const x = d3.scaleLinear().domain([1, 365]).range([0, innerW]);
    const values = pa.daily_mean_temperature.concat(pb.daily_mean_temperature).filter((v) => v !== null);
    const y = d3.scaleLinear().domain(d3.extent(values)).nice().range([innerH, 0]);

    const g = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);
    const monthStarts = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
    const monthLabels = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

    g.append("g").attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickValues(monthStarts).tickFormat((d, i) => monthLabels[i]))
      .call((sel) => sel.selectAll("text").attr("fill", "#6b6558").attr("font-family", "Jost, sans-serif"))
      .call((sel) => sel.selectAll("path,line").attr("stroke", "#e7ddc8"));
    g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat((d) => d + "°"))
      .call((sel) => sel.selectAll("text").attr("fill", "#6b6558").attr("font-family", "Jost, sans-serif"))
      .call((sel) => sel.selectAll("path,line").attr("stroke", "#e7ddc8"));

    const rows = pa.daily_mean_temperature.map((v, i) => ({
      doy: i + 1,
      a: v,
      b: pb.daily_mean_temperature[i],
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
      .datum(pa.daily_mean_temperature.map((v, i) => [i + 1, v]))
      .attr("d", line)
      .attr("fill", "none")
      .attr("stroke", "#2b3990")
      .attr("stroke-width", 2.5);

    g.append("path")
      .datum(pb.daily_mean_temperature.map((v, i) => [i + 1, v]))
      .attr("d", line)
      .attr("fill", "none")
      .attr("stroke", "#dd2a26")
      .attr("stroke-width", 2.5);
  }

  main();
})();
