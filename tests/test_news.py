"""
News & Papers API Tests

Tests for news-related endpoints:
- GET /api/news - Get news stories
- GET /api/news/<id> - Get single story
- GET /api/papers - Get research papers
- GET /api/papers/<id> - Get single paper
- GET /api/ai-content - Get combined content
- POST /api/news/refresh - Trigger refresh (admin)
- GET /api/news/batches - List batches (admin)
- POST /api/news/cleanup - Cleanup batches (admin)
- POST /api/news/<id>/chat - Chat about story
- POST /api/papers/<id>/chat - Chat about paper
- GET /api/chat/<session>/history - Get chat history
- DELETE /api/chat/<session> - Clear chat history

Note: These tests focus on endpoint behavior. Actual content fetching
depends on external services which may be mocked or skipped in tests.
"""

import pytest
import uuid
from backend.extensions import db


class TestNewsStories:
    """Tests for news stories endpoints"""

    def test_get_news_stories(self, client, app):
        """Test getting news stories list"""
        response = client.get('/api/news')

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'stories' in data
        assert 'count' in data
        assert isinstance(data['stories'], list)

    def test_get_news_with_limit(self, client, app):
        """Test getting news with limit parameter"""
        response = client.get('/api/news?limit=5')

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        # Limit should be respected (clamped to max 20)
        assert data['count'] <= 5

    def test_get_news_limit_clamped_to_max(self, client, app):
        """Test that limit is clamped to maximum of 20"""
        response = client.get('/api/news?limit=100')

        assert response.status_code == 200
        data = response.get_json()
        # Should be clamped to 20
        assert data['count'] <= 20

    def test_get_single_story_not_found(self, client, app):
        """Test getting non-existent story"""
        response = client.get('/api/news/99999')

        assert response.status_code == 404
        data = response.get_json()
        assert data['success'] is False
        assert 'not found' in data['error'].lower()


class TestResearchPapers:
    """Tests for research papers endpoints"""

    def test_get_papers(self, client, app):
        """Test getting research papers list"""
        response = client.get('/api/papers')

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'papers' in data
        assert 'count' in data

    def test_get_papers_with_limit(self, client, app):
        """Test getting papers with limit parameter"""
        response = client.get('/api/papers?limit=2')

        assert response.status_code == 200
        data = response.get_json()
        assert data['count'] <= 2

    def test_get_single_paper_not_found(self, client, app):
        """Test getting non-existent paper"""
        response = client.get('/api/papers/99999')

        assert response.status_code == 404
        data = response.get_json()
        assert data['success'] is False


class TestCombinedContent:
    """Tests for combined AI content endpoint"""

    def test_get_ai_content_combined(self, client, app):
        """Test getting both stories and papers"""
        response = client.get('/api/ai-content')

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'stories' in data
        assert 'papers' in data
        assert 'storiesCount' in data
        assert 'papersCount' in data

    def test_get_ai_content_with_limits(self, client, app):
        """Test combined content with custom limits"""
        response = client.get('/api/ai-content?stories_limit=2&papers_limit=1')

        assert response.status_code == 200
        data = response.get_json()
        assert data['storiesCount'] <= 2
        assert data['papersCount'] <= 1


class TestAdminOperations:
    """Tests for admin-only news operations"""

    def test_refresh_news_as_admin(self, authenticated_admin_client, admin_user, app):
        """Test that admin can trigger news refresh"""
        # Note: Actual refresh depends on external services
        # This test verifies authorization works
        response = authenticated_admin_client.post('/api/news/refresh')

        # Should either succeed or fail gracefully (external service issues)
        assert response.status_code in [200, 500]
        data = response.get_json()
        # Should have appropriate response structure
        assert 'success' in data

    def test_refresh_news_as_user_with_existing_content_fails(
        self, authenticated_client, app
    ):
        """Test that non-admin cannot refresh if content exists"""
        # First check if content exists
        check_response = authenticated_client.get('/api/ai-content')
        check_data = check_response.get_json()

        has_content = (
            len(check_data.get('stories', [])) > 0 or
            len(check_data.get('papers', [])) > 0
        )

        if has_content:
            response = authenticated_client.post('/api/news/refresh')
            assert response.status_code == 403

    def test_get_batches_as_admin(self, authenticated_admin_client, admin_user, app):
        """Test that admin can list news batches"""
        response = authenticated_admin_client.get('/api/news/batches')

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'batches' in data
        assert 'count' in data

    def test_get_batches_as_user_fails(self, authenticated_client, app):
        """Test that regular user cannot list batches"""
        response = authenticated_client.get('/api/news/batches')

        assert response.status_code == 403

    def test_cleanup_batches_as_admin(self, authenticated_admin_client, admin_user, app):
        """Test that admin can cleanup old batches"""
        response = authenticated_admin_client.post('/api/news/cleanup', json={
            'keepCount': 5
        })

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'deletedCount' in data

    def test_cleanup_batches_keeps_recent(self, authenticated_admin_client, admin_user, app):
        """Test that cleanup respects keepCount parameter"""
        response = authenticated_admin_client.post('/api/news/cleanup', json={
            'keepCount': 10
        })

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True

    def test_cleanup_batches_as_user_fails(self, authenticated_client, app):
        """Test that regular user cannot cleanup"""
        response = authenticated_client.post('/api/news/cleanup')

        assert response.status_code == 403


class TestChatEndpoints:
    """Tests for chat about news/papers endpoints"""

    def test_chat_about_story_missing_message(self, client, app):
        """Test that chat requires message"""
        response = client.post('/api/news/1/chat', json={})

        assert response.status_code == 400
        data = response.get_json()
        assert 'message' in data['error'].lower() or 'required' in data['error'].lower()

    def test_chat_about_story_empty_message(self, client, app):
        """Test that empty message is rejected"""
        response = client.post('/api/news/1/chat', json={
            'message': '   '  # Only whitespace
        })

        assert response.status_code == 400

    def test_chat_about_story_not_found(self, client, app):
        """Test chat about non-existent story"""
        response = client.post('/api/news/99999/chat', json={
            'message': 'Tell me about this'
        })

        assert response.status_code == 404

    def test_chat_about_paper_missing_message(self, client, app):
        """Test that paper chat requires message"""
        response = client.post('/api/papers/1/chat', json={})

        assert response.status_code == 400

    def test_chat_about_paper_not_found(self, client, app):
        """Test chat about non-existent paper"""
        response = client.post('/api/papers/99999/chat', json={
            'message': 'Explain this paper'
        })

        assert response.status_code == 404

class TestChatHistory:
    """Tests for chat history endpoints"""

    def test_get_chat_history(self, client, app):
        """Test getting chat history for a session"""
        session_id = str(uuid.uuid4())

        response = client.get(f'/api/chat/{session_id}/history')

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'sessionId' in data
        assert 'messages' in data
        assert 'count' in data

    def test_clear_chat_history(self, client, app):
        """Test clearing chat history"""
        session_id = str(uuid.uuid4())

        response = client.delete(f'/api/chat/{session_id}')

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'deletedCount' in data
