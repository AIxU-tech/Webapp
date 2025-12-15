# AIxU Website - Architecture Guide

This file provides essential guidance for working with the AIxU codebase.

---

## Overview

AIxU is a Flask-based social platform connecting AI students and researchers across universities. Users can network, share notes, participate in university-specific AI clubs, and message each other.

**University Auto-Enrollment:**
Users are automatically enrolled in a university based on their .edu email domain during registration. For example, a user registering with `student@uoregon.edu` is automatically enrolled in the University of Oregon. Manual joining is not supported.

**Architecture:**
- **Backend:** Flask + SQLAlchemy + PostgreSQL + Flask-Login + Flask-SocketIO
- **Frontend:** React 19 + Vite + React Router + TanStack Query + Tailwind CSS
- **Real-time:** WebSocket via Socket.IO for live messaging and notifications
- **Deployment:** React SPA served at `/app*`, API at `/api/*`

---

## Directory Structure

```
AIxU_website/
├── app.py                      # Entry point (socketio.run)
├── requirements.txt            # Python dependencies
├── requirements-test.txt       # Testing dependencies (pytest, coverage)
├── pytest.ini                  # Pytest configuration
├── .env                        # Environment variables (git-ignored)
├── .python-version             # Python 3.11.11 (pyenv)
│
├── backend/
│   ├── __init__.py            # Application factory (create_app)
│   ├── config.py              # Config + TestConfig classes
│   ├── constants.py           # Constants & sample data
│   ├── extensions.py          # Flask extensions (db, login_manager, socketio)
│   ├── models/                # user, university, note, message, relationships
│   ├── routes/                # 10 blueprints: public, auth, api_auth, profile,
│   │                          # universities, university_requests, community,
│   │                          # messages, notifications, news
│   ├── sockets/               # WebSocket handlers
│   └── utils/                 # email.py, image.py, validation.py
│
├── frontend/src/
│   ├── main.jsx               # Entry: QueryProvider > Router > AuthProvider > SocketProvider
│   ├── App.jsx                # Route definitions
│   ├── api/                   # client.js, auth.js, universities.js, notes.js, etc.
│   ├── components/            # AppLayout, NavBar, PlasmaBackground, ProtectedRoute, etc.
│   ├── contexts/              # AuthContext, QueryProvider, SocketContext
│   ├── hooks/                 # useUniversities, useNotes, useMessages, useUsers
│   ├── pages/                 # All page components
│   ├── config/cache.js        # React Query stale/gc times
│   └── services/prefetch.js   # Background data prefetching
│
├── static/app/                 # React build output (Vite)
│
├── tests/                      # pytest test suite
│   ├── conftest.py            # Fixtures (app, client, test_user, etc.)
│   ├── test_auth.py           # Auth endpoint tests
│   └── test_health.py         # Health check & startup tests
│
└── .github/workflows/
    └── test.yml               # CI: runs pytest on push/PR
```

---

## Database Models

All models in `backend/models/` inherit from `db.Model`.

### User (`backend/models/user.py`)
**Core fields:** `id`, `username`, `email`, `password_hash`, `permission_level`
**Profile:** `first_name`, `last_name`, `university`, `about_section`, `location`
**JSON fields:** `skills`, `interests`, `liked_universities`, `liked_notes`, `bookmarked_notes`
**Media:** `profile_picture` (binary), `profile_picture_filename`, `profile_picture_mimetype`
**Stats:** `post_count`, `follower_count`, `following_count`

**Key methods:**
- `set_password()`, `check_password()` - Password hashing
- `get_skills_list()`, `set_skills_list()` - JSON field helpers
- `to_dict()` - Serialize to JSON

### University (`backend/models/university.py`)
**Fields:** `id`, `name`, `clubName`, `location`, `description`, `admin_id`, `email_domain`
**JSON fields:** `tags`, `members` (array of user IDs)

**Key methods:**
- `add_member()`, `remove_member()` - Member management
- `find_by_email_domain(email)` - Find university matching a .edu email
- `to_dict()` - Serialize to JSON

### Note (`backend/models/note.py`)
**Fields:** `id`, `title`, `content`, `author_id`, `likes`, `comments`
**JSON fields:** `tags`

### Message (`backend/models/message.py`)
**Fields:** `id`, `sender_id`, `recipient_id`, `content`, `is_read`, `created_at`

### Relationships (`backend/models/relationships.py`)
- **UserFollows:** follower_id ↔ followed_id
- **UserLikedUniversity:** user_id ↔ university_id

---

## Key Architectural Patterns

### Application Factory (`backend/__init__.py`)

