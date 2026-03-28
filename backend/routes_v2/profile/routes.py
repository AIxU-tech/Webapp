"""
Profile Routes

Handles user profile management for the React frontend API.

University Affiliation:
Users are automatically enrolled in a university based on their .edu email
domain during registration. The profile page displays the user's university
but does not allow changing it manually. To change university affiliation,
users would need to register with a different .edu email address.

RESTful Endpoints:
- GET /api/profile - Get current user profile
- PATCH /api/profile - Update current user profile
- GET /api/profile/stats - Get current user statistics
- PUT /api/profile/picture - Confirm profile picture upload (GCS path)
- DELETE /api/profile/picture - Delete profile picture
- PUT /api/profile/banner - Confirm banner upload (GCS path)
- DELETE /api/profile/banner - Delete banner image
- DELETE /api/account - Delete user account
- GET /api/users/<id> - Get user profile by ID
"""

from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user, logout_user
from datetime import datetime
from sqlalchemy.orm import joinedload
from backend.extensions import db
from backend.models import User, Note, NoteComment, Message, University, UserFollows, UserLikedUniversity, UniversityRole
from backend.utils.time import format_full_date, format_join_date, to_iso
from backend.utils.validation import validate_social_links
profile_bp = Blueprint('profile', __name__)


# =============================================================================
# Flask-Login Configuration
# =============================================================================

from backend.extensions import login_manager


@login_manager.user_loader
def load_user(user_id):
    """
    Load user by ID for Flask-Login session management.

    This callback is used to reload the user object from the user ID
    stored in the session.

    Args:
        user_id: User ID stored in session

    Returns:
        User object or None if not found
    """
    return User.query.get(int(user_id))


@login_manager.unauthorized_handler
def handle_unauthorized():
    """
    Handle unauthorized access attempts.

    Returns 401 JSON response for API requests so the React frontend
    can handle authentication redirects cleanly.

    Returns:
        JSON error response with 401 status for API routes
    """
    return jsonify({'error': 'Unauthorized'}), 401


# =============================================================================
# Profile Picture Serving
# =============================================================================

@profile_bp.route('/user/<int:user_id>/profile_picture')
def get_profile_picture(user_id):
    """Legacy route — profile pictures are now served via GCS signed URLs."""
    return jsonify({'error': 'Use profile_picture_url from API responses'}), 410


# =============================================================================
# API Endpoints - Current User Profile
# =============================================================================

@profile_bp.route('/api/profile', methods=['GET'])
@login_required
def get_profile():
    """
    Get current authenticated user's profile.

    Returns:
        JSON object with user profile data
    """
    return jsonify(current_user.to_dict())


# RESTful: PATCH to resource updates it partially
@profile_bp.route('/api/profile', methods=['PATCH'])
@login_required
def update_profile():
    """
    Update user profile information.

    Allows updating:
    - first_name, last_name: User's name
    - headline: Short professional headline
    - about_section: Bio/about text
    - location: Geographic location
    - avatar_url: Fallback avatar URL
    - skills: Array or comma-separated string of skills
    - socialLinks: Array of social link objects with 'type' and 'url' keys

    Note: University affiliation cannot be changed through this endpoint.
    Users are automatically enrolled in a university based on their .edu
    email domain during registration.

    Request body (JSON):
    {
        "first_name": "John",
        "last_name": "Doe",
        "about_section": "AI researcher...",
        "location": "Portland, OR",
        "skills": ["Python", "Machine Learning"],
        "socialLinks": [{"type": "linkedin", "url": "https://linkedin.com/in/johndoe"}]
    }

    Returns:
        JSON object with success status and updated user data
    """
    try:
        data = request.json

        # Update basic profile fields
        if 'first_name' in data:
            current_user.first_name = data['first_name'].strip() or None
        if 'last_name' in data:
            current_user.last_name = data['last_name'].strip() or None
        if 'headline' in data:
            current_user.headline = data['headline'].strip() or None
        if 'about_section' in data:
            current_user.about_section = data['about_section'].strip() or None
        if 'location' in data:
            current_user.location = data['location'].strip() or None
        if 'avatar_url' in data:
            current_user.avatar_url = data['avatar_url'].strip() or None

        # NOTE: University selection has been removed.
        # Users are automatically enrolled in a university based on their
        # .edu email domain during registration. The university field is
        # read-only and cannot be changed through this endpoint.

        # Handle skills (array or comma-separated string)
        if 'skills' in data:
            skills = data['skills']
            if isinstance(skills, list):
                current_user.set_skills_list(skills)
            elif isinstance(skills, str) and skills.strip():
                # Handle comma-separated string
                skills_list = [skill.strip() for skill in skills.split(',') if skill.strip()]
                current_user.set_skills_list(skills_list)
            else:
                current_user.set_skills_list([])

        # Handle social links separately (array field)
        if 'socialLinks' in data:
            social_links = data['socialLinks']
            if social_links is None:
                current_user.set_social_links_list([])
            else:
                valid, error = validate_social_links(social_links)
                if not valid:
                    return jsonify({
                        'success': False,
                        'error': error
                    }), 400
                current_user.set_social_links_list(social_links)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'user': current_user.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to update profile',
            'details': str(e)
        }), 400


