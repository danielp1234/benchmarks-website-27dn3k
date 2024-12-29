# AWS WAF configuration for SaaS Benchmarks Platform
# Provider version: hashicorp/aws ~> 5.0

# IP Set for rate limiting and blocking
resource "aws_wafv2_ip_set" "waf_ipset" {
  name               = "${var.project}-${var.environment}-ipset"
  description        = "IP set for rate limiting and blocking"
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV4"
  addresses          = [] # Empty by default, IPs can be added via AWS Console or automation

  tags = {
    Name        = "${var.project}-${var.environment}-ipset"
    Environment = var.environment
    Project     = var.project
  }
}

# WAF Web ACL with security rules
resource "aws_wafv2_web_acl" "waf_acl" {
  name        = "${var.project}-${var.environment}-waf"
  description = "WAF rules for SaaS Benchmarks Platform"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Rule #1: Rate limiting - 1000 requests per hour per IP
  rule {
    name     = "RateLimit"
    priority = 1

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        limit              = 1000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "RateLimitMetric"
      sampled_requests_enabled  = true
    }
  }

  # Rule #2: AWS Managed Common Rule Set (protection against common web exploits)
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name         = "AWSManagedRulesCommonRuleSet"
        vendor_name  = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled  = true
    }
  }

  # Rule #3: AWS Managed Known Bad Inputs Rule Set
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name         = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name  = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "AWSManagedRulesKnownBadInputsRuleSetMetric"
      sampled_requests_enabled  = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "WAFWebACLMetric"
    sampled_requests_enabled  = true
  }

  tags = {
    Name        = "${var.project}-${var.environment}-waf"
    Environment = var.environment
    Project     = var.project
  }
}

# CloudWatch Log Group for WAF logs
resource "aws_cloudwatch_log_group" "waf_log_group" {
  name              = "/aws/waf/${var.project}-${var.environment}"
  retention_in_days = 30

  tags = {
    Name        = "${var.project}-${var.environment}-waf-logs"
    Environment = var.environment
    Project     = var.project
  }
}

# WAF Logging Configuration
resource "aws_wafv2_web_acl_logging_configuration" "waf_logging" {
  log_destination_configs = [aws_cloudwatch_log_group.waf_log_group.arn]
  resource_arn           = aws_wafv2_web_acl.waf_acl.arn

  redacted_fields {
    single_header {
      name = "authorization"
    }
  }
}

# Associate WAF with CloudFront distribution
resource "aws_wafv2_web_acl_association" "cloudfront_waf" {
  resource_arn = aws_cloudfront_distribution.cloudfront_distribution.arn
  web_acl_arn  = aws_wafv2_web_acl.waf_acl.arn
}