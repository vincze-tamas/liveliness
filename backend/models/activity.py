import datetime
from typing import Optional

from sqlalchemy import Integer, String, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from pydantic import BaseModel

from database import Base


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    source: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # garmin/apple_health/manual
    external_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    sport: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    start_time: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    duration_s: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    distance_m: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    elevation_gain_m: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    avg_hr: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_hr: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    avg_pace_s_per_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    avg_speed_kmh: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    avg_power_w: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    normalized_power_w: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    tss: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    trimp: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ski_vertical_m: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ski_runs: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    gpx_data: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # JSON-encoded
    fit_file_path: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )


# Pydantic schemas

class ActivityCreate(BaseModel):
    user_id: int
    source: Optional[str] = None
    external_id: Optional[str] = None
    sport: Optional[str] = None
    start_time: Optional[datetime.datetime] = None
    duration_s: Optional[int] = None
    distance_m: Optional[float] = None
    elevation_gain_m: Optional[float] = None
    avg_hr: Optional[int] = None
    max_hr: Optional[int] = None
    avg_pace_s_per_km: Optional[float] = None
    avg_speed_kmh: Optional[float] = None
    avg_power_w: Optional[float] = None
    normalized_power_w: Optional[float] = None
    tss: Optional[float] = None
    trimp: Optional[float] = None
    ski_vertical_m: Optional[float] = None
    ski_runs: Optional[int] = None
    gpx_data: Optional[str] = None
    fit_file_path: Optional[str] = None
    notes: Optional[str] = None


class ActivityRead(BaseModel):
    id: int
    user_id: int
    source: Optional[str] = None
    external_id: Optional[str] = None
    sport: Optional[str] = None
    start_time: Optional[datetime.datetime] = None
    duration_s: Optional[int] = None
    distance_m: Optional[float] = None
    elevation_gain_m: Optional[float] = None
    avg_hr: Optional[int] = None
    max_hr: Optional[int] = None
    avg_pace_s_per_km: Optional[float] = None
    avg_speed_kmh: Optional[float] = None
    avg_power_w: Optional[float] = None
    normalized_power_w: Optional[float] = None
    tss: Optional[float] = None
    trimp: Optional[float] = None
    ski_vertical_m: Optional[float] = None
    ski_runs: Optional[int] = None
    gpx_data: Optional[str] = None
    fit_file_path: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime.datetime

    model_config = {"from_attributes": True}