@profile_bp.route('/api/profile/stats', methods=['GET'])
@login_required
def get_profile_stats():
    """
    Get current user's statistics.

    Returns:
        JSON object with post count, follower count, and following count
    """
    return jsonify({
        'posts': current_user.post_count,
        'followers': current_user.follower_count,
        'following': current_user.following_count
    })



# =============================================================================
# API Endpoints - Profile Picture Management
# =============================================================================

# RESTful: PUT to resource replaces it
@profile_bp.route('/api/profile/picture', methods=['PUT'])
@login_required
def upload_profile_picture():
    """
    Confirm profile picture upload after frontend uploaded to GCS.

    Request Body:
        {
            "gcsPath": "images/profiles/42/abc_photo.jpg",
            "filename": "photo.jpg",
            "contentType": "image/jpeg",
            "sizeBytes": 12345
        }

    Returns:
        JSON object with success status and new profile picture URL
    """
    from backend.services.storage import delete_file

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'Request body required'}), 400

    gcs_path = data.get('gcsPath')
    if not gcs_path:
        return jsonify({'success': False, 'error': 'gcsPath is required'}), 400

    try:
        old_gcs_path = current_user.profile_picture_gcs_path
        current_user.set_profile_picture_gcs(gcs_path)
        db.session.commit()

        if old_gcs_path:
            try:
                delete_file(old_gcs_path)
            except Exception as e:
                current_app.logger.warning(f"Failed to delete old profile picture from GCS: {e}")

        return jsonify({
            'success': True,
            'message': 'Profile picture updated successfully',
            'profile_picture_url': current_user.get_profile_picture_url()
        })

    except Exception:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Error uploading profile picture'}), 500


# RESTful: DELETE to resource deletes it
@profile_bp.route('/api/profile/picture', methods=['DELETE'])
@login_required
def delete_profile_picture():
    """
    Delete current profile picture.

    Removes the user's uploaded profile picture, reverting to the default avatar.

    Returns:
        JSON object with success status and default profile picture URL
    """
    try:
        from backend.services.storage import delete_file

        old_gcs_path = current_user.delete_profile_picture_gcs()
        db.session.commit()

        if old_gcs_path:
            try:
                delete_file(old_gcs_path)
            except Exception as e:
                current_app.logger.warning(f"Failed to delete profile picture from GCS: {e}")

        return jsonify({
            'success': True,
            'message': 'Profile picture removed successfully',
            'profile_picture_url': current_user.get_profile_picture_url()
        })
    except Exception:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Error deleting profile picture'
        }), 500


# =============================================================================
# API Endpoints - Banner Image Management
# =============================================================================

@profile_bp.route('/user/<int:user_id>/banner')
def get_banner_image(user_id):
    """Legacy route — banners are now served via GCS signed URLs."""
    return jsonify({'error': 'Use banner_image_url from API responses'}), 410


@profile_bp.route('/api/profile/banner', methods=['PUT'])
@login_required
def upload_banner_image():
    """
    Confirm banner upload after frontend uploaded to GCS.

    Request Body:
        {
            "gcsPath": "images/banners/42/abc_banner.jpg",
            "filename": "banner.jpg",
            "contentType": "image/jpeg",
            "sizeBytes": 12345
        }
    """
    from backend.services.storage import delete_file

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'Request body required'}), 400

    gcs_path = data.get('gcsPath')
    if not gcs_path:
        return jsonify({'success': False, 'error': 'gcsPath is required'}), 400

    try:
        old_gcs_path = current_user.banner_image_gcs_path
        current_user.set_banner_image_gcs(gcs_path)
        db.session.commit()

        if old_gcs_path:
            try:
                delete_file(old_gcs_path)
            except Exception as e:
                current_app.logger.warning(f"Failed to delete old banner from GCS: {e}")

        return jsonify({
            'success': True,
            'message': 'Banner image updated successfully',
            'banner_image_url': current_user.get_banner_image_url(),
            'hasBanner': True
        })

    except Exception:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Error uploading banner image'}), 500


@profile_bp.route('/api/profile/banner', methods=['DELETE'])
@login_required
def delete_banner_image():
    """Delete current banner image, reverting to the default."""
    try:
        from backend.services.storage import delete_file

        old_gcs_path = current_user.delete_banner_image_gcs()
        db.session.commit()

        if old_gcs_path:
            try:
                delete_file(old_gcs_path)
            except Exception as e:
                current_app.logger.warning(f"Failed to delete banner from GCS: {e}")

        return jsonify({
            'success': True,
            'message': 'Banner image removed successfully',
            'hasBanner': False,
        })
    except Exception:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Error deleting banner image'
        }), 500


# =============================================================================
# API Endpoints - Other Users
# =============================================================================

