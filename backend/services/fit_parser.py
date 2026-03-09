"""Parse a Garmin .fit file and extract activity metrics."""
from __future__ import annotations

import datetime
import io
from typing import Any

# Maps FIT sport / sub_sport values to our internal sport slugs
SPORT_MAP: dict[str, str] = {
    "running": "trail_run",
    "trail_running": "trail_run",
    "cycling": "road_bike",
    "mountain_biking": "mtb",
    "gravel_cycling": "road_bike",
    "alpine_skiing": "ski_alpine",
    "backcountry_skiing": "ski_alpine",
    "cross_country_skiing": "ski_xc",
    "skate_skiing": "ski_xc",
    "snowboarding": "ski_alpine",
    "ice_skating": "inline_skate",
    "inline_skating": "inline_skate",
    "training": "gym",
    "strength_training": "gym",
    "swimming": "swim",
    "open_water": "swim",
    "hiking": "hike",
    "walking": "walk",
}


def parse_fit_records(data: bytes) -> dict[str, list[Any]]:
    """Parse raw .fit bytes and return time-series streams.

    Returns a dict with keys: ``time_s``, ``hr``, ``power``, ``altitude``,
    ``speed_kmh``, ``pace_s_per_km`` — each a list aligned by index.
    Only streams with at least one non-null value are included.
    """
    try:
        from fitparse import FitFile  # type: ignore[import-untyped]
    except ImportError:
        raise RuntimeError("fitparse package not installed")

    ff = FitFile(io.BytesIO(data))

    time_s: list[float] = []
    hr: list[int | None] = []
    power: list[float | None] = []
    altitude: list[float | None] = []
    speed_kmh: list[float | None] = []
    pace_s_per_km: list[float | None] = []

    start_ts: float | None = None

    for msg in ff.get_messages("record"):
        fields = {f.name: f.value for f in msg.fields if f.value is not None}

        ts = fields.get("timestamp")
        if not isinstance(ts, datetime.datetime):
            continue

        ts_epoch = ts.timestamp()
        if start_ts is None:
            start_ts = ts_epoch

        elapsed = ts_epoch - start_ts
        time_s.append(elapsed)

        hr.append(fields.get("heart_rate"))

        pwr = fields.get("power")
        power.append(float(pwr) if pwr is not None and int(pwr) != 0xFFFF else None)

        alt = fields.get("altitude") or fields.get("enhanced_altitude")
        altitude.append(float(alt) if alt is not None else None)

        spd = fields.get("speed") or fields.get("enhanced_speed")  # m/s
        if spd is not None:
            spd_f = float(spd)
            speed_kmh.append(round(spd_f * 3.6, 2))
            pace_s_per_km.append(round(1000.0 / spd_f, 1) if spd_f > 0.1 else None)
        else:
            speed_kmh.append(None)
            pace_s_per_km.append(None)

    if not time_s:
        return {}

    def _any(lst: list) -> bool:
        return any(v is not None for v in lst)

    result: dict[str, list[Any]] = {"time_s": time_s}
    if _any(hr):
        result["hr"] = hr
    if _any(power):
        result["power"] = power
    if _any(altitude):
        result["altitude"] = altitude
    if _any(speed_kmh):
        result["speed_kmh"] = speed_kmh
    if _any(pace_s_per_km):
        result["pace_s_per_km"] = pace_s_per_km

    return result


def parse_fit_bytes(data: bytes) -> dict[str, Any]:
    """Parse raw .fit file bytes and return an activity dict.

    The returned dict maps directly to Activity model fields.
    """
    try:
        from fitparse import FitFile  # type: ignore[import-untyped]
    except ImportError:
        raise RuntimeError("fitparse package not installed")

    ff = FitFile(io.BytesIO(data))

    sport: str = "other"
    start_time: datetime.datetime | None = None
    duration_s: int | None = None
    distance_m: float | None = None
    elevation_gain_m: float | None = None
    avg_hr: int | None = None
    max_hr: int | None = None
    avg_power_w: float | None = None
    norm_power_w: float | None = None
    avg_speed_ms: float | None = None
    ski_vertical_m: float | None = None
    ski_runs: int | None = None

    # --- sport message (most specific) ---
    for msg in ff.get_messages("sport"):
        sp = msg.get_value("sport")
        sub = msg.get_value("sub_sport")
        # sub_sport overrides sport when we have a mapping
        if sub and str(sub).lower() in SPORT_MAP:
            sport = SPORT_MAP[str(sub).lower()]
        elif sp and str(sp).lower() in SPORT_MAP:
            sport = SPORT_MAP[str(sp).lower()]
        elif sp:
            sport = str(sp).lower()

    # --- session message (aggregate metrics) ---
    for msg in ff.get_messages("session"):
        fields = {f.name: f.value for f in msg.fields if f.value is not None}

        if start_time is None:
            st = fields.get("start_time")
            if isinstance(st, datetime.datetime):
                start_time = st

        timer = fields.get("total_timer_time")
        if timer is not None:
            duration_s = int(timer)

        dist = fields.get("total_distance")
        if dist is not None:
            distance_m = float(dist)

        ascent = fields.get("total_ascent")
        if ascent is not None:
            elevation_gain_m = float(ascent)

        hr = fields.get("avg_heart_rate")
        if hr is not None:
            avg_hr = int(hr)

        hr_max = fields.get("max_heart_rate")
        if hr_max is not None:
            max_hr = int(hr_max)

        pwr = fields.get("avg_power")
        if pwr is not None and int(pwr) != 0xFFFF:  # invalid sentinel value
            avg_power_w = float(pwr)

        npwr = fields.get("normalized_power")
        if npwr is not None and int(npwr) != 0xFFFF:
            norm_power_w = float(npwr)

        spd = fields.get("avg_speed")
        if spd is not None:
            avg_speed_ms = float(spd)

        # Ski-specific fields (available in some Garmin ski profiles)
        vert = fields.get("total_descent")  # vertical drop for ski
        if vert is not None and sport in ("ski_alpine", "ski_xc"):
            ski_vertical_m = float(vert)

        runs = fields.get("num_laps")  # Garmin uses laps = runs for skiing
        if runs is not None and sport in ("ski_alpine",):
            ski_runs = int(runs)

        # Fall back to sport from session if not set from sport message
        if sport == "other":
            sp = fields.get("sport")
            if sp:
                sport = SPORT_MAP.get(str(sp).lower(), str(sp).lower())

    avg_speed_kmh = avg_speed_ms * 3.6 if avg_speed_ms else None
    avg_pace = (1000.0 / avg_speed_ms) if avg_speed_ms and avg_speed_ms > 0.0 else None

    return {
        "sport": sport,
        "start_time": start_time,
        "duration_s": duration_s,
        "distance_m": distance_m,
        "elevation_gain_m": elevation_gain_m,
        "avg_hr": avg_hr,
        "max_hr": max_hr,
        "avg_power_w": avg_power_w,
        "normalized_power_w": norm_power_w,
        "avg_speed_kmh": avg_speed_kmh,
        "avg_pace_s_per_km": avg_pace,
        "ski_vertical_m": ski_vertical_m,
        "ski_runs": ski_runs,
    }
