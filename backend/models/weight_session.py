import datetime
from typing import Optional

from sqlalchemy import Integer, String, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from pydantic import BaseModel, field_validator

from database import Base


class WeightSession(Base):
    __tablename__ = "weight_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    session_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # strength/power/maintenance
    exercises: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # JSON: [{name, sets, reps, weight_kg, rpe}]
    duration_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String, nullable=True)


# Pydantic schemas

class WeightSessionCreate(BaseModel):
    user_id: int
    date: datetime.date
    session_type: Optional[str] = None
    exercises: Optional[str] = None
    duration_min: Optional[int] = None
    notes: Optional[str] = None

    @field_validator("date")
    @classmethod
    def date_not_future(cls, v: datetime.date) -> datetime.date:
        if v > datetime.date.today():
            raise ValueError("Session date cannot be in the future")
        return v


class WeightSessionRead(BaseModel):
    id: int
    user_id: int
    date: datetime.date
    session_type: Optional[str] = None
    exercises: Optional[str] = None
    duration_min: Optional[int] = None
    notes: Optional[str] = None

    model_config = {"from_attributes": True}
