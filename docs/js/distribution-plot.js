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

  const MARGIN = { top: 20, right: 20, bottom: 34, left: 12 };
  const SAMPLE_COUNT = 160;

  const DEFAULT_CONFIG = {
    colorStops: ["#2b3990", "#f2e6c9", "#d35b22"],
    axisSuffix: "°",
    activePeriod: "period_a",
    dailyIsCumulative: false,
    season: "full", // "full" | "winter" | "spring" | "summer" | "autumn"
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

      const [minAll, maxAll] = d3.extent(allValues);
      const pad = (maxAll - minAll) * 0.06 || 1;
      const xDomain = [minAll - pad, maxAll + pad];
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
