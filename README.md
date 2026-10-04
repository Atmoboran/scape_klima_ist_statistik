# Klima ist Statistik

Ein interaktives Exponat für SCAPE° (Bureau Mitte für SCAPE°, Offenbach):
jedes verfügbare Jahr der Tagesmitteltemperatur einer DWD-Wetterstation als
eine Linie, eingefärbt nach dem Jahresmittel — kältere Jahre in Blau,
wärmere Jahre in Rot. Zwei gestrichelte Linien für die offiziellen
DWD/WMO-Klimareferenzperioden 1961–1990 und 1991–2020 machen den Unterschied
direkt im Diagramm sichtbar; ein großes Zahlenfeld zeigt die Abweichung des
gerade gewählten Jahres von der Referenzperiode 1991–2020. Besucher:innen
können eine Linie antippen, durch die Jahre scrubben/abspielen, oder über das
Diagramm fahren, um den kältesten/wärmsten Tag im Rekord für ein
Kalenderdatum zu sehen. Ein Vergleichsdiagramm am Fuß der Seite stellt beide
Klimareferenzperioden direkt gegenüber.

Zwei Stationen sind eingebunden: Frankfurt/Main (01420, Tiefland, 100 m) und
Kleiner Feldberg/Taunus (02601, Mittelgebirge, 822 m).

