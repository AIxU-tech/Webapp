"""
Story Scout Agent — uses Haiku with web search to find AI news story candidates.

Returns 15-20 raw candidates with minimal metadata for the curator to rank and summarize.
"""

import anthropic

from backend.services.agents.base import call_claude_with_web_search, extract_json

SEARCH_MODEL = "claude-haiku-4-5-20251001"
MAX_SEARCH_USES = 18


def fetch_story_candidates(client: anthropic.Anthropic, current_date: str) -> list[dict]:
    """
    Search the web for recent AI news story candidates.

    Args:
        client: Anthropic API client
        current_date: Today's date in YYYY-MM-DD format

    Returns:
        List of 15-20 candidate dicts with: title, description, eventDate, sourceUrls
    """
    prompt = f"""Today is {current_date}. Find the 15-20 most significant AI news stories from the past 24-48 hours.

RECENCY IS CRITICAL:
- Today's date is {current_date}. Only include stories where the actual event/announcement happened within 48 hours of this date.
- Pay attention to article publication dates and the `page_age` field in search results — skip anything older than 48 hours.

SOURCE QUALITY: Only use reputable sources. Reputable means:
- Official company/lab blogs and press releases (e.g., OpenAI blog, Google AI blog, Meta AI blog)
- Major tech/science publications: The Verge, Ars Technica, TechCrunch, Wired, MIT Technology Review, Nature, Science
- Established news organizations
- Respected AI-focused outlets
- Do NOT use personal blogs, SEO content farms, or aggregator sites that just rewrite other articles

For each candidate, provide MINIMAL information — just enough to identify the story:
- title: Short headline
- description: 1 sentence describing what happened
- eventDate: YYYY-MM-DD of the event (MUST be within 48h of {current_date})
- sourceUrls: 4 URLs from reputable sources covering this story

Return JSON array:
```json
[
  {{
    "title": "...",
    "description": "...",
    "eventDate": "YYYY-MM-DD",
    "sourceUrls": ["https://...", "https://..."]
  }}
]
```

Find 15-20 candidates. Cast a wide net — the curator will narrow down to the best 3."""

    print(f"[Story Scout] Starting search for candidates...")

    content = call_claude_with_web_search(
        client,
        model=SEARCH_MODEL,
        prompt=prompt,
        max_tokens=8000,
        max_uses=MAX_SEARCH_USES,
        timeout=120.0,
    )

    result = extract_json(content)

    # Handle both list and dict with "stories" key
    if isinstance(result, dict):
        candidates = result.get("stories", result.get("candidates", []))
    else:
        candidates = result

    print(f"[Story Scout] Found {len(candidates)} candidates")
    return candidates
