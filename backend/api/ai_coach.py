from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix="/api/coach", tags=["ai_coach"])


@router.post("/chat", status_code=501)
async def coach_chat() -> dict[str, Any]:
    # TODO: implement Claude API chat integration (Phase 7)
    return {"status": "not_implemented"}


@router.post("/debrief/{activity_id}", status_code=501)
async def coach_debrief(activity_id: int) -> dict[str, Any]:
    # TODO: implement AI-powered activity debrief (Phase 7)
    return {"status": "not_implemented"}
