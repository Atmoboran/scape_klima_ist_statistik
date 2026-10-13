// Every visible text of both pages (index.html "Tagesverlauf", trend.html
// "Klimatrend"). Edit or translate this file to adapt the exhibit; the HTML
// only holds data-t="path.to.key" placeholders that js/texts.js fills from
// here, the scripts use t('path.to.key', …). Entries written as functions
// build a sentence around runtime values (years, already formatted numbers,
// station names). Entries may contain simple HTML (<b>, <strong>, <br>).
// Lines marked LOCAL refer to SCAPE° or its region.
window.TEXTS = {
  lang: 'de',
  locale: 'de-DE', // dates in tooltips, station sorting
  months: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
  dash: '–',
  description: 'Messdaten des Deutschen Wetterdienstes zum Ausprobieren: jedes Jahr als eine Linie, Referenzperioden 1961–1990 und 1991–2020, Jahresbalken und die Verteilung der Tageswerte.',

  // Texts of the shared kit (js/view.js, js/kit.js).
  kit: {
    viewToDesktop: 'Desktop-Ansicht',
    viewToMobile: 'Handy-Ansicht',
    viewToDesktopAria: 'Zur Desktop-Ansicht wechseln',
    viewToMobileAria: 'Zur Handy-Ansicht wechseln',
    fullscreenEnter: 'Vollbild',
    fullscreenExit: 'Vollbild beenden',
    infoAria: 'Erklärung anzeigen',
    merke: 'Merke',
    tasks: 'Aufgaben',
    merkeLocked: 'Löse die Aufgaben – dann erscheint hier, was du herausgefunden hast.',
    devLink: '(dev)'
  },

  nav: {
    ariaLabel: 'Teile der Ausstellung',
    daily: 'Tagesverlauf',
    trend: 'Klimatrend'
  },

  // Footer sources line (licence requirement).
  sources: 'Daten: Deutscher Wetterdienst (DWD) Climate Data Center, Tageswerte, CC BY 4.0.',
  loadError: 'Die Messdaten konnten nicht geladen werden. Öffne die Seite über einen Webserver (zum Beispiel GitHub Pages) – als einzelne Datei per Doppelklick lädt der Browser keine Daten.',

  pickers: {
    variable: 'Messgröße',
    station: 'Messstation',
    variableInfoAria: 'Info zur Messgröße anzeigen',
    stationInfoAria: 'Stationsdetails anzeigen'
  },

  timeline: {
    label: 'Jahr wählen',
    sliderAria: 'Jahr auswählen',
    prevAria: 'Ein Jahr zurück',
    nextAria: 'Ein Jahr vor',
    play: 'Abspielen',
    stop: 'Stopp',
    playAria: 'Durch die Jahre abspielen',
    stopAria: 'Abspielen anhalten'
  },

  // Shared by both pages.
  common: {
    referencePeriodLabel: 'Referenzperiode',
    periodInfoAria: 'Was ist eine Referenzperiode?',
    periodInfo:
      '<p><b>Referenzperiode:</b> Eine Referenzperiode ist ein fester, 30 Jahre langer Vergleichszeitraum, den die Weltorganisation für Meteorologie ' +
      'als gemeinsamen Maßstab für das Klima festlegt. Der Durchschnitt dieser 30 Jahre gilt als „normales“ Klima, gegen das ' +
      'einzelne Jahre verglichen werden.</p><p>Diese App nutzt die beiden offiziellen Referenzperioden 1961–1990 und 1991–2020. ' +
      'Der Wechsel zwischen ihnen zeigt, wie sich das Klimamittel selbst über die Zeit verschoben hat.</p>',
    noData: 'keine Daten',
    periodTooFewYears:
      'Für die aktuell ausgewählte Referenzperiode liegen bei dieser Station zu wenige vollständige Jahre vor, ' +
      'um einen verlässlichen Vergleich zu berechnen.',
    topics: {
      chartTitle: 'Was sehe ich auf dem Diagramm?',
      calcTitle: 'Wie werden diese Werte berechnet?',
      climateTitle: 'Was hat das mit dem Klimawandel zu tun?'
    },
    meanExplanation:
      '<strong>Mittelwert:</strong> Ein Mittelwert (Durchschnitt) fasst mehrere Messungen zu einem typischen Wert zusammen: ' +
      'Man addiert alle Werte und teilt die Summe durch ihre Anzahl. Beispiel: Aus den drei Zahlen 10, 15 und 18 ergibt sich ' +
      '(10 + 15 + 18) ÷ 3 = 14,3 als Mittelwert.',
    station: {
      coordinates: 'Koordinaten',
      elevation: 'Höhe',
      state: 'Bundesland',
      years: 'Aktive Jahre',
      formatCoordinates: (lat, lon) => `${lat}° N, ${lon}° O`,
      formatElevation: (meters) => `${meters} m ü. NHN`
    }
  },

  // index.html — "Tagesverlauf"
  daily: {
    pageTitle: 'Klima ist Statistik – Tagesverlauf',
    kicker: 'Teil 1 von 2 · Tagesverlauf',
    headline: 'Klima ist<br>Statistik',
    lead: 'Ein einzelnes Jahr sagt wenig über das Klima. Erst im Vergleich vieler Jahre zeigt sich das Muster – und die Abweichung vom Mittelwert.',
    badge: 'Tippe ins Diagramm oder drück „Abspielen“',
    year: 'Jahr',
    deviation: 'Abweichung',
    deviationVs: (start, end) => `(vs. ${start}–${end})`,
    legendVs: 'als',
    legendReference: 'Referenzperiode',
    barLegendYear: 'Ausgewähltes Jahr',
    barLegendPeriod: (start, end) => `Referenzperiode ${start}–${end}`,
    compareTitleDefault: 'Klimavergleich',
    compareTitle: (stationName) => `Klimavergleich für ${stationName}`,
    compareTooFewYears: (start, end) =>
      `Für die Referenzperiode ${start}–${end} liegen bei dieser Station zu wenige vollständige Jahre vor, ` +
      'um einen verlässlichen Vergleich zu berechnen.',
    compareAria: 'Vergleich der beiden Referenzperioden über das Jahr',
    next: 'Weiter zu Klimatrend →',
    tasks: {
      title: 'Aufgaben',
      cold: 'Such bei der Temperatur mit dem Regler ein Jahr, das kälter war als die Referenzperiode.',
      period: 'Schalte die Referenzperiode auf 1991–2020 um. Wohin rückt die schwarze Linie?',
      station: 'Wähl eine andere Messstation. Siehst du dort dasselbe Muster?',
      doneCold: (year) => `Gefunden: ${year} war kälter. Auch heute gibt es noch kalte Jahre – nur seltener.`,
      donePeriod: 'Das neue „Normal“ liegt höher: 1991–2020 war wärmer.',
      doneStation: 'Andere Station, gleiches Bild: Die neuen Jahre liegen meist oben.'
    },
    merke: {
      title: 'Merke',
      // LOCAL: true for the German DWD stations in data/processed (check when other stations are added)
      text: 'Ein einzelnes Jahr kann kalt oder warm sein. Das ist Zufall, wie beim Wetter. Erst viele Jahre zusammen zeigen das Klima. Und das Klima hat sich verschoben: 1991–2020 war es an allen Stationen hier wärmer als 1961–1990.'
    }
  },

  // trend.html — "Klimatrend"
  trend: {
    pageTitle: 'Klima ist Statistik – Klimatrend',
    kicker: 'Teil 2 von 2 · Klimatrend',
    headline: 'Klimatrend',
    lead: 'Jahreswerte im Vergleich zur Referenzperiode – und wie sich die ganze Verteilung der Tageswerte über die Zeit verschoben hat.',
    badge: 'Tippe auf einen Balken',
    viewLabel: 'Ansicht',
    seasonLabel: 'Jahreszeit',
    back: '← Zurück zum Tagesverlauf',
    modes: {
      annual: 'Jahresbalken',
      distribution: 'Verteilung'
    },
    seasons: {
      full: 'Jahr',
      winter: 'Winter',
      spring: 'Frühling',
      summer: 'Sommer',
      autumn: 'Herbst'
    },
    annualAria: (variableLabel, firstYear, lastYear) =>
      `${variableLabel} je Jahr im Vergleich zur Referenzperiode, ${firstYear}–${lastYear}`,
    distributionAria: (variableLabel) => `Verteilung der Tageswerte (${variableLabel}) im Vergleich zur Referenzperiode`,
    annualCaption:
      'Jeder Balken zeigt den tatsächlichen Jahreswert. Die gestrichelte Linie markiert das Mittel der Referenzperiode, ' +
      'die Farbe die Abweichung davon. Die schwarze Linie ist der gleitende 10-Jahres-Durchschnitt.',
    // seasonLabel is null for the whole year.
    distributionCaption: (seasonLabel, start, end) =>
      `Die farbige Fläche zeigt, wie die ${seasonLabel ? `${seasonLabel}-Tageswerte` : 'Tageswerte'} im ausgewählten Jahr verteilt sind. ` +
      `Die gestrichelte Linie ist dieselbe Verteilung für die Referenzperiode <strong>${start}–${end}</strong>. ` +
      'Nutze den Regler, um durch die einzelnen Jahre zu blättern.',
    // Appended to the caption for temperature over the whole year only.
    bimodalNote:
      ' Bei der Ganzjahresansicht ist die Verteilung oft zweigipflig: Die Temperatur ändert sich um die kältesten ' +
      'Wintertage und die wärmsten Sommertage herum am langsamsten, weshalb sich die Tageswerte dort häufen – ' +
      'probiere Winter oder Sommer aus, um die einzelnen Jahreszeiten für sich zu sehen.',
    // seasonLabel is null for the whole year.
    badgeSub: (seasonLabel, stationName) => (seasonLabel ? `${seasonLabel} · ${stationName}` : stationName),
    tasks: {
      title: 'Aufgaben',
      warmest: 'Tippe bei der Temperatur auf die Balken oder fahre darüber: Finde das wärmste Jahr.',
      dist: 'Schalte auf „Verteilung“. Vergleiche ein Jahr vor 1970 mit einem Jahr nach 2010.',
      doneWarmest: (year) => `Gefunden: ${year} war das wärmste Jahr an dieser Station.`,
      doneDist: 'Der Berg ist nach rechts gewandert – zu den wärmeren Tagen.'
    },
    merke: {
      title: 'Merke',
      text: 'Die meisten Balken der letzten Jahre sind rot: Es ist wärmer geworden. Der ganze Berg der Tageswerte ist nach rechts gewandert. Warme Tage gibt es jetzt öfter, sehr kalte seltener.'
    }
  },

  // Text drawn inside the charts themselves.
  charts: {
    frequencyAxis: 'Häufigkeit der Tage',
    meanPrefix: 'Ø',
    vsReference: 'ggü. Referenzperiode'
  },

  // Per-variable copy. Keys must match js/variable-config.js. Numbers arrive
  // already formatted (decimal comma, real minus sign).
  variables: {
    temperature: {
      label: 'Temperatur',
      legendCold: 'kälter',
      legendWarm: 'wärmer',
      valueLabel: 'Jahresmittel',
      incompleteLabel: 'lückenhaft',
      chartAriaLabel: 'Verlauf der Tagesmitteltemperatur für jedes verfügbare Jahr',
      hint: 'Jede dünne Linie ist ein Jahr, die schwarze Linie das Mittel der Referenzperiode. Rot heißt: wärmer als dieses Mittel, blau: kälter.',
      generalInfo:
        'Die Lufttemperatur beschreibt, wie warm oder kalt die Luft in Bodennähe ist. Sie wird in Grad Celsius (°C) gemessen und ist einer der wichtigsten Klimaindikatoren: Ihr langfristiger Verlauf zeigt, ob sich ein Ort über Jahrzehnte erwärmt oder abkühlt.',
      chartExplanation:
        'Jede dünne Linie zeigt den Tagesverlauf der Tagesmitteltemperatur eines einzelnen Jahres. Die dicke schwarze Linie zeigt die aktuell ausgewählte Referenzperiode. Die Farbe jedes Punkts zeigt, ob dieser Tag im Vergleich zum selben Tag der Referenzperiode wärmer (rot) oder kälter (blau) war. Fahre über das Diagramm, um einen Tag im Vergleich aller Jahre zu sehen. Nutze den Regler, um durch die einzelnen Jahre zu blättern.',
      formatDayTooltip: (stat, dateLabel) =>
        `<b>${dateLabel}</b><br>Durchschnitt: ${stat.mean} °C<br>` +
        `<span class="tt-cold">kälteste: ${stat.min} °C (${stat.minYear})</span><br>` +
        `<span class="tt-warm">wärmste: ${stat.max} °C (${stat.maxYear})</span>`,
      formatCompareHeadline: (pa, pb, diff, amount) =>
        `${pb.start}–${pb.end} war im Jahresmittel <strong>${amount} °C ${diff >= 0 ? 'wärmer' : 'kühler'}</strong> ` +
        `als ${pa.start}–${pa.end}.`,
      methodology: {
        day: '<strong>Tagesmitteltemperatur:</strong> An jeder Wetterstation wird die Temperatur mehrmals täglich gemessen. Der Mittelwert dieser Messungen ergibt einen einzigen Wert pro Tag – die Tagesmitteltemperatur.',
        year: '<strong>Jahresmitteltemperatur:</strong> Der Durchschnitt aller rund 365 Tagesmittelwerte eines Kalenderjahres ergibt die Jahresmitteltemperatur. Jede dünne Linie im Diagramm zeigt den Tagesverlauf genau eines Jahres.',
        period: '<strong>Klimareferenzperiode:</strong> Der Durchschnitt der Jahresmitteltemperaturen über 30 Jahre ergibt das Klimamittel einer Referenzperiode. Die schwarze Linie im Diagramm zeigt die gewählte der beiden offiziellen Referenzperioden 1961–1990 und 1991–2020.',
        context:
          'Die über Jahrzehnte sichtbare Erwärmung passt zum globalen Trend: Treibhausgase wie CO₂ verstärken den natürlichen Treibhauseffekt der Erdatmosphäre, was die Klimaforschung als Haupttreiber der weltweiten Erwärmung seit der Industrialisierung einordnet. Einzelne Jahre schwanken durch natürliche Variabilität (z. B. Meeresströmungen, Vulkanausbrüche, einzelne Wetterlagen) stark um diesen langfristigen Trend – erst der Vergleich vieler Jahrzehnte macht das zugrunde liegende Muster überhaupt sichtbar.'
      }
    },
    precipitation: {
      label: 'Niederschlag',
      legendCold: 'trockener',
      legendWarm: 'nasser',
      valueLabel: 'Jahressumme',
      incompleteLabel: 'lückenhaft',
      chartAriaLabel: 'Kumulierter Niederschlag im Jahresverlauf für jedes verfügbare Jahr',
      hint: 'Jede Linie zählt den Regen eines Jahres zusammen, die schwarze Linie zeigt die Referenzperiode. Blau heißt: bis dahin nasser, orange: trockener.',
      generalInfo:
        'Niederschlag umfasst alles Wasser, das als Regen, Schnee, Hagel oder Nieselregen auf den Boden fällt. Er wird in Millimetern (mm) gemessen – 1 mm entspricht 1 Liter Wasser pro Quadratmeter. Niederschlag ist entscheidend für Wasserversorgung, Landwirtschaft und das Risiko von Dürren oder Überschwemmungen.',
      chartExplanation:
        'Jede Linie zeigt den im Jahresverlauf aufsummierten (kumulierten) Niederschlag eines einzelnen Jahres. Die dicke schwarze Linie zeigt die aktuell ausgewählte Referenzperiode. Die Farbe zeigt, ob an diesem Tag bislang mehr (blau, nasser) oder weniger (orange, trockener) Niederschlag gefallen ist als in der Referenzperiode. Fahre über das Diagramm, um einen Tag im Vergleich aller Jahre zu sehen. Nutze den Regler, um durch die einzelnen Jahre zu blättern.',
      formatDayTooltip: (stat, dateLabel) =>
        `<b>bis ${dateLabel}</b><br>im Schnitt: ${stat.mean} mm<br>` +
        `<span class="tt-cold">am wenigsten: ${stat.min} mm (${stat.minYear})</span><br>` +
        `<span class="tt-warm">am meisten: ${stat.max} mm (${stat.maxYear})</span>`,
      formatCompareHeadline: (pa, pb, diff, amount) =>
        `${pb.start}–${pb.end} brachte im Schnitt <strong>${amount} mm ${diff >= 0 ? 'mehr' : 'weniger'} Niederschlag pro Jahr</strong> ` +
        `als ${pa.start}–${pa.end}.`,
      methodology: {
        day: '<strong>Tagesniederschlag:</strong> An jeder Wetterstation wird die gefallene Niederschlagsmenge (Regen, Schnee als Wasseräquivalent) einmal täglich gemessen – ein Wert pro Tag in Millimetern.',
        year: '<strong>Jahresniederschlag:</strong> Die Summe aller Tageswerte eines Kalenderjahres ergibt den Jahresniederschlag. Jede Linie im Diagramm zeigt die aufsummierte (kumulierte) Niederschlagsmenge im Verlauf genau eines Jahres.',
        period: '<strong>Klimareferenzperiode:</strong> Der Durchschnitt der Jahresniederschläge über 30 Jahre ergibt den mittleren Jahresniederschlag einer Referenzperiode. Die schwarze Linie im Diagramm zeigt die gewählte der beiden offiziellen Referenzperioden 1961–1990 und 1991–2020.',
        context:
          'Anders als bei der Temperatur zeigt der Jahresniederschlag über die Zeit kein so eindeutiges Muster – das ist wissenschaftlich plausibel: Niederschlag hängt stark von großräumigen Wettermustern und großer Jahr-zu-Jahr-Schwankung ab, die einen langsamen Trend leicht überdecken. Die Klimaforschung geht eher davon aus, dass sich mit der Erwärmung die Verteilung des Niederschlags verändert – etwa häufigere Starkregenereignisse oder verschobene Jahreszeiten – als dass sich allein die Jahressumme gleichmäßig in eine Richtung entwickelt.'
      }
    },
    sunshine: {
      label: 'Sonnenscheindauer',
      legendCold: 'trüber',
      legendWarm: 'sonniger',
      valueLabel: 'Jahressumme',
      incompleteLabel: 'lückenhaft',
      chartAriaLabel: 'Monatliche Sonnenscheindauer des ausgewählten Jahres im Vergleich zur Referenzperiode',
      hint: 'Grau: Sonnenstunden je Monat im Mittel der Referenzperiode. Farbig: das gewählte Jahr.',
      generalInfo:
        'Die Sonnenscheindauer gibt an, wie viele Stunden am Tag die Sonne direkt und ungehindert scheint – bewölkter oder diesiger Himmel zählt nicht mit. Sie wird in Stunden (h) gemessen und beeinflusst unter anderem Temperatur, Verdunstung und das Wohlbefinden von Menschen und Ökosystemen.',
      chartExplanation:
        'Für jeden Monat zeigt der graue Balken die durchschnittliche Sonnenscheindauer der aktuell ausgewählten Referenzperiode, der farbige Balken die Sonnenscheindauer im ausgewählten Jahr. Fahre über einen Monat, um die genauen Werte zu vergleichen. Nutze den Regler, um durch die einzelnen Jahre zu blättern.',
      formatDayTooltip: (stat, dateLabel) =>
        `<b>${dateLabel}</b><br>Durchschnitt: ${stat.mean} h<br>` +
        `<span class="tt-cold">am wenigsten: ${stat.min} h (${stat.minYear})</span><br>` +
        `<span class="tt-warm">am meisten: ${stat.max} h (${stat.maxYear})</span>`,
      // yearVal / periodVal: formatted numbers, or null when missing.
      formatMonthTooltip: (monthLabel, year, yearVal, periodVal) =>
        `<b>${monthLabel}</b><br>` +
        (yearVal !== null ? `${year}: <b>${yearVal} h</b><br>` : `${year}: keine Daten<br>`) +
        `Referenzperiode: ${periodVal !== null ? periodVal + ' h' : '–'}`,
      formatCompareHeadline: (pa, pb, diff, amount) =>
        `${pb.start}–${pb.end} brachte im Schnitt <strong>${amount} h ${diff >= 0 ? 'mehr' : 'weniger'} Sonnenschein pro Jahr</strong> ` +
        `als ${pa.start}–${pa.end}.`,
      methodology: {
        day:
          '<strong>Tagessonnenscheindauer:</strong> Gemessen wird, wie viele Stunden am Tag die Sonne direkt und ungehindert schien – diffuses Licht bei bedecktem Himmel zählt nicht mit. Traditionell erfassten das Sonnenscheinautographen nach Campbell-Stokes: Eine Glaskugel bündelt das Sonnenlicht wie eine Lupe und brennt bei ausreichender Intensität eine Spur in einen Registrierstreifen; heute übernehmen automatische Sensoren diese Messung. Die Einheit ist Stunden (h) pro Tag. Wichtigster Einflussfaktor ist die Bewölkung, aber auch Dunst, Feinstaub und andere Schwebteilchen in der Luft können die gemessene Sonnenscheindauer verringern – selbst bei auf den ersten Blick klarem Himmel.',
        year: '<strong>Jahressonnenscheindauer:</strong> Die Summe aller Tageswerte eines Kalenderjahres ergibt die jährliche Sonnenscheindauer. Das Diagramm fasst die Tage eines Jahres zu Monatssummen zusammen.',
        period: '<strong>Klimareferenzperiode:</strong> Der Durchschnitt der Jahressonnenscheindauern über 30 Jahre ergibt die mittlere Sonnenscheindauer einer Referenzperiode. Die grauen Balken zeigen die gewählte der beiden offiziellen Referenzperioden 1961–1990 und 1991–2020.',
        context:
          'Die Sonnenscheindauer wird von mehr als nur der Wolkenmenge beeinflusst: Feinstaub und Aerosole in der Atmosphäre – etwa aus Industrie, Verkehr oder Vulkanausbrüchen – können Sonnenlicht streuen oder reflektieren und so die gemessene Sonnenscheindauer verringern, auch ohne dass mehr Wolken am Himmel stehen. Für weite Teile Europas wird in der Forschung ein Rückgang der Sonnenscheindauer bis etwa in die 1980er-Jahre diskutiert („Global Dimming“), gefolgt von einem Wiederanstieg seither („Global Brightening“), der zeitlich mit einer verbesserten Luftreinhaltung zusammenfällt. Das ist eine plausible, wissenschaftlich diskutierte Erklärung für den großräumigen Trend – ob und wie deutlich sich dieses Muster in den Daten einer einzelnen Station zeigt, hängt von vielen lokalen Faktoren ab und lässt sich nicht allein aus dieser Grafik ableiten.'
      }
    }
  }
};
