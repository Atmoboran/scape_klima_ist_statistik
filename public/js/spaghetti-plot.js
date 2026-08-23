// Interactive climate chart: one thin line per year of daily mean temperature,
// coloured by that year's own annual mean (kälter -> wärmer), plus two dashed
// 30-year climate-mean reference lines. Built with vendored D3 v7, no build step.
(function () {
  "use strict";

  const MARGIN = { top: 18, right: 24, bottom: 30, left: 44 };
  const MONTH_STARTS = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
  const MONTH_LABELS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const HOVER_PIXEL_THRESHOLD = 26;
  const TOOLTIP_IDLE_MS = 5000;

  const COLD_COLOR = "#2b3990";
  const MID_COLOR = "#f2e6c9";
  const WARM_COLOR = "#d35b22";

  function createSpaghettiPlot(opts) {
    const svg = d3.select(opts.svgEl);
    const tooltipEl = opts.tooltipEl;
    const strandLabelEl = opts.strandLabelEl;
    const onYearChange = opts.onYearChange || function () {};

    let data = null;
    let width = 0;
    let height = 0;
    let xScale, yScale, colorScale;
    let lockedYear = null;
    let idleTimer = null;

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

    function render(stationData) {
      data = stationData;
      lockedYear = null;
      measure();

      const innerW = width - MARGIN.left - MARGIN.right;
      const innerH = height - MARGIN.top - MARGIN.bottom;

      xScale = d3.scaleLinear().domain([1, 365]).range([0, innerW]);

      const allValues = [];
      for (const year of data.years) {
        for (const v of data.strands[year]) if (v !== null) allValues.push(v);
      }
      const [minV, maxV] = d3.extent(allValues);
      yScale = d3.scaleLinear().domain([minV - 2, maxV + 2]).range([innerH, 0]);

      const amtValues = Object.values(data.annual_mean_temp);
      const [minAmt, maxAmt] = d3.extent(amtValues);
      const midAmt = (minAmt + maxAmt) / 2;
      colorScale = d3
        .scaleLinear()
        .domain([minAmt, midAmt, maxAmt])
        .range([COLD_COLOR, MID_COLOR, WARM_COLOR])
        .interpolate(d3.interpolateRgb);
      opts.onColorScaleReady && opts.onColorScaleReady(colorScale, minAmt, maxAmt);

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
        setLockedYear(data.years[data.years.length - 1], { silent: true });
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

      const yAxis = d3.axisLeft(yScale).ticks(6).tickFormat((d) => d + "°");
      gAxes.append("g").attr("class", "axis").call(yAxis);
    }

    function strandPoints(year) {
      const series = data.strands[year];
      return series.map((v, i) => [i + 1, v]);
    }

    function drawStrands() {
      const line = d3
        .line()
        .defined((d) => d[1] !== null)
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]));

      const strandData = data.years.map((year) => ({
        year,
        points: strandPoints(year),
        amt: data.annual_mean_temp[year],
      }));

      gStrands.selectAll("path.year-strand")
        .data(strandData, (d) => d.year)
        .join("path")
        .attr("class", "year-strand")
        .attr("d", (d) => line(d.points))
        .attr("stroke", (d) => (d.amt !== undefined ? colorScale(d.amt) : "#8a8a8a"));

      gStrands.selectAll("path.period-line").remove();
      for (const key of ["period_a", "period_b"]) {
        const period = data[key];
        const points = period.daily_mean_temperature.map((v, i) => [i + 1, v]);
        gStrands
          .append("path")
          .datum(points)
          .attr("class", `period-line ${key === "period_a" ? "period-a" : "period-b"}`)
          .attr("d", line);
      }
    }

    function nearestYearAt(doy, my) {
      let best = null;
      let bestDist = Infinity;
      for (const year of data.years) {
        const v = data.strands[year][doy - 1];
        if (v === null) continue;
        const d = Math.abs(yScale(v) - my);
        if (d < bestDist) {
          bestDist = d;
          best = year;
        }
      }
      return bestDist <= HOVER_PIXEL_THRESHOLD ? best : null;
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
      tooltipEl.innerHTML =
        `<b>${doyToDateLabel(doy)}</b><br/>` +
        `Durchschnitt: ${stat.mean}°C<br/>` +
        `<span class="tt-cold">kälteste: ${stat.min}°C (${stat.minYear})</span><br/>` +
        `<span class="tt-warm">wärmste: ${stat.max}°C (${stat.maxYear})</span>`;
      const wrapBox = opts.svgEl.parentElement.getBoundingClientRect();
      tooltipEl.style.left = clientX - wrapBox.left + "px";
      tooltipEl.style.top = clientY - wrapBox.top + "px";
      tooltipEl.hidden = false;
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
      const baseline = data.period_b.daily_mean_temperature;

      const rows = strand.map((v, i) => ({ doy: i + 1, strand: v, baseline: baseline[i] }));

      const areaWarmer = d3
        .area()
        .defined((d) => d.strand !== null && d.baseline !== null && d.strand >= d.baseline)
        .x((d) => xScale(d.doy))
        .y0((d) => yScale(d.baseline))
        .y1((d) => yScale(d.strand));

      const areaCooler = d3
        .area()
        .defined((d) => d.strand !== null && d.baseline !== null && d.strand < d.baseline)
        .x((d) => xScale(d.doy))
        .y0((d) => yScale(d.baseline))
        .y1((d) => yScale(d.strand));

      gAnomaly.append("path").datum(rows).attr("class", "anomaly-area warmer").attr("d", areaWarmer);
      gAnomaly.append("path").datum(rows).attr("class", "anomaly-area cooler").attr("d", areaCooler);
    }

    function applyHighlight(year) {
      gStrands.selectAll("path.year-strand")
        .classed("highlighted", (d) => d.year === year)
        .classed("dimmed", (d) => year !== null && d.year !== year);

      drawAnomaly(year);

      if (year) {
        const pts = strandPoints(year).filter((p) => p[1] !== null);
        const last = pts[pts.length - 1];
        const amt = data.annual_mean_temp[year];
        const label = amt !== undefined ? `${year} · ${amt.toFixed(1)}°C im Schnitt` : `${year} (unvollständiges Jahr)`;
        strandLabelEl.textContent = label;
        const wrapBox = opts.svgEl.parentElement.getBoundingClientRect();
        const svgBox = opts.svgEl.getBoundingClientRect();
        const px = MARGIN.left + xScale(last[0]);
        const py = MARGIN.top + yScale(last[1]);
        const scaleX = svgBox.width / width;
        const scaleY = svgBox.height / height;
        strandLabelEl.style.left = px * scaleX + (svgBox.left - wrapBox.left) + "px";
        strandLabelEl.style.top = py * scaleY + (svgBox.top - wrapBox.top) + "px";
        strandLabelEl.hidden = false;
      } else {
        strandLabelEl.hidden = true;
      }
    }

    function setLockedYear(year, options) {
      lockedYear = year;
      applyHighlight(year);
      if (!(options && options.silent)) onYearChange(year);
    }

    function wireOverlay() {
      overlay.on("pointermove", (event) => {
        resetIdleTimer();
        const [mx, my] = d3.pointer(event, gStrands.node());
        const doy = Math.min(365, Math.max(1, Math.round(xScale.invert(mx))));
        drawGuide(doy);
        showDayTooltip(doy, event.clientX, event.clientY);

        if (event.pointerType !== "touch") {
          const hovered = nearestYearAt(doy, my);
          applyHighlight(hovered !== null ? hovered : lockedYear);
        }
      });

      overlay.on("pointerdown", (event) => {
        resetIdleTimer();
        const [mx, my] = d3.pointer(event, gStrands.node());
        const doy = Math.min(365, Math.max(1, Math.round(xScale.invert(mx))));
        const hovered = nearestYearAt(doy, my);
        setLockedYear(hovered, { silent: false });
        drawGuide(doy);
        showDayTooltip(doy, event.clientX, event.clientY);
      });

      overlay.on("pointerleave", () => {
        applyHighlight(lockedYear);
      });
    }

    window.addEventListener("resize", debounce(() => {
      if (data) render(data);
    }, 200));

    return {
      render,
      setYear: (year) => setLockedYear(year, { silent: true }),
      getSelectedYear: () => lockedYear,
    };
  }

  function debounce(fn, ms) {
    let t;
    return function () {
      clearTimeout(t);
      const args = arguments;
      t = setTimeout(() => fn.apply(null, args), ms);
    };
  }

  window.SpaghettiPlot = { create: createSpaghettiPlot };
})();
