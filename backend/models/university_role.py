"""
University Role Model

Represents a user's role within a specific university's AI club.
This enables per-university permission management where users can have
different roles at different universities.

Role Hierarchy:
    MEMBER (0)    - Standard member, basic access
    EXECUTIVE (1) - Club officer, can manage members
    PRESIDENT (2) - Club president, can manage executives and transfer leadership

Usage:
    # Check if user is an executive or higher at a university
    role = UniversityRole.get_role(user_id=5, university_id=1)
    if role and role.role >= UniversityRoles.EXECUTIVE:
        # User can manage members

    # Promote a user to executive
    UniversityRole.set_role(user_id=5, university_id=1, role=UniversityRoles.EXECUTIVE)
"""

from datetime import datetime
from backend.extensions import db
from backend.constants import UniversityRoles


class UniversityRole(db.Model):
    """
    Tracks a user's role within a specific university.

    This is a join table between User and University that stores the user's
    role level within that university's club hierarchy.

    Attributes:
        id: Primary key
        user_id: Foreign key to User
        university_id: Foreign key to University
        role: Role level (0=Member, 1=Executive, 2=President)
        created_at: When the role was first assigned
        updated_at: When the role was last modified
        updated_by_id: User who last modified this role (for audit)
    """
    __tablename__ = 'university_roles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    university_id = db.Column(db.Integer, db.ForeignKey('universities.id', ondelete='CASCADE'), nullable=False)
    role = db.Column(db.Integer, default=UniversityRoles.MEMBER, nullable=False)
    events_attended_count = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

    # Ensure each user can only have one role per university
    __table_args__ = (
        db.UniqueConstraint('user_id', 'university_id', name='unique_user_university_role'),
    )

    # Relationships
    # passive_deletes=True tells SQLAlchemy to let the database handle CASCADE deletes
    user = db.relationship('User', foreign_keys=[user_id], backref='university_roles', passive_deletes=True)
    university = db.relationship('University', backref=db.backref('roles', passive_deletes=True))
    updated_by = db.relationship('User', foreign_keys=[updated_by_id])

    def __repr__(self):
        return f'<UniversityRole user={self.user_id} uni={self.university_id} role={self.role_name}>'

    @property
    def role_name(self) -> str:
        """Get human-readable role name."""
        return UniversityRoles.get_name(self.role)

    def to_dict(self) -> dict:
        """Serialize role to dictionary for API responses."""
        return {
            'id': self.id,
            'userId': self.user_id,
            'universityId': self.university_id,
            'role': self.role,
            'roleName': self.role_name,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }

    # -------------------------------------------------------------------------
    # Class Methods for Role Management
    # -------------------------------------------------------------------------

    @classmethod
    def get_role(cls, user_id: int, university_id: int) -> 'UniversityRole | None':
        """
        Get a user's role at a specific university.

        Args:
            user_id: The user's ID
            university_id: The university's ID

        Returns:
            UniversityRole instance if found, None otherwise
        """
        return cls.query.filter_by(
            user_id=user_id,
            university_id=university_id
        ).first()

    @classmethod
    def get_role_level(cls, user_id: int, university_id: int) -> int:
        """
        Get a user's role level at a specific university.

        Args:
            user_id: The user's ID
            university_id: The university's ID

        Returns:
            Role level integer (defaults to MEMBER if no role exists)
        """
        role = cls.get_role(user_id, university_id)
        return role.role if role else UniversityRoles.MEMBER

    @classmethod
    def set_role(
        cls,
        user_id: int,
        university_id: int,
        role: int,
        updated_by_id: int = None
    ) -> 'UniversityRole':
        """
        Set or update a user's role at a university.

        Creates a new role record if one doesn't exist, or updates the
        existing record.

        Args:
            user_id: The user's ID
            university_id: The university's ID
            role: The role level to set (use UniversityRoles constants)
            updated_by_id: ID of user making this change (for audit trail)

        Returns:
            The created or updated UniversityRole instance

        Raises:
            ValueError: If the role value is invalid
        """
        if not UniversityRoles.is_valid(role):
            raise ValueError(f"Invalid role value: {role}")

        existing = cls.get_role(user_id, university_id)

        if existing:
            existing.role = role
            existing.updated_by_id = updated_by_id
            existing.updated_at = datetime.utcnow()
        else:
            existing = cls(
                user_id=user_id,
                university_id=university_id,
                role=role,
                updated_by_id=updated_by_id
            )
            db.session.add(existing)

        db.session.commit()
        return existing

    @classmethod
    def remove_role(cls, user_id: int, university_id: int) -> bool:
        """
        Remove a user's role at a university.

        Args:
            user_id: The user's ID
            university_id: The university's ID

        Returns:
            True if a role was removed, False if no role existed
        """
        role = cls.get_role(user_id, university_id)
        if role:
            db.session.delete(role)
            db.session.commit()
            return True
        return False

    @classmethod
    def get_university_executives(cls, university_id: int) -> list:
        """
        Get all executives (and president) for a university.

        Args:
            university_id: The university's ID

        Returns:
            List of UniversityRole instances with role >= EXECUTIVE
        """
        return cls.query.filter(
            cls.university_id == university_id,
            cls.role >= UniversityRoles.EXECUTIVE
        ).all()

    @classmethod
    def get_university_president(cls, university_id: int) -> 'UniversityRole | None':
        """
        Get the president for a university.

        Args:
            university_id: The university's ID

        Returns:
            UniversityRole instance for the president, or None
        """
        return cls.query.filter_by(
            university_id=university_id,
            role=UniversityRoles.PRESIDENT
        ).first()

    @classmethod
    def get_user_roles(cls, user_id: int) -> list:
        """
        Get all university roles for a user.

        Args:
            user_id: The user's ID

        Returns:
            List of UniversityRole instances
        """
        return cls.query.filter_by(user_id=user_id).all()

    @classmethod
    def is_executive_or_higher(cls, user_id: int, university_id: int) -> bool:
        """
        Check if user is an executive or president at a university.

        Args:
            user_id: The user's ID
            university_id: The university's ID

        Returns:
            True if user is executive or president, False otherwise
        """
        return cls.get_role_level(user_id, university_id) >= UniversityRoles.EXECUTIVE

    @classmethod
    def is_executive_anywhere(cls, user_id: int) -> bool:
        """
        Check if user is an executive or president at any university.

        Args:
            user_id: The user's ID

        Returns:
            True if user is executive+ at any university, False otherwise
        """
        return cls.query.filter(
            cls.user_id == user_id,
            cls.role >= UniversityRoles.EXECUTIVE
        ).first() is not None

    @classmethod
    def is_president(cls, user_id: int, university_id: int) -> bool:
        """
        Check if user is the president at a university.

        Args:
            user_id: The user's ID
            university_id: The university's ID

        Returns:
            True if user is president, False otherwise
        """
        return cls.get_role_level(user_id, university_id) >= UniversityRoles.PRESIDENT
