"""Shared FastAPI dependencies for all API routers."""
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User


async def get_user(db: AsyncSession) -> User:
    """Return the single app user, or raise 404 if profile not set up."""
    result = await db.execute(select(User).limit(1))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Profile not set up")
    return user


def ai_unavailable(exc: Exception) -> HTTPException:
    """Convert an AI-service exception into an appropriate 503 HTTPException."""
    msg = str(exc)
    if "ANTHROPIC_API_KEY" in msg or "api_key" in msg.lower():
        return HTTPException(
            status_code=503,
            detail="AI coaching unavailable: ANTHROPIC_API_KEY not configured",
        )
    return HTTPException(status_code=503, detail=f"AI coaching unavailable: {msg}")
