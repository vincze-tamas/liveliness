"""AI coaching service — Claude API integration.

Provides context assembly and Claude API calls for:
- Free-form coaching chat
- Post-activity debrief
- Weekly plan narrative generation
- Daily nutrition advice
- Photo food recognition (vision)
"""
from __future__ import annotations

import base64
import datetime
import json
import logging
from typing import Any

import anthropic
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.activity import Activity
from models.health_metrics import HealthMetrics
from models.training_plan import RaceGoal, TrainingPlan
from models.user import User
from services.training_load import compute_pmc

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """You are an expert endurance sports coach and nutritionist.
You coach athletes across trail running, mountain biking, road cycling, alpine skiing,
inline roller skating, and weight training. You are data-driven, concise, and
motivating. You always base advice on the athlete's actual training data provided
in the context. When data is missing, ask for it rather than guessing.

Respond conversationally but professionally. Use metric units. Keep responses
focused — don't pad with generic advice if the athlete's data tells a specific story.
"""


# ---------------------------------------------------------------------------
# Context assembly
# ---------------------------------------------------------------------------

async def build_coaching_context(db: AsyncSession, user_id: int) -> dict[str, Any]:
    """Assemble a rich coaching context dict from the database."""
    today = datetime.date.today()
    eight_weeks_ago = today - datetime.timedelta(weeks=8)
    four_weeks_ago = today - datetime.timedelta(weeks=4)

    # User profile
    user_result = await db.execute(select(User).where(User.id == user_id).limit(1))
    user: User | None = user_result.scalar_one_or_none()
    if user is None:
        return {}

    # Calculate age
    age: int | None = None
    if user.birth_date:
        age = today.year - user.birth_date.year - (
            1 if today < user.birth_date.replace(year=today.year) else 0
        )

    # Last 8 weeks of activities for PMC
    acts_result = await db.execute(
        select(Activity)
        .where(Activity.user_id == user_id, Activity.start_time >= datetime.datetime.combine(eight_weeks_ago, datetime.time.min))
        .order_by(Activity.start_time.desc())
    )
    activities = list(acts_result.scalars().all())

    # PMC (last 56 days)
    pmc_series = compute_pmc(activities, user, days=56)
    latest_pmc = pmc_series[-1] if pmc_series else {}

    # Last 4 weeks of activities for summary
    recent_activities = [
        a for a in activities
        if a.start_time and a.start_time.date() >= four_weeks_ago
    ]

    # Recent health metrics (last 14 days)
    health_result = await db.execute(
        select(HealthMetrics)
        .where(
            HealthMetrics.user_id == user_id,
            HealthMetrics.date >= today - datetime.timedelta(days=14),
        )
        .order_by(HealthMetrics.date.desc())
    )
    health_rows = list(health_result.scalars().all())

    # Latest HRV trend
    hrv_values = [h.hrv_ms for h in health_rows if h.hrv_ms is not None]
    avg_hrv_14d = round(sum(hrv_values) / len(hrv_values), 1) if hrv_values else None

    # Current training plan
    plan_result = await db.execute(
        select(TrainingPlan)
        .where(TrainingPlan.user_id == user_id)
        .order_by(TrainingPlan.week_start.desc())
        .limit(1)
    )
    current_plan = plan_result.scalar_one_or_none()

    # Active race goals
    race_result = await db.execute(
        select(RaceGoal)
        .where(RaceGoal.user_id == user_id, RaceGoal.is_active == True, RaceGoal.race_date >= today)  # noqa: E712
        .order_by(RaceGoal.race_date)
    )
    race_goals = list(race_result.scalars().all())

    # Build activity summaries for recent activities
    activity_summaries = []
    for a in recent_activities[:20]:  # cap at 20 to keep context size reasonable
        summary: dict[str, Any] = {
            "date": a.start_time.date().isoformat() if a.start_time else None,
            "sport": a.sport,
            "duration_min": round((a.duration_s or 0) / 60),
            "distance_km": round((a.distance_m or 0) / 1000, 1) if a.distance_m else None,
            "elevation_m": round(a.elevation_gain_m) if a.elevation_gain_m else None,
            "avg_hr": a.avg_hr,
            "tss": round(a.tss, 1) if a.tss else None,
            "notes": a.notes,
        }
        activity_summaries.append(summary)

    return {
        "today": today.isoformat(),
        "athlete": {
            "age": age,
            "sex": user.sex,
            "weight_kg": user.weight_kg,
            "height_cm": user.height_cm,
            "max_hr": user.max_hr,
            "resting_hr": user.resting_hr,
            "hrv_baseline_ms": user.hrv_baseline,
            "vo2max": user.vo2max,
            "ftp_cycling_w": user.ftp_cycling_w,
            "ftp_running_pace_s_per_km": user.ftp_running_pace_s_per_km,
            "lthr": user.lthr,
            "activity_level": user.activity_level,
        },
        "fitness": {
            "ctl": latest_pmc.get("ctl"),
            "atl": latest_pmc.get("atl"),
            "tsb": latest_pmc.get("tsb"),
            "avg_hrv_14d_ms": avg_hrv_14d,
        },
        "recent_activities": activity_summaries,
        "current_plan": {
            "phase": current_plan.phase,
            "goal": current_plan.goal_description,
            "planned_tss": current_plan.planned_tss,
            "planned_hours": current_plan.planned_hours,
            "week_start": current_plan.week_start.isoformat(),
        } if current_plan else None,
        "race_goals": [
            {
                "name": rg.name,
                "sport": rg.sport,
                "date": rg.race_date.isoformat(),
                "days_away": (rg.race_date - today).days,
                "distance_km": rg.distance_km,
            }
            for rg in race_goals
        ],
    }


