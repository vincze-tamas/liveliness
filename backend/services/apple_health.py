"""Parse Apple Health export.xml (or the zip archive containing it)."""
from __future__ import annotations

import datetime
import io
import zipfile
from typing import Any
from xml.etree import ElementTree as ET

# Maps HealthKit quantity type identifiers to our HealthMetrics field names
QUANTITY_TYPES: dict[str, str] = {
    "HKQuantityTypeIdentifierHeartRateVariabilitySDNN": "hrv_ms",
    "HKQuantityTypeIdentifierRestingHeartRate": "resting_hr",
    "HKQuantityTypeIdentifierBodyMass": "weight_kg",
    "HKQuantityTypeIdentifierStepCount": "steps",
    "HKQuantityTypeIdentifierActiveEnergyBurned": "active_energy_kcal",
    "HKQuantityTypeIdentifierOxygenSaturation": "blood_oxygen_pct",
}

# Sleep stage values that count toward "asleep" time
SLEEP_ASLEEP_VALUES = {
    "HKCategoryValueSleepAnalysisAsleep",
    "HKCategoryValueSleepAnalysisAsleepCore",
    "HKCategoryValueSleepAnalysisAsleepDeep",
    "HKCategoryValueSleepAnalysisAsleepREM",
}

# Maps HKWorkoutActivityType strings to our internal sport slugs
WORKOUT_SPORT_MAP: dict[str, str] = {
    "HKWorkoutActivityTypeRunning": "trail_run",
    "HKWorkoutActivityTypeTrailRunning": "trail_run",
    "HKWorkoutActivityTypeCrossCountryRunning": "trail_run",
    "HKWorkoutActivityTypeCycling": "road_bike",
    "HKWorkoutActivityTypeMountainBiking": "mtb",
    "HKWorkoutActivityTypeDownhillSkiing": "ski_alpine",
    "HKWorkoutActivityTypeCrossCountrySkiing": "ski_xc",
    "HKWorkoutActivityTypeBackcountrySkiing": "ski_alpine",
    "HKWorkoutActivityTypeSnowboarding": "ski_alpine",
    "HKWorkoutActivityTypeSkating": "inline_skate",
    "HKWorkoutActivityTypeRollerSkating": "inline_skate",
    "HKWorkoutActivityTypeTraditionalStrengthTraining": "gym",
    "HKWorkoutActivityTypeFunctionalStrengthTraining": "gym",
    "HKWorkoutActivityTypeSwimming": "swim",
    "HKWorkoutActivityTypeHiking": "hike",
    "HKWorkoutActivityTypeWalking": "walk",
}


def _parse_date(date_str: str) -> datetime.date:
    """Parse Apple Health date string like '2024-01-15 08:30:00 +0100'."""
    return datetime.datetime.strptime(date_str[:10], "%Y-%m-%d").date()


def _parse_datetime(date_str: str) -> datetime.datetime:
    """Parse Apple Health datetime string, discarding timezone for local naive."""
    return datetime.datetime.strptime(date_str[:19], "%Y-%m-%d %H:%M:%S")


def _to_float(val: str | None) -> float | None:
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def parse_export_bytes(
    data: bytes,
) -> tuple[dict[datetime.date, dict[str, Any]], list[dict[str, Any]]]:
    """Parse raw bytes of an Apple Health export (ZIP or XML).

    Returns:
        daily_metrics: {date: {field_name: value}} — one entry per day
        workouts:      list of workout dicts ready for Activity insertion
    """
    # If it's a ZIP archive, extract export.xml from it
    if data[:2] == b"PK":
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            xml_name = next(
                (n for n in zf.namelist() if n.endswith("export.xml")), None
            )
            if xml_name is None:
                raise ValueError("No export.xml found inside ZIP archive")
            data = zf.read(xml_name)

    daily_metrics: dict[datetime.date, dict[str, Any]] = {}
    sleep_intervals: dict[datetime.date, float] = {}  # date -> accumulated hours
    workouts: list[dict[str, Any]] = []

    for _event, elem in ET.iterparse(io.BytesIO(data), events=("end",)):
        tag = elem.tag

        if tag == "Record":
            record_type = elem.get("type", "")
            field = QUANTITY_TYPES.get(record_type)

            if field:
                raw = _to_float(elem.get("value"))
                if raw is not None:
                    try:
                        date = _parse_date(elem.get("startDate", ""))
                    except ValueError:
                        elem.clear()
                        continue

                    unit = elem.get("unit", "")

                    # Unit conversions
                    if field == "weight_kg" and unit in ("lb", "lbs"):
                        raw = raw * 0.453592
                    elif field == "blood_oxygen_pct" and raw <= 1.0:
                        raw = raw * 100.0  # fraction → percentage
                    elif field == "resting_hr":
                        raw = int(round(raw))
                    elif field == "steps":
                        raw = int(round(raw))

                    if date not in daily_metrics:
                        daily_metrics[date] = {}

                    # HRV: keep the single lowest reading (most conservative)
                    if field == "hrv_ms":
                        existing = daily_metrics[date].get(field)
                        if existing is None or raw < existing:
                            daily_metrics[date][field] = raw
                    else:
                        daily_metrics[date][field] = raw

            elif record_type == "HKCategoryTypeIdentifierSleepAnalysis":
                value = elem.get("value", "")
                if value in SLEEP_ASLEEP_VALUES:
                    try:
                        start = _parse_datetime(elem.get("startDate", ""))
                        end = _parse_datetime(elem.get("endDate", ""))
                        hours = (end - start).total_seconds() / 3600.0
                        date = start.date()
                        sleep_intervals[date] = sleep_intervals.get(date, 0.0) + hours
                    except (ValueError, KeyError):
                        pass

            elem.clear()

        elif tag == "Workout":
            w_type = elem.get("workoutActivityType", "")
            sport = WORKOUT_SPORT_MAP.get(w_type, "other")
            try:
                start = _parse_datetime(elem.get("startDate", ""))
                # duration is in minutes in the XML
                dur_str = elem.get("duration")
                duration_s = int(float(dur_str) * 60) if dur_str else None

                dist = _to_float(elem.get("totalDistance"))
                dist_unit = elem.get("totalDistanceUnit", "km")
                if dist is not None:
                    dist = dist * (1609.344 if dist_unit in ("mi", "mile") else 1000.0)

                energy = _to_float(elem.get("totalEnergyBurned"))

                workouts.append(
                    {
                        "sport": sport,
                        "start_time": start,
                        "duration_s": duration_s,
                        "distance_m": dist,
                        "energy_kcal": energy,
                        "external_id": f"apple_{start.isoformat()}",
                    }
                )
            except (ValueError, TypeError):
                pass
            elem.clear()

    # Merge accumulated sleep hours into daily_metrics
    for date, hours in sleep_intervals.items():
        if date not in daily_metrics:
            daily_metrics[date] = {}
        daily_metrics[date]["sleep_hours"] = round(hours, 2)

    return daily_metrics, workouts
