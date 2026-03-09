import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.nutrition import NutritionProfile, NutritionProfileRead

router = APIRouter(prefix="/api/nutrition", tags=["nutrition"])


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


@router.post("/generate", status_code=501)
async def generate_nutrition() -> dict[str, Any]:
    # TODO: implement AI-driven nutrition recommendation generation (Phase 7)
    return {"status": "not_implemented"}
