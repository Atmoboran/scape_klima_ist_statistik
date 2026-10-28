// "Häufigkeit": how many days of one year (or season) fell into each value
// band - a histogram of columns - against the reference period, drawn as a
// dashed step line at the average number of days per year in each band.
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

  // The value bands of a station/variable: a round width and edges covering
  // the 2nd-98th percentile of every day of every year (the whole year, so a
  // season keeps the whole-year axis). Days beyond the edges count into the
  // first/last band, which are therefore open-ended ("unter …", "ab …").
  // Exposed as DistributionPlot.bands so the tasks count days the same way.
  function bands(data, isCumulative) {
    const all = [];
    for (const y of data.years) all.push(...seasonValues(data, y, "full", isCumulative));
    if (!all.length) return null;
    all.sort((a, b) => a - b);
    const lo = percentile(all, 0.02);
    const hi = percentile(all, 0.98);
    const width = d3.tickStep(lo, hi, TARGET_BINS) || 1;
    const start = Math.floor(lo / width) * width;
    const count = Math.max(1, Math.ceil((hi - start) / width));
    // integer arithmetic on the edges avoids 0.1 + 0.2 style drift
    const edge = (i) => +(start + i * width).toFixed(6);
    return {
      width,
      count,
      edge,
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
    let idleTimer = null;

    const gAxes = svg.append("g").attr("class", "axes-layer");
    const gYear = svg.append("g").attr("class", "dist-year-layer");
    const gRef = svg.append("g").attr("class", "dist-ref-layer"); // on top of the columns, so it stays visible
    const gMean = svg.append("g").attr("class", "dist-mean-layer");
    const gGuide = svg.append("g").attr("class", "guide-layer");
    const overlay = svg.append("rect").attr("class", "overlay").attr("fill", "transparent");

    function measure() {
      const box = opts.svgEl.getBoundingClientRect();
      width = Math.max(box.width, 280);
      height = Math.max(box.height, 260);
      svg.attr("viewBox", `0 0 ${width} ${height}`);
    }

    function clear() {
      for (const g of [gAxes, gYear, gRef, gMean, gGuide]) g.selectAll("*").remove();
    }

    function render(stationData, renderConfig) {
      data = stationData;
      config = Object.assign({}, DEFAULT_CONFIG, renderConfig || {});
      measure();

      const innerW = width - MARGIN.left - MARGIN.right;
      const innerH = height - MARGIN.top - MARGIN.bottom;

      svg.attr("width", width).attr("height", height);
      for (const g of [gAxes, gYear, gRef, gMean, gGuide]) g.attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
      overlay.attr("x", MARGIN.left).attr("y", MARGIN.top).attr("width", innerW).attr("height", innerH).style("cursor", "crosshair");

      band = bands(data, config.dailyIsCumulative);

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
      let maxDays = Math.max(...refCounts);
      for (const y of data.years) {
        const c = countDays(seasonValues(data, y, config.season, config.dailyIsCumulative), band);
        maxDays = Math.max(maxDays, ...c);
      }
      yScale = d3.scaleLinear().domain([0, maxDays || 1]).nice(5).range([innerH, 0]);

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
      wireOverlay(innerH);

      if (data.years.length) {
        const preserve = config.preserveYear && currentYear && data.years.includes(currentYear);
        setYear(preserve ? currentYear : data.years[data.years.length - 1]);
      }
    }

    function drawAxes(innerW, innerH) {
      gAxes.selectAll("*").remove();
      const xAxis = d3
        .axisBottom(xScale)
        .ticks(6)
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

      gAxes.append("g").attr("class", "axis").call(d3.axisLeft(yScale).ticks(5).tickFormat((d) => window.KIS.tick(d)));
      gAxes
        .append("text")
        .attr("class", "axis-unit-label dist-y-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerH / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .text(window.TEXTS.charts.frequencyAxis(window.KIS.num(band.width, band.width < 1 ? 1 : 0), config.axisUnit));
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
        .attr("fill", (d) => colorScale((band.edge(d.i) + band.edge(d.i + 1)) / 2));
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
        const range =
          i === 0 ? window.TEXTS.charts.bandBelow(hi, config.axisUnit)
          : i === band.count - 1 ? window.TEXTS.charts.bandFrom(lo, config.axisUnit)
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
