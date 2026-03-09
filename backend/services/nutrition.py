"""Nutrition calculation service.

Provides deterministic BMR/TDEE/macro calculations based on user profile
and today's planned training type. No Claude API dependency.
"""
from __future__ import annotations

import datetime
import json
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


# ---------------------------------------------------------------------------
# BMR / TDEE
# ---------------------------------------------------------------------------

def calculate_bmr(weight_kg: float, height_cm: float, age_years: int, sex: str) -> float:
    """Mifflin-St Jeor formula. Returns kcal/day."""
    base = 10 * weight_kg + 6.25 * height_cm - 5 * age_years
    return base + 5 if sex.lower() == "male" else base - 161


_ACTIVITY_FACTORS: dict[str, float] = {
    "sedentary":   1.2,
    "light":       1.375,
    "moderate":    1.55,
    "active":      1.725,
    "very_active": 1.9,
}


def calculate_tdee(bmr: float, activity_level: str) -> float:
    """Multiply BMR by Harris-Benedict activity factor."""
    factor = _ACTIVITY_FACTORS.get(activity_level, 1.55)  # default: moderate
    return round(bmr * factor, 1)


# ---------------------------------------------------------------------------
# Macro splits by training type
# ---------------------------------------------------------------------------

# (carb_pct, protein_pct, fat_pct, kcal_modifier)
_MACRO_SPLITS: dict[str, tuple[float, float, float, float]] = {
    "rest":     (0.30, 0.30, 0.40, 0.90),
    "easy":     (0.45, 0.25, 0.30, 1.00),
    "moderate": (0.50, 0.25, 0.25, 1.00),
    "hard":     (0.60, 0.20, 0.20, 1.10),
    "long":     (0.65, 0.15, 0.20, 1.15),
}

# Fluid targets (ml/day) by training type
_FLUID_ML: dict[str, float] = {
    "rest":     2000,
    "easy":     2500,
    "moderate": 3000,
    "hard":     3500,
    "long":     4000,
}


def calculate_macros(tdee: float, training_type: str) -> dict:
    """Return macro targets in grams and fluid in ml for the given training type.

    Calories from macronutrients:
        carbs:   4 kcal/g
        protein: 4 kcal/g
        fat:     9 kcal/g
    """
    carb_pct, pro_pct, fat_pct, kcal_mod = _MACRO_SPLITS.get(
        training_type, _MACRO_SPLITS["moderate"]
    )
    target_kcal = round(tdee * kcal_mod, 1)
    return {
        "target_kcal":    target_kcal,
        "target_protein_g": round(target_kcal * pro_pct / 4, 1),
        "target_carbs_g":   round(target_kcal * carb_pct / 4, 1),
        "target_fat_g":     round(target_kcal * fat_pct / 9, 1),
        "target_fluid_ml":  _FLUID_ML.get(training_type, 2500),
    }


# ---------------------------------------------------------------------------
# Training type lookup from today's plan
# ---------------------------------------------------------------------------

# Maps PlannedSession.session_type → nutrition training_type
_SESSION_TO_NUTRITION: dict[str, str] = {
    "rest":       "rest",
    "recovery":   "easy",
    "easy":       "easy",
    "threshold":  "moderate",
    "weights":    "moderate",
    "intervals":  "hard",
    "long":       "long",
}

_DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


async def get_training_type_for_date(
    db: AsyncSession, user_id: int, target_date: datetime.date
) -> str:
    """Look up the nutrition training type for a given date from the stored training plan.

    Returns 'moderate' as a sensible default when no plan exists.
    """
    from models.training_plan import TrainingPlan  # avoid circular import

    # Find the week that contains target_date (week starts Monday)
    days_since_monday = target_date.weekday()  # 0=Mon, 6=Sun
    week_start = target_date - datetime.timedelta(days=days_since_monday)
    day_name = _DAY_NAMES[days_since_monday]

    result = await db.execute(
        select(TrainingPlan).where(
            TrainingPlan.user_id == user_id,
            TrainingPlan.week_start == week_start,
        )
    )
    plan = result.scalar_one_or_none()
    if plan is None or not plan.sessions:
        return "moderate"

    try:
        sessions = json.loads(plan.sessions)
    except (ValueError, TypeError):
        return "moderate"

    for session in sessions:
        if session.get("day") == day_name:
            session_type = session.get("session_type", "easy")
            return _SESSION_TO_NUTRITION.get(session_type, "moderate")

    return "moderate"
