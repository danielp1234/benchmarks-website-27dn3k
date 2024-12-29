# AWS Route53 Configuration for SaaS Benchmarks Platform
# Provider version: ~> 5.0
# Purpose: Manages DNS configuration including hosted zones and records
# Last updated: 2023

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Primary hosted zone for the domain
# This zone will contain all DNS records for the SaaS Benchmarks Platform
resource "aws_route53_zone" "route53_zone" {
  name    = var.domain_name
  comment = "${var.project}-${var.environment} primary hosted zone"

  # Comprehensive tagging strategy for resource management and cost allocation
  tags = {
    Name        = "${var.project}-${var.environment}-zone"
    Environment = var.environment
    Project     = var.project
    ManagedBy   = "terraform"
    CreatedAt   = timestamp()
    Purpose     = "Primary DNS zone for SaaS Benchmarks Platform"
  }

  # Lifecycle policy to prevent accidental deletion of the hosted zone
  lifecycle {
    prevent_destroy = true
  }
}

# Apex domain record (naked domain) pointing to CloudFront distribution
# This record enables the root domain to serve the application
resource "aws_route53_record" "route53_record_apex" {
  zone_id = aws_route53_zone.route53_zone.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.cloudfront_distribution.domain_name
    zone_id               = aws_cloudfront_distribution.cloudfront_distribution.hosted_zone_id
    evaluate_target_health = false # Health checks handled by CloudFront
  }

  # Lifecycle policy to ensure record updates are handled gracefully
  lifecycle {
    create_before_destroy = true
  }
}

# WWW subdomain record pointing to CloudFront distribution
# This record enables www.domain.com to serve the application
resource "aws_route53_record" "route53_record_www" {
  zone_id = aws_route53_zone.route53_zone.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.cloudfront_distribution.domain_name
    zone_id               = aws_cloudfront_distribution.cloudfront_distribution.hosted_zone_id
    evaluate_target_health = false # Health checks handled by CloudFront
  }

  # Lifecycle policy to ensure record updates are handled gracefully
  lifecycle {
    create_before_destroy = true
  }
}

# Output the name servers for the hosted zone
# This information is needed for domain registrar configuration
output "route53_name_servers" {
  description = "Name servers for the Route53 hosted zone"
  value       = aws_route53_zone.route53_zone.name_servers
}

# Output the zone ID for reference by other resources
output "route53_zone_id" {
  description = "Zone ID of the Route53 hosted zone"
  value       = aws_route53_zone.route53_zone.zone_id
}

# Health check for the primary domain
resource "aws_route53_health_check" "primary" {
  fqdn              = var.domain_name
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = "3"
  request_interval  = "30"

  tags = {
    Name        = "${var.project}-${var.environment}-health-check"
    Environment = var.environment
    Project     = var.project
    ManagedBy   = "terraform"
  }
}

# DNS failover policy for high availability
resource "aws_route53_record" "failover_primary" {
  zone_id = aws_route53_zone.route53_zone.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  failover_routing_policy {
    type = "PRIMARY"
  }

  alias {
    name                   = aws_cloudfront_distribution.cloudfront_distribution.domain_name
    zone_id               = aws_cloudfront_distribution.cloudfront_distribution.hosted_zone_id
    evaluate_target_health = true
  }

  health_check_id = aws_route53_health_check.primary.id
  set_identifier  = "primary"
}