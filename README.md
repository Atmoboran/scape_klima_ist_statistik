# SCAPE° — Klima ist Statistik

A browser-only exhibit with real station data from the Deutscher Wetterdienst
(DWD): one year of weather says little about the climate; only many years
together show the pattern and the shift.

One page (`docs/index.html`) with three views of the same data, switched by
the numbered buttons in the header. The view is part of the address
(`#verlauf`, `#haeufigkeit`, `#trend`), so each can be linked directly; the
old `trend.html` forwards to `index.html#trend`.

1. **Verlauf** – "Wie ist ein Jahr Tag für Tag verlaufen?" Every available
   year of a station as one thin line (daily mean temperature, cumulative
   precipitation) or as monthly bars (sunshine), coloured by the deviation
   from the reference period. Hovering or tapping shows the record
   coldest/warmest day for that date.
2. **Häufigkeit** – "Wie oft gab es welche Tageswerte?" The distribution of
   the daily values of one year (bell curve) against the reference period.
3. **Trend** – "Wie verändern sich die Jahre?" One bar per year with a
   10-year moving average. The y-axis starts at the lowest value of all
   stations (`data/processed/annual_ranges.json`, written by
   `build_data.py`), rounded down – the same floor at every station, not 0.
   The year on the timeline has a black outline; tapping a bar picks it.

Shared by all three views: variable, station and reference period (1961–1990
or 1991–2020), a season filter (Jahr / Winter / Frühling / Sommer / Herbst;
winter = the December before plus January and February), one year timeline
with back / play / forward, and the readout (year, value and deviation of
the chosen season, e.g. "Sommermittel"). In Verlauf the months outside the
season are greyed out. Seasonal values and reference means are computed in
the browser from the daily data (`KIS.seasons` in `js/shared.js`).

A tasks button opens a dialog with six questions about Frankfurt/Main
(deviation of 2003, warmest and coldest year, how many of the last ten
years were warmer than 1961–1990, how much warmer 1991–2020 was, the
precipitation total of 2018); each has an answer field and a "Prüfen"
button, and a wrong answer shows a tip naming the view that helps. The
right answers are computed from the data (`setupQuiz` in `js/main.js`), the
wording sits in `quiz` and `tasks` in `content/texts.de.js`.

The comparison chart of both reference periods sits inside the topic "Was
hat das mit dem Klimawandel zu tun?" (drawn when the topic is opened).
Longer explanations (what the chart shows, how the values are computed, what
this has to do with climate change) sit in collapsible topics below; info
buttons next to the pickers and the reference period open short notes.

18 DWD stations are included (Frankfurt/Main is the default).

Data: [DWD Climate Data Center](https://opendata.dwd.de/climate_environment/CDC/observations_germany/climate/daily/kl/historical/), daily values, CC BY 4.0.

## Run

The site is the `docs/` folder (no build step). The station data are JSON
files that the page loads at runtime, so it needs a web server – GitHub Pages
or any static server:

```bash
cd docs
python3 -m http.server 8000
# open http://localhost:8000
```

Opened by double-click (`file://`) the browser refuses to load the data; the
page then says so in the chart area.

URL switches for staff:

- `?kiosk` – exhibit mode: back to the start after 3 minutes without touch.

There is no staff/dev panel.

## Files

```
docs/
  index.html             the page with the three views (structure only, data-t placeholders)
  trend.html             forwards the old address to index.html#trend
  css/kit.css            shared SCAPE° components (same in every app)
  css/app.css            layout of this app
  js/view.js             phone/desktop layout switch (loaded in <head>)
  js/texts.js            fills the texts from content/
  js/brand.js            fills logo and footer line from the theme
  js/kit.js              fullscreen button, info notes, kiosk mode (hint badge and tasks/Merke unused here)
  js/shared.js           number format, data loading, pickers, notes, play button, seasons, tasks
  js/variable-config.js  behaviour per quantity (axes, units, chart type)
  js/main.js             views, pickers, seasons, readout, timeline, tasks dialog, comparison chart
  js/*-plot.js           the individual D3 charts
  js/vendor/d3.v7.min.js D3, self-hosted
  content/texts.de.js    every visible text (edit or translate here)
  theme/                 the design: font, palette, logo, colours (see theme/README.md)
  data/processed/*.json  pre-computed station data loaded at runtime
data/raw/                raw DWD station files (not published)
scripts/
  fetch_data.py          downloads raw data and station metadata
  build_data.py          builds docs/data/processed/*.json
```

## Layout

Kept compact so the chart gets the most room. Phone: the logo with the view
toggle, below it the three view buttons; variable, station and reference
period as three dropdowns in one row, the season buttons, the readout in
one line, the view's question, then the chart with the legend and the
fullscreen button in its top-right corner, and under it one row with back /
play / forward (the play button glows until the first touch) and the year
slider, and a button for the tasks dialog; topics below. Desktop (automatic
from 1000 px, or via the "Desktop-/Handy-Ansicht" toggle, remembered for
this app only): the chart on the left, sized to the screen and sticky;
pickers, seasons, readout and tasks on the right; topics full width below.
Chart explanations live in the topic "Was sehe ich auf dem Diagramm?" and
follow the view and season.

## Updating the data

Only needed to add a newer year of DWD data. Requires
[uv](https://docs.astral.sh/uv/):

```bash
uv run scripts/fetch_data.py   # raw station files into data/raw/
uv run scripts/build_data.py   # rebuilds docs/data/processed/*.json
```

Then commit the changed files under `data/raw/` and `docs/data/processed/`.

## Deployment on GitHub Pages

Settings → Pages → Build and deployment → Source: "Deploy from a branch",
branch `main`, folder `/docs`. Every push to `main` then publishes `docs/`.

## Adapting

Design: `docs/theme/` only (chart colours in `THEME.klimastatistik`).
Texts: `docs/content/texts.de.js` only (lines marked `LOCAL` refer to the
region or the station set; the default station is `KIS.DEFAULT_STATION_ID`
in `js/shared.js`). Founders Grotesk is used when installed, otherwise the
system fallback. When colour names appear in texts ("wärmer (rot)"), change
them together with the colours.
