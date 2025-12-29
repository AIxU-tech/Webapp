# AIxU Website - Architecture Guide

This file provides essential guidance for working with the AIxU codebase.

---

## Overview

AIxU is a Flask-based social platform connecting AI students and researchers across universities. Users can network, share notes, post opportunities, participate in university-specific AI clubs, message each other, and stay updated on AI news and research.

**University Auto-Enrollment:**
Users are automatically enrolled in a university based on their .edu email domain during registration. For example, a user registering with `student@uoregon.edu` is automatically enrolled in the University of Oregon. Manual joining is not supported.

**University Request Flow:**
Users with a .edu email from a university not yet in the system can submit a request to add their university. After admin approval, they receive a secure link to complete account creation.

**Architecture:**
- **Backend:** Flask + SQLAlchemy + PostgreSQL + Flask-Login + Flask-SocketIO
- **Frontend:** React 19 + Vite + React Router + TanStack Query + Tailwind CSS
- **Real-time:** WebSocket via Socket.IO for live messaging and notifications
- **AI Integration:** Claude API for news fetching and interactive chat
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
│   ├── constants.py           # Permission constants, UniversityRoles class
│   ├── extensions.py          # Flask extensions (db, login_manager, socketio)
│   ├── models/                # Database models
│   │   ├── user.py            # User model
│   │   ├── university.py      # University model
│   │   ├── university_role.py # Per-university role assignments
│   │   ├── university_request.py # University addition requests
│   │   ├── note.py            # Notes/posts
│   │   ├── note_comment.py    # Threaded comments on notes
│   │   ├── opportunity.py     # Job/project opportunity postings
│   │   ├── opportunity_tag.py # Normalized tags for opportunities
│   │   ├── event.py           # University club events + attendees
│   │   ├── message.py         # Direct messages
│   │   ├── ai_news.py         # AI news stories, papers, chat messages
│   │   └── relationships.py   # Junction tables (follows, likes, bookmarks)
│   ├── routes_v2/             # API blueprints (modular structure)
│   │   ├── auth/              # Authentication
│   │   ├── api_auth/          # JSON API authentication
│   │   ├── profile/           # User profile
│   │   ├── universities/      # University + role management
│   │   ├── university_requests/ # University request flow
│   │   ├── community/         # Notes + comments
│   │   ├── opportunities/     # Job/opportunity board
│   │   ├── events/            # University club events
│   │   ├── messages/          # Messaging
│   │   ├── notifications/     # Notifications
│   │   ├── news/              # AI news and research papers
│   │   └── public/            # Public pages
│   ├── services/              # Business logic services
│   │   ├── ai_news.py         # Claude-powered news fetching
│   │   └── scheduler.py       # Background job scheduler
│   ├── sockets/               # WebSocket handlers
│   └── utils/                 # Utility functions
│       ├── email.py           # Email sending, verification codes
│       ├── image.py           # Image processing
│       ├── validation.py      # Input validation
│       ├── permissions.py     # Permission checking utilities
│       └── time.py            # Time formatting helpers
│
├── frontend/src/
│   ├── main.jsx               # Entry: QueryProvider > Router > AuthProvider > SocketProvider
│   ├── App.jsx                # Route definitions
│   ├── api/                   # API client modules
│   │   ├── client.js          # Base API client
│   │   ├── auth.js            # Auth API
│   │   ├── universities.js    # Universities API
│   │   ├── universityRequests.js # University request API
│   │   ├── notes.js           # Notes API
│   │   ├── opportunities.js   # Opportunities API
│   │   ├── events.js          # Events API
│   │   ├── users.js           # Users API
│   │   ├── messages.js        # Messages API
│   │   └── news.js            # AI news/papers API
│   ├── components/            # Reusable UI components
│   │   ├── icons/index.jsx    # Centralized icon library (35+ icons)
│   │   ├── ui/                # Generic UI components
│   │   │   ├── BaseModal.jsx  # Modal wrapper with ESC, scroll lock, click outside
│   │   │   ├── EmptyState.jsx # Empty data display
│   │   │   ├── LoadingState.jsx # Loading spinner
│   │   │   ├── ErrorState.jsx # Error display with retry
│   │   │   ├── Alert.jsx      # Contextual alerts (info/success/warning/error)
│   │   │   ├── Badge.jsx      # Versatile badge with variants
│   │   │   ├── GradientButton.jsx # Primary action button
│   │   │   ├── IconButton.jsx # Icon-only button
│   │   │   ├── LikeButton.jsx # Like toggle with animation
│   │   │   ├── Tag.jsx        # Tag, ToggleTag, TagGroup components
│   │   │   ├── TagSelector.jsx # Tag toggle UI
│   │   │   ├── FeedCard.jsx   # Base card for feed items
│   │   │   ├── FeedItemList.jsx # List with loading/empty/error states
│   │   │   └── UserListItem.jsx # User avatar + name + details
│   │   ├── university/        # University detail page components
│   │   │   ├── UniversityHeroBanner.jsx
│   │   │   ├── UniversityIdentityBar.jsx
│   │   │   ├── UniversityNavTabs.jsx
│   │   │   ├── UniversityPostsTab.jsx
│   │   │   ├── UniversityEventsTab.jsx
│   │   │   ├── UniversityOpportunitiesTab.jsx
│   │   │   ├── UniversityMembersTab.jsx
│   │   │   ├── UniversityAboutTab.jsx
│   │   │   ├── LeadershipCard.jsx
│   │   │   └── UpcomingEventsCard.jsx
│   │   ├── NoteCard.jsx       # Note display with comments
│   │   ├── CommentCard.jsx    # Comment with threading
│   │   ├── CommentSection.jsx # Comments list and input
│   │   ├── OpportunityCard.jsx # Opportunity display
│   │   ├── EventCard.jsx      # Event with RSVP
│   │   ├── CreateEventModal.jsx # Event creation form
│   │   └── ContentCard.jsx    # Unified news/paper card with chat
│   ├── contexts/              # AuthContext, QueryProvider, SocketContext
│   ├── hooks/                 # React Query hooks + UI utilities
│   │   ├── index.js           # Barrel export for all hooks
│   │   ├── useUI.js           # UI utility hooks
│   │   ├── useForm.js         # Form state and validation
│   │   ├── useEmailVerification.jsx # Email verification flow
│   │   ├── useFeedPageState.js # Common feed page logic
│   │   ├── useUniversities.js # University data
│   │   ├── useUniversityRequests.js # Admin request management
│   │   ├── useNotes.js        # Notes + comments
│   │   ├── useOpportunities.js # Opportunities board
│   │   ├── useEvents.js       # University events
│   │   ├── useMessages.js     # Messaging data
│   │   ├── useUsers.js        # User profile data
│   │   ├── useNews.js         # AI news/papers data
│   │   └── factories/         # Hook factory utilities
│   ├── pages/                 # Page components
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
**Core fields:** `id`, `email`, `password_hash`, `permission_level`
**Profile:** `first_name`, `last_name`, `university`, `about_section`, `location`
**JSON fields:** `skills`, `interests`
**Media:** `profile_picture` (binary), `profile_picture_filename`, `profile_picture_mimetype`
**Stats:** `post_count`, `follower_count`, `following_count`

