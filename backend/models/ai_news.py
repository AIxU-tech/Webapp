"""
AI News Story Model

This module defines the database model for storing AI news stories fetched
from web sources using Claude's web search capabilities.

Each AINewsStory represents a significant AI news event with multiple
supporting sources. Stories are fetched periodically (e.g., daily) and
ranked by significance as determined by Claude's analysis.

Database Schema:
- ai_news_stories: Main story records with title, summary, and metadata
- ai_news_sources: Supporting sources linked to each story (2-3 per story)
"""

from datetime import datetime, timezone
import json
from backend.extensions import db


class AINewsStory(db.Model):
    """
    Represents a top AI news story with its summary and metadata.

    Each story captures a significant AI event/development and includes:
    - A descriptive title and comprehensive summary
    - Significance explanation (why this story matters)
    - Ranking position (1-10, with 1 being most significant)
    - Multiple supporting sources for verification

    Stories are refreshed periodically and old stories are archived
    or deleted based on retention policies.
    """
    __tablename__ = 'ai_news_stories'

    # ==========================================================================
    # Primary Key & Core Fields
    # ==========================================================================
    id = db.Column(db.Integer, primary_key=True)

    # The headline/title of the news story
    title = db.Column(db.String(500), nullable=False)

    # Comprehensive summary of the event (2-4 paragraphs typically)
    summary = db.Column(db.Text, nullable=False)

    # Explanation of why this story is significant for AI students/researchers
    significance = db.Column(db.Text, nullable=False)

    # Ranking position within the batch (1 = most significant, 10 = least)
    rank = db.Column(db.Integer, nullable=False)

    # ==========================================================================
    # Categorization & Metadata
    # ==========================================================================

    # Category tags for filtering (e.g., ["research", "industry", "policy"])
    # Stored as JSON string
    categories = db.Column(db.Text, nullable=True)

    # Unique identifier for the fetch batch (allows grouping stories from same fetch)
    # Format: ISO timestamp of when the fetch was initiated
    batch_id = db.Column(db.String(50), nullable=False, index=True)

    # ==========================================================================
    # Timestamps
    # ==========================================================================

    # When this story was fetched and stored
    fetched_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True
    )

    # Approximate date the original news event occurred (as reported in sources)
    event_date = db.Column(db.Date, nullable=True)

    # ==========================================================================
    # Relationships
    # ==========================================================================

    # One-to-many relationship: each story has 2-3 supporting sources
    sources = db.relationship(
        'AINewsSource',
        backref='story',
        lazy='dynamic',
        cascade='all, delete-orphan'
    )

    # ==========================================================================
    # Helper Methods for JSON Fields
    # ==========================================================================

    def get_categories_list(self) -> list[str]:
        """
        Parse the categories JSON string into a Python list.

        Returns:
            List of category strings, or empty list if none set.
        """
        if self.categories:
            try:
                return json.loads(self.categories)
            except json.JSONDecodeError:
                return []
        return []

    def set_categories_list(self, categories: list[str]) -> None:
        """
        Convert a list of categories to JSON string for storage.

        Args:
            categories: List of category strings to store.
        """
        self.categories = json.dumps(categories) if categories else None

    # ==========================================================================
    # Serialization
    # ==========================================================================

    def to_dict(self) -> dict:
        """
        Convert the story to a dictionary for JSON API responses.

        Returns:
            Dictionary containing all story fields and nested sources.
            Format is ready for direct JSON serialization to frontend.
        """
        return {
            'id': self.id,
            'title': self.title,
            'summary': self.summary,
            'significance': self.significance,
            'rank': self.rank,
            'categories': self.get_categories_list(),
            'batchId': self.batch_id,
            'fetchedAt': self.fetched_at.isoformat() if self.fetched_at else None,
            'eventDate': self.event_date.isoformat() if self.event_date else None,
            # Include all sources as nested objects
            'sources': [source.to_dict() for source in self.sources.all()]
        }

    def __repr__(self) -> str:
        return f'<AINewsStory #{self.rank}: {self.title[:50]}...>'


class AINewsSource(db.Model):
    """
    Represents a source/reference for an AI news story.

    Each story should have 2-3 sources to provide multiple perspectives
    and allow users to verify information. Sources include the article
    URL, publication name, and a brief excerpt showing how this source
    covers the story.
    """
    __tablename__ = 'ai_news_sources'

    # ==========================================================================
    # Primary Key & Foreign Key
    # ==========================================================================
    id = db.Column(db.Integer, primary_key=True)

    # Foreign key linking to the parent story
    story_id = db.Column(
        db.Integer,
        db.ForeignKey('ai_news_stories.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )

    # ==========================================================================
    # Source Information
    # ==========================================================================

    # Full URL to the source article
    url = db.Column(db.String(2000), nullable=False)

    # Name of the publication (e.g., "TechCrunch", "MIT Technology Review")
    source_name = db.Column(db.String(200), nullable=False)

    # Title of the specific article
    article_title = db.Column(db.String(500), nullable=True)

    # Brief excerpt or description of how this source covers the story
    excerpt = db.Column(db.Text, nullable=True)

    # ==========================================================================
    # Serialization
    # ==========================================================================

    def to_dict(self) -> dict:
        """
        Convert the source to a dictionary for JSON API responses.

        Returns:
            Dictionary containing source URL, name, title, and excerpt.
        """
        return {
            'id': self.id,
            'url': self.url,
            'sourceName': self.source_name,
            'articleTitle': self.article_title,
            'excerpt': self.excerpt
        }

    def __repr__(self) -> str:
        return f'<AINewsSource: {self.source_name}>'
