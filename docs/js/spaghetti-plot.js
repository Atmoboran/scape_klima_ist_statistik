// Interactive climate chart: one thin line per year (temperature: daily mean;
// precipitation: cumulative sum by day-of-year). Every point along a strand
// is coloured by how far that day deviates from the active 30-year climate
// reference period (a per-year linear gradient, not one flat colour), and
// that same reference period is drawn as a single dashed line. Which year is
// highlighted is driven entirely by the timeline (slider/play) in main.js —
// moving the pointer over the chart only shows that calendar day's historic
// min/mean/max, it never changes the highlighted year. Variable-specific
// presentation (units, colours, tooltip wording) is passed in via a `config`
// object on each render() call, so this module doesn't need to know which
// variable it's drawing. Built with vendored D3 v7, no build step.
(function () {
  "use strict";

  const MARGIN = { top: 18, right: 24, bottom: 30, left: 44 };
  const MONTH_STARTS = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
  const MONTH_LABELS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const TOOLTIP_IDLE_MS = 5000;

  const DEFAULT_CONFIG = {
    colorStops: ["#2b3990", "#f2e6c9", "#d35b22"],
    axisSuffix: "°",
    yMin: null, // null = auto-pad below the lowest value; set e.g. 0 to anchor a magnitude that can't go negative
    aboveColor: "#dd2a26",
    belowColor: "#2b3990",
    activePeriod: "period_a", // which climate reference period ("period_a"/"period_b") strands are colored against
    formatDayTooltip: (stat, dateLabel) =>
      `<b>${dateLabel}</b><br/>Durchschnitt: ${stat.mean}<br/>` +
      `<span class="tt-cold">Minimum: ${stat.min} (${stat.minYear})</span><br/>` +
      `<span class="tt-warm">Maximum: ${stat.max} (${stat.maxYear})</span>`,
  };

  function createSpaghettiPlot(opts) {
    const svg = d3.select(opts.svgEl);
    const tooltipEl = opts.tooltipEl;

    let data = null;
    let config = DEFAULT_CONFIG;
    let width = 0;
    let height = 0;
    let xScale, yScale, devColorScale, baseline;
    let highlightedYear = null;
    let idleTimer = null;

    const gDefs = svg.append("defs");
    const gAxes = svg.append("g").attr("class", "axes-layer");
    const gAnomaly = svg.append("g").attr("class", "anomaly-layer");
    const gStrands = svg.append("g").attr("class", "strands-layer");
    const gGuide = svg.append("g").attr("class", "guide-layer");
    const overlay = svg.append("rect").attr("class", "overlay").attr("fill", "transparent");

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

      const innerW = width - MARGIN.left - MARGIN.right;
      const innerH = height - MARGIN.top - MARGIN.bottom;

      xScale = d3.scaleLinear().domain([1, 365]).range([0, innerW]);

      const allValues = [];
      for (const year of data.years) {
        for (const v of data.strands[year]) if (v !== null) allValues.push(v);
      }
      const [minV, maxV] = d3.extent(allValues);
      const pad = (maxV - minV) * 0.03 || 1;
      const yMin = config.yMin !== null ? config.yMin : minV - pad;
      yScale = d3.scaleLinear().domain([yMin, maxV + pad]).range([innerH, 0]);

      // Colour every point on every strand by how far *that day* deviates from
      // the same calendar day in the active climate reference period - not by
      // a single colour per year - so the line itself reads as a running
      // anomaly. A robust (95th-percentile) bound keeps a handful of extreme
      // record days from washing out the colour contrast everywhere else.
      const activeKey = config.activePeriod || "period_a";
      baseline = data[activeKey].daily_series;
      const deviations = [];
      for (const year of data.years) {
        const strand = data.strands[year];
        for (let i = 0; i < strand.length; i++) {
          const v = strand[i], b = baseline[i];
          if (v !== null && b !== null && b !== undefined) deviations.push(v - b);
        }
      }
      const maxAbsDev = robustMaxAbs(deviations);
      devColorScale = d3
        .scaleLinear()
        .domain([-maxAbsDev, 0, maxAbsDev])
        .range(config.colorStops)
        .interpolate(d3.interpolateRgb)
        .clamp(true);
      opts.onColorScaleReady && opts.onColorScaleReady(devColorScale, -maxAbsDev, maxAbsDev);

      svg.attr("width", width).attr("height", height);
      gAxes.attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
      gAnomaly.attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
      gStrands.attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
      gGuide.attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

      overlay
        .attr("x", MARGIN.left)
        .attr("y", MARGIN.top)
        .attr("width", innerW)
        .attr("height", innerH)
        .style("cursor", "crosshair");

      drawAxes(innerW, innerH);
      drawStrands();
      wireOverlay();

      if (data.years.length) {
        const preserve = config.preserveYear && highlightedYear && data.years.includes(highlightedYear);
        setYear(preserve ? highlightedYear : data.years[data.years.length - 1]);
      }
    }

    function drawAxes(innerW, innerH) {
      gAxes.selectAll("*").remove();

      const xAxis = d3
        .axisBottom(xScale)
        .tickValues(MONTH_STARTS)
        .tickFormat((d, i) => MONTH_LABELS[i]);
      gAxes
        .append("g")
        .attr("class", "axis month-axis")
        .attr("transform", `translate(0,${innerH})`)
        .call(xAxis);

      const yAxis = d3.axisLeft(yScale).ticks(6).tickFormat((d) => d + config.axisSuffix);
      gAxes.append("g").attr("class", "axis").call(yAxis);
    }

    function strandPoints(year) {
      const series = data.strands[year];
      return series.map((v, i) => [i + 1, v]);
    }

    function dayColor(strand, i) {
      const v = strand[i], b = baseline[i];
      return v !== null && b !== null && b !== undefined ? devColorScale(v - b) : "#8a8a8a";
    }

    function drawStrands() {
      const line = d3
        .line()
        .defined((d) => d[1] !== null)
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]));

      const strandData = data.years.map((year) => ({ year, points: strandPoints(year) }));

      // One horizontal gradient per year, stroked along the path's own
      // bounding box (objectBoundingBox) so it needs no pixel-coordinate
      // bookkeeping on resize - each stop is just "day N's deviation colour".
      const GRADIENT_STEP = 4; // 365 - 1 = 364, evenly divisible by 4
      gDefs.selectAll("*").remove();
      for (const d of strandData) {
        const strand = data.strands[d.year];
        d.gradId = `year-grad-${d.year}`;
        const grad = gDefs
          .append("linearGradient")
          .attr("id", d.gradId)
          .attr("x1", "0%").attr("y1", "0%")
          .attr("x2", "100%").attr("y2", "0%");
        for (let i = 0; i <= 364; i += GRADIENT_STEP) {
          grad.append("stop").attr("offset", `${(i / 364) * 100}%`).attr("stop-color", dayColor(strand, i));
        }
      }

      gStrands.selectAll("path.year-strand")
        .data(strandData, (d) => d.year)
        .join("path")
        .attr("class", "year-strand")
        .attr("d", (d) => line(d.points))
        .attr("stroke", (d) => `url(#${d.gradId})`);

      gStrands.selectAll("path.period-line").remove();
      const activeKey = config.activePeriod || "period_a";
      const period = data[activeKey];
      const points = period.daily_series.map((v, i) => [i + 1, v]);
      gStrands
        .append("path")
        .datum(points)
        .attr("class", `period-line ${activeKey === "period_a" ? "period-a" : "period-b"}`)
        .attr("d", line);
    }

    function doyToDateLabel(doy) {
      const d = new Date(Date.UTC(2001, 0, 1));
      d.setUTCDate(d.getUTCDate() + (doy - 1));
      return d.toLocaleDateString("de-DE", { month: "short", day: "numeric", timeZone: "UTC" });
    }

    function showDayTooltip(doy, clientX, clientY) {
      const stat = data.by_day_stats[doy - 1];
      if (!stat || stat.mean === null) {
        tooltipEl.hidden = true;
        return;
      }
      tooltipEl.innerHTML = config.formatDayTooltip(stat, doyToDateLabel(doy));
      tooltipEl.hidden = false;

      const wrapBox = opts.svgEl.parentElement.getBoundingClientRect();
      const tw = tooltipEl.offsetWidth;
      const th = tooltipEl.offsetHeight;
      const margin = 6;

      let left = clientX - wrapBox.left - tw / 2;
      left = Math.max(margin, Math.min(left, wrapBox.width - tw - margin));

      let top = clientY - wrapBox.top - th - 14;
      if (top < margin) top = clientY - wrapBox.top + 18; // flip below the pointer near the top edge

      tooltipEl.style.left = left + "px";
      tooltipEl.style.top = top + "px";
    }

    function drawGuide(doy) {
      gGuide.selectAll("*").remove();
      gGuide
        .append("line")
        .attr("class", "day-guide")
        .attr("x1", xScale(doy))
        .attr("x2", xScale(doy))
        .attr("y1", 0)
        .attr("y2", yScale.range()[0]);
    }

    function drawAnomaly(year) {
      gAnomaly.selectAll("*").remove();
      if (!year) return;
      const strand = data.strands[year];

      const rows = strand.map((v, i) => ({ doy: i + 1, strand: v, baseline: baseline[i] }));

      const areaAbove = d3
        .area()
        .defined((d) => d.strand !== null && d.baseline !== null && d.strand >= d.baseline)
        .x((d) => xScale(d.doy))
        .y0((d) => yScale(d.baseline))
        .y1((d) => yScale(d.strand));

      const areaBelow = d3
        .area()
        .defined((d) => d.strand !== null && d.baseline !== null && d.strand < d.baseline)
        .x((d) => xScale(d.doy))
        .y0((d) => yScale(d.baseline))
        .y1((d) => yScale(d.strand));

      gAnomaly.append("path").datum(rows).attr("class", "anomaly-area").attr("fill", config.aboveColor).attr("d", areaAbove);
      gAnomaly.append("path").datum(rows).attr("class", "anomaly-area").attr("fill", config.belowColor).attr("d", areaBelow);
    }

    function setYear(year) {
      highlightedYear = year;
      gStrands.selectAll("path.year-strand")
        .classed("highlighted", (d) => d.year === year)
        .classed("dimmed", (d) => year !== null && d.year !== year);
      drawAnomaly(year);
    }

    function wireOverlay() {
      overlay.on("pointermove", (event) => {
        resetIdleTimer();
        const [mx] = d3.pointer(event, gStrands.node());
        const doy = Math.min(365, Math.max(1, Math.round(xScale.invert(mx))));
        drawGuide(doy);
        showDayTooltip(doy, event.clientX, event.clientY);
      });

      overlay.on("pointerdown", (event) => {
        resetIdleTimer();
        const [mx] = d3.pointer(event, gStrands.node());
        const doy = Math.min(365, Math.max(1, Math.round(xScale.invert(mx))));
        drawGuide(doy);
        showDayTooltip(doy, event.clientX, event.clientY);
      });

      overlay.on("pointerleave", hideTooltip);
    }

    window.addEventListener("resize", debounce(() => {
      if (data) render(data, Object.assign({}, config, { preserveYear: true }));
    }, 200));

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

  // A handful of extreme record days shouldn't stretch the colour scale so
  // far that everything else collapses toward the neutral midpoint - use a
  // high percentile of |deviation| as the scale's bound instead of the true
  // max.
  function robustMaxAbs(values) {
    if (!values.length) return 1;
    const abs = values.map(Math.abs).sort((a, b) => a - b);
    const idx = Math.min(abs.length - 1, Math.floor(abs.length * 0.95));
    return abs[idx] || 1;
  }

  window.SpaghettiPlot = { create: createSpaghettiPlot };
})();
