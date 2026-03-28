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
- **AI Integration:** Claude API for news fetching, interactive chat, and resume parsing
- **Deployment:** React SPA served at `/app*`, API at `/api/*`

---

## Directory Structure

```
AIxU_website/
├── app.py                      # Entry point (socketio.run)
├── requirements.txt            # Python dependencies
├── requirements-test.txt       # Testing dependencies
├── pytest.ini                  # Pytest configuration
├── Dockerfile                  # Container definition (Flask app)
├── docker-compose.yml          # Multi-container orchestration (Flask + PostgreSQL)
├── dev.sh                      # Development startup script
├── main.tf                     # Terraform infrastructure configuration
├── .env                        # Environment variables (git-ignored)
│
├── backend/
│   ├── __init__.py            # Application factory (create_app)
│   ├── config.py              # Config + TestConfig classes
│   ├── constants.py           # Permission constants, UniversityRoles, attachment/resume limits
│   ├── extensions.py          # Flask extensions (db, login_manager, socketio)
│   ├── models/                # Database models
│   │   ├── user.py            # User model (profile, banner, stats, social_links)
│   │   ├── university.py      # University (logo, banner, social_links)
│   │   ├── university_role.py # Per-university role assignments
│   │   ├── university_request.py # University addition requests
│   │   ├── password_reset_token.py # Password reset tokens
│   │   ├── profile_sections.py # Education, Experience, Project models
│   │   ├── resume.py          # Resume upload metadata (GCS-backed, one per user)
│   │   ├── note.py            # Notes/posts
│   │   ├── note_comment.py    # Threaded comments on notes
│   │   ├── note_attachment.py # GCS-based file attachments for notes
│   │   ├── opportunity.py     # Job/project opportunity postings
│   │   ├── opportunity_tag.py # Normalized tags for opportunities
│   │   ├── event.py           # University club events + attendees + attendance_token
│   │   ├── event_attendance.py # QR-based event attendance records
│   │   ├── speaker.py         # Guest speaker contacts (executive-only)
│   │   ├── message.py         # Direct messages
│   │   ├── notification.py    # Notification model with upsert/decrement logic
│   │   ├── ai_news.py         # AI news stories, papers, chat messages
│   │   └── relationships.py   # Junction tables (follows, likes, bookmarks)
│   ├── routes_v2/             # API blueprints (modular structure)
│   │   ├── auth/              # Legacy HTML authentication
│   │   ├── api_auth/          # JSON API authentication + password reset
│   │   ├── profile/           # User profile + banner + profile sections
│   │   │   ├── routes.py      # Profile CRUD, picture, banner, account deletion
│   │   │   └── sections.py    # Education/Experience/Project CRUD endpoints
│   │   ├── universities/      # University + role + logo/banner management
│   │   ├── university_requests/ # University request flow
│   │   ├── community/         # Notes + comments + attachments
│   │   ├── opportunities/     # Job/opportunity board
│   │   ├── events/            # University club events
│   │   ├── attendance/        # Public QR-based event attendance (no auth required)
│   │   ├── speakers/          # Guest speaker contacts (executive+)
│   │   ├── resume/            # Resume upload/download/delete
│   │   ├── messages/          # Messaging
│   │   ├── notifications/     # Notification REST API + legacy university-post endpoints
│   │   ├── news/              # AI news and research papers
│   │   ├── uploads/           # GCS file upload signed URLs
│   │   └── public/            # Public pages + city search
│   ├── services/              # Business logic services
│   │   ├── ai_news.py         # Claude-powered news fetching + chat
│   │   ├── resume_parser.py   # Claude-powered resume parsing
│   │   ├── scheduler.py       # News refresh orchestration
│   │   ├── content_moderator.py # Profanity detection
│   │   ├── storage.py         # Google Cloud Storage (signed URLs + image uploads)
│   │   ├── image_extraction.py # Web page image extraction (og:image, etc.)
│   │   └── agents/            # 4-agent AI news pipeline
│   │       ├── base.py        # Claude API helpers + JSON extraction
│   │       ├── story_scout.py # Haiku + web search → news candidates
│   │       ├── paper_scout.py # Haiku + web search → paper candidates
│   │       └── curator.py     # Sonnet → rank and summarize top results
│   ├── sockets/               # WebSocket handlers (events.py)
│   └── utils/                 # Utility functions
│       ├── email.py           # Email sending, verification, password reset
│       ├── image.py           # Image compression, 5:1 banner cropping
│       ├── validation.py      # Input validation (.edu email, URLs, phone format)
│       ├── permissions.py     # Permission checks + route decorators
│       ├── profile.py         # Auto-populate education on registration
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
│   │   ├── attendance.js      # QR attendance API (public endpoints)
│   │   ├── speakers.js        # Speakers API
│   │   ├── users.js           # Users + banner + profile sections API
│   │   ├── messages.js        # Messages API
│   │   ├── notifications.js   # Notifications API
│   │   ├── news.js            # AI news/papers + chat API
│   │   ├── resume.js          # Resume upload/download API
│   │   └── uploads.js         # GCS file upload + attachment API
│   ├── components/
│   │   ├── admin/             # RequestCard
│   │   ├── auth/              # AuthFormLayout, ProtectedRoute, LoginModal, RegisterModal, etc.
│   │   ├── community/         # NoteCard, CommentSection, CreateNoteModal, EditNoteModal, NoteAttachments, NoteLikersModal
│   │   ├── events/            # CreateEventModal, EventCard, AttendanceQRModal
│   │   ├── home/              # FeatureCard
│   │   ├── icons/             # Centralized icon library (100+ icons across 11 files)
│   │   ├── layout/            # AppLayout, NavBar, Footer, FeedPageLayout, AppPrefetcher, PlasmaBackground, ScrollToTop
│   │   ├── messages/          # ConversationPanel, ConversationSidebar, MessageBubble, MessageInput, UserSearchBar
│   │   ├── news/              # ContentCard
│   │   ├── notifications/     # NotificationDropdown
│   │   ├── opportunities/     # CreateOpportunityModal, OpportunityCard
│   │   ├── profile/           # EditProfileModal, ProfileCard, ProfilePictureSection
│   │   │   ├── header/        # ProfileHeader
│   │   │   │   └── images/    # Profile header image components
│   │   │   ├── sections/      # ProfileSection, AboutSection, ExperienceSection, etc.
│   │   │   └── sidebar/       # SkillsCard, ActivityCard, AIClubsCard, RecentPostsCard, etc.
│   │   ├── speakers/          # SpeakerCard, CreateSpeakerModal, SpeakerContactModal
│   │   ├── executive/         # Executive portal components
│   │   ├── university/        # UniversityCard, University*Tab, EditUniversityIdentityModal, etc.
│   │   └── ui/                # Generic UI components (organized into subdirectories)
│   │       ├── buttons/       # GradientButton, CloseButton, IconButton, LikeButton, SecondaryButton
│   │       ├── cards/         # Card, FeedCard, StatCard, CardSkeleton
│   │       ├── display/       # Avatar, Badge, Tag, LinkifyText, Tooltip, etc.
│   │       ├── feedback/      # Alert, EmptyState, ErrorState, LoadingState, Toast
│   │       ├── forms/         # FormInput, FormTextarea, TagSelector, SocialLinksInput, CitySearchInput, FileUpload, etc.
│   │       ├── images/        # BannerImage, BannerUploadModal, UniversityLogo
│   │       ├── lists/         # FeedItemList, UserListItem
│   │       ├── modals/        # BaseModal, ConfirmationModal, UnsavedChangesModal
│   │       └── popovers/      # MemberActionsPopover, SharePopover
│   ├── constants/
│   │   └── speakerTags.js     # Speaker background tag definitions
│   ├── contexts/
│   │   ├── AuthContext.jsx    # User auth state
│   │   ├── SocketContext.jsx  # WebSocket connection
│   │   ├── QueryProvider.jsx  # React Query config
│   │   ├── AuthModalContext.jsx # Login/register modal state
│   │   ├── TermsContext.jsx   # TOS modal management
│   │   └── MessageTargetContext.jsx # Message target user tracking
│   ├── hooks/
│   │   ├── index.js           # Barrel export
│   │   ├── useUI.js           # UI utilities (escape, scroll lock, debounce, etc.)
│   │   ├── useForm.js         # Form state and validation
│   │   ├── useLoginForm.js    # Login form logic
│   │   ├── useRegisterForm.js # Registration form logic
│   │   ├── useFeedPageState.js # Feed page state (search, filters, modals)
│   │   ├── useUniversities.js # University data + mutations
│   │   ├── useNotes.js        # Notes + comments (infinite scroll)
│   │   ├── useOpportunities.js # Opportunities (infinite scroll)
│   │   ├── useEvents.js       # Events + RSVP
│   │   ├── useAttendance.js   # QR attendance (event lookup, submit, records)
│   │   ├── useSpeakers.js     # Speaker CRUD
│   │   ├── useMessages.js     # Messages + WebSocket updates
│   │   ├── useUsers.js        # Profile + banner + profile sections (education/experience/project)
│   │   ├── useResume.js       # Resume upload/download/delete + AI parsing
│   │   ├── useNotifications.js # Notification list, unread count, mark-read
│   │   ├── useNews.js         # AI content + chat
│   │   ├── useUniversityRequests.js # Admin request management
│   │   ├── useClipboard.js    # Clipboard operations
│   │   └── factories/         # Hook factory utilities
│   ├── pages/                 # Route-level components (23 pages, includes AttendEventPage, ExecutivePortal)
│   └── config/
│       ├── cache.js           # React Query stale/gc times
│       └── styles.js          # Design system constants (gradients, shadows)
│
├── scripts/                   # Operations scripts
│   ├── cleanup_orphaned_uploads.py # Clean up unlinked GCS files
│   ├── migrate_images_to_gcs.py   # Migrate image blobs to GCS
│   ├── refresh_news.py        # Cron-triggered AI news refresh
│   ├── set_admin.py           # Promote user to site admin
│   └── update_university_domains.py # Batch update university email domains
│
├── static/app/                # React build output (Vite)
│
├── migrations/                # Flask-Migrate (Alembic) migrations
│
├── tests/                     # pytest test suite (16 test files)
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
**Profile:** `first_name`, `last_name`, `headline`, `university`, `about_section`, `avatar_url`, `location`, `skills` (JSON), `social_links` (JSON: `[{"type": "linkedin", "url": "..."}]`)
**Media (GCS):** `profile_picture_gcs_path`, `banner_image_gcs_path`
**Media (legacy blob):** `profile_picture`, `profile_picture_filename`, `profile_picture_mimetype`, `banner_image`, `banner_image_filename`, `banner_image_mimetype`
**Stats:** `post_count`, `follower_count`, `following_count`
**Relationships:** `education_entries`, `experience_entries`, `project_entries` (via profile_sections), `resume` (one-to-one)

**Key methods:** `set_password()`, `check_password()`, `is_site_admin()`, `get_university_role()`, `is_executive_at()`, `is_president_at()`, `has_liked_note()`, `has_bookmarked_note()`, `get_social_links_list()`, `set_social_links_list()`, `get_profile_picture_url()`, `get_banner_image_url()`, `to_dict()`

### Profile Sections (`backend/models/profile_sections.py`)
Three models for structured profile data, all with `user_id` FK (cascade delete), `display_order`, and `to_dict()`.

**Education:** `institution`, `degree`, `field_of_study`, `start_date`, `end_date`, `gpa`, `description`
**Experience:** `title`, `company`, `location`, `start_date`, `end_date`, `description`
**Project:** `title`, `description`, `url`, `start_date`, `end_date`, `technologies` (JSON string)

### Resume (`backend/models/resume.py`)
**Fields:** `id`, `user_id` (unique — one per user), `gcs_path`, `filename`, `content_type`, `size_bytes`, `created_at`

Max 5MB. PDF and Word documents only (`ALLOWED_RESUME_TYPES` in constants). Stored in GCS.

### University (`backend/models/university.py`)
**Core:** `id`, `name`, `clubName`, `location`, `email_domain`, `admin_id`
**Details:** `description`, `tags` (JSON), `website_url`, `social_links` (JSON: `[{"type": "linkedin", "url": "..."}]`)
**Media (GCS):** `logo_gcs_path`, `banner_gcs_path`
**Media (legacy blob):** `logo`, `logo_filename`, `logo_mimetype`, `banner`, `banner_filename`, `banner_mimetype`
**Stats:** `member_count`, `recent_posts`, `upcoming_events`

Members tracked via UniversityRole table (not stored directly).

**Key methods:** `add_member()`, `remove_member()`, `get_members()`, `is_member()`, `find_by_email_domain()`, `get_president()`, `get_executives()`, `is_member_executive()`, `is_member_president()`, `get_social_links_list()`, `to_dict()`

### UniversityRole (`backend/models/university_role.py`)
**Fields:** `id`, `user_id`, `university_id`, `role`, `events_attended_count`, `created_at`, `updated_at`, `updated_by_id`

Role levels: `MEMBER (0)`, `EXECUTIVE (1)`, `PRESIDENT (2)`

**Key methods:** `get_role()`, `get_role_level()`, `set_role()`, `remove_role()`, `is_executive_or_higher()`, `is_president()`, `is_executive_anywhere(user_id)`

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
**Relationships:** `attachments` (one-to-many NoteAttachment, cascade delete)

**Key methods:** `is_liked_by()`, `is_bookmarked_by()`, `toggle_like()`, `toggle_bookmark()`, `to_dict()`

### NoteAttachment (`backend/models/note_attachment.py`)
**Fields:** `id`, `note_id`, `user_id`, `gcs_path` (unique GCS storage path), `filename`, `content_type`, `size_bytes`, `created_at`

Max 5 attachments per note, max 10MB per file. Stored in GCS via signed URLs.

**Key methods:** `count_for_note()`, `get_for_note()`, `create_for_note()`, `to_dict()`

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
**Event:** `id`, `university_id`, `title`, `description`, `location`, `start_time`, `end_time`, `created_by_id`, `attendance_token` (unique, auto-generated on creation)
**EventAttendee:** `event_id`, `user_id`, `status` (attending/maybe/declined)

Note: `attendance_token` is excluded from `to_dict()` to prevent accidental exposure. It is only returned to executives via dedicated attendance endpoints.

### EventAttendance (`backend/models/event_attendance.py`)
**Fields:** `id`, `event_id`, `name`, `email` (optional), `user_id` (optional), `checked_in_via` (default: `qr_scan`), `checked_in_at`

Day-of attendance tracking via QR code scan — separate from RSVP (EventAttendee). No account required to check in.

**Deduplication:** Partial unique indexes prevent duplicate check-ins: one per `user_id` per event (for logged-in users), one per `email` per event (for anonymous users without an account). Race conditions handled via IntegrityError catch with rollback and re-query.

**Key methods:** `find_existing()` (application-level dedup check), `to_dict()`

### Speaker (`backend/models/speaker.py`)
**Fields:** `id`, `name`, `position`, `organization`, `email`, `phone`, `linkedin_url`, `notes`, `tags` (JSON string), `university_id`, `added_by_id`, `created_at`, `updated_at`
**Image (GCS):** `image_gcs_path`, `image_filename`, `image_content_type`, `image_size_bytes`

Guest speaker contacts shared across university AI clubs. Only accessible to executives+.

Tags are from a fixed set defined in `speakers/routes.py` (`SPEAKER_TAG_CHOICES`) synced with `frontend/src/constants/speakerTags.js`.

### Message (`backend/models/message.py`)
**Fields:** `id`, `sender_id`, `recipient_id`, `content`, `is_read`, `created_at`

### Notification (`backend/models/notification.py`)
**Fields:** `id`, `recipient_id`, `actor_id`, `verb`, `target_id`, `target_type`, `extra_data` (JSON), `is_read`, `created_at`, `updated_at`

Aggregated notifications: multiple actions on the same target merge into one row with a count.

**Key methods:** `upsert_for_event()` (create or increment), `decrement_for_event()` (decrement or delete), `to_dict()`

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
EXECUTIVE = 1   # Manage members, create events, access speakers
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
POST /register               - Registration (auto-enrolls, creates initial education)
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
DELETE /api/profile/banner   - Delete banner image
GET    /user/<id>/profile_picture - Serve profile picture
GET    /user/<id>/banner      - Serve banner image
GET    /api/users/<id>        - Get user by ID with activity
DELETE /api/account           - Delete account
```

