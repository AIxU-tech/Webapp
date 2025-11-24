import json
from sqlalchemy import func
from backend.extensions import db


class University(db.Model):
    __tablename__ = 'universities'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    clubName = db.Column(db.String(200), nullable=False)
    location = db.Column(db.String(200), nullable=True)
    # Email domain for auto-matching users during registration (e.g., "stanford" for stanford.edu)
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
        return {
            'id': self.id,
            'name': self.name,
            'location': self.location,
            'emailDomain': self.email_domain,
            'memberCount': self.member_count,
            'members': self.get_members_list(),
            'adminId': self.admin_id,
        }
