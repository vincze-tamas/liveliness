import datetime
import logging
from typing import Any, Optional

import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.activity import Activity
from models.health_metrics import HealthMetrics
from models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/health", tags=["health"])

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


async def _get_or_create_user(db: AsyncSession) -> User:
    result = await db.execute(select(User).limit(1))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Profile not set up")
    return user


@router.post("/sync")
async def sync_health_data(
    payload: HealthSyncPayload, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    user = await _get_or_create_user(db)
    inserted = 0

    # Upsert health metrics
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

    # Upsert workouts
    for workout in payload.workouts:
        external_id = f"apple_{workout.start.isoformat()}"
        result = await db.execute(
            select(Activity).where(
                Activity.user_id == user.id,
                Activity.external_id == external_id,
            )
        )
        existing = result.scalar_one_or_none()
        if existing is None:
            sport = HEALTHKIT_SPORT_MAP.get(workout.type, "other")
            activity = Activity(
                user_id=user.id,
                source="apple_health",
                external_id=external_id,
                sport=sport,
                start_time=workout.start,
                duration_s=workout.duration_s,
                distance_m=workout.distance_m,
                avg_hr=workout.avg_hr,
            )
            db.add(activity)
            inserted += 1

    await db.commit()
    return {"status": "ok", "inserted": inserted}


@router.post("/import")
async def import_apple_health(file: UploadFile = File(...)) -> dict[str, str]:
    # TODO: parse export.xml from the zip and ingest health records
    logger.info("Received Apple Health export file: %s", file.filename)
    return {"status": "processing"}
