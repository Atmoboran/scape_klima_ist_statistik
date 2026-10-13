# SCAPE° — Klima ist Statistik

A browser-only exhibit with real station data from the Deutscher Wetterdienst
(DWD): one year of weather says little about the climate; only many years
together show the pattern and the shift.

Two parts, reachable from the buttons in the header:

1. **Tagesverlauf** (`docs/index.html`) – every available year of a station
   as one thin line (daily mean temperature, cumulative precipitation) or as
   monthly bars (sunshine), coloured by the deviation from the chosen
   reference period (1961–1990 or 1991–2020). A timeline with
   step buttons and a yellow "Abspielen" button runs through the years; a
   readout shows the year, its annual value and the deviation. Hovering or
   tapping the chart shows the record coldest/warmest day for that date. A
   comparison chart below puts both reference periods side by side.
2. **Klimatrend** (`docs/trend.html`) – annual bars with a 10-year moving
   average, or the distribution of daily values (bell curve) of one year
   against the reference period, for the whole year or one season, with its
   own timeline.

Each part has tasks that unlock its "Merke" box:

- Tagesverlauf: find a year colder than the reference period (temperature,
  picked with the slider/step buttons/stop); switch the reference period to
  1991–2020; choose another station.
- Klimatrend: find the warmest year by hovering/tapping the bars
  (temperature); in the distribution view, look at a year before 1970 and
  one after 2010.

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
  index.html             part 1 "Tagesverlauf" (structure only, data-t placeholders)
  trend.html             part 2 "Klimatrend"
  css/kit.css            shared SCAPE° components (same in every app)
  css/app.css            layout of this app
  js/view.js             phone/desktop layout switch (loaded in <head>)
  js/texts.js            fills the texts from content/
  js/brand.js            fills logo and footer line from the theme
  js/kit.js              fullscreen button, hint badge, info notes, tasks/Merke, kiosk mode
  js/shared.js           number format, data loading, station picker, notes, play button
  js/variable-config.js  behaviour per quantity (axes, units, chart type)
  js/main.js             part 1: pickers, readout, timeline, tasks, comparison chart
  js/trend.js            part 2: annual bars / distribution, seasons, timeline, tasks
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

Phone: pickers and readout, the chart at full width, timeline, reference
period, tasks, Merke; comparison and topics below. Desktop (automatic from
1000 px, or via the "Desktop-/Handy-Ansicht" toggle, remembered for this app
only): the chart on the left (a wide stage – time series), sized to the
screen and sticky; pickers, readout, timeline, reference period and tasks on
the right; comparison and topics full width below. Every chart has a
fullscreen button.

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
