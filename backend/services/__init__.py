"""
Backend Services Module

This module contains business logic services that are separate from
route handlers. Services encapsulate complex operations that may be
used by multiple routes or scheduled tasks.

Services:
- ai_news: Fetches and processes top AI news stories using Claude
"""

from backend.services.ai_news import fetch_top_ai_stories, get_latest_stories

__all__ = [
    'fetch_top_ai_stories',
    'get_latest_stories'
]