```python
def create_app(config_class=Config):
    app = Flask(__name__, static_folder='../static')

    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    socketio.init_app(app)  # WebSocket support

    # Register 8 blueprints + socket handlers
    # ...
    from backend.sockets import register_socket_handlers
    register_socket_handlers(socketio)

    # Serve React SPA at /app/*
    @app.route('/app', defaults={'path': ''})
    @app.route('/app/<path:path>')
    def serve_react_app(path):
        return send_from_directory('static/app', 'index.html')

    return app
```

### Database Patterns

**JSON Storage:**
- Use `get_*_list()` to parse JSON fields: `user.get_skills_list()`
- Use `set_*_list()` to save: `user.set_skills_list(['Python', 'ML'])`
- Always call `db.session.commit()` after changes

**Serialization:**
- All models have `to_dict()` method for JSON API responses

**Binary Storage:**
- Profile pictures stored as binary in `User.profile_picture`

### Authentication & Authorization

**Flask-Login:**
- Use `@login_required` decorator for protected routes
- Access current user via `current_user` in routes/templates

**Permission Levels:**
```python
USER = 0
ADMIN = 1
SUPER_ADMIN = 2
```

**Email Verification:**
- 6-digit codes generated with `secrets.randbelow(1000000)`
- 180-second expiration
- Stored in session: `session['verification_code']`, `session['verification_expires']`

**Passwords:**
- Use `User.set_password()` and `User.check_password()`
- Never store plaintext passwords

### React Frontend Architecture

**Provider Hierarchy (`main.jsx`):**
```
QueryProvider → BrowserRouter → AuthProvider → SocketProvider → App
```

**Data Fetching (TanStack Query):**
- Custom hooks in `frontend/src/hooks/`: `useUniversities()`, `useNotes()`, `useMessages()`, `useUser()`
- Centralized cache config in `config/cache.js`
- Automatic background refetching and cache invalidation

**WebSocket (`SocketContext`):**
- Connects when user authenticates
- Events: `new_message`, `note_liked`, `new_follower`, `university_update`
- Use `useSocket()` or `useSocketEvent(eventName, handler)` hooks

**API Client (`frontend/src/api/client.js`):**
```javascript
api.get(endpoint)
api.post(endpoint, body)
api.put(endpoint, body)
api.delete(endpoint)
// credentials: 'include' for Flask-Login cookies
```

**Auth State:**
- `useAuth()` provides: `user`, `isAuthenticated`, `loading`, `refreshUser()`

---

## API Routes

### Authentication (`/api/auth/*`)
```
POST /api/auth/login              - JSON login
POST /api/auth/register           - JSON registration
POST /api/auth/verify_email       - Email verification
POST /api/auth/resend_verification - Resend code
GET  /api/auth/logout             - Logout
GET  /api/auth/me                 - Get current user
```

### Users (`/api/user/*`, `/api/users/*`)
```
GET  /api/user/profile            - Current user profile
GET  /api/user/stats              - User statistics
GET  /api/users/<id>              - Get user by ID
GET  /api/users/search            - Search users (query: q)
POST /upload_profile_picture      - Upload profile picture
POST /delete_profile_picture      - Delete profile picture
```

### Universities (`/api/universities/*`)
```
GET  /api/universities            - List all
GET  /api/universities/<id>       - Get by ID
POST /universities/new            - Create university
POST /universities/<id>/remove_member/<user_id> - Remove member (admin only)
POST /api/universities/<id>/like  - Like/unlike
```
Note: Users are auto-enrolled based on email domain at registration. No manual join endpoint.

### Notes (`/api/notes/*`)
```
GET    /api/notes                - List all notes
POST   /api/notes/create         - Create note
GET    /api/notes/<id>/like      - Like/unlike
GET    /api/notes/<id>/bookmark  - Bookmark/unbookmark
DELETE /api/notes/<id>/delete    - Delete note
```

### Messages (`/api/messages/*`)
```
POST /api/messages/send               - Send message
GET  /api/messages/conversation/<id>  - Get conversation
```

### Notifications (`/api/notifications/*`)
```
GET    /api/notifications              - Get notifications
POST   /api/notifications/mark_as_read - Mark as read
DELETE /api/notifications/<id>         - Delete
```

### React SPA Routes
```
GET /app       - React SPA entry (serves index.html)
GET /app/*     - React Router handles client-side routing
```

**React Client-Side Routes:**
- `/app` - Landing page (redirects to /community if authenticated)
- `/app/login`, `/app/register`, `/app/verify-email` - Auth flows
- `/app/community` - Notes feed
- `/app/universities`, `/app/universities/:id`, `/app/universities/new`
- `/app/profile`, `/app/users/:userId` - User profiles
- `/app/messages` - Messaging

---

## Development Workflow

### Running Development Servers

```bash
# Terminal 1: Flask backend (port 5000)
python app.py

# Terminal 2: React frontend (port 5173)
cd frontend && npm run dev
```

