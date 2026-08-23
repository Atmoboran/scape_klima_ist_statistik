"""Turn the raw DWD daily station files into the compact JSON the website reads.

For each station this produces: one 365-day temperature series per year (for
the year-by-year overlay chart), that year's annual mean temperature (for the
colour scale and the deviation readout), cross-year day statistics (for the
hover tooltip), and the two official DWD/WMO climate reference periods
(1961-1990 and 1991-2020) used to draw two climate-mean reference lines and
the "Klimavergleich" panel.

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

STATION_IDS = ["01420", "02601"]
# The two official DWD/WMO climate reference periods ("Klimareferenzperioden").
PERIOD_A = (1961, 1990)
PERIOD_B = (1991, 2020)
MIN_VALID_DAYS_FOR_YEAR = 300  # a year needs this many valid TMK days to count


def load_station_frame(station_id: str) -> pd.DataFrame:
    path = RAW_DIR / station_id / f"produkt_klima_tag_{station_id}.txt"
    df = pd.read_csv(path, sep=";")
    df.columns = df.columns.str.strip()
    df["MESS_DATUM"] = pd.to_datetime(df["MESS_DATUM"], format="%Y%m%d")

    df["TMK"] = df["TMK"].replace(-999.0, np.nan).replace(-999, np.nan)
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


def build_year_strands(df: pd.DataFrame) -> tuple[dict[str, list[float | None]], dict[str, float]]:
    strands: dict[str, list[float | None]] = {}
    annual_mean_temp: dict[str, float] = {}

    for year, group in df.groupby("year"):
        series = [None] * 365
        for _, row in group.iterrows():
            doy = int(row["aligned_doy"])
            if 1 <= doy <= 365 and pd.notna(row["TMK"]):
                series[doy - 1] = round(float(row["TMK"]), 1)
        strands[str(int(year))] = series

        valid = group["TMK"].dropna()
        if len(valid) >= MIN_VALID_DAYS_FOR_YEAR:
            annual_mean_temp[str(int(year))] = round(float(valid.mean()), 2)

    return strands, annual_mean_temp


def build_by_day_stats(df: pd.DataFrame) -> list[dict]:
    stats = []
    for doy in range(1, 366):
        day_rows = df[(df["aligned_doy"] == doy) & df["TMK"].notna()]
        if day_rows.empty:
            stats.append({"doy": doy, "mean": None, "min": None, "minYear": None, "max": None, "maxYear": None})
            continue
        min_row = day_rows.loc[day_rows["TMK"].idxmin()]
        max_row = day_rows.loc[day_rows["TMK"].idxmax()]
        stats.append(
            {
                "doy": doy,
                "mean": round(float(day_rows["TMK"].mean()), 1),
                "min": round(float(min_row["TMK"]), 1),
                "minYear": int(min_row["year"]),
                "max": round(float(max_row["TMK"]), 1),
                "maxYear": int(max_row["year"]),
            }
        )
    return stats


def series_365(s: pd.Series) -> list[float | None]:
    out = [None] * 365
    for doy, value in s.items():
        if 1 <= int(doy) <= 365 and pd.notna(value):
            out[int(doy) - 1] = round(float(value), 1)
    return out


def build_period(df: pd.DataFrame, start: int, end: int) -> dict:
    period_df = df[(df["year"] >= start) & (df["year"] <= end)]
    daily_temp = period_df.groupby("aligned_doy")["TMK"].mean()
    annual_means = period_df.groupby("year")["TMK"].mean()
    return {
        "start": start,
        "end": end,
        "daily_mean_temperature": series_365(daily_temp),
        "mean_annual_temperature": round(float(annual_means.mean()), 2),
    }


def build_comparison_periods(df: pd.DataFrame, first_year: int, last_year: int) -> tuple[dict, dict]:
    def clip(period: tuple[int, int]) -> tuple[int, int]:
        start, end = period
        return max(start, first_year), min(end, last_year)

    return (
        build_period(df, *clip(PERIOD_A)),
        build_period(df, *clip(PERIOD_B)),
    )


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    stations_meta = json.loads((RAW_DIR / "stations_meta.json").read_text(encoding="utf-8"))

    index = []
    for station_id in STATION_IDS:
        print(f"Building {station_id}...")
        df = load_station_frame(station_id)
        strands, annual_mean_temp = build_year_strands(df)
        by_day_stats = build_by_day_stats(df)

        years_with_strands = sorted(int(y) for y in strands.keys())
        first_year, last_year = years_with_strands[0], years_with_strands[-1]
        period_a, period_b = build_comparison_periods(df, first_year, last_year)

        meta = stations_meta[station_id]
        payload = {
            "meta": {**meta, "first_year": first_year, "last_year": last_year},
            "years": years_with_strands,
            "strands": strands,
            "annual_mean_temp": annual_mean_temp,
            "by_day_stats": by_day_stats,
            "period_a": period_a,
            "period_b": period_b,
        }

        out_path = OUT_DIR / f"{station_id}.json"
        out_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        size_kb = out_path.stat().st_size / 1024
        print(
            f"  wrote {out_path} ({size_kb:.0f} KB, {len(years_with_strands)} years, "
            f"period A {period_a['start']}-{period_a['end']}, period B {period_b['start']}-{period_b['end']})"
        )

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
