import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.agent_service import run_agent

logger = logging.getLogger(__name__)
router = APIRouter()

class AgentRequest(BaseModel):
    message: str
    client_context: dict = {}
    history: list = []

@router.post("/chat")
async def agent_chat(req: AgentRequest):
    try:
        result = await run_agent(req.message, req.client_context, req.history)
        return result
    except Exception as exc:
        logger.exception(f"Agent error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))
