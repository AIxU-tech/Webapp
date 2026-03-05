from datetime import datetime
from flask import url_for
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import json
from backend.extensions import db
from backend.constants import ADMIN, UniversityRoles
from backend.utils.time import format_join_date, to_iso


# Extended User model that works with Flask-Login
class User(UserMixin, db.Model):
    # Original fields
    permission_level = db.Column(db.Integer, default=0)  # USER = 0
    id = db.Column(db.Integer, primary_key=True)
    # Note: username column removed - existing DB data preserved but ignored
    # All identification now uses email only
    email = db.Column(db.Text, unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)

    # Extended profile fields
    first_name = db.Column(db.String(50), nullable=True)
    last_name = db.Column(db.String(50), nullable=True)
    university = db.Column(db.String(100), nullable=True)
    join_date = db.Column(db.DateTime, default=datetime.utcnow)

    # Stats fields
    post_count = db.Column(db.Integer, default=0)
    follower_count = db.Column(db.Integer, default=0)
    following_count = db.Column(db.Integer, default=0)

    # Profile content
    about_section = db.Column(db.Text, nullable=True)
    avatar_url = db.Column(db.String(200), nullable=True)
    location = db.Column(db.String(100), nullable=True)

    # JSON field for skills list
    skills = db.Column(db.Text, nullable=True)  # Store as JSON string

    # Social links stored as JSON array: [{"type": "linkedin", "url": "..."}, ...]
    # Supported types: linkedin, x, instagram, github, discord, youtube, website
    social_links = db.Column(db.Text, nullable=True)

    # DEPRECATED: interests column is no longer used by the application.
    # The column may still exist in the database but is not exposed in the API.
    interests = db.Column(db.Text, nullable=True)

    # DEPRECATED: These JSON columns have been replaced by proper relationship tables.
    # - liked_universities -> UserLikedUniversity table
    # - liked_notes -> NoteLike table
    # - bookmarked_notes -> NoteBookmark table
    # - bookmarked_opportunities -> OpportunityBookmark table
    # The columns may still exist in the database but are no longer used by the application.

    #Profile pics
    # Add these new fields for profile picture
    profile_picture = db.Column(db.LargeBinary, nullable=True)  # Store image as binary data
    profile_picture_filename = db.Column(db.String(100), nullable=True)  # Original filename
    profile_picture_mimetype = db.Column(db.String(50), nullable=True)  # MIME type (image/jpeg, image/png, etc.)

    # Banner image storage
    banner_image = db.Column(db.LargeBinary, nullable=True)  # Store banner as binary data
    banner_image_filename = db.Column(db.String(255), nullable=True)  # Original filename
    banner_image_mimetype = db.Column(db.String(100), nullable=True)  # MIME type

    def get_university(self):
        from backend.models.university import University
        return University.query.filter_by(name=self.university).first()

    def set_password(self, password):
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256')

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def get_full_name(self):
        """Return full name or empty string if names not provided"""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        elif self.first_name:
            return self.first_name
        else:
            return ""

    def get_skills_list(self):
        """Convert skills JSON string back to list"""
        if self.skills:
            try:
                return json.loads(self.skills)
            except:
                return []
        return []

    def set_skills_list(self, skills_list):
        """Convert list to JSON string for storage"""
        self.skills = json.dumps(skills_list) if skills_list else None

    # -------------------------------------------------------------------------
    # Social Links Methods
    # -------------------------------------------------------------------------

    def get_social_links_list(self):
        """
        Parse social_links JSON to list.

        Returns:
            List of social link dicts, e.g., [{"type": "linkedin", "url": "..."}]
        """
        if self.social_links:
            try:
                return json.loads(self.social_links)
            except (json.JSONDecodeError, TypeError):
                return []
        return []

    def set_social_links_list(self, links):
        """
        Serialize list of social links to JSON.

        Args:
            links: List of dicts with 'type' and 'url' keys
        """
        self.social_links = json.dumps(links) if links else None

    # DEPRECATED: interests functionality has been removed
    def get_interests_list(self):
        """DEPRECATED: interests are no longer used"""
        return []

    def set_interests_list(self, interests_list):
        """DEPRECATED: interests are no longer used"""
        pass

    def increment_post_count(self):
        """Increment post count when user creates a new post"""
        self.post_count += 1
        db.session.commit()

    def increment_follower_count(self):
        """Increment follower count when someone follows this user"""
        self.follower_count += 1
        db.session.commit()

    def decrement_follower_count(self):
        """Decrement follower count when someone unfollows this user"""
        if self.follower_count > 0:
            self.follower_count -= 1
            db.session.commit()

    def increment_following_count(self):
        """Increment following count when user follows someone"""
        self.following_count += 1
        db.session.commit()

    def decrement_following_count(self):
        """Decrement following count when user unfollows someone"""
        if self.following_count > 0:
            self.following_count -= 1
            db.session.commit()

    def to_dict(self):
        """Convert user to dictionary for JSON responses"""
        return {
            'id': self.id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.get_full_name(),
            'university': self.university,
            'join_date': to_iso(self.join_date),
            'joined_formatted': format_join_date(self.join_date),
            'post_count': self.post_count,
            'follower_count': self.follower_count,
            'following_count': self.following_count,
            'about_section': self.about_section,
            'avatar_url': self.avatar_url,
            'profile_picture_url': self.get_profile_picture_url(),
            'banner_image_url': self.get_banner_image_url(),
            'hasBanner': self.banner_image is not None,
            'location': self.location,
            'skills': self.get_skills_list(),
            'socialLinks': self.get_social_links_list(),
            'permissionLevel': self.permission_level,
            'isExecutiveAnywhere': self._is_executive_anywhere(),
            'education': [e.to_dict() for e in self.education_entries],
            'experience': [e.to_dict() for e in self.experience_entries],
            'projects': [p.to_dict() for p in self.project_entries],
            'hasResume': self.resume is not None,
        }

    def _is_executive_anywhere(self) -> bool:
        """Check if user is executive+ at any university, or is a site admin."""
        if self.is_site_admin():
            return True
        from backend.models.university_role import UniversityRole
        return UniversityRole.is_executive_anywhere(self.id)

    def get_profile_picture_url(self):
        """Return profile picture URL or None (frontend handles fallback)"""
        if self.profile_picture:
            return url_for('profile.get_profile_picture', user_id=self.id)
        elif self.avatar_url:
            return self.avatar_url
        else:
            # Return None - frontend Avatar component handles fallback with gradient + initials
            return None

    def set_profile_picture(self, image_data, filename, mimetype):
        """Set profile picture with size validation"""
        # Limit to 5MB
        max_size = 5 * 1024 * 1024  # 5MB in bytes
        if len(image_data) > max_size:
            raise ValueError("Image file too large. Maximum size is 5MB.")

        self.profile_picture = image_data
        self.profile_picture_filename = filename
        self.profile_picture_mimetype = mimetype

    def delete_profile_picture(self):
        """Remove profile picture"""
        self.profile_picture = None
        self.profile_picture_filename = None
        self.profile_picture_mimetype = None

    # -------------------------------------------------------------------------
    # Banner Image Methods
    # -------------------------------------------------------------------------

    def get_banner_image_url(self):
        """Return banner image URL or None (frontend handles fallback)"""
        if self.banner_image:
            return url_for('profile.get_banner_image', user_id=self.id)
        return None

    def set_banner_image(self, image_data, filename, mimetype):
        """Set banner image (image should be compressed before calling)"""
        self.banner_image = image_data
        self.banner_image_filename = filename
        self.banner_image_mimetype = mimetype

    def delete_banner_image(self):
        """Remove banner image"""
        self.banner_image = None
        self.banner_image_filename = None
        self.banner_image_mimetype = None

    # -------------------------------------------------------------------------
    # Note Like/Bookmark Methods
    # -------------------------------------------------------------------------

    def has_liked_note(self, note_id: int) -> bool:
        """Check if this user has liked a specific note."""
        from backend.models.relationships import NoteLike
        return NoteLike.exists(self.id, note_id)

    def has_bookmarked_note(self, note_id: int) -> bool:
        """Check if this user has bookmarked a specific note."""
        from backend.models.relationships import NoteBookmark
        return NoteBookmark.exists(self.id, note_id)

    def get_liked_notes(self):
        """
        Get all notes this user has liked.
        
        Returns:
            List of Note objects, ordered by when they were liked (most recent first)
        """
        from backend.models.note import Note
        from backend.models.relationships import NoteLike
        
        return db.session.query(Note).join(
            NoteLike, Note.id == NoteLike.note_id
        ).filter(
            NoteLike.user_id == self.id
        ).order_by(NoteLike.created_at.desc()).all()

    def get_bookmarked_notes(self):
        """
        Get all notes this user has bookmarked.
        
        Returns:
            List of Note objects, ordered by when they were bookmarked (most recent first)
        """
        from backend.models.note import Note
        from backend.models.relationships import NoteBookmark
        
        return db.session.query(Note).join(
            NoteBookmark, Note.id == NoteBookmark.note_id
        ).filter(
            NoteBookmark.user_id == self.id
        ).order_by(NoteBookmark.created_at.desc()).all()

    # -------------------------------------------------------------------------
    # Permission Methods
    # -------------------------------------------------------------------------

    def is_site_admin(self) -> bool:
        """
        Check if this user is a site administrator.

        Site admins have elevated privileges across all universities.

        Returns:
            True if user is a site admin, False otherwise
        """
        return self.permission_level >= ADMIN

    def get_university_role(self, university_id: int):
        """
        Get this user's role at a specific university.

        Args:
            university_id: The university's ID

        Returns:
            UniversityRole instance if found, None otherwise
        """
        from backend.models.university_role import UniversityRole
        return UniversityRole.get_role(self.id, university_id)

    def get_university_role_level(self, university_id: int) -> int:
        """
        Get this user's role level at a specific university.

        Args:
            university_id: The university's ID

        Returns:
            Role level integer (MEMBER, EXECUTIVE, or PRESIDENT)
        """
        from backend.models.university_role import UniversityRole
        return UniversityRole.get_role_level(self.id, university_id)

    def is_executive_at(self, university_id: int) -> bool:
        """
        Check if this user is an executive or president at a university.

        Args:
            university_id: The university's ID

        Returns:
            True if user is executive or higher, False otherwise
        """
        from backend.models.university_role import UniversityRole
        return UniversityRole.is_executive_or_higher(self.id, university_id)

    def is_president_at(self, university_id: int) -> bool:
        """
        Check if this user is the president at a university.

        Args:
            university_id: The university's ID

        Returns:
            True if user is president, False otherwise
        """
        from backend.models.university_role import UniversityRole
        return UniversityRole.is_president(self.id, university_id)

    def can_manage_members_at(self, university_id: int) -> bool:
        """
        Check if this user can manage members at a university.

        A user can manage members if they are:
        - A site admin
        - An executive or president at that university

        Args:
            university_id: The university's ID

        Returns:
            True if user can manage members, False otherwise
        """
        if self.is_site_admin():
            return True
        return self.is_executive_at(university_id)

    def can_manage_executives_at(self, university_id: int) -> bool:
        """
        Check if this user can manage executives at a university.

        A user can manage executives if they are:
        - A site admin
        - The president at that university

        Args:
            university_id: The university's ID

        Returns:
            True if user can manage executives, False otherwise
        """
        if self.is_site_admin():
            return True
        return self.is_president_at(university_id)

    def get_all_university_roles(self) -> list:
        """
        Get all university roles for this user.

        Returns:
            List of UniversityRole instances
        """
        from backend.models.university_role import UniversityRole
        return UniversityRole.get_user_roles(self.id)
