// "Häufigkeit": how many days of one year (or season) fell into each value
// band - a histogram of columns - against the reference period, drawn as a
// dashed step line at the average number of days per year in each band.
// Column width and range come from config.histogram (js/variable-config.js);
// precipitation gets a hatched open last column and a broken y-axis.
// Columns are coloured by how far their band is from the reference period's
// mean (the same diverging colours as elsewhere). Hovering or tapping a column
// shows the band and both day counts. Same render()/setYear() surface as the
// other plots so main.js can drive it with the year timeline. Built with
// vendored D3 v7, no build step.
(() => {
  'use strict';

  const MARGIN = { top: 54, right: 14, bottom: 34, left: 56 }; // top: room for the legend; left: day counts + axis title
  const TARGET_BINS = 35; // band width = a round step that gives about this many columns
  const TOOLTIP_IDLE_MS = 5000;

  const DEFAULT_CONFIG = {
    axisSuffix: "°",
    activePeriod: "period_a",
    dailyIsCumulative: false,
    season: "full", // "full" | "winter" | "spring" | "summer" | "autumn"
    formatValue: (v) => `${v.toFixed(1)}`,
  };

  // Season ranges, per-day values and completeness come from KIS.seasons (js/shared.js).
  const seasonValues = (data, year, season, isCumulative) => window.KIS.seasons.values(data, year, season, isCumulative);
  const isComplete = (data, year, season) => window.KIS.seasons.complete(data, year, season);

  function mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  // A robust (97th-percentile) half-width around the mean, so a handful of
  // extreme days don't stretch the colour scale until everything else looks
  // the same pale neutral.
  function robustHalfWidth(arr, m) {
    const abs = arr.map((v) => Math.abs(v - m)).sort((a, b) => a - b);
    if (!abs.length) return 1;
    const idx = Math.min(abs.length - 1, Math.floor(abs.length * 0.97));
    return abs[idx] || 1;
  }

  // arr must already be sorted ascending.
  function percentile(arr, p) {
    if (!arr.length) return 0;
    const idx = Math.min(arr.length - 1, Math.max(0, Math.round(p * (arr.length - 1))));
    return arr[idx];
  }

  // The value bands (columns) of a station/variable. spec (js/variable-config.js):
  //   { width }            columns of this width over every day ever measured
  //   { width, max }       columns from 0 up to max, plus one open column for
  //                        everything from max upwards (drawn hatched)
  // Exposed as DistributionPlot.bands so the tasks count days the same way.
  function bands(data, isCumulative, spec) {
    const all = [];
    for (const y of data.years) all.push(...seasonValues(data, y, "full", isCumulative));
    if (!all.length) return null;
    const width = (spec && spec.width) || 1;
    const open = !!(spec && spec.max !== undefined);
    let start, closed;
    if (open) {
      start = 0;
      closed = Math.round(spec.max / width);
    } else {
      const lo = Math.min(...all);
      const hi = Math.max(...all);
      start = Math.floor(lo / width) * width;
      closed = Math.max(1, Math.floor((hi - start) / width + 1e-9) + 1);
    }
    const count = closed + (open ? 1 : 0);
    // rounded edges avoid 0.1 + 0.2 style drift
    const edge = (i) => +(start + i * width).toFixed(6);
    return {
      width,
      count,
      edge,
      openLast: open, // the last column collects everything from edge(count - 1) upwards
      index: (v) => Math.min(count - 1, Math.max(0, Math.floor((v - start) / width + 1e-9))),
    };
  }

  function countDays(values, b) {
    const counts = new Array(b.count).fill(0);
    for (const v of values) counts[b.index(v)]++;
    return counts;
  }

  function createDistributionPlot(opts) {
    const svg = d3.select(opts.svgEl);
    const tooltipEl = opts.tooltipEl;

    let data = null;
    let config = DEFAULT_CONFIG;
    let width = 0;
    let height = 0;
    let xScale, yScale, colorScale, band;
    let refCounts = null; // average days per band and year in the reference period
    let currentYear = null;
    let yearCounts = null;
    let yBreak = null; // broken y-axis (precipitation): { low, upMin, upMax, gapTop, gapBottom }
    let idleTimer = null;

    const gAxes = svg.append("g").attr("class", "axes-layer");
    const gYear = svg.append("g").attr("class", "dist-year-layer");
    const gRef = svg.append("g").attr("class", "dist-ref-layer"); // on top of the columns, so it stays visible
    const gMean = svg.append("g").attr("class", "dist-mean-layer");
    const gBreak = svg.append("g").attr("class", "axis-break-layer"); // marks the cut of a broken y-axis
    const gGuide = svg.append("g").attr("class", "guide-layer");
    const gDefs = svg.append("defs");
    const overlay = svg.append("rect").attr("class", "overlay").attr("fill", "transparent");

    function measure() {
      const box = opts.svgEl.getBoundingClientRect();
      width = Math.max(box.width, 280);
      height = Math.max(box.height, 260);
      svg.attr("viewBox", `0 0 ${width} ${height}`);
    }

    function clear() {
      for (const g of [gAxes, gYear, gRef, gMean, gBreak, gGuide]) g.selectAll("*").remove();
    }

    function render(stationData, renderConfig) {
      data = stationData;
      config = Object.assign({}, DEFAULT_CONFIG, renderConfig || {});
      measure();

      const innerW = width - MARGIN.left - MARGIN.right;
      const innerH = height - MARGIN.top - MARGIN.bottom;

      svg.attr("width", width).attr("height", height);
      for (const g of [gAxes, gYear, gRef, gMean, gBreak, gGuide]) g.attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
      overlay.attr("x", MARGIN.left).attr("y", MARGIN.top).attr("width", innerW).attr("height", innerH).style("cursor", "crosshair");

      band = bands(data, config.dailyIsCumulative, config.histogram);

      // Reference: every complete year of the period, counted per band and
      // averaged - "how many days a year typically fell into this band".
      const period = data[config.activePeriod];
      const refYears = data.years.filter((y) => y >= period.start && y <= period.end && isComplete(data, y, config.season));
      const refValues = [];
      refCounts = band ? new Array(band.count).fill(0) : null;
      for (const y of refYears) {
        const v = seasonValues(data, y, config.season, config.dailyIsCumulative);
        refValues.push(...v);
        countDays(v, band).forEach((c, i) => { refCounts[i] += c; });
      }
      if (!band || !refYears.length || !refValues.length) {
        clear();
        refCounts = null;
        return;
      }
      refCounts = refCounts.map((c) => c / refYears.length);

      xScale = d3.scaleLinear().domain([band.edge(0), band.edge(band.count)]).range([0, innerW]);

      // The y-axis is fixed over all years of this station and season, so it
      // doesn't jump while the timeline plays.
      let maxFirst = refCounts[0];
      let minFirst = Infinity;
      let maxRest = Math.max(...refCounts.slice(1));
      for (const y of data.years) {
        const c = countDays(seasonValues(data, y, config.season, config.dailyIsCumulative), band);
        if (!c.some((n) => n > 0)) continue;
        maxFirst = Math.max(maxFirst, c[0]);
        minFirst = Math.min(minFirst, c[0]);
        maxRest = Math.max(maxRest, ...c.slice(1));
      }
      yBreak = null;
      if (config.histogram && config.histogram.brokenAxis) {
        // Broken y-axis: the first column (dry days) is far taller than all
        // others. The lower part (most of the height) shows 0 up to the
        // tallest other column, the upper part only where the first column
        // ends; the values between are cut out and marked.
        const low = d3.scaleLinear().domain([0, maxRest * 1.1 || 1]).nice(4).domain()[1];
        const upTicks = d3.ticks(Math.min(minFirst, maxFirst), maxFirst, 2);
        const step = upTicks.length > 1 ? upTicks[1] - upTicks[0] : 10;
        const upMin = Math.floor(Math.min(minFirst, refCounts[0]) / step) * step;
        const upMax = Math.ceil(maxFirst / step) * step || upMin + step;
        if (upMin > low * 1.3) {
          const gapTop = innerH * 0.2;
          const gapBottom = gapTop + 14;
          yScale = d3.scaleLinear().domain([0, low, upMin, upMax]).range([innerH, gapBottom, gapTop, 0]);
          yBreak = { low, upMin, upMax, gapTop, gapBottom };
        }
      }
      if (!yBreak) yScale = d3.scaleLinear().domain([0, Math.max(maxFirst, maxRest) || 1]).nice(5).range([innerH, 0]);

      const refMean = mean(refValues);
      const halfWidth = robustHalfWidth(refValues, refMean);
      colorScale = d3
        .scaleLinear()
        .domain([refMean - halfWidth, refMean, refMean + halfWidth])
        .range(config.colorStops)
        .interpolate(d3.interpolateRgb)
        .clamp(true);

      drawAxes(innerW, innerH);
      drawReference();
      drawMeanLine(refMean, innerW, innerH);
      drawBreak(innerW);
      buildHatch();
      wireOverlay(innerH);

      if (data.years.length) {
        const preserve = config.preserveYear && currentYear && data.years.includes(currentYear);
        setYear(preserve ? currentYear : data.years[data.years.length - 1]);
      }
    }

    function drawAxes(innerW, innerH) {
      gAxes.selectAll("*").remove();
      const closedEnd = band.edge(band.count - (band.openLast ? 1 : 0));
      const xAxis = d3
        .axisBottom(xScale)
        .tickValues(d3.ticks(band.edge(0), closedEnd, 6).filter((v) => v >= band.edge(0) && v <= closedEnd))
        .tickSize(-innerH)
        .tickFormat((d) => window.KIS.tick(d)); // the unit stands at the right end of the axis
      gAxes.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`).call(xAxis);

      if (config.axisUnit) {
        gAxes
          .append("text")
          .attr("class", "axis-unit-label")
          .attr("x", innerW)
          .attr("y", innerH + 30)
          .attr("text-anchor", "end")
          .text(config.axisUnit);
      }

      const yAxis = d3.axisLeft(yScale).tickFormat((d) => window.KIS.tick(d));
      if (yBreak) yAxis.tickValues(d3.ticks(0, yBreak.low, 4).concat(d3.ticks(yBreak.upMin, yBreak.upMax, 3).filter((v) => v > yBreak.upMin)));
      else yAxis.ticks(5);
      gAxes.append("g").attr("class", "axis").call(yAxis);
      gAxes
        .append("text")
        .attr("class", "axis-unit-label dist-y-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerH / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .text(window.TEXTS.charts.frequencyAxis(window.KIS.num(band.width, band.width < 1 ? 1 : 0), config.axisUnit));
      gAxes.lower();
    }

    // The reference period as a dashed step line along the tops of its bands.
    function drawReference() {
      gRef.selectAll("*").remove();
      const pts = [];
      refCounts.forEach((c, i) => {
        pts.push([xScale(band.edge(i)), yScale(c)], [xScale(band.edge(i + 1)), yScale(c)]);
      });
      gRef.append("path").attr("class", "dist-ref-line").attr("d", d3.line()(pts));
    }

    // A dotted vertical guide at the reference period's own mean, labelled near the top
    // (with a light halo, see css/app.css) where the columns rarely reach.
    function drawMeanLine(refMean, innerW, innerH) {
      gMean.selectAll("*").remove();
      const x = xScale(Math.max(band.edge(0), Math.min(band.edge(band.count), refMean)));
      const clampedLabelX = Math.max(30, Math.min(innerW - 30, x));
      gMean.append("line").attr("class", "dist-mean-line").attr("x1", x).attr("x2", x).attr("y1", 0).attr("y2", yScale.range()[0]);
      gMean
        .append("text")
        .attr("class", "dist-mean-label")
        .attr("x", clampedLabelX)
        .attr("y", 14)
        .attr("text-anchor", "middle")
        .text(`${window.TEXTS.charts.meanPrefix} ${config.formatValue(refMean)}`);
    }

    // The cut of a broken y-axis: a paper-coloured band across the chart with
    // two slanted strokes on the axis, so the cut-out range is obvious.
    function drawBreak(innerW) {
      gBreak.selectAll("*").remove();
      if (!yBreak) return;
      const { gapTop, gapBottom } = yBreak;
      gBreak.append("rect").attr("class", "axis-break-gap").attr("x", -8).attr("width", innerW + 8).attr("y", gapTop + 2).attr("height", gapBottom - gapTop - 4);
      for (const y of [gapTop + 2, gapBottom - 2]) {
        gBreak.append("line").attr("class", "axis-break-mark").attr("x1", -8).attr("x2", 8).attr("y1", y + 3).attr("y2", y - 3);
      }
    }

    // Hatching for the open last column (e.g. "ab 30 mm").
    function buildHatch() {
      gDefs.selectAll("*").remove();
      if (!band.openLast) return;
      const c = colorScale(band.edge(band.count - 1) + band.width / 2);
      const pat = gDefs.append("pattern").attr("id", "dist-hatch").attr("patternUnits", "userSpaceOnUse")
        .attr("width", 6).attr("height", 6).attr("patternTransform", "rotate(45)");
      pat.append("rect").attr("width", 6).attr("height", 6).attr("fill", c).attr("opacity", 0.25);
      pat.append("rect").attr("width", 3).attr("height", 6).attr("fill", c);
    }

    function setYear(year) {
      currentYear = year;
      gYear.selectAll("*").remove();
      yearCounts = null;
      if (!band || !refCounts || year === null || year === undefined) return;
      const values = seasonValues(data, year, config.season, config.dailyIsCumulative);
      if (!values.length) return;
      yearCounts = countDays(values, band);
      const innerH = yScale.range()[0];
      const gap = Math.min(1.5, (xScale(band.edge(1)) - xScale(band.edge(0))) * 0.15);
      gYear
        .selectAll("rect")
        .data(yearCounts.map((c, i) => ({ c, i })).filter((d) => d.c > 0))
        .join("rect")
        .attr("class", "dist-bar")
        .attr("x", (d) => xScale(band.edge(d.i)) + gap / 2)
        .attr("width", (d) => Math.max(1, xScale(band.edge(d.i + 1)) - xScale(band.edge(d.i)) - gap))
        .attr("y", (d) => yScale(d.c))
        .attr("height", (d) => innerH - yScale(d.c))
        .attr("fill", (d) => (band.openLast && d.i === band.count - 1 ? "url(#dist-hatch)" : colorScale((band.edge(d.i) + band.edge(d.i + 1)) / 2)));
      gYear.raise(); gRef.raise(); gMean.raise(); gBreak.raise(); gGuide.raise(); overlay.raise();
    }

    // ---- hover / tap: band, days in the chosen year, days in the reference ----
    function resetIdleTimer() {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(hideTooltip, TOOLTIP_IDLE_MS);
    }

    function hideTooltip() {
      if (tooltipEl) tooltipEl.hidden = true;
      gGuide.selectAll("*").remove();
    }

    function wireOverlay(innerH) {
      const handle = (event) => {
        if (!tooltipEl || !refCounts) return;
        resetIdleTimer();
        if (event.type === "pointerdown" && opts.onPointer) opts.onPointer();
        const [mx] = d3.pointer(event, gYear.node());
        const i = band.index(xScale.invert(mx));
        gGuide.selectAll("*").remove();
        gGuide
          .append("rect")
          .attr("class", "dist-band-guide")
          .attr("x", xScale(band.edge(i)))
          .attr("width", xScale(band.edge(i + 1)) - xScale(band.edge(i)))
          .attr("y", 0)
          .attr("height", innerH);
        const fmt = (v) => window.KIS.num(v, band.width < 1 ? 1 : 0);
        const lo = fmt(band.edge(i));
        const hi = fmt(band.edge(i + 1));
        const range = band.openLast && i === band.count - 1
          ? window.TEXTS.charts.bandFrom(lo, config.axisUnit)
          : window.TEXTS.charts.band(lo, hi, config.axisUnit);
        const period = data[config.activePeriod];
        tooltipEl.innerHTML = window.TEXTS.charts.bandTooltip(
          range,
          currentYear,
          yearCounts ? yearCounts[i] : null,
          `${period.start}–${period.end}`,
          window.KIS.num(refCounts[i], 1)
        );
        tooltipEl.hidden = false;
        window.KIS.placeTooltip(tooltipEl, tooltipEl.parentElement, event.clientX, event.clientY);
      };
      overlay.on("pointermove", handle).on("pointerdown", handle).on("pointerleave", hideTooltip);
    }

    window.addEventListener(
      "resize",
      window.KIS.debounce(() => {
        if (data && opts.svgEl.getBoundingClientRect().width > 0) render(data, Object.assign({}, config, { preserveYear: true }));
      }, 200)
    );

    return { render, setYear };
  }

  window.DistributionPlot = { create: createDistributionPlot, bands, countDays };
})();
