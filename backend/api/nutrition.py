import datetime
import logging
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.nutrition import (
    FoodLog,
    FoodLogCreate,
    FoodLogRead,
    NutritionProfile,
    NutritionProfileRead,
)
from models.user import User
from services.nutrition import (
    calculate_bmr,
    calculate_macros,
    calculate_tdee,
    get_training_type_for_date,
)
import services.ai_coach as coach_svc

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/nutrition", tags=["nutrition"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_user(db: AsyncSession) -> User:
    result = await db.execute(select(User).limit(1))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Profile not set up")
    return user


# ---------------------------------------------------------------------------
# Nutrition profile endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=list[NutritionProfileRead])
async def list_nutrition(
    days: int = 7,
    db: AsyncSession = Depends(get_db),
) -> list[NutritionProfileRead]:
    cutoff = datetime.date.today() - datetime.timedelta(days=days)
    result = await db.execute(
        select(NutritionProfile)
        .where(NutritionProfile.date >= cutoff)
        .order_by(NutritionProfile.date.desc())
    )
    return list(result.scalars().all())


@router.get("/today", response_model=NutritionProfileRead)
async def get_today_nutrition(db: AsyncSession = Depends(get_db)) -> NutritionProfileRead:
    today = datetime.date.today()
    result = await db.execute(
        select(NutritionProfile).where(NutritionProfile.date == today).limit(1)
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="No nutrition recommendation for today")
    return profile


@router.post("/generate", response_model=NutritionProfileRead)
async def generate_nutrition(db: AsyncSession = Depends(get_db)) -> NutritionProfileRead:
    """Calculate and upsert today's macro targets based on user profile + planned training."""
    user = await _get_user(db)

    # Validate required fields
    missing = [f for f in ("weight_kg", "height_cm", "sex", "birth_date") if not getattr(user, f)]
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Complete your profile to generate nutrition targets. Missing: {', '.join(missing)}",
        )

    today = datetime.date.today()
    birthday_this_year = user.birth_date.replace(year=today.year)
    age = today.year - user.birth_date.year - (1 if today < birthday_this_year else 0)

    bmr = calculate_bmr(user.weight_kg, user.height_cm, age, user.sex)
    tdee = calculate_tdee(bmr, user.activity_level or "moderate")
    training_type = await get_training_type_for_date(db, user.id, today)
    macros = calculate_macros(tdee, training_type)

    # Upsert — update existing record for today if one exists
    result = await db.execute(
        select(NutritionProfile).where(
            NutritionProfile.user_id == user.id,
            NutritionProfile.date == today,
        ).limit(1)
    )
    profile = result.scalar_one_or_none()

    if profile is None:
        profile = NutritionProfile(user_id=user.id, date=today)
        db.add(profile)

    profile.training_type = training_type
    profile.target_kcal = macros["target_kcal"]
    profile.target_protein_g = macros["target_protein_g"]
    profile.target_carbs_g = macros["target_carbs_g"]
    profile.target_fat_g = macros["target_fat_g"]
    profile.target_fluid_ml = macros["target_fluid_ml"]

    await db.commit()
    await db.refresh(profile)
    return profile


# ---------------------------------------------------------------------------
# Food log endpoints
# ---------------------------------------------------------------------------

