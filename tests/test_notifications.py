"""
Notifications API Tests

Tests for notification-related endpoints:
- GET /api/notifications/university-posts - Get university member posts
- GET /api/notifications/check-new - Check for new notifications
"""

import pytest
from datetime import datetime, timedelta
from backend.models import User, University, Note
from backend.extensions import db


class TestUniversityPostsNotifications:
    """Tests for university posts notifications"""

    def test_get_university_posts_notifications(
        self, app, test_university
    ):
        """Test getting recent posts from university members"""
        with app.app_context():
            university = db.session.get(University, test_university.id)

            # Create two users in the university
            user1 = User(
                email='member1@example.edu',
                first_name='Member',
                last_name='One',
                university=university.name
            )
            user1.set_password('password123')
            db.session.add(user1)
            db.session.commit()
            university.add_member(user1.id)

            user2 = User(
                email='member2@example.edu',
                first_name='Member',
                last_name='Two',
                university=university.name
            )
            user2.set_password('password123')
            db.session.add(user2)
            db.session.commit()
            university.add_member(user2.id)
            db.session.commit()

            # User2 creates a post
            note = Note(
                title='University Post',
                content='Post from member two',
                author_id=user2.id
            )
            db.session.add(note)
            db.session.commit()

            # Login as user1 and get notifications
            client = app.test_client()
            client.post('/api/auth/login', json={
                'email': 'member1@example.edu',
                'password': 'password123'
            })

            response = client.get('/api/notifications/university-posts')

            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert len(data['posts']) >= 1
            # Should include user2's post
            assert any(p['title'] == 'University Post' for p in data['posts'])

    def test_notifications_excludes_own_posts(self, app, test_university):
        """Test that user's own posts are not in notifications"""
        with app.app_context():
            university = db.session.get(University, test_university.id)

            user = User(
                email='poster@example.edu',
                first_name='Poster',
                last_name='User',
                university=university.name
            )
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()
            university.add_member(user.id)
            db.session.commit()

            # Create own post
            note = Note(
                title='My Own Post',
                content='This should not appear in my notifications',
                author_id=user.id
            )
            db.session.add(note)
            db.session.commit()

            # Login and get notifications
            client = app.test_client()
            client.post('/api/auth/login', json={
                'email': 'poster@example.edu',
                'password': 'password123'
            })

            response = client.get('/api/notifications/university-posts')

            data = response.get_json()
            # Own posts should not be in notifications
            assert not any(p['title'] == 'My Own Post' for p in data['posts'])

    def test_notifications_user_not_in_university(self, authenticated_client, app, test_user):
        """Test notifications for user without university"""
        # test_user has no university set
        response = authenticated_client.get('/api/notifications/university-posts')

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['posts'] == []
        assert 'message' in data

    def test_notifications_unauthenticated(self, client):
        """Test that unauthenticated users cannot get notifications"""
        response = client.get('/api/notifications/university-posts')

        assert response.status_code == 401


class TestCheckNewNotifications:
    """Tests for checking new notification count"""

    def test_check_new_notifications_count(self, app, test_university):
        """Test checking for new notifications returns count"""
        with app.app_context():
            university = db.session.get(University, test_university.id)

            # Create users
            user1 = User(
                email='checker@example.edu',
                first_name='Checker',
                last_name='User',
                university=university.name
            )
            user1.set_password('password123')
            db.session.add(user1)

            user2 = User(
                email='poster2@example.edu',
                first_name='Poster',
                last_name='Two',
                university=university.name
            )
            user2.set_password('password123')
            db.session.add(user2)
            db.session.commit()

            university.add_member(user1.id)
            university.add_member(user2.id)
            db.session.commit()

            # User2 creates posts
            for i in range(3):
                note = Note(
                    title=f'New Post {i}',
                    content=f'Content {i}',
                    author_id=user2.id
                )
                db.session.add(note)
            db.session.commit()

            # Login as user1 and check
            client = app.test_client()
            client.post('/api/auth/login', json={
                'email': 'checker@example.edu',
                'password': 'password123'
            })

            response = client.get('/api/notifications/check-new')

            assert response.status_code == 200
            data = response.get_json()
            assert 'hasNew' in data
            assert 'count' in data
            assert data['count'] >= 3

    def test_check_new_since_timestamp(self, app, test_university):
        """Test checking for new posts since specific timestamp"""
        with app.app_context():
            university = db.session.get(University, test_university.id)

            # Create users
            user1 = User(
                email='timestamp@example.edu',
                first_name='Timestamp',
                last_name='User',
                university=university.name
            )
            user1.set_password('password123')
            db.session.add(user1)

            user2 = User(
                email='timestampposter@example.edu',
                first_name='Poster',
                last_name='User',
                university=university.name
            )
            user2.set_password('password123')
            db.session.add(user2)
            db.session.commit()

            university.add_member(user1.id)
            university.add_member(user2.id)
            db.session.commit()

            # Create a post
            note = Note(
                title='New Post',
                content='Content',
                author_id=user2.id
            )
            db.session.add(note)
            db.session.commit()

            # Check with a timestamp in the future (should find nothing)
            future_time = (datetime.utcnow() + timedelta(hours=1)).isoformat()

            client = app.test_client()
            client.post('/api/auth/login', json={
                'email': 'timestamp@example.edu',
                'password': 'password123'
            })

            response = client.get(f'/api/notifications/check-new?lastChecked={future_time}')

            data = response.get_json()
            assert data['hasNew'] is False
            assert data['count'] == 0

    def test_check_new_user_not_in_university(self, authenticated_client, app):
        """Test check-new for user without university"""
        response = authenticated_client.get('/api/notifications/check-new')

        assert response.status_code == 200
        data = response.get_json()
        assert data['hasNew'] is False

    def test_check_new_unauthenticated(self, client):
        """Test that unauthenticated users cannot check notifications"""
        response = client.get('/api/notifications/check-new')

        assert response.status_code == 401
