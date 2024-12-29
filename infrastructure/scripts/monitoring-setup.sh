#!/bin/bash
set -euo pipefail

# Monitoring Stack Setup Script v1.0.0
# Purpose: Automates the setup and configuration of the monitoring stack for SaaS Benchmarks Platform
# Components: Grafana, Prometheus, Loki, Tempo

# Global variables
readonly GRAFANA_VERSION="9.5.x"
readonly PROMETHEUS_VERSION="2.45.x"
readonly LOKI_VERSION="2.8.x"
readonly TEMPO_VERSION="2.2.x"
readonly MONITORING_DIR="/opt/monitoring"
readonly LOG_DIR="/var/log/monitoring"
readonly BACKUP_DIR="/opt/monitoring/backups"
readonly RETENTION_DAYS="30"
readonly SCRAPE_INTERVAL="10s"
readonly ALERT_INTERVAL="30s"

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message=$*
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "${LOG_DIR}/setup.log"
}

# Error handling function
handle_error() {
    local exit_code=$?
    local line_number=$1
    log "ERROR" "Failed at line ${line_number} with exit code ${exit_code}"
    cleanup_failed_install
    exit "${exit_code}"
}

trap 'handle_error ${LINENO}' ERR

# Cleanup function for failed installations
cleanup_failed_install() {
    log "INFO" "Cleaning up failed installation..."
    docker-compose down -v || true
    rm -rf "${MONITORING_DIR}/tmp" || true
}

# Check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites..."

    # Check Docker installation
    if ! command -v docker &> /dev/null; then
        log "ERROR" "Docker is not installed"
        return 1
    fi

    # Check Docker Compose installation
    if ! command -v docker-compose &> /dev/null; then
        log "ERROR" "Docker Compose is not installed"
        return 1
    }

    # Check minimum system requirements
    local mem_total=$(free -g | awk '/^Mem:/{print $2}')
    if [ "${mem_total}" -lt 4 ]; then
        log "ERROR" "Insufficient memory. Minimum 4GB required"
        return 1
    fi

    # Check disk space
    local disk_space=$(df -BG "${MONITORING_DIR}" | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "${disk_space}" -lt 20 ]; then
        log "ERROR" "Insufficient disk space. Minimum 20GB required"
        return 1
    }

    # Check required ports availability
    local required_ports=(3000 9090 3100 3200)
    for port in "${required_ports[@]}"; do
        if netstat -tuln | grep -q ":${port} "; then
            log "ERROR" "Port ${port} is already in use"
            return 1
        fi
    done

    log "INFO" "Prerequisites check passed"
    return 0
}

# Setup Grafana
setup_grafana() {
    log "INFO" "Setting up Grafana ${GRAFANA_VERSION}..."

    # Create required directories
    mkdir -p "${MONITORING_DIR}/grafana/"{conf,data,dashboards,provisioning}
    
    # Backup existing configuration if present
    if [ -f "${MONITORING_DIR}/grafana/conf/grafana.ini" ]; then
        cp "${MONITORING_DIR}/grafana/conf/grafana.ini" "${BACKUP_DIR}/grafana.ini.$(date +%Y%m%d_%H%M%S)"
    fi

    # Configure Grafana security settings
    cat > "${MONITORING_DIR}/grafana/conf/grafana.ini" <<EOF
[security]
admin_user = admin
admin_password = ${GRAFANA_ADMIN_PASSWORD:-admin}
disable_gravatar = true
cookie_secure = true
cookie_samesite = strict
allow_embedding = false

[auth]
disable_login_form = false
oauth_auto_login = false
disable_signout_menu = false

[users]
allow_sign_up = false
auto_assign_org_role = Viewer

[metrics]
enabled = true
basic_auth_username = metrics
basic_auth_password = ${GRAFANA_METRICS_PASSWORD:-metrics}

[log]
mode = console file
level = info
EOF

    # Setup datasource provisioning
    cat > "${MONITORING_DIR}/grafana/provisioning/datasources/datasources.yaml" <<EOF
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    jsonData:
      timeInterval: "${SCRAPE_INTERVAL}"
      httpMethod: POST
    version: 1
    editable: false

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    jsonData:
      maxLines: 1000
    version: 1
    editable: false

  - name: Tempo
    type: tempo
    access: proxy
    url: http://tempo:3200
    jsonData:
      httpMethod: GET
      serviceMap:
        datasourceUid: prometheus
    version: 1
    editable: false
EOF

    # Copy API dashboard
    cp -f "${MONITORING_DIR}/grafana/dashboards/api.json" "${MONITORING_DIR}/grafana/dashboards/"

    log "INFO" "Grafana setup completed"
    return 0
}

