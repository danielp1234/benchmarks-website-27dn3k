# Configure Terraform version and required providers
terraform {
  # Terraform version constraint as per technical specifications section 4.5.2
  required_version = ">= 1.5.0"

  required_providers {
    # AWS provider for infrastructure management
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }

    # Random provider for generating unique identifiers
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

# Configure AWS Provider with region and default tags
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment  = var.environment
      Project      = var.project
      ManagedBy   = "terraform"
      CreatedBy   = "terraform"
      LastModified = timestamp()
      Purpose     = "saas-benchmarks-platform"
    }
  }
}

# Configure Random Provider for resource naming
provider "random" {
  # No specific configuration needed for random provider
}