**Key methods:**
- `set_password()`, `check_password()` - Password hashing
- `get_skills_list()`, `set_skills_list()` - JSON field helpers
- `is_site_admin()` - Check if user has site admin privileges
- `get_university()` - Get user's University object
- `to_dict()` - Serialize to JSON

### University (`backend/models/university.py`)
**Fields:** `id`, `name`, `clubName`, `location`, `description`, `admin_id`, `email_domain`, `website_url`
**JSON fields:** `tags`
**Stats:** `member_count`, `recent_posts`, `upcoming_events`

Members are tracked via the UniversityRole table (not stored directly in University).

**Key methods:**
- `add_member()`, `remove_member()` - Member management via UniversityRole
- `get_members_list()` - Get member user IDs
- `get_members()` - Get member User objects with roles
- `is_member(user_id)` - Check membership
- `find_by_email_domain(email)` - Find university matching a .edu email
- `get_member_role_level(user_id)` - Get user's role at this university
- `is_member_executive(user_id)` - Check if executive or higher
- `is_member_president(user_id)` - Check if president
- `get_president()`, `get_executives()` - Get leadership roles
- `to_dict()` - Serialize to JSON

### UniversityRole (`backend/models/university_role.py`)
**Fields:** `id`, `user_id`, `university_id`, `role`, `created_at`, `updated_at`, `updated_by_id`

