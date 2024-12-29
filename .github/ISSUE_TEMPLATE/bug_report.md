---
name: Bug Report
about: Create a detailed bug report to help improve system performance and data accuracy
title: '[BUG] '
labels: bug
assignees: ''
---

# Bug Description
**Clear and concise description of what the bug is:**
<!-- Provide a focused description of the bug, particularly noting any impacts on system performance or data accuracy -->

**Expected behavior:**
<!-- Reference specific system requirements (e.g., < 2s response time, 100% data validation) -->

**Actual behavior:**
<!-- Include specific metrics and measured impacts -->

**Steps to reproduce:**
1. 
2. 
3. 
4. 

**Related issues/PRs:**
<!-- Link any related issues or pull requests -->

## Environment Details
**Environment:**
- [ ] Production
- [ ] Staging
- [ ] Development

**Browser:**
- Name: 
- Version:
- Extensions: <!-- List any relevant extensions -->

**System Configuration:**
- Operating System:
- Network Conditions:
- AWS Region:
- Service Versions:
- Feature Flags:

## Impact Assessment
**Severity Level:**
- [ ] P0 (Critical) - System downtime or data corruption
- [ ] P1 (High) - Major functionality broken
- [ ] P2 (Medium) - Feature partially broken
- [ ] P3 (Low) - Minor issue

**Performance Impact:**
<!-- Include specific metrics (response times, load times, etc.) -->
- Response Time Impact:
- System Load Impact:
- Resource Utilization:

**Data Accuracy Impact:**
<!-- Detail any data validation or accuracy issues -->
- Data Integrity Status:
- Validation Failures:
- Data Source Affected:

**Scope of Impact:**
- Number of Users Affected:
- Business Impact:
- Compliance Implications:

## Technical Details
**Error Messages:**
```
<!-- Insert full stack traces here -->
```

**Log Snippets:**
```
<!-- Insert relevant sanitized logs -->
```

**Performance Metrics:**
```
<!-- Insert relevant performance data -->
```

**Affected Components:**
- API Endpoints:
- Database Queries:
- Services:

<!-- Attach screenshots or recordings if applicable -->

## Verification Checklist
### Initial Verification
- [ ] Searched for similar bug reports
- [ ] Verified bug is reproducible
- [ ] Checked latest version
- [ ] Collected error logs
- [ ] Verified system configuration
- [ ] Documented reproduction steps

### Impact Analysis
- [ ] Data integrity verified
- [ ] Performance impact measured
- [ ] Security implications reviewed
- [ ] User experience impact evaluated
- [ ] Compliance requirements checked
- [ ] Business impact assessed

### Technical Assessment
- [ ] Error logs collected
- [ ] Stack traces documented
- [ ] Database queries verified
- [ ] API responses checked
- [ ] Client-side errors logged
- [ ] Network issues investigated

## Labels
<!-- Do not edit below this line -->
/label ~bug
<!-- Select appropriate severity -->
/label ~"severity::critical-p0" or ~"severity::high-p1" or ~"severity::medium-p2" or ~"severity::low-p3"
<!-- Select affected component -->
/label ~"component::frontend-ui" or ~"component::backend-api" or ~"component::database" or ~"component::infrastructure" or ~"component::authentication" or ~"component::metrics-service" or ~"component::export-service"
<!-- Select impact area -->
/label ~"impact::performance" or ~"impact::data-accuracy" or ~"impact::security" or ~"impact::user-experience"