import datetime
from typing import Optional

from sqlalchemy import Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from pydantic import BaseModel

from database import Base


class NutritionProfile(Base):
    __tablename__ = "nutrition_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    training_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # rest/easy/moderate/hard/long
    target_kcal: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    target_protein_g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    target_carbs_g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    target_fat_g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    target_fluid_ml: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String, nullable=True)


# Pydantic schemas

class NutritionProfileCreate(BaseModel):
    user_id: int
    date: datetime.date
    training_type: Optional[str] = None
    target_kcal: Optional[float] = None
    target_protein_g: Optional[float] = None
    target_carbs_g: Optional[float] = None
    target_fat_g: Optional[float] = None
    target_fluid_ml: Optional[float] = None
    notes: Optional[str] = None


class NutritionProfileRead(BaseModel):
    id: int
    user_id: int
    date: datetime.date
    training_type: Optional[str] = None
    target_kcal: Optional[float] = None
    target_protein_g: Optional[float] = None
    target_carbs_g: Optional[float] = None
    target_fat_g: Optional[float] = None
    target_fluid_ml: Optional[float] = None
    notes: Optional[str] = None

    model_config = {"from_attributes": True}
