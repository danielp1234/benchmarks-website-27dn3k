# Environment and Project Configuration
# Used for resource tagging and environment segregation
environment = "staging"
project     = "saas-benchmarks"

# AWS Region Configuration
# Staging environment deployment region, separate from production
aws_region = "us-west-2"

# Network Configuration
# CIDR block for staging VPC, non-overlapping with other environments
vpc_cidr = "10.1.0.0/16"

# Single availability zone for cost-optimized staging deployment
availability_zones = [
  "us-west-2a"
]

# Database Configuration
# Cost-effective RDS instance size suitable for staging workloads
db_instance_class = "db.t3.small"

# Redis Cache Configuration
# Reduced-size Redis instance for staging caching requirements
redis_node_type = "cache.t3.small"

# Domain Configuration
# Staging environment domain name following DNS naming convention
domain_name = "staging.saas-benchmarks.com"

# ECS Container Configuration
# Container resource allocations sized for staging workloads
ecs_container_memory = 1024  # Memory allocation in MB
ecs_container_cpu    = 256   # CPU allocation in units (256 = 0.25 vCPU)