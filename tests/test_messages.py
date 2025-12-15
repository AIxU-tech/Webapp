"""
Messaging API Tests

Tests for messaging-related endpoints:
- POST /api/messages/send - Send a message
- GET /api/messages/conversations - List conversations
- GET /api/messages/conversation/<id> - Get conversation with user
- GET /api/messages/search-users - Search users for messaging
"""

import pytest
from backend.models import User, Message
from backend.extensions import db


class TestSendMessage:
    """Tests for sending messages"""

    def test_send_message_success(self, authenticated_client, app, test_user, second_user):
        """Test sending a message to valid recipient"""
        with app.app_context():
            recipient = db.session.get(User, second_user.id)

            response = authenticated_client.post('/api/messages/send', json={
                'recipient_id': recipient.id,
                'content': 'Hello, this is a test message!'
            })

            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert data['message']['content'] == 'Hello, this is a test message!'

    def test_send_message_missing_recipient(self, authenticated_client, app):
        """Test sending message without recipient_id"""
        response = authenticated_client.post('/api/messages/send', json={
            'content': 'Message without recipient'
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'recipient' in data['error'].lower()

    def test_send_message_missing_content(self, authenticated_client, app, second_user):
        """Test sending message without content"""
        with app.app_context():
            recipient = db.session.get(User, second_user.id)

            response = authenticated_client.post('/api/messages/send', json={
                'recipient_id': recipient.id
            })

            assert response.status_code == 400
            data = response.get_json()
            assert 'content' in data['error'].lower()

    def test_send_message_recipient_not_found(self, authenticated_client, app):
        """Test sending message to non-existent recipient"""
        response = authenticated_client.post('/api/messages/send', json={
            'recipient_id': 99999,
            'content': 'Message to nobody'
        })

        assert response.status_code == 404
        data = response.get_json()
        assert 'not found' in data['error'].lower()

    def test_send_message_empty_content_fails(self, authenticated_client, app, second_user):
        """Test sending message with whitespace-only content"""
        with app.app_context():
            recipient = db.session.get(User, second_user.id)

            response = authenticated_client.post('/api/messages/send', json={
                'recipient_id': recipient.id,
                'content': '   '  # Only whitespace
            })

            assert response.status_code == 400

    def test_send_message_unauthenticated_fails(self, client, second_user, app):
        """Test that unauthenticated user cannot send messages"""
        with app.app_context():
            recipient = db.session.get(User, second_user.id)

            response = client.post('/api/messages/send', json={
                'recipient_id': recipient.id,
                'content': 'Unauthorized message'
            })

            assert response.status_code == 401

    def test_send_message_creates_message_record(
        self, authenticated_client, app, test_user, second_user
    ):
        """Test that sending creates a message record in database"""
        with app.app_context():
            sender = db.session.get(User, test_user.id)
            recipient = db.session.get(User, second_user.id)

            initial_count = Message.query.count()

            authenticated_client.post('/api/messages/send', json={
                'recipient_id': recipient.id,
                'content': 'Test message'
            })

            final_count = Message.query.count()
            assert final_count == initial_count + 1

            # Verify the message content
            message = Message.query.filter_by(
                sender_id=sender.id,
                recipient_id=recipient.id
            ).first()
            assert message is not None
            assert message.content == 'Test message'
            assert message.is_read is False


class TestConversationsList:
    """Tests for listing conversations"""

    def test_get_conversations_list(
        self, authenticated_client, app, test_user, conversation_messages
    ):
        """Test getting list of conversations"""
        response = authenticated_client.get('/api/messages/conversations')

        assert response.status_code == 200
        data = response.get_json()
        assert 'conversations' in data
        assert len(data['conversations']) >= 1

    def test_conversations_show_last_message(
        self, authenticated_client, app, test_user, second_user, conversation_messages
    ):
        """Test that each conversation shows the most recent message"""
        response = authenticated_client.get('/api/messages/conversations')

        assert response.status_code == 200
        data = response.get_json()
        conv = data['conversations'][0]

        assert 'lastMessage' in conv
        assert 'content' in conv['lastMessage']
        assert 'timestamp' in conv['lastMessage']

    def test_conversations_show_unread_indicator(self, app, test_user, second_user):
        """Test that conversations show unread indicator"""
        with app.app_context():
            user1 = db.session.get(User, test_user.id)
            user2 = db.session.get(User, second_user.id)

            # Send message from user2 to user1 (unread)
            msg = Message(
                sender_id=user2.id,
                recipient_id=user1.id,
                content='Unread message',
                is_read=False
            )
            db.session.add(msg)
            db.session.commit()

            # Login as user1
            client = app.test_client()
            client.post('/api/auth/login', json={
                'email': 'test@example.edu',
                'password': 'testpassword123'
            })

            response = client.get('/api/messages/conversations')
            data = response.get_json()

            # Should have unread indicator
            conv = data['conversations'][0]
            assert conv['hasUnread'] is True

    def test_conversations_show_other_user_info(
        self, authenticated_client, app, test_user, second_user, test_message
    ):
        """Test that conversations include other user's info"""
        response = authenticated_client.get('/api/messages/conversations')

        assert response.status_code == 200
        data = response.get_json()
        conv = data['conversations'][0]

        assert 'user' in conv
        assert 'id' in conv['user']
        assert 'name' in conv['user']
        assert 'avatar' in conv['user']

    def test_conversations_unauthenticated(self, client):
        """Test that unauthenticated user cannot list conversations"""
        response = client.get('/api/messages/conversations')

        assert response.status_code == 401


class TestConversationDetail:
    """Tests for getting conversation with specific user"""

    def test_get_conversation_with_user(
        self, authenticated_client, app, test_user, second_user, conversation_messages
    ):
        """Test getting full conversation thread"""
        with app.app_context():
            other_user = db.session.get(User, second_user.id)

            response = authenticated_client.get(
                f'/api/messages/conversation/{other_user.id}'
            )

            assert response.status_code == 200
            data = response.get_json()
            assert 'messages' in data
            assert len(data['messages']) == 3  # conversation_messages creates 3

    def test_get_conversation_marks_as_read(
        self, app, test_user, second_user
    ):
        """Test that opening conversation marks messages as read"""
        with app.app_context():
            user1 = db.session.get(User, test_user.id)
            user2 = db.session.get(User, second_user.id)

            # Create unread message from user2 to user1
            msg = Message(
                sender_id=user2.id,
                recipient_id=user1.id,
                content='Should be marked as read',
                is_read=False
            )
            db.session.add(msg)
            db.session.commit()
            msg_id = msg.id

            # Login as user1 and get conversation
            client = app.test_client()
            client.post('/api/auth/login', json={
                'email': 'test@example.edu',
                'password': 'testpassword123'
            })

            client.get(f'/api/messages/conversation/{user2.id}')

            # Check that message is now read
            updated_msg = db.session.get(Message, msg_id)
            assert updated_msg.is_read is True

    def test_get_conversation_user_not_found(self, authenticated_client, app):
        """Test getting conversation with non-existent user"""
        response = authenticated_client.get('/api/messages/conversation/99999')

        assert response.status_code == 404

    def test_conversation_ordered_by_date(
        self, authenticated_client, app, test_user, second_user, conversation_messages
    ):
        """Test that messages are in chronological order"""
        with app.app_context():
            other_user = db.session.get(User, second_user.id)

            response = authenticated_client.get(
                f'/api/messages/conversation/{other_user.id}'
            )

            data = response.get_json()
            messages = data['messages']

            # Check that IDs are in ascending order (oldest first)
            ids = [m['id'] for m in messages]
            assert ids == sorted(ids)

    def test_conversation_includes_message_details(
        self, authenticated_client, app, test_user, second_user, test_message
    ):
        """Test that messages include all necessary fields"""
        with app.app_context():
            other_user = db.session.get(User, second_user.id)

            response = authenticated_client.get(
                f'/api/messages/conversation/{other_user.id}'
            )

            data = response.get_json()
            msg = data['messages'][0]

            assert 'id' in msg
            assert 'content' in msg
            assert 'sender' in msg
            assert 'recipient' in msg
            assert 'timestamp' in msg
            assert 'isRead' in msg


class TestUserSearch:
    """Tests for searching users to message"""

    def test_search_users_by_name(self, authenticated_client, app, second_user):
        """Test searching users by first or last name"""
        response = authenticated_client.get('/api/messages/search-users?q=Second')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['users']) >= 1
        assert any(u['first_name'] == 'Second' for u in data['users'])

    def test_search_users_by_email(self, authenticated_client, app, second_user):
        """Test searching users by email"""
        response = authenticated_client.get('/api/messages/search-users?q=second@example')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['users']) >= 1

    def test_search_users_excludes_self(self, authenticated_client, app, test_user):
        """Test that current user is not in search results"""
        response = authenticated_client.get('/api/messages/search-users?q=Test')

        assert response.status_code == 200
        data = response.get_json()

        # Current user should not be in results
        user_ids = [u['id'] for u in data['users']]
        assert test_user.id not in user_ids

    def test_search_users_minimum_query_length(self, authenticated_client, app):
        """Test that short queries return empty results"""
        response = authenticated_client.get('/api/messages/search-users?q=a')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['users']) == 0

    def test_search_users_no_results(self, authenticated_client, app):
        """Test search with no matching users"""
        response = authenticated_client.get(
            '/api/messages/search-users?q=nonexistentusername12345'
        )

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['users']) == 0

    def test_search_users_includes_user_info(self, authenticated_client, app, second_user):
        """Test that search results include user info"""
        response = authenticated_client.get('/api/messages/search-users?q=Second')

        assert response.status_code == 200
        data = response.get_json()
        user = data['users'][0]

        assert 'id' in user
        assert 'first_name' in user
        assert 'last_name' in user
        assert 'email' in user
        assert 'avatar' in user or 'profile_picture_url' in user

    def test_search_users_unauthenticated(self, client):
        """Test that unauthenticated user cannot search"""
        response = client.get('/api/messages/search-users?q=Test')

        assert response.status_code == 401


class TestUnreadCount:
    """Tests for unread message count"""

    def test_unread_count_endpoint(self, authenticated_client, app, test_user, second_user):
        """Test getting unread message count"""
        with app.app_context():
            user1 = db.session.get(User, test_user.id)
            user2 = db.session.get(User, second_user.id)

            # Create 3 unread messages to user1
            for i in range(3):
                msg = Message(
                    sender_id=user2.id,
                    recipient_id=user1.id,
                    content=f'Unread message {i}',
                    is_read=False
                )
                db.session.add(msg)
            db.session.commit()

            response = authenticated_client.get('/api/messages/unread-count')

            assert response.status_code == 200
            data = response.get_json()
            assert data['count'] >= 3