# Setup Prometheus
setup_prometheus() {
    log "INFO" "Setting up Prometheus ${PROMETHEUS_VERSION}..."

    # Create required directories
    mkdir -p "${MONITORING_DIR}/prometheus/"{conf,data,rules}

    # Backup existing configuration if present
    if [ -f "${MONITORING_DIR}/prometheus/conf/prometheus.yml" ]; then
        cp "${MONITORING_DIR}/prometheus/conf/prometheus.yml" "${BACKUP_DIR}/prometheus.yml.$(date +%Y%m%d_%H%M%S)"
    fi

    # Copy and validate Prometheus configuration
    cp -f "${MONITORING_DIR}/prometheus/prometheus.yml" "${MONITORING_DIR}/prometheus/conf/"
    
    # Setup alert rules
    cat > "${MONITORING_DIR}/prometheus/rules/alerts.yml" <<EOF
groups:
  - name: ApiAlerts
    rules:
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 2
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High API response time
          description: 95th percentile response time is above 2 seconds

      - alert: HighErrorRate
        expr: sum(rate(http_requests_errors_total[5m])) / sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate
          description: Error rate is above 5%
EOF

    # Set correct permissions
    chown -R nobody:nogroup "${MONITORING_DIR}/prometheus"
    chmod -R 755 "${MONITORING_DIR}/prometheus"

    log "INFO" "Prometheus setup completed"
    return 0
}

# Setup Loki
setup_loki() {
    log "INFO" "Setting up Loki ${LOKI_VERSION}..."

    # Create required directories
    mkdir -p "${MONITORING_DIR}/loki/"{conf,data,rules}

    # Backup existing configuration if present
    if [ -f "${MONITORING_DIR}/loki/conf/loki.yml" ]; then
        cp "${MONITORING_DIR}/loki/conf/loki.yml" "${BACKUP_DIR}/loki.yml.$(date +%Y%m%d_%H%M%S)"
    fi

    # Copy and validate Loki configuration
    cp -f "${MONITORING_DIR}/loki/loki.yml" "${MONITORING_DIR}/loki/conf/"

    # Set correct permissions
    chown -R nobody:nogroup "${MONITORING_DIR}/loki"
    chmod -R 755 "${MONITORING_DIR}/loki"

    log "INFO" "Loki setup completed"
    return 0
}

# Setup Tempo
setup_tempo() {
    log "INFO" "Setting up Tempo ${TEMPO_VERSION}..."

    # Create required directories
    mkdir -p "${MONITORING_DIR}/tempo/"{conf,data}

    # Backup existing configuration if present
    if [ -f "${MONITORING_DIR}/tempo/conf/tempo.yml" ]; then
        cp "${MONITORING_DIR}/tempo/conf/tempo.yml" "${BACKUP_DIR}/tempo.yml.$(date +%Y%m%d_%H%M%S)"
    fi

    # Copy and validate Tempo configuration
    cp -f "${MONITORING_DIR}/tempo/tempo.yml" "${MONITORING_DIR}/tempo/conf/"

    # Set correct permissions
    chown -R nobody:nogroup "${MONITORING_DIR}/tempo"
    chmod -R 755 "${MONITORING_DIR}/tempo"

    log "INFO" "Tempo setup completed"
    return 0
}

# Verify monitoring stack setup
verify_setup() {
    log "INFO" "Verifying monitoring stack setup..."
    local retry_count=0
    local max_retries=30
    local services=("grafana:3000" "prometheus:9090" "loki:3100" "tempo:3200")

    # Wait for services to be healthy
    while [ ${retry_count} -lt ${max_retries} ]; do
        local all_healthy=true
        
        for service in "${services[@]}"; do
            IFS=':' read -r name port <<< "${service}"
            if ! curl -s "http://localhost:${port}/-/healthy" &> /dev/null; then
                all_healthy=false
                break
            fi
        done

        if [ "${all_healthy}" = true ]; then
            log "INFO" "All services are healthy"
            return 0
        fi

        retry_count=$((retry_count + 1))
        sleep 2
    done

    log "ERROR" "Monitoring stack verification failed"
    return 1
}

# Main setup function
main() {
    log "INFO" "Starting monitoring stack setup..."

    # Create required directories
    mkdir -p "${MONITORING_DIR}" "${LOG_DIR}" "${BACKUP_DIR}"

    # Check prerequisites
    if ! check_prerequisites; then
        log "ERROR" "Prerequisites check failed"
        exit 1
    fi

    # Setup individual components
    setup_grafana
    setup_prometheus
    setup_loki
    setup_tempo

    # Start monitoring stack
    log "INFO" "Starting monitoring stack..."
    docker-compose -f "${MONITORING_DIR}/docker-compose.yml" up -d

    # Verify setup
    if ! verify_setup; then
        log "ERROR" "Monitoring stack verification failed"
        exit 1
    fi

    log "INFO" "Monitoring stack setup completed successfully"
    
    # Print access information
    echo -e "\n${GREEN}Monitoring Stack Setup Complete!${NC}"
    echo -e "Access URLs:"
    echo -e "Grafana: http://localhost:3000"
    echo -e "Prometheus: http://localhost:9090"
    echo -e "Loki: http://localhost:3100"
    echo -e "Tempo: http://localhost:3200\n"
}

# Execute main function
main "$@"