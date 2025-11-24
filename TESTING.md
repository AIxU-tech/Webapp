# AIxU Website Testing Guide

## Quick Start

### Install Test Dependencies

```bash
pip install -r requirements-test.txt
```

### Run All Tests

```bash
pytest
```

### Run with Coverage

```bash
pytest --cov=. --cov-report=html
open htmlcov/index.html
```

## Test Suite Overview

The test suite contains **200+ tests** covering all aspects of the AIxU website:

| Category | File | Test Count | Coverage |
|----------|------|------------|----------|
| Authentication | `test_auth.py` | ~30 tests | Registration, Login, Verification |
| User Profiles | `test_profile.py` | ~25 tests | Profile CRUD, Pictures, Stats |
| Community/Notes | `test_community.py` | ~25 tests | Notes CRUD, Likes, Bookmarks |
| Universities | `test_universities.py` | ~30 tests | Uni Management, Membership |
| Messaging | `test_messaging.py` | ~25 tests | Send/Receive, Conversations |
| API & General | `test_api.py` | ~35 tests | Endpoints, Security, Validation |

## Test Categories

### 1. Authentication Tests (`test_auth.py`)

**What's Tested:**
- ✅ User registration with email verification
- ✅ Login with username or email
- ✅ Password hashing and security
- ✅ Session management
- ✅ Authorization protection on routes
- ✅ Verification code expiration
- ✅ Duplicate username/email prevention

**Example:**
```bash
pytest tests/test_auth.py -v
```

### 2. Profile Tests (`test_profile.py`)

**What's Tested:**
- ✅ Profile viewing (own and public)
- ✅ Profile updates (name, bio, location)
- ✅ Skills and interests management
- ✅ University affiliation
- ✅ Profile picture upload/compression/deletion
- ✅ Account deletion with cascade
- ✅ User statistics tracking

**Example:**
```bash
pytest tests/test_profile.py::TestProfilePicture -v
```

### 3. Community Tests (`test_community.py`)

**What's Tested:**
- ✅ Community page rendering
- ✅ Note creation with tags
- ✅ Note deletion (authorization checks)
- ✅ Like/unlike notes
- ✅ Bookmark notes
- ✅ Post count tracking
- ✅ Time ago calculations

**Example:**
```bash
pytest tests/test_community.py -m community
```

### 4. University Tests (`test_universities.py`)

**What's Tested:**
- ✅ University listing page
- ✅ University creation (admin only)
- ✅ University detail pages
- ✅ Domain-based membership joining
- ✅ Member management
- ✅ University editing/deletion
- ✅ Like universities
- ✅ Permission level checks

**Example:**
```bash
pytest tests/test_universities.py::TestUniversityJoin -v
```

### 5. Messaging Tests (`test_messaging.py`)

**What's Tested:**
- ✅ Messages page rendering
- ✅ Sending messages
- ✅ Viewing conversations
- ✅ Message read status
- ✅ User search for messaging
- ✅ Conversation grouping
- ✅ Unread message indicators

**Example:**
```bash
pytest tests/test_messaging.py -v
```

### 6. API & General Tests (`test_api.py`)

**What's Tested:**
- ✅ Static pages (index, feedback, etc.)
- ✅ Feedback submission
- ✅ API endpoints
- ✅ Error handling (404, 405, etc.)
- ✅ Session management
- ✅ Database constraints
- ✅ Permission levels
- ✅ SQL injection protection
- ✅ XSS protection
- ✅ Data validation

**Example:**
```bash
pytest tests/test_api.py -m api
```

## Running Tests by Category

### By Marker
```bash
# Authentication tests
pytest -m auth

# Profile tests
pytest -m profile

# Community tests
pytest -m community

# University tests
pytest -m university

# Messaging tests
pytest -m messaging

# API tests
pytest -m api

# Integration tests
pytest -m integration
```

### By Feature
```bash
# All login-related tests
pytest -k "login"

# All profile picture tests
pytest -k "picture"

# All university joining tests
pytest -k "join"
```

### By Test Class
```bash
pytest tests/test_auth.py::TestLogin
pytest tests/test_profile.py::TestProfilePicture
pytest tests/test_universities.py::TestUniversityCreation
```

## Coverage Reports

### Generate HTML Coverage Report
```bash
pytest --cov=. --cov-report=html
open htmlcov/index.html
```

### Generate Terminal Report
```bash
pytest --cov=. --cov-report=term-missing
```

### Coverage Targets
- **Overall:** Aim for >80% coverage
- **Critical paths:** >95% coverage (auth, data validation)
- **Helper functions:** >70% coverage

## GitHub Actions Integration

Tests automatically run on:
- ✅ Push to `main` or `develop` branches
- ✅ Pull requests to `main` or `develop`
- ✅ Manual workflow dispatch

