"""
Community/Notes API Tests

Tests for note-related endpoints:
- POST /api/notes/create - Create a note
- DELETE /api/notes/<id>/delete - Delete a note
- GET /api/notes - List notes
- POST /api/notes/<id>/like - Like/unlike a note
- POST /api/notes/<id>/bookmark - Bookmark/unbookmark a note
"""

import pytest
import json
from backend.models import User, Note, University
from backend.extensions import db


class TestNoteCreation:
    """Tests for creating notes"""

    def test_create_note_success(self, authenticated_client, app, test_user):
        """Test creating a note with title and content"""
        response = authenticated_client.post('/api/notes/create', json={
            'title': 'My First Note',
            'content': 'This is the content of my note.'
        })

        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        assert data['note']['title'] == 'My First Note'
        assert data['note']['content'] == 'This is the content of my note.'

    def test_create_note_with_tags(self, authenticated_client, app):
        """Test creating a note with tags"""
        response = authenticated_client.post('/api/notes/create', json={
            'title': 'Tagged Note',
            'content': 'Note content here.',
            'tags': ['python', 'machine-learning', 'ai']
        })

        assert response.status_code == 201
        data = response.get_json()
        assert 'python' in data['note']['tags']
        assert 'machine-learning' in data['note']['tags']

    def test_create_note_missing_title_fails(self, authenticated_client, app):
        """Test that creating note without title fails"""
        response = authenticated_client.post('/api/notes/create', json={
            'content': 'Content without title'
        })

        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False

    def test_create_note_missing_content_fails(self, authenticated_client, app):
        """Test that creating note without content fails"""
        response = authenticated_client.post('/api/notes/create', json={
            'title': 'Title without content'
        })

        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False

    def test_create_note_empty_fields_fails(self, authenticated_client, app):
        """Test that empty title or content fails"""
        # Empty title
        response = authenticated_client.post('/api/notes/create', json={
            'title': '',
            'content': 'Some content'
        })
        assert response.status_code == 400

        # Empty content
        response = authenticated_client.post('/api/notes/create', json={
            'title': 'Some title',
            'content': ''
        })
        assert response.status_code == 400

    def test_create_note_increments_user_post_count(self, authenticated_client, app, test_user):
        """Test that creating note increments user's post count"""
        with app.app_context():
            user = db.session.get(User, test_user.id)
            initial_count = user.post_count or 0

            authenticated_client.post('/api/notes/create', json={
                'title': 'Count Test',
                'content': 'Testing post count'
            })

            db.session.refresh(user)
            assert user.post_count == initial_count + 1

    def test_create_note_updates_university_post_count(
        self, app, test_university
    ):
        """Test that creating note updates university's recent_posts"""
        with app.app_context():
            university = db.session.get(University, test_university.id)

            # Create user in university
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

            # Login and create note
            client = app.test_client()
            client.post('/api/auth/login', json={
                'email': 'poster@example.edu',
                'password': 'password123'
            })

            client.post('/api/notes/create', json={
                'title': 'University Post',
                'content': 'Content for university'
            })

            # Check university post count
            db.session.refresh(user)
            db.session.refresh(university)
            # The update_post_count sums member post_counts
            assert university.recent_posts >= 1

    def test_create_note_unauthenticated_fails(self, client):
        """Test that unauthenticated user cannot create notes"""
        response = client.post('/api/notes/create', json={
            'title': 'Unauthorized Note',
            'content': 'Should not work'
        })

        assert response.status_code == 401


class TestNoteDeletion:
    """Tests for deleting notes"""

    def test_delete_own_note_success(self, authenticated_client, app, test_user, test_note):
        """Test that author can delete their own note"""
        with app.app_context():
            note = db.session.get(Note, test_note.id)

            response = authenticated_client.delete(f'/api/notes/{note.id}/delete')

            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True

            # Verify note is deleted
            deleted_note = db.session.get(Note, note.id)
            assert deleted_note is None

    def test_delete_other_user_note_fails(self, app, test_user, second_user):
        """Test that non-author cannot delete note"""
        with app.app_context():
            user1 = db.session.get(User, test_user.id)

            # Create note by test_user
            note = Note(
                title='Protected Note',
                content='Only author can delete',
                author_id=user1.id
            )
            db.session.add(note)
            db.session.commit()
            note_id = note.id

            # Login as second_user
            client = app.test_client()
            client.post('/api/auth/login', json={
                'email': 'second@example.edu',
                'password': 'secondpass123'
            })

            # Try to delete
            response = client.delete(f'/api/notes/{note_id}/delete')

            assert response.status_code == 403
            data = response.get_json()
            assert 'unauthorized' in data['error'].lower()

    def test_delete_note_not_found(self, authenticated_client, app):
        """Test deleting non-existent note"""
        response = authenticated_client.delete('/api/notes/99999/delete')

        assert response.status_code == 404

    def test_delete_note_decrements_post_count(self, authenticated_client, app, test_user):
        """Test that deleting note decrements user's post count"""
        with app.app_context():
            user = db.session.get(User, test_user.id)

            # Create a note first
            authenticated_client.post('/api/notes/create', json={
                'title': 'To Delete',
                'content': 'Will be deleted'
            })

            db.session.refresh(user)
            count_after_create = user.post_count

            # Get the note ID
            note = Note.query.filter_by(author_id=user.id).first()

            # Delete the note
            authenticated_client.delete(f'/api/notes/{note.id}/delete')

            db.session.refresh(user)
            assert user.post_count == count_after_create - 1


