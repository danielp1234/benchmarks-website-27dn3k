# Production Environment Configuration
# SaaS Benchmarks Platform
# Last Updated: 2023
# Purpose: Defines production infrastructure variables for high availability deployment

# Environment Identification
# Used for resource naming and tagging
environment = "prod"
project     = "saas-benchmarks"

# Regional Configuration
# US West (Oregon) selected for optimal latency and service availability
aws_region = "us-west-2"

# Network Configuration
# /16 CIDR provides 65,536 IP addresses for production services
vpc_cidr = "10.0.0.0/16"

# High Availability Configuration
# Multi-AZ deployment across three availability zones for redundancy
availability_zones = [
  "us-west-2a",
  "us-west-2b",
  "us-west-2c"
]

# Database Configuration
# R6g instance family optimized for memory-intensive database workloads
# 4 vCPUs, 32GB RAM for high performance production operations
db_instance_class = "db.r6g.xlarge"

# Cache Configuration
# R6g instance family optimized for in-memory caching
# 2 vCPUs, 16GB RAM for efficient session management and data caching
redis_node_type = "cache.r6g.large"

# Domain Configuration
# Production domain for the SaaS Benchmarks Platform
domain_name = "benchmarks.saas-platform.com"

# Container Resource Configuration
# Sized to support 1000+ concurrent users with <2s response time
# Memory: 4GB per container for application workload
# CPU: 1 vCPU (1024 CPU units) per container
ecs_container_memory = 4096  # MB
ecs_container_cpu    = 1024  # CPU units (1024 = 1 vCPU)