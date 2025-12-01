from backend.models.user import User
from backend.models.university import University
from backend.models.note import Note
from backend.models.message import Message
from backend.models.relationships import UserFollows, UserLikedUniversity
from backend.models.ai_news import AINewsStory, AINewsSource

__all__ = [
    'User',
    'University',
    'Note',
    'Message',
    'UserFollows',
    'UserLikedUniversity',
    'AINewsStory',
    'AINewsSource'
]