Tracks per-university roles for club management. Role levels:
- `MEMBER (0)` - Standard member
- `EXECUTIVE (1)` - Can manage members, create events
- `PRESIDENT (2)` - Can manage executives, transfer leadership

**Key class methods:**
- `get_role(user_id, university_id)` - Get role record
- `get_role_level(user_id, university_id)` - Get role level (defaults to MEMBER)
- `set_role(user_id, university_id, role)` - Create or update role
- `remove_role(user_id, university_id)` - Delete role
- `is_executive_or_higher(user_id, university_id)` - Permission check
- `is_president(user_id, university_id)` - Permission check

### Note (`backend/models/note.py`)
**Fields:** `id`, `title`, `content`, `author_id`, `likes`, `comments`, `created_at`
**JSON fields:** `tags`

### NoteComment (`backend/models/note_comment.py`)
**Fields:** `id`, `note_id`, `user_id`, `parent_id`, `text`, `likes`, `created_at`, `updated_at`

Single-level threading: top-level comments have `parent_id=NULL`, replies use the top-level comment's ID. Replies to replies flatten to the same parent.

**Key methods:**
- `is_liked_by(user_id)` - Check if liked by user
- `toggle_like(user_id)` - Toggle like status
- `to_dict()` - Serialize with author info

### Opportunity (`backend/models/opportunity.py`)
**Fields:** `id`, `title`, `description`, `compensation`, `university_only`, `author_id`, `created_at`

Job/project opportunity postings. Tags stored via OpportunityTag table.

**Key methods:**
- `get_tags_list()`, `set_tags_list()` - Tag management via OpportunityTag
- `get_time_ago()` - Human-readable time
- `to_dict()` - Serialize with author info and tags

### OpportunityTag (`backend/models/opportunity_tag.py`)
**Fields:** `id`, `opportunity_id`, `tag`, `created_at`

Normalized tag storage for efficient database-level filtering.

### Event (`backend/models/event.py`)
**Fields:** `id`, `university_id`, `title`, `description`, `location`, `start_time`, `end_time`, `created_by_id`, `created_at`

University club events with RSVP tracking.

**Key methods:**
- `to_dict(include_attendees=False)` - Serialize with optional attendee list

### EventAttendee (`backend/models/event.py`)
**Fields:** `id`, `event_id`, `user_id`, `status`, `created_at`

RSVP tracking. Status: `attending`, `maybe`, `declined`

### Relationship Tables (`backend/models/relationships.py`)

Junction tables for many-to-many relationships:
- **UserFollows:** `follower_id` <-> `following_id`
- **UserLikedUniversity:** `user_id` <-> `university_id`
- **NoteLike:** `user_id` <-> `note_id` (with `exists()`, `create()`, `delete()` helpers)
- **NoteBookmark:** `user_id` <-> `note_id` (with `exists()`, `create()`, `delete()` helpers)
- **NoteCommentLike:** `user_id` <-> `comment_id` (with `exists()`, `create()`, `delete()` helpers)

### AI News Models (`backend/models/ai_news.py`)

**AINewsStory:** `id`, `title`, `summary`, `significance`, `rank`, `categories` (JSON), `batch_id`, `fetched_at`, `event_date`

**AINewsSource:** `id`, `story_id`, `url`, `source_name`, `article_title`, `excerpt`