**Workflow file:** `.github/workflows/test.yml`

### Matrix Testing
Tests run on multiple configurations:
- Python 3.9, 3.10, 3.11
- Ubuntu Latest
- Parallel execution

### Viewing Results
1. Go to your GitHub repository
2. Click "Actions" tab
3. Select the latest workflow run
4. View test results and coverage

## Test Fixtures

Common fixtures available (from `conftest.py`):

### Application Fixtures
- `app` - Flask application instance
- `client` - Test client for making requests
- `runner` - CLI test runner
- `init_database` - Clean database for each test

### User Fixtures
- `test_user` - Regular test user
- `test_user2` - Second test user
- `admin_user` - Admin user with elevated permissions
- `authenticated_client` - Client logged in as test_user
- `admin_authenticated_client` - Client logged in as admin

### Data Fixtures
- `test_university` - Test university
- `test_note` - Test note/post
- `test_message` - Test message
- `sample_image` - Sample image for uploads

## Writing New Tests

### Test Template
```python
import pytest
from app import YourModel, db

@pytest.mark.your_category
class TestYourFeature:
    """Test your feature description"""

    def test_your_case(self, authenticated_client, test_user, app):
        """Test that your feature works correctly"""
        # Arrange
        data = {'field': 'value'}

        # Act
        response = authenticated_client.post('/your/endpoint', json=data)

        # Assert
        assert response.status_code == 200

        # Verify in database
        with app.app_context():
            result = YourModel.query.first()
            assert result is not None
```

### Best Practices

1. **Test Independence** - Each test should work in isolation
2. **Descriptive Names** - Use clear, descriptive test names
3. **AAA Pattern** - Arrange, Act, Assert
4. **Mock External Services** - Use pytest-mock for emails, APIs
5. **Test Edge Cases** - Not just happy paths
6. **Use Fixtures** - Reuse common setup code
7. **Add Markers** - Tag tests for organization
8. **Check Database State** - Verify changes persisted

## Troubleshooting

### Issue: Database Lock Errors
```bash
rm -f test.db instance/test.db
pytest
```

### Issue: Import Errors
Ensure you're in the project root:
```bash
cd /path/to/AIxU_website
export PYTHONPATH=.
pytest
```

### Issue: Tests Hang
Use timeout marker:
```python
@pytest.mark.timeout(10)
def test_slow_function():
    ...
```

### Issue: Flaky Tests
Run with random order to find dependencies:
```bash
pytest --randomly-seed=1234
```

### Issue: Coverage Not Updating
Clear coverage data:
```bash
rm -f .coverage
rm -rf htmlcov/
pytest --cov=. --cov-report=html
```

## Performance

### Run Tests in Parallel
```bash
# Install xdist
pip install pytest-xdist

# Run tests on 4 cores
pytest -n 4
```

### Run Only Failed Tests
```bash
# Run tests, save failures
pytest --lf  # Last failed

# Run failures first, then rest
pytest --ff  # Failed first
```

### Skip Slow Tests
```bash
pytest -m "not slow"
```

## Test Data

### Database
- Tests use SQLite in-memory database
- Each test gets a fresh database
- No test data persists between tests

### Email
- Email sending is mocked in tests
- Use `mocker.patch('app.send_email')` to mock

### File Uploads
- Use `sample_image` fixture for image tests
- Creates temporary in-memory images
- No actual files created

## Continuous Integration

### GitHub Actions Workflow

The workflow:
1. ✅ Checks out code
2. ✅ Sets up Python (3.9, 3.10, 3.11)
3. ✅ Installs dependencies
4. ✅ Creates test .env file
5. ✅ Runs linting (optional)
6. ✅ Runs all tests with coverage
7. ✅ Uploads coverage to Codecov
8. ✅ Generates test summary

### Manual Trigger
1. Go to Actions tab
2. Select "Run Tests" workflow
3. Click "Run workflow"
4. Select branch
5. Click "Run workflow"

## Code Quality

### Linting
```bash
flake8 . --exclude=venv,node_modules
```

### Type Checking (Optional)
```bash
pip install mypy
mypy app.py
```

### Security Scanning (Optional)
```bash
pip install bandit
bandit -r . -x ./venv,./tests
```

## Next Steps

### After Testing
1. Review coverage report
2. Add tests for uncovered code
3. Fix any failing tests
4. Update documentation
5. Commit and push changes

### Recommended Reading
- [Pytest Documentation](https://docs.pytest.org/)
- [Flask Testing Documentation](https://flask.palletsprojects.com/en/latest/testing/)
- [Testing Best Practices](https://testdriven.io/blog/testing-best-practices/)

## Support

For issues or questions:
1. Check this documentation
2. Review test examples in test files
3. Check GitHub Actions logs
4. Open an issue on GitHub
