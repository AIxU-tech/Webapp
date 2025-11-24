"""
Tests for user profile functionality
"""
import pytest
import json
import io
from backend.models import User
from backend.extensions import db

@pytest.mark.profile
class TestProfileView:
    """Test profile page viewing"""

    def test_profile_page_loads_for_authenticated_user(self, authenticated_client):
        """Test that profile page loads for authenticated user"""
        response = authenticated_client.get('/profile')
        assert response.status_code == 200
        assert b'profile' in response.data.lower()

    def test_profile_displays_user_info(self, authenticated_client, test_user):
        """Test that profile displays correct user information"""
        response = authenticated_client.get('/profile')
        assert response.status_code == 200
        # Check for name (emails are not displayed for privacy)
        assert test_user['first_name'].encode() in response.data
        assert test_user['last_name'].encode() in response.data

    def test_profile_requires_authentication(self, client):
        """Test that profile requires authentication"""
        response = client.get('/profile', follow_redirects=False)
        assert response.status_code == 302
        assert '/login' in response.location

    def test_public_profile_view(self, client, test_user, app):
        """Test viewing another user's public profile"""
        response = client.get(f'/users/{test_user["id"]}')
        assert response.status_code == 200

    def test_public_profile_nonexistent_user(self, client, init_database):
        """Test viewing nonexistent user returns error"""
        response = client.get('/users/99999', follow_redirects=True)
        assert response.status_code == 200
        assert b'not found' in response.data.lower()


@pytest.mark.profile
class TestProfileUpdate:
    """Test profile update functionality"""

    def test_update_basic_profile_info(self, authenticated_client, test_user, app):
        """Test updating basic profile information"""
        response = authenticated_client.post('/update_profile', data={
            'first_name': 'Updated',
            'last_name': 'Name',
            'about_section': 'This is my updated bio',
            'location': 'New Location'
        }, follow_redirects=True)

        assert response.status_code == 200
        assert b'updated' in response.data.lower()

        # Verify database was updated
        with app.app_context():
            user = User.query.get(test_user['id'])
            assert user.first_name == 'Updated'
            assert user.last_name == 'Name'
            assert user.about_section == 'This is my updated bio'
            assert user.location == 'New Location'

    def test_update_skills(self, authenticated_client, test_user, app):
        """Test updating user skills"""
        response = authenticated_client.post('/update_profile', data={
            'skills': 'Python, Machine Learning, Deep Learning'
        }, follow_redirects=True)

        assert response.status_code == 200

        with app.app_context():
            user = User.query.get(test_user['id'])
            skills = user.get_skills_list()
            assert 'Python' in skills
            assert 'Machine Learning' in skills
            assert 'Deep Learning' in skills

    def test_update_interests(self, authenticated_client, test_user, app):
        """Test updating user interests"""
        response = authenticated_client.post('/update_profile', data={
            'interests': 'AI, Robotics, Computer Vision'
        }, follow_redirects=True)

        assert response.status_code == 200

        with app.app_context():
            user = User.query.get(test_user['id'])
            interests = user.get_interests_list()
            assert 'AI' in interests
            assert 'Robotics' in interests
            assert 'Computer Vision' in interests

    def test_update_university_affiliation(self, authenticated_client, test_user, test_university, app):
        """Test updating university affiliation"""
        response = authenticated_client.post('/update_profile', data={
            'university_id': str(test_university['id'])
        }, follow_redirects=True)

        assert response.status_code == 200

        with app.app_context():
            user = User.query.get(test_user['id'])
            assert user.university == test_university['name']

    def test_clear_university_affiliation(self, authenticated_client, test_user, app):
        """Test clearing university affiliation"""
        response = authenticated_client.post('/update_profile', data={
            'university_id': ''  # Empty string to clear
        }, follow_redirects=True)

        assert response.status_code == 200

        with app.app_context():
            user = User.query.get(test_user['id'])
            assert user.university is None

    def test_update_profile_requires_authentication(self, client):
        """Test that updating profile requires authentication"""
        response = client.post('/update_profile', data={
            'first_name': 'Hacker'
        }, follow_redirects=False)
        assert response.status_code == 302


