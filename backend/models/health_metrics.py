import datetime
from typing import Optional

from sqlalchemy import Integer, String, Float, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from pydantic import BaseModel

from database import Base


class HealthMetrics(Base):
    __tablename__ = "health_metrics"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_health_metrics_user_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    hrv_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    resting_hr: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    weight_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sleep_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sleep_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    steps: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    active_energy_kcal: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    body_battery: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    stress_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    blood_oxygen_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # apple_health/garmin/manual


# Pydantic schemas

class HealthMetricsCreate(BaseModel):
    user_id: int
    date: datetime.date
    hrv_ms: Optional[float] = None
    resting_hr: Optional[int] = None
    weight_kg: Optional[float] = None
    sleep_hours: Optional[float] = None
    sleep_score: Optional[int] = None
    steps: Optional[int] = None
    active_energy_kcal: Optional[float] = None
    body_battery: Optional[int] = None
    stress_score: Optional[int] = None
    blood_oxygen_pct: Optional[float] = None
    source: Optional[str] = None


class HealthMetricsRead(BaseModel):
    id: int
    user_id: int
    date: datetime.date
    hrv_ms: Optional[float] = None
    resting_hr: Optional[int] = None
    weight_kg: Optional[float] = None
    sleep_hours: Optional[float] = None
    sleep_score: Optional[int] = None
    steps: Optional[int] = None
    active_energy_kcal: Optional[float] = None
    body_battery: Optional[int] = None
    stress_score: Optional[int] = None
    blood_oxygen_pct: Optional[float] = None
    source: Optional[str] = None

    model_config = {"from_attributes": True}
