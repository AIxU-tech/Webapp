"""
Notifications Tests

Tests for the notification system:
- Notification model upsert/decrement logic
- Like/unlike notification lifecycle
- Comment notification lifecycle
- REST API endpoints
"""

import pytest
from datetime import datetime, timedelta
from backend.models import User, University, Note, NoteLike, NoteComment
from backend.models.notification import Notification
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


# =========================================================================
# Helper to create two users + a post authored by user1
# =========================================================================

def _setup_users_and_post(app):
    """Create an author, a liker, and a post. Returns (author, liker, note)."""
    author = User(email='author@test.edu', first_name='Author', last_name='User')
    author.set_password('pass123')
    liker = User(email='liker@test.edu', first_name='Liker', last_name='User')
    liker.set_password('pass123')
    db.session.add_all([author, liker])
    db.session.commit()

    note = Note(title='Test Post', content='Hello world', author_id=author.id)
    db.session.add(note)
    db.session.commit()
    return author, liker, note


# =========================================================================
# Model-level upsert / decrement tests
# =========================================================================

class TestNotificationUpsert:
    """Tests for Notification.upsert_for_event"""

    def test_single_like_creates_notification(self, app):
        with app.app_context():
            author, liker, note = _setup_users_and_post(app)

            notif = Notification.upsert_for_event(
                recipient_id=author.id, actor_id=liker.id,
                verb='like', target_id=note.id, target_type='post',
                extra={'actor_name': 'Liker User'},
            )
            db.session.commit()

            assert notif is not None
            assert notif.recipient_id == author.id
            assert notif.actor_id == liker.id
            assert notif.extra_data['count'] == 1
            assert notif.is_read is False

    def test_self_like_creates_nothing(self, app):
        with app.app_context():
            author, _, note = _setup_users_and_post(app)

            notif = Notification.upsert_for_event(
                recipient_id=author.id, actor_id=author.id,
                verb='like', target_id=note.id, target_type='post',
                extra={'actor_name': 'Author User'},
            )

            assert notif is None
            assert Notification.query.count() == 0

    def test_second_like_aggregates(self, app):
        with app.app_context():
            author, liker, note = _setup_users_and_post(app)

            liker2 = User(email='liker2@test.edu', first_name='Second', last_name='Liker')
            liker2.set_password('pass123')
            db.session.add(liker2)
            db.session.commit()

            Notification.upsert_for_event(
                recipient_id=author.id, actor_id=liker.id,
                verb='like', target_id=note.id, target_type='post',
                extra={'actor_name': 'Liker User'},
            )
            db.session.commit()

            notif = Notification.upsert_for_event(
                recipient_id=author.id, actor_id=liker2.id,
                verb='like', target_id=note.id, target_type='post',
                extra={'actor_name': 'Second Liker'},
            )
            db.session.commit()

            assert Notification.query.count() == 1
            assert notif.extra_data['count'] == 2
            assert notif.actor_id == liker2.id
            assert notif.extra_data['actor_name'] == 'Second Liker'

    def test_like_read_then_new_like_resurfaces(self, app):
        """After marking read, a new like should aggregate and flip back to unread."""
        with app.app_context():
            author, liker, note = _setup_users_and_post(app)

            liker2 = User(email='liker2@test.edu', first_name='Second', last_name='Liker')
            liker2.set_password('pass123')
            db.session.add(liker2)
            db.session.commit()

            Notification.upsert_for_event(
                recipient_id=author.id, actor_id=liker.id,
                verb='like', target_id=note.id, target_type='post',
                extra={'actor_name': 'Liker User'},
            )
            db.session.commit()

            # Mark as read (simulates opening the bell)
            notif = Notification.query.first()
            notif.is_read = True
            db.session.commit()

            # New like should aggregate into the same row
            Notification.upsert_for_event(
                recipient_id=author.id, actor_id=liker2.id,
                verb='like', target_id=note.id, target_type='post',
                extra={'actor_name': 'Second Liker'},
            )
            db.session.commit()

            assert Notification.query.count() == 1
            updated = Notification.query.first()
            assert updated.extra_data['count'] == 2
            assert updated.is_read is False
            assert updated.actor_id == liker2.id


