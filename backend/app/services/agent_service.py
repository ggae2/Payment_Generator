from dotenv import load_dotenv
load_dotenv()
import anthropic
import asyncio
import json
import logging
import os
from app.tools.definitions import TOOLS
from app.tools.handlers import handle_tool_call

logger = logging.getLogger(__name__)

if not os.getenv("ANTHROPIC_API_KEY"):
    logger.error("ANTHROPIC_API_KEY is not set — agent chat will fail on every request")

client = anthropic.Anthropic()

SYSTEM = """You are a SWIFT/SEPA test file generation specialist.
Generate ISO 20022 XML incoming test files (pacs.008, pain.001, pacs.002, camt.054) for SIC/SEPA interbank testing.
When a user describes a scenario: extract fields, fill missing ones with realistic Swiss/EU banking data, call tools.
Always suggest related edge case scenarios. Respond in the user's language."""

# Maximum number of messages to keep in history to avoid token-limit issues
MAX_HISTORY = 40


async def run_agent(message: str, client_context: dict, history: list) -> dict:
    messages = list(history)[-MAX_HISTORY:]  # cap history
    content = f"Client context: {json.dumps(client_context)}\n\n{message}" if client_context else message
    messages.append({"role": "user", "content": content})

    logger.info("Sending request to Anthropic API...")
    # Use asyncio.to_thread so the sync SDK call does not block the event loop
    resp = await asyncio.to_thread(
        client.messages.create,
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=SYSTEM,
        tools=TOOLS,
        messages=messages,
    )
    logger.info(f"Anthropic response received — stop_reason={resp.stop_reason}")

    tool_results    = []
    generated_files = []

    for block in resp.content:
        if block.type == "tool_use":
            logger.info(f"Executing tool: {block.name} with input={block.input}")
            try:
                result = handle_tool_call(block.name, block.input)
            except Exception as exc:
                logger.exception(f"Tool {block.name} raised an error: {exc}")
                result = {"error": str(exc)}
            tool_results.append({"tool": block.name, "input": block.input, "result": result})
            if "xml"   in result: generated_files.append({"name": f"{block.name}.xml", "content": result["xml"]})
            if "files" in result: generated_files.extend(result["files"])

    text = next((b.text for b in resp.content if hasattr(b, "text")), "")
    return {
        "message":         text,
        "tool_results":    tool_results,
        "generated_files": generated_files,
        "history":         messages,
    }
