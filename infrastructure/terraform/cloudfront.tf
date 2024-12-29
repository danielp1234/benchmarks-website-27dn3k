# AWS CloudFront Distribution Configuration
# Provider version: ~> 5.0
# Purpose: Configure CDN for static asset delivery with enhanced security and performance

# Origin Access Identity for S3 bucket access
resource "aws_cloudfront_origin_access_identity" "oai" {
  comment = "${var.project}-${var.environment} static assets OAI"
}

# Security Headers Policy for enhanced security
resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name    = "${var.project}-${var.environment}-security-headers"
  comment = "Security headers policy for ${var.project} ${var.environment}"

  security_headers_config {
    content_security_policy {
      content_security_policy = "default-src 'self' https:; script-src 'self' https: 'unsafe-inline' 'unsafe-eval'; style-src 'self' https: 'unsafe-inline';"
      override = true
    }

    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains        = true
      preload                   = true
      override                  = true
    }

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
  }
}

# Main CloudFront Distribution
resource "aws_cloudfront_distribution" "cloudfront_distribution" {
  enabled             = true
  is_ipv6_enabled     = true
  http_version        = "http2and3"
  comment             = "${var.project}-${var.environment} static assets distribution"
  default_root_object = "index.html"
  aliases             = [var.domain_name]
  price_class         = "PriceClass_100" # Use only North America and Europe edge locations for cost optimization

  # Origin configuration for S3 bucket
  origin {
    domain_name = aws_s3_bucket.static_assets_bucket.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.static_assets_bucket.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }

    custom_header {
      name  = "X-Environment"
      value = var.environment
    }
  }

  # Default cache behavior settings
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.static_assets_bucket.id}"

    forwarded_values {
      query_string = false
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy     = "redirect-to-https"
    min_ttl                   = 0
    default_ttl               = 3600  # 1 hour
    max_ttl                   = 86400 # 24 hours
    compress                  = true
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
  }

  # Custom error responses for SPA routing
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
    error_caching_min_ttl = 10
  }

  # SSL/TLS configuration
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.acm_certificate.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # Geo-restriction settings (none for global access)
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # WAF integration
  web_acl_id = aws_wafv2_web_acl.cloudfront_waf.id

  # Access logging configuration
  logging_config {
    include_cookies = false
    bucket         = aws_s3_bucket.logs_bucket.bucket_domain_name
    prefix         = "cloudfront/"
  }

  # Resource tags
  tags = {
    Name        = "${var.project}-${var.environment}-distribution"
    Environment = var.environment
    Project     = var.project
    ManagedBy   = "terraform"
  }

  # Lifecycle policy to prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }

  # Dependencies to ensure proper resource creation order
  depends_on = [
    aws_s3_bucket.static_assets_bucket,
    aws_acm_certificate.acm_certificate,
    aws_wafv2_web_acl.cloudfront_waf,
    aws_s3_bucket.logs_bucket
  ]
}

# Outputs for use in other Terraform configurations
output "cloudfront_distribution_id" {
  description = "The identifier for the CloudFront distribution"
  value       = aws_cloudfront_distribution.cloudfront_distribution.id
}

output "cloudfront_distribution_domain_name" {
  description = "The domain name corresponding to the CloudFront distribution"
  value       = aws_cloudfront_distribution.cloudfront_distribution.domain_name
}

output "cloudfront_distribution_hosted_zone_id" {
  description = "The CloudFront Route 53 zone ID for DNS configuration"
  value       = aws_cloudfront_distribution.cloudfront_distribution.hosted_zone_id
}

output "cloudfront_oai_iam_arn" {
  description = "The IAM ARN for the CloudFront Origin Access Identity"
  value       = aws_cloudfront_origin_access_identity.oai.iam_arn
}

output "cloudfront_oai_path" {
  description = "The CloudFront Access Identity Path for S3 bucket policy"
  value       = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
}