class TestNotificationDecrement:
    """Tests for Notification.decrement_for_event"""

    def test_unlike_with_count_1_deletes_row(self, app):
        with app.app_context():
            author, liker, note = _setup_users_and_post(app)

            Notification.upsert_for_event(
                recipient_id=author.id, actor_id=liker.id,
                verb='like', target_id=note.id, target_type='post',
                extra={'actor_name': 'Liker User'},
            )
            db.session.commit()
            assert Notification.query.count() == 1

            result = Notification.decrement_for_event(
                recipient_id=author.id, verb='like', target_id=note.id,
                get_latest_actor_fn=lambda: None,
            )
            db.session.commit()

            assert result is None
            assert Notification.query.count() == 0

    def test_unlike_with_count_gt1_decrements(self, app):
        with app.app_context():
            author, liker, note = _setup_users_and_post(app)

            liker2 = User(email='liker2@test.edu', first_name='Second', last_name='Liker')
            liker2.set_password('pass123')
            db.session.add(liker2)
            db.session.commit()

            # Two likes
            Notification.upsert_for_event(
                recipient_id=author.id, actor_id=liker.id,
                verb='like', target_id=note.id, target_type='post',
                extra={'actor_name': 'Liker User'},
            )
            db.session.commit()
            Notification.upsert_for_event(
                recipient_id=author.id, actor_id=liker2.id,
                verb='like', target_id=note.id, target_type='post',
                extra={'actor_name': 'Second Liker'},
            )
            db.session.commit()
            assert Notification.query.first().extra_data['count'] == 2

            # Unlike by liker2 — liker is the remaining actor
            result = Notification.decrement_for_event(
                recipient_id=author.id, verb='like', target_id=note.id,
                get_latest_actor_fn=lambda: (liker.id, 'Liker User', None),
            )
            db.session.commit()

            assert result is not None
            assert Notification.query.count() == 1
            assert result.extra_data['count'] == 1
            assert result.actor_id == liker.id

    def test_unlike_read_notification_still_cleans_up(self, app):
        """Decrement should find and clean up read notifications too."""
        with app.app_context():
            author, liker, note = _setup_users_and_post(app)

            Notification.upsert_for_event(
                recipient_id=author.id, actor_id=liker.id,
                verb='like', target_id=note.id, target_type='post',
                extra={'actor_name': 'Liker User'},
            )
            db.session.commit()

            # Mark as read
            notif = Notification.query.first()
            notif.is_read = True
            db.session.commit()

            # Unlike should still delete the read notification
            result = Notification.decrement_for_event(
                recipient_id=author.id, verb='like', target_id=note.id,
                get_latest_actor_fn=lambda: None,
            )
            db.session.commit()

            assert result is None
            assert Notification.query.count() == 0

    def test_unlike_no_notification_is_noop(self, app):
        with app.app_context():
            result = Notification.decrement_for_event(
                recipient_id=999, verb='like', target_id=999,
                get_latest_actor_fn=lambda: None,
            )
            assert result is None


# =========================================================================
# Full lifecycle tests (the exact scenarios that broke)
# =========================================================================

