import datetime
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.activity import Activity
from models.health_metrics import HealthMetrics
from models.user import User
from services.training_load import (
    compute_alltime,
    compute_monthly,
    compute_pmc,
    compute_weekly,
)


class WeekSummary(BaseModel):
    week_start: str
    activity_count: int
    distance_km: float
    elevation_m: int
    duration_h: float
    tss: float
    sport_distance_km: dict[str, float]
    avg_hrv: float | None
    avg_resting_hr: int | None


class MonthSummary(BaseModel):
    month: str
    activity_count: int
    distance_km: float
    elevation_m: int
    duration_h: float
    tss: float
    sport_distance_km: dict[str, float]


class PmcPoint(BaseModel):
    date: str
    tss: float
    ctl: float
    atl: float
    tsb: float


class SportStats(BaseModel):
    count: int
    distance_km: float
    elevation_m: int
    duration_h: float


class AlltimeSummary(BaseModel):
    total_activities: int
    total_distance_km: float
    total_elevation_m: int
    total_duration_h: float
    sport_stats: dict[str, SportStats]
    first_activity_date: str | None
    last_activity_date: str | None
    longest_activity_h: float
    most_elevation_m: int

router = APIRouter(prefix="/api/statistics", tags=["statistics"])


async def _get_user(db: AsyncSession) -> User | None:
    result = await db.execute(select(User).limit(1))
    return result.scalar_one_or_none()


async def _get_all_activities(db: AsyncSession) -> list[Activity]:
    result = await db.execute(select(Activity).order_by(Activity.start_time))
    return list(result.scalars().all())


@router.get("/weekly")
async def weekly_statistics(
    weeks: int = 12,
    db: AsyncSession = Depends(get_db),
) -> list[WeekSummary]:
    user = await _get_user(db)
    if user is None:
        return []
    acts = await _get_all_activities(db)
    cutoff = datetime.date.today() - datetime.timedelta(weeks=weeks + 1)
    health_res = await db.execute(
        select(HealthMetrics)
        .where(HealthMetrics.date >= cutoff)
        .order_by(HealthMetrics.date)
    )
    health_rows = list(health_res.scalars().all())
    return compute_weekly(acts, health_rows, user, weeks=weeks)


@router.get("/monthly")
async def monthly_statistics(
    months: int = 12,
    db: AsyncSession = Depends(get_db),
) -> list[MonthSummary]:
    user = await _get_user(db)
    if user is None:
        return []
    acts = await _get_all_activities(db)
    return compute_monthly(acts, user, months=months)


@router.get("/alltime")
async def alltime_statistics(db: AsyncSession = Depends(get_db)) -> AlltimeSummary:
    acts = await _get_all_activities(db)
    return compute_alltime(acts)


@router.get("/pmc")
async def performance_management_chart(
    days: int = 120,
    db: AsyncSession = Depends(get_db),
) -> list[PmcPoint]:
    user = await _get_user(db)
    if user is None:
        return []
    acts = await _get_all_activities(db)
    return compute_pmc(acts, user, days=days)


@router.get("/activity/{activity_id}/streams")
async def activity_streams(activity_id: int) -> dict[str, Any]:
    # TODO: return time-series streams (HR, pace, power, elevation) for an activity
    return {}
