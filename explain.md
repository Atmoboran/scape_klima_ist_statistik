# Wie diese Website entstanden ist

Dieses Dokument erklärt den Aufbau von **Klima ist Statistik** technisch: welche
Sprachen, Bibliotheken und Werkzeuge verwendet werden, wie die Daten von den
DWD-Rohdaten bis zum fertigen Diagramm fließen, und warum die Seite so
strukturiert ist, wie sie ist. Für "wie starte ich das lokal" siehe
[README.md](README.md) — dieses Dokument beschreibt das *Warum* und *Wie es
zusammenspielt*.

## Grundidee

Das Projekt hat zwei komplett getrennte Hälften, die nur über JSON-Dateien
miteinander sprechen:

1. **Datenpipeline** (Python, läuft nur bei Bedarf auf dem eigenen Rechner) —
   lädt DWD-Messdaten herunter und rechnet sie zu kompakten JSON-Dateien um.
2. **Website** (HTML/CSS/JavaScript, läuft im Browser der Besucher:innen) —
   liest diese fertigen JSON-Dateien und zeichnet das interaktive Diagramm.

Es gibt **keinen Server, der zur Laufzeit irgendetwas berechnet**. Alles, was
im Browser erscheint, wurde vorher einmal von den Python-Skripten ausgerechnet
und als statische Datei abgelegt. Das macht die Seite schnell, funktioniert
komplett offline (wichtig für ein Museums-Exponat mit unzuverlässigem WLAN),
und lässt sich als reine statische Website hosten (GitHub Pages) — ohne
Backend, ohne Datenbank, ohne laufende Server-Kosten.

## Sprachen & Werkzeuge im Überblick

