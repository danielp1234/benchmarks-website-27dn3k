#!/bin/bash

# SaaS Benchmarks Platform Database Backup Script
# Version: 1.0.0
# Dependencies:
# - aws-cli v2.x
# - postgresql-client v14
# - pigz (parallel gzip)

set -euo pipefail

# Global Configuration
BACKUP_RETENTION_DAYS=30
TIMESTAMP_FORMAT=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="/tmp/backups"
LOG_PATH="/var/log/saas-benchmarks/backups"
COMPRESSION_THREADS=4
WAL_ARCHIVE_PATH="/var/lib/postgresql/wal_archive"

# Logging Configuration
mkdir -p "${LOG_PATH}"
exec 1> >(tee -a "${LOG_PATH}/backup_${TIMESTAMP_FORMAT}.log")
exec 2>&1

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
    exit 1
}

# Function to check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed"
    fi
    
    # Check PostgreSQL client
    if ! command -v pg_dump &> /dev/null; then
        error "PostgreSQL client tools are not installed"
    fi
    
    # Check pigz for parallel compression
    if ! command -v pigz &> /dev/null; then
        error "pigz is not installed"
    }
    
    # Verify AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials are not properly configured"
    }
    
    # Check backup directories
    mkdir -p "${BACKUP_PATH}" "${WAL_ARCHIVE_PATH}"
    chmod 700 "${BACKUP_PATH}" "${WAL_ARCHIVE_PATH}"
    
    log "Prerequisites check completed successfully"
    return 0
}

# Function to create database backup
create_backup() {
    local db_host="$1"
    local db_name="$2"
    local db_user="$3"
    local backup_file="${BACKUP_PATH}/${db_name}_${TIMESTAMP_FORMAT}.dump"
    
    log "Starting backup of database ${db_name}"
    
    # Start WAL archiving
    psql -h "${db_host}" -U "${db_user}" -d "${db_name}" -c "SELECT pg_start_backup('${TIMESTAMP_FORMAT}', true)"
    
    # Create backup using pg_dump with custom format
    PGPASSWORD="${PGPASSWORD:-}" pg_dump \
        -h "${db_host}" \
        -U "${db_user}" \
        -d "${db_name}" \
        -F c \
        -b \
        -v \
        -f "${backup_file}" \
        --no-owner \
        --no-acl
    
    # Stop WAL archiving
    psql -h "${db_host}" -U "${db_user}" -d "${db_name}" -c "SELECT pg_stop_backup()"
    
    # Compress backup using pigz
    pigz -p "${COMPRESSION_THREADS}" "${backup_file}"
    
    # Calculate SHA256 checksum
    sha256sum "${backup_file}.gz" > "${backup_file}.gz.sha256"
    
    log "Backup completed: ${backup_file}.gz"
    echo "${backup_file}.gz"
}

# Function to upload backup to S3
upload_to_s3() {
    local backup_file="$1"
    local s3_bucket="$2"
    local backup_name=$(basename "${backup_file}")
    
    log "Uploading backup to S3: ${backup_name}"
    
    # Upload backup file with server-side encryption
    aws s3 cp "${backup_file}" \
        "s3://${s3_bucket}/database/${backup_name}" \
        --storage-class STANDARD_IA \
        --server-side-encryption AES256 \
        --metadata "timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ),checksum=$(cat ${backup_file}.sha256)"
    
    # Upload WAL files
    aws s3 sync \
        "${WAL_ARCHIVE_PATH}" \
        "s3://${s3_bucket}/wal/${TIMESTAMP_FORMAT}/" \
        --storage-class STANDARD_IA \
        --server-side-encryption AES256
    
    log "Upload completed successfully"
    
    # Cleanup local files
    rm -f "${backup_file}" "${backup_file}.sha256"
    find "${WAL_ARCHIVE_PATH}" -type f -mtime +1 -delete
    
    return 0
}

# Function to cleanup old backups
cleanup_old_backups() {
    local s3_bucket="$1"
    local retention_days="$2"
    
    log "Starting cleanup of backups older than ${retention_days} days"
    
    # List and delete old backups
    aws s3 ls "s3://${s3_bucket}/database/" \
        | while read -r line; do
            timestamp=$(echo "$line" | awk '{print $1" "$2}')
            file=$(echo "$line" | awk '{print $4}')
            if [[ $(date -d "${timestamp}" +%s) -lt $(date -d "-${retention_days} days" +%s) ]]; then
                log "Deleting old backup: ${file}"
                aws s3 rm "s3://${s3_bucket}/database/${file}"
            fi
        done
    
    # Cleanup old WAL archives
    aws s3 ls "s3://${s3_bucket}/wal/" \
        | while read -r line; do
            timestamp=$(echo "$line" | awk '{print $1" "$2}')
            dir=$(echo "$line" | awk '{print $4}')
            if [[ $(date -d "${timestamp}" +%s) -lt $(date -d "-${retention_days} days" +%s) ]]; then
                log "Deleting old WAL archive: ${dir}"
                aws s3 rm "s3://${s3_bucket}/wal/${dir}" --recursive
            fi
        done
    
    log "Cleanup completed successfully"
    return 0
}

# Main execution
main() {
    log "Starting backup process"
    
    # Check prerequisites
    check_prerequisites || error "Prerequisites check failed"
    
    # Get database details from RDS
    DB_INSTANCE=$(aws rds describe-db-instances --query 'DBInstances[0].[Endpoint.Address,DBName]' --output text)
    DB_HOST=$(echo "${DB_INSTANCE}" | cut -f1)
    DB_NAME=$(echo "${DB_INSTANCE}" | cut -f2)
    DB_USER="admin"
    
    # Get S3 bucket name
    S3_BUCKET=$(aws s3api list-buckets --query 'Buckets[?contains(Name, `backups`)].Name' --output text)
    
    # Create backup
    BACKUP_FILE=$(create_backup "${DB_HOST}" "${DB_NAME}" "${DB_USER}") || error "Backup creation failed"
    
    # Upload to S3
    upload_to_s3 "${BACKUP_FILE}" "${S3_BUCKET}" || error "Backup upload failed"
    
    # Cleanup old backups
    cleanup_old_backups "${S3_BUCKET}" "${BACKUP_RETENTION_DAYS}" || error "Backup cleanup failed"
    
    log "Backup process completed successfully"
}

# Execute main function
main "$@"