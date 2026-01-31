# GCS File Storage Setup Guide

This guide walks you through setting up Google Cloud Storage for file attachments on AIxU notes.

## Prerequisites

### 1. Install Google Cloud SDK (gcloud CLI)

**macOS (recommended):**
```bash
# Using Homebrew
brew install --cask google-cloud-sdk

# After installation, restart your terminal or run:
source "$(brew --prefix)/share/google-cloud-sdk/path.zsh.inc"
```

**Alternative (manual install):**
```bash
# Download and run the installer
curl https://sdk.cloud.google.com | bash
exec -l $SHELL  # Restart shell
```

**Verify installation:**
```bash
gcloud --version
```

### 2. Install Terraform

**macOS:**
```bash
brew tap hashicorp/tap
brew install hashicorp/tap/terraform

# Verify
terraform --version
```

**Other platforms:** See https://developer.hashicorp.com/terraform/install

---

## GCP Project Setup

### 1. Create a GCP Project (if you don't have one)

```bash
# Login to Google Cloud
gcloud auth login

# Create new project (replace with your project name)
gcloud projects create aixu-prod --name="AIxU Production"

# Set as default project
gcloud config set project aixu-prod
```

### 2. Enable Billing

You must enable billing on your GCP project. Visit:
https://console.cloud.google.com/billing

Link your project to a billing account.

### 3. Enable Required APIs

```bash
gcloud services enable storage.googleapis.com
gcloud services enable iam.googleapis.com
```

### 4. Authenticate Terraform

```bash
# Create application default credentials for Terraform
gcloud auth application-default login
```

---

## Deploy Infrastructure

### 1. Initialize Terraform

```bash
cd Webapp
terraform init
```

### 2. Review the Plan

```bash
# See what will be created
terraform plan -var="project_id=YOUR_PROJECT_ID"
```

### 3. Apply the Configuration

```bash
terraform apply -var="project_id=YOUR_PROJECT_ID"
```

Type `yes` when prompted.

### 4. Verify Resources

After successful apply, you should see:
- Storage bucket created
- Service account created
- IAM permissions configured
- Service account key saved to `flask-sa-key.json`

---

## Configure Your Application

### 1. Update .env File

Add these environment variables to your `.env` file:

```env
# GCS Configuration
GCS_BUCKET_NAME=aixu-media-YOUR_PROJECT_ID
GCS_CREDENTIALS_PATH=./flask-sa-key.json
```

### 2. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run Database Migration

```bash
flask db upgrade
```

---

## Security Notes

1. **Never commit `flask-sa-key.json` to git** - It's already in `.gitignore`

2. **CORS Origins** - The Terraform config allows:
   - `https://aixu.tech` (production)
   - `http://localhost:5173` (development)
   
   Update `main.tf` if your domains change.

3. **File Upload Limits** - Configured limits:
   - Max file size: 10 MB
   - Max files per note: 5
   - Allowed types: images, PDFs, documents, code files

4. **Lifecycle Policy** - Incomplete multipart uploads are automatically deleted after 7 days

---

## Troubleshooting

### "Permission denied" errors

```bash
# Ensure you're authenticated
gcloud auth login
gcloud auth application-default login

# Verify project is set
gcloud config get-value project
```

### Terraform state issues

```bash
# If you need to refresh state
terraform refresh -var="project_id=YOUR_PROJECT_ID"
```

### CORS errors in browser

Check that:
1. Your origin matches exactly (including protocol and port)
2. The bucket CORS config was applied: `gsutil cors get gs://YOUR_BUCKET_NAME`

---

## Production Deployment

For production on Cloud Run/GKE, consider:

1. **Workload Identity** instead of service account keys:
   ```bash
   # No key file needed - uses GCP's built-in identity
   ```

2. **Separate buckets** for dev/staging/prod if needed

3. **CDN** - Enable Cloud CDN for faster file delivery:
   ```bash
   # Add to Terraform for production
   ```
