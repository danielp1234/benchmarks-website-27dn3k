# Core Terraform Configuration
# Provider versions:
# aws: ~> 5.0
# random: ~> 3.0

terraform {
  required_version = ">= 1.5.0"

  # S3 Backend Configuration for Remote State
  backend "s3" {
    bucket               = "${var.project}-terraform-state"
    key                  = "${var.environment}/terraform.tfstate"
    region              = "us-west-2"
    encrypt             = true
    dynamodb_table      = "${var.project}-terraform-locks"
    kms_key_id          = "aws_kms_key.terraform_state.arn"
    versioning          = true
    server_side_encryption = "aws:kms"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# AWS Provider Configuration
provider "aws" {
  default_tags {
    tags = local.project_tags
  }
  allowed_account_ids = [var.aws_account_id]
  assume_role {
    role_arn = var.terraform_role_arn
  }
}

# Data Sources
data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# Local Variables
locals {
  # Common resource prefix for consistent naming
  resource_prefix = "${var.project}-${var.environment}-${data.aws_region.current.name}"

  # Common tags for all AWS resources
  project_tags = {
    Environment         = var.environment
    Project            = var.project
    ManagedBy          = "Terraform"
    CreatedAt          = timestamp()
    Owner              = "SaaS Benchmarks Team"
    CostCenter         = "Infrastructure"
    SecurityCompliance = "High"
    BackupPolicy       = "Required"
    DataClassification = "Confidential"
  }

  # Environment-specific configurations
  is_production = var.environment == "prod"
  
  # High availability settings
  high_availability_config = {
    multi_az             = local.is_production
    min_capacity         = local.is_production ? 2 : 1
    max_capacity         = local.is_production ? 8 : 4
    desired_capacity     = local.is_production ? 2 : 1
    backup_retention     = local.is_production ? 30 : 7
    deletion_protection  = local.is_production
  }

  # Security configurations
  security_config = {
    enable_encryption    = true
    ssl_policy          = "ELBSecurityPolicy-TLS-1-2-2017-01"
    enable_waf          = local.is_production
    enable_shield       = local.is_production
    backup_encryption   = true
  }
}

# Random ID for unique resource naming
resource "random_id" "unique" {
  byte_length = 8
}

# KMS Key for Terraform State Encryption
resource "aws_kms_key" "terraform_state" {
  description             = "KMS key for Terraform state encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(local.project_tags, {
    Name = "${local.resource_prefix}-terraform-state-key"
  })
}

resource "aws_kms_alias" "terraform_state" {
  name          = "alias/${local.resource_prefix}-terraform-state"
  target_key_id = aws_kms_key.terraform_state.key_id
}

# DynamoDB Table for Terraform State Locking
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "${var.project}-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.terraform_state.arn
  }

  tags = merge(local.project_tags, {
    Name = "${local.resource_prefix}-terraform-locks"
  })
}

# S3 Bucket for Terraform State
resource "aws_s3_bucket" "terraform_state" {
  bucket = "${var.project}-terraform-state"

  tags = merge(local.project_tags, {
    Name = "${local.resource_prefix}-terraform-state"
  })
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.terraform_state.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}