**AIResearchPaper:** `id`, `title`, `authors`, `summary`, `key_findings`, `significance`, `paper_url`, `source_name`, `rank`, `categories` (JSON), `batch_id`, `fetched_at`, `publication_date`

**AINewsChatMessage:** `id`, `session_id`, `story_id` OR `paper_id`, `role`, `content`, `created_at`

---

## Permission System

AIxU uses a two-tier permission system:

### Site-Level Permissions (`User.permission_level`)
```python
USER = 0       # Standard user
ADMIN = 1      # Site administrator (full access everywhere)
```

Site admins can manage any university, approve/reject university requests, and access admin endpoints.

### University-Level Roles (`UniversityRole.role`)
```python
class UniversityRoles:
    MEMBER = 0      # Standard member
    EXECUTIVE = 1   # Can manage members, create events
    PRESIDENT = 2   # Can manage executives, transfer leadership
```

Each user can have different roles at different universities. Site admins bypass all university-level checks.

### Permission Utilities (`backend/utils/permissions.py`)
```python
is_site_admin(user)                           # Check site admin
can_manage_university_members(user, uni_id)   # Executive+ or site admin
can_manage_executives(user, uni_id)           # President or site admin
get_user_university_permissions(user, uni_id) # Get all permission flags
```

---

## API Routes

Backend routes are organized in `backend/routes_v2/` with each feature having its own folder containing `routes.py` and optional `helpers.py`.

### Authentication (`/api/auth/*`)
```
POST /api/auth/login              - JSON login
POST /api/auth/register           - JSON registration (auto-enrolls in university)
POST /api/auth/verify-email       - Email verification with 6-digit code
POST /api/auth/resend-verification - Resend verification code
POST /api/auth/logout             - Logout
GET  /api/auth/validate-token     - Validate account creation token
POST /api/auth/complete-account   - Complete account from approved request
```

### Users (`/api/user/*`, `/api/users/*`)
```
GET  /api/user/profile            - Current user profile
GET  /api/user/stats              - User statistics
GET  /api/users/<id>              - Get user by ID
GET  /api/users/search            - Search users (query: q)
POST /api/update_profile          - Update profile info
POST /api/upload_profile_picture  - Upload profile picture
POST /api/delete_profile_picture  - Delete profile picture
POST /api/delete_account          - Delete user account
GET  /user/<id>/profile_picture   - Serve profile picture
```

### Universities (`/api/universities/*`)
```
GET  /api/universities/list       - List all universities
GET  /api/universities/<id>       - Get university with members and permissions
POST /api/universities/<id>/remove_member/<user_id> - Remove member (executive+)
POST /api/universities/<id>/delete - Delete university (site admin only)
GET  /api/universities/<id>/roles  - Get all roles for university
POST /api/universities/<id>/roles/<user_id> - Update user role (president/admin)
DELETE /api/universities/<id>/roles/<user_id> - Remove user role (president/admin)
```

### Events (`/api/universities/<id>/events`, `/api/events/*`)
```
GET  /api/universities/<id>/events - List events (query: upcoming, limit)
POST /api/universities/<id>/events - Create event (executive+ of THIS university)
GET  /api/events/<id>              - Get single event with attendees
DELETE /api/events/<id>            - Delete event (creator, president, or admin)
POST /api/events/<id>/rsvp         - Toggle RSVP (body: {status: attending|maybe|declined})
```

### Notes (`/api/notes/*`)
```
GET    /api/notes                 - List notes (?user=<id>, ?search=<query>, ?university_id=<id>)
POST   /api/notes                 - Create note
POST   /api/notes/<id>/like       - Toggle like
POST   /api/notes/<id>/bookmark   - Toggle bookmark
DELETE /api/notes/<id>            - Delete note

# Comments
GET    /api/notes/<id>/comments   - Get comments for note
POST   /api/notes/<id>/comments   - Create comment (body: {text, replyToId?})
PUT    /api/notes/<id>/comments/<comment_id> - Edit comment
DELETE /api/notes/<id>/comments/<comment_id> - Delete comment
POST   /api/notes/<id>/comments/<comment_id>/like - Toggle comment like
```

