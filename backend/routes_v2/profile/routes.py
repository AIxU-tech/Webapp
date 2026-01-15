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
- PUT /api/profile/picture - Upload/update profile picture
- DELETE /api/profile/picture - Delete profile picture
- DELETE /api/account - Delete user account
- GET /api/users/<id> - Get user profile by ID
- GET /user/<id>/profile_picture - Serve profile picture from database
"""

from flask import Blueprint, request, jsonify, send_file, redirect
from flask_login import login_required, current_user, logout_user
from datetime import datetime
import base64
import io
from sqlalchemy.orm import joinedload
from backend.extensions import db
from backend.models import User, Note, NoteComment, Message, University, UserFollows, UserLikedUniversity, UniversityRole
from backend.utils.image import allowed_file, compress_image
from backend.utils.time import format_full_date, format_join_date, to_iso
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
    """
    Serve profile picture from database.

    Returns the user's uploaded profile picture as binary image data.
    Falls back to a default avatar URL if no picture is set.

    Args:
        user_id: ID of the user whose picture to serve

    Returns:
        Binary image data with appropriate MIME type, or redirect to default
    """
    user = User.query.get(user_id)
    if not user or not user.profile_picture:
        # Return default avatar
        return redirect('https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face')

    return send_file(
        io.BytesIO(user.profile_picture),
        mimetype=user.profile_picture_mimetype,
        as_attachment=False
    )


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
    - about_section: Bio/about text
    - location: Geographic location
    - avatar_url: Fallback avatar URL
    - skills: Array or comma-separated string of skills
    - interests: Array or comma-separated string of interests

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
        "interests": ["NLP", "Computer Vision"]
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

        # Handle interests (array or comma-separated string)
        if 'interests' in data:
            interests = data['interests']
            if isinstance(interests, list):
                current_user.set_interests_list(interests)
            elif isinstance(interests, str) and interests.strip():
                # Handle comma-separated string
                interests_list = [interest.strip() for interest in interests.split(',') if interest.strip()]
                current_user.set_interests_list(interests_list)
            else:
                current_user.set_interests_list([])

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
    Upload or update profile picture.

    Accepts either:
    - File upload via 'profile_picture' form field
    - Base64 encoded image via 'camera_image' form field

    Images are automatically compressed to reduce storage size.

    Returns:
        JSON object with success status and new profile picture URL
    """
    try:
        image_data = None
        filename = None
        mimetype = None

        # Handle file upload
        if 'profile_picture' in request.files:
            file = request.files['profile_picture']
            if file and file.filename != '' and allowed_file(file.filename):
                filename = file.filename
                mimetype = file.content_type
                image_data = file.read()

        # Handle base64 camera capture
        elif 'camera_image' in request.form:
            camera_data = request.form['camera_image']
            if camera_data.startswith('data:image/'):
                # Remove data URL prefix
                header, data = camera_data.split(',', 1)
                image_data = base64.b64decode(data)
                # Extract MIME type from header
                mimetype = header.split(';')[0].split(':')[1]
                filename = f"camera_capture_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.jpg"

        if not image_data:
            return jsonify({
                'success': False,
                'error': 'No image data received'
            }), 400

        # Compress image to reduce storage size
        compressed_data = compress_image(image_data)

        # Set profile picture
        current_user.set_profile_picture(compressed_data, filename, 'image/jpeg')
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Profile picture updated successfully',
            'profile_picture_url': current_user.get_profile_picture_url()
        })

    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Error uploading profile picture'
        }), 500


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
        current_user.delete_profile_picture()
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Profile picture removed successfully',
            'profile_picture_url': current_user.get_profile_picture_url()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Error deleting profile picture'
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
    - Skills and interests
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

