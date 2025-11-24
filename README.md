# AIxU Platform - Backend Documentation

A Flask-based social platform connecting AI/ML students and researchers across universities. This platform enables students to share research notes, join university-specific AI clubs, and collaborate on projects.

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- PostgreSQL (or SQLite for development)
- Node.js (for CSS compilation)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd aixu-platform
   ```

2. **Set up Python environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Environment variables**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=postgresql://username:password@localhost/aixu_db
   SECRET_KEY=your-secret-key-here
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```

4. **Database setup**
   ```bash
   # The app will automatically create tables on first run
   python app.py
   ```

5. **CSS compilation**
   ```bash
   # Install dependencies
   npm install
   
   # Build CSS (production)
   npm run build:css:prod
   
   # Or use the bash script
   chmod +x build_css.sh
   ./build_css.sh
   ```

## 📁 Project Structure

```
aixu-platform/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── package.json          # Node.js dependencies for CSS
├── build_css.sh          # CSS compilation script
├── .env                  # Environment variables (create this)
├── templates/            # HTML templates
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── profile.html
│   ├── universities.html
│   ├── university_detail.html
│   ├── community.html
│   └── messages.html
└── static/              # CSS, JS, images
    ├── css/
    ├── js/
    └── images/
```

## 🏗️ Architecture Overview

### Core Technologies

- **Backend**: Flask (Python web framework)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: Flask-Login
- **Email**: SMTP integration
- **Frontend**: HTML/CSS/JavaScript with Tailwind CSS
- **Session Management**: Flask sessions

### Key Features

1. **User Management**: Registration, login, profiles
2. **University System**: Create/join university AI clubs
3. **Community**: Share research notes and collaborate
4. **Messaging**: Direct messaging between users
5. **Admin System**: Multi-level permissions

## 🗄️ Database Schema

### Users Table
```sql
- id (Primary Key)
- username (Unique)
- email (Unique)
- password_hash
- permission_level (0=User, 1=Admin, 2=Super Admin)
- first_name, last_name
- university
- join_date
- post_count, follower_count, following_count
- about_section, avatar_url, location
- skills (JSON), interests (JSON)
- liked_universities, liked_notes, bookmarked_notes (JSON)
```

### Universities Table
```sql
- id (Primary Key)
- name, clubName, location
- member_count, recent_posts, upcoming_events
- description, tags (JSON)
- members (JSON array of user IDs)
- admin_id (Foreign Key to Users)
```

### Supporting Tables
- `user_follows`: User following relationships
- `user_liked_universities`: University likes tracking

## 🔐 Authentication System

### Permission Levels
```python
USER = 0         # Regular user
ADMIN = 1        # Admin user
SUPER_ADMIN = 2  # Super admin
```

### Login System
- Supports login via username or email
- Password hashing with Werkzeug
- Session-based authentication with Flask-Login
- Automatic redirect for protected routes

### User Registration
- Extended registration with optional profile fields
- Automatic login after successful registration
- Email uniqueness validation

## 🏫 University System

