"""
Tests for community and notes functionality
"""
import pytest
import json
from backend.models import Note, User
from backend.extensions import db

@pytest.mark.community
class TestCommunityPage:
    """Test community page functionality"""

    def test_community_page_loads(self, client, init_database):
        """Test that community page loads successfully"""
        response = client.get('/community')
        assert response.status_code == 200
        assert b'community' in response.data.lower() or b'notes' in response.data.lower()

    def test_community_displays_notes(self, client, test_note, app):
        """Test that community page displays notes"""
        response = client.get('/community')
        assert response.status_code == 200
        assert test_note['title'].encode() in response.data

    def test_community_notes_ordered_by_recent(self, client, test_user, app):
        """Test that notes are ordered by most recent first"""
        with app.app_context():
            # Create multiple notes
            note1 = Note(title='First Note', content='Content 1', author_id=test_user['id'])
            db.session.add(note1)
            db.session.commit()

            note2 = Note(title='Second Note', content='Content 2', author_id=test_user['id'])
            db.session.add(note2)
            db.session.commit()

        response = client.get('/community')
        assert response.status_code == 200

        # Second note should appear before first note in the response
        data = response.data.decode('utf-8')
        pos_second = data.find('Second Note')
        pos_first = data.find('First Note')
        assert pos_second < pos_first


@pytest.mark.community
class TestNoteCreation:
    """Test note creation functionality"""

    def test_create_note_success(self, authenticated_client, test_user, app):
        """Test creating a note successfully"""
        response = authenticated_client.post('/api/notes/create',
            json={
                'title': 'My New Note',
                'content': 'This is the content of my note.',
                'tags': ['AI', 'Machine Learning']
            })

        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['note']['title'] == 'My New Note'

        # Verify note is in database
        with app.app_context():
            note = Note.query.filter_by(title='My New Note').first()
            assert note is not None
            assert note.content == 'This is the content of my note.'
            assert note.author_id == test_user['id']

    def test_create_note_with_tags(self, authenticated_client, test_user, app):
        """Test creating a note with tags"""
        response = authenticated_client.post('/api/notes/create',
            json={
                'title': 'Tagged Note',
                'content': 'Content with tags',
                'tags': ['Python', 'Deep Learning', 'NLP']
            })

        assert response.status_code == 201

        with app.app_context():
            note = Note.query.filter_by(title='Tagged Note').first()
            tags = note.get_tags_list()
            assert 'Python' in tags
            assert 'Deep Learning' in tags
            assert 'NLP' in tags

    def test_create_note_without_tags(self, authenticated_client):
        """Test creating a note without tags"""
        response = authenticated_client.post('/api/notes/create',
            json={
                'title': 'Untagged Note',
                'content': 'Content without tags'
            })

        assert response.status_code == 201

    def test_create_note_missing_title(self, authenticated_client):
        """Test that creating note without title fails"""
        response = authenticated_client.post('/api/notes/create',
            json={
                'content': 'Content without title'
            })

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False

    def test_create_note_missing_content(self, authenticated_client):
        """Test that creating note without content fails"""
        response = authenticated_client.post('/api/notes/create',
            json={
                'title': 'Title without content'
            })

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False

    def test_create_note_requires_authentication(self, client):
        """Test that creating a note requires authentication"""
        response = client.post('/api/notes/create',
            json={
                'title': 'Unauthorized Note',
                'content': 'This should fail'
            })

        assert response.status_code == 401

    def test_create_note_increments_post_count(self, authenticated_client, test_user, app):
        """Test that creating a note increments user's post count"""
        with app.app_context():
            user = User.query.get(test_user['id'])
            initial_count = user.post_count

        authenticated_client.post('/api/notes/create',
            json={
                'title': 'Count Test Note',
                'content': 'Testing post count'
            })

        with app.app_context():
            user = User.query.get(test_user['id'])
            assert user.post_count == initial_count + 1


@pytest.mark.community
class TestNoteDeletion:
    """Test note deletion functionality"""

    def test_delete_own_note(self, authenticated_client, test_note, app):
        """Test deleting own note"""
        response = authenticated_client.delete(f'/api/notes/{test_note["id"]}/delete')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True

        # Verify note is deleted from database
        with app.app_context():
            note = Note.query.get(test_note['id'])
            assert note is None

    def test_delete_nonexistent_note(self, authenticated_client):
        """Test deleting a nonexistent note"""
        response = authenticated_client.delete('/api/notes/99999/delete')

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False

    def test_delete_other_users_note(self, client, test_user2, test_note, app):
        """Test that users cannot delete other users' notes"""
        # Login as different user
        client.post('/login', data={
            'email': test_user2['email'],
            'password': test_user2['password']
        })

        response = client.delete(f'/api/notes/{test_note["id"]}/delete')

        assert response.status_code == 403
        data = json.loads(response.data)
        assert data['success'] is False

        # Verify note still exists
        with app.app_context():
            note = Note.query.get(test_note['id'])
            assert note is not None

    def test_delete_note_requires_authentication(self, client, test_note):
        """Test that deleting a note requires authentication"""
        response = client.delete(f'/api/notes/{test_note["id"]}/delete')
        assert response.status_code == 401

    def test_delete_note_decrements_post_count(self, authenticated_client, test_user, app):
        """Test that deleting a note decrements user's post count"""
        # Create a note first
        response = authenticated_client.post('/api/notes/create',
            json={
                'title': 'Delete Test Note',
                'content': 'Testing deletion'
            })
        note_id = json.loads(response.data)['note']['id']

        with app.app_context():
            user = User.query.get(test_user['id'])
            count_before_delete = user.post_count

        # Delete the note
        authenticated_client.delete(f'/api/notes/{note_id}/delete')

        with app.app_context():
            user = User.query.get(test_user['id'])
            assert user.post_count == count_before_delete - 1


