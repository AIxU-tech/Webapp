"""
Profile Management Tests

Tests for profile-related endpoints:
- GET /api/profile - Current user profile
- GET /api/users/<id> - User profile by ID
- GET /api/profile/stats - User statistics
- PATCH /api/profile - Update profile
- PUT /api/profile/picture - Upload profile picture
- DELETE /api/profile/picture - Delete profile picture
- DELETE /api/account - Delete account
"""

import pytest
import io
import base64
from backend.models import User, Note, Message, University, UserFollows
from backend.extensions import db


class TestProfileRetrieval:
    """Tests for profile retrieval endpoints"""

    def test_get_own_profile_authenticated(self, authenticated_client, app, test_user):
        """Test getting own profile while logged in"""
        response = authenticated_client.get('/api/profile')

        assert response.status_code == 200
        data = response.get_json()
        assert data['email'] == 'test@example.edu'
        assert data['first_name'] == 'Test'
        assert data['last_name'] == 'User'

    def test_get_own_profile_unauthenticated(self, client):
        """Test getting profile without login returns 401"""
        response = client.get('/api/profile')

        assert response.status_code == 401

    def test_get_user_by_id_exists(self, client, test_user, app):
        """Test getting user profile by valid ID"""
        with app.app_context():
            user = db.session.get(User, test_user.id)
            response = client.get(f'/api/users/{user.id}')

            assert response.status_code == 200
            data = response.get_json()
            assert data['email'] == 'test@example.edu'
            assert 'recent_activity' in data
            assert 'profile_picture_url' in data

    def test_get_user_by_id_not_found(self, client, app):
        """Test getting non-existent user returns 404"""
        response = client.get('/api/users/99999')

        assert response.status_code == 404
        data = response.get_json()
        assert 'error' in data

    def test_user_stats_reflects_counts(self, authenticated_client, app, test_user):
        """Test that user stats endpoint returns correct counts"""
        with app.app_context():
            # Set some counts on the user
            user = db.session.get(User, test_user.id)
            user.post_count = 5
            user.follower_count = 10
            user.following_count = 3
            db.session.commit()

            response = authenticated_client.get('/api/profile/stats')

            assert response.status_code == 200
            data = response.get_json()
            assert data['posts'] == 5
            assert data['followers'] == 10
            assert data['following'] == 3

    def test_user_detail_includes_recent_activity(self, client, test_user, test_note, app):
        """Test that user detail includes recent posts in activity"""
        with app.app_context():
            user = db.session.get(User, test_user.id)
            response = client.get(f'/api/users/{user.id}')

            assert response.status_code == 200
            data = response.get_json()
            assert 'recent_activity' in data
            assert len(data['recent_activity']) > 0


class TestProfileUpdates:
    """Tests for profile update endpoint"""

    def test_update_profile_basic_fields(self, authenticated_client, app, test_user):
        """Test updating basic profile fields"""
        response = authenticated_client.patch('/api/profile', json={
            'first_name': 'Updated',
            'last_name': 'Name',
            'location': 'New York, NY',
            'about_section': 'This is my updated bio.'
        })

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['user']['first_name'] == 'Updated'
        assert data['user']['last_name'] == 'Name'
        assert data['user']['location'] == 'New York, NY'

    def test_update_profile_skills_as_array(self, authenticated_client, app):
        """Test updating skills with array input"""
        response = authenticated_client.patch('/api/profile', json={
            'skills': ['Python', 'Machine Learning', 'TensorFlow']
        })

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'Python' in data['user']['skills']
        assert 'Machine Learning' in data['user']['skills']

    def test_update_profile_skills_as_comma_string(self, authenticated_client, app):
        """Test updating skills with comma-separated string"""
        response = authenticated_client.patch('/api/profile', json={
            'skills': 'Python, JavaScript, React'
        })

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'Python' in data['user']['skills']
        assert 'JavaScript' in data['user']['skills']

    def test_update_profile_empty_skills_clears(self, authenticated_client, app):
        """Test that setting empty skills clears the list"""
        # First set some skills
        authenticated_client.patch('/api/profile', json={
            'skills': ['Python', 'ML']
        })

        # Then clear them
        response = authenticated_client.patch('/api/profile', json={
            'skills': []
        })

        assert response.status_code == 200
        data = response.get_json()
        assert data['user']['skills'] == []

    def test_update_profile_interests_as_array(self, authenticated_client, app):
        """Test updating interests with array input"""
        response = authenticated_client.patch('/api/profile', json={
            'interests': ['NLP', 'Computer Vision', 'Robotics']
        })

        assert response.status_code == 200
        data = response.get_json()
        assert 'NLP' in data['user']['interests']

    def test_update_profile_unauthenticated(self, client):
        """Test profile update without login returns 401"""
        response = client.patch('/api/profile', json={
            'first_name': 'Hacker'
        })

        assert response.status_code == 401

    def test_update_profile_partial_update(self, authenticated_client, app, test_user):
        """Test that partial updates don't clear other fields"""
        with app.app_context():
            # First update location
            authenticated_client.patch('/api/profile', json={
                'location': 'San Francisco, CA'
            })

            # Then update only about_section
            response = authenticated_client.patch('/api/profile', json={
                'about_section': 'New bio'
            })

            data = response.get_json()
            # Location should still be set
            assert data['user']['location'] == 'San Francisco, CA'
            assert data['user']['about_section'] == 'New bio'


