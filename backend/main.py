from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import create_tables
from api.profile import router as profile_router
from api.health_sync import router as health_sync_router
from api.activities import router as activities_router
from api.training import router as training_router
from api.nutrition import router as nutrition_router
from api.weight_training import router as weight_training_router
from api.ai_coach import router as ai_coach_router
from api.statistics import router as statistics_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    await create_tables()
    yield


app = FastAPI(
    title="Liveliness API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile_router)
app.include_router(health_sync_router)
app.include_router(activities_router)
app.include_router(training_router)
app.include_router(nutrition_router)
app.include_router(weight_training_router)
app.include_router(ai_coach_router)
app.include_router(statistics_router)


@app.get("/health", tags=["health_check"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
