from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import generate, validate, agent
import logging
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="SIC/SEPA Incoming File Generator", version="1.0.0")

@app.on_event("startup")
async def startup_event():
    if not os.getenv("ANTHROPIC_API_KEY"):
        logger.error("ANTHROPIC_API_KEY is NOT set — agent /chat endpoint will fail")
    else:
        logger.info("Starting up SIC/SEPA Generator API... ✓ ANTHROPIC_API_KEY found")

app.add_middleware(
    CORSMiddleware,
   allow_origins=[
    "http://localhost:5173",
    "https://payment-generator-nu.vercel.app"
],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate.router, prefix="/api/generate", tags=["generate"])
app.include_router(validate.router, prefix="/api/validate", tags=["validate"])
app.include_router(agent.router,    prefix="/api/agent",    tags=["agent"])