### Profile Sections (`/api/profile/*`)
```
POST   /api/profile/education       - Create education entry
PUT    /api/profile/education/<id>  - Update education entry
DELETE /api/profile/education/<id>  - Delete education entry

POST   /api/profile/experience       - Create experience entry
PUT    /api/profile/experience/<id>  - Update experience entry
DELETE /api/profile/experience/<id>  - Delete experience entry

POST   /api/profile/projects         - Create project entry
PUT    /api/profile/projects/<id>    - Update project entry
DELETE /api/profile/projects/<id>    - Delete project entry
```

### Resume (`/api/profile/resume`, `/api/users/*/resume`)
```
POST   /api/profile/resume              - Confirm resume upload (replace if exists)
DELETE /api/profile/resume              - Delete own resume
GET    /api/users/<id>/resume           - Get user's resume (authenticated only)
POST   /api/profile/resume/parse        - Start AI resume parsing (Claude Haiku)
GET    /api/profile/resume/parse-status  - Check parsing status
DELETE /api/profile/resume/parse-status  - Clear parsing status
```

### Universities (`/api/universities/*`)
```
GET    /                      - List all universities
POST   /                      - Create university (admin only)
GET    /<id>                  - Get university with members
PATCH  /<id>                  - Update university (executive+)
DELETE /<id>                  - Delete university (admin only)
DELETE /<id>/members/<user_id> - Remove member (executive+)
GET    /<id>/members/<user_id>/attendance - Member attendance history (executive+)
PUT    /<id>/logo             - Upload logo
DELETE /<id>/logo             - Delete logo (executive+)
GET    /university/<id>/logo  - Serve logo
PUT    /<id>/banner           - Upload banner
DELETE /<id>/banner           - Delete banner (executive+)
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
GET    /api/universities/<id>/events - List events (?upcoming, ?limit)
POST   /api/universities/<id>/events - Create event (executive+)
GET    /api/events/<id>              - Get event with attendees
PUT    /api/events/<id>              - Update event (executive+)
DELETE /api/events/<id>              - Delete event (executive+)
POST   /api/events/<id>/rsvp         - Toggle RSVP (status: attending|maybe|declined)
```

