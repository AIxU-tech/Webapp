"""
Curator Agents — uses Sonnet to rank and summarize scout candidates.

Takes raw candidates from scouts and produces final, polished output
matching the existing DB schema exactly.
"""

import json

import anthropic

from backend.services.agents.base import call_claude, extract_json

CURATOR_MODEL = "claude-sonnet-4-5-20250929"


def _build_story_curator_system(current_date: str) -> str:
    return f"""You are an AI news curator for a platform serving AI students and researchers. Your job is to take a list of candidate AI news stories and produce the final top 3.

Today's date is {current_date}.

RECENCY GATE (MANDATORY):
You MUST discard any story whose eventDate is more than 48 hours before {current_date}. If fewer than 3 stories pass this filter, return only the ones that do — never pad with stale stories.

IMAGE GATE (MANDATORY):
You MUST only select stories that have an imageUrl field with a non-empty value. Discard any story without an image. If fewer than 3 stories have images, return only the ones that do.

RANKING CRITERIA (in order of importance, applied AFTER the recency gate):
1. Recency — prefer stories from the last 24 hours over 48 hours
2. Impact — how significant is this for the AI field?
3. Relevance — how useful/interesting is this for AI students and researchers?
4. Diversity — avoid picking 3 stories about the same topic

OUTPUT FORMAT:
For each of the top 3 stories, produce a complete entry with:
- title: Clear, informative headline
- summary: 2-3 sentence summary written for an informed audience
- emoji: Single emoji representing the topic (e.g., 🤖, 🧠, 💰, 🔬, 🚀)
- eventDate: YYYY-MM-DD of the event
- imageUrl: Copy the imageUrl exactly from the candidate (required)
- sources: Array of source objects with url and sourceName only

For SOURCES: only include the two most reputable sources from the ones the scout chose. This should loosely be based on the following criteria:
- Official company/lab blogs and press releases (e.g., OpenAI blog, Google AI blog, Meta AI blog)
- Major tech/science publications: The Verge, Ars Technica, TechCrunch, Wired, MIT Technology Review, Nature, Science
- Established news organizations
- Respected AI-focused outlets

Return ONLY valid JSON:
```json
{{
  "stories": [
    {{
      "title": "...",
      "summary": "...",
      "emoji": "🤖",
      "eventDate": "YYYY-MM-DD",
      "imageUrl": "https://...",
      "sources": [
        {{
          "url": "https://...",
          "sourceName": "..."
        }}
      ]
    }}
  ]
}}
```"""


def _build_paper_curator_system(current_date: str) -> str:
    return f"""You are an AI research paper curator for a platform serving AI students, clubs, and researchers. 
    Your job is to take a list of candidate papers and produce the final top 3.

Today's date is {current_date}.

RECENCY GATE (MANDATORY):
You MUST discard any paper that was published or posted more than 7 days before {current_date}. 
If fewer than 3 papers pass this filter, return only the ones that do — never pad with stale papers.

RANKING CRITERIA (in order of importance, applied AFTER the recency gate):
1. Novelty — does the paper introduce genuinely new ideas or techniques?
2. Impact — is this likely to influence the field?
3. Community attention — is the AI community talking about this?
4. Practical applicability — can practitioners use these results?
5. Diversity — avoid picking 3 papers on the same subtopic

OUTPUT FORMAT:
For each of the top 3 papers, produce a complete entry with:
- title: Paper title
- authors: "Author1, Author2, et al."
- summary: Plain-language summary of what the paper does (2-3 sentences), followed by a newline and then the key findings/contributions (2-3 sentences). Both parts go in the same "summary" field.
- paperUrl: Full URL to the paper
- emoji: Single emoji representing the topic

Return ONLY valid JSON:
```json
{{
  "papers": [
    {{
      "title": "...",
      "authors": "...",
      "summary": "What the paper does...\\n\\nKey findings and contributions...",
      "paperUrl": "https://...",
      "emoji": "🧬"
    }}
  ]
}}
```"""


def curate_stories(client: anthropic.Anthropic, candidates: list[dict], current_date: str) -> list[dict]:
    """
    Rank and summarize story candidates, returning the top 3.

    Args:
        client: Anthropic API client
        candidates: Raw candidate dicts from the story scout
        current_date: Today's date in YYYY-MM-DD format

    Returns:
        List of up to 3 finalized story dicts matching DB schema
    """
    print(f"[Story Curator] Curating {len(candidates)} candidates...")

    system_prompt = _build_story_curator_system(current_date)
    user_message = f"Here are {len(candidates)} AI news story candidates. Pick the top 3 and produce full entries. Make sure the stories have an imageUrl field with a non-empty value.\n\n{json.dumps(candidates, indent=2)}"

    content = call_claude(
        client,
        model=CURATOR_MODEL,
        system=system_prompt,
        user_message=user_message,
        max_tokens=4000,
        timeout=60.0,
    )

    result = extract_json(content)
    stories = result.get("stories", []) if isinstance(result, dict) else result

    print(f"[Story Curator] Produced {len(stories)} stories")
    return stories


def curate_papers(client: anthropic.Anthropic, candidates: list[dict], current_date: str) -> list[dict]:
    """
    Rank and summarize paper candidates, returning the top 3.

    Args:
        client: Anthropic API client
        candidates: Raw candidate dicts from the paper scout
        current_date: Today's date in YYYY-MM-DD format

    Returns:
        List of up to 3 finalized paper dicts matching DB schema
    """
    print(f"[Paper Curator] Curating {len(candidates)} candidates...")

    system_prompt = _build_paper_curator_system(current_date)
    user_message = f"Here are {len(candidates)} AI research paper candidates. Pick the top 3 and produce full entries.\n\n{json.dumps(candidates, indent=2)}"

    content = call_claude(
        client,
        model=CURATOR_MODEL,
        system=system_prompt,
        user_message=user_message,
        max_tokens=4000,
        timeout=60.0,
    )

    result = extract_json(content)
    papers = result.get("papers", []) if isinstance(result, dict) else result

    print(f"[Paper Curator] Produced {len(papers)} papers")
    return papers