Daten: [DWD Climate Data Center](https://opendata.dwd.de/climate_environment/CDC/observations_germany/climate/daily/kl/historical/), CC BY 4.0.
Gestaltung nach dem SCAPE° Corporate Design (Bureau Mitte für SCAPE°):
Wortmarke „SCAPE°“ mit Unterzeile „Wetter Klima Mensch“, Schrift Founders
Grotesk (im Web durch die freie Schrift „Jost“ angenähert), große
Überschriften in Versalien, flächige rechteckige Farbfelder aus kräftigen
und Pastelltönen der CD-Palette, keine Rundungen. Auch die Datenfarben
stammen aus der CD-Palette (Blau–Rot für Temperatur, Orange–Cyan für
Niederschlag, Petrol–Ocker für Sonnenschein) mit neutralem Grau als
Mittelpunkt.

## Projektstruktur

```
docs/                     die eigentliche Website — unverändert eingecheckt, das ist es, was GitHub Pages ausliefert
  index.html               Seite „Tagesverlauf“ (nur Struktur, alle Texte kommen aus content/)
  trend.html               Seite „Klimatrend“
  .nojekyll                deaktiviert GitHubs Jekyll-Verarbeitung (reine statische Dateien)

  theme/                   ── Gestaltung (zum Anpassen)
    theme.css              Design-Tokens: Schrift, Flächen-, Text-, Akzentfarben, Radien, Schatten
    theme.js               Datenfarben der Diagramme (Farbskalen je Messgröße, Vergleichsperioden)
  content/                 ── Texte (zum Anpassen / Übersetzen)
    texts.de.js            sämtliche sichtbaren Texte, Beschriftungen, Erklärungen, Tooltip-Formate

  css/style.css            Layout und Komponenten — nutzt ausschließlich Variablen aus theme.css
  js/texts.js              füllt die data-t-Platzhalter im HTML aus content/
  js/variable-config.js    Verhalten je Messgröße (Achsen, Einheiten, Diagrammtyp) + Zusammenführung
  js/main.js               Orchestrierung Tagesverlauf: Stationen, Zeitleiste, Vergleichsdiagramm
  js/trend.js              Orchestrierung Klimatrend: Jahresbalken, Verteilung, Jahreszeiten
  js/*-plot.js             die einzelnen Diagramme (vendored D3, kein Framework)
  js/vendor/d3.v7.min.js   lokal eingebunden, damit das Exponat auch ohne Internet läuft
  fonts/jost-latin.woff2   Schrift Jost (variabel, 100–900), ebenfalls lokal eingebunden
  data/processed/*.json    vorberechnete Stationsdaten, die die Seite zur Laufzeit lädt

data/raw/                 rohe DWD-Stationsdateien, für Nachvollziehbarkeit (liegen außerhalb von docs/, werden also nicht mit ausgeliefert)
scripts/
  fetch_data.py            lädt Rohdaten + Stationsmetadaten für die 2 Stationen herunter
  build_data.py            erzeugt daraus docs/data/processed/*.json
```

Es gibt keinen clientseitigen Build-Schritt — `docs/` ist reines HTML/CSS/JS
und wird unverändert auf GitHub Pages veröffentlicht. `docs/` ist bewusst
gewählt (statt z. B. `public/`), weil GitHub Pages im Modus „Deploy from a
branch“ nur `/` (Repo-Root) oder `/docs` als Quellordner erlaubt — alles
außerhalb von `docs/` (Rohdaten, Build-Skripte) wird dadurch automatisch
nicht mit veröffentlicht.

## Eigene Version / Anpassen

Gestaltung und Texte sind vom Code getrennt. Für eine eigene Version des
Exponats (anderes Branding, andere Sprache, andere Formulierungen) genügt es
in der Regel, diese drei Dateien zu bearbeiten — `css/` und `js/` bleiben
unverändert:

| Datei | Was darin steht |
|---|---|
| `docs/theme/theme.css` | Schrift (`--font`, `@font-face`), Hintergründe, Textfarben, Linien, Akzentfarbe für aktive Schalter/Regler/Play-Button, Tooltip-Farben, Logo-Farben, Eckenradien. |
| `docs/theme/theme.js` | Farben in den Diagrammen: je Messgröße die Farbskala `colorStops` (kalt/trocken → neutral → warm/nass) sowie die Farben der beiden Referenzperioden im Vergleichsdiagramm. Als Hex-Werte, weil D3 damit rechnet. |
| `docs/content/texts.de.js` | Alle sichtbaren Texte: Titel, Untertitel, Navigation, Beschriftungen, Pop-up-Erklärungen, Bildunterschriften, Monatsnamen, Zahlen-/Datumsformat (`locale`) sowie die Formatierungsfunktionen für Tooltips und Überschriften. |

**Andere Sprache:** `content/texts.de.js` kopieren (z. B. `texts.en.js`),
`lang`, `locale` und alle Einträge übersetzen und im `<script>`-Block von
`index.html` und `trend.html` die eingebundene Datei austauschen. Im HTML
selbst steht kein Text; die Elemente verweisen über `data-t="pfad.zum.text"`
(Text), `data-t-html` (Text mit Auszeichnung) und `data-t-aria`
(Screenreader-Beschriftung) auf Einträge in dieser Datei. Fehlt ein Eintrag,
erscheint in der Browser-Konsole eine Warnung.

**Farbskalen:** Für die Datenfarben sollte der Mittelpunkt neutral (grau)
bleiben und beide Enden ähnlich dunkel sein, damit „mehr“ und „weniger“
gleich stark wirken. In Texten, die Farben beschreiben (z. B.
„wärmer (rot)“ in `content/texts.de.js`), die Farbnamen mit anpassen.

**Eigene Marke:** Die Wortmarke im Kopf von `index.html`/`trend.html`
besteht aus Text: Name (`brand.nameHtml`) und Unterzeile (`brand.claim`)
kommen aus den Texten, die Farbleiste darunter aus `--band-1` bis
`--band-4` in `theme/theme.css`. Wer die lizenzierte Founders Grotesk als
Webfont hat, bindet sie per `@font-face` in `theme/theme.css` ein — sie
steht in `--font` bereits an erster Stelle.

## Lokale Vorschau

```bash
cd docs
python3 -m http.server 8000
# http://localhost:8000 öffnen
```

## Daten aktualisieren

Nur nötig, um ein neueres Jahr DWD-Daten nachzuziehen. Benötigt
[uv](https://docs.astral.sh/uv/):

```bash
uv run scripts/fetch_data.py   # lädt rohe Stationsdateien nach data/raw/
uv run scripts/build_data.py   # baut docs/data/processed/*.json neu
```

Anschließend die geänderten Dateien unter `data/raw/` und
`docs/data/processed/` committen — die Daten sind Teil des Repos und werden
nicht live von der Seite nachgeladen.

## Deployment auf GitHub Pages

Einmalig in den Repo-Einstellungen unter **Settings → Pages → Build and
deployment → Source** auf **„Deploy from a branch“** stellen und als Branch
`main` mit Ordner `/docs` wählen. Ab dann veröffentlicht GitHub Pages bei
jedem Push auf `main` automatisch den aktuellen Stand von `docs/` — ohne
Build-Schritt, ohne GitHub Actions.
