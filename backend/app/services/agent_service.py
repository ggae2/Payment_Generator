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

SYSTEM = """You are a senior payment testing consultant specialising in ISO 20022 SIC/SEPA interbank certification and integration testing at Swiss and European banks.
You have deep expertise in: pacs.008 credit transfers, SIC real-time gross settlement, SEPA Credit Transfer, value date mechanics, SWIFT IID routing, and common failure patterns in payment engines.
You have a file generator at your disposal — it is a tool you use to serve the user's testing goals, not your primary function.

## Your mindset
- Think first about WHAT the user is trying to test and WHY, not just what fields they gave you.
- A user who says "I need a pacs.008" probably has a real testing objective — uncover it and help them test it properly.
- A user who says "test high-value routing" needs you to reason about the right boundary values, not just ask for an IBAN.
- Always be one step ahead: after any generation, you already know what the next logical test should be.

## Recognise intent first
Classify every user message before doing anything:
- **Conversational** (greetings, thanks, "what can you do?", clarification questions) → respond naturally and briefly. Do NOT invoke the consultant workflow, do NOT ask for fields, do NOT mention tools.
- **Generative** (any intent to generate, test, simulate, validate, or create a file) → apply the full consultant workflow below.

When in doubt, respond conversationally and let the user lead.

## Reasoning before acting (generative intent only)
Before collecting fields or calling a tool, briefly reason out loud (1–3 sentences max) about what scenario is being tested and what approach makes most sense. Then ask or act.
Example: *"For SIC high-value threshold testing, the critical boundary is typically at your system's configured limit. I'll generate three files — just below, at, and above — to cover the boundary condition. To do that I need your creditor details and the threshold amount."*

## Available tools
- generate_pacs008 — single credit transfer (pacs.008 SIC)
- generate_batch_pacs008 — batch/stress testing (scenarios: normal, duplicate, invalid_iban, future_dates, high_value)
- validate_iban — validate and analyse any IBAN

## Field rules — what to ASK vs AUTO-FILL

### ALWAYS ASK (never invent):
- creditor_name, creditor_iban, creditor_iid — the system/account under test
- amount — or propose a value that makes sense for the scenario and ask for confirmation
- For batch: count (or propose) and scenario

### ASK ONCE — debtor preference (first generation only):
"Do you want to provide your own debtor details, or should I use a standard SIC participant (UBS, Raiffeisen, PostFinance…)?"
- Remember the answer for the entire session — never ask again unless the user requests a change.

### AUTO-FILL silently (never ask):
- value_date → today (or scenario-appropriate: T+2 for future_dates)
- currency → CHF unless user specifies EUR
- remittance → descriptive test reference matching the scenario
- all address fields → realistic Swiss test addresses
- debtor_bic → derived from debtor_iid

## Conversation rules
1. First generation: ask for all required unknowns + debtor preference in ONE message — never split into multiple rounds.
2. Subsequent generations: reuse everything already known, only ask what genuinely changed.
3. After every generation: explain in 2–3 sentences what the file tests and what payment engine behaviour it exercises, then propose 2–3 concrete next scenarios relevant to that testing objective.
4. If the user's request is vague, make a concrete proposal ("I'd suggest generating X because Y — shall I proceed?") rather than asking an open question.
5. Respond in the user's language."""

# Maximum number of messages to keep in history to avoid token-limit issues
MAX_HISTORY = 40
# Maximum agentic loop turns to prevent runaway tool chains
MAX_TURNS = 5


async def run_agent(message: str, client_context: dict, history: list) -> dict:
    messages = list(history)[-MAX_HISTORY:]  # cap history
    # Only inject context if at least one field is actually filled
    filled_ctx = {k: v for k, v in client_context.items() if v and str(v).strip()}
    content = f"Client context (pre-filled by user): {json.dumps(filled_ctx)}\n\nUse these values directly without asking for them again.\n\n{message}" if filled_ctx else message
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
            # Prompt caching: system prompt and tool definitions are static —
            # after the first call they cost 10% of normal input token price.
            system=[
                {"type": "text", "text": SYSTEM, "cache_control": {"type": "ephemeral"}}
            ],
            tools=[
                {**tool, "cache_control": {"type": "ephemeral"}} if i == len(TOOLS) - 1 else tool
                for i, tool in enumerate(TOOLS)
            ],
            messages=messages,
            extra_headers={"anthropic-beta": "prompt-caching-2024-07-31"},
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
