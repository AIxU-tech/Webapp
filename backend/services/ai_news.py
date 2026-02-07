"""
AI News Fetching & Chat Service

This module provides the core business logic for:
1. Fetching AI news stories and research papers via a 4-agent pipeline
   (Story Scout → Story Curator, Paper Scout → Paper Curator)
2. Interactive chat functionality about news content using Claude

Key Functions:
- fetch_top_ai_content(): Run the scout/curator pipeline to fetch content
- get_latest_stories(): Retrieve cached news stories
- get_latest_papers(): Retrieve cached research papers
- chat_with_story(): Interactive Q&A about a news story
- chat_with_paper(): Interactive Q&A about a research paper
"""

import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Optional

import anthropic

from backend.extensions import db
from backend.models.ai_news import (
    AINewsStory,
    AINewsSource,
    AIResearchPaper,
    AINewsChatMessage
)
from backend.services.image_extraction import extract_image_for_paper
from backend.services.agents.story_scout import fetch_story_candidates
from backend.services.agents.paper_scout import fetch_paper_candidates
from backend.services.agents.curator import curate_stories, curate_papers


# =============================================================================
# Configuration Constants
# =============================================================================

# Model used for chat interactions
CHAT_MODEL = "claude-sonnet-4-5-20250929"
CHAT_MAX_TOKENS = 8000

# Content fetch settings
NUM_STORIES = 3
NUM_PAPERS = 3

# Chat settings
MAX_CONVERSATION_HISTORY = 20  # Maximum messages to include for context


# =============================================================================
# Chat System Prompt Builder
# =============================================================================

def _build_chat_system_prompt(context_type: str, context_data: dict) -> str:
    """
    Build the system prompt for chat based on content type.

    Creates a detailed system prompt that gives Claude full context about
    the story or paper being discussed, enabling accurate and helpful responses.

    Args:
        context_type: Either 'story' or 'paper'
        context_data: The story or paper dict from to_dict()

    Returns:
        System prompt string with all relevant context
    """
    if context_type == 'story':
        # Build context for a news story
        sources_text = ""
        if context_data.get('sources'):
            sources_text = "\n\nSources:\n" + "\n".join([
                f"- {s.get('sourceName', 'Unknown')}: {s.get('articleTitle', 'No title')} ({s.get('url', '')})"
                for s in context_data['sources']
            ])

        return f"""You are an AI assistant helping users understand AI news stories. You are knowledgeable, helpful, and provide accurate information based on the context given.

CONTEXT - AI NEWS STORY:
Title: {context_data.get('title', 'Unknown')}

Summary:
{context_data.get('summary', 'No summary available')}

Why This Matters:
{context_data.get('significance', 'No significance information available')}

Categories: {', '.join(context_data.get('categories', []))}
Event Date: {context_data.get('eventDate', 'Unknown')}
{sources_text}

INSTRUCTIONS:
- IMPORTANT: Keep responses very short - 2-5 sentences maximum. Users want quick answers, not essays.
- Use plain text only. Never use markdown formatting like **, ##, ***, -, bullet points, or numbered lists.
- Be friendly and conversational in tone
- Answer questions about this specific news story
- If asked something not covered by the story context, briefly say so
- You can provide additional relevant AI knowledge to contextualize the story
- Do not make up facts - be honest about limitations"""

    else:  # paper
        return f"""You are an AI assistant helping users understand AI research papers. You are knowledgeable, helpful, and provide accurate information based on the context given.

CONTEXT - AI RESEARCH PAPER:
Title: {context_data.get('title', 'Unknown')}
Authors: {context_data.get('authors', 'Unknown')}
Source: {context_data.get('sourceName', 'Unknown')}
Publication Date: {context_data.get('publicationDate', 'Unknown')}

Summary:
{context_data.get('summary', 'No summary available')}

Key Findings:
{context_data.get('keyFindings', 'No key findings available')}

Why This Matters:
{context_data.get('significance', 'No significance information available')}

Categories: {', '.join(context_data.get('categories', []))}
Paper URL: {context_data.get('paperUrl', 'Not available')}

INSTRUCTIONS:
- IMPORTANT: Keep responses very short - 2-5 sentences maximum. Users want quick answers, not essays.
- Use plain text only. Never use markdown formatting like **, ##, ***, -, bullet points, or numbered lists.
- Be friendly and conversational in tone
- Answer questions about this specific research paper
- Explain technical concepts in accessible terms when possible
- If asked something not covered by the paper context, briefly say so
- You can provide additional relevant AI knowledge to contextualize the paper
- Do not make up facts - be honest about limitations"""


