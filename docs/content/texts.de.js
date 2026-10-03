// Every piece of text shown on both pages. Edit or translate this file to
// adapt the exhibit; the HTML only holds data-t="path.to.key" placeholders
// that js/texts.js fills from here. Entries written as functions build a
// sentence around values (years, numbers, names) supplied at runtime.
// Entries may contain simple HTML (<strong>, <b>, <br/>) where noted.
window.TEXTS = {
  lang: "de",
  locale: "de-DE", // dates in tooltips and station sorting
  months: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
  dash: "–",

  brand: {
    nameHtml: "SCAPE<sup>°</sup>",
    claim: "Wetter · Klima · Mensch",
  },

  nav: {
    ariaLabel: "Ansicht wählen",
    daily: "Tagesverlauf",
    trend: "Klimatrend",
  },

  viewToggle: {
    toDesktop: "Desktop-Ansicht",
    toMobile: "Mobile-Ansicht",
    toDesktopAria: "Zur Desktop-Ansicht wechseln",
    toMobileAria: "Zur Mobile-Ansicht wechseln",
  },

  pickers: {
    variable: "Messgröße",
    station: "Messstation",
    variableInfoAria: "Info zur Messgröße anzeigen",
    stationInfoAria: "Stationsdetails anzeigen",
  },

  timeline: {
    sliderAria: "Jahr auswählen",
    prevAria: "Ein Jahr zurück",
    playAria: "Durch die Jahre abspielen",
    nextAria: "Ein Jahr vor",
  },

  dialog: {
    closeAria: "Schließen",
  },

  footer: {
    data: "Daten: Deutscher Wetterdienst (DWD) Climate Data Center, Tageswerte, CC BY 4.0.",
    credit: "Ein Exponat von SCAPE° — Frankfurter Str. 39, 63065 Offenbach am Main",
  },

  // Shared by both pages.
  common: {
    referencePeriodLabel: "Referenzperiode:",
    noData: "keine Daten",
    periodTooFewYears:
      "Für die aktuell ausgewählte Referenzperiode liegen bei dieser Station zu wenige vollständige Jahre vor, " +
      "um einen verlässlichen Vergleich zu berechnen.",
  },

  // index.html — "Tagesverlauf"
  daily: {
    pageTitle: "Klima ist Statistik — ein SCAPE° Exponat",
    title: "Klima ist Statistik",
    subtitle:
      "Ein einzelnes Jahr sagt wenig über das Klima. Erst im Vergleich vieler Jahre zeigt sich das Muster — und die Abweichung vom Mittelwert.",
    deviation: "Abweichung",
    deviationVs: (start, end) => `(vs. ${start}–${end})`,
    periodInfoAria: "Was ist eine Referenzperiode?",
    legendVs: "als",
    legendReference: "Referenzperiode",
    barLegendYear: "Ausgewähltes Jahr",
    barLegendPeriod: (start, end) => `Referenzperiode ${start}–${end}`,
    hintButton: "Was sehe ich auf dem Diagramm?",
    compareTitleDefault: "Klimavergleich",
    compareTitle: (stationName) => `Klimavergleich für ${stationName}`,
    compareTooFewYears: (start, end) =>
      `Für die Referenzperiode ${start}–${end} liegen bei dieser Station zu wenige vollständige Jahre vor, ` +
      `um einen verlässlichen Vergleich zu berechnen.`,
    methodologyCalcButton: "Wie werden diese Werte berechnet?",
    methodologyClimateButton: "Was hat das mit dem Klimawandel zu tun?",

    station: {
      title: "Stationsdetails",
      coordinates: "Koordinaten",
      elevation: "Höhe",
      state: "Bundesland",
      years: "Aktive Jahre",
      formatCoordinates: (lat, lon) => `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° O`,
      formatElevation: (meters) => `${meters} m ü. NHN`,
    },
    periodInfo: {
      title: "Referenzperiode",
      text:
        "Eine Referenzperiode ist ein fester, 30 Jahre langer Vergleichszeitraum, den die Weltorganisation für Meteorologie " +
        "als gemeinsamen Maßstab für das Klima festlegt. Der Durchschnitt dieser 30 Jahre gilt als „normales“ Klima, gegen das " +
        "einzelne Jahre verglichen werden. Diese App nutzt die beiden offiziellen Referenzperioden 1961–1990 und 1991–2020 — " +
        "der Wechsel zwischen ihnen zeigt, wie sich das Klimamittel selbst über die Zeit verschoben hat.",
    },
    hintTitle: "Was sehe ich auf dem Diagramm?",
    calcTitle: "Wie werden diese Werte berechnet?",
    climateTitle: "Was hat das mit dem Klimawandel zu tun?",
    meanExplanation:
      "<strong>Mittelwert:</strong> Ein Mittelwert (Durchschnitt) fasst mehrere Messungen zu einem typischen Wert zusammen: " +
      "Man addiert alle Werte und teilt die Summe durch ihre Anzahl. Beispiel: Aus den drei Zahlen 10, 15 und 18 ergibt sich " +
      "(10 + 15 + 18) ÷ 3 = 14,3 als Mittelwert.",
  },

  // trend.html — "Klimatrend"
  trend: {
    pageTitle: "Klimatrend — Klima ist Statistik",
    title: "Klimatrend",
    subtitle:
      "Jahreswerte im Vergleich zur Referenzperiode — und wie sich die ganze Verteilung der Tageswerte über die Zeit verschoben hat.",
    viewLabel: "Ansicht:",
    seasonLabel: "Jahreszeit:",
    modes: {
      annual: "Jahresbalken",
      distribution: "Verteilung",
    },
    seasons: {
      full: "Jahr",
      winter: "Winter",
      spring: "Frühling",
      summer: "Sommer",
      autumn: "Herbst",
    },
    annualAria: (variableLabel, firstYear, lastYear) =>
      `${variableLabel} je Jahr im Vergleich zur Referenzperiode, ${firstYear}–${lastYear}`,
    distributionAria: (variableLabel) => `Verteilung der Tageswerte (${variableLabel}) im Vergleich zur Referenzperiode`,
    annualCaption:
      "Jeder Balken zeigt den tatsächlichen Jahreswert. Die gestrichelte Linie markiert das Mittel der Referenzperiode, " +
      "die Farbe die Abweichung davon. Die schwarze Linie ist der gleitende 10-Jahres-Durchschnitt.",
    // seasonLabel is null for the whole year.
    distributionCaption: (seasonLabel, start, end) =>
      `Die farbige Fläche zeigt, wie die ${seasonLabel ? `${seasonLabel}-Tageswerte` : "Tageswerte"} im ausgewählten Jahr verteilt sind. ` +
      `Die gestrichelte Linie ist dieselbe Verteilung für die Referenzperiode <strong>${start}–${end}</strong>. ` +
      `Nutze den Regler, um durch die einzelnen Jahre zu blättern.`,
    // Appended to the caption for temperature over the whole year only.
    bimodalNote:
      " Bei der Ganzjahresansicht ist die Verteilung oft zweigipflig: Die Temperatur ändert sich um die kältesten " +
      "Wintertage und die wärmsten Sommertage herum am langsamsten, weshalb sich die Tageswerte dort häufen — " +
      "probiere Winter oder Sommer aus, um die einzelnen Jahreszeiten für sich zu sehen.",
    // seasonLabel is null for the whole year.
    badgeSub: (seasonLabel, stationName) => (seasonLabel ? `${seasonLabel} · ${stationName}` : stationName),
  },

  // Text drawn inside the charts themselves.
  charts: {
    frequencyAxis: "Häufigkeit der Tage",
    meanPrefix: "Ø",
    vsReference: "ggü. Referenzperiode",
  },

  // Per-variable copy. Keys must match js/variable-config.js.
  variables: {
    temperature: {
      label: "Temperatur",
      legendCold: "kälter",
      legendWarm: "wärmer",
      valueLabel: "Jahresmittel",
      incompleteLabel: "lückenhaft",
      chartAriaLabel: "Verlauf der Tagesmitteltemperatur für jedes verfügbare Jahr",
      generalInfo:
        "Die Lufttemperatur beschreibt, wie warm oder kalt die Luft in Bodennähe ist. Sie wird in Grad Celsius (°C) gemessen und ist einer der wichtigsten Klimaindikatoren: Ihr langfristiger Verlauf zeigt, ob sich ein Ort über Jahrzehnte erwärmt oder abkühlt.",
      chartExplanation:
        "Jede dünne Linie zeigt den Tagesverlauf der Tagesmitteltemperatur eines einzelnen Jahres. Die dicke schwarze Linie zeigt die aktuell ausgewählte Referenzperiode. Die Farbe jedes Punkts zeigt, ob dieser Tag im Vergleich zum selben Tag der Referenzperiode wärmer (rot) oder kälter (blau) war. Fahre über das Diagramm, um einen Tag im Vergleich aller Jahre zu sehen. Nutze den Regler oben, um durch die einzelnen Jahre zu blättern.",
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
      legendCold: "trockener",
      legendWarm: "nasser",
      valueLabel: "Jahressumme",
      incompleteLabel: "lückenhaft",
      chartAriaLabel: "Kumulierter Niederschlag im Jahresverlauf für jedes verfügbare Jahr",
      generalInfo:
        "Niederschlag umfasst alles Wasser, das als Regen, Schnee, Hagel oder Nieselregen auf den Boden fällt. Er wird in Millimetern (mm) gemessen — 1 mm entspricht 1 Liter Wasser pro Quadratmeter. Niederschlag ist entscheidend für Wasserversorgung, Landwirtschaft und das Risiko von Dürren oder Überschwemmungen.",
      chartExplanation:
        "Jede Linie zeigt den im Jahresverlauf aufsummierten (kumulierten) Niederschlag eines einzelnen Jahres. Die dicke schwarze Linie zeigt die aktuell ausgewählte Referenzperiode. Die Farbe zeigt, ob an diesem Tag bislang mehr (blaugrün, nasser) oder weniger (braun, trockener) Niederschlag gefallen ist als in der Referenzperiode. Fahre über das Diagramm, um einen Tag im Vergleich aller Jahre zu sehen. Nutze den Regler oben, um durch die einzelnen Jahre zu blättern.",
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
      legendCold: "trüber",
      legendWarm: "sonniger",
      valueLabel: "Jahressumme",
      incompleteLabel: "lückenhaft",
      chartAriaLabel: "Monatliche Sonnenscheindauer des ausgewählten Jahres im Vergleich zur Referenzperiode",
      generalInfo:
        "Die Sonnenscheindauer gibt an, wie viele Stunden am Tag die Sonne direkt und ungehindert scheint — bewölkter oder diesiger Himmel zählt nicht mit. Sie wird in Stunden (h) gemessen und beeinflusst unter anderem Temperatur, Verdunstung und das Wohlbefinden von Menschen und Ökosystemen.",
      chartExplanation:
        "Für jeden Monat zeigt der graue Balken die durchschnittliche Sonnenscheindauer der aktuell ausgewählten Referenzperiode, der farbige Balken die Sonnenscheindauer im ausgewählten Jahr. Fahre über einen Monat, um die genauen Werte zu vergleichen. Nutze den Regler oben, um durch die einzelnen Jahre zu blättern.",
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
  },
};
