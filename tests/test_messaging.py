"""
Tests for messaging functionality
"""
import pytest
import json
from backend.models import Message, User
from backend.extensions import db

@pytest.mark.messaging
class TestMessagesPage:
    """Test messages page functionality"""

    def test_messages_page_loads(self, authenticated_client):
        """Test that messages page loads for authenticated user"""
        response = authenticated_client.get('/messages')
        assert response.status_code == 200

    def test_messages_page_requires_authentication(self, client):
        """Test that messages page requires authentication"""
        response = client.get('/messages', follow_redirects=False)
        assert response.status_code == 302

    def test_messages_page_displays_conversations(self, authenticated_client, test_message, test_user2):
        """Test that messages page displays conversations"""
        response = authenticated_client.get('/messages')
        assert response.status_code == 200
        # Should show conversation with test_user2

    def test_messages_page_empty_state(self, authenticated_client):
        """Test messages page with no messages"""
        response = authenticated_client.get('/messages')
        assert response.status_code == 200
        # Page should load even with no messages


@pytest.mark.messaging
class TestSendMessage:
    """Test sending messages"""

    def test_send_message_success(self, authenticated_client, test_user, test_user2, app):
        """Test successfully sending a message"""
        response = authenticated_client.post('/api/messages/send',
            json={
                'recipient_id': test_user2['id'],
                'content': 'Hello, this is a test message!'
            })

        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['success'] is True

        # Verify message in database
        with app.app_context():
            message = Message.query.filter_by(
                sender_id=test_user['id'],
                recipient_id=test_user2['id']
            ).first()
            assert message is not None
            assert message.content == 'Hello, this is a test message!'

    def test_send_message_missing_recipient(self, authenticated_client):
        """Test that sending message without recipient fails"""
        response = authenticated_client.post('/api/messages/send',
            json={
                'content': 'Message without recipient'
            })

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False

    def test_send_message_missing_content(self, authenticated_client, test_user2):
        """Test that sending message without content fails"""
        response = authenticated_client.post('/api/messages/send',
            json={
                'recipient_id': test_user2['id']
            })

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False

    def test_send_message_empty_content(self, authenticated_client, test_user2):
        """Test that sending message with empty content fails"""
        response = authenticated_client.post('/api/messages/send',
            json={
                'recipient_id': test_user2['id'],
                'content': '   '  # Only whitespace
            })

        assert response.status_code == 400

    def test_send_message_nonexistent_recipient(self, authenticated_client):
        """Test that sending message to nonexistent user fails"""
        response = authenticated_client.post('/api/messages/send',
            json={
                'recipient_id': 99999,
                'content': 'Message to nobody'
            })

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False

    def test_send_message_requires_authentication(self, client, test_user2):
        """Test that sending messages requires authentication"""
        response = client.post('/api/messages/send',
            json={
                'recipient_id': test_user2['id'],
                'content': 'Unauthorized message'
            })

        assert response.status_code == 401


@pytest.mark.messaging
class TestGetConversation:
    """Test retrieving conversations"""

    def test_get_conversation_success(self, authenticated_client, test_user, test_user2, test_message, app):
        """Test successfully retrieving a conversation"""
        response = authenticated_client.get(f'/api/messages/conversation/{test_user2["id"]}')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'user' in data
        assert 'messages' in data
        assert len(data['messages']) > 0

    def test_get_conversation_marks_as_read(self, client, test_user, test_user2, app):
        """Test that getting conversation marks messages as read"""
        # Create unread message from user2 to user1
        with app.app_context():
            message = Message(
                sender_id=test_user2['id'],
                recipient_id=test_user['id'],
                content='Unread message',
                is_read=False
            )
            db.session.add(message)
            db.session.commit()
            message_id = message.id

        # Login as test_user
        client.post('/login', data={
            'email': test_user['email'],
            'password': test_user['password']
        })

        # Get conversation
        response = client.get(f'/api/messages/conversation/{test_user2["id"]}')
        assert response.status_code == 200

        # Verify message is marked as read
        with app.app_context():
            message = Message.query.get(message_id)
            assert message.is_read is True

    def test_get_conversation_nonexistent_user(self, authenticated_client):
        """Test getting conversation with nonexistent user"""
        response = authenticated_client.get('/api/messages/conversation/99999')

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False

    def test_get_conversation_requires_authentication(self, client, test_user2):
        """Test that getting conversation requires authentication"""
        response = client.get(f'/api/messages/conversation/{test_user2["id"]}')
        assert response.status_code == 401

    def test_get_conversation_ordered_chronologically(self, authenticated_client, test_user, test_user2, app):
        """Test that messages in conversation are ordered chronologically"""
        # Create multiple messages
        with app.app_context():
            msg1 = Message(sender_id=test_user['id'], recipient_id=test_user2['id'], content='First')
            msg2 = Message(sender_id=test_user2['id'], recipient_id=test_user['id'], content='Second')
            msg3 = Message(sender_id=test_user['id'], recipient_id=test_user2['id'], content='Third')
            db.session.add_all([msg1, msg2, msg3])
            db.session.commit()

        response = authenticated_client.get(f'/api/messages/conversation/{test_user2["id"]}')
        assert response.status_code == 200

        data = json.loads(response.data)
        messages = data['messages']

        # Messages should be in chronological order (oldest first)
        assert messages[0]['content'] == 'First'
        assert messages[1]['content'] == 'Second'
        assert messages[2]['content'] == 'Third'


