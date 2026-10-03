// Chart data colours for both pages. UI chrome (backgrounds, text, borders)
// lives in theme/theme.css; everything the charts draw or interpolate lives
// here. Diverging scales are [cold/low pole, neutral midpoint, warm/high
// pole]: keep the two poles at a similar lightness and the midpoint a
// neutral grey, so neither side of "normal" reads as more important.
window.THEME = {
  chart: {
    missing: "#9aa3ad", // a day without a reading inside a year's line
    periodBar: "#8b95a1", // reference-period bars in the monthly bar chart
    periodA: "#2f6bd6", // older reference period in the comparison chart
    periodB: "#d0312d", // newer reference period in the comparison chart
  },
  variables: {
    temperature: {
      colorStops: ["#2166ac", "#cccccc", "#b2182b"],
      belowColor: "#2166ac",
      aboveColor: "#b2182b",
    },
    precipitation: {
      colorStops: ["#8c510a", "#cccccc", "#01665e"],
      belowColor: "#8c510a",
      aboveColor: "#01665e",
    },
    sunshine: {
      colorStops: ["#6b7480", "#cccccc", "#b07d00"],
      belowColor: "#6b7480",
      aboveColor: "#b07d00",
    },
  },
};
