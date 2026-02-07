"""
AI News Models Module

This module defines the database models for storing AI news content:
- AINewsStory: News stories fetched from web sources
- AINewsSource: Supporting sources for news stories
- AIResearchPaper: Notable AI research papers
- AINewsChatMessage: Chat conversations about stories and papers

Each AINewsStory represents a significant AI news event with multiple
supporting sources. Stories are fetched periodically using Claude's
web search capabilities via a scout/curator pipeline.

Database Schema:
- ai_news_stories: Main story records with title, summary, and metadata
- ai_news_sources: Supporting sources linked to each story (2 per story)
- ai_research_papers: Research paper records with metadata
- ai_news_chat_messages: Chat message history for interactive AI discussions
"""

from datetime import datetime, timezone
from backend.extensions import db


class AINewsStory(db.Model):
    """
    Represents a top AI news story with its summary and metadata.

    Each story captures a significant AI event/development and includes:
    - A descriptive title and comprehensive summary
    - Multiple supporting sources for verification

    Stories are fetched via a scout/curator pipeline and ordered by
    array position (insertion order). Old stories are archived or
    deleted based on retention policies.

    Attributes:
        id: Primary key
        title: The headline/title of the news story
        summary: Comprehensive summary (2-3 sentences typically)
        batch_id: Groups stories from the same fetch operation
        fetched_at: When this story was fetched and stored
        event_date: When the original news event occurred
        image_url: Hero image URL
        emoji: Topic emoji
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

    # Comprehensive summary of the event (2-3 sentences typically)
    summary = db.Column(db.Text, nullable=False)

    # =========================================================================
    # Batch & Metadata
    # =========================================================================

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

    # One-to-many relationship: each story has 2 supporting sources
    sources = db.relationship(
        'AINewsSource',
        backref='story',
        lazy='dynamic',
        cascade='all, delete-orphan'
    )

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
            'batchId': self.batch_id,
            'fetchedAt': self.fetched_at.isoformat() if self.fetched_at else None,
            'eventDate': self.event_date.isoformat() if self.event_date else None,
            'imageUrl': self.image_url,
            'emoji': self.emoji,
            # Include all sources as nested objects
            'sources': [source.to_dict() for source in self.sources.all()]
        }

    def __repr__(self) -> str:
        return f'<AINewsStory {self.id}: {self.title[:50]}...>'


class AINewsSource(db.Model):
    """
    Represents a source/reference for an AI news story.

    Each story has 2 sources to provide multiple perspectives
    and allow users to verify information.

    Attributes:
        id: Primary key
        story_id: Foreign key to the parent AINewsStory
        url: Full URL to the source article
        source_name: Publication name (e.g., "TechCrunch")
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

    # =========================================================================
    # Serialization
    # =========================================================================

    def to_dict(self) -> dict:
        """
        Convert the source to a dictionary for JSON API responses.

        Returns:
            Dictionary containing source URL and name.
        """
        return {
            'id': self.id,
            'url': self.url,
            'sourceName': self.source_name,
        }

    def __repr__(self) -> str:
        return f'<AINewsSource: {self.source_name}>'


class AIResearchPaper(db.Model):
    """
    Represents a notable AI research paper.

    Each paper captures recent significant AI research findings and includes:
    - Paper title and authors
    - A plain-language summary accessible to students (includes key findings)
    - Link to the paper source (arXiv, conference proceedings, etc.)
    - Source name (e.g., "arXiv", "NeurIPS 2025")

    Papers are fetched alongside news stories via a scout/curator pipeline
    and ordered by array position (insertion order).

    Attributes:
        id: Primary key
        title: Paper title
        authors: Author names (comma-separated or "et al." format)
        summary: Plain-language summary including key findings
        paper_url: Link to the full paper
        source_name: Where the paper was published (e.g., "arXiv", "NeurIPS")
        batch_id: Groups papers from the same fetch operation
        fetched_at: When this paper was fetched
        emoji: Topic emoji
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

    # Plain-language summary accessible to students (includes key findings)
    summary = db.Column(db.Text, nullable=False)

    # Link to the full paper (arXiv, conference, etc.)
    paper_url = db.Column(db.String(2000), nullable=True)

    # Publication venue (e.g., "arXiv", "NeurIPS 2025", "Nature")
    source_name = db.Column(db.String(200), nullable=True)

    # =========================================================================
    # Batch & Metadata
    # =========================================================================

    # Batch identifier for grouping papers from the same fetch
    batch_id = db.Column(db.String(50), nullable=False, index=True)

    # When this paper was fetched
    fetched_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True
    )

    # =========================================================================
    # Visual & Display Fields
    # =========================================================================

    # Single emoji representing the paper's topic (e.g., "🧬", "🔬", "📊")
    emoji = db.Column(db.String(10), nullable=True)

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
            'paperUrl': self.paper_url,
            'sourceName': self.source_name,
            'batchId': self.batch_id,
            'fetchedAt': self.fetched_at.isoformat() if self.fetched_at else None,
            'emoji': self.emoji
        }

    def __repr__(self) -> str:
        return f'<AIResearchPaper {self.id}: {self.title[:50]}...>'


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
