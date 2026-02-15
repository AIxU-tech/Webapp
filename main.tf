# main.tf - GCS Infrastructure for AIxU File Uploads
#
# This configuration creates:
# 1. A GCS bucket for user-uploaded files (note attachments)
# 2. A service account for Flask to generate signed URLs
# 3. IAM permissions for upload/download operations
# 4. Lifecycle policy for cleanup

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  backend "gcs" {
    bucket = "aixu-terraform-state"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# =============================================================================
# 1. Storage Bucket
# =============================================================================

resource "google_storage_bucket" "media_bucket" {
  name          = "aixu-media-${var.project_id}"
  location      = "US"
  storage_class = "STANDARD"

  # Security: Uniform access control (no per-object ACLs)
  uniform_bucket_level_access = true

  # Security: Prevent accidental public access
  public_access_prevention = "enforced"

  # CORS Configuration - Allow browser uploads from both prod and dev
  cors {
    origin = [
      "https://aixu.tech",     # Production
      "http://localhost:5173", # Vite dev server
      "http://localhost:5000", # Flask dev server (if needed)
      "http://localhost:8000",
    ]
    method          = ["GET", "PUT", "POST", "DELETE", "OPTIONS"]
    response_header = ["Content-Type", "Content-Length", "Content-Disposition"]
    max_age_seconds = 3600
  }

  # Lifecycle Rules
  lifecycle_rule {
    # Delete incomplete multipart uploads after 7 days
    condition {
      age                        = 7
      matches_prefix             = []
      with_state                 = "ANY"
      num_newer_versions         = 0
      custom_time_before         = null
      days_since_custom_time     = 0
      days_since_noncurrent_time = 0
      noncurrent_time_before     = null
    }
    action {
      type = "AbortIncompleteMultipartUpload"
    }
  }

  # Versioning disabled for user uploads (saves cost)
  versioning {
    enabled = false
  }
}

# =============================================================================
# 2. Service Account for Flask Backend
# =============================================================================

resource "google_service_account" "flask_storage_sa" {
  account_id   = "flask-storage-manager"
  display_name = "Flask Storage Manager"
  description  = "Service account for Flask backend to manage GCS uploads via signed URLs"
}

# =============================================================================
# 3. IAM Permissions
# =============================================================================

# Permission to create/upload objects
resource "google_storage_bucket_iam_member" "flask_upload_perm" {
  bucket = google_storage_bucket.media_bucket.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.flask_storage_sa.email}"
}

# Permission to read/view objects (for generating signed download URLs)
resource "google_storage_bucket_iam_member" "flask_view_perm" {
  bucket = google_storage_bucket.media_bucket.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.flask_storage_sa.email}"
}

# Permission to delete objects (for cleanup when notes are deleted)
resource "google_storage_bucket_iam_member" "flask_delete_perm" {
  bucket = google_storage_bucket.media_bucket.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.flask_storage_sa.email}"
}

# =============================================================================
# 4. Service Account Key (OPTIONAL - for local development)
# =============================================================================
# NOTE: Many GCP organizations disable service account key creation for security.
# If key creation is blocked, use Application Default Credentials instead:
#   gcloud auth application-default login
#
# Uncomment the resources below if your org allows key creation:

# resource "google_service_account_key" "flask_sa_key" {
#   service_account_id = google_service_account.flask_storage_sa.name
# }

# resource "local_file" "flask_key_file" {
#   content         = base64decode(google_service_account_key.flask_sa_key.private_key)
#   filename        = "${path.module}/flask-sa-key.json"
#   file_permission = "0600"
# }

# =============================================================================
# 5. Outputs
# =============================================================================

output "bucket_name" {
  description = "Name of the created GCS bucket"
  value       = google_storage_bucket.media_bucket.name
}

output "bucket_url" {
  description = "URL of the GCS bucket"
  value       = "gs://${google_storage_bucket.media_bucket.name}"
}

output "service_account_email" {
  description = "Email of the service account"
  value       = google_service_account.flask_storage_sa.email
}

# output "key_file_path" {
#   description = "Path to the service account key file"
#   value       = local_file.flask_key_file.filename
# }