Visit: `http://localhost:5173/app`

**How it works:**
- Vite proxies `/api/*` to Flask on port 5000
- React app runs on port 5173
- All API calls automatically forwarded to Flask

### Building for Production

```bash
cd frontend && npm run build
```

Output goes to `static/app` and Flask serves it at `/app` route.

### Adding New React Pages

1. Create component in `frontend/src/pages/NewPage.jsx`
2. Add route in `frontend/src/App.jsx`:
   ```jsx
   <Route path="/new" element={<NewPage />} />
   ```
3. Create API endpoint in backend if needed
4. Add API function to `frontend/src/api/`
5. Use API function in component

### Adding New API Endpoint

1. Add route in appropriate blueprint (`backend/routes/*.py`):
   ```python
   @blueprint.route('/api/resource', methods=['POST'])
   @login_required
   def create_resource():
       data = request.json
       # ... process ...
       return jsonify(result.to_dict()), 201
   ```

2. Add client function (`frontend/src/api/*.js`):
   ```javascript
   export const createResource = (data) => api.post('/resource', data);
   ```

3. Use in React component:
   ```javascript
   import { createResource } from '../api/resources';
   await createResource({ name: 'Test' });
   ```

### Adding New Model

1. Create `backend/models/newmodel.py`:
   ```python
   class NewModel(db.Model):
       id = db.Column(db.Integer, primary_key=True)

       def to_dict(self):
           return {'id': self.id}
   ```

2. Import in `backend/models/__init__.py`
3. Restart app (auto-creates table via `db.create_all()`)

---

## Testing

Tests run automatically on push/PR via GitHub Actions. See `README_TESTING.md` for details.

```bash
pytest                              # Run all tests
pytest tests/test_auth.py -v        # Specific file
```

**Fixtures** (`tests/conftest.py`): `app`, `client`, `test_user`, `test_university`, `authenticated_client`

---

## Configuration

### Environment Variables (`.env`)

```env
DATABASE_URL=postgresql://user:pass@host:port/dbname
SECRET_KEY=your-secret-key-here
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
SMTP_USER=no-reply@aixu.tech
SMTP_PASS=your-email-password
ADMIN_EMAIL=admin@aixu.tech
```

### Config Class (`backend/config.py`)

```python
class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": 10,
        "max_overflow": 5,
        "pool_timeout": 30,
        "pool_recycle": 1800,
    }
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10MB
```

---

## Deployment

### Development Mode
- Flask backend: `python app.py` (port 5000)
- React dev server: `cd frontend && npm run dev` (port 5173)
- Vite proxies `/api` calls to Flask

### Production Mode
1. Build React: `cd frontend && npm run build`
2. Run with eventlet for WebSocket support: `gunicorn --worker-class eventlet -w 1 app:app`

**URL Structure:**
- `/app/*` - React SPA (client-side routing)
- `/api/*` - JSON API endpoints

---

## Important Development Notes

### Working with Models
- Use `get_*_list()` and `set_*_list()` for JSON fields
- Always call `db.session.commit()` after changes
- Use `to_dict()` for API responses

### Working with Routes
- API routes return `jsonify()`
- Use `@login_required` for protected routes
- Check permission: `if current_user.permission_level >= ADMIN:`

### Working with React
- Use `useAuth()` for current user, `useSocket()` for WebSocket
- Data fetching via custom hooks: `useUniversities()`, `useNotes()`, `useMessages()`, `useUser()`
- Mutations auto-invalidate cache (e.g., `useCreateNote()` invalidates notes list)
- Real-time updates via `useSocketEvent('event_name', handler)`

### Session Management
- Flask-Login uses cookies (same-origin, no JWT needed)
- WebSocket authenticates via session cookie

---

## Commands Reference

```bash
# Development
python app.py                          # Flask backend (port 5000)
cd frontend && npm run dev             # React dev server (port 5173)

# Build
cd frontend && npm run build           # Build React to static/app/

# Testing
pytest                                 # All tests
pytest -v                              # Verbose output

# Database (PostgreSQL)
UPDATE "user" SET permission_level = 2 WHERE id = 1;  # Super admin
```

---

## Best Practices

### Backend
- **Models:** Pure data layer, no HTTP logic
- **Routes:** HTTP handlers, minimal business logic
- **Utils:** Reusable functions
- One blueprint per feature area

### Frontend
- **Pages:** Route-level components
- **Components:** Reusable UI components
- **Hooks:** React Query hooks for data fetching (one per feature)
- **Contexts:** Auth, Query cache, Socket connection

### Tests
- One test file per route blueprint (e.g., `test_auth.py` for auth routes)
- Use fixtures from `conftest.py` for setup
- Test both success and error cases

---

For setup instructions, see `README.md`. For testing details, see `README_TESTING.md`.