### University Management
- **Creation**: Any logged-in user can create a university
- **Membership**: Domain-based joining (email domain must match admin's)
- **Administration**: University creator becomes admin
- **Member Management**: Admins can remove members

### Key Features
- Unique university names (case-insensitive)
- JSON-based member storage
- Automatic member count tracking
- Admin controls (edit, delete, member management)

### API Endpoints
```
GET  /universities                    # List all universities
GET  /universities/<id>               # University detail page
POST /universities/new                # Create university
GET  /universities/<id>/edit          # Edit university (admin only)
POST /universities/<id>/join          # Join university
POST /universities/<id>/remove_member/<user_id>  # Remove member (admin)
POST /universities/<id>/delete        # Delete university (admin)
```

## 👤 User Profiles

### Profile Features
- Basic info (name, email, university)
- Extended fields (bio, location, avatar)
- Skills and interests (JSON arrays)
- Activity statistics (posts, followers, following)
- Public/private profile views

### Profile Management
```python
# Update profile
POST /update_profile

# View profiles
GET /profile        # Own profile
GET /users/<id>     # Public profile
```

## 📧 Email System

### SMTP Configuration
The platform uses SMTP for sending emails (university registration requests, feedback).

```python
def send_email(subject: str, body: str, from_email: str) -> bool:
    # Configured via environment variables
    # Sends to: tami5981@colorado.edu
```

### Email Features
- University registration requests
- General feedback system
- Error handling and logging

## 🔌 API Endpoints

### Authentication APIs
```
POST /entry          # Check if email exists
GET  /login          # Login page
POST /login          # Process login
GET  /register       # Registration page
POST /register       # Process registration
GET  /logout         # Logout user
```

### User APIs
```
GET /api/user/profile           # Current user profile
GET /api/user/stats            # User statistics
GET /api/users/<id>            # Public user profile
```

### University APIs
```
GET /api/universities                    # List universities
GET /api/universities/<id>               # University details
POST /api/universities/<id>/like         # Like/unlike university
```

### Community APIs
```
GET /api/notes                          # Research notes
POST /api/notes/<id>/like               # Like note
POST /api/notes/<id>/bookmark           # Bookmark note
```

## 🎨 Frontend Integration

### Template System
- Jinja2 templating
- Shared base templates
- Dynamic data binding
- Flash message system

### CSS Framework
- Tailwind CSS utility classes
- Custom CSS compilation
- Responsive design
- Dark/light theme support

### JavaScript
- Vanilla JS for interactivity
- AJAX for API calls
- Real-time updates
- Form validation

## 🛠️ Development Workflow

### Running the Application
```bash
# Development mode
python app.py

# The app runs on http://localhost:5000
# Debug mode is enabled by default
```

### Database Management
```bash
# Create tables (automatic on first run)
python -c "from app import app, db; app.app_context().push(); db.create_all()"

# Manual user permission update (in database)
UPDATE user SET permission_level = '2' WHERE id = 1;
```

### CSS Development
```bash
# Development build (with source maps)
npm run build:css:dev

# Production build (minified)
npm run build:css:prod

# Watch mode for development
npm run watch:css
```

## 🔧 Configuration

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost/dbname

# Flask
SECRET_KEY=your-secret-key-here
FLASK_ENV=development

# Email (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Use app password, not regular password
```

### Flask Configuration
```python
app.config['SECRET_KEY'] = 'your-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
```

## 🧪 Testing & Debugging

### Debug Mode Features
- Automatic reloading on code changes
- Detailed error pages
- Interactive debugger
- SQL query logging (can be enabled)

### Common Debugging Commands
```python
# In Python shell with app context
from app import app, db, User, University
with app.app_context():
    users = User.query.all()
    print(f"Total users: {len(users)}")
```

### Logging
```python
# Email sending errors are logged
app.logger.exception('Failed to send email: %s', e)

# Add custom logging
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 🚀 Deployment

### Production Considerations
1. **Environment Variables**: Set all required env vars
2. **Database**: Use PostgreSQL in production
3. **WSGI Server**: Use Gunicorn or similar
4. **Static Files**: Configure proper serving
5. **HTTPS**: Enable SSL certificates
6. **Database Migrations**: Implement proper migration system

### Example Production Setup
```bash
# Install production server
pip install gunicorn

# Run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

## 🔍 Common Issues & Solutions

### Database Issues
```bash
# Reset database (development only)
rm -rf instance/
python app.py  # Will recreate tables
```

### CSS Not Loading
```bash
# Rebuild CSS
npm run build:css:prod
# Check static file serving in Flask
```

### Email Not Sending
- Check SMTP credentials
- Use app passwords for Gmail
- Verify firewall/network settings
- Check logs for specific errors

### Permission Issues
```sql
-- Grant admin permissions to user
UPDATE user SET permission_level = '1' WHERE email = 'user@example.com';
```

## 📝 Sample Data

The application includes sample data for development:
- Sample research notes with mock authors
- Sample universities with member counts
- Sample messages for testing

### Mock Data Structure
```python
# Sample notes with authors, tags, likes
sample_notes = [...]

# Sample messages between users
sample_messages = [...]
```

## 🔐 Security Features

### Password Security
- Werkzeug password hashing
- No plaintext password storage
- Secure session management

### Input Validation
- Form data sanitization
- SQL injection prevention (SQLAlchemy ORM)
- XSS protection (Jinja2 auto-escaping)

### Access Control
- Route-level authentication (@login_required)
- Permission-based authorization
- University admin controls

## 📚 Additional Resources

### Documentation
- [Flask Documentation](https://flask.palletsprojects.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Flask-Login Documentation](https://flask-login.readthedocs.io/)
