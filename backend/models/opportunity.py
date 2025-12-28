"""
Opportunity Model

Represents a job/project opportunity posting in the AIxU platform.
Users can post opportunities to recruit team members for projects,
research, startups, hackathons, etc.

Similar structure to Note model but with additional fields for:
- compensation (optional text describing pay/benefits)
- university_only (boolean to restrict visibility to same university)
- location-related tags (Remote, Hybrid, On-site)
- paid/unpaid tags
"""

from datetime import datetime
from backend.extensions import db
from backend.utils.time import get_time_ago


class Opportunity(db.Model):
    """
    Opportunity model for job/project postings.

    Attributes:
        id: Primary key
        title: Opportunity title (required)
        description: Full description of the opportunity (required)
        compensation: Optional text describing compensation/pay
        university_only: If True, only visible to users from same university
        author_id: Foreign key to User who created the opportunity
        tags: JSON string of tags (location type, paid/unpaid, custom tags)
        created_at: Timestamp when opportunity was created
    """
    __tablename__ = 'opportunities'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    compensation = db.Column(db.String(500), nullable=True)
    university_only = db.Column(db.Boolean, default=False)
    author_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    tags = db.Column(db.Text, nullable=True)  # Store as JSON string
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship to User - eager load to avoid N+1 queries
    author = db.relationship('User', backref='opportunities', lazy='joined')

    def get_tags_list(self):
        """
        Get tags as list from normalized table.

        Returns:
            list: List of tag strings
        """
        return [t.tag for t in self.tag_records]

    def set_tags_list(self, tags_list):
        """
        Set tags using normalized table.

        Args:
            tags_list: List of tag strings to store
        """
        from backend.models.opportunity_tag import OpportunityTag

        self.tag_records.clear()

        if tags_list:
            for tag in tags_list:
                if tag and tag.strip():
                    self.tag_records.append(OpportunityTag(tag=tag.strip()))

    def get_time_ago(self):
        """
        Calculate human-readable time ago string.

        Returns:
            str: Time ago string like "2 hours ago"
        """
        return get_time_ago(self.created_at)

    def to_dict(self):
        """
        Convert opportunity to dictionary for JSON responses.

        Returns:
            dict: Opportunity data with author info, tags, and metadata
        """
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'compensation': self.compensation,
            'universityOnly': self.university_only,
            'author': {
                'id': self.author_id,
                'name': self.author.get_full_name(),
                'university': self.author.university or 'University',
                'avatar': self.author.get_profile_picture_url()
            },
            'tags': self.get_tags_list(),
            'timeAgo': self.get_time_ago(),
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'isBookmarked': False  # Will be updated based on current user
        }

    def __repr__(self):
        return f'<Opportunity {self.id}: {self.title[:30]}...>'
