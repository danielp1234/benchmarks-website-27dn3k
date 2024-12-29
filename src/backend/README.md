# SaaS Benchmarks Platform - Backend Service

Enterprise-grade backend service for the SaaS Benchmarks Platform providing benchmark data management, authentication, and API services.

## Overview

The SaaS Benchmarks Platform backend is a Node.js-based microservices architecture that powers the benchmark data management and API services. It provides secure access to SaaS performance metrics across 14 key performance indicators (KPIs) with comprehensive filtering capabilities.

### Key Features
- RESTful API for benchmark data access and management
- Role-based access control with Google OAuth authentication
- Multi-tenant data management with PostgreSQL
- High-performance caching with Redis
- Comprehensive logging and monitoring
- Enterprise-grade security measures

### Technical Stack
- Runtime: Node.js 18.x LTS with TypeScript 5.x
- Database: PostgreSQL 14
- Caching: Redis 7.x
- Containerization: Docker & Docker Compose
- Authentication: Google OAuth 2.0
- Testing: Jest & Supertest

## Quick Start

```bash
# Clone repository
git clone <repository_url>
cd saas-benchmarks-backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start development environment
docker-compose up -d
npm run dev
```

## Prerequisites

### Required Software
- Node.js >= 18.0.0
- PostgreSQL 14
- Redis 7
- Docker >= 20.10.0
- Docker Compose >= 2.0.0

### System Requirements
- Memory: 4GB RAM minimum
- Storage: 20GB available space
- CPU: 2 cores minimum

## Development Setup

### Environment Configuration

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Configure required environment variables:
```plaintext
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
REDIS_HOST=localhost
REDIS_PORT=6379
GOOGLE_CLIENT_ID=your_google_client_id
JWT_SECRET=your_jwt_secret
```

### Database Setup

```bash
# Run migrations
npm run migrate:latest

# Seed development data
npm run seed:run
```

### Local Development

```bash
# Start development environment
docker-compose up -d

# Start development server with hot reload
npm run dev
```

## Architecture

### Component Architecture
- API Gateway Service
- Authentication Service
- Metrics Service
- Export Service
- Data Management Service

### Data Flow
1. Request validation and authentication
2. Business logic processing
3. Data retrieval/manipulation
4. Response formatting
5. Caching strategy

## API Documentation

### Authentication
- Google OAuth 2.0 for admin authentication
- JWT-based session management
- Rate limiting: 1000 requests/hour per IP

### Core Endpoints

#### Public API
```plaintext
GET /api/v1/metrics
GET /api/v1/metrics/:id
GET /api/v1/benchmarks
GET /api/v1/sources
```

#### Admin API
```plaintext
POST /api/v1/admin/metrics
PUT /api/v1/admin/metrics/:id
DELETE /api/v1/admin/metrics/:id
POST /api/v1/admin/import
```

## Database Management

### Schema Management
```bash
# Create new migration
npm run migrate:make migration_name

# Run migrations
npm run migrate:latest

# Rollback migrations
npm run migrate:rollback
```

### Backup Procedures
- Daily automated backups
- Point-in-time recovery
- 30-day retention period

## Testing

### Running Tests
```bash
# Run all tests
npm run test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Generate coverage report
npm run test:coverage
```

### Testing Strategy
- Unit tests for business logic
- Integration tests for API endpoints
- E2E tests for critical flows
- Performance testing for scalability

## Security

### Security Measures
- TLS 1.3 encryption
- CORS policy enforcement
- Rate limiting
- Input validation
- SQL injection prevention
- XSS protection

### Authentication Flow
1. Google OAuth authentication
2. JWT token generation
3. Role-based access control
4. Session management

## Deployment

### Production Deployment
```bash
# Build application
npm run build

# Start production server
npm run start
```

### Environment Configuration
- Multi-stage Docker builds
- Environment-specific configurations
- Secrets management
- Health monitoring

## Troubleshooting

### Common Issues
1. Database connection errors
2. Redis connection issues
3. Authentication failures
4. Performance bottlenecks

### Debugging
```bash
# Enable debug logs
DEBUG=app:* npm run dev

# Check service health
docker-compose ps
docker-compose logs -f
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build TypeScript to JavaScript |
| `npm run test` | Run all tests |
| `npm run lint` | Run ESLint for code quality |
| `npm run format` | Format code using Prettier |

## License

Copyright © 2023 SaaS Benchmarks Platform. All rights reserved.