@pytest.mark.messaging
class TestUserSearch:
    """Test user search for messaging"""

    def test_search_users_by_email(self, authenticated_client, test_user2):
        """Test searching users by email"""
        response = authenticated_client.get(f'/api/users/search?q={test_user2["email"]}')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'users' in data
        assert len(data['users']) > 0

    def test_search_users_by_name(self, authenticated_client, test_user2, app):
        """Test searching users by first/last name"""
        response = authenticated_client.get(f'/api/users/search?q=Test2')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'users' in data

    def test_search_users_excludes_current_user(self, authenticated_client, test_user):
        """Test that search results exclude current user"""
        response = authenticated_client.get(f'/api/users/search?q={test_user["email"]}')

        assert response.status_code == 200
        data = json.loads(response.data)

        # Current user should not be in results
        for user in data['users']:
            assert user['id'] != test_user['id']

    def test_search_users_minimum_query_length(self, authenticated_client):
        """Test that search requires minimum query length"""
        response = authenticated_client.get('/api/users/search?q=a')

        assert response.status_code == 200
        data = json.loads(response.data)
        # Should return empty results for short query
        assert data['users'] == []

    def test_search_users_requires_authentication(self, client):
        """Test that user search requires authentication"""
        response = client.get('/api/users/search?q=test')
        assert response.status_code == 401


@pytest.mark.messaging
class TestMessageModel:
    """Test Message model methods"""

    def test_message_time_ago(self, app, test_user, test_user2, init_database):
        """Test message time ago calculation"""
        with app.app_context():
            message = Message(
                sender_id=test_user['id'],
                recipient_id=test_user2['id'],
                content='Test message'
            )
            db.session.add(message)
            db.session.commit()

            time_ago = message.get_time_ago()
            assert 'just now' in time_ago.lower() or 'minute' in time_ago.lower()

    def test_message_to_dict(self, app, test_message, test_user, test_user2):
        """Test converting message to dictionary"""
        with app.app_context():
            message = Message.query.get(test_message['id'])
            message_dict = message.to_dict()

            assert message_dict['id'] == test_message['id']
            assert message_dict['content'] == test_message['content']
            assert 'sender' in message_dict
            assert 'recipient' in message_dict
            assert 'timestamp' in message_dict
            assert 'isRead' in message_dict

    def test_message_read_status(self, app, test_user, test_user2, init_database):
        """Test message read status"""
        with app.app_context():
            message = Message(
                sender_id=test_user['id'],
                recipient_id=test_user2['id'],
                content='Unread message',
                is_read=False
            )
            db.session.add(message)
            db.session.commit()

            assert message.is_read is False

            message.is_read = True
            db.session.commit()

            assert message.is_read is True


@pytest.mark.messaging
class TestConversationGrouping:
    """Test conversation grouping logic"""

    def test_conversations_grouped_by_user(self, authenticated_client, test_user, test_user2, app):
        """Test that messages are grouped by conversation"""
        # Create multiple messages with same user
        with app.app_context():
            msg1 = Message(sender_id=test_user['id'], recipient_id=test_user2['id'], content='Msg 1')
            msg2 = Message(sender_id=test_user2['id'], recipient_id=test_user['id'], content='Msg 2')
            msg3 = Message(sender_id=test_user['id'], recipient_id=test_user2['id'], content='Msg 3')
            db.session.add_all([msg1, msg2, msg3])
            db.session.commit()

        response = authenticated_client.get('/messages')
        assert response.status_code == 200
        # Should show one conversation with test_user2, not three separate ones

    def test_unread_message_indicator(self, client, test_user, test_user2, app):
        """Test unread message indicator in conversations list"""
        # Create unread message
        with app.app_context():
            message = Message(
                sender_id=test_user2['id'],
                recipient_id=test_user['id'],
                content='Unread message',
                is_read=False
            )
            db.session.add(message)
            db.session.commit()

        # Login as recipient
        client.post('/login', data={
            'email': test_user['email'],
            'password': test_user['password']
        })

        response = client.get('/messages')
        assert response.status_code == 200
        # Page should indicate unread messages


@pytest.mark.messaging
class TestMessageIntegration:
    """Integration tests for messaging flow"""

    def test_complete_messaging_flow(self, client, test_user, test_user2, app):
        """Test complete messaging flow from search to send to read"""
        # Login
        client.post('/login', data={
            'email': test_user['email'],
            'password': test_user['password']
        })

        # Search for user by email
        response = client.get(f'/api/users/search?q={test_user2["email"]}')
        assert response.status_code == 200

        # Send message
        response = client.post('/api/messages/send',
            json={
                'recipient_id': test_user2['id'],
                'content': 'Integration test message'
            })
        assert response.status_code == 201

        # Get conversation
        response = client.get(f'/api/messages/conversation/{test_user2["id"]}')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert any(msg['content'] == 'Integration test message' for msg in data['messages'])
