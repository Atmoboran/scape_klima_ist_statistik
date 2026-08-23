# Klima ist Statistik

Ein interaktives Exponat für SCAPE° (Bureau Mitte für SCAPE°, Offenbach):
jedes verfügbare Jahr der Tagesmitteltemperatur einer DWD-Wetterstation als
eine Linie, eingefärbt nach dem Jahresmittel — kältere Jahre in Indigo,
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
Gestaltung angelehnt an die SCAPE° Corporate Identity (Farben, Formen,
Schrift Founders Grotesk — im Web durch die freie Schrift „Jost“ angenähert).

## Projektstruktur

```
public/                  die eigentliche Website — unverändert eingecheckt, das ist es, was GitLab Pages ausliefert
  index.html
  css/style.css
  js/main.js              Orchestrierung: Stationen, Zeitleiste, Vergleichsdiagramm
  js/spaghetti-plot.js     das interaktive Hauptdiagramm (vendored D3, kein Framework)
  js/vendor/d3.v7.min.js   lokal eingebunden, damit das Exponat auch ohne Internet läuft
  fonts/jost-latin.woff2   Schrift Jost (variabel, 100–900), ebenfalls lokal eingebunden
  data/processed/*.json    vorberechnete Stationsdaten, die die Seite zur Laufzeit lädt

data/raw/                 rohe DWD-Stationsdateien, für Nachvollziehbarkeit (werden nicht an den Browser ausgeliefert)
scripts/
  fetch_data.py            lädt Rohdaten + Stationsmetadaten für die 2 Stationen herunter
  build_data.py            erzeugt daraus public/data/processed/*.json
```

Es gibt keinen clientseitigen Build-Schritt — `public/` ist reines
HTML/CSS/JS und wird unverändert auf GitLab Pages veröffentlicht.

## Lokale Vorschau

```bash
cd public
python3 -m http.server 8000
# http://localhost:8000 öffnen
```

## Daten aktualisieren

Nur nötig, um ein neueres Jahr DWD-Daten nachzuziehen. Benötigt
[uv](https://docs.astral.sh/uv/):

```bash
uv run scripts/fetch_data.py   # lädt rohe Stationsdateien nach data/raw/
uv run scripts/build_data.py   # baut public/data/processed/*.json neu
```

Anschließend die geänderten Dateien unter `data/raw/` und
`public/data/processed/` committen — die Daten sind Teil des Repos und werden
nicht live von der Seite nachgeladen.

## Deployment auf GitLab Pages

Push auf den Default-Branch; `.gitlab-ci.yml` definiert einen `pages`-Job,
der `public/` unverändert veröffentlicht (kein Build-Schritt nötig). GitLab
Pages übernimmt das automatisch, sobald CI/CD für das Projekt aktiviert ist.