### Attendance (`/api/attendance/*`, `/api/events/*/attendance*`)
```
GET  /api/events/<id>/attendance-token  - Get/generate QR token (executive+)
GET  /api/attendance/<token>            - Get event info by token (public, no auth)
POST /api/attendance/<token>            - Submit attendance check-in (public, no auth)
GET  /api/events/<id>/attendance        - Get attendance records (executive+)
```

The event lookup endpoint auto-fills name/email for logged-in users. Attendance tokens are pre-generated on event creation.

### Notes (`/api/notes/*`)
```
GET    /                      - List (?search, ?user, ?university_id, ?tag, ?bookmarked, ?page, ?page_size)
POST   /                      - Create note (with optional attachments)
GET    /<id>                  - Get single note
PUT    /<id>                  - Update note (author only)
DELETE /<id>                  - Delete note (author only)
POST   /<id>/like             - Toggle like
GET    /<id>/likes            - Get users who liked note
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

### Speakers (`/api/speakers/*`)
```
GET    /                      - List all speakers + user's executive university IDs
POST   /                      - Create speaker (executive+)
PUT    /<id>                  - Update speaker (original adder or admin)
DELETE /<id>                  - Delete speaker (original adder or admin)
```

### Messages (`/api/messages/*`)
```
GET  /conversations           - Get all conversations
GET  /conversation/<user_id>  - Get messages with user
POST /                        - Send message
GET  /unread-count            - Get unread count
GET  /api/users/search        - Search users by name/email
```

### Notifications (`/api/notifications/*`)
```
GET   /api/notifications              - Get last 20 notifications
GET   /api/notifications/count        - Get unread count
PATCH /api/notifications/<id>/read    - Mark single notification read
PATCH /api/notifications/read-all     - Mark all notifications read
GET   /api/notifications/university-posts - Legacy: recent posts from university members
GET   /api/notifications/check-new    - Legacy: check for new notifications since timestamp
```

### AI News (`/api/news/*`, `/api/papers/*`)
```
GET  /api/news                - Get news stories (?limit)
GET  /api/news/<id>           - Get single story
GET  /api/papers              - Get research papers (?limit)
GET  /api/papers/<id>         - Get single paper
GET  /api/ai-content          - Get both (?stories_limit, ?papers_limit)

POST /api/news/refresh        - Trigger refresh (admin/first-load)
POST /api/news/cron-refresh   - Refresh via cron (secret auth)
GET  /api/news/batches        - Get batch metadata (admin)
POST /api/news/cleanup        - Clean old batches (admin)

POST /api/news/<id>/chat      - Chat about story
POST /api/papers/<id>/chat    - Chat about paper
GET  /api/chat/<session>/history - Get chat history
DELETE /api/chat/<session>    - Clear chat
```

### Uploads (`/api/uploads/*`)
```
POST   /api/uploads/request-url   - Request signed URL for single GCS upload
POST   /api/uploads/request-urls  - Request signed URLs for batch GCS uploads
DELETE /api/uploads/attachments/<id> - Delete attachment
GET    /api/notes/<id>/attachments - Get attachments for a note
```

### Public (`/api/*`)
```
GET /api/cities/search        - City search (Nominatim proxy)
GET /api/stats                - Platform stats (public)
```

---

## React Routes

**Authentication:** `/login`, `/register`, `/verify-email`, `/complete-account`, `/forgot-password`, `/reset-password`

**University Request:** `/add-university`, `/request-university`, `/request-university/details`, `/request-university/submitted`

**Attendance:** `/attend/:token` - Mobile-first QR check-in page (standalone, no AppLayout, no auth required)

**Main App (with AppLayout):**
- `/community` - Notes feed (infinite scroll)
- `/notes/:noteId` - Note detail
- `/universities` - Universities list
- `/universities/:id` - University detail (tabbed: Posts, Events, Opportunities, Members, About)
- `/opportunities` - Opportunities board (infinite scroll)
- `/profile` - Current user profile
- `/users/:userId` - User profile
- `/messages` - Messaging (ProtectedRoute)
- `/news` - AI news and research
- `/speakers` - Guest speaker contacts (executive+)
- `/executive/:universityId` - Executive portal (events management, attendance)
- `/admin/university-requests` - Admin request queue

---

## React Hooks Reference

### Data Fetching (React Query)

**Universities:** `useUniversities()`, `useUniversity(id)`, `useMemberAttendance()`, `useCreateUniversity()`, `useUpdateUniversity()`, `useRemoveMember()`, `useUpdateMemberRole()`, `useUploadUniversityLogo()`, `useUploadUniversityBanner()`, `useDeleteUniversityLogo()`, `useDeleteUniversityBanner()`

**Events:** `useUniversityEvents(id, opts)`, `useEvent(id)`, `useCreateEvent()`, `useUpdateEvent()`, `useDeleteEvent()`, `useToggleRsvp()`

**Notes:** `useInfiniteNotes(params)`, `useNote(id)`, `useCreateNote()`, `useUpdateNote()`, `useLikeNote()`, `useBookmarkNote()`, `useDeleteNote()`, `useNoteLikers(noteId)`, `useComments(noteId)`, `useCreateComment()`, `useUpdateComment()`, `useDeleteComment()`, `useLikeComment()`

**Opportunities:** `useInfiniteOpportunities(params)`, `useCreateOpportunity()`, `useBookmarkOpportunity()`, `useDeleteOpportunity()`

**Attendance:** `useAttendanceEvent(token)`, `useSubmitAttendance()`, `useEventAttendance(eventId)`, `useEventAttendanceToken()`

**Speakers:** `useSpeakers()`, `useCreateSpeaker()`, `useUpdateSpeaker()`, `useDeleteSpeaker()`

**Messages:** `useConversations()`, `useConversation(userId)`, `useSendMessage()`, `useSearchUsers(query)`, `useUnreadCount()`

**Users:** `useUser(userId)`, `useUpdateProfile()`, `useUploadProfilePicture()`, `useDeleteProfilePicture()`, `useUploadProfileBanner()`, `useDeleteProfileBanner()`, `useCreateEducation()`, `useUpdateEducation()`, `useDeleteEducation()`, `useCreateExperience()`, `useUpdateExperience()`, `useDeleteExperience()`, `useCreateProject()`, `useUpdateProject()`, `useDeleteProject()`

**Resume:** `useResume(userId)`, `useUploadResume(userId)`, `useDeleteResume()`, `useStartResumeParse()`, `useResumeParseStatus()`

**Notifications:** `useNotifications()`, `useUnreadNotificationCount()`, `useMarkAllNotificationsRead()`

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
- `useLoginForm({ onSuccess })` - Login form logic
- `useRegisterForm()` - Registration form logic
- `useFeedPageState(config)` - Feed page state (search, filters, modals)
- `useEmailVerification(config)` - Email verification flow

---

## Services

### AI News Service (`backend/services/ai_news.py`)
Claude-powered content fetching via a 4-agent pipeline.

**Models:** `claude-haiku-4-5-20251001` (scouts), `claude-sonnet-4-5-20250929` (curators + chat)
**Constants:** `NUM_STORIES=3`, `NUM_PAPERS=3`, `MAX_CONVERSATION_HISTORY=20`

**Pipeline:** Story Scout (Haiku + web search) → Story Curator (Sonnet) | Paper Scout (Haiku + web search) → Paper Curator (Sonnet). Scouts run in parallel, then curators rank and summarize.

**Agent files:** `backend/services/agents/` — `base.py` (Claude API helpers), `story_scout.py`, `paper_scout.py`, `curator.py`

**Key functions:** `fetch_top_ai_content()`, `get_latest_content()`, `chat_with_story()`, `chat_with_paper()`, `get_chat_history()`, `cleanup_old_batches()`

### Storage Service (`backend/services/storage.py`)
Google Cloud Storage integration for attachments, resumes, and images via signed URLs.

**Key functions:** `generate_upload_url()`, `generate_download_url()`, `get_public_image_url()`, `upload_image_bytes()`, `generate_image_gcs_path()`, `delete_file()`, `delete_files()`, `delete_user_uploads()`, `delete_user_images()`, `validate_content_type()`, `validate_file_extension()`, `is_gcs_configured()`
**File organization:** `uploads/{user_id}/{uuid}_{filename}` (attachments/resumes), `{env_prefix}/images/{type}/{entity_id}/{uuid}_{filename}` (images)
**Caching:** Thread-safe TTL cache for signed URLs (1h for images, bounded at 2000 entries)
**Credential priority:** GCS_CREDENTIALS_JSON (base64 env) → service account file → GOOGLE_APPLICATION_CREDENTIALS → ADC

### Image Extraction (`backend/services/image_extraction.py`)
Extracts representative images from web pages for AI news stories.

**Function:** `extract_image_from_url()` — Priority: og:image → twitter:image → twitter:image:src → article:image

### Resume Parser (`backend/services/resume_parser.py`)
Claude-powered resume parsing that extracts structured profile data from PDF/DOCX files.

**Model:** `claude-haiku-4-5-20251001`
**Key functions:** `start_resume_parse()` (background thread), `get_parse_status()`, `clear_parse_status()`
**Extracts:** about_section, headline, location, skills, social_links, education, experience, projects. Merges with existing data, skips duplicates.

### Scheduler (`backend/services/scheduler.py`)
News refresh orchestration.

**Key function:** `refresh_news(keep_batches=7)` — fetches content then cleans old batches

### Content Moderator (`backend/services/content_moderator.py`)
Profanity detection using better-profanity.

**Function:** `moderate_content(text)` - Returns True if clean

---

## Context Providers

Provider hierarchy in `main.jsx`:
```
QueryProvider > BrowserRouter > TermsProvider > AuthProvider > AuthModalProvider > [TermsModalWrapper, AppPrefetcher] > MessageTargetProvider > SocketProvider > App
```

- **QueryProvider** - React Query with 5min stale, 30min gc defaults
- **AuthContext** - User auth state (`useAuth()`)
- **SocketContext** - WebSocket connection (`useSocket()`)
- **AuthModalContext** - Login/register modal state (`useAuthModal()`)
- **TermsContext** - TOS modal with parent tracking (`useTerms()`)
- **MessageTargetContext** - Target user for direct messages

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

### Operations Scripts
```bash
python scripts/set_admin.py              # Promote user to site admin
python scripts/refresh_news.py           # Cron-triggered AI news refresh (requires APP_URL, CRON_SECRET)
python scripts/cleanup_orphaned_uploads.py # Clean up unlinked GCS files
python scripts/migrate_images_to_gcs.py  # Migrate image blobs from DB to GCS
python scripts/update_university_domains.py # Batch update email domains
```

---

## Testing

```bash
pytest                           # All tests
pytest -v                        # Verbose
pytest -m unit                   # Unit tests only
```

**Test files (16):** auth, health, profile, universities, university_roles, university_requests, community, events, attendance, messages, models, security, utils, notifications, news, speakers

**Fixtures:** `app`, `client`, `test_user`, `test_user_with_university`, `second_user`, `test_university`, `second_university`, `test_note`, `multiple_notes`, `test_event`, `test_message`, `conversation_messages`, `pending_university_request`, `authenticated_client`, `admin_user`, `president_user`, `executive_user`, `member_user`, `sample_image_data`

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
GCS_BUCKET_NAME=...              # Google Cloud Storage bucket
GCS_PROJECT_ID=...               # GCP project ID
GCS_CREDENTIALS_JSON=...         # Base64-encoded service account JSON (production)
GCS_CREDENTIALS_PATH=...         # Service account key file (local/Docker)
CRON_SECRET=...                  # Shared secret for cron-triggered news refresh
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
- **Services:** Business logic (AI pipeline, scheduling, GCS storage)
- **Agents:** Modular AI pipeline in `services/agents/` (scout → curator pattern)
- **Utils:** Reusable functions
- One blueprint per feature

### Frontend
- **Pages:** Route-level components
- **Components:** Organized by feature (community/, events/, messages/, university/, profile/, speakers/, notifications/, etc.) with shared primitives in ui/ subdirectories (buttons/, cards/, display/, feedback/, forms/, images/, lists/, modals/, popovers/)
- **Hooks:** React Query for data, useUI.js for DOM utilities, factories/ for hook generation
- **Contexts:** Auth, Socket, Query, Modals, MessageTarget, Terms
- **API:** One module per backend feature
- **Constants:** Shared constants (e.g., speaker tags) synced between frontend and backend

### Caching Strategy
- Aggressive for static data (Universities: 10min, News: 5min)
- Short for user content (Notes: 2min)
- Real-time via WebSocket for Messages
- Optimistic updates for all mutations
- Infinite scroll pagination

### Image Handling
- Profile pictures: max 800x800px, quality 85, stored in GCS (`profile_picture_gcs_path`)
- Banners: 5:1 aspect ratio, center-crop to 1500x300px, stored in GCS (`banner_image_gcs_path`)
- University logos/banners and speaker images also GCS-backed
- Legacy blob columns retained for migration compatibility
- GCS paths prefixed with `dev/` in DEV_MODE for isolation

### File Attachments
- Uploaded via GCS signed URLs (browser → GCS directly, no server relay)
- Max 5 attachments per note, max 10MB per file
- 47 allowed MIME types (images, documents, spreadsheets, presentations, text/code, archives)
- Defined in `backend/constants.py` (`ALLOWED_ATTACHMENT_TYPES`)

### Resume Uploads
- One resume per user, uploaded via GCS signed URLs
- Max 5MB, PDF and Word documents only
- Defined in `backend/constants.py` (`ALLOWED_RESUME_TYPES`, `MAX_RESUME_SIZE_BYTES`)
