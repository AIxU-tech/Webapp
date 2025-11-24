from flask import Blueprint, request, flash, redirect, url_for, jsonify, send_file
from flask_login import login_required, current_user, logout_user
from datetime import datetime
import base64
import io
from backend.extensions import db
from backend.models import User, Note, Message, University, UserFollows, UserLikedUniversity
from backend.utils.image import allowed_file, compress_image

profile_bp = Blueprint('profile', __name__)


# This callback is used to reload the user object from the user ID stored in the session
from backend.extensions import login_manager


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


@login_manager.unauthorized_handler
def handle_unauthorized():
    # Return 401 for API requests so frontend can handle it cleanly
    if request.path.startswith('/api/'):
        return jsonify({'error': 'Unauthorized'}), 401
    return redirect(url_for('auth.login'))


# Route to update a users profile on the edit profile button on the profile.html page
@profile_bp.route('/update_profile', methods=['POST'])
@login_required
def update_profile():
    current_user.first_name = request.form.get('first_name', '').strip() or None
    current_user.last_name = request.form.get('last_name', '').strip() or None
    current_user.about_section = request.form.get('about_section', '').strip() or None
    current_user.location = request.form.get('location', '').strip() or None
    current_user.avatar_url = request.form.get('avatar_url', '').strip() or None

    # Handle university selection and joining with comprehensive cleanup
    university_id = request.form.get('university_id', '').strip()

    # First, remove user from ALL universities to prevent dual membership
    # This ensures clean state regardless of any data inconsistencies
    all_universities = University.query.all()
    for uni in all_universities:
        member_ids = uni.get_members_list()
        if current_user.id in member_ids:
            uni.remove_member(current_user.id)

    # Now handle the new university selection
    if university_id:
        try:
            new_uni = University.query.get(int(university_id))
            if new_uni:
                # Add user to the selected university
                new_uni.add_member(current_user.id)
                # Update user's university name
                current_user.university = new_uni.name
            else:
                # Invalid university selected, clear user's university
                current_user.university = None
        except (ValueError, TypeError):
            # Invalid university_id, clear user's university
            current_user.university = None
    else:
        # No university selected, user is leaving all universities
        current_user.university = None

    # Handle skills (comma-separated string to list)
    skills_input = request.form.get('skills', '')
    if skills_input.strip():
        skills_list = [skill.strip() for skill in skills_input.split(',') if skill.strip()]
        current_user.set_skills_list(skills_list)
    else:
        current_user.set_skills_list([])

    # Handle interests (comma-separated string to list)
    interests_input = request.form.get('interests', '')
    if interests_input.strip():
        interests_list = [interest.strip() for interest in interests_input.split(',') if interest.strip()]
        current_user.set_interests_list(interests_list)
    else:
        current_user.set_interests_list([])

    db.session.commit()
    flash('Profile updated successfully!')
    return redirect(url_for('profile.profile'))


@profile_bp.route('/user/<int:user_id>/profile_picture')
def get_profile_picture(user_id):
    """Serve profile picture from database"""
    user = User.query.get(user_id)
    if not user or not user.profile_picture:
        # Return default avatar or 404
        return redirect('https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face')

    return send_file(
        io.BytesIO(user.profile_picture),
        mimetype=user.profile_picture_mimetype,
        as_attachment=False
    )


@profile_bp.route('/upload_profile_picture', methods=['POST'])
@login_required
def upload_profile_picture():
    """Handle profile picture upload (both file upload and camera capture)"""
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
            flash('No image data received', 'error')
            return redirect(url_for('profile.profile'))

        # Compress image to reduce size
        compressed_data = compress_image(image_data)

        # Set profile picture
        current_user.set_profile_picture(compressed_data, filename, 'image/jpeg')
        db.session.commit()

        flash('Profile picture updated successfully!', 'success')
        return redirect(url_for('profile.profile'))

    except ValueError as e:
        flash(str(e), 'error')
        return redirect(url_for('profile.profile'))
    except Exception as e:
        flash('Error uploading profile picture. Please try again.', 'error')
        return redirect(url_for('profile.profile'))


@profile_bp.route('/delete_profile_picture', methods=['POST'])
@login_required
def delete_profile_picture():
    """Delete current profile picture"""
    current_user.delete_profile_picture()
    db.session.commit()
    flash('Profile picture removed successfully!', 'success')
    return redirect(url_for('profile.profile'))