class TestNoteListing:
    """Tests for listing notes"""

    def test_list_notes_returns_all(self, client, multiple_notes, app):
        """Test that listing returns all notes"""
        response = client.get('/api/notes')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data) == 5  # multiple_notes creates 5

    def test_list_notes_filter_by_user(self, client, multiple_notes, test_user, app):
        """Test filtering notes by user ID"""
        with app.app_context():
            user = db.session.get(User, test_user.id)

            response = client.get(f'/api/notes?user={user.id}')

            assert response.status_code == 200
            data = response.get_json()
            # All notes should be from this user
            for note in data:
                assert note['author']['id'] == user.id

    def test_list_notes_search_by_title(self, client, app, test_user):
        """Test searching notes by title"""
        with app.app_context():
            user = db.session.get(User, test_user.id)

            # Create note with specific title
            note = Note(
                title='UniqueSearchableTitle',
                content='Some content',
                author_id=user.id
            )
            db.session.add(note)
            db.session.commit()

            response = client.get('/api/notes?search=UniqueSearchable')

            assert response.status_code == 200
            data = response.get_json()
            assert len(data) >= 1
            assert any('UniqueSearchableTitle' in n['title'] for n in data)

    def test_list_notes_search_by_content(self, client, app, test_user):
        """Test searching notes by content"""
        with app.app_context():
            user = db.session.get(User, test_user.id)

            # Create note with specific content
            note = Note(
                title='Regular Title',
                content='VerySpecificContentKeyword here',
                author_id=user.id
            )
            db.session.add(note)
            db.session.commit()

            response = client.get('/api/notes?search=VerySpecificContent')

            assert response.status_code == 200
            data = response.get_json()
            assert len(data) >= 1

    def test_list_notes_search_by_author_name(self, client, app, test_user, test_note):
        """Test searching notes by author name"""
        with app.app_context():
            response = client.get('/api/notes?search=Test')

            assert response.status_code == 200
            data = response.get_json()
            # Should find notes by "Test User"
            assert len(data) >= 1

    def test_list_notes_ordered_by_date(self, client, multiple_notes, app):
        """Test that notes are ordered by creation date (newest first)"""
        response = client.get('/api/notes')

        assert response.status_code == 200
        data = response.get_json()

        # Notes should be ordered by timeAgo or id (descending)
        # Since they're created nearly simultaneously, check IDs
        ids = [n['id'] for n in data]
        assert ids == sorted(ids, reverse=True)

    def test_notes_include_like_status_for_current_user(
        self, authenticated_client, app, test_user, test_note
    ):
        """Test that isLiked reflects current user's like status"""
        with app.app_context():
            note = db.session.get(Note, test_note.id)

            # First check - should not be liked
            response = authenticated_client.get('/api/notes')
            data = response.get_json()
            note_data = next(n for n in data if n['id'] == note.id)
            assert note_data['isLiked'] is False

            # Like the note
            authenticated_client.post(f'/api/notes/{note.id}/like')

            # Check again - should be liked
            response = authenticated_client.get('/api/notes')
            data = response.get_json()
            note_data = next(n for n in data if n['id'] == note.id)
            assert note_data['isLiked'] is True


