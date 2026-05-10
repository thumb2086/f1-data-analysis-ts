#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "raw"
WEB_DATA_DIR = ROOT / "apps" / "web" / "public" / "data"
CACHE_DIR = ROOT / ".fastf1-cache"


def normalize_timedelta_columns(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    for col in out.columns:
        if pd.api.types.is_timedelta64_dtype(out[col]):
            out[col] = out[col].astype(str)
        elif pd.api.types.is_datetime64_any_dtype(out[col]):
            out[col] = out[col].astype(str)
    return out


def write_csv_to_both(df: pd.DataFrame, filename: str) -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    WEB_DATA_DIR.mkdir(parents=True, exist_ok=True)
    clean = normalize_timedelta_columns(df)
    clean.to_csv(RAW_DIR / filename, index=False)
    clean.to_csv(WEB_DATA_DIR / filename, index=False)


def download_fastf1_data(year: int, event: str, session_name: str) -> list[str]:
    try:
        import fastf1
    except ModuleNotFoundError as exc:
        raise SystemExit(
            "FastF1 is not installed. Run: python3 -m pip install fastf1"
        ) from exc

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    fastf1.Cache.enable_cache(str(CACHE_DIR))

    session = fastf1.get_session(year, event, session_name)
    session.load(laps=True, telemetry=True, weather=True, messages=True)

    write_csv_to_both(session.laps, "laps.csv")
    write_csv_to_both(session.results, "results.csv")
    write_csv_to_both(session.weather_data, "weather.csv")

    if session.race_control_messages is not None:
        write_csv_to_both(session.race_control_messages, "race_control.csv")

    if session.laps is None or session.laps.empty:
        raise SystemExit("No laps were loaded from FastF1.")

    stints = session.laps[["DriverNumber", "Stint", "LapNumber", "Compound", "TyreLife"]].dropna(
        subset=["DriverNumber", "Stint", "LapNumber"]
    )
    if not stints.empty:
        stint_rows = []
        for (driver_number, stint_number), group in stints.groupby(["DriverNumber", "Stint"]):
            group = group.sort_values("LapNumber")
            stint_rows.append(
                {
                    "driver_number": int(driver_number),
                    "stint_number": int(stint_number),
                    "lap_start": int(group["LapNumber"].min()),
                    "lap_end": int(group["LapNumber"].max()),
                    "compound": group["Compound"].dropna().iloc[-1] if not group["Compound"].dropna().empty else "",
                    "tyre_age_at_start": group["TyreLife"].dropna().iloc[0] if not group["TyreLife"].dropna().empty else 0,
                }
            )
        write_csv_to_both(pd.DataFrame(stint_rows), "stints.csv")

    drivers: list[str] = []
    location_rows: list[dict[str, int | float | str]] = []

    for driver in sorted(session.laps["Driver"].dropna().unique()):
        driver_laps = session.laps.pick_drivers(driver)
        accurate = driver_laps[driver_laps["IsAccurate"] == True]  # noqa: E712
        candidates = accurate if not accurate.empty else driver_laps
        if candidates.empty:
            continue

        lap = candidates.pick_fastest()
        if lap is None:
            continue

        telemetry = lap.get_car_data().add_distance()
        if telemetry.empty:
            continue

        pos = lap.get_pos_data()
        if not pos.empty:
            telemetry = telemetry.merge_channels(pos, frequency="original")

        if "Distance" in telemetry.columns and telemetry["Distance"].max() > 0:
            telemetry["RelativeDistance"] = telemetry["Distance"] / telemetry["Distance"].max()
        else:
            telemetry["RelativeDistance"] = 0

        write_csv_to_both(telemetry, f"telemetry_{driver}.csv")
        drivers.append(driver)

        if {"X", "Y"}.issubset(telemetry.columns):
            sampled = telemetry.dropna(subset=["X", "Y"]).iloc[:: max(1, len(telemetry) // 240)]
            for t, (_, row) in enumerate(sampled.iterrows()):
                location_rows.append({"t": t, "driver": driver, "x": row["X"], "y": row["Y"]})

    if location_rows:
        write_csv_to_both(pd.DataFrame(location_rows), "locations.csv")

    manifest = {"drivers": drivers}
    for dest in (RAW_DIR, WEB_DATA_DIR):
        (dest / "telemetry_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    schedule_src = RAW_DIR / f"schedule_{year}.csv"
    if schedule_src.exists():
        shutil.copy2(schedule_src, WEB_DATA_DIR / schedule_src.name)

    return drivers


def main() -> None:
    parser = argparse.ArgumentParser(description="Download FastF1 CSV data for the web app.")
    parser.add_argument("--year", type=int, default=2024)
    parser.add_argument("--event", default="Italian Grand Prix")
    parser.add_argument("--session", default="R")
    args = parser.parse_args()

    drivers = download_fastf1_data(args.year, args.event, args.session)
    print(f"Exported telemetry for {len(drivers)} drivers: {', '.join(drivers)}")


if __name__ == "__main__":
    main()
