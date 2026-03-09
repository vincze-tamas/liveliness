"""Garmin Connect sync service.

Authenticates with Garmin Connect and pulls activities + daily health
stats (steps, HRV, sleep, body battery, resting HR) into the database.
"""
from __future__ import annotations

import asyncio
import datetime
import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.activity import Activity
from models.health_metrics import HealthMetrics
from models.user import User

logger = logging.getLogger(__name__)

GARMIN_SPORT_MAP: dict[str, str] = {
    "running": "trail_run",
    "trail_running": "trail_run",
    "road_running": "trail_run",
    "cycling": "road_bike",
    "road_biking": "road_bike",
    "mountain_biking": "mtb",
    "gravel_cycling": "road_bike",
    "skiing": "ski_alpine",
    "alpine_skiing": "ski_alpine",
    "backcountry_skiing": "ski_alpine",
    "skate_skiing": "ski_xc",
    "cross_country_skiing": "ski_xc",
    "snowboarding": "ski_alpine",
    "inline_skating": "inline_skate",
    "ice_skating": "inline_skate",
    "strength_training": "gym",
    "fitness_equipment": "gym",
    "swimming": "swim",
    "open_water_swimming": "swim",
    "hiking": "hike",
    "walking": "walk",
}


async def _run_in_executor(func: Any, *args: Any) -> Any:
    """Run a blocking call in the default thread-pool executor."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, func, *args)


def _build_client(username: str, password: str) -> Any:
    """Construct and authenticate a Garmin client (blocking)."""
    import garminconnect  # type: ignore[import-untyped]

    client = garminconnect.Garmin(username, password)
    client.login()
    return client


async def sync_garmin(
    user: User,
    db: AsyncSession,
    days: int = 30,
) -> dict[str, int]:
    """Pull the last *days* of Garmin data and upsert into the database.

    Returns a summary dict: {"activities_inserted": N, "metrics_upserted": N}
    """
    if not user.garmin_username or not user.garmin_password:
        raise ValueError("Garmin credentials not set in user profile")

    client = await _run_in_executor(_build_client, user.garmin_username, user.garmin_password)

    today = datetime.date.today()
    start_date = today - datetime.timedelta(days=days)
    activities_inserted = 0
    metrics_upserted = 0

    # ------------------------------------------------------------------ #
    # Activities                                                           #
    # ------------------------------------------------------------------ #
    try:
        raw_activities: list[dict[str, Any]] = await _run_in_executor(
            client.get_activities_by_date,
            start_date.isoformat(),
            today.isoformat(),
        )
        for act in raw_activities:
            external_id = f"garmin_{act.get('activityId', '')}"
            res = await db.execute(
                select(Activity).where(
                    Activity.user_id == user.id,
                    Activity.external_id == external_id,
                )
            )
            if res.scalar_one_or_none() is not None:
                continue  # already imported

            type_key = (
                (act.get("activityType") or {}).get("typeKey", "") or act.get("sport", "")
            ).lower()
            sport = GARMIN_SPORT_MAP.get(type_key, "other")

            start_str = act.get("startTimeLocal") or act.get("startTimeGMT", "")
            try:
                start_dt = datetime.datetime.strptime(start_str[:19], "%Y-%m-%d %H:%M:%S")
            except (ValueError, TypeError):
                start_dt = None

            duration_s = int(act["duration"]) if act.get("duration") else None
            dist_m = float(act["distance"]) if act.get("distance") else None
            elev_gain = float(act["elevationGain"]) if act.get("elevationGain") else None
            avg_hr = int(act["averageHR"]) if act.get("averageHR") else None
            max_hr = int(act["maxHR"]) if act.get("maxHR") else None
            avg_power = float(act["avgPower"]) if act.get("avgPower") else None
            norm_power = float(act["normPower"]) if act.get("normPower") else None

            avg_speed_ms = float(act["averageSpeed"]) if act.get("averageSpeed") else None
            avg_speed_kmh = avg_speed_ms * 3.6 if avg_speed_ms else None
            avg_pace = (1000.0 / avg_speed_ms) if avg_speed_ms and avg_speed_ms > 0 else None

            db.add(
                Activity(
                    user_id=user.id,
                    source="garmin",
                    external_id=external_id,
                    sport=sport,
                    start_time=start_dt,
                    duration_s=duration_s,
                    distance_m=dist_m,
                    elevation_gain_m=elev_gain,
                    avg_hr=avg_hr,
                    max_hr=max_hr,
                    avg_pace_s_per_km=avg_pace,
                    avg_speed_kmh=avg_speed_kmh,
                    avg_power_w=avg_power,
                    normalized_power_w=norm_power,
                )
            )
            activities_inserted += 1
    except Exception:
        logger.exception("Failed to fetch Garmin activities")

    # ------------------------------------------------------------------ #
    # Daily health stats: steps, body battery, resting HR, HRV, sleep    #
    # ------------------------------------------------------------------ #
    # Cache metrics objects by date so multiple data sources for the same
    # day all update the same ORM object without duplicate INSERT attempts.
    metrics_cache: dict[datetime.date, HealthMetrics] = {}

    async def _get_or_init_metrics(date: datetime.date) -> HealthMetrics:
        if date in metrics_cache:
            return metrics_cache[date]
        r = await db.execute(
            select(HealthMetrics).where(
                HealthMetrics.user_id == user.id,
                HealthMetrics.date == date,
            )
        )
        m = r.scalar_one_or_none()
        if m is None:
            m = HealthMetrics(user_id=user.id, date=date, source="garmin")
            db.add(m)
            nonlocal metrics_upserted
            metrics_upserted += 1
        metrics_cache[date] = m
        return m

    current = start_date
    while current <= today:
        date_str = current.isoformat()

        # Daily stats (steps, active kcal, resting HR, body battery)
        try:
            stats: dict[str, Any] = await _run_in_executor(client.get_stats, date_str)
            m = await _get_or_init_metrics(current)
            if stats.get("totalSteps"):
                m.steps = int(stats["totalSteps"])
            if stats.get("activeKilocalories"):
                m.active_energy_kcal = float(stats["activeKilocalories"])
            if stats.get("restingHeartRate"):
                m.resting_hr = int(stats["restingHeartRate"])
            bb = stats.get("bodyBatteryHighestValue")
            if bb is not None:
                m.body_battery = int(bb)
        except Exception:
            logger.debug("No daily stats for %s", date_str)

        # HRV
        try:
            hrv_data: dict[str, Any] = await _run_in_executor(client.get_hrv_data, date_str)
            hrv_val = hrv_data.get("hrvSummary", {}).get("lastNight")
            if hrv_val is not None:
                m = await _get_or_init_metrics(current)
                m.hrv_ms = float(hrv_val)
        except Exception:
            logger.debug("No HRV data for %s", date_str)

        # Sleep
        try:
            sleep_data: dict[str, Any] = await _run_in_executor(
                client.get_sleep_data, date_str
            )
            summary = sleep_data.get("dailySleepDTO", {})
            sleep_secs = summary.get("sleepTimeSeconds")
            if sleep_secs:
                m = await _get_or_init_metrics(current)
                m.sleep_hours = round(float(sleep_secs) / 3600.0, 2)
                score = (summary.get("sleepScores") or {}).get("overall", {}).get("value")
                if score is not None:
                    m.sleep_score = int(score)
        except Exception:
            logger.debug("No sleep data for %s", date_str)

        # Weight
        try:
            weigh_ins: list[dict[str, Any]] = await _run_in_executor(
                client.get_weigh_ins, date_str, date_str
            )
            for entry in weigh_ins or []:
                w = entry.get("weight")
                if w is not None:
                    m = await _get_or_init_metrics(current)
                    # Garmin returns weight in grams
                    m.weight_kg = round(float(w) / 1000.0, 2)
                    break
        except Exception:
            logger.debug("No weight data for %s", date_str)

        current += datetime.timedelta(days=1)

    await db.commit()
    return {"activities_inserted": activities_inserted, "metrics_upserted": metrics_upserted}