def _context_to_text(ctx: dict[str, Any]) -> str:
    """Render the coaching context as a compact text block for Claude's context."""
    lines = [f"Date: {ctx.get('today', 'unknown')}"]

    athlete = ctx.get("athlete", {})
    if any(v is not None for v in athlete.values()):
        parts = []
        if athlete.get("age"):
            parts.append(f"age {athlete['age']}")
        if athlete.get("sex"):
            parts.append(athlete["sex"])
        if athlete.get("weight_kg"):
            parts.append(f"{athlete['weight_kg']} kg")
        if athlete.get("height_cm"):
            parts.append(f"{athlete['height_cm']} cm")
        if parts:
            lines.append(f"Athlete: {', '.join(parts)}")
        if athlete.get("max_hr"):
            lines.append(f"Max HR: {athlete['max_hr']} bpm  Resting HR: {athlete.get('resting_hr')} bpm  LTHR: {athlete.get('lthr')} bpm")
        if athlete.get("ftp_cycling_w"):
            lines.append(f"FTP cycling: {athlete['ftp_cycling_w']} W")
        if athlete.get("ftp_running_pace_s_per_km"):
            pace = athlete["ftp_running_pace_s_per_km"]
            lines.append(f"Threshold running pace: {int(pace // 60)}:{int(pace % 60):02d} /km")
        if athlete.get("hrv_baseline_ms"):
            lines.append(f"HRV baseline: {athlete['hrv_baseline_ms']} ms")

    fitness = ctx.get("fitness", {})
    if fitness.get("ctl") is not None:
        lines.append(
            f"Current fitness (PMC): CTL={fitness['ctl']}  ATL={fitness['atl']}  TSB={fitness['tsb']}"
        )
    if fitness.get("avg_hrv_14d_ms") is not None:
        lines.append(f"14-day avg HRV: {fitness['avg_hrv_14d_ms']} ms")

    plan = ctx.get("current_plan")
    if plan:
        lines.append(
            f"Current training phase: {plan['phase'] or 'unknown'}  Goal: {plan['goal'] or 'n/a'}"
        )
        lines.append(f"This week: planned {plan['planned_hours']} h / {plan['planned_tss']} TSS")

    goals = ctx.get("race_goals", [])
    if goals:
        for g in goals[:3]:
            lines.append(f"Race goal: {g['name']} ({g['sport']}) on {g['date']} — {g['days_away']} days away, {g['distance_km']} km")

    acts = ctx.get("recent_activities", [])
    if acts:
        lines.append(f"\nLast {len(acts)} activities (recent first):")
        for a in acts:
            parts = [f"{a['date']} {a['sport']}"]
            if a["duration_min"]:
                parts.append(f"{a['duration_min']} min")
            if a["distance_km"]:
                parts.append(f"{a['distance_km']} km")
            if a["elevation_m"]:
                parts.append(f"+{a['elevation_m']} m")
            if a["avg_hr"]:
                parts.append(f"avg HR {a['avg_hr']}")
            if a["tss"]:
                parts.append(f"TSS {a['tss']}")
            if a["notes"]:
                parts.append(f'notes: "{a["notes"]}"')
            lines.append("  " + "  |  ".join(parts))

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Claude API helpers
# ---------------------------------------------------------------------------

