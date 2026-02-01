"""
Paper Scout Agent — uses Haiku with web search to find AI research paper candidates.

Searches academic domains for notable recent papers.
Returns 10-12 raw candidates for the curator to rank and summarize.
"""

import anthropic

from backend.services.agents.base import call_claude_with_web_search, extract_json

SEARCH_MODEL = "claude-haiku-4-5-20251001"
MAX_SEARCH_USES = 12

ALLOWED_DOMAINS = [
    "arxiv.org",
    "openreview.net",
    "semanticscholar.org",
    "huggingface.co",
    "proceedings.neurips.cc",
    "proceedings.mlr.press",
]


def fetch_paper_candidates(client: anthropic.Anthropic, current_date: str) -> list[dict]:
    """
    Search the web for recent notable AI research papers.

    Args:
        client: Anthropic API client
        current_date: Today's date in YYYY-MM-DD format

    Returns:
        List of 10-12 candidate dicts with: title, authors, paperUrl, summary, sourceName
    """
    prompt = f"""Today is {current_date}. Find 10-12 of the most notable AI research papers from the past week.

RECENCY IS CRITICAL:
- Today's date is {current_date}. Only include papers published or posted within the past 7 days.
- Use search terms like "AI papers this week", "arxiv AI {current_date}", "new machine learning papers" to find the freshest results.
- Pay attention to submission/publication dates — skip anything older than 7 days from {current_date}.

Focus on papers that:
- Introduce novel techniques or architectures
- Achieve state-of-the-art results on important benchmarks
- Are getting significant attention in the AI community
- Come from top AI labs or major conferences (NeurIPS, ICML, ICLR, ACL, CVPR, etc.)

CRITICAL: You MUST provide complete, exact paper URLs with full arXiv IDs (e.g., 2601.14192). Do NOT use placeholder or partial IDs.

For each candidate, provide:
- title: Paper title
- authors: "Author1, Author2, et al."
- paperUrl: Full URL to the paper (e.g., https://arxiv.org/abs/2601.14192)
- summary: 1 sentence describing what the paper does
- sourceName: Where it was published (e.g., "arXiv", "NeurIPS 2025")

Return JSON array:
```json
[
  {{
    "title": "...",
    "authors": "...",
    "paperUrl": "https://arxiv.org/abs/...",
    "summary": "...",
    "sourceName": "arXiv"
  }}
]
```

Find 10-12 candidates. Cast a wide net — the curator will narrow down to the best 3."""

    print(f"[Paper Scout] Starting search for candidates...")

    content = call_claude_with_web_search(
        client,
        model=SEARCH_MODEL,
        prompt=prompt,
        max_tokens=8000,
        max_uses=MAX_SEARCH_USES,
        allowed_domains=ALLOWED_DOMAINS,
        timeout=120.0,
    )

    result = extract_json(content)

    if isinstance(result, dict):
        candidates = result.get("papers", result.get("candidates", []))
    else:
        candidates = result

    print(f"[Paper Scout] Found {len(candidates)} candidates")
    return candidates
