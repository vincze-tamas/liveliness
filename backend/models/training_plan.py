import datetime
from typing import Optional

from sqlalchemy import Boolean, Integer, String, Float, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from pydantic import BaseModel

from database import Base


class TrainingPlan(Base):
    __tablename__ = "training_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    week_start: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    phase: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # base/build/peak/race/recovery
    goal_description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    planned_tss: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    planned_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sessions: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # JSON list
    ai_narrative: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    generated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )


class RaceGoal(Base):
    """A target race / event that drives periodization."""

    __tablename__ = "race_goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)              # e.g. "UTMB 2026"
    sport: Mapped[str] = mapped_column(String, nullable=False)             # trail_run / road_bike / …
    race_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    distance_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    target_time_s: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )


# Pydantic schemas — Race Goal

class RaceGoalCreate(BaseModel):
    name: str
    sport: str
    race_date: datetime.date
    distance_km: Optional[float] = None
    target_time_s: Optional[int] = None
    notes: Optional[str] = None
    is_active: bool = True


class RaceGoalUpdate(BaseModel):
    name: Optional[str] = None
    sport: Optional[str] = None
    race_date: Optional[datetime.date] = None
    distance_km: Optional[float] = None
    target_time_s: Optional[int] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class RaceGoalRead(BaseModel):
    id: int
    user_id: int
    name: str
    sport: str
    race_date: datetime.date
    distance_km: Optional[float] = None
    target_time_s: Optional[int] = None
    notes: Optional[str] = None
    is_active: bool
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


# Pydantic schemas — Training Plan

class TrainingPlanCreate(BaseModel):
    user_id: int
    week_start: datetime.date
    phase: Optional[str] = None
    goal_description: Optional[str] = None
    planned_tss: Optional[float] = None
    planned_hours: Optional[float] = None
    sessions: Optional[str] = None
    ai_narrative: Optional[str] = None


class TrainingPlanRead(BaseModel):
    id: int
    user_id: int
    week_start: datetime.date
    phase: Optional[str] = None
    goal_description: Optional[str] = None
    planned_tss: Optional[float] = None
    planned_hours: Optional[float] = None
    sessions: Optional[str] = None
    ai_narrative: Optional[str] = None
    generated_at: datetime.datetime

    model_config = {"from_attributes": True}