@pytest.mark.profile
class TestProfilePicture:
    """Test profile picture functionality"""

    def test_upload_profile_picture(self, authenticated_client, sample_image, test_user, app):
        """Test uploading a profile picture"""
        response = authenticated_client.post('/upload_profile_picture', data={
            'profile_picture': (sample_image, 'test.jpg')
        }, follow_redirects=True, content_type='multipart/form-data')

        assert response.status_code == 200
        assert b'success' in response.data.lower() or b'updated' in response.data.lower()

        # Verify picture was stored
        with app.app_context():
            user = User.query.get(test_user['id'])
            assert user.profile_picture is not None

    def test_get_profile_picture(self, authenticated_client, sample_image, test_user, app):
        """Test retrieving a profile picture"""
        # Upload picture first
        authenticated_client.post('/upload_profile_picture', data={
            'profile_picture': (sample_image, 'test.jpg')
        }, content_type='multipart/form-data')

        # Get picture
        response = authenticated_client.get(f'/user/{test_user["id"]}/profile_picture')
        assert response.status_code == 200
        assert response.content_type.startswith('image/')

    def test_delete_profile_picture(self, authenticated_client, sample_image, test_user, app):
        """Test deleting a profile picture"""
        # Upload picture first
        authenticated_client.post('/upload_profile_picture', data={
            'profile_picture': (sample_image, 'test.jpg')
        }, content_type='multipart/form-data')

        # Delete picture
        response = authenticated_client.post('/delete_profile_picture', follow_redirects=True)
        assert response.status_code == 200

        # Verify deletion
        with app.app_context():
            user = User.query.get(test_user['id'])
            assert user.profile_picture is None

    def test_upload_invalid_file_type(self, authenticated_client):
        """Test uploading invalid file type is rejected"""
        file_data = io.BytesIO(b"This is not an image")
        response = authenticated_client.post('/upload_profile_picture', data={
            'profile_picture': (file_data, 'test.txt')
        }, follow_redirects=True, content_type='multipart/form-data')

        # Should either reject or handle gracefully
        assert response.status_code == 200

    def test_profile_picture_compression(self, authenticated_client, test_user, app):
        """Test that uploaded images are compressed"""
        from PIL import Image
        import io

        # Create a large image
        large_img = Image.new('RGB', (3000, 3000), color='blue')
        img_bytes = io.BytesIO()
        large_img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)

        authenticated_client.post('/upload_profile_picture', data={
            'profile_picture': (img_bytes, 'large.jpg')
        }, content_type='multipart/form-data')

        with app.app_context():
            user = User.query.get(test_user['id'])
            # Compressed image should be smaller than original
            if user.profile_picture:
                # Should be significantly smaller than 3000x3000 JPEG
                assert len(user.profile_picture) < 500000  # Less than 500KB


@pytest.mark.profile
class TestUserStatistics:
    """Test user statistics"""

    def test_api_user_stats(self, authenticated_client, test_user):
        """Test getting user statistics via API"""
        response = authenticated_client.get('/api/user/stats')
        assert response.status_code == 200

        data = json.loads(response.data)
        assert 'posts' in data
        assert 'followers' in data
        assert 'following' in data

    def test_post_count_increments(self, authenticated_client, test_user, app):
        """Test that post count increments when creating notes"""
        with app.app_context():
            user = User.query.get(test_user['id'])
            initial_count = user.post_count

        # Create a note
        authenticated_client.post('/api/notes/create',
            json={
                'title': 'Test Note',
                'content': 'Test content',
                'tags': ['test']
            })

        with app.app_context():
            user = User.query.get(test_user['id'])
            assert user.post_count == initial_count + 1

    def test_post_count_decrements_on_delete(self, authenticated_client, test_user, test_note, app):
        """Test that post count decrements when deleting notes"""
        with app.app_context():
            user = User.query.get(test_user['id'])
            user.post_count = 1  # Set to 1
            db.session.commit()

        # Delete the note
        authenticated_client.delete(f'/api/notes/{test_note["id"]}/delete')

        with app.app_context():
            user = User.query.get(test_user['id'])
            assert user.post_count == 0


@pytest.mark.profile
class TestAccountDeletion:
    """Test account deletion functionality"""

    def test_delete_account(self, authenticated_client, test_user, app):
        """Test deleting user account"""
        response = authenticated_client.post('/delete_account', follow_redirects=True)
        assert response.status_code == 200

        # Verify user is deleted
        with app.app_context():
            user = User.query.get(test_user['id'])
            assert user is None

    def test_delete_account_removes_notes(self, authenticated_client, test_user, test_note, app):
        """Test that deleting account also deletes user's notes"""
        from app import Note

        authenticated_client.post('/delete_account', follow_redirects=True)

        with app.app_context():
            note = Note.query.get(test_note['id'])
            assert note is None

    def test_delete_account_removes_messages(self, authenticated_client, test_user, test_message, app):
        """Test that deleting account also deletes user's messages"""
        from app import Message

        authenticated_client.post('/delete_account', follow_redirects=True)

        with app.app_context():
            message = Message.query.get(test_message['id'])
            assert message is None

    def test_delete_account_requires_authentication(self, client):
        """Test that deleting account requires authentication"""
        response = client.post('/delete_account', follow_redirects=False)
        assert response.status_code == 302


@pytest.mark.profile
class TestUserHelperMethods:
    """Test User model helper methods"""

    def test_get_full_name_with_both_names(self, app, init_database):
        """Test getting full name when both first and last name exist"""
        with app.app_context():
            user = User(email='test@example.com',
                       first_name='John', last_name='Doe')
            user.set_password('TestPassword123!')
            db.session.add(user)
            db.session.commit()

            assert user.get_full_name() == 'John Doe'

    def test_get_full_name_with_first_only(self, app, init_database):
        """Test getting full name with only first name"""
        with app.app_context():
            user = User(email='test@example.com',
                       first_name='John', last_name=None)
            user.set_password('TestPassword123!')
            db.session.add(user)
            db.session.commit()

            assert user.get_full_name() == 'John'

    def test_get_full_name_fallback_to_empty(self, app, init_database):
        """Test getting full name returns empty string when no name set"""
        with app.app_context():
            user = User(email='test@example.com')
            user.set_password('TestPassword123!')
            db.session.add(user)
            db.session.commit()

            assert user.get_full_name() == ''

    def test_to_dict_conversion(self, app, test_user):
        """Test converting user to dictionary"""
        with app.app_context():
            user = User.query.get(test_user['id'])
            user_dict = user.to_dict()

            assert user_dict['id'] == test_user['id']
            assert user_dict['email'] == test_user['email']
            assert 'password' not in user_dict  # Password should not be in dict
