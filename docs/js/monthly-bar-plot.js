// Alternative chart for variables where a 365-line "spaghetti" plot reads as
// noise rather than signal (e.g. daily sunshine hours, which jump around a
// lot day to day). Instead of one strand per year, this draws one grouped
// bar pair per calendar month: the currently selected year (driven by the
// same timeline slider/play controls as the spaghetti plot) next to the
// active climate reference period's monthly mean. Same render()/setYear()
// surface as spaghetti-plot.js so main.js can swap between the two without
// touching the timeline logic. Built with vendored D3 v7, no build step.
(function () {
  "use strict";

  const MARGIN = { top: 22, right: 24, bottom: 30, left: 52 };
  const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // non-leap, matches the 365-day daily series
  const MONTH_LABELS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const TOOLTIP_IDLE_MS = 5000;
  const TRANSITION_MS = 220;

  const DEFAULT_CONFIG = {
    axisSuffix: " h",
    yMin: 0,
    aboveColor: "#f0b429",
    activePeriod: "period_a",
    formatMonthTooltip: (monthLabel, year, yearVal, periodVal, config) =>
      `<b>${monthLabel}</b><br/>` +
      (yearVal !== null
        ? `${year}: <b>${yearVal.toFixed(0)}${config.axisSuffix}</b><br/>`
        : `${year}: keine Daten<br/>`) +
      `Referenzperiode: ${periodVal !== null ? periodVal.toFixed(0) + config.axisSuffix : "–"}`,
  };

  function createMonthlyBarPlot(opts) {
    const svg = d3.select(opts.svgEl);
    const tooltipEl = opts.tooltipEl;

    let data = null;
    let config = DEFAULT_CONFIG;
    let width = 0;
    let height = 0;
    let xScale, xSub, yScale;
    let highlightedYear = null;
    let monthlyPeriod = new Array(12).fill(null);
    let idleTimer = null;
    // Fixed across every year of the current station/variable (computed once
    // in render()) so switching the year slider never rescales the y-axis -
    // only loading a different station or variable does.
    let stationMaxV = 1;

    const gAxes = svg.append("g").attr("class", "axes-layer");
    const gBars = svg.append("g").attr("class", "bars-layer");
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

    // Sums a 365-entry daily series into 12 monthly totals. A month with no
    // valid days at all comes back as null (drawn as an empty gap rather
    // than a misleading zero-height bar); a month with some missing days is
    // summed over whatever is present, same simplification the rest of the
    // app already makes for incomplete years/periods.
    function monthlySums(series) {
      const sums = [];
      let dayIdx = 0;
      for (let m = 0; m < 12; m++) {
        let sum = 0;
        let any = false;
        for (let d = 0; d < MONTH_LENGTHS[m]; d++, dayIdx++) {
          const v = series[dayIdx];
          if (v !== null && v !== undefined) {
            sum += v;
            any = true;
          }
        }
        sums.push(any ? sum : null);
      }
      return sums;
    }

    function render(stationData, renderConfig) {
      data = stationData;
      config = Object.assign({}, DEFAULT_CONFIG, renderConfig || {});
      measure();

      const innerW = width - MARGIN.left - MARGIN.right;

      xScale = d3.scaleBand().domain(MONTH_LABELS).range([0, innerW]).paddingInner(0.4).paddingOuter(0.15);
      xSub = d3.scaleBand().domain(["period", "year"]).range([0, xScale.bandwidth()]).padding(0.12);

      const activeKey = config.activePeriod || "period_a";
      monthlyPeriod = monthlySums(data[activeKey].daily_series);

      // Scan every year (plus both reference periods) once so the axis ceiling
      // reflects the whole station/variable, not just whichever year is shown.
      let maxV = 0;
      for (const key of ["period_a", "period_b"]) {
        if (!data[key] || !data[key].daily_series) continue;
        for (const v of monthlySums(data[key].daily_series)) {
          if (v !== null && v > maxV) maxV = v;
        }
      }
      for (const year of data.years) {
        for (const v of monthlySums(data.strands[year])) {
          if (v !== null && v > maxV) maxV = v;
        }
      }
      stationMaxV = maxV || 1;

      svg.attr("width", width).attr("height", height);
      gAxes.attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
      gBars.attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
      gOverlay.attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

      if (data.years.length) {
        const preserve = config.preserveYear && highlightedYear && data.years.includes(highlightedYear);
        setYear(preserve ? highlightedYear : data.years[data.years.length - 1]);
      } else {
        setYear(null);
      }
    }

    function setYear(year) {
      highlightedYear = year;
      const strand = year !== null && year !== undefined && data.strands[year] ? data.strands[year] : null;
      const yearSums = strand ? monthlySums(strand) : new Array(12).fill(null);
      draw(yearSums);
    }

    function draw(yearSums) {
      const innerW = width - MARGIN.left - MARGIN.right;
      const innerH = height - MARGIN.top - MARGIN.bottom;

      const yMin = config.yMin !== null ? config.yMin : 0;
      yScale = d3.scaleLinear().domain([yMin, stationMaxV]).nice().range([innerH, 0]);

      drawAxes(innerH);
      drawBars(yearSums, innerH);
    }

    function drawAxes(innerH) {
      gAxes.selectAll("*").remove();

      const xAxis = d3.axisBottom(xScale);
      gAxes
        .append("g")
        .attr("class", "axis month-axis")
        .attr("transform", `translate(0,${innerH})`)
        .call(xAxis);

      const yAxis = d3.axisLeft(yScale).ticks(6).tickFormat((d) => d + config.axisSuffix);
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

    function drawBars(yearSums, innerH) {
      const rows = MONTH_LABELS.map((month, i) => ({
        month,
        periodVal: monthlyPeriod[i],
        yearVal: yearSums[i],
      }));

      const y0 = yScale(0);

      const groups = gBars.selectAll("g.month-group").data(rows, (d) => d.month).join((enter) =>
        enter.append("g").attr("class", "month-group")
      );
      groups.attr("transform", (d) => `translate(${xScale(d.month)},0)`);

      groups.each(function (d) {
        const barsData = [
          { key: "period", val: d.periodVal },
          { key: "year", val: d.yearVal },
        ].filter((b) => b.val !== null);

        const bars = d3.select(this).selectAll("rect.bar").data(barsData, (b) => b.key);
        bars
          .join(
            (enter) =>
              enter
                .append("rect")
                .attr("class", (b) => `bar bar-${b.key}`)
                .attr("x", (b) => xSub(b.key))
                .attr("width", xSub.bandwidth())
                .attr("y", y0)
                .attr("height", 0),
            (update) => update,
            (exit) => exit.transition().duration(TRANSITION_MS).attr("y", y0).attr("height", 0).remove()
          )
          .attr("fill", (b) => (b.key === "year" ? config.aboveColor : "var(--ink-dim)"))
          .transition()
          .duration(TRANSITION_MS)
          .attr("y", (b) => yScale(b.val))
          .attr("height", (b) => y0 - yScale(b.val));
      });

      // One invisible full-height rect per month for hover/tap, wider than
      // the bars themselves so the tooltip is easy to trigger on touch.
      const overlays = gOverlay.selectAll("rect.month-group-overlay").data(rows, (d) => d.month).join((enter) =>
        enter.append("rect").attr("class", "month-group-overlay")
      );
      overlays
        .attr("x", (d) => xScale(d.month))
        .attr("width", xScale.bandwidth())
        .attr("y", 0)
        .attr("height", innerH)
        .on("pointerenter pointermove", (event, d) => {
          resetIdleTimer();
          showMonthTooltip(d, event.clientX, event.clientY);
        })
        .on("pointerdown", (event, d) => {
          resetIdleTimer();
          showMonthTooltip(d, event.clientX, event.clientY);
        })
        .on("pointerleave", hideTooltip);
    }

    function showMonthTooltip(d, clientX, clientY) {
      tooltipEl.innerHTML = config.formatMonthTooltip(d.month, highlightedYear, d.yearVal, d.periodVal, config);
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

  window.MonthlyBarPlot = { create: createMonthlyBarPlot };
})();
