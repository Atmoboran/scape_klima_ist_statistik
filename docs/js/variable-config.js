// Per-variable behaviour shared by index.html and trend.html. Colours come
// from theme/theme.js and all wording from content/texts.de.js; both are
// merged in below, so the rest of the code sees one object per variable.
// Add a new variable by adding an entry here, in theme.js and in the texts
// file, plus a matching output folder from scripts/build_data.py.
(function () {
  "use strict";

  const BEHAVIOUR = {
    temperature: {
      axisSuffix: "°",
      axisUnit: "°C",
      yMin: null,
      // Fixed so the day-color scale means the same deviation magnitude at
      // every station - an adaptive per-station domain would make the same
      // color read as different values when switching stations.
      maxAbsDev: 10,
      formatValue: (v) => `${v.toFixed(1)} °C`,
      formatDiff: (diff) => `${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(1)} °C`,
    },
    precipitation: {
      axisSuffix: " mm",
      axisUnit: "mm",
      yMin: 0,
      maxAbsDev: 250,
      // strands are a *cumulative* running total by day-of-year (see
      // build_data.py), not the raw daily amount - anything that needs the
      // actual per-day value (e.g. distribution-plot.js) must diff it first.
      dailyIsCumulative: true,
      formatValue: (v) => `${v.toFixed(0)} mm`,
      formatDiff: (diff) => `${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(0)} mm`,
    },
    sunshine: {
      axisSuffix: " h",
      axisUnit: "h",
      yMin: 0,
      chartType: "bar",
      formatValue: (v) => `${v.toFixed(0)} h`,
      formatDiff: (diff) => `${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(0)} h`,
    },
  };

  window.VARIABLE_CONFIG = {};
  for (const key of Object.keys(BEHAVIOUR)) {
    window.VARIABLE_CONFIG[key] = Object.assign(
      {},
      BEHAVIOUR[key],
      window.THEME.variables[key],
      window.TEXTS.variables[key]
    );
  }
})();
