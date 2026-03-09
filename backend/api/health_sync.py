import datetime
import logging
import os
from typing import Any, Optional

import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db
from models.activity import Activity, ActivityRead
from models.health_metrics import HealthMetrics
from models.user import User
from services.apple_health import parse_export_bytes
from services.fit_parser import parse_fit_bytes
from services import garmin as garmin_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/health", tags=["health"])

# Directory for uploaded FIT files (relative to backend workdir)
FIT_UPLOAD_DIR = os.environ.get("FIT_UPLOAD_DIR", "/data/fit_files")

HEALTHKIT_SPORT_MAP: dict[str, str] = {
    "TrailRunning": "trail_run",
    "Running": "trail_run",
    "CrossCountryRunning": "trail_run",
    "Cycling": "road_bike",
    "MountainBiking": "mtb",
    "DownhillSkiing": "ski_alpine",
    "Skiing": "ski_alpine",
    "SkatingSports": "inline_skate",
    "RollerSkating": "inline_skate",
    "TraditionalStrengthTraining": "gym",
    "FunctionalStrengthTraining": "gym",
}


# ---------------------------------------------------------------------------
# Pydantic schemas for the iOS Shortcut JSON endpoint
# ---------------------------------------------------------------------------

class WorkoutPayload(BaseModel):
    type: str
    start: datetime.datetime
    duration_s: int
    distance_m: Optional[float] = None
    avg_hr: Optional[int] = None
    energy_kcal: Optional[float] = None


class HealthSyncPayload(BaseModel):
    date: datetime.date
    hrv_ms: Optional[float] = None
    resting_hr: Optional[int] = None
    weight_kg: Optional[float] = None
    sleep_hours: Optional[float] = None
    steps: Optional[int] = None
    active_energy_kcal: Optional[float] = None
    blood_oxygen_pct: Optional[float] = None
    workouts: list[WorkoutPayload] = []


# ---------------------------------------------------------------------------
# Shared helper
# ---------------------------------------------------------------------------

async def _get_user(db: AsyncSession) -> User:
    result = await db.execute(select(User).limit(1))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Profile not set up")
    return user


# ---------------------------------------------------------------------------
# iOS Shortcut JSON endpoint
# ---------------------------------------------------------------------------

