# AIxU

A Flask + React platform connecting AI students and researchers across universities. Users can network, share notes, participate in university AI clubs, message each other, and stay updated on AI news.

## Tech Stack

- **Backend:** Flask + SQLAlchemy + PostgreSQL + Flask-SocketIO
- **Frontend:** React 19 + Vite + React Router + TanStack Query + Tailwind CSS
- **Real-time:** Socket.IO for live messaging and notifications
- **AI Integration:** Claude API for news aggregation and chat

## Prerequisites

- Python 3.11+ (see `.python-version`)
- Node.js 18+
- Docker

## Quick Start

### 1. Clone and install dependencies

```bash
# Backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd frontend && npm install
```

### 2. Configure environment

Create `.env` in the project root:

```env
DATABASE_URL=postgresql://user:pass@localhost/aixu_db
SECRET_KEY=your-secret-key
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
SMTP_USER=no-reply@aixu.tech
SMTP_PASS=your-email-password
ANTHROPIC_API_KEY=your-anthropic-key
DEV_MODE=true  # Accepts any 6-digit code for email verification
```

### 3. Run development servers

```bash
# Terminal 1: Flask backend (port 5000)
python app.py

# Terminal 2: React frontend (port 5173)
cd frontend && npm run dev
```

Visit `http://localhost:5173` - Vite proxies `/api/*` to Flask automatically.

## Docker

```bash
docker compose up --build    # Build and start all services
docker compose down -v       # Stop and remove volumes (resets database)
```

This starts PostgreSQL, seeds the database, and runs the Flask app on port 5000.

## Testing

```bash
pip install -r requirements-test.txt
pytest
```

Tests run automatically on push/PR via GitHub Actions.

## Key Concepts

**University Auto-Enrollment:** Users are automatically enrolled based on their `.edu` email domain during registration.

**University Request Flow:** Users with unrecognized `.edu` domains can request to add their university. After admin approval, they receive a secure link to complete registration.

**Permission System:**
- Site-level: `USER (0)` and `ADMIN (1)`
- University-level: `MEMBER (0)`, `EXECUTIVE (1)`, `PRESIDENT (2)`

## Documentation

See `CLAUDE.md` for comprehensive architecture details, API reference, database schema, and development workflows.