| Bereich | Sprache / Werkzeug | Wofür |
|---|---|---|
| Datenpipeline | **Python 3.12** | Rohdaten laden, bereinigen, zu JSON verdichten |
| Python-Umgebung | **[uv](https://docs.astral.sh/uv/)** | verwaltet die Python-Version + Abhängigkeiten (`pyproject.toml`, `uv.lock`) — kein globales `pip install` nötig |
| Website-Struktur | **HTML5** | `docs/index.html` — die eine Seite der ganzen Website |
| Website-Gestaltung | **CSS3** | `docs/css/style.css` — Layout, Farben, Responsive-Verhalten |
| Website-Logik | **JavaScript (Vanilla, ES6+)** | `docs/js/*.js` — lädt Daten, zeichnet das Diagramm, reagiert auf Klicks/Touch |
| Diagramm-Bibliothek | **[D3.js v7](https://d3js.org/)** | Achsen, Linien, Flächen, Farbverläufe im SVG |
| Schriftart | **[Jost](https://fonts.google.com/specimen/Jost)** (variabel, freie Google-Font) | angelehnt an die SCAPE°-Hausschrift Founders Grotesk |
| Hosting | **GitHub Pages** | liefert den Ordner `docs/` unverändert als Website aus |

Es gibt bewusst **kein** Node.js, kein npm, keinen JavaScript-Build-Schritt
(kein Webpack/Vite/etc.) und kein Frontend-Framework (kein React/Vue/etc.).
Die Website ist so einfach gehalten, dass sie in zehn Jahren noch genauso
funktioniert, ohne dass jemand Abhängigkeiten aktualisieren oder einen
Build reparieren muss — wichtig für ein Exponat, das lange unbeaufsichtigt
läuft.

## Teil 1: Die Datenpipeline (Python)

Läuft **nicht** im Browser, sondern einmalig auf dem Rechner der
Betreuer:innen, wenn neue Daten eingebunden werden sollen.

### Abhängigkeiten (`pyproject.toml`)

| Paket | Wofür |
|---|---|
| [`pandas`](https://pandas.pydata.org/) | Tabellen (DataFrames) für die täglichen Messwerte; Gruppierungen nach Jahr/Kalendertag |
| [`numpy`](https://numpy.org/) | `NaN`-Werte für fehlerhafte Messwerte (DWD markiert diese mit `-999`) |
| [`requests`](https://requests.readthedocs.io/) | HTTP-Downloads von `opendata.dwd.de` |
| [`beautifulsoup4`](https://www.crummy.com/software/BeautifulSoup/) | Parsen der Verzeichnis-Auflistung von DWD (um den aktuellen Dateinamen der Stations-ZIP-Datei zu finden) |

`uv` lädt beim ersten `uv run ...` automatisch Python 3.12 (falls nicht
vorhanden) und installiert diese Pakete in ein `.venv/`, gesteuert über
`pyproject.toml` und mit exakten Versionen in `uv.lock` festgehalten.

### `scripts/fetch_data.py`

1. Lädt `KL_Tageswerte_Beschreibung_Stationen.txt` von DWD — eine
   Textdatei mit fester Spaltenbreite, die zu jeder Stations-ID Name,
   Bundesland, Koordinaten und Höhe auflistet. Daraus entstehen die
   Stationsnamen, die auf der Website erscheinen.
2. Lädt für jede Station (aktuell `01420` Frankfurt/Main und `02601`
   Kleiner Feldberg/Taunus) die passende `tageswerte_KL_<ID>_..._hist.zip`,
   entpackt die enthaltene `produkt_klima_tag_*.txt` und legt sie unter
   `data/raw/<ID>/` ab.

Ergebnis: rohe, unveränderte DWD-Tageswerte als `.txt`-Dateien
(Semikolon-getrennt) — das ist die Quelle, auf die sich alles andere bezieht.

### `scripts/build_data.py`

Verarbeitet die Rohdaten aus `data/raw/` zu dem, was die Website tatsächlich
lädt, und schreibt das Ergebnis nach `docs/data/processed/`:

1. **Bereinigung** — DWD markiert fehlende Messwerte mit `-999`; diese werden
   zu `NaN` (also "kein Wert") statt fälschlich in den Mittelwert
   einzufließen.
2. **Kalender-Ausrichtung** — der 29. Februar wird entfernt und alle Tage ab
   dem 1. März in Schaltjahren um eins zurückgeschoben, damit jedes Jahr auf
   eine einheitliche 365-Tage-Achse passt und die Linien exakt übereinander
   liegen (unabhängig von Schaltjahren oder davon, dass eine Station erst
   mitten im Jahr zu messen begann).
3. **Pro Jahr eine 365-Werte-Reihe** (`strands`) — das ist die Datengrundlage
   für die dünnen Linien im Hauptdiagramm.
4. **Jahresmittel pro Jahr** (`annual_mean_temp`) — bestimmt die Farbe jeder
   Linie (kälteres Jahr → Indigo, wärmeres Jahr → Rot) sowie die
   Abweichungs-Anzeige.
5. **Tagesstatistik über alle Jahre** (`by_day_stats`) — für jeden
   Kalendertag der kälteste/wärmste/durchschnittliche Wert über die gesamte
   Messreihe, inklusive Jahreszahl des Rekords. Das speist den Tooltip beim
   Fahren über das Diagramm.
6. **Zwei feste Klimareferenzperioden** (`period_a` = 1961–1990,
   `period_b` = 1991–2020 — die offiziellen DWD/WMO-Referenzperioden) —
   jeweils als eigene 365-Werte-Reihe plus Jahresmittel. Diese speisen die
   zwei gestrichelten Linien im Hauptdiagramm, den Vergleichs-Chart unten auf
   der Seite und die Abweichungs-Kennzahl (verglichen mit `period_a`).

Das Ergebnis pro Station ist eine einzelne, in sich geschlossene JSON-Datei
(z. B. `01420.json`, aktuell rund 200 KB), die alles enthält, was die Website
zum Zeichnen braucht — kein Nachladen einzelner Messwerte zur Laufzeit.

## Teil 2: Die Website (HTML/CSS/JS)

Alles unter `docs/` wird unverändert von GitHub Pages ausgeliefert. Der Name
`docs/` (statt z. B. `public/`) ist kein Zufall: GitHub Pages erlaubt im
Modus "Deploy from a branch" nur `/` (Repo-Wurzel) oder `/docs` als
Quellordner — alles außerhalb (`data/raw/`, `scripts/`) wird dadurch
automatisch **nicht** mit veröffentlicht.

### `docs/index.html`

Eine einzige HTML-Seite. Enthält:

- Ein winziges Inline-`<script>` im `<head>`, das **vor** dem Rendern
  entscheidet, ob die Seite in der Mobil- oder Desktop-Ansicht startet
  (siehe unten) — läuft bewusst so früh, damit man beim Laden nicht kurz die
  falsche Ansicht aufblitzen sieht.
- Den SCAPE°-Branding-Balken, Titel, Stations-Auswahl, das Diagramm, die
  Zeitleiste und den Vergleichs-Bereich als einfache HTML-Struktur.
- Drei `<script src="...">`-Einbindungen am Ende: D3.js, dann das
  Diagramm-Modul, dann die Seiten-Logik (Reihenfolge ist wichtig, da jede
  Datei auf der vorherigen aufbaut).

### `docs/css/style.css`

**Mobile-first** geschrieben: Die Basis-Regeln (ohne Bedingung) sind für
schmale Hochkant-Bildschirme optimiert (große Tippflächen, gestapeltes
Layout, kürzere Diagrammhöhe). Alle Regeln unter dem Selektor
`:root[data-view="desktop"] ...` überschreiben das für die geräumigere
Desktop-Ansicht. Welcher Modus aktiv ist, bestimmt nicht CSS allein, sondern
JavaScript (siehe unten) — das erlaubt sowohl automatische Erkennung als auch
einen manuellen Umschalt-Knopf.

Enthält außerdem eine `@font-face`-Regel, die die Jost-Schriftdatei aus
`docs/fonts/jost-latin.woff2` lädt (**lokal eingebunden, nicht von Google
Fonts nachgeladen** — wichtig, damit das Exponat auch ohne Internetzugang am
Ausstellungsort funktioniert).

### `docs/js/vendor/d3.v7.min.js`

[D3.js](https://d3js.org/) Version 7.9.0, unverändert von der offiziellen
Quelle heruntergeladen und im Repo abgelegt (**vendored**), statt es von
einem CDN nachzuladen — aus demselben Offline-Grund wie bei der Schriftart.
D3 übernimmt: Skalen (Datum → Pixel, Temperatur → Pixel), das Zeichnen der
SVG-Pfade für Linien und Flächen, die Achsenbeschriftung und den
Farbverlauf.

### `docs/js/spaghetti-plot.js`

Das eigentliche Diagramm-Modul, unabhängig von den Seiteninhalten drumherum.
Stellt zwei Funktionen nach außen bereit: `render(daten)` (zeichnet das
komplette Diagramm für eine Station neu) und `setYear(jahr)` (hebt eine
einzelne Jahres-Linie hervor). Zuständig für:

- Eine dünne Linie pro Jahr, eingefärbt nach dessen Jahresmittel
  (benutzerdefinierte Farbskala: Indigo → Sandton → Rot).
- Zwei gestrichelte Linien für die Klimareferenzperioden.
- Die rot/blau gefüllte Fläche zwischen der hervorgehobenen Jahres-Linie und
  der Referenzperiode 1961–1990 (macht die Abweichung sichtbar).
- Den Tooltip beim Fahren/Tippen über das Diagramm: bestimmt den nächsten
  Kalendertag zur Zeigerposition und zeigt dessen historische
  Extremwerte. Diese Interaktion verändert **nicht**, welches Jahr
  hervorgehoben ist — das steuert ausschließlich die Zeitleiste.
- Misst die tatsächliche Pixelgröße des SVG bei jedem Rendern neu (auch bei
  Fenster-Größenänderung), damit das Diagramm auf jeder Bildschirmgröße
  scharf und proportional bleibt, ganz ohne fixe Pixel-Maße.

### `docs/js/main.js`

Die Orchestrierung der restlichen Seite:

- Lädt `data/processed/stations_index.json`, baut daraus die
  Stations-Auswahl-Knöpfe.
- Lädt beim Stationswechsel die zugehörige `<ID>.json` und reicht sie an das
  Diagramm-Modul weiter.
- Zeichnet die Farbverlauf-Legende und die Perioden-Legende.
- Steuert Zeitleiste (Schieberegler + Abspiel-Knopf) und die große
  Abweichungs-Anzeige.
- Zeichnet den unteren Vergleichs-Chart (`period_a` vs. `period_b` mit
  eingefärbter Differenzfläche) direkt mit D3 — eigenständig vom
  Hauptdiagramm, da hier keine Interaktion nötig ist.
- Verwaltet die Mobil-/Desktop-Umschaltung: liest beim Start entweder eine
  gespeicherte Nutzer-Präferenz (`localStorage`) oder erkennt automatisch
  über `window.matchMedia("(max-width: 699px)")`, ob der Bildschirm schmal
  ist — **keine** unzuverlässige User-Agent-Erkennung. Der Umschalt-Knopf im
  Kopfbereich überschreibt das manuell und merkt sich die Wahl dauerhaft im
  Browser.

## Datenfluss auf einen Blick

```
opendata.dwd.de (Rohdaten)
        │  scripts/fetch_data.py
        ▼
data/raw/<Station>/produkt_klima_tag_*.txt   (unveränderte DWD-Tageswerte)
        │  scripts/build_data.py  (pandas/numpy: bereinigen, aggregieren)
        ▼
docs/data/processed/<Station>.json           (fertig berechnet, kompakt)
        │  fetch() im Browser
        ▼
docs/js/main.js  +  docs/js/spaghetti-plot.js  (D3.js zeichnet SVG)
        ▼
sichtbares, interaktives Diagramm im Browser der Besucher:innen
```

## Deployment

Kein Build-Schritt, keine CI/CD-Pipeline nötig. `git push` auf den
`main`-Branch reicht — GitHub Pages liest bei jedem Push automatisch den
aktuellen Stand von `docs/` neu ein (Einstellung: **Settings → Pages →
Source: "Deploy from a branch" → `main` / `/docs`**). Die Datei
`docs/.nojekyll` verhindert, dass GitHub die Seite fälschlich durch seine
Jekyll-Verarbeitung schickt (die für eine reine HTML/CSS/JS-Seite ohnehin
nichts tun würde, aber ohne diese Datei versucht GitHub es trotzdem).

## Warum diese Werkzeuge?

- **Kein JavaScript-Framework**: Die Seite hat genau eine Ansicht mit
  überschaubarer Interaktion — ein Framework wie React würde nur
  Komplexität und eine Build-Kette hinzufügen, ohne echten Nutzen.
- **D3.js statt einer fertigen Chart-Bibliothek** (z. B. Chart.js): Das
  Diagramm braucht sehr spezifisches Verhalten (89 individuell gefärbte
  Linien, zwei Referenzlinien, dynamische Flächenfüllung, Kalendertag-Achse)
  — D3 bietet die nötigen Bausteine (Skalen, Pfad-Generatoren), ohne
  Kompromisse einer High-Level-Bibliothek einzugehen.
- **Vendored statt CDN** (D3, Jost-Schrift): Das Exponat muss auch ohne
  verlässliches Internet am Ausstellungsort laufen.
- **Python + uv für die Datenpipeline**: Reine Datenverarbeitung
  (Tabellen, Aggregation) ist mit `pandas` deutlich knapper und lesbarer
  als in JavaScript; `uv` macht die Umgebung reproduzierbar, ohne dass
  Mitwirkende Python/`pip` manuell einrichten müssen.
- **Statische JSON-Dateien statt Live-API**: DWD-Daten ändern sich höchstens
  täglich, die Website wird potenziell von vielen Besucher:innen gleichzeitig
  aufgerufen — vorab berechnete, unveränderliche Dateien sind schneller,
  robuster und funktionieren offline, ohne dass irgendein Server am Laufen
  gehalten werden muss.
