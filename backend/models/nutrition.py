import datetime
from typing import Optional

from sqlalchemy import Integer, String, Float, Date, DateTime, ForeignKey, func
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


class FoodLog(Base):
    __tablename__ = "food_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    meal_type: Mapped[str] = mapped_column(String, nullable=False)  # breakfast/lunch/dinner/snack
    food_description: Mapped[str] = mapped_column(String, nullable=False)
    calories: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    protein_g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    carbs_g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fat_g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    source: Mapped[str] = mapped_column(String, nullable=False, default="manual")  # manual/photo
    image_path: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)


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


class FoodLogCreate(BaseModel):
    user_id: int
    date: datetime.date
    meal_type: str
    food_description: str
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    source: str = "manual"
    image_path: Optional[str] = None


class FoodLogRead(BaseModel):
    id: int
    user_id: int
    date: datetime.date
    meal_type: str
    food_description: str
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    source: str
    image_path: Optional[str] = None
    created_at: datetime.datetime

    model_config = {"from_attributes": True}
