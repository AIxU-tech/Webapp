from backend.models.user import User
from backend.models.university import University
from backend.models.university_role import UniversityRole
from backend.models.university_request import UniversityRequest, RequestStatus
from backend.models.note import Note
from backend.models.note_comment import NoteComment
from backend.models.message import Message
from backend.models.relationships import (
    UserFollows,
    UserLikedUniversity,
    NoteLike,
    NoteBookmark,
    NoteCommentLike,
)
from backend.models.ai_news import (
    AINewsStory,
    AINewsSource,
    AIResearchPaper,
    AINewsChatMessage
)

__all__ = [
    'User',
    'University',
    'UniversityRole',
    'UniversityRequest',
    'RequestStatus',
    'Note',
    'NoteComment',
    'Message',
    'UserFollows',
    'UserLikedUniversity',
    'NoteLike',
    'NoteBookmark',
    'NoteCommentLike',
    'AINewsStory',
    'AINewsSource',
    'AIResearchPaper',
    'AINewsChatMessage'
]
