# AWS Certificate Manager (ACM) Configuration for SaaS Benchmarks Platform
# Provider version: ~> 5.0
# Purpose: Manages SSL/TLS certificates with enhanced security features
# Last updated: 2023

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Primary SSL/TLS certificate for the domain and all subdomains
resource "aws_acm_certificate" "acm_certificate" {
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"] # Wildcard support for all subdomains
  validation_method         = "DNS"                    # DNS validation for automated renewal

  # Enhanced options for certificate management
  options {
    certificate_transparency_logging_preference = "ENABLED"
  }

  # Comprehensive tagging strategy for resource management
  tags = {
    Name            = "${var.project}-${var.environment}-certificate"
    Environment     = var.environment
    Project         = var.project
    ManagedBy       = "terraform"
    SecurityLevel   = "high"
    CertificateType = "wildcard"
    AutoRenew       = "true"
    CreatedAt       = timestamp()
  }

  # Lifecycle policy to prevent certificate deletion before replacement
  lifecycle {
    create_before_destroy = true
  }
}

# DNS validation record for automated certificate validation
resource "aws_route53_record" "certificate_validation" {
  for_each = {
    for dvo in aws_acm_certificate.acm_certificate.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id         = aws_route53_zone.route53_zone.zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true

  lifecycle {
    create_before_destroy = true
  }
}

# Certificate validation with extended timeout
resource "aws_acm_certificate_validation" "acm_certificate_validation" {
  certificate_arn = aws_acm_certificate.acm_certificate.arn
  validation_record_fqdns = [
    for record in aws_route53_record.certificate_validation : record.fqdn
  ]

  timeouts {
    create = "45m" # Extended timeout for DNS propagation
  }
}

# Outputs for certificate details
output "certificate_arn" {
  description = "ARN of the issued certificate"
  value       = aws_acm_certificate.acm_certificate.arn
}

output "certificate_status" {
  description = "Status of the certificate"
  value       = aws_acm_certificate.acm_certificate.status
}

output "certificate_domain_validation_options" {
  description = "Domain validation options for the certificate"
  value       = aws_acm_certificate.acm_certificate.domain_validation_options
  sensitive   = true
}

output "certificate_not_after" {
  description = "Expiration date of the certificate"
  value       = aws_acm_certificate.acm_certificate.not_after
}

output "certificate_validation_emails" {
  description = "List of email addresses that can be used to validate the certificate"
  value       = aws_acm_certificate.acm_certificate.validation_emails
  sensitive   = true
}