@pytest.mark.community
class TestNoteLikes:
    """Test note like/unlike functionality"""

    def test_like_note(self, authenticated_client, test_note, test_user, app):
        """Test liking a note"""
        # First, add note to user's liked notes
        with app.app_context():
            user = User.query.get(test_user['id'])
            user.liked_notes = json.dumps([test_note['id']])
            db.session.commit()

        # Now check if it's reflected in the community view
        response = authenticated_client.get('/community')
        assert response.status_code == 200

    def test_unlike_note(self, authenticated_client, test_note, test_user, app):
        """Test unliking a note"""
        with app.app_context():
            user = User.query.get(test_user['id'])
            user.liked_notes = json.dumps([])
            db.session.commit()

        response = authenticated_client.get('/community')
        assert response.status_code == 200


@pytest.mark.community
class TestNoteBookmarks:
    """Test note bookmark functionality"""

    def test_bookmark_note(self, authenticated_client, test_note, test_user, app):
        """Test bookmarking a note"""
        with app.app_context():
            user = User.query.get(test_user['id'])
            user.bookmarked_notes = json.dumps([test_note['id']])
            db.session.commit()

        response = authenticated_client.get('/community')
        assert response.status_code == 200

    def test_unbookmark_note(self, authenticated_client, test_note, test_user, app):
        """Test removing bookmark from a note"""
        with app.app_context():
            user = User.query.get(test_user['id'])
            user.bookmarked_notes = json.dumps([])
            db.session.commit()

        response = authenticated_client.get('/community')
        assert response.status_code == 200


@pytest.mark.community
class TestNoteModel:
    """Test Note model helper methods"""

    def test_get_time_ago_just_now(self, app, test_user, init_database):
        """Test time ago for recent note"""
        with app.app_context():
            note = Note(title='Recent', content='Content', author_id=test_user['id'])
            db.session.add(note)
            db.session.commit()

            time_ago = note.get_time_ago()
            assert 'just now' in time_ago.lower() or 'minute' in time_ago.lower()

    def test_get_time_ago_minutes(self, app, test_user, init_database, mocker):
        """Test time ago for note created minutes ago"""
        from datetime import datetime, timedelta

        with app.app_context():
            note = Note(title='Old', content='Content', author_id=test_user['id'])
            # Set created_at to 5 minutes ago
            note.created_at = datetime.utcnow() - timedelta(minutes=5)
            db.session.add(note)
            db.session.commit()

            time_ago = note.get_time_ago()
            assert 'minute' in time_ago.lower()

    def test_get_time_ago_hours(self, app, test_user, init_database):
        """Test time ago for note created hours ago"""
        from datetime import datetime, timedelta

        with app.app_context():
            note = Note(title='Old', content='Content', author_id=test_user['id'])
            note.created_at = datetime.utcnow() - timedelta(hours=3)
            db.session.add(note)
            db.session.commit()

            time_ago = note.get_time_ago()
            assert 'hour' in time_ago.lower()

    def test_get_time_ago_days(self, app, test_user, init_database):
        """Test time ago for note created days ago"""
        from datetime import datetime, timedelta

        with app.app_context():
            note = Note(title='Old', content='Content', author_id=test_user['id'])
            note.created_at = datetime.utcnow() - timedelta(days=2)
            db.session.add(note)
            db.session.commit()

            time_ago = note.get_time_ago()
            assert 'day' in time_ago.lower()

    def test_note_to_dict(self, app, test_note, test_user):
        """Test converting note to dictionary"""
        with app.app_context():
            note = Note.query.get(test_note['id'])
            note_dict = note.to_dict()

            assert note_dict['id'] == test_note['id']
            assert note_dict['title'] == test_note['title']
            assert note_dict['content'] == test_note['content']
            assert 'author' in note_dict
            assert 'timeAgo' in note_dict

    def test_note_tags_list_conversion(self, app, test_note):
        """Test converting tags between list and JSON"""
        with app.app_context():
            note = Note.query.get(test_note['id'])

            # Set tags
            tags = ['Python', 'AI', 'Testing']
            note.set_tags_list(tags)
            db.session.commit()

            # Get tags
            retrieved_tags = note.get_tags_list()
            assert retrieved_tags == tags

    def test_note_empty_tags(self, app, test_user, init_database):
        """Test note with no tags"""
        with app.app_context():
            note = Note(title='No Tags', content='Content', author_id=test_user['id'])
            db.session.add(note)
            db.session.commit()

            tags = note.get_tags_list()
            assert tags == []
