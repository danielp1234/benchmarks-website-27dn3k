# Core Environment Variables
variable "environment" {
  type        = string
  description = "Deployment environment (prod/staging)"
  validation {
    condition     = contains(["prod", "staging"], var.environment)
    error_message = "Environment must be either prod or staging"
  }
}

variable "project" {
  type        = string
  description = "Project name for resource tagging and identification"
}

variable "aws_region" {
  type        = string
  description = "AWS region for resource deployment"
  default     = "us-west-2"
  validation {
    condition     = can(regex("^(us|eu|ap|sa|ca|me|af)-[a-z]+-\\d+$", var.aws_region))
    error_message = "AWS region must be a valid region identifier"
  }
}

# Networking Configuration
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for VPC"
  default     = "10.0.0.0/16"
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block"
  }
}

variable "availability_zones" {
  type        = list(string)
  description = "List of AWS availability zones for high availability deployment"
  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least two availability zones must be specified for HA"
  }
}

# Database Configuration
variable "db_instance_class" {
  type        = string
  description = "RDS instance type for PostgreSQL database"
  default     = "db.t3.medium"
  validation {
    condition     = can(regex("^db\\.[a-z0-9]+\\.[a-z0-9]+$", var.db_instance_class))
    error_message = "DB instance class must be a valid RDS instance type"
  }
}

# Cache Configuration
variable "redis_node_type" {
  type        = string
  description = "ElastiCache Redis node type"
  default     = "cache.t3.medium"
  validation {
    condition     = can(regex("^cache\\.[a-z0-9]+\\.[a-z0-9]+$", var.redis_node_type))
    error_message = "Redis node type must be a valid ElastiCache instance type"
  }
}

# Domain Configuration
variable "domain_name" {
  type        = string
  description = "Domain name for Route53 and ACM certificate"
  sensitive   = true
}

# Container Configuration
variable "ecs_container_memory" {
  type        = number
  description = "Memory allocation for ECS tasks in MB"
  default     = 2048
  validation {
    condition     = var.ecs_container_memory >= 512 && var.ecs_container_memory <= 8192
    error_message = "ECS container memory must be between 512 and 8192 MB"
  }
}

variable "ecs_container_cpu" {
  type        = number
  description = "CPU allocation for ECS tasks in units (1024 = 1 vCPU)"
  default     = 512
  validation {
    condition     = var.ecs_container_cpu >= 256 && var.ecs_container_cpu <= 4096
    error_message = "ECS container CPU must be between 256 and 4096 units"
  }
}

# Backup Configuration
variable "backup_retention_period" {
  type        = number
  description = "Number of days to retain RDS backups"
  default     = 7
  validation {
    condition     = var.backup_retention_period >= 7
    error_message = "Backup retention period must be at least 7 days"
  }
}

# High Availability Configuration
variable "multi_az" {
  type        = bool
  description = "Enable Multi-AZ deployment for RDS"
  default     = true
}

# Tagging Configuration
variable "environment_tags" {
  type        = map(string)
  description = "Environment-specific resource tags"
  default     = {}
}