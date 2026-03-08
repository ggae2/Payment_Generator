from fastapi import APIRouter
from pydantic import BaseModel
from app.services.agent_service import run_agent

router = APIRouter()

class AgentRequest(BaseModel):
    message: str
    client_context: dict = {}
    history: list = []

@router.post("/chat")
async def agent_chat(req: AgentRequest):
    result = await run_agent(req.message, req.client_context, req.history)
    return result
