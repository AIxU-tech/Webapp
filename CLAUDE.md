# AIxU Website - Architecture Guide

Essential guidance for working with the AIxU codebase.

---

## Overview

AIxU is a Flask-based social platform connecting AI students and researchers across universities. Users can network, share notes, post opportunities, participate in university-specific AI clubs, message each other, and stay updated on AI news and research.

**University Auto-Enrollment:** Users are automatically enrolled based on their .edu email domain during registration. Manual joining is not supported.

**University Request Flow:** Users with a .edu email from a university not yet in the system can submit a request. After admin approval, they receive a secure link to complete account creation.

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
├── requirements-test.txt       # Testing dependencies
├── pytest.ini                  # Pytest configuration
├── .env                        # Environment variables (git-ignored)
│
├── backend/
│   ├── __init__.py            # Application factory (create_app)
│   ├── config.py              # Config + TestConfig classes
│   ├── constants.py           # Permission constants, UniversityRoles
│   ├── extensions.py          # Flask extensions (db, login_manager, socketio)
│   ├── models/                # Database models
│   │   ├── user.py            # User model (profile, banner, stats)
│   │   ├── university.py      # University (logo, banner, social_links)
│   │   ├── university_role.py # Per-university role assignments
│   │   ├── university_request.py # University addition requests
│   │   ├── password_reset_token.py # Password reset tokens
│   │   ├── note.py            # Notes/posts
│   │   ├── note_comment.py    # Threaded comments on notes
│   │   ├── opportunity.py     # Job/project opportunity postings
│   │   ├── opportunity_tag.py # Normalized tags for opportunities
│   │   ├── event.py           # University club events + attendees
│   │   ├── message.py         # Direct messages
│   │   ├── ai_news.py         # AI news stories, papers, chat messages
│   │   └── relationships.py   # Junction tables (follows, likes, bookmarks)
│   ├── routes_v2/             # API blueprints (modular structure)
│   │   ├── auth/              # Legacy HTML authentication
│   │   ├── api_auth/          # JSON API authentication + password reset
│   │   ├── profile/           # User profile + banner
│   │   ├── universities/      # University + role + logo/banner management
│   │   ├── university_requests/ # University request flow
│   │   ├── community/         # Notes + comments
│   │   ├── opportunities/     # Job/opportunity board
│   │   ├── events/            # University club events
│   │   ├── messages/          # Messaging
│   │   ├── notifications/     # Notifications
│   │   ├── news/              # AI news and research papers
│   │   └── public/            # Public pages + city search
│   ├── services/              # Business logic services
│   │   ├── ai_news.py         # Claude-powered news fetching + chat
│   │   ├── scheduler.py       # APScheduler for 24h news refresh
│   │   └── content_moderator.py # Profanity detection
│   ├── sockets/               # WebSocket handlers
│   └── utils/                 # Utility functions
│       ├── email.py           # Email sending, verification, password reset
│       ├── image.py           # Image compression, 5:1 banner cropping
│       ├── validation.py      # Input validation (.edu email, URLs)
│       ├── permissions.py     # Permission checks + route decorators
│       └── time.py            # Time formatting helpers
│
├── frontend/src/
│   ├── main.jsx               # Entry: providers hierarchy
│   ├── App.jsx                # Route definitions
│   ├── api/                   # API client modules
│   │   ├── client.js          # Base API client (get/post/put/patch/delete/upload)
│   │   ├── auth.js            # Auth + password reset API
│   │   ├── universities.js    # Universities + logo/banner API
│   │   ├── universityRequests.js # University request API
│   │   ├── notes.js           # Notes + comments API
│   │   ├── opportunities.js   # Opportunities API
│   │   ├── events.js          # Events API
│   │   ├── users.js           # Users + banner API
│   │   ├── messages.js        # Messages API
│   │   └── news.js            # AI news/papers + chat API
│   ├── components/
│   │   ├── icons/index.jsx    # Centralized icon library (35+ icons)
│   │   ├── ui/                # Generic UI components (31 components)
│   │   │   ├── BaseModal.jsx  # Modal wrapper (ESC, scroll lock, backdrop)
│   │   │   ├── CreateNoteModal.jsx # Note creation with tags
│   │   │   ├── BannerImage.jsx # Banner display
│   │   │   ├── BannerUploadModal.jsx # Banner upload (5:1 crop)
│   │   │   ├── Avatar.jsx     # User avatar with gradient fallback
│   │   │   ├── UniversityLogo.jsx # University logo with gradient fallback
│   │   │   ├── GradientButton.jsx # Primary action button
│   │   │   ├── FeedCard.jsx   # Base card for feed items
│   │   │   ├── Tag.jsx        # Tag, ToggleTag, TagGroup
│   │   │   └── ...            # EmptyState, LoadingState, ErrorState, etc.
│   │   ├── university/        # University detail page (13 components)
│   │   │   ├── UniversityHeroBanner.jsx
│   │   │   ├── UniversityIdentityBar.jsx
│   │   │   ├── UniversityNavTabs.jsx
│   │   │   ├── University*Tab.jsx # Posts, Events, Opportunities, Members, About
│   │   │   ├── EditUniversityIdentityModal.jsx
│   │   │   └── ...            # LeadershipCard, UpcomingEventsCard
│   │   ├── profile/           # Profile page (9 components)
│   │   │   ├── header/        # ProfileHeader
│   │   │   ├── sections/      # ProfileSection, AboutSection, etc.
│   │   │   └── sidebar/       # SkillsCard, ActivityCard, etc.
│   │   ├── messages/          # Messaging UI
│   │   │   ├── ConversationListItem.jsx
│   │   │   ├── ConversationModal.jsx
│   │   │   └── NewMessageModal.jsx
│   │   ├── opportunities/     # CreateOpportunityModal
│   │   ├── layout/            # FeedPageLayout
│   │   └── [root]             # NoteCard, CommentSection, EventCard, etc.
│   ├── contexts/
│   │   ├── AuthContext.jsx    # User auth state
│   │   ├── SocketContext.jsx  # WebSocket connection
│   │   ├── QueryProvider.jsx  # React Query config
│   │   ├── AuthModalContext.jsx # Login/register modal state
│   │   └── TermsContext.jsx   # TOS modal management
│   ├── hooks/
│   │   ├── index.js           # Barrel export
│   │   ├── useUI.js           # UI utilities (escape, scroll lock, debounce, etc.)
│   │   ├── useForm.js         # Form state and validation
│   │   ├── useUniversities.js # University data + mutations
│   │   ├── useNotes.js        # Notes + comments (infinite scroll)
│   │   ├── useOpportunities.js # Opportunities (infinite scroll)
│   │   ├── useEvents.js       # Events + RSVP
│   │   ├── useMessages.js     # Messages + WebSocket updates
│   │   ├── useUsers.js        # Profile + banner
│   │   ├── useNews.js         # AI content + chat
│   │   ├── useUniversityRequests.js # Admin request management
│   │   └── factories/         # Hook factory utilities
│   ├── pages/                 # Route-level components (20 pages)
│   └── config/
│       ├── cache.js           # React Query stale/gc times
│       └── styles.js          # Design system constants (gradients, shadows)
│
├── static/app/                # React build output (Vite)
│
├── tests/                     # pytest test suite
│   ├── conftest.py           # Fixtures (users, universities, roles)
│   └── test_*.py             # Test files
│
└── .github/workflows/
    └── test.yml              # CI: runs pytest on push/PR
