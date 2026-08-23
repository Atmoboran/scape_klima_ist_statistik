"""Download raw DWD daily climate data for the exhibit's three stations.

Adapted from the original notebook (kopie_von_temp_spagettiplot.py): reuses the
same download-and-extract approach, extended to loop over multiple stations and
to also pull the DWD station description file so we get human-readable names,
location, and elevation for each station.

Run once (or whenever the bundled data should be refreshed):

    uv run scripts/fetch_data.py
"""

from __future__ import annotations

import json
import os
import zipfile
from pathlib import Path

import requests

BASE_URL = (
    "https://opendata.dwd.de/climate_environment/CDC/observations_germany/"
    "climate/daily/kl/historical/"
)
STATIONS_META_FILE = "KL_Tageswerte_Beschreibung_Stationen.txt"

REPO_ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = REPO_ROOT / "data" / "raw"

STATION_IDS = ["01420", "02601"]


def download_and_extract_station_data(station_id: str, save_dir: Path) -> Path:
    save_dir.mkdir(parents=True, exist_ok=True)

    print(f"Fetching file list for station {station_id}...")
    response = requests.get(BASE_URL, timeout=60)
    response.raise_for_status()

    from bs4 import BeautifulSoup

    soup = BeautifulSoup(response.text, "html.parser")
    files = [node.get("href") for node in soup.find_all("a")]
    station_file = next(
        (
            f
            for f in files
            if f and f.startswith(f"tageswerte_KL_{station_id}_") and f.endswith("_hist.zip")
        ),
        None,
    )
    if not station_file:
        raise RuntimeError(f"No matching file found for station ID {station_id}.")

    url = BASE_URL + station_file
    zip_path = save_dir / f"{station_id}.zip"
    print(f"Downloading data for station {station_id} from {url}...")
    response = requests.get(url, timeout=120)
    response.raise_for_status()
    zip_path.write_bytes(response.content)

    with zipfile.ZipFile(zip_path, "r") as zip_ref:
        target_file = next(
            (f for f in zip_ref.namelist() if f.startswith("produkt_klima_tag")), None
        )
        if not target_file:
            raise RuntimeError(
                f"Required file 'produkt_klima_tag*.txt' not found in {zip_path}."
            )
        zip_ref.extract(target_file, save_dir)
        extracted_path = save_dir / target_file
        # Normalize to a stable filename so build_data.py doesn't need to glob dates.
        stable_path = save_dir / f"produkt_klima_tag_{station_id}.txt"
        extracted_path.replace(stable_path)
        print(f"Extracted {target_file} -> {stable_path}")

    zip_path.unlink()
    return stable_path


def fetch_station_metadata(station_ids: list[str]) -> dict:
    print(f"Fetching station metadata file {STATIONS_META_FILE}...")
    response = requests.get(BASE_URL + STATIONS_META_FILE, timeout=60)
    response.raise_for_status()
    text = response.content.decode("latin-1")

    lines = text.splitlines()
    # Header row + a "---- ..." separator row precede the fixed-width data rows.
    data_lines = [ln for ln in lines[2:] if ln.strip()]

    wanted = set(station_ids)
    meta: dict[str, dict] = {}
    for line in data_lines:
        parts = line.split()
        station_id = parts[0].zfill(5)
        if station_id not in wanted:
            continue
        von_datum, bis_datum, hoehe = parts[1], parts[2], parts[3]
        lat, lon = parts[4], parts[5]
        # Name/Bundesland are free-text and may contain spaces; they sit between
        # the fixed numeric columns and the trailing "Frei"/"gesperrt" flag.
        rest = parts[6:-1]
        bundesland = rest[-1]
        name = " ".join(rest[:-1])
        meta[station_id] = {
            "station_id": station_id,
            "name": name,
            "bundesland": bundesland,
            "lat": float(lat),
            "lon": float(lon),
            "elevation_m": int(hoehe),
            "record_start": von_datum,
            "record_end": bis_datum,
        }

    missing = wanted - meta.keys()
    if missing:
        raise RuntimeError(f"Could not find metadata for stations: {sorted(missing)}")
    return meta


def main() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    meta = fetch_station_metadata(STATION_IDS)
    (RAW_DIR / "stations_meta.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"Wrote {RAW_DIR / 'stations_meta.json'}")

    for station_id in STATION_IDS:
        station_dir = RAW_DIR / station_id
        download_and_extract_station_data(station_id, station_dir)

    print("Done. Next step: uv run scripts/build_data.py")


if __name__ == "__main__":
    main()