### Opportunities (`/api/opportunities/*`)
```
GET    /api/opportunities         - List (?search, ?location, ?paid, ?myUniversity, ?tags, ?university_id)
POST   /api/opportunities         - Create opportunity
POST   /api/opportunities/<id>/bookmark - Toggle bookmark
DELETE /api/opportunities/<id>    - Delete opportunity (author or admin)
```

### Messages (`/api/messages/*`)
```
GET  /api/messages/conversations       - Get all conversations
GET  /api/messages/conversation/<id>   - Get conversation with user
POST /api/messages/send                - Send message
GET  /api/messages/unread-count        - Get unread message count
```

### AI News & Research (`/api/news/*`, `/api/papers/*`, `/api/ai-content`)
```
GET  /api/news                    - Get news stories (limit param)
GET  /api/news/<id>               - Get single story
GET  /api/papers                  - Get research papers (limit param)
GET  /api/papers/<id>             - Get single paper
GET  /api/ai-content              - Get both stories and papers

POST /api/news/refresh            - Trigger content refresh (admin, or first load)
GET  /api/news/batches            - Get all fetch batches (admin)
POST /api/news/cleanup            - Clean up old batches (admin)
GET  /api/news/scheduler          - Get scheduler status (admin)

POST /api/news/<id>/chat          - Chat about a news story
POST /api/papers/<id>/chat        - Chat about a research paper
GET  /api/chat/<session_id>/history - Get chat history
DELETE /api/chat/<session_id>     - Clear chat history
```

---

## React Client-Side Routes

**Authentication (no AppLayout):**
- `/login` - Login page
- `/register` - Registration page
- `/verify-email` - Email verification
- `/complete-account` - Complete account from approved university request

**University Request Flow (no AppLayout):**
- `/add-university` - Entry page (collect name/email)
- `/request-university` - Verify email
- `/request-university/details` - Enter university/club details
- `/request-university/submitted` - Confirmation page

**Landing:**
- `/` - Landing page (redirects to /community if authenticated)

**Main Application (with AppLayout):**
- `/community` - Notes feed
- `/universities` - Universities list
- `/universities/:id` - University detail (tabbed: Posts, Events, Opportunities, Members, About)
- `/opportunities` - Opportunities board
- `/profile` - Current user profile
- `/users/:userId` - User profile
- `/messages` - Messaging
- `/news` - AI news and research papers
- `/admin/university-requests` - Admin request queue

---

## React Hooks Reference

All hooks exported from `frontend/src/hooks/index.js`.

### Universities
- `useUniversities()` - Get all universities
- `useUniversity(id)` - Get single university with members
- `useRemoveMember()` - Remove member mutation
- `useUpdateMemberRole()` - Update member role mutation
- `useUpdateUniversity()` - Update university mutation

### Events
- `useUniversityEvents(universityId, options)` - Get events for university
- `useEvent(eventId)` - Get single event with attendees
- `useCreateEvent()` - Create event mutation
- `useDeleteEvent()` - Delete event mutation
- `useToggleRsvp()` - Toggle RSVP mutation with optimistic updates

### Notes/Community
- `useNotes(params)` - Get notes with optional filters
- `useCreateNote()` - Create note mutation
- `useLikeNote()` - Like/unlike mutation
- `useBookmarkNote()` - Bookmark mutation
- `useDeleteNote()` - Delete mutation
- `useComments(noteId)` - Get comments for note
- `useCreateComment()` - Create comment mutation
- `useUpdateComment()` - Edit comment mutation
- `useDeleteComment()` - Delete comment mutation
- `useLikeComment()` - Like comment mutation

### Opportunities
- `useOpportunities(params)` - Get opportunities with filters
- `useCreateOpportunity()` - Create opportunity mutation
- `useBookmarkOpportunity()` - Bookmark mutation
- `useDeleteOpportunity()` - Delete mutation

