"""
University Model

Represents a university AI club in the AIxU platform. Users are automatically
enrolled in a university based on their email domain during registration.

Key Features:
- Automatic enrollment: Users with matching .edu email domains are auto-enrolled
- Member management: Tracks university members via UniversityRole table
- Role-based permissions: President, Executives, and Members with different access levels
- Post tracking: Aggregates post counts from all university members

Email Domain Matching:
The email_domain field stores the subdomain portion of the university's email
(e.g., "uoregon" for uoregon.edu, "stanford" for stanford.edu).
During registration, the system extracts the user's email domain and matches
it against universities to automatically enroll them.

Role Hierarchy:
- PRESIDENT: Full control over club, can manage executives
- EXECUTIVE: Can manage members (remove, etc.)
- MEMBER: Standard member access

Member Management:
Members are tracked via the UniversityRole table, which serves as the source
of truth for university membership. Every member has a role (MEMBER, EXECUTIVE,
or PRESIDENT). The member_count column is cached for performance and updated
whenever members are added or removed.
"""

from sqlalchemy import func
from backend.extensions import db
from backend.constants import UniversityRoles


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
        admin_id: User ID of the university admin
        
    Member Management:
        Members are tracked via the UniversityRole table (not stored directly).
        Use get_members_list() to get member IDs, get_members() to get User objects.
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

    # Cached member count - updated by add_member() and remove_member()
    # Use refresh_member_count() to recalculate from UniversityRole if needed
    member_count = db.Column(db.Integer, default=0)
    recent_posts = db.Column(db.Integer, default=0)
    upcoming_events = db.Column(db.Integer, default=0)
    description = db.Column(db.Text, nullable=True)
    tags = db.Column(db.Text, nullable=True)
    website_url = db.Column(db.String(500), nullable=True)
    
    # DEPRECATED: members column is no longer used. Membership is tracked via UniversityRole.
    # This column is kept for backwards compatibility during migration but should not be used.
    members = db.Column(db.Text, nullable=True)
    
    admin_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

    admin = db.relationship('User', backref='administered_universities')

    # -------------------------------------------------------------------------
    # Member Management Methods
    # -------------------------------------------------------------------------
    # Members are tracked via UniversityRole table. These methods provide
    # a clean API for managing membership while using UniversityRole as
    # the source of truth.

    def get_members_list(self) -> list[int]:
        """
        Get list of all member user IDs for this university.
        
        Queries the UniversityRole table to get all users who have any role
        at this university (MEMBER, EXECUTIVE, or PRESIDENT).
        
        Returns:
            List of user IDs who are members of this university
        """
        from backend.models.university_role import UniversityRole
        roles = UniversityRole.query.filter_by(university_id=self.id).all()
        return [role.user_id for role in roles]

    def get_members(self) -> list:
        """
        Get all members as User objects with their role information.
        
        This is more efficient than get_members_list() when you need User
        objects, as it performs a single JOIN query instead of N+1 queries.
        
        Returns:
            List of dicts with 'user' (User object) and 'role' (UniversityRole object)
        """
        from backend.models.university_role import UniversityRole
        from backend.models.user import User
        
        results = db.session.query(User, UniversityRole).join(
            UniversityRole, User.id == UniversityRole.user_id
        ).filter(
            UniversityRole.university_id == self.id
        ).all()
        
        return [{'user': user, 'role': role} for user, role in results]

    def add_member(self, user_id: int, role: int = None) -> bool:
        """
        Add a user as a member of this university.
        
        Creates a UniversityRole record for the user with MEMBER role (default).
        If the user is already a member, this is a no-op (idempotent).
        
        Args:
            user_id: The user's ID to add
            role: Optional role level (defaults to MEMBER)
            
        Returns:
            True if member was added, False if already a member
        """
        from backend.models.university_role import UniversityRole
        
        if role is None:
            role = UniversityRoles.MEMBER
        
        # Check if already a member
        existing = UniversityRole.get_role(user_id, self.id)
        if existing:
            return False  # Already a member
        
        # Create new role record
        new_role = UniversityRole(
            user_id=user_id,
            university_id=self.id,
            role=role
        )
        db.session.add(new_role)
        
        # Update cached member count
        self.member_count = (self.member_count or 0) + 1
        
        return True

    def remove_member(self, user_id: int) -> bool:
        """
        Remove a user from this university.
        
        Deletes the UniversityRole record for the user at this university.
        If the user is not a member, this is a no-op.
        
        Args:
            user_id: The user's ID to remove
            
        Returns:
            True if member was removed, False if not a member
        """
        from backend.models.university_role import UniversityRole
        
        existing = UniversityRole.get_role(user_id, self.id)
        if not existing:
            return False  # Not a member
        
        db.session.delete(existing)
        
        # Update cached member count
        if self.member_count and self.member_count > 0:
            self.member_count -= 1
        
        return True

    def is_member(self, user_id: int) -> bool:
        """
        Check if a user is a member of this university.
        
        Args:
            user_id: The user's ID to check
            
        Returns:
            True if user is a member, False otherwise
        """
        from backend.models.university_role import UniversityRole
        return UniversityRole.get_role(user_id, self.id) is not None

    def refresh_member_count(self) -> int:
        """
        Recalculate and update the cached member_count from UniversityRole.
        
        Use this method to fix any sync issues between the cached count
        and the actual number of members in UniversityRole.
        
        Returns:
            The updated member count
        """
        from backend.models.university_role import UniversityRole
        count = UniversityRole.query.filter_by(university_id=self.id).count()
        self.member_count = count
        return count

    def calculate_post_count(self) -> int:
        """
        Calculate total posts from all university members.
        
        Uses a JOIN with UniversityRole for efficiency instead of
        fetching member IDs first.
        
        Returns:
            Total post count from all members
        """
        from backend.models.user import User
        from backend.models.university_role import UniversityRole

        total_posts = db.session.query(func.sum(User.post_count)).join(
            UniversityRole, User.id == UniversityRole.user_id
        ).filter(
            UniversityRole.university_id == self.id
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
            'websiteUrl': self.website_url,
        }

    # -------------------------------------------------------------------------
    # Role Management Methods
    # -------------------------------------------------------------------------

    def get_president(self):
        """
        Get the president of this university.

        Returns:
            UniversityRole instance for the president, or None
        """
        from backend.models.university_role import UniversityRole
        return UniversityRole.get_university_president(self.id)

    def get_president_user(self):
        """
        Get the User object for this university's president.

        Returns:
            User instance for the president, or None
        """
        from backend.models.user import User
        president_role = self.get_president()
        if president_role:
            return User.query.get(president_role.user_id)
        return None

    def get_executives(self):
        """
        Get all executives (including president) for this university.

        Returns:
            List of UniversityRole instances with role >= EXECUTIVE
        """
        from backend.models.university_role import UniversityRole
        return UniversityRole.get_university_executives(self.id)

    def get_executive_users(self):
        """
        Get User objects for all executives (including president).

        Returns:
            List of User instances
        """
        from backend.models.user import User
        exec_roles = self.get_executives()
        user_ids = [r.user_id for r in exec_roles]
        if user_ids:
            return User.query.filter(User.id.in_(user_ids)).all()
        return []

    def get_member_role(self, user_id: int):
        """
        Get a specific member's role at this university.

        Args:
            user_id: The user's ID

        Returns:
            UniversityRole instance if found, None otherwise
        """
        from backend.models.university_role import UniversityRole
        return UniversityRole.get_role(user_id, self.id)

    def get_member_role_level(self, user_id: int) -> int:
        """
        Get a specific member's role level at this university.

        Args:
            user_id: The user's ID

        Returns:
            Role level integer (MEMBER, EXECUTIVE, or PRESIDENT)
        """
        from backend.models.university_role import UniversityRole
        return UniversityRole.get_role_level(user_id, self.id)

    def set_member_role(self, user_id: int, role: int, updated_by_id: int = None):
        """
        Set a member's role at this university.

        Args:
            user_id: The user's ID
            role: Role level (use UniversityRoles constants)
            updated_by_id: ID of user making this change

        Returns:
            UniversityRole instance
        """
        from backend.models.university_role import UniversityRole
        return UniversityRole.set_role(user_id, self.id, role, updated_by_id)

    def is_member_executive(self, user_id: int) -> bool:
        """Check if a user is an executive or president at this university."""
        return self.get_member_role_level(user_id) >= UniversityRoles.EXECUTIVE

    def is_member_president(self, user_id: int) -> bool:
        """Check if a user is the president at this university."""
        return self.get_member_role_level(user_id) >= UniversityRoles.PRESIDENT

    # -------------------------------------------------------------------------
    # Class Methods
    # -------------------------------------------------------------------------

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