@router.post("/log", response_model=FoodLogRead, status_code=201)
async def add_food_log(
    payload: FoodLogCreate,
    db: AsyncSession = Depends(get_db),
) -> FoodLogRead:
    entry = FoodLog(**payload.model_dump())
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.get("/log", response_model=dict)
async def get_food_log(
    date: Optional[datetime.date] = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return food log entries for a date (default today) plus daily macro totals."""
    target_date = date or datetime.date.today()
    user = await _get_user(db)

    result = await db.execute(
        select(FoodLog)
        .where(FoodLog.user_id == user.id, FoodLog.date == target_date)
        .order_by(FoodLog.created_at)
    )
    entries = list(result.scalars().all())

    totals = {
        "calories": sum(e.calories or 0 for e in entries),
        "protein_g": sum(e.protein_g or 0 for e in entries),
        "carbs_g": sum(e.carbs_g or 0 for e in entries),
        "fat_g": sum(e.fat_g or 0 for e in entries),
    }

    return {
        "date": target_date.isoformat(),
        "entries": [FoodLogRead.model_validate(e) for e in entries],
        "totals": totals,
    }


@router.delete("/log/{entry_id}", status_code=204)
async def delete_food_log(entry_id: int, db: AsyncSession = Depends(get_db)) -> None:
    result = await db.execute(select(FoodLog).where(FoodLog.id == entry_id))
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(status_code=404, detail="Food log entry not found")
    await db.delete(entry)
    await db.commit()


# ---------------------------------------------------------------------------
# Photo food recognition
# ---------------------------------------------------------------------------

_ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}


class PhotoAnalysisResult(BaseModel):
    food_description: str
    calories: float | None
    protein_g: float | None
    carbs_g: float | None
    fat_g: float | None
    notes: str | None = None


@router.post("/analyze-photo", response_model=PhotoAnalysisResult)
async def analyze_photo(image: UploadFile = File(...)) -> PhotoAnalysisResult:
    """Run Claude Vision on a food photo and return macro estimates WITHOUT saving.

    Use this for the preview / edit flow. Then submit confirmed values via POST /log.
    """
    if image.content_type not in _ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported image type '{image.content_type}'")

    image_bytes = await image.read()
    if len(image_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large (max 20 MB)")

    try:
        analysis = coach_svc.analyze_food_photo(image_bytes, image.content_type)
    except Exception as exc:
        logger.exception("Food photo analysis failed")
        error_msg = str(exc)
        if "ANTHROPIC_API_KEY" in error_msg or "api_key" in error_msg.lower():
            raise HTTPException(status_code=503, detail="AI unavailable: ANTHROPIC_API_KEY not configured") from exc
        raise HTTPException(status_code=503, detail=f"AI analysis failed: {error_msg}") from exc

    return PhotoAnalysisResult(
        food_description=analysis.get("food_description") or "",
        calories=analysis.get("calories"),
        protein_g=analysis.get("protein_g"),
        carbs_g=analysis.get("carbs_g"),
        fat_g=analysis.get("fat_g"),
        notes=analysis.get("notes"),
    )


@router.post("/log/photo", response_model=FoodLogRead, status_code=201)
async def log_food_from_photo(
    meal_type: str = Form(...),
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> FoodLogRead:
    """Upload a food photo; Claude Vision estimates macros and saves to the food log.

    The caller should present the returned entry to the user for confirmation/editing,
    then PATCH the entry (or delete + re-create) to correct Claude's estimates.
    """
    user = await _get_user(db)

    if image.content_type not in _ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported image type '{image.content_type}'. Use JPEG, PNG, GIF, or WebP.",
        )

    image_bytes = await image.read()
    if len(image_bytes) > 20 * 1024 * 1024:  # 20 MB limit
        raise HTTPException(status_code=413, detail="Image too large (max 20 MB)")

    try:
        analysis = coach_svc.analyze_food_photo(image_bytes, image.content_type)
    except Exception as exc:
        logger.exception("Food photo analysis failed")
        error_msg = str(exc)
        if "ANTHROPIC_API_KEY" in error_msg or "api_key" in error_msg.lower():
            raise HTTPException(status_code=503, detail="AI unavailable: ANTHROPIC_API_KEY not configured") from exc
        raise HTTPException(status_code=503, detail=f"AI analysis failed: {error_msg}") from exc

    entry = FoodLog(
        user_id=user.id,
        date=datetime.date.today(),
        meal_type=meal_type,
        food_description=analysis.get("food_description") or "Unknown food",
        calories=analysis.get("calories"),
        protein_g=analysis.get("protein_g"),
        carbs_g=analysis.get("carbs_g"),
        fat_g=analysis.get("fat_g"),
        source="photo",
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry
