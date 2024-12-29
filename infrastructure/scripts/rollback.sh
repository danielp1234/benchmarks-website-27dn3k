#!/bin/bash

# SaaS Benchmarks Platform - Deployment Rollback Script
# Version: 1.0.0
# Requires: AWS CLI v2.x, Docker 24.x, Terraform 1.5+

set -euo pipefail
IFS=$'\n\t'

# Import environment variables and configurations
source "$(dirname "$0")/../../.env"

# Global variables
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_NAME="saas-benchmarks"
readonly ROLLBACK_LOG="/var/log/rollback.log"
readonly MAX_RETRIES=3
readonly HEALTH_CHECK_TIMEOUT=300
readonly DEPLOYMENT_HISTORY_LIMIT=10

# Service names from docker-compose.prod.yml
readonly SERVICES=(web api postgres redis)

# Logging configuration
setup_logging() {
    exec 1> >(tee -a "${ROLLBACK_LOG}")
    exec 2> >(tee -a "${ROLLBACK_LOG}" >&2)
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting rollback process..."
}

# Error handling
error_handler() {
    local line_no=$1
    local error_code=$2
    echo "[ERROR] Failed at line ${line_no} with error code ${error_code}"
    cleanup
    exit "${error_code}"
}
trap 'error_handler ${LINENO} $?' ERR

# Cleanup function
cleanup() {
    echo "[INFO] Performing cleanup..."
    # Release any locks
    aws dynamodb delete-item \
        --table-name "${PROJECT_NAME}-deployment-locks" \
        --key '{"LockID": {"S": "deployment-lock"}}'
}

# Validate environment and prerequisites
validate_rollback_environment() {
    local environment=$1

    echo "[INFO] Validating rollback environment: ${environment}"
    
    # Validate environment value
    if [[ ! "${environment}" =~ ^(staging|production)$ ]]; then
        echo "[ERROR] Invalid environment: ${environment}"
        return 1
    }

    # Check AWS credentials
    if ! aws sts get-caller-identity &>/dev/null; then
        echo "[ERROR] AWS credentials not configured"
        return 1
    }

    # Verify required tools
    local required_tools=(aws docker terraform)
    for tool in "${required_tools[@]}"; do
        if ! command -v "${tool}" &>/dev/null; then
            echo "[ERROR] Required tool not found: ${tool}"
            return 1
        fi
    }

    # Verify access to ECS services
    if ! aws ecs list-clusters &>/dev/null; then
        echo "[ERROR] Unable to access ECS services"
        return 1
    }

    return 0
}

# Get previous deployment details
get_previous_deployment() {
    local environment=$1
    local cluster_name="${PROJECT_NAME}-${environment}"
    
    echo "[INFO] Retrieving previous deployment information..."

    # Get previous task definition
    local service_name="${PROJECT_NAME}-${environment}-service"
    local current_task_def=$(aws ecs describe-services \
        --cluster "${cluster_name}" \
        --services "${service_name}" \
        --query 'services[0].taskDefinition' \
        --output text)

    # Extract previous revision number
    local current_revision=$(echo "${current_task_def}" | grep -o '[0-9]*$')
    local previous_revision=$((current_revision - 1))
    
    # Validate previous task definition exists
    local previous_task_def="${current_task_def%:*}:${previous_revision}"
    if ! aws ecs describe-task-definition \
        --task-definition "${previous_task_def}" &>/dev/null; then
        echo "[ERROR] Previous task definition not found: ${previous_task_def}"
        return 1
    }

    echo "${previous_task_def}"
}

# Rollback ECS deployment
rollback_ecs_deployment() {
    local environment=$1
    local previous_deployment=$2
    local cluster_name="${PROJECT_NAME}-${environment}"
    
    echo "[INFO] Rolling back ECS deployment to: ${previous_deployment}"

    # Stop current tasks with grace period
    local service_name="${PROJECT_NAME}-${environment}-service"
    aws ecs update-service \
        --cluster "${cluster_name}" \
        --service "${service_name}" \
        --task-definition "${previous_deployment}" \
        --force-new-deployment

    # Monitor rollback progress
    local timeout=${HEALTH_CHECK_TIMEOUT}
    while ((timeout > 0)); do
        local deployment_status=$(aws ecs describe-services \
            --cluster "${cluster_name}" \
            --services "${service_name}" \
            --query 'services[0].deployments[0].status' \
            --output text)
        
        if [[ "${deployment_status}" == "PRIMARY" ]]; then
            echo "[INFO] Rollback deployment completed successfully"
            return 0
        fi
        
        ((timeout-=5))
        sleep 5
    done

    echo "[ERROR] Rollback deployment timed out"
    return 1
}

