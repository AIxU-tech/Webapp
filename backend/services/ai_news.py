"""
AI News Fetching Service

Fetches top AI news stories using Claude's web search capabilities.
Stores results in the database for frontend retrieval.
"""

import json
import re
from datetime import datetime, timezone, timedelta
from typing import Optional

import anthropic

from backend.extensions import db
from backend.models.ai_news import AINewsStory, AINewsSource


# Configuration
CLAUDE_MODEL = "claude-sonnet-4-5-20250929"
MAX_TOKENS = 16000
NUM_STORIES = 3
SOURCES_PER_STORY = 2
MAX_SEARCH_USES = 15


def _build_prompt(num_stories: int, sources_per_story: int, yesterday_date: str) -> str:
    """Build the news fetch prompt with dynamic values."""
    return f"""Today is {yesterday_date}. Find the top {num_stories} most significant AI news stories from the past 24 hours.

IMPORTANT: Only include stories where the underlying EVENT/ANNOUNCEMENT happened in the last 24 hours. Do NOT include:
- Follow-up articles or analysis about older announcements
- Stories about events that happened days/weeks ago even if the article is recent
- Roundups or summaries of older news

For each story, find {sources_per_story} credible sources.

Return JSON:
```json
{{
  "stories": [
    {{
      "rank": 1,
      "title": "Headline",
      "summary": "1-2 paragraph summary",
      "significance": "Why this matters",
      "categories": ["research", "industry"],
      "eventDate": "YYYY-MM-DD",
      "sources": [
        {{
          "url": "https://...",
          "sourceName": "Publication",
          "articleTitle": "Article title",
          "excerpt": "Brief excerpt"
        }}
      ]
    }}
  ]
}}
```"""


def _call_claude_with_web_search(client: anthropic.Anthropic, prompt: str) -> list:
    """
    Call Claude API with web search tool and handle the agentic loop.

    Web search is a server-managed tool - the API executes searches automatically.
    We handle 'pause_turn' by continuing the conversation until 'end_turn'.
    """
    messages = [{"role": "user", "content": prompt}]
    web_search_tool = {
        "type": "web_search_20250305",
        "name": "web_search",
        "max_uses": MAX_SEARCH_USES
    }

    for iteration in range(5):  # Safety limit
        print(f"[AI News] API call {iteration + 1}")

        with client.messages.stream(
            model=CLAUDE_MODEL,
            max_tokens=MAX_TOKENS,
            tools=[web_search_tool],
            messages=messages
        ) as stream:
            response = stream.get_final_message()

        print(f"[AI News] Stop reason: {response.stop_reason}")

        if response.stop_reason == "end_turn":
            return response.content

        if response.stop_reason == "pause_turn":
            # Server tool execution paused - continue the conversation
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": "Continue."})
        else:
            # Unexpected stop reason or max_tokens - return what we have
            return response.content

    return response.content


def _extract_json(content_blocks: list) -> dict:
    """Extract and parse JSON from Claude's response content blocks."""
    # Concatenate all text blocks
    text = ""
    for block in content_blocks:
        if getattr(block, 'type', None) == "text":
            text += block.text

    if not text:
        raise ValueError("No text content in response")

    # Try to find JSON in code block first
    match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
    if match:
        return json.loads(match.group(1))

    # Fall back to finding raw JSON
    match = re.search(r'\{[\s\S]*"stories"[\s\S]*\}', text)
    if match:
        return json.loads(match.group(0))

    raise ValueError("No JSON found in response")


def _store_stories(stories_data: list, batch_id: str) -> list[dict]:
    """Store stories and sources in the database."""
    stored = []

    for data in stories_data:
        story = AINewsStory(
            title=data.get('title', 'Untitled'),
            summary=data.get('summary', ''),
            significance=data.get('significance', ''),
            rank=data.get('rank', 99),
            batch_id=batch_id
        )

        if categories := data.get('categories'):
            story.set_categories_list(categories)

        if event_date := data.get('eventDate'):
            try:
                story.event_date = datetime.strptime(event_date, "%Y-%m-%d").date()
            except ValueError:
                pass

        db.session.add(story)
        db.session.flush()

        for source_data in data.get('sources', []):
            source = AINewsSource(
                story_id=story.id,
                url=source_data.get('url', ''),
                source_name=source_data.get('sourceName', 'Unknown'),
                article_title=source_data.get('articleTitle'),
                excerpt=source_data.get('excerpt')
            )
            db.session.add(source)

        stored.append(story.to_dict())

    db.session.commit()
    return stored


