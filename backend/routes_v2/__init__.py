from backend.routes_v2.public.routes import public_bp
from backend.routes_v2.auth.routes import auth_bp
from backend.routes_v2.api_auth.routes import api_auth_bp
from backend.routes_v2.profile.routes import profile_bp
from backend.routes_v2.universities.routes import universities_bp
from backend.routes_v2.university_requests.routes import university_requests_bp
from backend.routes_v2.community.routes import community_bp
from backend.routes_v2.opportunities.routes import opportunities_bp
from backend.routes_v2.messages.routes import messages_bp
from backend.routes_v2.notifications.routes import notifications_bp
from backend.routes_v2.news.routes import news_bp
from backend.routes_v2.events.routes import events_bp
from backend.routes_v2.uploads.routes import uploads_bp
from backend.routes_v2.speakers.routes import speakers_bp
from backend.routes_v2.profile.sections import profile_sections_bp
from backend.routes_v2.resume.routes import resume_bp

__all__ = [
    'public_bp',
    'auth_bp',
    'api_auth_bp',
    'profile_bp',
    'universities_bp',
    'university_requests_bp',
    'community_bp',
    'opportunities_bp',
    'messages_bp',
    'notifications_bp',
    'news_bp',
    'events_bp',
    'uploads_bp',
    'speakers_bp',
    'profile_sections_bp',
    'resume_bp',
]

