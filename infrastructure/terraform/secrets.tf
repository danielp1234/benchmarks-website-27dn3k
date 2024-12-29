# AWS Secrets Manager Configuration for SaaS Benchmarks Platform
# Provider versions:
# aws: ~> 5.0
# random: ~> 3.5

# Generate secure random password for database
resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
  min_special      = 2
  min_upper        = 2
  min_lower        = 2
  min_numeric      = 2

  # Ensure password meets security requirements
  lifecycle {
    create_before_destroy = true
  }
}

# Database credentials secret
resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${local.resource_prefix}-db-credentials"
  description = "Database credentials for SaaS Benchmarks Platform"
  
  # Enable automatic recovery window for accidental deletion protection
  recovery_window_in_days = 7

  # Enable automatic key rotation using AWS managed keys
  kms_key_id = aws_kms_key.terraform_state.id

  tags = merge(local.project_tags, {
    Name             = "${local.resource_prefix}-db-credentials"
    SecretType       = "database"
    RotationEnabled  = "true"
    SecurityLevel    = "high"
  })
}

# Secret version with structured credential data
resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = "admin"
    password = random_password.db_password.result
    engine   = "postgres"
    port     = 5432
    dbname   = "saas_benchmarks"
    host     = "primary_db_endpoint" # Will be updated by rotation Lambda
  })

  # Ensure version is replaced on password change
  lifecycle {
    create_before_destroy = true
  }
}

# Secret rotation configuration
resource "aws_secretsmanager_secret_rotation" "db_credentials" {
  secret_id           = aws_secretsmanager_secret.db_credentials.id
  rotation_lambda_arn = aws_lambda_function.secret_rotation.arn

  rotation_rules {
    automatically_after_days = 30 # 30-day rotation as per requirements
  }

  depends_on = [
    aws_secretsmanager_secret_version.db_credentials
  ]
}

# Secret policy to restrict access
resource "aws_secretsmanager_secret_policy" "db_credentials" {
  secret_arn = aws_secretsmanager_secret.db_credentials.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableSecretAccess"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
          ]
        }
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "*"
      },
      {
        Sid    = "DenyUnencryptedTransport"
        Effect = "Deny"
        Principal = "*"
        Action = "secretsmanager:*"
        Resource = "*"
        Condition = {
          Bool = {
            "aws:SecureTransport": "false"
          }
        }
      }
    ]
  })
}

# Output the secret ARN for use in other modules
output "secrets_arn" {
  description = "ARN of the database credentials secret"
  value       = aws_secretsmanager_secret.db_credentials.arn
  sensitive   = true
}

# Output the secret name for application configuration
output "secret_name" {
  description = "Name of the database credentials secret"
  value       = aws_secretsmanager_secret.db_credentials.name
  sensitive   = true
}

# Local variables for secret configuration
locals {
  secret_tags = merge(local.project_tags, {
    SecretType      = "database"
    RotationEnabled = "true"
    SecurityLevel   = "high"
  })
}