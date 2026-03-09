from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.weight_session import WeightSession, WeightSessionCreate, WeightSessionRead

router = APIRouter(prefix="/api/weights", tags=["weight_training"])


@router.get("/sessions", response_model=list[WeightSessionRead])
async def list_weight_sessions(db: AsyncSession = Depends(get_db)) -> list[WeightSessionRead]:
    result = await db.execute(select(WeightSession).order_by(WeightSession.date.desc()))
    return list(result.scalars().all())


@router.post("/sessions", response_model=WeightSessionRead, status_code=201)
async def create_weight_session(
    payload: WeightSessionCreate, db: AsyncSession = Depends(get_db)
) -> WeightSessionRead:
    session = WeightSession(**payload.model_dump())
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("/sessions/{session_id}", response_model=WeightSessionRead)
async def get_weight_session(
    session_id: int, db: AsyncSession = Depends(get_db)
) -> WeightSessionRead:
    result = await db.execute(select(WeightSession).where(WeightSession.id == session_id))
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Weight session not found")
    return session
