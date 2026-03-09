"""Training plan API.

Endpoints:
  GET  /api/training/goals                   — list all goals
  POST /api/training/goals                   — create a goal
  PUT  /api/training/goals/{id}              — update a goal
  DELETE /api/training/goals/{id}            — delete a goal

  GET  /api/training/plans                   — list all stored plans
  GET  /api/training/plans/current           — plan for current ISO week
  POST /api/training/plans/generate          — generate (or regenerate) current week's plan
"""
from __future__ import annotations

import datetime
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.activity import Activity
from models.training_plan import (
    RaceGoal,
    RaceGoalCreate,
    RaceGoalRead,
    RaceGoalUpdate,
    TrainingPlan,
    TrainingPlanRead,
)
from models.user import User
from services.periodization import compute_cycle_info
from services.planner import generate_weekly_plan, sessions_to_json
from services.training_load import compute_pmc

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/training", tags=["training"])


# ---------------------------------------------------------------------------
# Race Goal CRUD
# ---------------------------------------------------------------------------

@router.get("/goals", response_model=list[RaceGoalRead])
async def list_goals(db: AsyncSession = Depends(get_db)) -> list[RaceGoalRead]:
    result = await db.execute(
        select(RaceGoal).order_by(RaceGoal.race_date.asc())
    )
    return list(result.scalars().all())


@router.post("/goals", response_model=RaceGoalRead, status_code=201)
async def create_goal(
    payload: RaceGoalCreate, db: AsyncSession = Depends(get_db)
) -> RaceGoalRead:
    user_result = await db.execute(select(User).limit(1))
    user = user_result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User profile not found — complete onboarding first")

    goal = RaceGoal(user_id=user.id, **payload.model_dump())
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return RaceGoalRead.model_validate(goal)


@router.put("/goals/{goal_id}", response_model=RaceGoalRead)
async def update_goal(
    goal_id: int, payload: RaceGoalUpdate, db: AsyncSession = Depends(get_db)
) -> RaceGoalRead:
    result = await db.execute(select(RaceGoal).where(RaceGoal.id == goal_id))
    goal = result.scalar_one_or_none()
    if goal is None:
        raise HTTPException(status_code=404, detail="Goal not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)
    await db.commit()
    await db.refresh(goal)
    return RaceGoalRead.model_validate(goal)


@router.delete("/goals/{goal_id}", status_code=204)
async def delete_goal(goal_id: int, db: AsyncSession = Depends(get_db)) -> None:
    result = await db.execute(select(RaceGoal).where(RaceGoal.id == goal_id))
    goal = result.scalar_one_or_none()
    if goal is None:
        raise HTTPException(status_code=404, detail="Goal not found")
    await db.delete(goal)
    await db.commit()


# ---------------------------------------------------------------------------
# Training Plans
# ---------------------------------------------------------------------------

@router.get("/plans", response_model=list[TrainingPlanRead])
async def list_training_plans(db: AsyncSession = Depends(get_db)) -> list[TrainingPlanRead]:
    result = await db.execute(
        select(TrainingPlan).order_by(TrainingPlan.week_start.desc())
    )
    return list(result.scalars().all())


@router.get("/plans/current", response_model=TrainingPlanRead)
async def get_current_plan(db: AsyncSession = Depends(get_db)) -> TrainingPlanRead:
    today = datetime.date.today()
    week_start = today - datetime.timedelta(days=today.weekday())
    result = await db.execute(
        select(TrainingPlan).where(TrainingPlan.week_start == week_start).limit(1)
    )
    plan = result.scalar_one_or_none()
    if plan is None:
        raise HTTPException(status_code=404, detail="No training plan for current week")
    return TrainingPlanRead.model_validate(plan)


@router.post("/plans/generate", response_model=TrainingPlanRead)
async def generate_training_plan(db: AsyncSession = Depends(get_db)) -> TrainingPlanRead:
    """Generate (or regenerate) the training plan for the current ISO week.

    Uses the earliest active race goal for periodization. Falls back to a
    general base-phase plan if no goal is set.
    """
    # 1. Require user profile
    user_result = await db.execute(select(User).limit(1))
    user = user_result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User profile not found — complete onboarding first")

    # 2. Active goal (earliest upcoming race)
    today = datetime.date.today()
    goal_result = await db.execute(
        select(RaceGoal)
        .where(RaceGoal.is_active == True)  # noqa: E712
        .where(RaceGoal.race_date >= today)
        .order_by(RaceGoal.race_date.asc())
        .limit(1)
    )
    goal = goal_result.scalar_one_or_none()

    # 3. Determine phase and primary sport
    if goal:
        cycle_info = compute_cycle_info(goal.race_date, today)
        phase = cycle_info.phase
        primary_sport = goal.sport
        goal_description = f"{goal.name} ({goal.race_date.strftime('%d %b %Y')})"
    else:
        phase = "base"
        primary_sport = "trail_run"
        goal_description = "General training — no race goal set"

    # 4. Compute current CTL from all activities
    act_result = await db.execute(
        select(Activity).order_by(Activity.start_time.asc())
    )
    activities = list(act_result.scalars().all())
    pmc_series = compute_pmc(activities, user, days=120)
    ctl = pmc_series[-1]["ctl"] if pmc_series else 30.0

    # 5. Generate the weekly session list
    week_start = today - datetime.timedelta(days=today.weekday())
    sessions, planned_tss, planned_hours = generate_weekly_plan(
        primary_sport=primary_sport,
        phase=phase,
        ctl=ctl,
        week_start=week_start,
    )
    sessions_json = sessions_to_json(sessions)

    # 6. Upsert into training_plans
    existing_result = await db.execute(
        select(TrainingPlan).where(TrainingPlan.week_start == week_start).limit(1)
    )
    existing = existing_result.scalar_one_or_none()

    if existing:
        existing.phase = phase
        existing.goal_description = goal_description
        existing.planned_tss = planned_tss
        existing.planned_hours = planned_hours
        existing.sessions = sessions_json
        await db.commit()
        await db.refresh(existing)
        return TrainingPlanRead.model_validate(existing)

    new_plan = TrainingPlan(
        user_id=user.id,
        week_start=week_start,
        phase=phase,
        goal_description=goal_description,
        planned_tss=planned_tss,
        planned_hours=planned_hours,
        sessions=sessions_json,
    )
    db.add(new_plan)
    await db.commit()
    await db.refresh(new_plan)
    return TrainingPlanRead.model_validate(new_plan)
