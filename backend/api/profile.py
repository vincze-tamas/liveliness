from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.user import User, UserCreate, UserRead, UserUpdate

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("", response_model=UserRead)
async def get_profile(db: AsyncSession = Depends(get_db)) -> UserRead:
    result = await db.execute(select(User).limit(1))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Profile not set up")
    return user


@router.post("", response_model=UserRead, status_code=201)
async def create_profile(payload: UserCreate, db: AsyncSession = Depends(get_db)) -> UserRead:
    user = User(**payload.model_dump())
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.put("", response_model=UserRead)
async def update_profile(payload: UserUpdate, db: AsyncSession = Depends(get_db)) -> UserRead:
    result = await db.execute(select(User).limit(1))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Profile not set up")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user
