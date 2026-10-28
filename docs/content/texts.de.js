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
  description: 'Messdaten des Deutschen Wetterdienstes zum Ausprobieren: der Verlauf jedes Jahres, die Häufigkeit der Tageswerte und der Trend über alle Jahre – für das ganze Jahr oder eine Jahreszeit.',

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

  // The three views of the page, in this order. `question` stands above the chart.
  views: {
    ariaLabel: 'Ansichten',
    verlauf: { nav: 'Verlauf', question: 'Wie ist ein Jahr Tag für Tag verlaufen?' },
    haeufigkeit: { nav: 'Häufigkeit', question: 'Wie oft gab es welche Tageswerte?' },
    trend: { nav: 'Trend', question: 'Wie verändern sich die Jahre?' }
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
    sliderAria: 'Jahr auswählen',
    prevAria: 'Ein Jahr zurück',
    nextAria: 'Ein Jahr vor',
    playAria: 'Durch die Jahre abspielen',
    stopAria: 'Abspielen anhalten'
  },

  // Shared by both pages.
  common: {
    referencePeriodLabel: 'Referenzperiode',
    referencePeriodShort: 'Referenz',
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

  // The page (index.html) and the texts of each view.
  page: {
    pageTitle: 'Klima ist Statistik',
    headline: 'Klima ist Statistik',
    lead: 'Ein einzelnes Jahr sagt wenig über das Klima. Erst im Vergleich vieler Jahre zeigt sich das Muster und die Abweichung vom Mittelwert.',
    seasonAria: 'Jahreszeit',
    year: 'Jahr',
    deviation: 'Abweichung'
  },

  // Season buttons; `stems` build the readout label ("Sommermittel", "Frühlingssumme").
  seasons: {
    full: 'Jahr',
    winter: 'Winter',
    spring: 'Frühling',
    summer: 'Sommer',
    autumn: 'Herbst',
    stems: { winter: 'Winter', spring: 'Frühlings', summer: 'Sommer', autumn: 'Herbst' }
  },

  // Legends in the top-right corner of the chart.
  legends: {
    reference: 'Referenz',
    barYear: 'Ausgewähltes Jahr',
    barPeriod: (start, end) => `Referenz ${start}–${end}`,
    distYear: 'Tage im gewählten Jahr',
    distReference: (start, end) => `Referenz ${start}–${end}`,
    movingAverage: '10-Jahres-Mittel'
  },

  // View "Verlauf": comparison of the two reference periods (inside the climate topic).
  compare: {
    titleDefault: 'Klimavergleich',
    title: (stationName) => `Klimavergleich für ${stationName}`,
    tooFewYears: (start, end) =>
      `Für die Referenzperiode ${start}–${end} liegen bei dieser Station zu wenige vollständige Jahre vor, ` +
      'um einen verlässlichen Vergleich zu berechnen.',
    aria: 'Vergleich der beiden Referenzperioden über das Jahr'
  },

  // View "Häufigkeit" and "Trend": aria labels and the "Was sehe ich auf dem Diagramm?" text.
  // seasonLabel is null for the whole year.
  haeufigkeit: {
    aria: (variableLabel) => `Verteilung der Tageswerte (${variableLabel}) im Vergleich zur Referenzperiode`,
    caption: (seasonLabel, start, end) =>
      `Jede Säule zählt, an wie vielen Tagen ${seasonLabel ? `im ${seasonLabel} ` : ''}des gewählten Jahres der Wert in diesem Bereich lag, z. B. zwischen 18 und 19 °C. ` +
      `Die gestrichelte Linie zeigt, wie viele Tage es in der Referenzperiode <strong>${start}–${end}</strong> im Schnitt pro Jahr waren. ` +
      'Fahre über eine Säule, um die genauen Zahlen zu sehen, und nutze den Regler, um durch die Jahre zu blättern.',
    // Appended for temperature over the whole year only.
    bimodalNote:
      ' Bei der Ganzjahresansicht ist die Verteilung oft zweigipflig: Die Temperatur ändert sich um die kältesten ' +
      'Wintertage und die wärmsten Sommertage herum am langsamsten, weshalb sich die Tageswerte dort häufen – ' +
      'probiere Winter oder Sommer aus, um die einzelnen Jahreszeiten für sich zu sehen.'
  },
  trend: {
    aria: (variableLabel, firstYear, lastYear) =>
      `${variableLabel} je Jahr im Vergleich zur Referenzperiode, ${firstYear}–${lastYear}`,
    caption: (seasonLabel) =>
      `Jeder Balken zeigt den tatsächlichen Wert ${seasonLabel ? `des ${seasonLabel}s` : 'des Jahres'}. ` +
      'Die gestrichelte Linie markiert das Mittel der Referenzperiode, die Farbe die Abweichung davon. ' +
      'Die schwarze Linie ist der gleitende 10-Jahres-Durchschnitt. Das Jahr am Regler ist hervorgehoben; tippe auf einen Balken, um es zu wählen.'
  },
  // Appended to every view's text when a season is chosen.
  seasonNote: (seasonLabel) =>
    ` Im Verlauf sind die Monate außerhalb der Jahreszeit ${seasonLabel} ausgegraut.` +
    (seasonLabel === 'Winter' ? ' Ein Winter gehört zu dem Jahr, in dem sein Januar und Februar liegen; der Dezember davor zählt mit.' : ''),

  // Tasks dialog: a question, an answer field and a "Prüfen" button each.
  // The right answers are computed from the data in js/main.js (setupQuiz);
  // `tolerance` there decides how close an answer must be.
  quiz: {
    open: 'Aufgaben',
    title: 'Aufgaben',
    closeAria: 'Aufgaben schließen',
    intro: 'Für jede Ansicht gibt es leichte und knifflige Aufgaben. Finde die Antworten in der Grafik und trag sie ein.',
    check: 'Prüfen',
    answerAria: 'Deine Antwort',
    empty: 'Trag zuerst eine Zahl ein.',
    wrong: 'Noch nicht ganz.',
    hintLabel: 'Tipp:',
    progress: (done, total) => `${done}/${total}`
  },

  // The tasks, grouped by view and level, in this order. Every function gets the
  // station name; `solved` also the right answer, already formatted.
  tasks: {
    levels: { easy: 'Leicht', hard: 'Knifflig' },
    verlauf: {
      easy: {
        dev2003: {
          question: (name) => `Um wie viel Grad lag die Jahresmitteltemperatur 2003 in ${name} über dem Mittel 1961–1990?`,
          unit: '°C',
          hint: 'Temperatur, Jahreszeit „Jahr“, Referenz 1961–1990: schieb den Regler auf 2003 und lies die Abweichung ab.',
          solved: (name, answer) => `Richtig: ${answer} °C. 2003 war das Jahr des großen Hitzesommers.`
        },
        rain2018: {
          question: (name) => `Wie viel Niederschlag fiel 2018 in ${name}? (Jahressumme)`,
          unit: 'mm',
          hint: 'Wähl Niederschlag und Jahreszeit „Jahr“, schieb den Regler auf 2018 und lies die Jahressumme ab.',
          solved: (name, answer) => `Richtig: rund ${answer} mm. 2018 war ein sehr trockenes Jahr.`
        }
      },
      hard: {
        aug2018: {
          question: (name) => `Wie warm war es in ${name} am 1. August 2018 im Tagesmittel?`,
          unit: '°C',
          hint: 'Temperatur, Regler auf 2018, dann mit Maus oder Finger genau über den 1. August fahren.',
          solved: (name, answer) => `Richtig: ${answer} °C – mitten in einer langen Hitzewelle.`
        },
        periods: {
          question: (name) => `Um wie viel Grad war die Referenzperiode 1991–2020 in ${name} wärmer als 1961–1990?`,
          unit: '°C',
          hint: 'Die Antwort steht im Klimavergleich unter „Was hat das mit dem Klimawandel zu tun?“.',
          solved: (name, answer) => `Richtig: ${answer} °C. Das „normale“ Klima selbst hat sich verschoben.`
        }
      }
    },
    haeufigkeit: {
      easy: {
        band2025: {
          question: (name) => `An wie vielen Tagen lag die Tagesmitteltemperatur 2025 in ${name} zwischen 20 und 21 °C?`,
          unit: 'Tage',
          hint: 'Ansicht „Häufigkeit“, Temperatur, Jahreszeit „Jahr“, Jahr 2025: fahr über die Säule „20 bis 21 °C“.',
          solved: (name, answer) => `Richtig: ${answer} Tage.`
        },
        summerMean: {
          question: (name) => `Wie warm waren die Sommertage in ${name} 1961–1990 im Durchschnitt? (die Ø-Linie)`,
          unit: '°C',
          hint: 'Ansicht „Häufigkeit“, Temperatur, Jahreszeit „Sommer“, Referenz 1961–1990: lies den Wert an der gepunkteten Ø-Linie ab.',
          solved: (name, answer) => `Richtig: ${answer} °C. Vergleiche das mit einem Sommer von heute!`
        }
      },
      hard: {
        hot2003: {
          question: (name) => `An wie vielen Tagen lag die Tagesmitteltemperatur 2003 in ${name} bei 20 °C oder mehr?`,
          unit: 'Tage',
          hint: 'Ansicht „Häufigkeit“, Temperatur, Jahreszeit „Jahr“, Jahr 2003: zähl die Tage aller Säulen ab 20 °C zusammen.',
          solved: (name, answer) => `Richtig: ${answer} Tage – fast ein Viertel des Jahres.`
        },
        frost2025: {
          question: (name) => `Wie viele Tage mit einem Tagesmittel unter 0 °C hatte der Winter 2025 in ${name}? (Dezember 2024 bis Februar 2025)`,
          unit: 'Tage',
          hint: 'Ansicht „Häufigkeit“, Temperatur, Jahreszeit „Winter“, Jahr 2025: zähl die Tage aller Säulen unter 0 °C zusammen.',
          solved: (name, answer) => `Richtig: ${answer} Tage. Vergleiche mit der gestrichelten Linie: Früher waren es mehr.`
        }
      }
    },
    trend: {
      easy: {
        warmest: {
          question: (name) => `In welchem Jahr war es in ${name} im Jahresmittel am wärmsten?`,
          unit: '',
          hint: 'Ansicht „Trend“, Temperatur, Jahreszeit „Jahr“: tippe auf den höchsten Balken.',
          solved: (name, answer) => `Richtig: ${answer}. Die wärmsten Jahre liegen fast alle in der jüngsten Zeit.`
        },
        coldest: {
          question: (name) => `In welchem Jahr war es in ${name} im Jahresmittel am kältesten?`,
          unit: '',
          hint: 'Ansicht „Trend“, Temperatur, Jahreszeit „Jahr“: tippe auf den längsten blauen Balken.',
          solved: (name, answer) => `Richtig: ${answer}. Die kältesten Jahre liegen weit zurück.`
        }
      },
      hard: {
        lastTen: {
          question: (name, first, last) => `Wie viele der Jahre ${first}–${last} waren in ${name} wärmer als das Mittel 1961–1990?`,
          unit: '',
          hint: 'Ansicht „Trend“, Temperatur, Jahreszeit „Jahr“, Referenz 1961–1990: zähl ganz rechts die Balken über der gestrichelten Linie.',
          solved: (name, answer) => `Richtig: ${answer}. Ein kaltes Jahr ist inzwischen die Ausnahme.`
        },
        summerMax: {
          question: (name) => `In welchem Jahr war der Sommer in ${name} am wärmsten?`,
          unit: '',
          hint: 'Ansicht „Trend“, Temperatur, Jahreszeit „Sommer“: tippe auf den höchsten Balken.',
          solved: (name, answer) => `Richtig: ${answer}. Der wärmste Sommer ist nicht im wärmsten Jahr – schau, welches Jahr insgesamt vorn liegt.`
        }
      }
    }
  },

  // Text drawn inside the charts themselves.
  charts: {
    // Häufigkeit view: y-axis title (width: formatted band width, e.g. "1" or "0,5"),
    // the value band of a column, and the tooltip of a column.
    frequencyAxis: (width, unit) => `Anzahl Tage je ${width} ${unit}`,
    band: (lo, hi, unit) => `${lo} bis ${hi} ${unit}`,
    bandBelow: (hi, unit) => `unter ${hi} ${unit}`,
    bandFrom: (lo, unit) => `ab ${lo} ${unit}`,
    bandTooltip: (range, year, yearDays, period, refDays) =>
      `<b>${range}</b><br>${year}: ${yearDays === null ? 'keine Daten' : `${yearDays} ${yearDays === 1 ? 'Tag' : 'Tage'}`}<br>` +
      `Referenz ${period}: ${refDays} Tage im Schnitt`,
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
      seasonValueLabel: (stem) => `${stem}mittel`,
      incompleteLabel: 'lückenhaft',
      chartAriaLabel: 'Verlauf der Tagesmitteltemperatur für jedes verfügbare Jahr',
      generalInfo:
        'Die Lufttemperatur beschreibt, wie warm oder kalt die Luft in Bodennähe ist. Sie wird in Grad Celsius (°C) gemessen und ist einer der wichtigsten Klimaindikatoren: Ihr langfristiger Verlauf zeigt, ob sich ein Ort über Jahrzehnte erwärmt oder abkühlt.',
      chartExplanation:
        'Jede dünne Linie zeigt den Tagesverlauf der Tagesmitteltemperatur eines einzelnen Jahres. Die dicke schwarze Linie zeigt die aktuell ausgewählte Referenzperiode. Die Farbe jedes Punkts zeigt, ob dieser Tag im Vergleich zum selben Tag der Referenzperiode wärmer (rot) oder kälter (blau) war. Fahre über das Diagramm, um für einen Tag den Wert des gewählten Jahres und seine Abweichung von der Referenzperiode zu sehen. Nutze den Regler, um durch die einzelnen Jahre zu blättern.',
      // Hovering the chart: the chosen year on that day. value/diff arrive formatted with unit, or null.
      formatDayTooltip: (dateLabel, year, value, diff) =>
        `<b>${dateLabel} ${year}</b><br>` + (value === null ? 'keine Daten' : `${value}` + (diff === null ? '' : `<br>${diff} ggü. Referenz`)),
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
      seasonValueLabel: (stem) => `${stem}summe`,
      incompleteLabel: 'lückenhaft',
      chartAriaLabel: 'Kumulierter Niederschlag im Jahresverlauf für jedes verfügbare Jahr',
      generalInfo:
        'Niederschlag umfasst alles Wasser, das als Regen, Schnee, Hagel oder Nieselregen auf den Boden fällt. Er wird in Millimetern (mm) gemessen – 1 mm entspricht 1 Liter Wasser pro Quadratmeter. Niederschlag ist entscheidend für Wasserversorgung, Landwirtschaft und das Risiko von Dürren oder Überschwemmungen.',
      chartExplanation:
        'Jede Linie zeigt den im Jahresverlauf aufsummierten (kumulierten) Niederschlag eines einzelnen Jahres. Die dicke schwarze Linie zeigt die aktuell ausgewählte Referenzperiode. Die Farbe zeigt, ob an diesem Tag bislang mehr (blau, nasser) oder weniger (orange, trockener) Niederschlag gefallen ist als in der Referenzperiode. Fahre über das Diagramm, um für einen Tag den Wert des gewählten Jahres und seine Abweichung von der Referenzperiode zu sehen. Nutze den Regler, um durch die einzelnen Jahre zu blättern.',
      // Hovering the chart: the chosen year's total up to that day. value/diff arrive formatted with unit, or null.
      formatDayTooltip: (dateLabel, year, value, diff) =>
        `<b>bis ${dateLabel} ${year}</b><br>` + (value === null ? 'keine Daten' : `${value}` + (diff === null ? '' : `<br>${diff} ggü. Referenz`)),
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
      seasonValueLabel: (stem) => `${stem}summe`,
      incompleteLabel: 'lückenhaft',
      chartAriaLabel: 'Monatliche Sonnenscheindauer des ausgewählten Jahres im Vergleich zur Referenzperiode',
      generalInfo:
        'Die Sonnenscheindauer gibt an, wie viele Stunden am Tag die Sonne direkt und ungehindert scheint – bewölkter oder diesiger Himmel zählt nicht mit. Sie wird in Stunden (h) gemessen und beeinflusst unter anderem Temperatur, Verdunstung und das Wohlbefinden von Menschen und Ökosystemen.',
      chartExplanation:
        'Für jeden Monat zeigt der graue Balken die durchschnittliche Sonnenscheindauer der aktuell ausgewählten Referenzperiode, der farbige Balken die Sonnenscheindauer im ausgewählten Jahr. Fahre über einen Monat, um die Sonnenstunden des gewählten Jahres und ihre Abweichung von der Referenzperiode zu sehen. Nutze den Regler, um durch die einzelnen Jahre zu blättern.',
      formatDayTooltip: (dateLabel, year, value, diff) =>
        `<b>${dateLabel} ${year}</b><br>` + (value === null ? 'keine Daten' : `${value}` + (diff === null ? '' : `<br>${diff} ggü. Referenz`)),
      // Hovering a month: the chosen year's total of that month. value/diff arrive formatted with unit, or null.
      formatMonthTooltip: (monthLabel, year, value, diff) =>
        `<b>${monthLabel} ${year}</b><br>` + (value === null ? 'keine Daten' : `${value}` + (diff === null ? '' : `<br>${diff} ggü. Referenz`)),
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