class TestProfilePictures:
    """Tests for profile picture upload/delete"""

    def test_upload_profile_picture_valid_image(self, authenticated_client, app, sample_image_data):
        """Test uploading a valid profile picture"""
        data = {
            'profile_picture': (io.BytesIO(sample_image_data), 'test.jpg')
        }

        response = authenticated_client.put(
            '/api/profile/picture',
            data=data,
            content_type='multipart/form-data'
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'profile_picture_url' in data

    def test_upload_profile_picture_no_file(self, authenticated_client, app):
        """Test upload with no file returns error"""
        response = authenticated_client.put(
            '/api/profile/picture',
            data={},
            content_type='multipart/form-data'
        )

        assert response.status_code == 400

    def test_upload_profile_picture_base64_camera(self, authenticated_client, app, sample_image_data):
        """Test uploading profile picture via base64 camera data"""
        base64_image = base64.b64encode(sample_image_data).decode('utf-8')
        data_url = f'data:image/jpeg;base64,{base64_image}'

        response = authenticated_client.put(
            '/api/profile/picture',
            data={'camera_image': data_url},
            content_type='multipart/form-data'
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True

    def test_delete_profile_picture(self, authenticated_client, app, sample_image_data, test_user):
        """Test deleting profile picture"""
        # First upload a picture
        authenticated_client.put(
            '/api/profile/picture',
            data={'profile_picture': (io.BytesIO(sample_image_data), 'test.jpg')},
            content_type='multipart/form-data'
        )

        # Then delete it
        response = authenticated_client.delete('/api/profile/picture')

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        # Should return default avatar URL
        assert 'profile_picture_url' in data

    def test_get_profile_picture_binary(self, client, test_user, app, sample_image_data):
        """Test serving profile picture as binary"""
        with app.app_context():
            user = db.session.get(User, test_user.id)
            user.profile_picture = sample_image_data
            user.profile_picture_filename = 'test.jpg'
            user.profile_picture_mimetype = 'image/jpeg'
            db.session.commit()

            response = client.get(f'/user/{user.id}/profile_picture')

            assert response.status_code == 200
            assert response.content_type == 'image/jpeg'

    def test_get_profile_picture_fallback_default(self, client, test_user, app):
        """Test that missing profile picture redirects to default"""
        with app.app_context():
            user = db.session.get(User, test_user.id)
            response = client.get(f'/user/{user.id}/profile_picture')

            # Should redirect to default avatar
            assert response.status_code == 302

    def test_upload_profile_picture_unauthenticated(self, client, sample_image_data):
        """Test upload without login returns 401"""
        response = client.put(
            '/api/profile/picture',
            data={'profile_picture': (io.BytesIO(sample_image_data), 'test.jpg')},
            content_type='multipart/form-data'
        )

        assert response.status_code == 401


class TestAccountDeletion:
    """Tests for account deletion"""

    def test_delete_account_removes_all_data(self, app, test_university):
        """Test that account deletion removes all user data"""
        with app.app_context():
            # Create a user
            user = User(
                email='todelete@example.edu',
                first_name='Delete',
                last_name='Me',
                university='Test University'
            )
            user.set_password('deletepass123')
            db.session.add(user)
            db.session.commit()
            user_id = user.id

            # Create a new client and login
            client = app.test_client()
            client.post('/api/auth/login', json={
                'email': 'todelete@example.edu',
                'password': 'deletepass123'
            })

            # Delete account
            response = client.delete('/api/account')

            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True

            # Verify user is deleted
            deleted_user = db.session.get(User, user_id)
            assert deleted_user is None

    def test_delete_account_removes_from_university(self, app, test_university):
        """Test that deleted user is removed from university members"""
        with app.app_context():
            university = db.session.get(University, test_university.id)

            # Create user and add to university
            user = User(
                email='uninmember@example.edu',
                first_name='Uni',
                last_name='Member',
                university=university.name
            )
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()

            university.add_member(user.id)
            db.session.commit()

            user_id = user.id

            # Verify user is in members list
            assert user_id in university.get_members_list()

            # Login and delete
            client = app.test_client()
            client.post('/api/auth/login', json={
                'email': 'uninmember@example.edu',
                'password': 'password123'
            })
            client.delete('/api/account')

            # Refresh university and check
            db.session.refresh(university)
            assert user_id not in university.get_members_list()

    def test_delete_account_deletes_notes(self, app, test_university):
        """Test that deleting account also deletes user's notes"""
        with app.app_context():
            # Create user
            user = User(
                email='noteauthor@example.edu',
                first_name='Note',
                last_name='Author'
            )
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()

            # Create note
            note = Note(
                title='Test Note',
                content='Test content',
                author_id=user.id
            )
            db.session.add(note)
            db.session.commit()
            note_id = note.id

            # Login and delete account
            client = app.test_client()
            client.post('/api/auth/login', json={
                'email': 'noteauthor@example.edu',
                'password': 'password123'
            })
            client.delete('/api/account')

            # Verify note is deleted
            deleted_note = db.session.get(Note, note_id)
            assert deleted_note is None

    def test_delete_account_deletes_messages(self, app, test_user, second_user):
        """Test that deleting account deletes user's messages"""
        with app.app_context():
            user1 = db.session.get(User, test_user.id)
            user2 = db.session.get(User, second_user.id)

            # Create messages
            msg = Message(
                sender_id=user1.id,
                recipient_id=user2.id,
                content='Hello!'
            )
            db.session.add(msg)
            db.session.commit()
            msg_id = msg.id

            # Login as test_user and delete account
            client = app.test_client()
            client.post('/api/auth/login', json={
                'email': 'test@example.edu',
                'password': 'testpassword123'
            })
            client.delete('/api/account')

            # Verify message is deleted
            deleted_msg = db.session.get(Message, msg_id)
            assert deleted_msg is None

    def test_delete_account_logs_out(self, app):
        """Test that session is cleared after account deletion"""
        with app.app_context():
            # Create user
            user = User(
                email='logout@example.edu',
                first_name='Logout',
                last_name='Test'
            )
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()

            # Login
            client = app.test_client()
            client.post('/api/auth/login', json={
                'email': 'logout@example.edu',
                'password': 'password123'
            })

            # Delete account
            client.delete('/api/account')

            # Try to access protected route
            response = client.get('/api/profile')
            assert response.status_code == 401

    def test_delete_account_nullifies_admin_role(self, app, test_university):
        """Test that if user was university admin, admin_id becomes null"""
        with app.app_context():
            university = db.session.get(University, test_university.id)

            # Create user and set as admin
            user = User(
                email='uniadmin@example.edu',
                first_name='Uni',
                last_name='Admin',
                university=university.name
            )
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()

            university.admin_id = user.id
            university.add_member(user.id)
            db.session.commit()

            uni_id = university.id

            # Login and delete
            client = app.test_client()
            client.post('/api/auth/login', json={
                'email': 'uniadmin@example.edu',
                'password': 'password123'
            })
            client.delete('/api/account')

            # Refresh university and check
            updated_uni = db.session.get(University, uni_id)
            assert updated_uni.admin_id is None

    def test_delete_account_unauthenticated(self, client):
        """Test account deletion without login returns 401"""
        response = client.delete('/api/account')
        assert response.status_code == 401
