from backend.routes.public import public_bp
from backend.routes.auth import auth_bp
from backend.routes.api_auth import api_auth_bp
from backend.routes.profile import profile_bp
from backend.routes.universities import universities_bp
from backend.routes.community import community_bp
from backend.routes.messages import messages_bp
from backend.routes.notifications import notifications_bp

__all__ = [
    'public_bp',
    'auth_bp',
    'api_auth_bp',
    'profile_bp',
    'universities_bp',
    'community_bp',
    'messages_bp',
    'notifications_bp'
]
