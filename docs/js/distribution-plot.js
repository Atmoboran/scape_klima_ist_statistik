// Distribution ("bell curve") of daily values for a single year vs. the
// pooled distribution of the active climate reference period - showing how
// the whole *shape* of "a typical day" has shifted, not just its average.
// Both curves share one Gaussian-kernel bandwidth (derived from the much
// larger reference-period sample) so their smoothness is directly
// comparable: a dashed, unfilled curve for the reference period, and a
// solid curve for the selected year with an area fill coloured by how far
// each point is from the reference period's own mean (the same diverging
// colour language used elsewhere in the app). Same render()/setYear()
// surface as spaghetti-plot.js so trend.js can drive it with a normal
// year timeline. Built with vendored D3 v7, no build step.
(function () {
  "use strict";

  const MARGIN = { top: 28, right: 20, bottom: 34, left: 34 };
  const SAMPLE_COUNT = 160;

  const DEFAULT_CONFIG = {
    axisSuffix: "°",
    activePeriod: "period_a",
    dailyIsCumulative: false,
    season: "full", // "full" | "winter" | "spring" | "summer" | "autumn"
    formatValue: (v) => `${v.toFixed(1)}`,
  };

  // Day-of-year ranges (1-365, Feb 29 already dropped - see build_data.py's
  // alignment) for the four meteorological seasons, each as [startDoy,
  // endDoy, yearOffset]. Meteorological winter spans a calendar-year
  // boundary and is conventionally labelled by the year its Jan/Feb fall
  // in, so it's built from *last* year's December plus *this* year's
  // Jan/Feb (yearOffset -1 and 0).
  const SEASON_RANGES = {
    winter: [
      [335, 365, -1],
      [1, 59, 0],
    ],
    spring: [[60, 151, 0]],
    summer: [[152, 243, 0]],
    autumn: [[244, 334, 0]],
  };

  function mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function stdDev(arr) {
    const n = arr.length;
    if (n < 2) return 0;
    const m = mean(arr);
    const variance = arr.reduce((a, b) => a + (b - m) * (b - m), 0) / (n - 1);
    return Math.sqrt(variance);
  }

  // Silverman's rule of thumb for KDE bandwidth.
  function silvermanBandwidth(arr) {
    const n = arr.length;
    if (n < 2) return 1;
    return 1.06 * stdDev(arr) * Math.pow(n, -0.2) || 1;
  }

  function gaussianKernel(u) {
    return Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
  }

  function kde(values, bandwidth, xs) {
    const n = values.length;
    if (!n) return xs.map(() => 0);
    return xs.map((x) => {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += gaussianKernel((x - values[i]) / bandwidth);
      return sum / (n * bandwidth);
    });
  }

  // strands are either the raw daily value (temperature/sunshine, nulls for
  // missing days) or a cumulative running total (precipitation, see
  // build_data.py) - this returns the actual per-day value at every
  // day-of-year, nulls preserved, so slicing by day-of-year range still
  // lines up (unlike a null-filtered flat array).
  function alignedDailyValues(strand, isCumulative) {
    if (!isCumulative) return strand;
    const out = new Array(strand.length);
    let prev = 0;
    for (let i = 0; i < strand.length; i++) {
      out[i] = strand[i] - prev;
      prev = strand[i];
    }
    return out;
  }

  // Every valid day-of-year value for one "labelled year" of one season
  // (or the whole year when season is "full"/unrecognised), pulling in the
  // previous year's strand too when the season straddles New Year's (winter).
  function seasonValues(data, year, season, isCumulative) {
    const ranges = SEASON_RANGES[season];
    if (!ranges) {
      const strand = data.strands[String(year)];
      if (!strand) return [];
      return alignedDailyValues(strand, isCumulative).filter((v) => v !== null && v !== undefined);
    }
    const out = [];
    for (const [startDoy, endDoy, yearOffset] of ranges) {
      const strand = data.strands[String(year + yearOffset)];
      if (!strand) continue;
      const aligned = alignedDailyValues(strand, isCumulative);
      for (let doy = startDoy; doy <= endDoy; doy++) {
        const v = aligned[doy - 1];
        if (v !== null && v !== undefined) out.push(v);
      }
    }
    return out;
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

  function createDistributionPlot(opts) {
    const svg = d3.select(opts.svgEl);

    let data = null;
    let config = DEFAULT_CONFIG;
    let width = 0;
    let height = 0;
    let xScale, yScale, colorScale, bandwidth, xs;
    let currentYear = null;

    const gAxes = svg.append("g").attr("class", "axes-layer");
    const gDefs = svg.append("defs");
    const gRef = svg.append("g").attr("class", "dist-ref-layer");
    const gYear = svg.append("g").attr("class", "dist-year-layer");
    // Drawn last (on top of both curves and their fills) so it stays visible
    // wherever it falls, like a crosshair.
    const gMean = svg.append("g").attr("class", "dist-mean-layer");

    function measure() {
      const box = opts.svgEl.getBoundingClientRect();
      width = Math.max(box.width, 280);
      height = Math.max(box.height, 260);
      svg.attr("viewBox", `0 0 ${width} ${height}`);
    }

    function render(stationData, renderConfig) {
      data = stationData;
      config = Object.assign({}, DEFAULT_CONFIG, renderConfig || {});
      measure();

      const innerW = width - MARGIN.left - MARGIN.right;
      const innerH = height - MARGIN.top - MARGIN.bottom;

      svg.attr("width", width).attr("height", height);
      gAxes.attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
      gRef.attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
      gYear.attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
      gMean.attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

      // Pool every day of every *complete* year within the active reference
      // period into one big sample - a proper distribution, not just the
      // 365 per-calendar-day averages (which would already be smoothed by
      // the 30-year averaging and read as an unrealistically narrow curve).
      const period = data[config.activePeriod];
      const refYears = data.years.filter(
        (y) => y >= period.start && y <= period.end && data.annual_metric[String(y)] !== undefined
      );
      const refValues = [];
      for (const y of refYears) refValues.push(...seasonValues(data, y, config.season, config.dailyIsCumulative));

      // The x-axis is fixed from *every* year's values for the active season
      // (not just the reference period's) so switching which year is
      // highlighted never rescales the axis - only loading a different
      // station/variable/season does.
      const allValues = [];
      for (const y of data.years) allValues.push(...seasonValues(data, y, config.season, config.dailyIsCumulative));

      if (!refValues.length || !allValues.length) {
        gAxes.selectAll("*").remove();
        gRef.selectAll("*").remove();
        gYear.selectAll("*").remove();
        return;
      }

      // A robust (2nd-98th percentile) range rather than the true min/max:
      // precipitation in particular is so right-skewed (mostly ~0mm, a
      // handful of storm days past 100mm) that the true max would squeeze
      // the entire meaningful shape into a sliver near the left edge.
      const sortedAll = allValues.slice().sort((a, b) => a - b);
      const loAll = percentile(sortedAll, 0.02);
      const hiAll = percentile(sortedAll, 0.98);
      const pad = (hiAll - loAll) * 0.08 || 1;
      const xDomain = [loAll - pad, hiAll + pad];
      xScale = d3.scaleLinear().domain(xDomain).range([0, innerW]);

      bandwidth = silvermanBandwidth(refValues);
      xs = d3.range(SAMPLE_COUNT + 1).map((i) => xDomain[0] + (i / SAMPLE_COUNT) * (xDomain[1] - xDomain[0]));

      const refDensity = kde(refValues, bandwidth, xs);
      const refPeak = Math.max(...refDensity) || 1;
      // Headroom above the reference curve's own peak: a single year has far
      // fewer samples than the pooled 30-year reference, so its KDE peak can
      // legitimately sit somewhat higher; clamp(true) below is the backstop
      // for the rare year that still exceeds this.
      yScale = d3.scaleLinear().domain([0, refPeak * 1.6]).range([innerH, 0]).clamp(true);

      const refMean = mean(refValues);
      const halfWidth = robustHalfWidth(refValues, refMean);
      colorScale = d3
        .scaleLinear()
        .domain([refMean - halfWidth, refMean, refMean + halfWidth])
        .range(config.colorStops)
        .interpolate(d3.interpolateRgb)
        .clamp(true);

      drawAxes(innerW, innerH);
      drawReferenceCurve(refDensity, innerH);
      drawMeanLine(refMean, innerW, innerH);
      buildGradient();

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
        .tickFormat((d) => d + config.axisSuffix);
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

      // No numeric density ticks - a raw KDE value ("0.034") means nothing
      // to a lay reader - just a vertical rule and a rotated title so the
      // axis still reads as "this dimension is how often, not how much".
      gAxes.append("g").attr("class", "axis").call(d3.axisLeft(yScale).ticks(0).tickSize(0));
      gAxes
        .append("text")
        .attr("class", "axis-unit-label dist-y-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerH / 2)
        .attr("y", -22)
        .attr("text-anchor", "middle")
        .text(window.TEXTS.charts.frequencyAxis);
    }

    // A dotted vertical guide at the reference period's own mean, since the
    // colour scale's pale midpoint alone is too subtle to read as "this is
    // the average" - especially where the curve is low or thin. Drawn on
    // top of both curves (gMean is the topmost layer) so it stays visible
    // wherever it falls, and labelled at the bottom (not the top) so it
    // never collides with the year/station badge over the top-right corner.
    function drawMeanLine(refMean, innerW, innerH) {
      gMean.selectAll("*").remove();
      const x = xScale(refMean);
      const clampedLabelX = Math.max(30, Math.min(innerW - 30, x));
      gMean
        .append("line")
        .attr("class", "dist-mean-line")
        .attr("x1", x)
        .attr("x2", x)
        .attr("y1", 0)
        .attr("y2", innerH);
      gMean
        .append("text")
        .attr("class", "dist-mean-label")
        .attr("x", clampedLabelX)
        .attr("y", innerH - 8)
        .attr("text-anchor", "middle")
        .text(`${window.TEXTS.charts.meanPrefix} ${config.formatValue(refMean)}`);
    }

    function drawReferenceCurve(refDensity, innerH) {
      gRef.selectAll("*").remove();
      const points = xs.map((x, i) => [x, refDensity[i]]);
      const area = d3.area().curve(d3.curveBasis).x((d) => xScale(d[0])).y0(innerH).y1((d) => yScale(d[1]));
      const line = d3.line().curve(d3.curveBasis).x((d) => xScale(d[0])).y((d) => yScale(d[1]));
      gRef.append("path").datum(points).attr("class", "dist-ref-area").attr("d", area);
      gRef.append("path").datum(points).attr("class", "dist-ref-line").attr("d", line);
    }

    // One horizontal gradient, positioned in the chart's own local (already
    // translated) coordinate space, reused by every setYear() call - only
    // render() rebuilds it, since it only depends on the reference period.
    function buildGradient() {
      gDefs.selectAll("*").remove();
      const [x0, x1] = xScale.range();
      const grad = gDefs
        .append("linearGradient")
        .attr("id", "dist-year-grad")
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", x0)
        .attr("x2", x1)
        .attr("y1", 0)
        .attr("y2", 0);
      const stopCount = 16;
      for (let i = 0; i <= stopCount; i++) {
        const t = i / stopCount;
        grad.append("stop").attr("offset", `${t * 100}%`).attr("stop-color", colorScale(xScale.invert(t * (x1 - x0))));
      }
    }

    function setYear(year) {
      currentYear = year;
      const innerH = height - MARGIN.top - MARGIN.bottom;
      gYear.selectAll("*").remove();
      if (year === null || year === undefined) return;
      const values = seasonValues(data, year, config.season, config.dailyIsCumulative);
      if (values.length < 10) return; // too sparse a year/season to plot meaningfully

      const density = kde(values, bandwidth, xs);
      const points = xs.map((x, i) => [x, density[i]]);
      const area = d3.area().curve(d3.curveBasis).x((d) => xScale(d[0])).y0(innerH).y1((d) => yScale(d[1]));
      const line = d3.line().curve(d3.curveBasis).x((d) => xScale(d[0])).y((d) => yScale(d[1]));

      gYear
        .append("path")
        .datum(points)
        .attr("class", "dist-year-area")
        .attr("d", area)
        .attr("fill", "url(#dist-year-grad)");
      gYear.append("path").datum(points).attr("class", "dist-year-line").attr("d", line);
    }

    window.addEventListener(
      "resize",
      debounce(() => {
        if (data) render(data, Object.assign({}, config, { preserveYear: true }));
      }, 200)
    );

    return { render, setYear };
  }

  function debounce(fn, ms) {
    let t;
    return function () {
      clearTimeout(t);
      const args = arguments;
      t = setTimeout(() => fn.apply(null, args), ms);
    };
  }

  window.DistributionPlot = { create: createDistributionPlot };
})();
