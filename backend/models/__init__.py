from backend.models.user import User
from backend.models.university import University
from backend.models.university_role import UniversityRole
from backend.models.university_request import UniversityRequest, RequestStatus
from backend.models.note import Note
from backend.models.opportunity import Opportunity
from backend.models.opportunity_tag import OpportunityTag
from backend.models.note_comment import NoteComment
from backend.models.message import Message
from backend.models.event import Event, EventAttendee
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
from backend.models.password_reset_token import PasswordResetToken
from backend.models.note_attachment import NoteAttachment
from backend.models.notification import Notification
from backend.models.speaker import Speaker
from backend.models.profile_sections import Education, Experience, Project
from backend.models.resume import Resume
from backend.models.event_attendance import EventAttendance

__all__ = [
    'User',
    'University',
    'UniversityRole',
    'UniversityRequest',
    'RequestStatus',
    'Note',
    'Opportunity',
    'OpportunityTag',
    'NoteComment',
    'Message',
    'Event',
    'EventAttendee',
    'UserFollows',
    'UserLikedUniversity',
    'NoteLike',
    'NoteBookmark',
    'NoteCommentLike',
    'AINewsStory',
    'AINewsSource',
    'AIResearchPaper',
    'AINewsChatMessage',
    'PasswordResetToken',
    'NoteAttachment',
    'Notification',
    'Speaker',
    'Education',
    'Experience',
    'Project',
    'Resume',
    'EventAttendance',
]
