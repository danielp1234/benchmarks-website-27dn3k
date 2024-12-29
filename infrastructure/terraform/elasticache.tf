# AWS ElastiCache Redis Configuration
# Provider Version: aws ~> 5.0

# Redis Subnet Group
resource "aws_elasticache_subnet_group" "redis" {
  name        = "${local.resource_prefix}-redis-subnet-group"
  subnet_ids  = var.private_subnet_ids
  description = "Subnet group for SaaS Benchmarks Redis cluster"

  tags = merge(local.project_tags, {
    Component = "Redis"
  })
}

# Redis Parameter Group
resource "aws_elasticache_parameter_group" "redis" {
  family      = "redis7.0"
  name        = "${local.resource_prefix}-redis-params"
  description = "Optimized Redis parameters for SaaS Benchmarks Platform"

  # Session management and caching optimization parameters
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"  # Least Recently Used eviction policy
  }

  parameter {
    name  = "timeout"
    value = "300"  # 5-minute connection timeout
  }

  parameter {
    name  = "maxmemory-samples"
    value = "10"  # Number of samples for LRU estimation
  }

  # Memory management and performance optimization
  parameter {
    name  = "activedefrag"
    value = "yes"  # Enable active defragmentation
  }

  parameter {
    name  = "active-defrag-threshold-lower"
    value = "10"  # Start defrag when fragmentation is above 10%
  }

  parameter {
    name  = "active-defrag-threshold-upper"
    value = "30"  # Maximum defrag effort at 30% fragmentation
  }

  tags = merge(local.project_tags, {
    Component = "Redis"
  })
}

# Redis Replication Group
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "${local.resource_prefix}-redis"
  description         = "Redis cluster for SaaS Benchmarks Platform"
  
  # Instance configuration
  node_type                   = "cache.t4g.medium"  # Cost-effective instance with good performance
  port                        = 6379
  parameter_group_name        = aws_elasticache_parameter_group.redis.name
  subnet_group_name           = aws_elasticache_subnet_group.redis.name
  
  # High availability settings
  automatic_failover_enabled  = true
  multi_az_enabled           = true
  num_cache_clusters         = 2  # Primary and replica for HA
  
  # Engine configuration
  engine                     = "redis"
  engine_version            = "7.0"
  
  # Security settings
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  
  # Maintenance and backup
  maintenance_window         = "sun:05:00-sun:09:00"  # Weekly maintenance window
  snapshot_window           = "03:00-05:00"  # Daily backup window
  snapshot_retention_limit  = 7  # Retain backups for 7 days
  auto_minor_version_upgrade = true
  
  # Monitoring
  notification_topic_arn    = var.sns_topic_arn
  
  tags = merge(local.project_tags, {
    Component  = "Redis"
    CostCenter = "Cache"
  })
}

# Outputs for application configuration
output "redis_endpoint" {
  description = "Primary endpoint for Redis cluster connection"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "redis_port" {
  description = "Port number for Redis cluster connection"
  value       = aws_elasticache_replication_group.redis.port
}

output "redis_connection_string" {
  description = "Full connection string for Redis cluster"
  value       = format("redis://%s:%s", 
    aws_elasticache_replication_group.redis.primary_endpoint_address,
    aws_elasticache_replication_group.redis.port
  )
  sensitive   = true
}