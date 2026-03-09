import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.training_plan import TrainingPlan, TrainingPlanRead

router = APIRouter(prefix="/api/training", tags=["training"])


@router.get("/plans", response_model=list[TrainingPlanRead])
async def list_training_plans(db: AsyncSession = Depends(get_db)) -> list[TrainingPlanRead]:
    result = await db.execute(select(TrainingPlan).order_by(TrainingPlan.week_start.desc()))
    return list(result.scalars().all())


@router.get("/plans/current", response_model=TrainingPlanRead)
async def get_current_plan(db: AsyncSession = Depends(get_db)) -> TrainingPlanRead:
    today = datetime.date.today()
    # Start of current week (Monday)
    week_start = today - datetime.timedelta(days=today.weekday())
    result = await db.execute(
        select(TrainingPlan).where(TrainingPlan.week_start == week_start).limit(1)
    )
    plan = result.scalar_one_or_none()
    if plan is None:
        raise HTTPException(status_code=404, detail="No training plan for current week")
    return plan


@router.post("/plans/generate", status_code=501)
async def generate_training_plan() -> dict[str, Any]:
    # TODO: implement AI-driven training plan generation (Phase 7)
    return {"status": "not_implemented"}
