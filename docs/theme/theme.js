// Chart data colours. The charts interpolate between these in JS, so they
// live here as hex values rather than CSS variables. All values come from
// the SCAPE° colour palette (see the CD). Diverging scales run from a
// "below reference" pole through a neutral light gray to an "above" pole;
// keep both poles similarly dark so neither side looks more dramatic.
window.THEME = {
  chart: {
    missing: "#a6a6a6",   // days/years without data
    periodBar: "#8c8c8c", // reference-period bars in the monthly sunshine chart
    periodA: "#3274BA",   // first reference period in the comparison chart
    periodB: "#E41513",   // second reference period in the comparison chart
  },
  variables: {
    temperature: {
      colorStops: ["#3274BA", "#d9d6cf", "#E41513"], // colder → warmer
      belowColor: "#3274BA",
      aboveColor: "#E41513",
    },
    precipitation: {
      colorStops: ["#D55117", "#d9d6cf", "#0097BE"], // drier → wetter
      belowColor: "#D55117",
      aboveColor: "#0097BE",
    },
    sunshine: {
      colorStops: ["#1F6C8E", "#d9d6cf", "#C9820F"], // less sun → more sun
      belowColor: "#1F6C8E",
      aboveColor: "#C9820F",
    },
  },
};