class TestNotificationLifecycle:
    """End-to-end like/unlike/read cycles tested through the API."""

    def test_like_unlike_removes_notification(self, app):
        """Like then unlike should leave zero notifications."""
        with app.app_context():
            author, liker, note = _setup_users_and_post(app)

            # Like
            NoteLike.create(liker.id, note.id)
            note.likes += 1
            db.session.commit()

            Notification.upsert_for_event(
                recipient_id=author.id, actor_id=liker.id,
                verb='like', target_id=note.id, target_type='post',
                extra={'actor_name': 'Liker User'},
            )
            db.session.commit()
            assert Notification.query.count() == 1

            # Unlike
            NoteLike.delete(liker.id, note.id)
            note.likes -= 1
            db.session.commit()

            def get_latest():
                latest = NoteLike.query.filter(
                    NoteLike.note_id == note.id,
                    NoteLike.user_id != author.id,
                ).order_by(NoteLike.created_at.desc()).first()
                if not latest:
                    return None
                u = db.session.get(User, latest.user_id)
                return (u.id, u.get_full_name(), None)

            Notification.decrement_for_event(
                recipient_id=author.id, verb='like', target_id=note.id,
                get_latest_actor_fn=get_latest,
            )
            db.session.commit()

            assert Notification.query.count() == 0

    def test_like_read_unlike_relike_single_row(self, app):
        """Like → read → unlike → re-like should end with exactly one notification at count=1."""
        with app.app_context():
            author, liker, note = _setup_users_and_post(app)

            # 1. Like
            NoteLike.create(liker.id, note.id)
            db.session.commit()
            Notification.upsert_for_event(
                recipient_id=author.id, actor_id=liker.id,
                verb='like', target_id=note.id, target_type='post',
                extra={'actor_name': 'Liker User'},
            )
            db.session.commit()

            # 2. Read
            Notification.query.first().is_read = True
            db.session.commit()

            # 3. Unlike
            NoteLike.delete(liker.id, note.id)
            db.session.commit()
            Notification.decrement_for_event(
                recipient_id=author.id, verb='like', target_id=note.id,
                get_latest_actor_fn=lambda: None,
            )
            db.session.commit()
            assert Notification.query.count() == 0

            # 4. Re-like
            NoteLike.create(liker.id, note.id)
            db.session.commit()
            Notification.upsert_for_event(
                recipient_id=author.id, actor_id=liker.id,
                verb='like', target_id=note.id, target_type='post',
                extra={'actor_name': 'Liker User'},
            )
            db.session.commit()

            assert Notification.query.count() == 1
            final = Notification.query.first()
            assert final.extra_data['count'] == 1
            assert final.is_read is False

    def test_comment_then_delete_removes_notification(self, app):
        """Comment then delete should leave zero notifications."""
        with app.app_context():
            author, commenter, note = _setup_users_and_post(app)

            comment = NoteComment(
                note_id=note.id, user_id=commenter.id, text='Great post!'
            )
            db.session.add(comment)
            db.session.commit()

            Notification.upsert_for_event(
                recipient_id=author.id, actor_id=commenter.id,
                verb='comment', target_id=note.id, target_type='post',
                extra={'actor_name': 'Liker User', 'snippet': 'Great post!'},
            )
            db.session.commit()
            assert Notification.query.count() == 1

            # Delete comment
            db.session.delete(comment)
            db.session.commit()

            def get_latest():
                latest = NoteComment.query.filter(
                    NoteComment.note_id == note.id,
                    NoteComment.user_id != author.id,
                ).order_by(NoteComment.created_at.desc()).first()
                if not latest:
                    return None
                u = db.session.get(User, latest.user_id)
                return (u.id, u.get_full_name(), latest.text)

            Notification.decrement_for_event(
                recipient_id=author.id, verb='comment', target_id=note.id,
                get_latest_actor_fn=get_latest,
            )
            db.session.commit()

            assert Notification.query.count() == 0


# =========================================================================
# REST endpoint tests
# =========================================================================

class TestNotificationEndpoints:
    """Tests for notification REST API."""

    def _create_notification(self, app):
        """Helper: create author, liker, note, and one like notification."""
        author, liker, note = _setup_users_and_post(app)
        notif = Notification.upsert_for_event(
            recipient_id=author.id, actor_id=liker.id,
            verb='like', target_id=note.id, target_type='post',
            extra={'actor_name': 'Liker User', 'post_title': 'Test Post'},
        )
        db.session.commit()
        return author, notif

    def test_get_notifications_list(self, app):
        with app.app_context():
            author, notif = self._create_notification(app)

            client = app.test_client()
            client.post('/api/auth/login', json={
                'email': 'author@test.edu', 'password': 'pass123'
            })

            response = client.get('/api/notifications')
            assert response.status_code == 200
            data = response.get_json()
            assert len(data) == 1
            assert data[0]['verb'] == 'like'

    def test_get_unread_count(self, app):
        with app.app_context():
            author, notif = self._create_notification(app)

            client = app.test_client()
            client.post('/api/auth/login', json={
                'email': 'author@test.edu', 'password': 'pass123'
            })

            response = client.get('/api/notifications/count')
            data = response.get_json()
            assert data['count'] == 1

    def test_mark_all_read(self, app):
        with app.app_context():
            author, notif = self._create_notification(app)

            client = app.test_client()
            client.post('/api/auth/login', json={
                'email': 'author@test.edu', 'password': 'pass123'
            })

            client.patch('/api/notifications/read-all')

            response = client.get('/api/notifications/count')
            assert response.get_json()['count'] == 0

    def test_endpoints_require_auth(self, client):
        assert client.get('/api/notifications').status_code == 401
        assert client.get('/api/notifications/count').status_code == 401
        assert client.patch('/api/notifications/read-all').status_code == 401
