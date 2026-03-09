from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix="/api/statistics", tags=["statistics"])


@router.get("/weekly")
async def weekly_statistics(weeks: int = 12) -> list[Any]:
    # TODO: compute weekly training load aggregates
    return []


@router.get("/monthly")
async def monthly_statistics(months: int = 12) -> list[Any]:
    # TODO: compute monthly training load aggregates
    return []


@router.get("/alltime")
async def alltime_statistics() -> dict[str, Any]:
    # TODO: compute all-time totals and personal records
    return {}


@router.get("/pmc")
async def performance_management_chart(days: int = 120) -> list[Any]:
    # TODO: compute CTL, ATL, TSB (Performance Management Chart)
    return []


@router.get("/activity/{activity_id}/streams")
async def activity_streams(activity_id: int) -> dict[str, Any]:
    # TODO: return time-series streams (HR, pace, power, elevation) for an activity
    return {}