def _get_client() -> anthropic.Anthropic:
    if not settings.anthropic_api_key:
        raise ValueError("ANTHROPIC_API_KEY is not configured")
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


# ---------------------------------------------------------------------------
# Coaching functions
# ---------------------------------------------------------------------------

def chat(
    messages: list[dict[str, str]],
    context: dict[str, Any],
) -> str:
    """Free-form coaching chat. messages: list of {role, content}."""
    client = _get_client()

    context_text = _context_to_text(context)
    system = f"{_SYSTEM_PROMPT}\n\n## Athlete Data\n{context_text}"

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        system=system,
        messages=[{"role": m["role"], "content": m["content"]} for m in messages],
    )
    return response.content[0].text


def debrief(activity_data: dict[str, Any], context: dict[str, Any]) -> str:
    """Generate a post-activity debrief for a completed session."""
    client = _get_client()

    context_text = _context_to_text(context)
    sport = activity_data.get("sport", "activity")
    duration_min = round((activity_data.get("duration_s") or 0) / 60)
    distance_km = round((activity_data.get("distance_m") or 0) / 1000, 1)

    activity_text = json.dumps(
        {k: v for k, v in activity_data.items() if v is not None and k not in ("gpx_data", "fit_file_path")},
        default=str,
    )

    prompt = (
        f"Analyse this completed {sport} session and give a concise debrief:\n\n"
        f"Activity data:\n{activity_text}\n\n"
        f"Consider: how does this {duration_min} min / {distance_km} km session compare to "
        f"recent training? Is the athlete recovering well (TSB)? Any technique or pacing notes? "
        f"What should they focus on next?"
    )

    system = f"{_SYSTEM_PROMPT}\n\n## Athlete Data\n{context_text}"

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=600,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text


def weekly_narrative(plan_data: dict[str, Any], context: dict[str, Any]) -> str:
    """Generate an AI narrative / rationale for a weekly training plan."""
    client = _get_client()

    context_text = _context_to_text(context)
    plan_text = json.dumps(plan_data, default=str)

    prompt = (
        f"Write a motivating but concise weekly training plan narrative (3–5 sentences) "
        f"for the following plan. Explain the training rationale — why these sessions, "
        f"this load, and this focus given the athlete's current fitness and phase:\n\n"
        f"Plan:\n{plan_text}"
    )

    system = f"{_SYSTEM_PROMPT}\n\n## Athlete Data\n{context_text}"

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=400,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text


def nutrition_advice(context: dict[str, Any], tomorrow_plan: dict[str, Any] | None = None) -> str:
    """Generate personalised daily nutrition advice."""
    client = _get_client()

    context_text = _context_to_text(context)
    tomorrow_text = (
        f"\nTomorrow's planned training: {json.dumps(tomorrow_plan, default=str)}"
        if tomorrow_plan
        else "\nTomorrow: rest day or no plan yet."
    )

    prompt = (
        "Give brief, actionable daily nutrition advice for this athlete. "
        "Focus on: what to eat today for recovery/preparation, key macro targets, "
        "hydration, and any timing recommendations around training." + tomorrow_text
    )

    system = f"{_SYSTEM_PROMPT}\n\n## Athlete Data\n{context_text}"

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=400,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text


def analyze_food_photo(image_bytes: bytes, mime_type: str) -> dict[str, Any]:
    """Use Claude Vision to identify foods in an image and estimate macros.

    Returns a dict with:
      food_description, calories, protein_g, carbs_g, fat_g, notes
    """
    client = _get_client()

    image_b64 = base64.standard_b64encode(image_bytes).decode()

    prompt = (
        "Identify all food items visible in this photo. "
        "Estimate portion sizes and return a JSON object with these exact keys: "
        "food_description (string, comma-separated list of foods with portions), "
        "calories (number, total kcal), "
        "protein_g (number), "
        "carbs_g (number), "
        "fat_g (number), "
        "notes (string, any caveats about estimation accuracy). "
        "Return ONLY valid JSON, no markdown, no explanation outside the JSON."
    )

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=400,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": mime_type,
                            "data": image_b64,
                        },
                    },
                    {"type": "text", "text": prompt},
                ],
            }
        ],
    )

    raw = response.content[0].text.strip()
    # Strip markdown code fences if Claude wrapped the JSON
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("Claude returned non-JSON food analysis: %s", raw)
        result = {
            "food_description": "Unable to parse",
            "calories": None,
            "protein_g": None,
            "carbs_g": None,
            "fat_g": None,
            "notes": raw,
        }

    return result
