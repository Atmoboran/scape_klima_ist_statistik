// The "classic global warming plot": one bar per year, plus a solid 10-year
// centered moving-average line smoothing out year-to-year noise. Two view
// modes (config.mode, set by trend.js's toggle):
//   - "relative" (default): bar height is the year's deviation from the
//     active climate reference period, diverging from a zero baseline.
//   - "absolute": bar height is the year's actual value, and the reference
//     period's mean is drawn as a horizontal line instead of the zero line.
// Either way every bar is coloured by its deviation from the reference
// period, so the warming signal reads the same regardless of mode. Unlike
// spaghetti-plot.js/monthly-bar-plot.js there is no per-year "highlight"
// state here - the whole record is shown at once, which is the point of
// this chart. Built with vendored D3 v7, no build step.
(function () {
  "use strict";

  const MARGIN = { top: 20, right: 20, bottom: 30, left: 52 };
  const TOOLTIP_IDLE_MS = 5000;

  const DEFAULT_CONFIG = {
    colorStops: ["#2b3990", "#f2e6c9", "#d35b22"],
    axisSuffix: "°",
    activePeriod: "period_a",
    mode: "relative", // "relative" (deviation from reference period) or "absolute" (actual value)
    formatValue: (v) => `${v.toFixed(1)}`,
    formatDiff: (diff) => `${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(1)}`,
  };

  // Centered moving average over calendar years (not array indices), so a
  // missing/incomplete year doesn't silently shrink the window's time span.
  // A point is only drawn where at least minCount of the windowYears
  // candidate years actually have data - sparse windows are left as a gap
  // rather than averaged over too few points to mean much. `pairs` is
  // [{year, value}], already picked to whatever the active display mode is.
  function centeredMovingAverage(pairs, windowYears, minCount) {
    const byYear = new Map(pairs.map((p) => [p.year, p.value]));
    const half = Math.floor(windowYears / 2);
    const out = [];
    for (const p of pairs) {
      const vals = [];
      for (let yy = p.year - half + 1; yy <= p.year + half; yy++) {
        if (byYear.has(yy)) vals.push(byYear.get(yy));
      }
      if (vals.length >= minCount) {
        out.push({ year: p.year, value: vals.reduce((a, b) => a + b, 0) / vals.length });
      }
    }
    return out;
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
    const gGuide = svg.append("g").attr("class", "guide-layer");
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
      gGuide.selectAll("*").remove();
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
      gGuide.attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
      gOverlay.attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

      if (baseline === null || baseline === undefined) {
        gAxes.selectAll("*").remove();
        gZero.selectAll("*").remove();
        gBars.selectAll("*").remove();
        gTrend.selectAll("*").remove();
        gGuide.selectAll("*").remove();
        gOverlay.selectAll("*").remove();
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

      // The colour scale always encodes deviation from the reference period,
      // regardless of display mode, so the warming signal reads the same way
      // whether you're looking at absolute values or the deviation itself.
      const maxAbsDiff = robustMaxAbs(rows.map((r) => r.diff)) * 1.08;
      const colorScale = d3
        .scaleLinear()
        .domain([-maxAbsDiff, 0, maxAbsDiff])
        .range(config.colorStops)
        .interpolate(d3.interpolateRgb)
        .clamp(true);

      let yDomain;
      if (config.mode === "absolute") {
        const amts = rows.map((r) => r.amt);
        const minA = Math.min(...amts);
        const maxA = Math.max(...amts);
        const pad = (maxA - minA) * 0.08 || 1;
        const floor = config.yMin !== null && config.yMin !== undefined ? config.yMin : minA - pad;
        yDomain = [floor, maxA + pad];
      } else {
        yDomain = [-maxAbsDiff, maxAbsDiff];
      }
      const y = d3.scaleLinear().domain(yDomain).nice().range([innerH, 0]).clamp(true);

      drawAxes(x, y, innerW, innerH, years);
      drawBaselineLine(y, innerW, baseline);
      drawBars(rows, x, y, colorScale, baseline);
      drawTrend(rows, x, y);
      wireOverlay(rows, x, y, innerW, innerH);
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

      const signPrefix = config.mode === "absolute" ? (d) => "" : (d) => (d > 0 ? "+" : "");
      const yAxis = d3.axisLeft(y).ticks(6).tickFormat((d) => signPrefix(d) + d + config.axisSuffix);
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

    // In relative mode this is the zero line the bars diverge from; in
    // absolute mode it's the reference period's own mean, so "above/below
    // normal" is still visible even though the bars show actual values.
    function drawBaselineLine(y, innerW, baseline) {
      gZero.selectAll("*").remove();
      const refValue = config.mode === "absolute" ? baseline : 0;
      gZero
        .append("line")
        .attr("class", "zero-line")
        .attr("x1", 0)
        .attr("x2", innerW)
        .attr("y1", y(refValue))
        .attr("y2", y(refValue));
    }

    function drawBars(rows, x, y, colorScale, baseline) {
      gBars.selectAll("*").remove();
      const anchor = config.mode === "absolute" ? baseline : 0;
      const val = (d) => (config.mode === "absolute" ? d.amt : d.diff);
      gBars
        .selectAll("rect.trend-bar")
        .data(rows, (d) => d.year)
        .join("rect")
        .attr("class", "trend-bar")
        .attr("x", (d) => x(String(d.year)))
        .attr("width", x.bandwidth())
        .attr("y", (d) => Math.min(y(val(d)), y(anchor)))
        .attr("height", (d) => Math.abs(y(val(d)) - y(anchor)))
        .attr("fill", (d) => colorScale(d.diff));
    }

    function drawTrend(rows, x, y) {
      gTrend.selectAll("*").remove();

      const pairs = rows.map((r) => ({ year: r.year, value: config.mode === "absolute" ? r.amt : r.diff }));
      const ma = centeredMovingAverage(pairs, 10, 7);
      if (ma.length >= 2) {
        const bandOffset = x.bandwidth() / 2;
        const line = d3
          .line()
          .x((d) => x(String(d.year)) + bandOffset)
          .y((d) => y(d.value));
        gTrend.append("path").datum(ma).attr("class", "trend-line").attr("fill", "none").attr("d", line);
      }
    }

    // A touch pointer is implicitly captured by whatever element it went
    // down on, so per-year overlay rects (the previous approach) never see
    // pointermove events once the finger drifts onto a neighbouring bar -
    // that's what forced a lift-and-tap-again for every year. A single
    // full-width overlay (same trick as spaghetti-plot.js's day scrubbing)
    // fixes that: one element receives the whole drag, and the year is
    // computed from the pointer's x position on every move.
    function wireOverlay(rows, x, y, innerW, innerH) {
      gOverlay.selectAll("*").remove();
      const byYear = new Map(rows.map((r) => [String(r.year), r]));
      const domain = x.domain();
      const step = x.step();
      const rangeStart = x.range()[0];

      function yearAt(mx) {
        const idx = Math.min(domain.length - 1, Math.max(0, Math.floor((mx - rangeStart) / step)));
        return domain[idx];
      }

      function drawGuide(yr) {
        gGuide.selectAll("*").remove();
        const cx = x(yr) + x.bandwidth() / 2;
        gGuide.append("line").attr("class", "day-guide").attr("x1", cx).attr("x2", cx).attr("y1", 0).attr("y2", innerH);
      }

      function handlePointer(event) {
        resetIdleTimer();
        const [mx] = d3.pointer(event, gOverlay.node());
        const yr = yearAt(mx);
        drawGuide(yr);
        showTooltip(yr, byYear.get(yr), event.clientX, event.clientY);
      }

      gOverlay
        .append("rect")
        .attr("class", "trend-bar-overlay")
        .attr("x", 0)
        .attr("width", innerW)
        .attr("y", 0)
        .attr("height", innerH)
        .style("cursor", "crosshair")
        .on("pointermove", handlePointer)
        .on("pointerdown", handlePointer)
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
