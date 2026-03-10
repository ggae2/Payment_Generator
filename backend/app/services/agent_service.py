from dotenv import load_dotenv
load_dotenv()
import anthropic
import asyncio
import json
import logging
import os
from datetime import datetime
from app.tools.definitions import TOOLS
from app.tools.handlers import handle_tool_call

logger = logging.getLogger(__name__)

if not os.getenv("ANTHROPIC_API_KEY"):
    logger.error("ANTHROPIC_API_KEY is not set — agent chat will fail on every request")

client = anthropic.Anthropic()

SYSTEM = """You are a SWIFT/SEPA test file generation specialist.
Generate ISO 20022 XML test files for SIC/SEPA interbank testing.
Available tools: generate_pacs008 (single transfer), generate_batch_pacs008 (batch/stress with scenarios: normal, duplicate, invalid_iban, future_dates, high_value), validate_iban.
When a user describes a scenario: extract fields, fill missing ones with realistic Swiss/EU banking data, call the appropriate tool.
Always suggest related edge case scenarios after generating. Respond in the user's language."""

# Maximum number of messages to keep in history to avoid token-limit issues
MAX_HISTORY = 40
# Maximum agentic loop turns to prevent runaway tool chains
MAX_TURNS = 5


async def run_agent(message: str, client_context: dict, history: list) -> dict:
    messages = list(history)[-MAX_HISTORY:]  # cap history
    content = f"Client context: {json.dumps(client_context)}\n\n{message}" if client_context else message
    messages.append({"role": "user", "content": content})

    tool_results: list    = []
    generated_files: list = []
    text = ""

    for turn in range(MAX_TURNS):
        logger.info(f"Agent turn {turn + 1} — sending {len(messages)} messages to Anthropic")
        # Use asyncio.to_thread so the sync SDK call does not block the event loop
        resp = await asyncio.to_thread(
            client.messages.create,
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=SYSTEM,
            tools=TOOLS,
            messages=messages,
        )
        logger.info(f"Anthropic response — stop_reason={resp.stop_reason}, turn={turn + 1}")

        # Collect text from this turn (may be absent when stop_reason==tool_use)
        turn_text = next((b.text for b in resp.content if hasattr(b, "text")), "")
        if turn_text:
            text = turn_text

        if resp.stop_reason != "tool_use":
            # Final turn — append assistant message to history and stop
            messages.append({"role": "assistant", "content": _serialize_content(resp.content)})
            break

        # --- Tool-use turn: execute all tools, feed results back ---
        messages.append({"role": "assistant", "content": _serialize_content(resp.content)})

        tool_result_content = []
        for block in resp.content:
            if block.type != "tool_use":
                continue
            logger.info(f"Executing tool: {block.name} with input={block.input}")
            try:
                result = handle_tool_call(block.name, block.input)
            except Exception as exc:
                logger.exception(f"Tool {block.name} raised: {exc}")
                result = {"error": str(exc)}

            tool_results.append({"tool": block.name, "input": block.input, "result": result})

            if "xml" in result:
                ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
                generated_files.append({"name": f"{block.name}_{ts}.xml", "content": result["xml"]})
            if "files" in result:
                generated_files.extend(result["files"])

            tool_result_content.append({
                "type":        "tool_result",
                "tool_use_id": block.id,
                "content":     json.dumps(result),
            })

        # Feed tool results back so the LLM can produce its final answer
        messages.append({"role": "user", "content": tool_result_content})
    else:
        logger.warning(f"Agent reached MAX_TURNS ({MAX_TURNS}) without end_turn — truncating")

    return {
        "message":         text,
        "tool_results":    tool_results,
        "generated_files": generated_files,
        "history":         messages,
    }


def _serialize_content(content) -> list:
    """Convert Anthropic SDK content blocks to plain dicts for JSON-serialisable history."""
    out = []
    for block in content:
        if block.type == "text":
            out.append({"type": "text", "text": block.text})
        elif block.type == "tool_use":
            out.append({"type": "tool_use", "id": block.id, "name": block.name, "input": block.input})
    return out
