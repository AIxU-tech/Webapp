"""
OpportunityTag Model

Normalized storage for opportunity tags, enabling efficient database-level filtering.
"""

from datetime import datetime
from backend.extensions import db


class OpportunityTag(db.Model):
    """
    Normalized tag storage for opportunities.
    Enables database-level tag filtering with JOINs and proper indexing.
    """
    __tablename__ = 'opportunity_tags'

    id = db.Column(db.Integer, primary_key=True)
    opportunity_id = db.Column(
        db.Integer,
        db.ForeignKey('opportunities.id', ondelete='CASCADE'),
        nullable=False
    )
    tag = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('opportunity_id', 'tag', name='unique_opportunity_tag'),
        db.Index('idx_opportunity_tags_tag', 'tag'),
    )

    opportunity = db.relationship(
        'Opportunity',
        backref=db.backref('tag_records', cascade='all, delete-orphan', passive_deletes=True)
    )

    def __repr__(self):
        return f'<OpportunityTag {self.opportunity_id}:{self.tag}>'
