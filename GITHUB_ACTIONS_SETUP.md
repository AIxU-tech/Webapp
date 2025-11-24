# GitHub Actions Setup Guide

This guide will walk you through setting up automated testing for your AIxU website using GitHub Actions.

## Prerequisites

- ✅ GitHub repository created
- ✅ Test suite files in place (already done!)
- ✅ Git installed on your computer

## Step-by-Step Setup

### Step 1: Verify Files Are in Place

Make sure these files exist in your project:

```bash
# Check if files exist
ls .github/workflows/test.yml        # GitHub Actions workflow
ls tests/                             # Test directory
ls pytest.ini                         # Pytest config
ls requirements-test.txt              # Test dependencies
```

All these files are already created! ✅

### Step 2: Push to GitHub

If you haven't already, initialize git and push to GitHub:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Add comprehensive test suite with GitHub Actions"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/AIxU_website.git

# Push to GitHub
git push -u origin main
```

**That's it!** The workflow will automatically run when you push.

### Step 3: Verify Workflow is Running

1. Go to your GitHub repository
2. Click the **"Actions"** tab at the top
3. You should see the "Run Tests" workflow running

![GitHub Actions Tab](https://docs.github.com/assets/cb-32937/images/help/repository/actions-tab.png)

### Step 4: View Test Results

1. Click on the workflow run (it will have your commit message)
2. Click on the "test" job
3. Expand the "Run tests with pytest" step to see results

You'll see output like:
```
tests/test_auth.py::TestRegistration::test_register_page_loads PASSED
tests/test_auth.py::TestRegistration::test_successful_registration_flow PASSED
tests/test_profile.py::TestProfileView::test_profile_page_loads PASSED
...
========== 170 passed in 45.2s ==========
```

### Step 5: View Coverage Report

1. Scroll down to "Artifacts" section at the bottom of the workflow run
2. Download "test-results-3.11-ubuntu-latest" (or any version)
3. Extract the zip file
4. Open `htmlcov/index.html` in your browser

## Workflow Configuration

The workflow (`.github/workflows/test.yml`) is configured to:

### When to Run
- ✅ On push to `main` or `develop` branches
- ✅ On pull requests to `main` or `develop`
- ✅ Manual trigger via workflow dispatch

### What It Does
1. ✅ Sets up Python (3.9, 3.10, 3.11)
2. ✅ Installs all dependencies
3. ✅ Creates test environment variables
4. ✅ Runs linting (optional, won't fail build)
5. ✅ Runs all 170+ tests
6. ✅ Generates coverage reports
7. ✅ Uploads coverage to Codecov (optional)
8. ✅ Creates test artifacts

## Manual Trigger

To manually run tests without pushing:

1. Go to **Actions** tab
2. Select **"Run Tests"** workflow on the left
3. Click **"Run workflow"** button (top right)
4. Select branch
5. Click **"Run workflow"**

![Manual Trigger](https://docs.github.com/assets/cb-78035/images/help/actions/workflow-dispatch.png)

## Customizing the Workflow

### Change Python Versions

Edit `.github/workflows/test.yml`:

```yaml
strategy:
  matrix:
    python-version: ['3.9', '3.10', '3.11', '3.12']  # Add 3.12
```

### Change When Tests Run

Edit the `on:` section:

```yaml
on:
  push:
    branches: [ main, develop, staging ]  # Add more branches
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 0 * * 0'  # Run weekly on Sunday at midnight
```

### Add More Operating Systems

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, macos-latest, windows-latest]
    python-version: ['3.11']
```

## Adding Status Badge

Add a badge to your README.md:

```markdown
![Tests](https://github.com/YOUR_USERNAME/AIxU_website/workflows/Run%20Tests/badge.svg)
```

Replace `YOUR_USERNAME` with your GitHub username.

## Codecov Integration (Optional)

### Step 1: Sign up for Codecov

