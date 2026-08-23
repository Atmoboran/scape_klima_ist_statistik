"""Turn the raw DWD daily station files into the compact JSON the website reads.

For each station and each variable (temperature, precipitation) this produces
a self-contained JSON file with a generic shape so the frontend doesn't need
to know which variable it's rendering:

- `strands`: one 365-day series per year (temperature/sunshine: the daily
  value itself; precipitation: the *cumulative* sum by day-of-year, since raw
  daily rainfall is too spiky to read as an overlaid line chart the way daily
  mean temperature is - a running total gives a smooth, comparable curve
  instead).
- `annual_metric`: one number per year (temperature: annual mean; precipitation
  and sunshine: annual total) - drives the colour scale and the deviation
  readout. Only years with at least MIN_VALID_DAYS_FOR_YEAR valid readings get
  an entry here - a year with too many gaps (e.g. a station's early,
  sparsely-digitised sunshine records, or a station that only reported for
  part of a year) is excluded rather than silently averaged/summed in as if
  it were complete, since that would quietly bias precisely the statistics
  (climate reference periods, day-of-year records) meant to describe "normal".
- `by_day_stats`: cross-year min/mean/max at each day-of-year, computed only
  from years present in `annual_metric` (see above) - so an incomplete year
  can never masquerade as a record.
- `period_a` / `period_b`: the two official DWD/WMO climate reference periods
  (1961-1990, 1991-2020), each with a `daily_series` (the period-averaged
  version of `strands`, again only over years present in `annual_metric`) and
  a `mean_annual_metric` scalar.

Run after scripts/fetch_data.py:

    uv run scripts/build_data.py
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = REPO_ROOT / "data" / "raw"
OUT_DIR = REPO_ROOT / "docs" / "data" / "processed"

STATION_IDS = [
    "01420",  # Frankfurt/Main
    "02601",  # Kleiner Feldberg/Taunus
    "00433",  # Berlin-Tempelhof
    "03987",  # Potsdam
    "01975",  # Hamburg-Fuhlsbuettel
    "03379",  # Muenchen-Stadt
    "02290",  # Hohenpeissenberg
    "02968",  # Koeln-Stammheim
    "04928",  # Stuttgart (Schnarrenberg)
    "01078",  # Duesseldorf
    "02928",  # Leipzig-Holzhausen
    "02932",  # Leipzig/Halle
    "00555",  # Bochum
    "01303",  # Essen-Bredeney
    "00691",  # Bremen
    "01048",  # Dresden-Klotzsche
    "02014",  # Hannover
    "03668",  # Nuernberg
]

# The two official DWD/WMO climate reference periods ("Klimareferenzperioden").
PERIOD_A = (1961, 1990)
PERIOD_B = (1991, 2020)
MIN_VALID_DAYS_FOR_YEAR = 300  # a year needs this many valid readings to count

VARIABLES = {
    "temperature": {
        "column": "TMK",
        "strand_mode": "raw",
        "annual_agg": "mean",
        "unit": "°C",
        "subdir": "temperature",
    },
    "precipitation": {
        "column": "RSK",
        "strand_mode": "cumulative",
        "annual_agg": "sum",
        "unit": "mm",
        "subdir": "precipitation",
    },
    "sunshine": {
        "column": "SDK",
        "strand_mode": "raw",
        "annual_agg": "sum",
        "unit": "h",
        "subdir": "sunshine",
    },
}


def load_station_frame(station_id: str) -> pd.DataFrame:
    path = RAW_DIR / station_id / f"produkt_klima_tag_{station_id}.txt"
    df = pd.read_csv(path, sep=";")
    df.columns = df.columns.str.strip()
    df["MESS_DATUM"] = pd.to_datetime(df["MESS_DATUM"], format="%Y%m%d")

    for spec in VARIABLES.values():
        col = spec["column"]
        df[col] = df[col].replace(-999.0, np.nan).replace(-999, np.nan)

    df["year"] = df["MESS_DATUM"].dt.year
    df["is_feb29"] = (df["MESS_DATUM"].dt.month == 2) & (df["MESS_DATUM"].dt.day == 29)

    # Align every year onto a common 365-day axis (1 = Jan 1, 365 = Dec 31) by
    # dropping Feb 29 and shifting everything from Mar 1 onward back by one day
    # in leap years, so strands overlay by calendar date regardless of leap
    # years or a year's data starting partway through.
    aligned = df[~df["is_feb29"]].copy()
    raw_doy = aligned["MESS_DATUM"].dt.dayofyear
    is_leap = aligned["MESS_DATUM"].dt.is_leap_year
    aligned["aligned_doy"] = raw_doy - ((is_leap & (raw_doy > 59)).astype(int))
    return aligned


def build_year_strands(
    df: pd.DataFrame, column: str, strand_mode: str, annual_agg: str
) -> tuple[dict[str, list[float | None]], dict[str, float]]:
    strands: dict[str, list[float | None]] = {}
    annual_metric: dict[str, float] = {}
    full_index = pd.RangeIndex(1, 366)

    for year, group in df.groupby("year"):
        daily = group.groupby("aligned_doy")[column].mean().reindex(full_index)
        valid_days = int(daily.notna().sum())

        if strand_mode == "cumulative":
            cum = daily.fillna(0.0).cumsum()
            series = [round(float(v), 1) for v in cum]
        else:
            series = [round(float(v), 1) if pd.notna(v) else None for v in daily]
        strands[str(int(year))] = series

        # A year with too many missing readings is excluded from every
        # aggregate stat below it (annual_metric, by_day_stats, the two
        # climate reference periods) - the strand itself still shows
        # whatever raw data exists, but it can't distort "normal".
        if valid_days >= MIN_VALID_DAYS_FOR_YEAR:
            metric = float(daily.sum()) if annual_agg == "sum" else float(daily.mean())
            annual_metric[str(int(year))] = round(metric, 1 if annual_agg == "sum" else 2)

    return strands, annual_metric


def build_by_day_stats(
    strands: dict[str, list[float | None]], complete_years: list[str]
) -> list[dict]:
    stats = []
    for doy in range(1, 366):
        i = doy - 1
        vals = [(y, strands[y][i]) for y in complete_years if strands[y][i] is not None]
        if not vals:
            stats.append({"doy": doy, "mean": None, "min": None, "minYear": None, "max": None, "maxYear": None})
            continue
        values_only = [v for _, v in vals]
        min_year, min_v = min(vals, key=lambda x: x[1])
        max_year, max_v = max(vals, key=lambda x: x[1])
        stats.append(
            {
                "doy": doy,
                "mean": round(sum(values_only) / len(values_only), 1),
                "min": round(min_v, 1),
                "minYear": int(min_year),
                "max": round(max_v, 1),
                "maxYear": int(max_year),
            }
        )
    return stats


def build_period(
    strands: dict[str, list[float | None]],
    annual_metric: dict[str, float],
    complete_years: list[str],
    start: int,
    end: int,
) -> dict:
    # Only years that passed the completeness bar (i.e. have an annual_metric
    # entry) contribute to a reference period - an incomplete year must not
    # pull the 30-year "normal" up or down.
    years_in_period = [y for y in complete_years if start <= int(y) <= end]

    daily_series: list[float | None] = []
    arrs = [strands[y] for y in years_in_period]
    for day_values in zip(*arrs) if arrs else []:
        present = [v for v in day_values if v is not None]
        daily_series.append(round(sum(present) / len(present), 1) if present else None)
    if not arrs:
        daily_series = [None] * 365

    totals = [annual_metric[y] for y in years_in_period]
    mean_annual_metric = round(sum(totals) / len(totals), 2) if totals else None

    return {"start": start, "end": end, "daily_series": daily_series, "mean_annual_metric": mean_annual_metric}


def clip(period: tuple[int, int], first_year: int, last_year: int) -> tuple[int, int]:
    start, end = period
    return max(start, first_year), min(end, last_year)


def build_variable_payload(
    df: pd.DataFrame,
    variable_key: str,
    spec: dict,
    meta: dict,
    years_all: list[str],
    first_year: int,
    last_year: int,
) -> dict:
    strands, annual_metric = build_year_strands(df, spec["column"], spec["strand_mode"], spec["annual_agg"])
    complete_years = [y for y in years_all if y in annual_metric]
    by_day_stats = build_by_day_stats(strands, complete_years)
    period_a = build_period(strands, annual_metric, complete_years, *clip(PERIOD_A, first_year, last_year))
    period_b = build_period(strands, annual_metric, complete_years, *clip(PERIOD_B, first_year, last_year))

    return {
        "meta": {**meta, "first_year": first_year, "last_year": last_year},
        "variable": variable_key,
        "unit": spec["unit"],
        "years": [int(y) for y in years_all],
        "strands": strands,
        "annual_metric": annual_metric,
        "by_day_stats": by_day_stats,
        "period_a": period_a,
        "period_b": period_b,
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    stations_meta = json.loads((RAW_DIR / "stations_meta.json").read_text(encoding="utf-8"))

    index = []
    for station_id in STATION_IDS:
        print(f"Building {station_id}...")
        df = load_station_frame(station_id)
        meta = stations_meta[station_id]

        years_all_int = sorted(int(y) for y in df["year"].unique())
        years_all = [str(y) for y in years_all_int]
        first_year, last_year = years_all_int[0], years_all_int[-1]

        for variable_key, spec in VARIABLES.items():
            payload = build_variable_payload(df, variable_key, spec, meta, years_all, first_year, last_year)
            out_dir = OUT_DIR / spec["subdir"]
            out_dir.mkdir(parents=True, exist_ok=True)
            out_path = out_dir / f"{station_id}.json"
            out_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
            size_kb = out_path.stat().st_size / 1024
            print(f"  {variable_key}: wrote {out_path} ({size_kb:.0f} KB)")

        index.append(
            {
                "station_id": station_id,
                "name": meta["name"],
                "bundesland": meta["bundesland"],
                "lat": meta["lat"],
                "lon": meta["lon"],
                "elevation_m": meta["elevation_m"],
                "first_year": first_year,
                "last_year": last_year,
            }
        )

    (OUT_DIR / "stations_index.json").write_text(
        json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"Wrote {OUT_DIR / 'stations_index.json'}")


if __name__ == "__main__":
    main()
