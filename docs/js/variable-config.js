// Shared across index.html (daily view) and trend.html (annual trend view)
// so both pages describe each variable identically. Add a new variable by
// adding an entry here plus a matching output folder from scripts/build_data.py.
window.VARIABLE_CONFIG = {
  temperature: {
    label: "Temperatur",
    axisSuffix: "°",
    axisUnit: "°C",
    yMin: null,
    // Fixed so the day-color scale (and its legend ticks) mean the same
    // deviation magnitude at every station - an adaptive per-station
    // domain would make the same color read as different values (and the
    // ticks jump around) when switching stations.
    maxAbsDev: 10,
    colorStops: ["#2b3990", "#f2e6c9", "#d35b22"],
    legendCold: "kälter",
    legendWarm: "wärmer",
    generalInfo:
      "Die Lufttemperatur beschreibt, wie warm oder kalt die Luft in Bodennähe ist. Sie wird in Grad Celsius (°C) gemessen und ist einer der wichtigsten Klimaindikatoren: Ihr langfristiger Verlauf zeigt, ob sich ein Ort über Jahrzehnte erwärmt oder abkühlt.",
    chartExplanation:
      "Jede dünne Linie zeigt den Tagesverlauf der Tagesmitteltemperatur eines einzelnen Jahres. Die dicke schwarze Linie zeigt die aktuell ausgewählte Referenzperiode. Die Farbe jedes Punkts zeigt, ob dieser Tag im Vergleich zum selben Tag der Referenzperiode wärmer (orange) oder kälter (blau) war. Fahre über das Diagramm, um einen Tag im Vergleich aller Jahre zu sehen. Nutze den Regler oben, um durch die einzelnen Jahre zu blättern.",
    valueLabel: "Jahresmittel",
    aboveColor: "#dd2a26",
    belowColor: "#2b3990",
    chartAriaLabel: "Verlauf der Tagesmitteltemperatur für jedes verfügbare Jahr",
    formatValue: (v) => `${v.toFixed(1)} °C`,
    formatDiff: (diff) => `${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(1)} °C`,
    incompleteLabel: "lückenhaft",
    formatDayTooltip: (stat, dateLabel) =>
      `<b>${dateLabel}</b><br/>Durchschnitt: ${stat.mean}°C<br/>` +
      `<span class="tt-cold">kälteste: ${stat.min}°C (${stat.minYear})</span><br/>` +
      `<span class="tt-warm">wärmste: ${stat.max}°C (${stat.maxYear})</span>`,
    formatCompareHeadline: (pa, pb, diff) =>
      `${pb.start}–${pb.end} war im Jahresmittel <strong>${Math.abs(diff).toFixed(1)} °C ${diff >= 0 ? "wärmer" : "kühler"}</strong> ` +
      `als ${pa.start}–${pa.end}.`,
    methodology: {
      day: "<strong>Tagesmitteltemperatur:</strong> An jeder Wetterstation wird die Temperatur mehrmals täglich gemessen. Der Mittelwert dieser Messungen ergibt einen einzigen Wert pro Tag — die Tagesmitteltemperatur.",
      year: "<strong>Jahresmitteltemperatur:</strong> Der Durchschnitt aller rund 365 Tagesmittelwerte eines Kalenderjahres ergibt die Jahresmitteltemperatur. Jede dünne Linie im Diagramm oben zeigt den Tagesverlauf genau eines Jahres.",
      period: "<strong>Klimareferenzperiode:</strong> Der Durchschnitt der Jahresmitteltemperaturen über 30 Jahre ergibt das Klimamittel einer Referenzperiode. Die beiden gestrichelten Linien zeigen die offiziellen Referenzperioden 1961–1990 und 1991–2020.",
      context:
        "Die über Jahrzehnte sichtbare Erwärmung passt zum globalen Trend: Treibhausgase wie CO₂ verstärken den natürlichen Treibhauseffekt der Erdatmosphäre, was die Klimaforschung als Haupttreiber der weltweiten Erwärmung seit der Industrialisierung einordnet. Einzelne Jahre schwanken durch natürliche Variabilität (z. B. Meeresströmungen, Vulkanausbrüche, einzelne Wetterlagen) stark um diesen langfristigen Trend — erst der Vergleich vieler Jahrzehnte macht das zugrunde liegende Muster überhaupt sichtbar.",
    },
  },
  precipitation: {
    label: "Niederschlag",
    axisSuffix: " mm",
    axisUnit: "mm",
    yMin: 0,
    maxAbsDev: 250,
    colorStops: ["#d35b22", "#f2e6c9", "#1ca3d6"],
    legendCold: "trockener",
    legendWarm: "nasser",
    generalInfo:
      "Niederschlag umfasst alles Wasser, das als Regen, Schnee, Hagel oder Nieselregen auf den Boden fällt. Er wird in Millimetern (mm) gemessen — 1 mm entspricht 1 Liter Wasser pro Quadratmeter. Niederschlag ist entscheidend für Wasserversorgung, Landwirtschaft und das Risiko von Dürren oder Überschwemmungen.",
    chartExplanation:
      "Jede Linie zeigt den im Jahresverlauf aufsummierten (kumulierten) Niederschlag eines einzelnen Jahres. Die dicke schwarze Linie zeigt die aktuell ausgewählte Referenzperiode. Die Farbe zeigt, ob an diesem Tag bislang mehr (blau, nasser) oder weniger (orange, trockener) Niederschlag gefallen ist als in der Referenzperiode. Fahre über das Diagramm, um einen Tag im Vergleich aller Jahre zu sehen. Nutze den Regler oben, um durch die einzelnen Jahre zu blättern.",
    valueLabel: "Jahressumme",
    aboveColor: "#1ca3d6",
    belowColor: "#d35b22",
    chartAriaLabel: "Kumulierter Niederschlag im Jahresverlauf für jedes verfügbare Jahr",
    formatValue: (v) => `${v.toFixed(0)} mm`,
    formatDiff: (diff) => `${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(0)} mm`,
    incompleteLabel: "lückenhaft",
    formatDayTooltip: (stat, dateLabel) =>
      `<b>bis ${dateLabel}</b><br/>im Schnitt: ${stat.mean} mm<br/>` +
      `<span class="tt-cold">am wenigsten: ${stat.min} mm (${stat.minYear})</span><br/>` +
      `<span class="tt-warm">am meisten: ${stat.max} mm (${stat.maxYear})</span>`,
    formatCompareHeadline: (pa, pb, diff) =>
      `${pb.start}–${pb.end} brachte im Schnitt <strong>${Math.abs(diff).toFixed(0)} mm ${diff >= 0 ? "mehr" : "weniger"} Niederschlag pro Jahr</strong> ` +
      `als ${pa.start}–${pa.end}.`,
    methodology: {
      day: "<strong>Tagesniederschlag:</strong> An jeder Wetterstation wird die gefallene Niederschlagsmenge (Regen, Schnee als Wasseräquivalent) einmal täglich gemessen — ein Wert pro Tag in Millimetern.",
      year: "<strong>Jahresniederschlag:</strong> Die Summe aller Tageswerte eines Kalenderjahres ergibt den Jahresniederschlag. Jede Linie im Diagramm oben zeigt die aufsummierte (kumulierte) Niederschlagsmenge im Verlauf genau eines Jahres.",
      period: "<strong>Klimareferenzperiode:</strong> Der Durchschnitt der Jahresniederschläge über 30 Jahre ergibt den mittleren Jahresniederschlag einer Referenzperiode. Die gestrichelten Linien zeigen die offiziellen Referenzperioden 1961–1990 und 1991–2020.",
      context:
        "Anders als bei der Temperatur zeigt der Jahresniederschlag über die Zeit kein so eindeutiges Muster — das ist wissenschaftlich plausibel: Niederschlag hängt stark von großräumigen Wettermustern und großer Jahr-zu-Jahr-Schwankung ab, die einen langsamen Trend leicht überdecken. Die Klimaforschung geht eher davon aus, dass sich mit der Erwärmung die Verteilung des Niederschlags verändert — etwa häufigere Starkregenereignisse oder verschobene Jahreszeiten — als dass sich allein die Jahressumme gleichmäßig in eine Richtung entwickelt.",
    },
  },
  sunshine: {
    label: "Sonnenscheindauer",
    axisSuffix: " h",
    axisUnit: "h",
    yMin: 0,
    chartType: "bar",
    colorStops: ["#6b7280", "#f2e6c9", "#f0b429"],
    legendCold: "trüber",
    legendWarm: "sonniger",
    generalInfo:
      "Die Sonnenscheindauer gibt an, wie viele Stunden am Tag die Sonne direkt und ungehindert scheint — bewölkter oder diesiger Himmel zählt nicht mit. Sie wird in Stunden (h) gemessen und beeinflusst unter anderem Temperatur, Verdunstung und das Wohlbefinden von Menschen und Ökosystemen.",
    chartExplanation:
      "Für jeden Monat zeigt der graue Balken die durchschnittliche Sonnenscheindauer der aktuell ausgewählten Referenzperiode, der farbige Balken die Sonnenscheindauer im ausgewählten Jahr. Fahre über einen Monat, um die genauen Werte zu vergleichen. Nutze den Regler oben, um durch die einzelnen Jahre zu blättern.",
    valueLabel: "Jahressumme",
    aboveColor: "#f0b429",
    belowColor: "#6b7280",
    chartAriaLabel: "Monatliche Sonnenscheindauer des ausgewählten Jahres im Vergleich zur Referenzperiode",
    formatValue: (v) => `${v.toFixed(0)} h`,
    formatDiff: (diff) => `${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(0)} h`,
    incompleteLabel: "lückenhaft",
    formatDayTooltip: (stat, dateLabel) =>
      `<b>${dateLabel}</b><br/>Durchschnitt: ${stat.mean} h<br/>` +
      `<span class="tt-cold">am wenigsten: ${stat.min} h (${stat.minYear})</span><br/>` +
      `<span class="tt-warm">am meisten: ${stat.max} h (${stat.maxYear})</span>`,
    formatMonthTooltip: (monthLabel, year, yearVal, periodVal) =>
      `<b>${monthLabel}</b><br/>` +
      (yearVal !== null && yearVal !== undefined
        ? `${year}: <b>${yearVal.toFixed(0)} h</b><br/>`
        : `${year}: keine Daten<br/>`) +
      `Referenzperiode: ${periodVal !== null && periodVal !== undefined ? periodVal.toFixed(0) + " h" : "–"}`,
    formatCompareHeadline: (pa, pb, diff) =>
      `${pb.start}–${pb.end} brachte im Schnitt <strong>${Math.abs(diff).toFixed(0)} h ${diff >= 0 ? "mehr" : "weniger"} Sonnenschein pro Jahr</strong> ` +
      `als ${pa.start}–${pa.end}.`,
    methodology: {
      day:
        "<strong>Tagessonnenscheindauer:</strong> Gemessen wird, wie viele Stunden am Tag die Sonne direkt und ungehindert schien — diffuses Licht bei bedecktem Himmel zählt nicht mit. Traditionell erfassten das Sonnenscheinautographen nach Campbell-Stokes: Eine Glaskugel bündelt das Sonnenlicht wie eine Lupe und brennt bei ausreichender Intensität eine Spur in einen Registrierstreifen; heute übernehmen automatische Sensoren diese Messung. Die Einheit ist Stunden (h) pro Tag. Wichtigster Einflussfaktor ist die Bewölkung, aber auch Dunst, Feinstaub und andere Schwebteilchen in der Luft können die gemessene Sonnenscheindauer verringern — selbst bei auf den ersten Blick klarem Himmel.",
      year: "<strong>Jahressonnenscheindauer:</strong> Die Summe aller Tageswerte eines Kalenderjahres ergibt die jährliche Sonnenscheindauer. Jede Linie im Diagramm oben zeigt den Tagesverlauf genau eines Jahres.",
      period: "<strong>Klimareferenzperiode:</strong> Der Durchschnitt der Jahressonnenscheindauern über 30 Jahre ergibt die mittlere Sonnenscheindauer einer Referenzperiode. Die gestrichelten Linien zeigen die offiziellen Referenzperioden 1961–1990 und 1991–2020.",
      context:
        "Die Sonnenscheindauer wird von mehr als nur der Wolkenmenge beeinflusst: Feinstaub und Aerosole in der Atmosphäre — etwa aus Industrie, Verkehr oder Vulkanausbrüchen — können Sonnenlicht streuen oder reflektieren und so die gemessene Sonnenscheindauer verringern, auch ohne dass mehr Wolken am Himmel stehen. Für weite Teile Europas wird in der Forschung ein Rückgang der Sonnenscheindauer bis etwa in die 1980er-Jahre diskutiert ('Global Dimming'), gefolgt von einem Wiederanstieg seither ('Global Brightening'), der zeitlich mit einer verbesserten Luftreinhaltung zusammenfällt. Das ist eine plausible, wissenschaftlich diskutierte Erklärung für den großräumigen Trend — ob und wie deutlich sich dieses Muster in den Daten einer einzelnen Station zeigt, hängt von vielen lokalen Faktoren ab und lässt sich nicht allein aus dieser Grafik ableiten.",
    },
  },
};