def fetch_top_ai_stories() -> dict:
    """
    Fetch top AI news stories using Claude's web search.

    Returns dict with: success, message, batch_id, stories_count, stories (or error)
    """
    batch_id = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")

    try:
        print(f"[AI News] Starting fetch at {batch_id}")

        client = anthropic.Anthropic()
        prompt = _build_prompt(NUM_STORIES, SOURCES_PER_STORY, yesterday)

        # Call Claude with web search
        content = _call_claude_with_web_search(client, prompt)

        # Extract and parse JSON
        data = _extract_json(content)

        stories_data = data.get('stories', [])
        if not stories_data:
            return {'success': False, 'error': 'No stories in response', 'batch_id': batch_id}

        # Store in database
        stored = _store_stories(stories_data, batch_id)

        print(f"[AI News] Stored {len(stored)} stories")
        return {
            'success': True,
            'message': f'Fetched {len(stored)} stories',
            'batch_id': batch_id,
            'stories_count': len(stored),
            'stories': stored
        }

    except anthropic.APIError as e:
        db.session.rollback()
        return {'success': False, 'error': f'API error: {e}', 'batch_id': batch_id}
    except (ValueError, json.JSONDecodeError) as e:
        db.session.rollback()
        return {'success': False, 'error': f'Parse error: {e}', 'batch_id': batch_id}
    except Exception as e:
        db.session.rollback()
        return {'success': False, 'error': str(e), 'batch_id': batch_id}


def get_latest_stories(limit: int = NUM_STORIES) -> list[dict]:
    """Get most recent batch of stories, ordered by rank."""
    latest = AINewsStory.query.order_by(AINewsStory.fetched_at.desc()).first()
    if not latest:
        return []

    stories = AINewsStory.query.filter_by(batch_id=latest.batch_id)\
        .order_by(AINewsStory.rank.asc()).limit(limit).all()
    return [s.to_dict() for s in stories]


def get_story_by_id(story_id: int) -> Optional[dict]:
    """Get a single story by ID."""
    story = AINewsStory.query.get(story_id)
    return story.to_dict() if story else None


def get_stories_by_batch(batch_id: str) -> list[dict]:
    """Get all stories from a specific batch."""
    stories = AINewsStory.query.filter_by(batch_id=batch_id)\
        .order_by(AINewsStory.rank.asc()).all()
    return [s.to_dict() for s in stories]


def get_all_batches() -> list[dict]:
    """Get list of all fetch batches with metadata."""
    from sqlalchemy import func

    batches = db.session.query(
        AINewsStory.batch_id,
        func.min(AINewsStory.fetched_at).label('fetched_at'),
        func.count(AINewsStory.id).label('stories_count')
    ).group_by(AINewsStory.batch_id)\
     .order_by(func.min(AINewsStory.fetched_at).desc()).all()

    return [{
        'batchId': b.batch_id,
        'fetchedAt': b.fetched_at.isoformat() if b.fetched_at else None,
        'storiesCount': b.stories_count
    } for b in batches]


def cleanup_old_batches(keep_count: int = 7) -> int:
    """Remove old batches, keeping most recent keep_count."""
    from sqlalchemy import func

    batch_ids = [b.batch_id for b in db.session.query(AINewsStory.batch_id)
        .group_by(AINewsStory.batch_id)
        .order_by(func.min(AINewsStory.fetched_at).desc()).all()]

    to_delete = batch_ids[keep_count:]
    if not to_delete:
        return 0

    deleted = AINewsStory.query.filter(
        AINewsStory.batch_id.in_(to_delete)
    ).delete(synchronize_session=False)

    db.session.commit()
    print(f"[AI News] Cleaned up {len(to_delete)} batches ({deleted} stories)")
    return len(to_delete)
