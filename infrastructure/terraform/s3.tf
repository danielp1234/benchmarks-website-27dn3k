# AWS S3 Bucket Configuration for SaaS Benchmarks Platform
# Provider version: hashicorp/aws ~> 5.0

# Export Files Bucket
resource "aws_s3_bucket" "exports" {
  bucket        = "${local.resource_prefix}-exports"
  force_destroy = true

  tags = merge(local.project_tags, {
    Name    = "${local.resource_prefix}-exports"
    Purpose = "Export Storage"
  })
}

resource "aws_s3_bucket_lifecycle_configuration" "exports" {
  bucket = aws_s3_bucket.exports.id

  rule {
    id     = "cleanup"
    status = "Enabled"

    expiration {
      days = 7
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

# Database Backup Bucket
resource "aws_s3_bucket" "backups" {
  bucket        = "${local.resource_prefix}-backups"
  force_destroy = false # Prevent accidental deletion of backup data

  versioning {
    enabled = true # Enable versioning for backup files
  }

  tags = merge(local.project_tags, {
    Name    = "${local.resource_prefix}-backups"
    Purpose = "Backup Storage"
  })
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "retention"
    status = "Enabled"

    expiration {
      days = 30 # 30-day retention for current versions
    }

    noncurrent_version_expiration {
      days = 7 # Cleanup old versions after 7 days
    }
  }
}

# Static Assets Bucket
resource "aws_s3_bucket" "assets" {
  bucket        = "${local.resource_prefix}-assets"
  force_destroy = true

  tags = merge(local.project_tags, {
    Name    = "${local.resource_prefix}-assets"
    Purpose = "Static Assets"
  })
}

# Block Public Access for all buckets
resource "aws_s3_bucket_public_access_block" "exports" {
  bucket = aws_s3_bucket.exports.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket = aws_s3_bucket.backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable Server-Side Encryption for all buckets
resource "aws_s3_bucket_server_side_encryption_configuration" "exports" {
  bucket = aws_s3_bucket.exports.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# CloudFront OAI policy for assets bucket
resource "aws_s3_bucket_policy" "assets" {
  bucket = aws_s3_bucket.assets.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "CloudFrontAccess"
        Effect    = "Allow"
        Principal = {
          AWS = cloudfront_origin_access_identity.main.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.assets.arn}/*"
      }
    ]
  })
}

# Output the bucket names for reference in other modules
output "export_bucket_name" {
  description = "Name of the exports S3 bucket"
  value       = aws_s3_bucket.exports.id
}

output "backup_bucket_name" {
  description = "Name of the backups S3 bucket"
  value       = aws_s3_bucket.backups.id
}

output "assets_bucket_name" {
  description = "Name of the static assets S3 bucket"
  value       = aws_s3_bucket.assets.id
}