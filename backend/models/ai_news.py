"""
AI News Models Module

This module defines the database models for storing AI news content:
- AINewsStory: News stories fetched from web sources
- AINewsSource: Supporting sources for news stories
- AIResearchPaper: Notable AI research papers
- AINewsChatMessage: Chat conversations about stories and papers

Each AINewsStory represents a significant AI news event with multiple
supporting sources. Stories are fetched periodically using Claude's
web search capabilities and ranked by significance.

Database Schema:
- ai_news_stories: Main story records with title, summary, and metadata
- ai_news_sources: Supporting sources linked to each story (2-3 per story)
- ai_research_papers: Research paper records with findings and metadata
- ai_news_chat_messages: Chat message history for interactive AI discussions
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

    Attributes:
        id: Primary key
        title: The headline/title of the news story
        summary: Comprehensive summary (2-4 paragraphs typically)
        significance: Why this story matters for AI students/researchers
        rank: Position within the batch (1 = most significant)
        categories: JSON string of category tags for filtering
        batch_id: Groups stories from the same fetch operation
        fetched_at: When this story was fetched and stored
        event_date: When the original news event occurred
        sources: Related AINewsSource objects
        chat_messages: Related AINewsChatMessage objects
    """
    __tablename__ = 'ai_news_stories'

    # =========================================================================
    # Primary Key & Core Fields
    # =========================================================================
    id = db.Column(db.Integer, primary_key=True)

    # The headline/title of the news story
    title = db.Column(db.String(500), nullable=False)

    # Comprehensive summary of the event (2-4 paragraphs typically)
    summary = db.Column(db.Text, nullable=False)

    # Explanation of why this story is significant for AI students/researchers
    significance = db.Column(db.Text, nullable=False)

    # Ranking position within the batch (1 = most significant, 10 = least)
    rank = db.Column(db.Integer, nullable=False)

    # =========================================================================
    # Categorization & Metadata
    # =========================================================================

    # Category tags for filtering (e.g., ["research", "industry", "policy"])
    # Stored as JSON string
    categories = db.Column(db.Text, nullable=True)

    # Unique identifier for the fetch batch (allows grouping stories from same fetch)
    # Format: ISO timestamp of when the fetch was initiated
    batch_id = db.Column(db.String(50), nullable=False, index=True)

    # =========================================================================
    # Timestamps
    # =========================================================================

    # When this story was fetched and stored
    fetched_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True
    )

    # Approximate date the original news event occurred (as reported in sources)
    event_date = db.Column(db.Date, nullable=True)

    # =========================================================================
    # Visual & Display Fields
    # =========================================================================

    # URL to the main article image (hero image, og:image, etc.)
    image_url = db.Column(db.String(2000), nullable=True)

    # Single emoji representing the story's topic (e.g., "🤖", "🧠", "💰")
    emoji = db.Column(db.String(10), nullable=True)

    # =========================================================================
    # Relationships
    # =========================================================================

    # One-to-many relationship: each story has 2-3 supporting sources
    sources = db.relationship(
        'AINewsSource',
        backref='story',
        lazy='dynamic',
        cascade='all, delete-orphan'
    )

    # =========================================================================
    # Helper Methods for JSON Fields
    # =========================================================================

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

    # =========================================================================
    # Serialization
    # =========================================================================

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
            'imageUrl': self.image_url,
            'emoji': self.emoji,
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

    Attributes:
        id: Primary key
        story_id: Foreign key to the parent AINewsStory
        url: Full URL to the source article
        source_name: Publication name (e.g., "TechCrunch")
        article_title: Title of the specific article
        excerpt: Brief description of how this source covers the story
    """
    __tablename__ = 'ai_news_sources'

    # =========================================================================
    # Primary Key & Foreign Key
    # =========================================================================
    id = db.Column(db.Integer, primary_key=True)

    # Foreign key linking to the parent story
    story_id = db.Column(
        db.Integer,
        db.ForeignKey('ai_news_stories.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )

    # =========================================================================
    # Source Information
    # =========================================================================

    # Full URL to the source article
    url = db.Column(db.String(2000), nullable=False)

    # Name of the publication (e.g., "TechCrunch", "MIT Technology Review")
    source_name = db.Column(db.String(200), nullable=False)

    # Title of the specific article
    article_title = db.Column(db.String(500), nullable=True)

    # Brief excerpt or description of how this source covers the story
    excerpt = db.Column(db.Text, nullable=True)

    # =========================================================================
    # Serialization
    # =========================================================================

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


class AIResearchPaper(db.Model):
    """
    Represents a notable AI research paper.

    Each paper captures recent significant AI research findings and includes:
    - Paper title and authors
    - A plain-language summary accessible to students
    - Key findings and contributions
    - Significance explanation for the AI community
    - Link to the paper source (arXiv, conference proceedings, etc.)

    Papers are fetched alongside news stories and ranked by significance.

    Attributes:
        id: Primary key
        title: Paper title
        authors: Author names (comma-separated or "et al." format)
        summary: Plain-language summary of the paper
        key_findings: Main contributions and results
        significance: Why this paper matters
        paper_url: Link to the full paper
        source_name: Where the paper was published (e.g., "arXiv", "NeurIPS")
        rank: Position within the batch (1 = most significant)
        categories: JSON string of category tags
        batch_id: Groups papers from the same fetch operation
        fetched_at: When this paper was fetched
        publication_date: When the paper was published
        chat_messages: Related AINewsChatMessage objects
    """
    __tablename__ = 'ai_research_papers'

    # =========================================================================
    # Primary Key & Core Fields
    # =========================================================================
    id = db.Column(db.Integer, primary_key=True)

    # Paper title
    title = db.Column(db.String(500), nullable=False)

    # Authors (e.g., "Smith, Johnson, et al." or full list)
    authors = db.Column(db.String(1000), nullable=True)

    # Plain-language summary accessible to students
    summary = db.Column(db.Text, nullable=False)

    # Main contributions and results
    key_findings = db.Column(db.Text, nullable=True)

    # Why this paper matters for the AI community
    significance = db.Column(db.Text, nullable=True)

    # Link to the full paper (arXiv, conference, etc.)
    paper_url = db.Column(db.String(2000), nullable=True)

    # Publication venue (e.g., "arXiv", "NeurIPS 2025", "Nature")
    source_name = db.Column(db.String(200), nullable=True)

    # Ranking position within the batch
    rank = db.Column(db.Integer, nullable=False)

    # =========================================================================
    # Categorization & Metadata
    # =========================================================================

    # Category tags for filtering (e.g., ["LLM", "reasoning", "multimodal"])
    categories = db.Column(db.Text, nullable=True)

    # Batch identifier for grouping papers from the same fetch
    batch_id = db.Column(db.String(50), nullable=False, index=True)

    # When this paper was fetched
    fetched_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True
    )

    # When the paper was originally published
    publication_date = db.Column(db.Date, nullable=True)

    # =========================================================================
    # Visual & Display Fields
    # =========================================================================

    # URL to a paper figure, diagram, or related image
    image_url = db.Column(db.String(2000), nullable=True)

    # Single emoji representing the paper's topic (e.g., "🧬", "🔬", "📊")
    emoji = db.Column(db.String(10), nullable=True)

    # =========================================================================
    # Helper Methods for JSON Fields
    # =========================================================================

    def get_categories_list(self) -> list[str]:
        """Parse the categories JSON string into a Python list."""
        if self.categories:
            try:
                return json.loads(self.categories)
            except json.JSONDecodeError:
                return []
        return []

    def set_categories_list(self, categories: list[str]) -> None:
        """Convert a list of categories to JSON string for storage."""
        self.categories = json.dumps(categories) if categories else None

    # =========================================================================
    # Serialization
    # =========================================================================

    def to_dict(self) -> dict:
        """Convert the paper to a dictionary for JSON API responses."""
        return {
            'id': self.id,
            'title': self.title,
            'authors': self.authors,
            'summary': self.summary,
            'keyFindings': self.key_findings,
            'significance': self.significance,
            'paperUrl': self.paper_url,
            'sourceName': self.source_name,
            'rank': self.rank,
            'categories': self.get_categories_list(),
            'batchId': self.batch_id,
            'fetchedAt': self.fetched_at.isoformat() if self.fetched_at else None,
            'publicationDate': self.publication_date.isoformat() if self.publication_date else None,
            'imageUrl': self.image_url,
            'emoji': self.emoji
        }

    def __repr__(self) -> str:
        return f'<AIResearchPaper #{self.rank}: {self.title[:50]}...>'


class AINewsChatMessage(db.Model):
    """
    Represents a single message in a chat conversation about AI news or research.

    Users can ask questions about news stories or research papers, and Claude
    responds with context-aware answers. Each message stores:
    - The conversation context (story_id or paper_id)
    - The message role (user or assistant)
    - The message content
    - Session ID for grouping conversation turns

    Messages are linked to either a news story OR a research paper (never both).
    The conversation history is used to provide context for follow-up questions.

    Attributes:
        id: Primary key
        session_id: UUID grouping messages in a conversation
        story_id: Foreign key to AINewsStory (optional)
        paper_id: Foreign key to AIResearchPaper (optional)
        role: Message role ('user' or 'assistant')
        content: The actual message text
        created_at: When the message was created
        story: Related AINewsStory object (if story_id is set)
        paper: Related AIResearchPaper object (if paper_id is set)
    """
    __tablename__ = 'ai_news_chat_messages'

    # =========================================================================
    # Primary Key & Core Fields
    # =========================================================================
    id = db.Column(db.Integer, primary_key=True)

    # The session ID groups messages in a conversation (UUID string)
    # This allows multiple independent conversations about the same story/paper
    session_id = db.Column(db.String(36), nullable=False, index=True)

    # Link to either a news story or research paper (one must be set)
    story_id = db.Column(
        db.Integer,
        db.ForeignKey('ai_news_stories.id', ondelete='CASCADE'),
        nullable=True,
        index=True
    )
    paper_id = db.Column(
        db.Integer,
        db.ForeignKey('ai_research_papers.id', ondelete='CASCADE'),
        nullable=True,
        index=True
    )

    # Message role: 'user' for user questions, 'assistant' for Claude responses
    role = db.Column(db.String(20), nullable=False)

    # The actual message content
    content = db.Column(db.Text, nullable=False)

    # =========================================================================
    # Timestamps
    # =========================================================================

    # When this message was created
    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True
    )

    # =========================================================================
    # Relationships
    # =========================================================================

    # Many-to-one: each message belongs to a story (optional)
    story = db.relationship('AINewsStory', backref='chat_messages', lazy='joined')

    # Many-to-one: each message belongs to a paper (optional)
    paper = db.relationship('AIResearchPaper', backref='chat_messages', lazy='joined')

    # =========================================================================
    # Serialization
    # =========================================================================

    def to_dict(self) -> dict:
        """
        Convert the message to a dictionary for JSON API responses.

        Returns:
            Dictionary containing message fields for frontend display.
        """
        return {
            'id': self.id,
            'sessionId': self.session_id,
            'storyId': self.story_id,
            'paperId': self.paper_id,
            'role': self.role,
            'content': self.content,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self) -> str:
        context = f'story:{self.story_id}' if self.story_id else f'paper:{self.paper_id}'
        return f'<AINewsChatMessage {context} {self.role}: {self.content[:30]}...>'