@router.post("/sync")
async def sync_health_data(
    payload: HealthSyncPayload, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    """Upsert one day of Apple Health data from the iOS Shortcut."""
    user = await _get_user(db)
    inserted = 0

    # Upsert HealthMetrics row for the day
    result = await db.execute(
        select(HealthMetrics).where(
            HealthMetrics.user_id == user.id,
            HealthMetrics.date == payload.date,
        )
    )
    metrics = result.scalar_one_or_none()
    if metrics is None:
        metrics = HealthMetrics(user_id=user.id, date=payload.date, source="apple_health")
        db.add(metrics)
        inserted += 1

    if payload.hrv_ms is not None:
        metrics.hrv_ms = payload.hrv_ms
    if payload.resting_hr is not None:
        metrics.resting_hr = payload.resting_hr
    if payload.weight_kg is not None:
        metrics.weight_kg = payload.weight_kg
    if payload.sleep_hours is not None:
        metrics.sleep_hours = payload.sleep_hours
    if payload.steps is not None:
        metrics.steps = payload.steps
    if payload.active_energy_kcal is not None:
        metrics.active_energy_kcal = payload.active_energy_kcal
    if payload.blood_oxygen_pct is not None:
        metrics.blood_oxygen_pct = payload.blood_oxygen_pct

    # Upsert each workout
    for workout in payload.workouts:
        external_id = f"apple_{workout.start.isoformat()}"
        result = await db.execute(
            select(Activity).where(
                Activity.user_id == user.id,
                Activity.external_id == external_id,
            )
        )
        if result.scalar_one_or_none() is None:
            sport = HEALTHKIT_SPORT_MAP.get(workout.type, "other")
            db.add(
                Activity(
                    user_id=user.id,
                    source="apple_health",
                    external_id=external_id,
                    sport=sport,
                    start_time=workout.start,
                    duration_s=workout.duration_s,
                    distance_m=workout.distance_m,
                    avg_hr=workout.avg_hr,
                )
            )
            inserted += 1

    await db.commit()
    return {"status": "ok", "inserted": inserted}


# ---------------------------------------------------------------------------
# Apple Health full export import (ZIP or XML)
# ---------------------------------------------------------------------------

@router.post("/import")
async def import_apple_health(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Parse an Apple Health export.zip (or export.xml) and bulk-upsert all data."""
    logger.info("Apple Health import started: %s", file.filename)
    user = await _get_user(db)

    raw = await file.read()
    try:
        daily_metrics, workouts = parse_export_bytes(raw)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    metrics_upserted = 0
    activities_inserted = 0

    # Upsert health metrics (one row per day)
    for date, fields in daily_metrics.items():
        res = await db.execute(
            select(HealthMetrics).where(
                HealthMetrics.user_id == user.id,
                HealthMetrics.date == date,
            )
        )
        row = res.scalar_one_or_none()
        if row is None:
            row = HealthMetrics(user_id=user.id, date=date, source="apple_health")
            db.add(row)
            metrics_upserted += 1

        for field, value in fields.items():
            if value is not None:
                setattr(row, field, value)

    # Insert new workouts (skip duplicates by external_id)
    for w in workouts:
        external_id = w["external_id"]
        res = await db.execute(
            select(Activity).where(
                Activity.user_id == user.id,
                Activity.external_id == external_id,
            )
        )
        if res.scalar_one_or_none() is not None:
            continue

        db.add(
            Activity(
                user_id=user.id,
                source="apple_health",
                external_id=external_id,
                sport=w["sport"],
                start_time=w["start_time"],
                duration_s=w["duration_s"],
                distance_m=w["distance_m"],
            )
        )
        activities_inserted += 1

    await db.commit()
    logger.info(
        "Apple Health import complete: %d metric days, %d activities",
        metrics_upserted,
        activities_inserted,
    )
    return {
        "status": "ok",
        "metrics_days_upserted": metrics_upserted,
        "activities_inserted": activities_inserted,
    }


# ---------------------------------------------------------------------------
# Garmin Connect sync
# ---------------------------------------------------------------------------

@router.post("/garmin-sync")
async def sync_garmin(
    days: int = Query(default=30, ge=1, le=365, description="How many days back to sync"),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Authenticate with Garmin Connect and pull activities + health data."""
    user = await _get_user(db)
    try:
        result = await garmin_service.sync_garmin(user, db, days=days)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        logger.exception("Garmin sync failed")
        raise HTTPException(status_code=502, detail=f"Garmin sync failed: {exc}") from exc
    return {"status": "ok", **result}


# ---------------------------------------------------------------------------
# FIT file upload
# ---------------------------------------------------------------------------

@router.post("/fit-upload", response_model=ActivityRead, status_code=201)
async def upload_fit_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> ActivityRead:
    """Upload a single .fit file, parse it, and store as an Activity."""
    user = await _get_user(db)

    if not (file.filename or "").lower().endswith(".fit"):
        raise HTTPException(status_code=422, detail="Only .fit files are accepted")

    raw = await file.read()
    try:
        data = parse_fit_bytes(raw)
    except (RuntimeError, Exception) as exc:
        raise HTTPException(status_code=422, detail=f"FIT parse error: {exc}") from exc

    # Persist the raw file so it can be re-processed later
    fit_file_path: str | None = None
    try:
        os.makedirs(FIT_UPLOAD_DIR, exist_ok=True)
        start_tag = (
            data["start_time"].strftime("%Y%m%dT%H%M%S")
            if data.get("start_time")
            else "unknown"
        )
        fit_file_path = os.path.join(FIT_UPLOAD_DIR, f"{user.id}_{start_tag}.fit")
        async with aiofiles.open(fit_file_path, "wb") as fh:
            await fh.write(raw)
    except Exception:
        logger.warning("Could not save FIT file to disk; continuing without it")
        fit_file_path = None

    # Derive external_id from start time so we can deduplicate re-uploads
    start_time = data.get("start_time")
    external_id = f"fit_{start_time.isoformat()}" if start_time else None

    if external_id:
        res = await db.execute(
            select(Activity).where(
                Activity.user_id == user.id,
                Activity.external_id == external_id,
            )
        )
        existing = res.scalar_one_or_none()
        if existing is not None:
            # Update file path if we re-uploaded a file
            if fit_file_path:
                existing.fit_file_path = fit_file_path
                await db.commit()
                await db.refresh(existing)
            return existing  # type: ignore[return-value]

    activity = Activity(
        user_id=user.id,
        source="fit_upload",
        external_id=external_id,
        fit_file_path=fit_file_path,
        **{k: v for k, v in data.items() if v is not None},
    )
    db.add(activity)
    await db.commit()
    await db.refresh(activity)
    return activity  # type: ignore[return-value]