@profile_bp.route('/delete_account', methods=['POST'])
@login_required
def delete_account():
    """Delete user account and all associated data"""
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

        # 5. Remove user from all university member lists
        all_universities = University.query.all()
        for uni in all_universities:
            member_ids = uni.get_members_list()
            if user_id in member_ids:
                uni.remove_member(user_id)

        # 6. If user is admin of any universities, handle them
        # Option: Delete universities OR set admin to None
        administered_universities = University.query.filter_by(admin_id=user_id).all()
        for uni in administered_universities:
            # Set admin to None (keep university but remove admin)
            uni.admin_id = None
            # Alternative: Delete the university entirely
            # db.session.delete(uni)

        # 7. Finally, delete the user account
        user_to_delete = User.query.get(user_id)
        db.session.delete(user_to_delete)

        # Commit all deletions
        db.session.commit()

        # Log out the user
        logout_user()

        flash('Your account has been permanently deleted. We\'re sorry to see you go.', 'info')
        return redirect(url_for('public.index'))

    except Exception as e:
        db.session.rollback()
        flash('An error occurred while deleting your account. Please try again or contact support.', 'error')
        return redirect(url_for('profile.profile'))


# API endpoints
@profile_bp.route('/api/user/profile')
@login_required
def api_user_profile():
    return jsonify(current_user.to_dict())


@profile_bp.route('/api/users/<int:user_id>')
def api_user_detail(user_id: int):
    """Get user profile by ID with recent activity"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Get user's recent posts for activity feed
    recent_posts = Note.query.filter_by(author_id=user.id).order_by(Note.created_at.desc()).limit(4).all()

    # Build activity list from recent posts
    recent_activity = []
    for post in recent_posts:
        recent_activity.append({
            'type': 'post',
            'title': post.title,
            'content': post.content[:100] + '...' if len(post.content) > 100 else post.content,
            'likes': post.likes,
            'time': post.get_time_ago(),
            'created_at': post.created_at.isoformat() if post.created_at else None
        })

    # If no posts, add join activity
    if not recent_activity:
        recent_activity.append({
            'type': 'join',
            'content': 'Joined AIxU community',
            'time': user.join_date.strftime('%B %d, %Y') if user.join_date else 'Recently',
        })

    # Combine user data with activity
    user_data = user.to_dict()
    user_data['recent_activity'] = recent_activity
    user_data['profile_picture_url'] = user.get_profile_picture_url()
    user_data['joined_formatted'] = user.join_date.strftime('%B %Y') if user.join_date else 'Unknown'

    return jsonify(user_data)


@profile_bp.route('/api/user/stats')
@login_required
def api_user_stats():
    return jsonify({
        'posts': current_user.post_count,
        'followers': current_user.follower_count,
        'following': current_user.following_count
    })


@profile_bp.route('/api/update_profile', methods=['POST'])
@login_required
def api_update_profile():
    """API endpoint to update user profile"""
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

        # Handle university selection and joining with comprehensive cleanup
        if 'university_id' in data:
            university_id = data['university_id']

            # First, remove user from ALL universities to prevent dual membership
            all_universities = University.query.all()
            for uni in all_universities:
                member_ids = uni.get_members_list()
                if current_user.id in member_ids:
                    uni.remove_member(current_user.id)

            # Now handle the new university selection
            if university_id:
                try:
                    new_uni = University.query.get(int(university_id))
                    if new_uni:
                        # Add user to the selected university
                        new_uni.add_member(current_user.id)
                        # Update user's university name
                        current_user.university = new_uni.name
                    else:
                        current_user.university = None
                except (ValueError, TypeError):
                    current_user.university = None
            else:
                # No university selected, user is leaving all universities
                current_user.university = None

        # Handle skills (array to JSON)
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

        # Handle interests (array to JSON)
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


@profile_bp.route('/api/upload_profile_picture', methods=['POST'])
@login_required
def api_upload_profile_picture():
    """API endpoint to upload profile picture"""
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

        # Compress image to reduce size
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


@profile_bp.route('/api/delete_profile_picture', methods=['POST', 'DELETE'])
@login_required
def api_delete_profile_picture():
    """API endpoint to delete profile picture"""
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


@profile_bp.route('/api/delete_account', methods=['POST', 'DELETE'])
@login_required
def api_delete_account():
    """API endpoint to delete user account"""
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

        # 5. Remove user from all university member lists
        all_universities = University.query.all()
        for uni in all_universities:
            member_ids = uni.get_members_list()
            if user_id in member_ids:
                uni.remove_member(user_id)

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