# Rollback infrastructure changes
rollback_infrastructure() {
    local environment=$1
    
    echo "[INFO] Rolling back infrastructure changes..."

    # Initialize Terraform
    cd "${SCRIPT_DIR}/../terraform"
    terraform init -reconfigure

    # Select workspace
    terraform workspace select "${environment}"

    # Verify state file
    if ! terraform state pull &>/dev/null; then
        echo "[ERROR] Unable to access Terraform state"
        return 1
    }

    # Plan rollback
    if ! terraform plan -out=rollback.tfplan; then
        echo "[ERROR] Failed to create rollback plan"
        return 1
    }

    # Apply rollback with auto-approve
    if ! terraform apply -auto-approve rollback.tfplan; then
        echo "[ERROR] Failed to apply rollback changes"
        return 1
    }

    return 0
}

# Verify system stability
verify_system_stability() {
    local environment=$1
    local retries=${MAX_RETRIES}
    
    echo "[INFO] Verifying system stability..."

    while ((retries > 0)); do
        # Check ECS service status
        local service_status=$(aws ecs describe-services \
            --cluster "${PROJECT_NAME}-${environment}" \
            --services "${PROJECT_NAME}-${environment}-service" \
            --query 'services[0].status' \
            --output text)
        
        if [[ "${service_status}" != "ACTIVE" ]]; then
            echo "[WARN] ECS service not stable, retrying..."
            ((retries--))
            sleep 30
            continue
        }

        # Check application health endpoints
        for service in "${SERVICES[@]}"; do
            local health_url="http://${service}.${environment}.internal/health"
            if ! curl -sf "${health_url}" &>/dev/null; then
                echo "[WARN] Health check failed for ${service}, retrying..."
                ((retries--))
                sleep 30
                continue
            fi
        done

        echo "[INFO] System stability verified"
        return 0
    done

    echo "[ERROR] System stability verification failed"
    return 1
}

# Main rollback function
perform_rollback() {
    local environment=$1
    local failure_reason=$2

    echo "[INFO] Initiating rollback process for environment: ${environment}"
    echo "[INFO] Failure reason: ${failure_reason}"

    # Setup logging
    setup_logging

    # Validate environment
    if ! validate_rollback_environment "${environment}"; then
        echo "[ERROR] Environment validation failed"
        return 1
    }

    # Get previous deployment
    local previous_deployment
    if ! previous_deployment=$(get_previous_deployment "${environment}"); then
        echo "[ERROR] Failed to get previous deployment information"
        return 1
    }

    # Perform ECS rollback
    if ! rollback_ecs_deployment "${environment}" "${previous_deployment}"; then
        echo "[ERROR] ECS rollback failed"
        return 1
    }

    # Perform infrastructure rollback if needed
    if [[ "${failure_reason}" == *"infrastructure"* ]]; then
        if ! rollback_infrastructure "${environment}"; then
            echo "[ERROR] Infrastructure rollback failed"
            return 1
        }
    fi

    # Verify system stability
    if ! verify_system_stability "${environment}"; then
        echo "[ERROR] System stability verification failed"
        return 1
    }

    echo "[SUCCESS] Rollback completed successfully"
    return 0
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [[ $# -lt 2 ]]; then
        echo "Usage: $0 <environment> <failure_reason>"
        exit 1
    fi

    perform_rollback "$1" "$2"
fi
```

This rollback script provides a comprehensive solution for automated rollback of ECS deployments and infrastructure changes. Key features include:

1. Robust error handling and logging
2. Environment and prerequisite validation
3. Staged rollback process with health checks
4. Infrastructure state verification
5. System stability monitoring
6. Cleanup and resource management

The script follows best practices for shell scripting:
- Uses strict error checking with `set -euo pipefail`
- Implements comprehensive logging
- Includes proper error handling and cleanup
- Provides clear usage instructions
- Follows modular design with separate functions
- Includes detailed comments for maintainability

Usage:
```bash
./rollback.sh <environment> <failure_reason>
```

Example:
```bash
./rollback.sh production "infrastructure_deployment_failed"