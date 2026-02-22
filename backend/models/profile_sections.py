"""
Profile Section Models

Models for user profile sections: Education, Experience, and Project.
Each has a foreign key to the User model with cascade deletes,
and a display_order field for user-controlled ordering.
"""

from datetime import datetime
from backend.extensions import db


class Education(db.Model):
    __tablename__ = 'education'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    institution = db.Column(db.String(200), nullable=False)
    degree = db.Column(db.String(200), nullable=False)
    field_of_study = db.Column(db.String(200), nullable=True)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=True)
    gpa = db.Column(db.Float, nullable=True)
    description = db.Column(db.Text, nullable=True)
    display_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.Index('ix_education_user', 'user_id'),
    )

    user = db.relationship('User', backref=db.backref(
        'education_entries', cascade='all, delete-orphan', passive_deletes=True,
        order_by='Education.display_order, Education.start_date.desc()'
    ))

    def to_dict(self):
        return {
            'id': self.id,
            'institution': self.institution,
            'degree': self.degree,
            'field_of_study': self.field_of_study,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'gpa': self.gpa,
            'description': self.description,
            'display_order': self.display_order,
        }


class Experience(db.Model):
    __tablename__ = 'experience'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    company = db.Column(db.String(200), nullable=False)
    location = db.Column(db.String(200), nullable=True)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=True)
    description = db.Column(db.Text, nullable=True)
    display_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.Index('ix_experience_user', 'user_id'),
    )

    user = db.relationship('User', backref=db.backref(
        'experience_entries', cascade='all, delete-orphan', passive_deletes=True,
        order_by='Experience.display_order, Experience.start_date.desc()'
    ))

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'company': self.company,
            'location': self.location,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'description': self.description,
            'display_order': self.display_order,
        }


class Project(db.Model):
    __tablename__ = 'project'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    url = db.Column(db.String(500), nullable=True)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    technologies = db.Column(db.Text, nullable=True)  # JSON string
    display_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.Index('ix_project_user', 'user_id'),
    )

    user = db.relationship('User', backref=db.backref(
        'project_entries', cascade='all, delete-orphan', passive_deletes=True,
        order_by='Project.display_order, Project.start_date.desc()'
    ))

    def to_dict(self):
        import json
        techs = []
        if self.technologies:
            try:
                techs = json.loads(self.technologies)
            except (json.JSONDecodeError, TypeError):
                techs = []

        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'url': self.url,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'technologies': techs,
            'display_order': self.display_order,
        }