```

---

## Database Models

All models in `backend/models/` inherit from `db.Model`.

### User (`backend/models/user.py`)
**Core:** `id`, `email`, `password_hash`, `permission_level` (0=USER, 1=ADMIN)
**Profile:** `first_name`, `last_name`, `university`, `about_section`, `location`, `skills` (JSON)
**Media:** `profile_picture`, `profile_picture_filename`, `profile_picture_mimetype`, `banner_image`, `banner_image_filename`, `banner_image_mimetype`
**Stats:** `post_count`, `follower_count`, `following_count`

**Key methods:** `set_password()`, `check_password()`, `is_site_admin()`, `get_university_role()`, `is_executive_at()`, `is_president_at()`, `has_liked_note()`, `has_bookmarked_note()`, `to_dict()`

### University (`backend/models/university.py`)
**Core:** `id`, `name`, `clubName`, `location`, `email_domain`, `admin_id`
**Details:** `description`, `tags` (JSON), `website_url`, `social_links` (JSON: `[{"type": "linkedin", "url": "..."}]`)
**Media:** `logo`, `logo_filename`, `logo_mimetype`, `banner`, `banner_filename`, `banner_mimetype`
**Stats:** `member_count`, `recent_posts`, `upcoming_events`

Members tracked via UniversityRole table (not stored directly).

**Key methods:** `add_member()`, `remove_member()`, `get_members()`, `is_member()`, `find_by_email_domain()`, `get_president()`, `get_executives()`, `is_member_executive()`, `is_member_president()`, `get_social_links_list()`, `to_dict()`

### UniversityRole (`backend/models/university_role.py`)
**Fields:** `id`, `user_id`, `university_id`, `role`, `created_at`, `updated_at`, `updated_by_id`

Role levels: `MEMBER (0)`, `EXECUTIVE (1)`, `PRESIDENT (2)`

**Key methods:** `get_role()`, `get_role_level()`, `set_role()`, `remove_role()`, `is_executive_or_higher()`, `is_president()`

### UniversityRequest (`backend/models/university_request.py`)
**Status:** `PENDING`, `APPROVED`, `REJECTED`
**Requester:** `requester_email`, `requester_first_name`, `requester_last_name`
**University:** `university_name`, `university_location`, `email_domain`
**Club:** `club_name`, `club_description`, `club_tags` (JSON), `social_links` (JSON)
**Token:** `account_creation_token`, `token_expires_at` (7 days)

**Key methods:** `approve()`, `reject()`, `generate_account_creation_token()`, `find_by_token()`, `is_token_valid()`, `mark_account_created()`

### PasswordResetToken (`backend/models/password_reset_token.py`)
**Fields:** `id`, `user_id`, `token`, `expires_at`, `used`, `created_at`

One-time tokens with expiration for password reset flow.

### Note (`backend/models/note.py`)
**Fields:** `id`, `title`, `content`, `author_id`, `tags` (JSON), `likes`, `comments`, `university_only`, `created_at`

**Key methods:** `is_liked_by()`, `is_bookmarked_by()`, `toggle_like()`, `toggle_bookmark()`, `to_dict()`

### NoteComment (`backend/models/note_comment.py`)
**Fields:** `id`, `note_id`, `user_id`, `parent_id`, `text`, `likes`, `created_at`, `updated_at`

Single-level threading: top-level has `parent_id=NULL`, replies use parent's ID. Replies to replies flatten.

### Opportunity (`backend/models/opportunity.py`)
**Fields:** `id`, `title`, `description`, `compensation`, `university_only`, `author_id`, `created_at`

Tags stored via OpportunityTag table.

### OpportunityTag (`backend/models/opportunity_tag.py`)
**Fields:** `id`, `opportunity_id`, `tag`, `created_at`

Normalized tag storage for efficient filtering.

### Event & EventAttendee (`backend/models/event.py`)
**Event:** `id`, `university_id`, `title`, `description`, `location`, `start_time`, `end_time`, `created_by_id`
**EventAttendee:** `event_id`, `user_id`, `status` (attending/maybe/declined)

### Message (`backend/models/message.py`)
**Fields:** `id`, `sender_id`, `recipient_id`, `content`, `is_read`, `created_at`

### AI News Models (`backend/models/ai_news.py`)
**AINewsStory:** `id`, `title`, `summary`, `batch_id`, `fetched_at`, `event_date`, `image_url`, `emoji`
**AINewsSource:** `id`, `story_id`, `url`, `source_name`
**AIResearchPaper:** `id`, `title`, `authors`, `summary`, `paper_url`, `source_name`, `batch_id`, `fetched_at`, `emoji`
**AINewsChatMessage:** `id`, `session_id`, `story_id` OR `paper_id`, `role`, `content`, `created_at`

### Relationship Tables (`backend/models/relationships.py`)
- **UserFollows:** `follower_id` <-> `following_id`
- **UserLikedUniversity:** `user_id` <-> `university_id`
- **NoteLike:** `user_id` <-> `note_id`
- **NoteBookmark:** `user_id` <-> `note_id`
- **NoteCommentLike:** `user_id` <-> `comment_id`
- **OpportunityBookmark:** `user_id` <-> `opportunity_id`

All have class methods: `exists()`, `create()`, `delete()`

---

## Permission System

Two-tier system: site-level and university-level.

### Site-Level (`User.permission_level`)
```python
USER = 0       # Standard user
ADMIN = 1      # Full access everywhere
```

### University-Level (`UniversityRole.role`)
```python
MEMBER = 0      # Standard member
EXECUTIVE = 1   # Manage members, create events
PRESIDENT = 2   # Manage executives, transfer leadership
```

### Permission Utilities (`backend/utils/permissions.py`)
```python
is_site_admin(user)
can_manage_university_members(user, uni_id)   # Executive+ or site admin
can_manage_executives(user, uni_id)           # President or site admin
get_user_university_permissions(user, uni_id) # Returns permission dict

