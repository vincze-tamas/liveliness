"""Weight training API.

Endpoints:
  GET  /api/weights/exercises              — exercise library
  GET  /api/weights/plan                   — phase-appropriate session prescription
  GET  /api/weights/sessions?days=30       — list recent sessions
  POST /api/weights/sessions               — log a session
  GET  /api/weights/sessions/{id}          — fetch single session
  PUT  /api/weights/sessions/{id}          — update session
  DELETE /api/weights/sessions/{id}        — delete session
  GET  /api/weights/history/{exercise}     — per-exercise history for overload tracking
"""
from __future__ import annotations

import datetime
import json
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.training_plan import RaceGoal
from models.weight_session import WeightSession, WeightSessionCreate, WeightSessionRead
from services.periodization import compute_cycle_info
from services.weight_training import (
    EXERCISE_LIBRARY,
    calculate_wtss,
    generate_session_plan,
)

router = APIRouter(prefix="/api/weights", tags=["weight_training"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_exercises(raw: str | None) -> list[dict]:
    if not raw:
        return []
    try:
        return json.loads(raw)
    except (ValueError, TypeError):
        return []


def _enrich(session: WeightSession) -> dict:
    """Convert ORM object to dict with parsed exercises and computed wTSS."""
    data = WeightSessionRead.model_validate(session).model_dump()
    exercises = _parse_exercises(session.exercises)
    data["exercises_list"] = exercises

    # Compute wTSS from aggregate RPE if duration is set.
    # If exercises exist but none have RPE logged, fall back to RPE 6.0 (moderate)
    # to stay consistent with the PMC computation in training_load.py.
    if session.duration_min:
        rpes = [e.get("rpe") for e in exercises if isinstance(e.get("rpe"), (int, float))]
        avg_rpe = sum(rpes) / len(rpes) if rpes else 6.0
        data["wtss"] = calculate_wtss(session.duration_min, avg_rpe)
    else:
        data["wtss"] = None

    return data


async def _get_current_phase(db: AsyncSession) -> str:
    today = datetime.date.today()
    result = await db.execute(
        select(RaceGoal)
        .where(RaceGoal.is_active == True)  # noqa: E712
        .where(RaceGoal.race_date >= today)
        .order_by(RaceGoal.race_date.asc())
        .limit(1)
    )
    goal = result.scalar_one_or_none()
    if goal:
        return compute_cycle_info(goal.race_date, today).phase
    return "base"


# ---------------------------------------------------------------------------
# Exercise library
# ---------------------------------------------------------------------------

@router.get("/exercises")
async def list_exercises() -> list[dict]:
    return EXERCISE_LIBRARY


# ---------------------------------------------------------------------------
# Phase-appropriate plan
# ---------------------------------------------------------------------------

@router.get("/plan")
async def get_session_plan(db: AsyncSession = Depends(get_db)) -> dict:
    phase = await _get_current_phase(db)
    prescriptions = generate_session_plan(phase)
    return {
        "phase": phase,
        "prescriptions": prescriptions,
    }


# ---------------------------------------------------------------------------
# Sessions CRUD
# ---------------------------------------------------------------------------

@router.get("/sessions")
async def list_weight_sessions(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    cutoff = datetime.date.today() - datetime.timedelta(days=days)
    result = await db.execute(
        select(WeightSession)
        .where(WeightSession.date >= cutoff)
        .order_by(WeightSession.date.desc())
    )
    return [_enrich(s) for s in result.scalars().all()]


@router.post("/sessions", status_code=201)
async def create_weight_session(
    payload: WeightSessionCreate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    session = WeightSession(**payload.model_dump())
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return _enrich(session)


@router.get("/sessions/{session_id}")
async def get_weight_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(WeightSession).where(WeightSession.id == session_id))
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Weight session not found")
    return _enrich(session)


@router.put("/sessions/{session_id}")
async def update_weight_session(
    session_id: int,
    payload: WeightSessionCreate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(WeightSession).where(WeightSession.id == session_id))
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Weight session not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(session, field, value)
    await db.commit()
    await db.refresh(session)
    return _enrich(session)


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_weight_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(WeightSession).where(WeightSession.id == session_id))
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Weight session not found")
    await db.delete(session)
    await db.commit()


# ---------------------------------------------------------------------------
# Per-exercise history (progressive overload)
# ---------------------------------------------------------------------------

@router.get("/history/{exercise_name}")
async def get_exercise_history(
    exercise_name: str,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Return the last N sessions that include the named exercise, with per-set details."""
    # Pre-filter at DB level using a case-insensitive LIKE on the JSON string.
    # The Python loop below then does exact-name matching; the DB filter just
    # avoids loading sessions that clearly don't mention the exercise at all.
    result = await db.execute(
        select(WeightSession)
        .where(WeightSession.exercises.isnot(None))
        .where(WeightSession.exercises.ilike(f'%"{exercise_name}"%'))
        .order_by(WeightSession.date.desc())
        .limit(limit * 3)  # fetch a small multiple to account for false positives
    )
    sessions = result.scalars().all()

    history: list[dict] = []
    for session in sessions:
        exercises = _parse_exercises(session.exercises)
        matching = [e for e in exercises if e.get("name", "").lower() == exercise_name.lower()]
        if matching:
            history.append({
                "session_id": session.id,
                "date": session.date.isoformat(),
                "session_type": session.session_type,
                "exercises": matching,
            })
        if len(history) >= limit:
            break

    return history
