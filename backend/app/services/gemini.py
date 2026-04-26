import asyncio
import json
import logging

from google import genai
from google.genai import types

from ..config import settings

logger = logging.getLogger(__name__)

VALID_PRIORITIES = ("critical", "high", "medium", "low")

SYSTEM_INSTRUCTION = (
    "You are an AI assistant for AidFlow, a civic complaint platform in India. "
    "Analyze complaints and respond with ONLY a JSON object — no markdown, no explanation. "
    "Fields:\n"
    '- "priority": one of "critical", "high", "medium", "low"\n'
    "  critical = immediate danger (fire, road collapse, gas leak)\n"
    "  high = serious health/safety risk (sewage overflow, broken water supply, large pothole)\n"
    "  medium = significant civic issue (garbage build-up, broken streetlight, minor road damage)\n"
    "  low = minor inconvenience (small litter, cosmetic damage)\n"
    '- "summary": one sentence, max 20 words, describing the core issue and its impact\n'
    'Example: {"priority": "high", "summary": "Overflowing sewage near school poses serious health risk."}'
)

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


async def analyze_complaint(
    title: str,
    description: str,
    category: str,
    location: str,
) -> dict:
    """Returns {"priority": str, "ai_summary": str}. Falls back gracefully on any error."""
    if not settings.gemini_api_key:
        return {"priority": "medium", "ai_summary": ""}

    prompt = f"Title: {title}\nCategory: {category}\nLocation: {location}\nDescription: {description}"

    try:
        client = _get_client()
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    temperature=0.1,
                    max_output_tokens=120,
                ),
            ),
            timeout=8.0,
        )
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1].lstrip("json").strip()
        data = json.loads(text)
        priority = data.get("priority", "medium")
        if priority not in VALID_PRIORITIES:
            priority = "medium"
        return {"priority": priority, "ai_summary": data.get("summary", "")}
    except Exception as exc:
        logger.warning("Gemini analysis failed: %s", exc)
        return {"priority": "medium", "ai_summary": ""}
