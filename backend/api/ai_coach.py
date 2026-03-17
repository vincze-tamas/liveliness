import json
import logging
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import ai_unavailable, get_user
from config import settings
from database import get_db
from models.activity import Activity
from models.training_plan import TrainingPlan
from models.user import User
import services.ai_coach as coach_svc

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/coach", tags=["ai_coach"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


class ChatResponse(BaseModel):
    reply: str


class DebriefResponse(BaseModel):
    debrief: str


class WeeklyNarrativeRequest(BaseModel):
    plan_id: int


class WeeklyNarrativeResponse(BaseModel):
    narrative: str


class NutritionAdviceResponse(BaseModel):
    advice: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/chat", response_model=ChatResponse)
async def coach_chat(
    payload: ChatRequest,
    db: AsyncSession = Depends(get_db),
) -> ChatResponse:
    """Free-form coaching chat with full athlete context."""
    user = await get_user(db)
    context = await coach_svc.build_coaching_context(db, user)
    messages = [{"role": m.role, "content": m.content} for m in payload.messages]

    try:
        reply = coach_svc.chat(messages, context, user=user)
    except Exception as exc:
        logger.exception("Coach chat error")
        raise ai_unavailable(exc) from exc

    return ChatResponse(reply=reply)


@router.post("/debrief/{activity_id}", response_model=DebriefResponse)
async def coach_debrief(
    activity_id: int,
    db: AsyncSession = Depends(get_db),
) -> DebriefResponse:
    """Generate a post-activity debrief for a completed session."""
    user = await get_user(db)

    act_result = await db.execute(
        select(Activity).where(Activity.id == activity_id, Activity.user_id == user.id)
    )
    activity = act_result.scalar_one_or_none()
    if activity is None:
        raise HTTPException(status_code=404, detail="Activity not found")

    context = await coach_svc.build_coaching_context(db, user)

    activity_data: dict[str, Any] = {
        "id": activity.id,
        "sport": activity.sport,
        "start_time": activity.start_time.isoformat() if activity.start_time else None,
        "duration_s": activity.duration_s,
        "distance_m": activity.distance_m,
        "elevation_gain_m": activity.elevation_gain_m,
        "avg_hr": activity.avg_hr,
        "max_hr": activity.max_hr,
        "avg_pace_s_per_km": activity.avg_pace_s_per_km,
        "avg_speed_kmh": activity.avg_speed_kmh,
        "avg_power_w": activity.avg_power_w,
        "normalized_power_w": activity.normalized_power_w,
        "tss": activity.tss,
        "ski_vertical_m": activity.ski_vertical_m,
        "ski_runs": activity.ski_runs,
        "notes": activity.notes,
    }

    try:
        text = coach_svc.debrief(activity_data, context, user=user)
    except Exception as exc:
        logger.exception("Coach debrief error")
        raise ai_unavailable(exc) from exc

    return DebriefResponse(debrief=text)


@router.post("/weekly-narrative", response_model=WeeklyNarrativeResponse)
async def generate_weekly_narrative(
    payload: WeeklyNarrativeRequest,
    db: AsyncSession = Depends(get_db),
) -> WeeklyNarrativeResponse:
    """Generate (and persist) an AI narrative for a weekly training plan."""
    user = await get_user(db)

    plan_result = await db.execute(
        select(TrainingPlan).where(
            TrainingPlan.id == payload.plan_id,
            TrainingPlan.user_id == user.id,
        )
    )
    plan = plan_result.scalar_one_or_none()
    if plan is None:
        raise HTTPException(status_code=404, detail="Training plan not found")

    context = await coach_svc.build_coaching_context(db, user)

    plan_data: dict[str, Any] = {
        "week_start": plan.week_start.isoformat(),
        "phase": plan.phase,
        "goal": plan.goal_description,
        "planned_tss": plan.planned_tss,
        "planned_hours": plan.planned_hours,
        "sessions": json.loads(plan.sessions) if plan.sessions else [],
    }

    try:
        narrative = coach_svc.weekly_narrative(plan_data, context, user=user)
    except Exception as exc:
        logger.exception("Weekly narrative error")
        raise ai_unavailable(exc) from exc

    plan.ai_narrative = narrative
    await db.commit()

    return WeeklyNarrativeResponse(narrative=narrative)


@router.get("/nutrition-advice", response_model=NutritionAdviceResponse)
async def get_nutrition_advice(db: AsyncSession = Depends(get_db)) -> NutritionAdviceResponse:
    """Generate today's personalised nutrition advice."""
    user = await get_user(db)
    context = await coach_svc.build_coaching_context(db, user)

    try:
        advice = coach_svc.nutrition_advice(context, user=user)
    except Exception as exc:
        logger.exception("Nutrition advice error")
        raise ai_unavailable(exc) from exc

    return NutritionAdviceResponse(advice=advice)


@router.get("/config")
async def get_coach_config(db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Return which LLM providers are configured and the active provider."""
    result = await db.execute(select(User).limit(1))
    user = result.scalar_one_or_none()
    active = (user.llm_provider if user and user.llm_provider else None) or settings.llm_provider or "claude"
    available = {
        "claude": bool(settings.anthropic_api_key),
        "gemini": bool(settings.gemini_api_key),
        "openai": bool(settings.openai_api_key),
    }
    return {
        "active_provider": active,
        "available": available,
        # warn if the active provider's key is not configured
        "active_key_missing": not available.get(active, False),
    }
