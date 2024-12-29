# CloudWatch Configuration for SaaS Benchmarks Platform
# Provider Version: aws ~> 5.0

# KMS Key for CloudWatch Log Encryption
resource "aws_kms_key" "cloudwatch" {
  description             = "KMS key for CloudWatch logs encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = local.project_tags
}

resource "aws_kms_alias" "cloudwatch" {
  name          = "alias/${local.resource_prefix}-cloudwatch"
  target_key_id = aws_kms_key.cloudwatch.key_id
}

# Log Groups
resource "aws_cloudwatch_log_group" "app_logs" {
  name              = "${local.resource_prefix}-app-logs"
  retention_in_days = 30
  kms_key_id       = aws_kms_key.cloudwatch.arn

  tags = local.project_tags
}

resource "aws_cloudwatch_log_group" "access_logs" {
  name              = "${local.resource_prefix}-access-logs"
  retention_in_days = 30
  kms_key_id       = aws_kms_key.cloudwatch.arn

  tags = local.project_tags
}

resource "aws_cloudwatch_log_group" "error_logs" {
  name              = "${local.resource_prefix}-error-logs"
  retention_in_days = 90
  kms_key_id       = aws_kms_key.cloudwatch.arn

  tags = local.project_tags
}

# SNS Topic for Alarms
resource "aws_sns_topic" "alerts" {
  name = "${local.resource_prefix}-alerts"
  kms_master_key_id = aws_kms_key.cloudwatch.id

  tags = local.project_tags
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "cpu_utilization" {
  alarm_name          = "${local.resource_prefix}-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name        = "CPUUtilization"
  namespace          = "AWS/ECS"
  period             = 300
  statistic          = "Average"
  threshold          = 70
  alarm_description  = "Alert when CPU exceeds 70%"
  alarm_actions      = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.backend.name
  }

  tags = local.project_tags
}

resource "aws_cloudwatch_metric_alarm" "memory_utilization" {
  alarm_name          = "${local.resource_prefix}-memory-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name        = "MemoryUtilization"
  namespace          = "AWS/ECS"
  period             = 300
  statistic          = "Average"
  threshold          = 85
  alarm_description  = "Alert when memory exceeds 85%"
  alarm_actions      = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.backend.name
  }

  tags = local.project_tags
}

resource "aws_cloudwatch_metric_alarm" "api_latency" {
  alarm_name          = "${local.resource_prefix}-api-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name        = "Duration"
  namespace          = "AWS/ApiGateway"
  period             = 60
  statistic          = "p95"
  threshold          = 2000
  alarm_description  = "Alert when API latency exceeds 2 seconds"
  alarm_actions      = [aws_sns_topic.alerts.arn]

  dimensions = {
    ApiName = aws_api_gateway_rest_api.main.name
  }

  tags = local.project_tags
}

resource "aws_cloudwatch_metric_alarm" "system_availability" {
  alarm_name          = "${local.resource_prefix}-availability"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 5
  metric_name        = "HealthyHostCount"
  namespace          = "AWS/ApplicationELB"
  period             = 60
  statistic          = "Minimum"
  threshold          = 2
  alarm_description  = "Alert when healthy host count drops below 2"
  alarm_actions      = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.name
  }

  tags = local.project_tags
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${local.resource_prefix}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        x    = 0
        y    = 0
        width = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ClusterName", aws_ecs_cluster.main.name],
            ["AWS/ECS", "MemoryUtilization", "ClusterName", aws_ecs_cluster.main.name]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "ECS Resource Utilization"
        }
      },
      {
        type = "metric"
        x    = 12
        y    = 0
        width = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ApiGateway", "Duration", "ApiName", aws_api_gateway_rest_api.main.name],
            ["AWS/ApiGateway", "5XXError", "ApiName", aws_api_gateway_rest_api.main.name]
          ]
          period = 60
          stat   = "p95"
          region = data.aws_region.current.name
          title  = "API Performance"
        }
      },
      {
        type = "metric"
        x    = 0
        y    = 6
        width = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", aws_db_instance.main.id],
            ["AWS/RDS", "ReadLatency", "DBInstanceIdentifier", aws_db_instance.main.id],
            ["AWS/RDS", "WriteLatency", "DBInstanceIdentifier", aws_db_instance.main.id]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "Database Performance"
        }
      }
    ]
  })
}

# Outputs
output "app_log_group_name" {
  description = "Name of the application CloudWatch log group"
  value       = aws_cloudwatch_log_group.app_logs.name
}

output "access_log_group_name" {
  description = "Name of the access logs CloudWatch log group"
  value       = aws_cloudwatch_log_group.access_logs.name
}

output "error_log_group_name" {
  description = "Name of the error logs CloudWatch log group"
  value       = aws_cloudwatch_log_group.error_logs.name
}