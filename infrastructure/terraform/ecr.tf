# AWS ECR Repositories for SaaS Benchmarks Platform
# Provider version: aws ~> 5.0

# Backend Service ECR Repository
resource "aws_ecr_repository" "backend" {
  name                 = "${local.resource_prefix}-backend"
  image_tag_mutability = "MUTABLE"

  # Enable vulnerability scanning on image push
  image_scanning_configuration {
    scan_on_push = true
  }

  # Enable KMS encryption for container images
  encryption_configuration {
    encryption_type = "KMS"
  }

  tags = merge(local.project_tags, {
    Service = "backend"
  })
}

# Web Frontend Service ECR Repository
resource "aws_ecr_repository" "web" {
  name                 = "${local.resource_prefix}-web"
  image_tag_mutability = "MUTABLE"

  # Enable vulnerability scanning on image push
  image_scanning_configuration {
    scan_on_push = true
  }

  # Enable KMS encryption for container images
  encryption_configuration {
    encryption_type = "KMS"
  }

  tags = merge(local.project_tags, {
    Service = "frontend"
  })
}

# Lifecycle Policy for Backend Repository
resource "aws_ecr_lifecycle_policy" "backend_lifecycle" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 30 production images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["prod"]
          countType     = "imageCountMoreThan"
          countNumber   = 30
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep last 10 staging images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["staging"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 3
        description  = "Remove untagged images after 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# Lifecycle Policy for Web Frontend Repository
resource "aws_ecr_lifecycle_policy" "web_lifecycle" {
  repository = aws_ecr_repository.web.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 30 production images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["prod"]
          countType     = "imageCountMoreThan"
          countNumber   = 30
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep last 10 staging images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["staging"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 3
        description  = "Remove untagged images after 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# Output the repository URLs for use in deployment configurations
output "backend_repository_url" {
  description = "URL of the backend service ECR repository for use in deployment configurations"
  value       = aws_ecr_repository.backend.repository_url
}

output "web_repository_url" {
  description = "URL of the web frontend service ECR repository for use in deployment configurations"
  value       = aws_ecr_repository.web.repository_url
}