class TestNoteLikes:
    """Tests for liking/unliking notes"""

    def test_like_note_increases_count(self, authenticated_client, app, test_note):
        """Test that liking increases note's like count"""
        with app.app_context():
            note = db.session.get(Note, test_note.id)
            initial_likes = note.likes

            response = authenticated_client.post(f'/api/notes/{note.id}/like')

            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert data['likes'] == initial_likes + 1
            assert data['isLiked'] is True

    def test_like_note_twice_unlikes(self, authenticated_client, app, test_note):
        """Test that liking twice toggles to unlike"""
        with app.app_context():
            note = db.session.get(Note, test_note.id)

            # First like
            authenticated_client.post(f'/api/notes/{note.id}/like')

            # Second like (should unlike)
            response = authenticated_client.post(f'/api/notes/{note.id}/like')

            assert response.status_code == 200
            data = response.get_json()
            assert data['isLiked'] is False

    def test_like_note_updates_user_liked_list(self, authenticated_client, app, test_user, test_note):
        """Test that liking updates user's liked_notes JSON"""
        with app.app_context():
            note = db.session.get(Note, test_note.id)
            user = db.session.get(User, test_user.id)

            authenticated_client.post(f'/api/notes/{note.id}/like')

            db.session.refresh(user)
            liked_list = json.loads(user.liked_notes) if user.liked_notes else []
            assert note.id in liked_list

    def test_like_nonexistent_note_fails(self, authenticated_client, app):
        """Test liking non-existent note"""
        response = authenticated_client.post('/api/notes/99999/like')

        assert response.status_code == 404

    def test_like_note_unauthenticated_fails(self, client, test_note, app):
        """Test that unauthenticated user cannot like"""
        with app.app_context():
            note = db.session.get(Note, test_note.id)

            response = client.post(f'/api/notes/{note.id}/like')

            assert response.status_code == 401


class TestNoteBookmarks:
    """Tests for bookmarking notes"""

    def test_bookmark_note_adds_to_list(self, authenticated_client, app, test_user, test_note):
        """Test that bookmarking adds note to user's list"""
        with app.app_context():
            note = db.session.get(Note, test_note.id)

            response = authenticated_client.post(f'/api/notes/{note.id}/bookmark')

            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert data['isBookmarked'] is True

    def test_bookmark_toggle(self, authenticated_client, app, test_note):
        """Test that bookmarking twice toggles off"""
        with app.app_context():
            note = db.session.get(Note, test_note.id)

            # First bookmark
            authenticated_client.post(f'/api/notes/{note.id}/bookmark')

            # Second bookmark (should remove)
            response = authenticated_client.post(f'/api/notes/{note.id}/bookmark')

            assert response.status_code == 200
            data = response.get_json()
            assert data['isBookmarked'] is False

    def test_bookmark_updates_user_bookmarked_list(
        self, authenticated_client, app, test_user, test_note
    ):
        """Test that bookmarking updates user's bookmarked_notes"""
        with app.app_context():
            note = db.session.get(Note, test_note.id)
            user = db.session.get(User, test_user.id)

            authenticated_client.post(f'/api/notes/{note.id}/bookmark')

            db.session.refresh(user)
            bookmarked_list = json.loads(user.bookmarked_notes) if user.bookmarked_notes else []
            assert note.id in bookmarked_list

    def test_bookmark_nonexistent_note_fails(self, authenticated_client, app):
        """Test bookmarking non-existent note"""
        response = authenticated_client.post('/api/notes/99999/bookmark')

        assert response.status_code == 404

    def test_bookmark_unauthenticated_fails(self, client, test_note, app):
        """Test that unauthenticated user cannot bookmark"""
        with app.app_context():
            note = db.session.get(Note, test_note.id)

            response = client.post(f'/api/notes/{note.id}/bookmark')

            assert response.status_code == 401


class TestNoteDetails:
    """Tests for note content and metadata"""

    def test_note_includes_author_info(self, client, test_note, app):
        """Test that note includes author information"""
        response = client.get('/api/notes')

        assert response.status_code == 200
        data = response.get_json()
        note = data[0]

        assert 'author' in note
        assert 'id' in note['author']
        assert 'name' in note['author']
        assert 'avatar' in note['author']

    def test_note_includes_time_ago(self, client, test_note, app):
        """Test that note includes human-readable time"""
        response = client.get('/api/notes')

        assert response.status_code == 200
        data = response.get_json()
        note = data[0]

        assert 'timeAgo' in note
        # Should be something like "Just now" or "X minutes ago"
        assert note['timeAgo'] is not None

    def test_note_includes_tags(self, client, test_note, app):
        """Test that note includes tags array"""
        response = client.get('/api/notes')

        assert response.status_code == 200
        data = response.get_json()
        note = next(n for n in data if n['id'] == test_note.id)

        assert 'tags' in note
        assert isinstance(note['tags'], list)