# Decorators
@require_site_admin
@require_university_executive()
@require_university_president()
```

---

## API Routes

### Authentication (`/api/auth/*`)
```
POST /login                  - JSON login
POST /register               - Registration (auto-enrolls)
POST /verify-email           - Email verification (6-digit code)
POST /resend-verification    - Resend code
POST /logout                 - Logout
GET  /validate-token         - Validate account creation token
POST /complete-account       - Complete account from approved request
POST /dev-login              - Auto-login dev user (DEV_MODE only)
POST /forgot-password        - Request password reset
POST /validate-reset-token   - Validate reset token
POST /reset-password         - Reset password with token
```

### Profile (`/api/profile`, `/api/users/*`)
```
GET    /api/profile           - Current user profile
PATCH  /api/profile           - Update profile
GET    /api/profile/stats     - User statistics
PUT    /api/profile/picture   - Upload profile picture
DELETE /api/profile/picture   - Delete profile picture
PUT    /api/profile/banner    - Upload banner (5:1 aspect ratio)
GET    /user/<id>/profile_picture - Serve profile picture
GET    /user/<id>/banner      - Serve banner image
GET    /api/users/<id>        - Get user by ID with activity
DELETE /api/account           - Delete account
```

### Universities (`/api/universities/*`)
```
GET    /                      - List all universities
POST   /                      - Create university (admin only)
GET    /<id>                  - Get university with members
PATCH  /<id>                  - Update university (executive+)
DELETE /<id>                  - Delete university (admin only)
DELETE /<id>/members/<user_id> - Remove member (executive+)
PUT    /<id>/logo             - Upload logo
GET    /university/<id>/logo  - Serve logo
PUT    /<id>/banner           - Upload banner
GET    /university/<id>/banner - Serve banner
GET    /<id>/roles            - Get all roles
POST   /<id>/roles/<user_id>  - Update user role (president/admin)
DELETE /<id>/roles/<user_id>  - Remove user role
```

### University Requests (`/api/university-requests/*`)
```
POST /start                   - Start request (collect email)
POST /verify                  - Verify email (6-digit code)
POST /resend-code             - Resend code
POST /submit                  - Submit university details
GET  /admin/pending           - Get pending requests (admin)
POST /admin/<id>/approve      - Approve request (admin)
POST /admin/<id>/reject       - Reject request (admin)
```

### Events (`/api/universities/<id>/events`, `/api/events/*`)
```
GET  /api/universities/<id>/events - List events (?upcoming, ?limit)
POST /api/universities/<id>/events - Create event (executive+)
GET  /api/events/<id>              - Get event with attendees
DELETE /api/events/<id>            - Delete event
POST /api/events/<id>/rsvp         - Toggle RSVP (status: attending|maybe|declined)
```

### Notes (`/api/notes/*`)
```
GET    /                      - List (?search, ?user, ?university_id, ?tag, ?bookmarked, ?page, ?page_size)
POST   /                      - Create note
GET    /<id>                  - Get single note
DELETE /<id>                  - Delete note
POST   /<id>/like             - Toggle like
POST   /<id>/bookmark         - Toggle bookmark

# Comments
GET    /<id>/comments         - Get comments
POST   /<id>/comments         - Create comment ({text, replyToId?})
PUT    /<id>/comments/<cid>   - Edit comment
DELETE /<id>/comments/<cid>   - Delete comment
POST   /<id>/comments/<cid>/like - Toggle like
```

### Opportunities (`/api/opportunities/*`)
```
GET    /                      - List (?search, ?location, ?paid, ?myUniversity, ?tags, ?bookmarked, ?page, ?page_size)
POST   /                      - Create opportunity
POST   /<id>/bookmark         - Toggle bookmark
DELETE /<id>                  - Delete opportunity
```

### Messages (`/api/messages/*`)
```
GET  /conversations           - Get all conversations
GET  /conversation/<user_id>  - Get messages with user
POST /                        - Send message
GET  /unread-count            - Get unread count
GET  /api/users/search        - Search users by name/email
```

### AI News (`/api/news/*`, `/api/papers/*`)
```
GET  /api/news                - Get news stories (?limit)
GET  /api/news/<id>           - Get single story
GET  /api/papers              - Get research papers (?limit)
GET  /api/papers/<id>         - Get single paper
GET  /api/ai-content          - Get both (?stories_limit, ?papers_limit)

POST /api/news/refresh        - Trigger refresh (admin/first-load)
GET  /api/news/batches        - Get batch metadata (admin)
POST /api/news/cleanup        - Clean old batches (admin)
GET  /api/news/scheduler      - Scheduler status (admin)

POST /api/news/<id>/chat      - Chat about story
POST /api/papers/<id>/chat    - Chat about paper
GET  /api/chat/<session>/history - Get chat history
DELETE /api/chat/<session>    - Clear chat
```

### Public (`/api/*`)
```
GET /api/cities/search        - City search (Nominatim proxy)
```

---

## React Routes

**Authentication:** `/login`, `/register`, `/verify-email`, `/complete-account`, `/forgot-password`, `/reset-password`

**University Request:** `/add-university`, `/request-university`, `/request-university/details`, `/request-university/submitted`

**Main App (with AppLayout):**
- `/community` - Notes feed (infinite scroll)
- `/universities` - Universities list
- `/universities/:id` - University detail (tabbed: Posts, Events, Opportunities, Members, About)
- `/opportunities` - Opportunities board (infinite scroll)
- `/profile` - Current user profile
- `/users/:userId` - User profile
- `/messages` - Messaging
- `/news` - AI news and research
- `/admin/university-requests` - Admin request queue
- `/notes/:noteId` - Note detail

---

## React Hooks Reference

### Data Fetching (React Query)

**Universities:** `useUniversities()`, `useUniversity(id)`, `useCreateUniversity()`, `useUpdateUniversity()`, `useRemoveMember()`, `useUpdateMemberRole()`, `useUploadUniversityLogo()`, `useUploadUniversityBanner()`

**Events:** `useUniversityEvents(id, opts)`, `useEvent(id)`, `useCreateEvent()`, `useDeleteEvent()`, `useToggleRsvp()`

**Notes:** `useInfiniteNotes(params)`, `useNote(id)`, `useCreateNote()`, `useLikeNote()`, `useBookmarkNote()`, `useDeleteNote()`, `useComments(noteId)`, `useCreateComment()`, `useUpdateComment()`, `useDeleteComment()`, `useLikeComment()`

**Opportunities:** `useInfiniteOpportunities(params)`, `useCreateOpportunity()`, `useBookmarkOpportunity()`, `useDeleteOpportunity()`

**Messages:** `useConversations()`, `useConversation(userId)`, `useSendMessage()`, `useSearchUsers(query)`

**Users:** `useUser(userId)`, `useUpdateProfile()`, `useUploadProfilePicture()`, `useDeleteProfilePicture()`, `useUploadProfileBanner()`

**AI News:** `useAIContent()`, `useNews()`, `usePapers()`, `useRefreshAIContent()`, `useStoryChatMutation()`, `usePaperChatMutation()`, `useChatHistory(sessionId)`, `useClearChatMutation()`

**University Requests:** `usePendingRequests()`, `useApproveRequest()`, `useRejectRequest()`

### UI Utilities (`hooks/useUI.js`)
- `useEscapeKey(isActive, callback)` - ESC key handler
- `useClickOutside(ref, callback, isActive)` - Click outside detection
- `useScrollLock(isLocked)` - Lock body scroll
- `usePageTitle(title)` - Set document title
- `useDebounce(value, delay)` - Debounce values
- `useCountdown(initialSeconds)` - Countdown timer
- `useDelayedLoading(isLoading, delayMs)` - Delay loading display
- `useInfiniteScroll(options)` - Infinite scroll trigger
- `useModal(isOpen, onClose, options)` - Combined modal behaviors
- `useBeforeUnload(callback)` - Page unload warning

### Form Utilities
- `useForm(config)` - Form state, validation, submission
- `useEmailVerification(config)` - Email verification flow
- `useFeedPageState()` - Feed page state (search, filters, modals)

---

## Services

### AI News Service (`backend/services/ai_news.py`)
Claude-powered content fetching with web search API.

**Constants:** `SEARCH_MODEL` (claude-haiku), `CHAT_MODEL` (claude-sonnet), `NUM_STORIES=3`, `NUM_PAPERS=3`

**Key functions:** `fetch_top_ai_content()`, `get_latest_content()`, `chat_with_story()`, `chat_with_paper()`, `get_chat_history()`, `cleanup_old_batches()`

### Scheduler (`backend/services/scheduler.py`)
APScheduler for 24-hour automated news refresh.

**Key functions:** `init_scheduler(app)`, `shutdown_scheduler()`, `get_scheduler_status()`, `trigger_news_refresh_now()`

### Content Moderator (`backend/services/content_moderator.py`)
Profanity detection using better-profanity.

**Function:** `moderate_content(text)` - Returns True if clean

---

## Context Providers

Provider hierarchy in `main.jsx`:
```
QueryProvider > AuthModalProvider > TermsProvider > AuthProvider > SocketProvider > App
```

- **QueryProvider** - React Query with 5min stale, 30min gc defaults
- **AuthContext** - User auth state (`useAuth()`)
- **SocketContext** - WebSocket connection (`useSocket()`, `useSocketEvent()`)
- **AuthModalContext** - Login/register modal state (`useAuthModal()`)
- **TermsContext** - TOS modal with parent tracking (`useTerms()`)

---

## Development

### Running Servers
```bash
python app.py                    # Backend (port 5000)
cd frontend && npm run dev       # Frontend (port 5173)
```

Vite proxies `/api/*` to Flask.

### Building
```bash
cd frontend && npm run build     # Output to static/app/
```

### Adding Endpoints

1. Route in `backend/routes_v2/<feature>/routes.py`
2. Client function in `frontend/src/api/*.js`
3. React Query hook in `frontend/src/hooks/`

---

## Testing

```bash
pytest                           # All tests
pytest -v                        # Verbose
pytest -m unit                   # Unit tests only
```

**Fixtures:** `app`, `client`, `test_user`, `test_university`, `authenticated_client`, `admin_user`, `president_user`, `executive_user`

---

## Configuration

### Environment Variables
```env
DATABASE_URL=postgresql://...
SECRET_KEY=...
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
SMTP_USER=no-reply@aixu.tech
SMTP_PASS=...
ADMIN_EMAIL=admin@aixu.tech
ANTHROPIC_API_KEY=...
DEV_MODE=true                    # Accept any 6-digit code
```

### Config Class
```python
class Config:
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_SECURE = not DEV_MODE
    PERMANENT_SESSION_LIFETIME = timedelta(days=31)
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": 10, "max_overflow": 5,
        "pool_timeout": 30, "pool_recycle": 1800
    }
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10MB
```

### TestConfig
Uses SQLite `:memory:`, disables CSRF, faster bcrypt rounds.

---

## Key Patterns

### Backend
- **Models:** Pure data, no HTTP logic
- **Routes:** HTTP handlers with helpers for complex logic
- **Services:** Business logic (AI, scheduling)
- **Utils:** Reusable functions
- One blueprint per feature

### Frontend
- **Pages:** Route-level components
- **Components:** Organized by feature (ui/, university/, profile/, messages/)
- **Hooks:** React Query for data, useUI.js for DOM utilities
- **Contexts:** Auth, Socket, Query, Modals
- **API:** One module per backend feature

### Caching Strategy
- Aggressive for static data (Universities: 10min, News: 5min)
- Short for user content (Notes: 2min)
- Real-time via WebSocket for Messages
- Optimistic updates for all mutations
- Infinite scroll pagination

### Image Handling
- Profile pictures: max 800x800px, quality 85
- Banners: 5:1 aspect ratio, center-crop to 1500x300px
