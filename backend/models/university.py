"""
University Model

Represents a university AI club in the AIxU platform. Users are automatically
enrolled in a university based on their email domain during registration.

Key Features:
- Automatic enrollment: Users with matching .edu email domains are auto-enrolled
- Member management: Tracks university members via JSON list of user IDs
- Post tracking: Aggregates post counts from all university members

Email Domain Matching:
The email_domain field stores the subdomain portion of the university's email
(e.g., "uoregon" for uoregon.edu, "stanford" for stanford.edu).
During registration, the system extracts the user's email domain and matches
it against universities to automatically enroll them.
"""

import json
from sqlalchemy import func
from backend.extensions import db


class University(db.Model):
    """
    University model representing an AI club at a specific university.

    Attributes:
        id: Primary key identifier
        name: Full university name (e.g., "University of Oregon")
        clubName: Name of the AI club at this university
        location: Geographic location of the university
        email_domain: Email subdomain for auto-enrollment (e.g., "uoregon" for @uoregon.edu)
        member_count: Cached count of members (updated when members change)
        recent_posts: Cached count of posts by members
        upcoming_events: Count of upcoming events
        description: Description of the AI club
        tags: JSON array of topic tags
        members: JSON array of user IDs who are members
        admin_id: User ID of the university admin
    """
    __tablename__ = 'universities'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    clubName = db.Column(db.String(200), nullable=False)
    location = db.Column(db.String(200), nullable=True)

    # Email domain for automatic user enrollment during registration.
    # Stores the subdomain portion (e.g., "uoregon" for @uoregon.edu emails).
    # When a user registers with an email ending in @{email_domain}.edu,
    # they are automatically enrolled in this university.
    email_domain = db.Column(db.String(100), nullable=True)

    member_count = db.Column(db.Integer, default=0)
    recent_posts = db.Column(db.Integer, default=0)
    upcoming_events = db.Column(db.Integer, default=0)
    description = db.Column(db.Text, nullable=True)
    tags = db.Column(db.Text, nullable=True)
    members = db.Column(db.Text, nullable=True)  # JSON list of user IDs
    admin_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

    admin = db.relationship('User', backref='administered_universities')

    def get_members_list(self):
        if self.members:
            try:
                return json.loads(self.members)
            except:
                return []
        return []

    def set_members_list(self, member_ids):
        self.members = json.dumps(member_ids or [])
        self.member_count = len(member_ids or [])

    def add_member(self, user_id):
        members = self.get_members_list()
        if user_id not in members:
            members.append(user_id)
            self.set_members_list(members)

    def remove_member(self, user_id):
        members = self.get_members_list()
        if user_id in members:
            members.remove(user_id)
            self.set_members_list(members)

    def calculate_post_count(self):
        """Calculate total posts from all university members"""
        # Import here to avoid circular imports
        from backend.models.user import User

        member_ids = self.get_members_list()
        if not member_ids:
            return 0

        # Sum up post counts from all members
        total_posts = db.session.query(func.sum(User.post_count)).filter(
            User.id.in_(member_ids)
        ).scalar() or 0

        return total_posts

    def update_post_count(self):
        """Update the university's recent_posts count based on member posts"""
        self.recent_posts = self.calculate_post_count()
        db.session.commit()

    def to_dict(self):
        """Serialize university to dictionary for API responses."""
        return {
            'id': self.id,
            'name': self.name,
            'location': self.location,
            'emailDomain': self.email_domain,
            'memberCount': self.member_count,
            'members': self.get_members_list(),
            'adminId': self.admin_id,
        }

    @classmethod
    def find_by_email_domain(cls, email):
        """
        Find a university matching the user's email domain.

        Extracts the subdomain from a .edu email address and finds the
        matching university. For example:
        - "user@uoregon.edu" matches university with email_domain="uoregon"
        - "user@cs.stanford.edu" matches university with email_domain="stanford"

        Args:
            email: User's email address (e.g., "user@uoregon.edu")

        Returns:
            University object if a matching university is found, None otherwise.

        Example:
            >>> uni = University.find_by_email_domain("student@uoregon.edu")
            >>> if uni:
            ...     print(f"Found university: {uni.name}")
        """
        if not email or '@' not in email:
            return None

        # Extract domain portion after @ (e.g., "uoregon.edu" from "user@uoregon.edu")
        domain_part = email.split('@', 1)[1].lower()

        # Must be a .edu email for university matching
        if not domain_part.endswith('.edu'):
            return None

        # Extract subdomain by removing .edu suffix
        # e.g., "uoregon.edu" -> "uoregon", "cs.stanford.edu" -> "cs.stanford"
        subdomain = domain_part[:-4]  # Remove ".edu"

        # First try exact match on the full subdomain
        university = cls.query.filter(
            cls.email_domain.isnot(None),
            cls.email_domain == subdomain
        ).first()

        if university:
            return university

        # If no exact match, try matching on the base domain
        # For "cs.stanford.edu", also try matching just "stanford"
        if '.' in subdomain:
            base_domain = subdomain.split('.')[-1]  # Get last part (e.g., "stanford")
            university = cls.query.filter(
                cls.email_domain.isnot(None),
                cls.email_domain == base_domain
            ).first()

        return university
