// The "classic global warming plot": one bar per year showing that year's
// deviation from the active climate reference period, coloured on the same
// diverging scale as the rest of the site, plus a solid linear trend line
// fitted through the whole record. Unlike spaghetti-plot.js/monthly-bar-
// plot.js there is no per-year "highlight" state here - the whole record is
// shown at once, which is the point of this chart. Built with vendored D3
// v7, no build step.
(function () {
  "use strict";

  const MARGIN = { top: 20, right: 20, bottom: 30, left: 52 };
  const TOOLTIP_IDLE_MS = 5000;

  const DEFAULT_CONFIG = {
    colorStops: ["#2b3990", "#f2e6c9", "#d35b22"],
    axisSuffix: "°",
    activePeriod: "period_a",
    formatValue: (v) => `${v.toFixed(1)}`,
    formatDiff: (diff) => `${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(1)}`,
  };

  // Ordinary least squares over [[x, y], ...] pairs.
  function linearRegression(points) {
    const n = points.length;
    if (n < 2) return null;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (const [x, y] of points) {
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }
    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) return null;
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
  }

  function robustMaxAbs(values) {
    if (!values.length) return 1;
    const abs = values.map(Math.abs).sort((a, b) => a - b);
    const idx = Math.min(abs.length - 1, Math.floor(abs.length * 0.98));
    return abs[idx] || 1;
  }

  function createAnnualTrendPlot(opts) {
    const svg = d3.select(opts.svgEl);
    const tooltipEl = opts.tooltipEl;

    let data = null;
    let config = DEFAULT_CONFIG;
    let width = 0;
    let height = 0;
    let idleTimer = null;

    const gAxes = svg.append("g").attr("class", "axes-layer");
    const gZero = svg.append("g").attr("class", "zero-layer");
    const gBars = svg.append("g").attr("class", "bars-layer");
    const gTrend = svg.append("g").attr("class", "trend-layer");
    const gOverlay = svg.append("g").attr("class", "overlay-layer");

    function measure() {
      const box = opts.svgEl.getBoundingClientRect();
      width = Math.max(box.width, 280);
      height = Math.max(box.height, 260);
      svg.attr("viewBox", `0 0 ${width} ${height}`);
    }

    function resetIdleTimer() {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(hideTooltip, TOOLTIP_IDLE_MS);
    }

    function hideTooltip() {
      tooltipEl.hidden = true;
    }

    function render(stationData, renderConfig) {
      data = stationData;
      config = Object.assign({}, DEFAULT_CONFIG, renderConfig || {});
      measure();

      const activeKey = config.activePeriod || "period_a";
      const baseline = data[activeKey].mean_annual_metric;

      svg.attr("width", width).attr("height", height);
      gAxes.attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
      gZero.attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
      gBars.attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
      gTrend.attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
      gOverlay.attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

      if (baseline === null || baseline === undefined) {
        gAxes.selectAll("*").remove();
        gZero.selectAll("*").remove();
        gBars.selectAll("*").remove();
        gTrend.selectAll("*").remove();
        gOverlay.selectAll("*").remove();
        opts.onTrendReady && opts.onTrendReady(null);
        return;
      }

      const years = data.years.map((y) => +y);
      const rows = years
        .map((year) => {
          const amt = data.annual_metric[String(year)];
          if (amt === undefined) return null;
          return { year, amt, diff: amt - baseline };
        })
        .filter((r) => r !== null);

      const innerW = width - MARGIN.left - MARGIN.right;
      const innerH = height - MARGIN.top - MARGIN.bottom;

      const x = d3.scaleBand().domain(years.map(String)).range([0, innerW]).paddingInner(0.25).paddingOuter(0.08);

      const maxAbsDiff = robustMaxAbs(rows.map((r) => r.diff)) * 1.08;
      const y = d3.scaleLinear().domain([-maxAbsDiff, maxAbsDiff]).nice().range([innerH, 0]).clamp(true);

      const colorScale = d3
        .scaleLinear()
        .domain([-maxAbsDiff, 0, maxAbsDiff])
        .range(config.colorStops)
        .interpolate(d3.interpolateRgb)
        .clamp(true);

      drawAxes(x, y, innerW, innerH, years);
      drawZeroLine(y, innerW);
      drawBars(rows, x, y, colorScale, innerH);
      const trend = drawTrend(rows, x, y, innerW);
      wireOverlay(rows, x, y);

      opts.onTrendReady && opts.onTrendReady(trend);
    }

    function drawAxes(x, y, innerW, innerH, years) {
      gAxes.selectAll("*").remove();

      // Thin out year labels so they never overlap, regardless of how many
      // years the station's record spans.
      const tickEvery = Math.max(1, Math.ceil(years.length / (innerW / 42)));
      const tickYears = years.filter((yr, i) => i % tickEvery === 0);
      const xAxis = d3.axisBottom(x).tickValues(tickYears.map(String));
      gAxes
        .append("g")
        .attr("class", "axis month-axis")
        .attr("transform", `translate(0,${innerH})`)
        .call(xAxis);

      const yAxis = d3.axisLeft(y).ticks(6).tickFormat((d) => (d > 0 ? "+" : "") + d + config.axisSuffix);
      gAxes.append("g").attr("class", "axis").call(yAxis);

      if (config.axisUnit) {
        gAxes
          .append("text")
          .attr("class", "axis-unit-label")
          .attr("x", -MARGIN.left + 4)
          .attr("y", -6)
          .attr("text-anchor", "start")
          .text(config.axisUnit);
      }
    }

    function drawZeroLine(y, innerW) {
      gZero.selectAll("*").remove();
      gZero
        .append("line")
        .attr("class", "zero-line")
        .attr("x1", 0)
        .attr("x2", innerW)
        .attr("y1", y(0))
        .attr("y2", y(0));
    }

    function drawBars(rows, x, y, colorScale, innerH) {
      gBars.selectAll("*").remove();
      gBars
        .selectAll("rect.trend-bar")
        .data(rows, (d) => d.year)
        .join("rect")
        .attr("class", "trend-bar")
        .attr("x", (d) => x(String(d.year)))
        .attr("width", x.bandwidth())
        .attr("y", (d) => Math.min(y(d.diff), y(0)))
        .attr("height", (d) => Math.abs(y(d.diff) - y(0)))
        .attr("fill", (d) => colorScale(d.diff));
    }

    function drawTrend(rows, x, y, innerW) {
      gTrend.selectAll("*").remove();
      const fit = linearRegression(rows.map((r) => [r.year, r.diff]));
      if (!fit || rows.length < 2) return null;

      const firstYear = rows[0].year;
      const lastYear = rows[rows.length - 1].year;
      const bandOffset = x.bandwidth() / 2;
      const points = [
        [x(String(firstYear)) + bandOffset, y(fit.slope * firstYear + fit.intercept)],
        [x(String(lastYear)) + bandOffset, y(fit.slope * lastYear + fit.intercept)],
      ];

      gTrend
        .append("line")
        .attr("class", "trend-line")
        .attr("x1", points[0][0])
        .attr("y1", points[0][1])
        .attr("x2", points[1][0])
        .attr("y2", points[1][1]);

      return {
        slopePerYear: fit.slope,
        firstYear,
        lastYear,
        totalChange: fit.slope * (lastYear - firstYear),
      };
    }

    function wireOverlay(rows, x, y) {
      gOverlay.selectAll("*").remove();
      const byYear = new Map(rows.map((r) => [String(r.year), r]));
      gOverlay
        .selectAll("rect.trend-bar-overlay")
        .data(x.domain())
        .join("rect")
        .attr("class", "trend-bar-overlay")
        .attr("x", (yr) => x(yr))
        .attr("width", x.bandwidth())
        .attr("y", 0)
        .attr("height", y.range()[0])
        .on("pointerenter pointermove", (event, yr) => {
          resetIdleTimer();
          const row = byYear.get(yr);
          showTooltip(yr, row, event.clientX, event.clientY);
        })
        .on("pointerdown", (event, yr) => {
          resetIdleTimer();
          const row = byYear.get(yr);
          showTooltip(yr, row, event.clientX, event.clientY);
        })
        .on("pointerleave", hideTooltip);
    }

    function showTooltip(yr, row, clientX, clientY) {
      if (!row) {
        tooltipEl.innerHTML = `<b>${yr}</b><br/>${config.incompleteLabel || "keine Daten"}`;
      } else {
        tooltipEl.innerHTML =
          `<b>${row.year}</b><br/>${config.formatValue(row.amt)}<br/>` +
          `${config.formatDiff(row.diff)} ggü. Referenzperiode`;
      }
      tooltipEl.hidden = false;

      const wrapBox = opts.svgEl.parentElement.getBoundingClientRect();
      const tw = tooltipEl.offsetWidth;
      const th = tooltipEl.offsetHeight;
      const margin = 6;

      let left = clientX - wrapBox.left - tw / 2;
      left = Math.max(margin, Math.min(left, wrapBox.width - tw - margin));

      let top = clientY - wrapBox.top - th - 14;
      if (top < margin) top = clientY - wrapBox.top + 18;

      tooltipEl.style.left = left + "px";
      tooltipEl.style.top = top + "px";
    }

    window.addEventListener(
      "resize",
      debounce(() => {
        if (data) render(data, config);
      }, 200)
    );

    return { render };
  }

  function debounce(fn, ms) {
    let t;
    return function () {
      clearTimeout(t);
      const args = arguments;
      t = setTimeout(() => fn.apply(null, args), ms);
    };
  }

  window.AnnualTrendPlot = { create: createAnnualTrendPlot };
})();
