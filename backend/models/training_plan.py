import datetime
from typing import Optional

from sqlalchemy import Integer, String, Float, Date, DateTime, ForeignKey, func
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


# Pydantic schemas

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
