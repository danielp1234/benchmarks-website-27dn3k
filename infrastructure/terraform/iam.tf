# IAM Configuration for SaaS Benchmarks Platform
# AWS Provider Version: ~> 5.0

# Data Sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ECS Task Execution Role Trust Policy
data "aws_iam_policy_document" "ecs_trust_policy" {
  statement {
    effect = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
    # Enhanced security with condition checks
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = ["arn:aws:ecs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*"]
    }
  }
}

# ECS Task Execution Role
resource "aws_iam_role" "ecs_execution_role" {
  name                 = "${local.resource_prefix}-ecs-execution-role"
  description          = "ECS task execution role for SaaS Benchmarks Platform"
  assume_role_policy   = data.aws_iam_policy_document.ecs_trust_policy.json
  permissions_boundary = "arn:aws:iam::aws:policy/PowerUserAccess"
  max_session_duration = 3600
  force_detach_policies = true

  tags = merge(local.project_tags, {
    Role = "ECS Execution"
    SecurityLevel = "High"
  })
}

# Attach AWS managed policy for ECS task execution
resource "aws_iam_role_policy_attachment" "ecs_execution_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Role Trust Policy
data "aws_iam_policy_document" "ecs_task_trust_policy" {
  statement {
    effect = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

# ECS Task Role
resource "aws_iam_role" "ecs_task_role" {
  name                 = "${local.resource_prefix}-ecs-task-role"
  description          = "ECS task role for SaaS Benchmarks Platform application"
  assume_role_policy   = data.aws_iam_policy_document.ecs_task_trust_policy.json
  permissions_boundary = "arn:aws:iam::aws:policy/PowerUserAccess"
  max_session_duration = 3600
  force_detach_policies = true

  tags = merge(local.project_tags, {
    Role = "ECS Task"
    SecurityLevel = "High"
  })
}

# Application-specific permissions policy
data "aws_iam_policy_document" "app_permissions" {
  # Secrets Manager access
  statement {
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "kms:Decrypt"
    ]
    resources = [
      "arn:aws:secretsmanager:*:*:secret:${local.resource_prefix}-*",
      "arn:aws:kms:*:*:key/*"
    ]
    condition {
      test     = "StringEquals"
      variable = "aws:RequestedRegion"
      values   = [data.aws_region.current.name]
    }
  }

  # S3 access for exports
  statement {
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:ListBucket"
    ]
    resources = [
      "arn:aws:s3:::${local.resource_prefix}-exports",
      "arn:aws:s3:::${local.resource_prefix}-exports/*"
    ]
  }

  # CloudWatch Logs access
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = ["arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/ecs/${local.resource_prefix}-*"]
  }

  # Explicit deny for insecure transport
  statement {
    effect = "Deny"
    actions = ["*"]
    resources = ["*"]
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

# Attach application permissions to task role
resource "aws_iam_role_policy" "app_permissions" {
  name   = "${local.resource_prefix}-app-permissions"
  role   = aws_iam_role.ecs_task_role.id
  policy = data.aws_iam_policy_document.app_permissions.json
}

# Redis access policy
data "aws_iam_policy_document" "redis_access" {
  statement {
    effect = "Allow"
    actions = [
      "elasticache:DescribeCacheClusters",
      "elasticache:ListTagsForResource"
    ]
    resources = ["arn:aws:elasticache:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:cluster/${local.resource_prefix}-*"]
  }
}

resource "aws_iam_role_policy" "redis_access" {
  name   = "${local.resource_prefix}-redis-access"
  role   = aws_iam_role.ecs_task_role.id
  policy = data.aws_iam_policy_document.redis_access.json
}

# Outputs
output "ecs_execution_role_arn" {
  description = "ARN of the ECS execution role"
  value       = aws_iam_role.ecs_execution_role.arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  value       = aws_iam_role.ecs_task_role.arn
}