1. Go to [codecov.io](https://codecov.io)
2. Sign up with your GitHub account
3. Add your repository

### Step 2: Get Codecov Token

1. Go to your repository settings on Codecov
2. Copy the "Repository Upload Token"

### Step 3: Add Token to GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** > **Secrets and variables** > **Actions**
3. Click **"New repository secret"**
4. Name: `CODECOV_TOKEN`
5. Value: Paste your Codecov token
6. Click **"Add secret"**

### Step 4: Update Workflow (Already Done!)

The workflow already includes Codecov upload:

```yaml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage.xml
    flags: unittests
    name: codecov-umbrella
    fail_ci_if_error: false
```

### Step 5: Add Coverage Badge

```markdown
[![codecov](https://codecov.io/gh/YOUR_USERNAME/AIxU_website/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/AIxU_website)
```

## Environment Variables

The workflow automatically creates a `.env` file for testing:

```bash
DATABASE_URL=sqlite:///test.db
SECRET_KEY=test-secret-key-for-ci
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=test@example.com
SMTP_PASS=testpassword
```

### Adding Secrets

If you need real API keys for testing:

1. Go to **Settings** > **Secrets and variables** > **Actions**
2. Click **"New repository secret"**
3. Add your secrets (e.g., `SMTP_PASSWORD`, `API_KEY`)
4. Update `.github/workflows/test.yml`:

```yaml
- name: Create .env file for testing
  run: |
    touch .env
    echo "SECRET_KEY=${{ secrets.SECRET_KEY }}" >> .env
    echo "API_KEY=${{ secrets.API_KEY }}" >> .env
```

## Troubleshooting

### Workflow Not Running

**Problem:** Workflow doesn't appear in Actions tab

**Solutions:**
1. Make sure `.github/workflows/test.yml` exists
2. Check YAML syntax (use [YAML Lint](https://www.yamllint.com/))
3. Make sure you pushed the workflow file to the correct branch
4. Check repository settings → Actions → Allow all actions

### Tests Failing in CI but Pass Locally

**Common causes:**

1. **Missing dependencies**
   - Check `requirements-test.txt` includes all needed packages
   - Make sure workflow installs both `requirements.txt` and `requirements-test.txt`

2. **Environment variables**
   - Check `.env` file is created in workflow
   - Add any missing variables

3. **Database issues**
   - Tests use SQLite, should work everywhere
   - Check file permissions if issues

4. **Python version differences**
   - Test locally with same Python version as CI
   - Use `python --version` to check

### Permissions Errors

**Problem:** Workflow can't create files or run commands

**Solution:** Update workflow file permissions:

```yaml
permissions:
  contents: read
  checks: write
  pull-requests: write
```

### Workflow Times Out

**Problem:** Tests take too long

**Solutions:**

1. **Increase timeout:**
```yaml
jobs:
  test:
    timeout-minutes: 30  # Default is 360 (6 hours)
```

2. **Run tests in parallel:**
```bash
pip install pytest-xdist
pytest -n auto  # Use all CPU cores
```

Update workflow:
```yaml
- name: Run tests with pytest
  run: |
    pytest -n auto -v --tb=short --cov=. --cov-report=xml
```

### Artifacts Not Uploading

**Problem:** Can't download test results

**Solution:** Check artifact upload step in workflow:

```yaml
- name: Archive test results
  if: always()  # Run even if tests fail
  uses: actions/upload-artifact@v3
  with:
    name: test-results-${{ matrix.python-version }}
    path: |
      htmlcov/
      coverage.xml
      .coverage
    retention-days: 30  # Keep for 30 days
```

## Viewing Results

### Test Summary

GitHub Actions automatically creates a summary. You'll see:
- ✅ Number of tests passed/failed
- ⚠️ Any warnings
- 📊 Coverage percentage
- 🕐 Test duration

### Detailed Logs

Click on any failed test to see:
- Full error traceback
- Test output
- Assertion details
- Context information

### Coverage Report

1. Download artifacts
2. Extract `test-results-*.zip`
3. Open `htmlcov/index.html`
4. See line-by-line coverage

## Best Practices

### 1. Run Tests Before Pushing

```bash
# Always run locally first
pytest

# If passing, commit and push
git add .
git commit -m "Add new feature"
git push
```

### 2. Use Branch Protection

Require tests to pass before merging:

1. Go to **Settings** > **Branches**
2. Add rule for `main` branch
3. Enable "Require status checks to pass"
4. Select "test" workflow
5. Enable "Require branches to be up to date"

### 3. Review Coverage Reports

- Aim for >80% overall coverage
- Critical paths should have >95% coverage
- Review uncovered lines regularly

### 4. Keep Tests Fast

- Use fixtures to avoid repeated setup
- Mock external services
- Run only relevant tests during development
- Use `pytest -k "keyword"` to run subset

### 5. Monitor Test Trends

- Watch for flaky tests (random failures)
- Track test duration over time
- Fix failing tests immediately
- Don't skip or ignore failing tests

## Next Steps

### 1. Enable Branch Protection
Ensure all code is tested before merging

### 2. Add Status Badges
Show test status in README

### 3. Set Up Codecov (Optional)
Track coverage over time

### 4. Configure Notifications
Get notified when tests fail:
- Go to **Settings** > **Notifications**
- Configure email/Slack notifications

### 5. Create Pull Request Template
Add checklist to remind contributors:

```markdown
## Checklist
- [ ] Tests pass locally
- [ ] New tests added for new features
- [ ] Coverage maintained or improved
- [ ] Documentation updated
```

## Quick Reference

### Common Commands

```bash
# Run all tests locally
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest tests/test_auth.py

# Run tests by marker
pytest -m auth

# Run in parallel
pytest -n 4

# Stop on first failure
pytest -x

# Rerun last failed
pytest --lf
```

### Workflow Files

```
.github/
└── workflows/
    └── test.yml          # Main test workflow
```

### Important URLs

- **Actions Tab:** `https://github.com/YOUR_USERNAME/AIxU_website/actions`
- **Workflow Runs:** Click on specific workflow run
- **Settings:** `https://github.com/YOUR_USERNAME/AIxU_website/settings`

## Summary

✅ **Setup Complete!** Your GitHub Actions workflow is ready to:

1. Automatically test on every push/PR
2. Run 170+ comprehensive tests
3. Generate coverage reports
4. Upload test artifacts
5. Provide detailed test summaries

**No additional configuration needed** - just push to GitHub!

## Support

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review GitHub Actions logs
3. Test locally with same Python version
4. Check [GitHub Actions documentation](https://docs.github.com/en/actions)
5. Open an issue in the repository

---

**Ready to go!** 🚀 Just push your code and watch the tests run automatically.
