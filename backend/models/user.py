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

    # JSON fields for lists (skills and interests)
    skills = db.Column(db.Text, nullable=True)  # Store as JSON string
    interests = db.Column(db.Text, nullable=True)  # Store as JSON string

    # University fields
    liked_universities = db.Column(db.Text, nullable=True)
    liked_notes = db.Column(db.Text, nullable=True)
    bookmarked_notes = db.Column(db.Text, nullable=True)

    #Profile pics
    # Add these new fields for profile picture
    profile_picture = db.Column(db.LargeBinary, nullable=True)  # Store image as binary data
    profile_picture_filename = db.Column(db.String(100), nullable=True)  # Original filename
    profile_picture_mimetype = db.Column(db.String(50), nullable=True)  # MIME type (image/jpeg, image/png, etc.)

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

    def get_interests_list(self):
        """Convert interests JSON string back to list"""
        if self.interests:
            try:
                return json.loads(self.interests)
            except:
                return []
        return []

    def set_interests_list(self, interests_list):
        """Convert list to JSON string for storage"""
        self.interests = json.dumps(interests_list) if interests_list else None

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
            'location': self.location,
            'skills': self.get_skills_list(),
            'interests': self.get_interests_list(),
            'permissionLevel': self.permission_level,
        }

    def get_profile_picture_url(self):
        """Return profile picture URL or default avatar"""
        if self.profile_picture:
            return url_for('profile.get_profile_picture', user_id=self.id)
        elif self.avatar_url:
            return self.avatar_url
        else:
            # Use DiceBear Avatars API for consistent, professional default avatars based on user ID
            # This creates unique, consistent avatars for each user
            return f'https://api.dicebear.com/7.x/avataaars/svg?seed={self.id}&backgroundColor=b6e3f4,c0aede,d1d4f9'

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
