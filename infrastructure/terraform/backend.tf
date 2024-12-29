# Backend configuration for Terraform state management
# Uses AWS S3 for state storage and DynamoDB for state locking
# Version: Terraform >= 1.5.0
# Last Updated: 2023

terraform {
  # Configure S3 as the backend for storing Terraform state
  backend "s3" {
    # S3 bucket for state storage - dynamically set based on project name
    bucket = "${var.project}-terraform-state"
    
    # State file path within bucket - environment-specific
    key = "${var.environment}/terraform.tfstate"
    
    # AWS region for state storage
    region = "us-west-2"
    
    # Enable state file encryption at rest
    encrypt = true
    
    # DynamoDB table for state locking
    dynamodb_table = "${var.project}-terraform-locks"
    
    # Workspace management configuration
    workspace_key_prefix = "workspaces"
  }
  
  # Specify required provider versions
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  # Specify minimum Terraform version
  required_version = ">= 1.5.0"
}