### Messages
- `useConversations()` - Get conversations with real-time updates
- `useConversation(userId)` - Get conversation with user
- `useSendMessage()` - Send message mutation
- `useSearchUsers(query)` - Search users

### Users
- `useUser(userId)` - Get user profile
- `useUpdateProfile()` - Update profile mutation
- `useUploadProfilePicture()` - Upload picture mutation
- `useDeleteProfilePicture()` - Delete picture mutation

### AI News
- `useAIContent()` - Get both stories and papers (recommended)
- `useNews()` - Get only news stories
- `usePapers()` - Get only research papers
- `useRefreshAIContent()` - Trigger content refresh
- `useStoryChatMutation()` - Chat about a story
- `usePaperChatMutation()` - Chat about a paper
- `useChatHistory(sessionId)` - Get chat history
- `useClearChatMutation()` - Clear chat session

### University Requests (Admin)
- `usePendingRequests()` - Get pending requests
- `useApproveRequest()` - Approve mutation
- `useRejectRequest()` - Reject mutation

### UI Utilities (`hooks/useUI.js`)
- `useEscapeKey(isActive, callback)` - Handle ESC key press
- `useClickOutside(ref, callback, isActive)` - Detect clicks outside element
- `useScrollLock(isLocked)` - Prevent body scroll (for modals)
- `usePageTitle(title)` - Set document title with "- AIxU" suffix
- `useDebounce(value, delay)` - Debounce value changes
- `useCountdown(initialSeconds)` - Countdown timer with reset
- `useModal(isOpen, onClose, options)` - Combined modal behaviors

### Form Utilities
- `useForm(config)` - Form state, validation, and submission handling
- `useEmailVerification(config)` - Common email verification flow logic
- `useFeedPageState()` - Common feed page state (search, filters, modals)

---

## Development Workflow

### Running Development Servers

```bash
# Terminal 1: Flask backend (port 5000)
python app.py

# Terminal 2: React frontend (port 5173)
cd frontend && npm run dev
```

Visit: `http://localhost:5173`

**How it works:**
- Vite proxies `/api/*` to Flask on port 5000
- React app runs on port 5173
- All API calls automatically forwarded to Flask

### Building for Production

```bash
cd frontend && npm run build
```

Output goes to `static/app` and Flask serves it at `/app` route.

### Adding New API Endpoint

1. Add route in appropriate blueprint (`backend/routes_v2/<feature>/routes.py`):
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

3. Add React Query hook if needed (`frontend/src/hooks/`):
   ```javascript
   export function useCreateResource() {
     const queryClient = useQueryClient();
     return useMutation({
       mutationFn: createResource,
       onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] })
     });
   }
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

Tests run automatically on push/PR via GitHub Actions.

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
ANTHROPIC_API_KEY=your-anthropic-key  # For AI news features
DEV_MODE=true                          # Accept any 6-digit code in development
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
UPDATE "user" SET permission_level = 1 WHERE id = 1;  # Site admin
```

---

## Best Practices

### Backend
- **Models:** Pure data layer, no HTTP logic
- **Routes:** HTTP handlers in `routes_v2/<feature>/routes.py`, complex logic in `helpers.py`
- **Services:** Business logic (e.g., `ai_news.py` for Claude integration)
- **Utils:** Reusable functions (validation, permissions, email)
- One blueprint per feature area

### Frontend
- **Pages:** Route-level components
- **Components:** Reusable UI components
  - `icons/` - Centralized SVG icons (import from `components/icons`)
  - `ui/` - Generic UI primitives (BaseModal, Alert, Badge, Tag, FeedCard, etc.)
  - `university/` - University detail page components (tabs, cards)
- **Hooks:** React Query hooks for data fetching + UI utilities in `useUI.js`
- **Contexts:** Auth, Query cache, Socket connection
- **API:** One module per backend feature area

### Tests
- One test file per route blueprint
- Use fixtures from `conftest.py` for setup
- Test both success and error cases

---

For setup instructions, see `README.md`. For testing details, see `README_TESTING.md`.
