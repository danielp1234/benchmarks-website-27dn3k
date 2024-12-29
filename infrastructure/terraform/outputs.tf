# Network Infrastructure Outputs
output "vpc_outputs" {
  description = "Network infrastructure output values for multi-AZ deployment configuration"
  value = {
    vpc_id              = aws_vpc.main.id
    public_subnet_ids   = aws_subnet.public[*].id
    private_subnet_ids  = aws_subnet.private[*].id
    database_subnet_ids = aws_subnet.private[*].id  # Using private subnets for database tier
    availability_zones  = var.availability_zones
  }
}

# ECS Cluster and Services Outputs
output "ecs_outputs" {
  description = "ECS cluster and service information for container orchestration and scaling"
  value = {
    cluster_name                 = aws_ecs_cluster.main.name
    cluster_arn                  = aws_ecs_cluster.main.arn
    service_names               = aws_ecs_service.services[*].name
    task_definitions            = aws_ecs_task_definition.services[*].arn
    service_discovery_namespace = aws_service_discovery_private_dns_namespace.main.name
  }
}

# Database and Cache Outputs
output "database_outputs" {
  description = "Secure database connection endpoints and configuration for application services"
  sensitive   = true  # Marking as sensitive due to connection information
  value = {
    rds_endpoint         = aws_db_instance.postgresql.endpoint
    redis_endpoint       = aws_elasticache_replication_group.redis.primary_endpoint_address
    rds_port            = aws_db_instance.postgresql.port
    redis_port          = aws_elasticache_replication_group.redis.port
    rds_monitoring_role = aws_iam_role.rds_monitoring.arn
    redis_subnet_group  = aws_elasticache_subnet_group.redis.name
  }
}

# CDN and Content Delivery Outputs
output "cdn_outputs" {
  description = "CloudFront distribution details for global content delivery"
  value = {
    cloudfront_domain        = aws_cloudfront_distribution.main.domain_name
    cloudfront_id           = aws_cloudfront_distribution.main.id
    distribution_arn        = aws_cloudfront_distribution.main.arn
    origin_access_identity = aws_cloudfront_origin_access_identity.main.iam_arn
  }
}

# Security Outputs
output "security_outputs" {
  description = "Security-related configuration and resource identifiers"
  sensitive   = true  # Marking as sensitive due to security information
  value = {
    ssl_certificate_arn = aws_acm_certificate.main.arn
    waf_web_acl_arn    = local.security_config.enable_waf ? aws_wafv2_web_acl.main[0].arn : null
    kms_key_arn        = aws_kms_key.terraform_state.arn
  }
}

# Load Balancer Outputs
output "load_balancer_outputs" {
  description = "Load balancer configuration for application access"
  value = {
    alb_dns_name         = aws_lb.main.dns_name
    alb_zone_id          = aws_lb.main.zone_id
    alb_arn              = aws_lb.main.arn
    target_group_arns    = aws_lb_target_group.services[*].arn
    listener_arns        = aws_lb_listener.https[*].arn
  }
}

# Monitoring and Logging Outputs
output "monitoring_outputs" {
  description = "Monitoring and logging configuration details"
  value = {
    cloudwatch_log_group     = aws_cloudwatch_log_group.vpc_flow_logs.name
    metrics_namespace        = "${local.resource_prefix}-metrics"
    log_retention_days      = 30
    monitoring_role_arn     = aws_iam_role.vpc_flow_logs.arn
  }
}

# Environment Information
output "environment_info" {
  description = "General environment and deployment information"
  value = {
    environment         = var.environment
    aws_region         = data.aws_region.current.name
    deployment_id      = random_id.unique.hex
    is_production      = local.is_production
    resource_prefix    = local.resource_prefix
  }
}