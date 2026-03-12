import datetime
from typing import Optional

from sqlalchemy import Integer, String, Float, Date, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from pydantic import BaseModel

from database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    sex: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # male/female
    birth_date: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)
    weight_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    height_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_hr: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    resting_hr: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    vo2max: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    hrv_baseline: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ftp_running_pace_s_per_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ftp_cycling_w: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lthr: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    activity_level: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # sedentary/light/moderate/active/very_active
    garmin_username: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    garmin_password: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )


# Pydantic schemas

class UserCreate(BaseModel):
    name: Optional[str] = None
    sex: Optional[str] = None
    birth_date: Optional[datetime.date] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    activity_level: Optional[str] = None
    max_hr: Optional[int] = None
    resting_hr: Optional[int] = None
    vo2max: Optional[float] = None
    hrv_baseline: Optional[float] = None
    ftp_running_pace_s_per_km: Optional[float] = None
    ftp_cycling_w: Optional[float] = None
    lthr: Optional[int] = None
    garmin_username: Optional[str] = None
    garmin_password: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    sex: Optional[str] = None
    birth_date: Optional[datetime.date] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    activity_level: Optional[str] = None
    max_hr: Optional[int] = None
    resting_hr: Optional[int] = None
    vo2max: Optional[float] = None
    hrv_baseline: Optional[float] = None
    ftp_running_pace_s_per_km: Optional[float] = None
    ftp_cycling_w: Optional[float] = None
    lthr: Optional[int] = None
    garmin_username: Optional[str] = None
    garmin_password: Optional[str] = None


class UserRead(BaseModel):
    id: int
    name: Optional[str] = None
    sex: Optional[str] = None
    birth_date: Optional[datetime.date] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    activity_level: Optional[str] = None
    max_hr: Optional[int] = None
    resting_hr: Optional[int] = None
    vo2max: Optional[float] = None
    hrv_baseline: Optional[float] = None
    ftp_running_pace_s_per_km: Optional[float] = None
    ftp_cycling_w: Optional[float] = None
    lthr: Optional[int] = None
    garmin_username: Optional[str] = None
    created_at: datetime.datetime

    model_config = {"from_attributes": True}