# =============================================================================
# Database Storage Functions
# =============================================================================

def _store_stories(stories_data: list, batch_id: str) -> list[dict]:
    """
    Store news stories and their sources in the database.

    Args:
        stories_data: List of story dictionaries from the curator
        batch_id: Unique identifier for this fetch batch

    Returns:
        List of stored story dictionaries (from to_dict())
    """
    stored = []

    for data in stories_data:
        story = AINewsStory(
            title=data.get('title', 'Untitled'),
            summary=data.get('summary', ''),
            significance=data.get('significance', ''),
            rank=data.get('rank', 99),
            batch_id=batch_id,
            image_url=data.get('imageUrl'),
            emoji=data.get('emoji')
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


def _store_papers(papers_data: list, batch_id: str) -> list[dict]:
    """
    Store research papers in the database.

    If no imageUrl is provided by Claude, attempts to extract one from
    the paper URL using Open Graph meta tags. Note that many paper
    repositories (like arXiv) don't have og:image tags, so papers will
    often not have images.

    Args:
        papers_data: List of paper dictionaries from Claude's response
        batch_id: Unique identifier for this fetch batch

    Returns:
        List of stored paper dictionaries (from to_dict())
    """
    stored = []

    for data in papers_data:
        # Get image URL from Claude's response, or try to extract from paper URL
        image_url = data.get('imageUrl')
        if not image_url:
            paper_url = data.get('paperUrl')
            if paper_url:
                image_url = extract_image_for_paper(paper_url)

        paper = AIResearchPaper(
            title=data.get('title', 'Untitled'),
            authors=data.get('authors'),
            summary=data.get('summary', ''),
            key_findings=data.get('keyFindings'),
            significance=data.get('significance'),
            paper_url=data.get('paperUrl'),
            source_name=data.get('sourceName'),
            rank=data.get('rank', 99),
            batch_id=batch_id,
            image_url=image_url,
            emoji=data.get('emoji')
        )

        if categories := data.get('categories'):
            paper.set_categories_list(categories)

        if pub_date := data.get('publicationDate'):
            try:
                paper.publication_date = datetime.strptime(pub_date, "%Y-%m-%d").date()
            except ValueError:
                pass

        db.session.add(paper)
        stored.append(paper.to_dict())

    db.session.commit()
    return stored


# =============================================================================
# Main Fetch Function (4-Agent Pipeline)
# =============================================================================

def _enrich_candidates_with_images(candidates: list[dict]) -> list[dict]:
    """
    Extract images for story candidates before curation.
    
    This allows the curator to filter by stories that have images.
    Images are extracted in parallel for better performance.
    
    Args:
        candidates: List of story candidate dicts from the scout
        
    Returns:
        The same candidates with imageUrl added where found
    """
    from backend.services.image_extraction import extract_image_from_url
    
    print(f"[AI News] Extracting images for {len(candidates)} story candidates...")
    
    def extract_for_candidate(candidate):
        """Extract image from a candidate's source URLs."""
        source_urls = candidate.get('sourceUrls', [])
        for url in source_urls:
            image_url = extract_image_from_url(url)
            if image_url:
                candidate['imageUrl'] = image_url
                return candidate
        return candidate
    
    # Extract images in parallel (limit workers to avoid overwhelming servers)
    with ThreadPoolExecutor(max_workers=8) as executor:
        enriched = list(executor.map(extract_for_candidate, candidates))
    
    with_images = sum(1 for c in enriched if c.get('imageUrl'))
    print(f"[AI News] Found images for {with_images}/{len(candidates)} candidates")
    
    return enriched


def _run_scout_with_retry(scout_fn, client, current_date, label):
    """Run a scout function with one automatic retry on APIError."""
    try:
        return scout_fn(client, current_date)
    except anthropic.APIError as e:
        print(f"[{label}] First attempt failed ({e}), retrying...")
        try:
            return scout_fn(client, current_date)
        except Exception as retry_err:
            print(f"[{label}] Retry also failed: {retry_err}")
            return None
    except Exception as e:
        print(f"[{label}] Failed: {e}")
        return None


def fetch_top_ai_content() -> dict:
    """
    Fetch top AI news stories and research papers using a 4-agent pipeline.

    Pipeline:
    1. Story Scout (Haiku + web search) and Paper Scout run in parallel
    2. Story Curator (Sonnet) and Paper Curator run in parallel on the candidates
    3. Results are stored in the database

    Returns:
        Dictionary containing:
        - success (bool): Whether the fetch succeeded
        - message (str): Human-readable result message
        - batch_id (str): Unique identifier for this fetch
        - stories_count (int): Number of stories fetched
        - papers_count (int): Number of papers fetched
        - stories (list): Stored story dictionaries
        - papers (list): Stored paper dictionaries
        - error (str, optional): Error message if failed
    """
    batch_id = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    current_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    try:
        print(f"[AI News] Starting 4-agent pipeline at {batch_id}")

        client = anthropic.Anthropic()

        # Phase 1: Run scouts in parallel
        story_candidates = None
        paper_candidates = None

        with ThreadPoolExecutor(max_workers=2) as executor:
            story_future = executor.submit(
                _run_scout_with_retry, fetch_story_candidates, client, current_date, "Story Scout"
            )
            paper_future = executor.submit(
                _run_scout_with_retry, fetch_paper_candidates, client, current_date, "Paper Scout"
            )

            story_candidates = story_future.result()
            paper_candidates = paper_future.result()

        # Extract images for story candidates before curation
        # so the curator can filter by stories that have images
        if story_candidates:
            story_candidates = _enrich_candidates_with_images(story_candidates)

        if not story_candidates and not paper_candidates:
            return {'success': False, 'error': 'Both scouts failed to find candidates', 'batch_id': batch_id}

        # Phase 2: Run curators in parallel on the candidates
        stories_data = []
        papers_data = []

        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = {}
            if story_candidates:
                futures[executor.submit(curate_stories, client, story_candidates, current_date)] = 'stories'
            if paper_candidates:
                futures[executor.submit(curate_papers, client, paper_candidates, current_date)] = 'papers'

            for future in as_completed(futures):
                content_type = futures[future]
                try:
                    result = future.result()
                    if content_type == 'stories':
                        stories_data = result
                    else:
                        papers_data = result
                except Exception as e:
                    print(f"[AI News] {content_type} curator failed: {e}")

        if not stories_data and not papers_data:
            return {'success': False, 'error': 'Both curators failed', 'batch_id': batch_id}

        # Phase 3: Store in database
        stored_stories = _store_stories(stories_data, batch_id) if stories_data else []
        stored_papers = _store_papers(papers_data, batch_id) if papers_data else []

        print(f"[AI News] Stored {len(stored_stories)} stories and {len(stored_papers)} papers")
        return {
            'success': True,
            'message': f'Fetched {len(stored_stories)} stories and {len(stored_papers)} papers',
            'batch_id': batch_id,
            'stories_count': len(stored_stories),
            'papers_count': len(stored_papers),
            'stories': stored_stories,
            'papers': stored_papers
        }

    except Exception as e:
        db.session.rollback()
        return {'success': False, 'error': str(e), 'batch_id': batch_id}


# Alias for backward compatibility with existing code
def fetch_top_ai_stories() -> dict:
    """Alias for fetch_top_ai_content() for backward compatibility."""
    return fetch_top_ai_content()


# =============================================================================
# Data Retrieval Functions
# =============================================================================

def get_latest_stories(limit: int = NUM_STORIES) -> list[dict]:
    """
    Get the most recent batch of news stories, ordered by rank.

    Args:
        limit: Maximum number of stories to return

    Returns:
        List of story dictionaries from the latest batch
    """
    latest = AINewsStory.query.order_by(AINewsStory.fetched_at.desc()).first()
    if not latest:
        return []

    stories = AINewsStory.query.filter_by(batch_id=latest.batch_id)\
        .order_by(AINewsStory.rank.asc()).limit(limit).all()
    return [s.to_dict() for s in stories]


def get_latest_papers(limit: int = NUM_PAPERS) -> list[dict]:
    """
    Get the most recent batch of research papers, ordered by rank.

    Args:
        limit: Maximum number of papers to return

    Returns:
        List of paper dictionaries from the latest batch
    """
    latest = AIResearchPaper.query.order_by(AIResearchPaper.fetched_at.desc()).first()
    if not latest:
        return []

    papers = AIResearchPaper.query.filter_by(batch_id=latest.batch_id)\
        .order_by(AIResearchPaper.rank.asc()).limit(limit).all()
    return [p.to_dict() for p in papers]


def get_latest_content(stories_limit: int = NUM_STORIES, papers_limit: int = NUM_PAPERS) -> dict:
    """
    Get the most recent batch of both stories and papers.

    This is the primary retrieval function for the News page, combining
    both content types in a single call for optimal performance.

    Args:
        stories_limit: Maximum number of stories to return
        papers_limit: Maximum number of papers to return

    Returns:
        Dictionary with 'stories' and 'papers' arrays
    """
    return {
        'stories': get_latest_stories(limit=stories_limit),
        'papers': get_latest_papers(limit=papers_limit)
    }


def get_story_by_id(story_id: int) -> Optional[dict]:
    """
    Get a single news story by its database ID.

    Args:
        story_id: The story's primary key

    Returns:
        Story dictionary or None if not found
    """
    story = AINewsStory.query.get(story_id)
    return story.to_dict() if story else None


def get_paper_by_id(paper_id: int) -> Optional[dict]:
    """
    Get a single research paper by its database ID.

    Args:
        paper_id: The paper's primary key

    Returns:
        Paper dictionary or None if not found
    """
    paper = AIResearchPaper.query.get(paper_id)
    return paper.to_dict() if paper else None


def get_stories_by_batch(batch_id: str) -> list[dict]:
    """
    Get all stories from a specific fetch batch.

    Args:
        batch_id: The batch identifier

    Returns:
        List of story dictionaries from that batch
    """
    stories = AINewsStory.query.filter_by(batch_id=batch_id)\
        .order_by(AINewsStory.rank.asc()).all()
    return [s.to_dict() for s in stories]


def get_papers_by_batch(batch_id: str) -> list[dict]:
    """
    Get all papers from a specific fetch batch.

    Args:
        batch_id: The batch identifier

    Returns:
        List of paper dictionaries from that batch
    """
    papers = AIResearchPaper.query.filter_by(batch_id=batch_id)\
        .order_by(AIResearchPaper.rank.asc()).all()
    return [p.to_dict() for p in papers]


# =============================================================================
# Batch Management Functions
# =============================================================================

def get_all_batches() -> list[dict]:
    """
    Get metadata for all fetch batches.

    Returns:
        List of batch info dictionaries with counts and timestamps
    """
    from sqlalchemy import func

    # Get story batches
    story_batches = db.session.query(
        AINewsStory.batch_id,
        func.min(AINewsStory.fetched_at).label('fetched_at'),
        func.count(AINewsStory.id).label('stories_count')
    ).group_by(AINewsStory.batch_id).all()

    # Get paper counts by batch
    paper_counts = {p.batch_id: p.papers_count for p in db.session.query(
        AIResearchPaper.batch_id,
        func.count(AIResearchPaper.id).label('papers_count')
    ).group_by(AIResearchPaper.batch_id).all()}

    batches = [{
        'batchId': b.batch_id,
        'fetchedAt': b.fetched_at.isoformat() if b.fetched_at else None,
        'storiesCount': b.stories_count,
        'papersCount': paper_counts.get(b.batch_id, 0)
    } for b in story_batches]

    # Sort by fetched_at descending
    batches.sort(key=lambda x: x['fetchedAt'] or '', reverse=True)
    return batches


def cleanup_old_batches(keep_count: int = 7) -> int:
    """
    Remove old batches, keeping the most recent ones.

    Cleans up both stories and papers from old batches to manage
    database size over time.

    Args:
        keep_count: Number of recent batches to keep

    Returns:
        Number of batches deleted
    """
    from sqlalchemy import func

    batch_ids = [b.batch_id for b in db.session.query(AINewsStory.batch_id)
        .group_by(AINewsStory.batch_id)
        .order_by(func.min(AINewsStory.fetched_at).desc()).all()]

    to_delete = batch_ids[keep_count:]
    if not to_delete:
        return 0

    # Delete both stories and papers for old batches
    deleted_stories = AINewsStory.query.filter(
        AINewsStory.batch_id.in_(to_delete)
    ).delete(synchronize_session=False)

    deleted_papers = AIResearchPaper.query.filter(
        AIResearchPaper.batch_id.in_(to_delete)
    ).delete(synchronize_session=False)

    db.session.commit()
    print(f"[AI News] Cleaned up {len(to_delete)} batches ({deleted_stories} stories, {deleted_papers} papers)")
    return len(to_delete)


# =============================================================================
# Chat Functionality
# =============================================================================

def _get_conversation_history(session_id: str) -> list[dict]:
    """
    Retrieve the conversation history for a chat session.

    Args:
        session_id: The UUID session identifier

    Returns:
        List of message dicts in Claude API format [{"role": "...", "content": "..."}]
    """
    messages = AINewsChatMessage.query.filter_by(session_id=session_id)\
        .order_by(AINewsChatMessage.created_at.asc())\
        .limit(MAX_CONVERSATION_HISTORY)\
        .all()

    return [{"role": msg.role, "content": msg.content} for msg in messages]


def chat_with_story(story_id: int, session_id: str, user_message: str) -> dict:
    """
    Send a chat message about a news story and get Claude's response.

    This function:
    1. Retrieves the story context
    2. Builds a system prompt with the story information
    3. Retrieves conversation history for the session
    4. Calls Claude to generate a response
    5. Stores both user message and assistant response in the database

    Args:
        story_id: The ID of the news story to chat about
        session_id: UUID string identifying this conversation session
        user_message: The user's question or message

    Returns:
        Dictionary with:
        - success (bool): Whether the operation succeeded
        - response (str): Claude's answer (if successful)
        - userMessage (dict): The stored user message object
        - assistantMessage (dict): The stored assistant message object
        - error (str, optional): Error message if failed
    """
    try:
        # Get the story
        story = AINewsStory.query.get(story_id)
        if not story:
            return {'success': False, 'error': 'Story not found'}

        story_data = story.to_dict()

        # Build system prompt with story context
        system_prompt = _build_chat_system_prompt('story', story_data)

        # Get conversation history
        history = _get_conversation_history(session_id)

        # Add the new user message to history for the API call
        messages = history + [{"role": "user", "content": user_message}]

        # Call Claude
        client = anthropic.Anthropic()
        response = client.messages.create(
            model=CHAT_MODEL,
            max_tokens=CHAT_MAX_TOKENS,
            system=system_prompt,
            messages=messages
        )

        # Extract the response text
        assistant_message = ""
        for block in response.content:
            if getattr(block, 'type', None) == 'text':
                assistant_message += block.text

        if not assistant_message:
            return {'success': False, 'error': 'No response from AI'}

        # Store the user message
        user_msg = AINewsChatMessage(
            session_id=session_id,
            story_id=story_id,
            role='user',
            content=user_message
        )
        db.session.add(user_msg)

        # Store the assistant message
        assistant_msg = AINewsChatMessage(
            session_id=session_id,
            story_id=story_id,
            role='assistant',
            content=assistant_message
        )
        db.session.add(assistant_msg)

        db.session.commit()

        return {
            'success': True,
            'response': assistant_message,
            'userMessage': user_msg.to_dict(),
            'assistantMessage': assistant_msg.to_dict()
        }

    except anthropic.APIError as e:
        db.session.rollback()
        print(f"[AI Chat] API error: {e}")
        return {'success': False, 'error': f'AI service error: {str(e)}'}
    except Exception as e:
        db.session.rollback()
        print(f"[AI Chat] Error: {e}")
        return {'success': False, 'error': str(e)}


def chat_with_paper(paper_id: int, session_id: str, user_message: str) -> dict:
    """
    Send a chat message about a research paper and get Claude's response.

    This function:
    1. Retrieves the paper context
    2. Builds a system prompt with the paper information
    3. Retrieves conversation history for the session
    4. Calls Claude to generate a response
    5. Stores both user message and assistant response in the database

    Args:
        paper_id: The ID of the research paper to chat about
        session_id: UUID string identifying this conversation session
        user_message: The user's question or message

    Returns:
        Dictionary with:
        - success (bool): Whether the operation succeeded
        - response (str): Claude's answer (if successful)
        - userMessage (dict): The stored user message object
        - assistantMessage (dict): The stored assistant message object
        - error (str, optional): Error message if failed
    """
    try:
        # Get the paper
        paper = AIResearchPaper.query.get(paper_id)
        if not paper:
            return {'success': False, 'error': 'Paper not found'}

        paper_data = paper.to_dict()

        # Build system prompt with paper context
        system_prompt = _build_chat_system_prompt('paper', paper_data)

        # Get conversation history
        history = _get_conversation_history(session_id)

        # Add the new user message to history for the API call
        messages = history + [{"role": "user", "content": user_message}]

        # Call Claude
        client = anthropic.Anthropic()
        response = client.messages.create(
            model=CHAT_MODEL,
            max_tokens=CHAT_MAX_TOKENS,
            system=system_prompt,
            messages=messages
        )

        # Extract the response text
        assistant_message = ""
        for block in response.content:
            if getattr(block, 'type', None) == 'text':
                assistant_message += block.text

        if not assistant_message:
            return {'success': False, 'error': 'No response from AI'}

        # Store the user message
        user_msg = AINewsChatMessage(
            session_id=session_id,
            paper_id=paper_id,
            role='user',
            content=user_message
        )
        db.session.add(user_msg)

        # Store the assistant message
        assistant_msg = AINewsChatMessage(
            session_id=session_id,
            paper_id=paper_id,
            role='assistant',
            content=assistant_message
        )
        db.session.add(assistant_msg)

        db.session.commit()

        return {
            'success': True,
            'response': assistant_message,
            'userMessage': user_msg.to_dict(),
            'assistantMessage': assistant_msg.to_dict()
        }

    except anthropic.APIError as e:
        db.session.rollback()
        print(f"[AI Chat] API error: {e}")
        return {'success': False, 'error': f'AI service error: {str(e)}'}
    except Exception as e:
        db.session.rollback()
        print(f"[AI Chat] Error: {e}")
        return {'success': False, 'error': str(e)}


def get_chat_history(session_id: str) -> list[dict]:
    """
    Get the full chat history for a session.

    Args:
        session_id: The UUID session identifier

    Returns:
        List of message dicts ordered by creation time
    """
    messages = AINewsChatMessage.query.filter_by(session_id=session_id)\
        .order_by(AINewsChatMessage.created_at.asc())\
        .all()

    return [msg.to_dict() for msg in messages]


def clear_chat_history(session_id: str) -> int:
    """
    Clear all messages for a chat session.

    Args:
        session_id: The UUID session identifier

    Returns:
        Number of messages deleted
    """
    deleted = AINewsChatMessage.query.filter_by(session_id=session_id)\
        .delete(synchronize_session=False)
    db.session.commit()
    return deleted
