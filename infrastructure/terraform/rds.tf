# AWS RDS PostgreSQL Configuration
# Provider Version: aws ~> 5.0

# IAM Role for Enhanced Monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "${local.resource_prefix}-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = local.project_tags
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# RDS Subnet Group
resource "aws_db_subnet_group" "main" {
  name        = "${local.resource_prefix}-db-subnet-group"
  description = "Database subnet group for SaaS Benchmarks Platform"
  subnet_ids  = var.private_subnet_ids

  tags = merge(local.project_tags, {
    Name = "${local.resource_prefix}-db-subnet-group"
  })
}

# RDS Parameter Group
resource "aws_db_parameter_group" "main" {
  name        = "${local.resource_prefix}-db-params"
  family      = "postgres14"
  description = "Custom parameter group for PostgreSQL 14"

  parameter {
    name  = "max_connections"
    value = "1000"
  }

  parameter {
    name  = "shared_buffers"
    value = "4GB"
  }

  parameter {
    name  = "work_mem"
    value = "64MB"
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "512MB"
  }

  parameter {
    name  = "effective_cache_size"
    value = "12GB"
  }

  parameter {
    name  = "autovacuum"
    value = "1"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries taking more than 1 second
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  tags = local.project_tags
}

# Database Password in Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name = "${local.resource_prefix}-db-password"
  description = "Master password for RDS PostgreSQL instance"
  
  tags = local.project_tags
}

resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%^&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier = "${local.resource_prefix}-db"
  
  # Engine Configuration
  engine                      = "postgres"
  engine_version             = "14"
  instance_class             = var.db_instance_class
  allocated_storage          = 100
  max_allocated_storage      = 1000
  storage_type               = "gp3"
  iops                       = 12000
  
  # Database Configuration
  db_name                    = "saas_benchmarks"
  username                   = "admin"
  password                   = aws_secretsmanager_secret_version.db_password.secret_string
  port                       = 5432
  
  # Network & Security
  db_subnet_group_name       = aws_db_subnet_group.main.name
  parameter_group_name       = aws_db_parameter_group.main.name
  vpc_security_group_ids     = [aws_security_group.rds.id]
  multi_az                   = true
  publicly_accessible        = false
  storage_encrypted         = true
  
  # Backup & Maintenance
  backup_retention_period    = 30
  backup_window             = "03:00-04:00"
  maintenance_window        = "Mon:04:00-Mon:05:00"
  copy_tags_to_snapshot     = true
  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "${local.resource_prefix}-db-final"
  
  # Monitoring & Performance
  monitoring_interval             = 60
  monitoring_role_arn            = aws_iam_role.rds_monitoring.arn
  performance_insights_enabled    = true
  performance_insights_retention_period = 7
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  
  # Updates
  auto_minor_version_upgrade     = true
  allow_major_version_upgrade    = false
  
  tags = merge(local.project_tags, {
    Name = "${local.resource_prefix}-db"
  })
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name        = "${local.resource_prefix}-rds-sg"
  description = "Security group for RDS PostgreSQL instance"
  vpc_id      = aws_vpc.main.id

  tags = merge(local.project_tags, {
    Name = "${local.resource_prefix}-rds-sg"
  })
}

# Security Group Rules will be managed by the application stack

# Outputs
output "db_endpoint" {
  description = "RDS instance endpoint for application connection"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "db_name" {
  description = "Database name for application configuration"
  value       = aws_db_instance.main.db_name
}

output "db_monitoring_role_arn" {
  description = "ARN of IAM role used for enhanced monitoring"
  value       = aws_iam_role.rds_monitoring.arn
}