@profile_bp.route('/api/users/<int:user_id>')
def get_user_detail(user_id: int):
    """
    Get user profile by ID with recent activity.

    Returns detailed user information including:
    - Basic profile info (name, university, location, etc.)
    - Skills
    - Recent activity feed (posts and comments)
    - Profile picture URL

    Args:
        user_id: ID of the user to retrieve

    Returns:
        JSON object with user profile and activity data
    """
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    recent_activity = []

    # Get user's recent posts for activity feed (limit 4)
    recent_posts = Note.query.filter_by(author_id=user.id).order_by(Note.created_at.desc()).limit(4).all()
    for post in recent_posts:
        recent_activity.append({
            'type': 'post',
            'id': post.id,
            'title': post.title,
            'content': post.content[:100] + '...' if len(post.content) > 100 else post.content,
            'likes': post.likes,
            'comments': post.comments,
            'time': post.get_time_ago(),
            'created_at': to_iso(post.created_at)
        })

    # Get user's recent comments for activity feed (limit 4)
    # Use joinedload to eager load the note relationship and avoid N+1 queries
    recent_comments = (
        NoteComment.query
        .filter_by(user_id=user.id)
        .options(joinedload(NoteComment.note))
        .order_by(NoteComment.created_at.desc())
        .limit(4)
        .all()
    )
    for comment in recent_comments:
        # Access the note via relationship (eager loaded via joinedload)
        # Handle case where note might be deleted (shouldn't happen due to cascade, but defensive)
        note_title = comment.note.title if comment.note else 'Deleted Post'
        recent_activity.append({
            'type': 'comment',
            'id': comment.id,
            'text': comment.text,
            'postTitle': note_title,
            'noteId': comment.note_id,
            'time': comment.get_time_ago(),
            'created_at': to_iso(comment.created_at)
        })

    # If no activity at all, add join activity as placeholder
    if not recent_activity:
        recent_activity.append({
            'type': 'join',
            'content': 'Joined AIxU community',
            'time': format_full_date(user.join_date) if user.join_date else 'Recently',
        })

    # Combine user data with activity
    user_data = user.to_dict()
    user_data['recent_activity'] = recent_activity
    user_data['profile_picture_url'] = user.get_profile_picture_url()
    user_data['joined_formatted'] = format_join_date(user.join_date)

    return jsonify(user_data)


# =============================================================================
# API Endpoints - Account Management
# =============================================================================

# RESTful: DELETE to resource deletes it
@profile_bp.route('/api/account', methods=['DELETE'])
@login_required
def delete_account():
    """
    Permanently delete user account and all associated data.

    This action is irreversible and will delete:
    - All notes/posts created by the user
    - All messages sent or received
    - All follow relationships
    - All university likes
    - University membership (removes from member lists)
    - If user is admin of any universities, admin is set to None

    Returns:
        JSON object with success status
    """
    user_id = current_user.id

    try:
        # 0. Clean up GCS images before deleting user
        from backend.services.storage import delete_file, delete_user_uploads, delete_user_images

        user_to_clean = User.query.get(user_id)
        paths_to_delete = [
            user_to_clean.profile_picture_gcs_path,
            user_to_clean.banner_image_gcs_path,
        ]
        for path in paths_to_delete:
            if path:
                try:
                    delete_file(path)
                except Exception as e:
                    current_app.logger.warning(f"Failed to delete user image from GCS: {e}")
        try:
            delete_user_uploads(user_id)
        except Exception as e:
            current_app.logger.warning(f"Failed to delete user uploads from GCS: {e}")
        try:
            delete_user_images(user_id)
        except Exception as e:
            current_app.logger.warning(f"Failed to delete user images from GCS: {e}")

        # 1. Delete all notes created by the user
        Note.query.filter_by(author_id=user_id).delete()

        # 2. Delete all messages sent or received by the user
        Message.query.filter(
            db.or_(
                Message.sender_id == user_id,
                Message.recipient_id == user_id
            )
        ).delete()

        # 3. Delete all user follows (both following and followers)
        UserFollows.query.filter(
            db.or_(
                UserFollows.follower_id == user_id,
                UserFollows.following_id == user_id
            )
        ).delete()

        # 4. Delete all liked universities
        UserLikedUniversity.query.filter_by(user_id=user_id).delete()

        # 5. Delete all university memberships (UniversityRole records)
        # (CASCADE should handle this, but we do it explicitly for SQLite compatibility)
        UniversityRole.query.filter_by(user_id=user_id).delete()

        # 6. If user is admin of any universities, set admin to None
        administered_universities = University.query.filter_by(admin_id=user_id).all()
        for uni in administered_universities:
            uni.admin_id = None

        # 7. Finally, delete the user account
        user_to_delete = User.query.get(user_id)
        db.session.delete(user_to_delete)

        # Commit all deletions
        db.session.commit()

        # Log out the user
        logout_user()

        return jsonify({
            'success': True,
            'message': 'Account deleted successfully'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to delete account',
            'details': str(e)
        }), 500

