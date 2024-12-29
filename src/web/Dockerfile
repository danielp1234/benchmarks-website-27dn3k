# Stage 1: Development
FROM node:18-alpine AS development
LABEL stage=development

# Install dependencies for development
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies including devDependencies
RUN npm ci

# Copy source code and config files
COPY . .

# Set development environment variables
ENV NODE_ENV=development \
    VITE_APP_ENV=development \
    VITE_API_BASE_URL=http://localhost:3000

# Expose Vite dev server port
EXPOSE 5173

# Health check for development server
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:5173/health || exit 1

# Start development server
CMD ["npm", "run", "dev"]

# Stage 2: Builder
FROM node:18-alpine AS builder
LABEL stage=builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --production=false

# Copy source code and config files
COPY . .

# Set production environment variables
ENV NODE_ENV=production \
    VITE_APP_ENV=production \
    VITE_API_BASE_URL=https://api.saas-benchmarks.com

# Build the application
RUN npm run build

# Stage 3: Production
FROM nginx:1.24-alpine AS production
LABEL stage=production

# Install dependencies for health check
RUN apk add --no-cache curl

# Create nginx user and group
RUN addgroup -g 101 -S nginx \
    && adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx nginx

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx-security-headers.conf /etc/nginx/security-headers.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Set correct permissions
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chmod -R 755 /usr/share/nginx/html

# Create cache directories with correct permissions
RUN mkdir -p /var/cache/nginx \
    && chown -R nginx:nginx /var/cache/nginx \
    && chmod -R 755 /var/cache/nginx

# Configure nginx security
RUN rm /etc/nginx/conf.d/default.conf \
    && mkdir -p /etc/nginx/conf.d \
    && chown -R nginx:nginx /etc/nginx \
    && touch /var/run/nginx.pid \
    && chown nginx:nginx /var/run/nginx.pid

# Switch to non-root user
USER nginx

# Expose HTTP port
EXPOSE 80

# Health check for production server
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]

# Build-time metadata
LABEL maintainer="SaaS Benchmarks Platform Team" \
    version="1.0.0" \
    description="SaaS Benchmarks Platform Frontend" \
    org.opencontainers.image.source="https://github.com/saas-benchmarks/frontend" \
    org.opencontainers.image.licenses="UNLICENSED"
```

This Dockerfile implements a three-stage build process optimized for development, building, and production deployment of the React frontend application. Here's a breakdown of each stage:

1. Development Stage:
- Uses Node.js 18 Alpine as base image
- Installs all dependencies including devDependencies
- Sets up development environment with hot reloading
- Configures health checks for the Vite dev server

2. Builder Stage:
- Creates an optimized production build
- Uses TypeScript compilation
- Generates static assets in the /app/dist directory

3. Production Stage:
- Uses Nginx 1.24 Alpine for serving static files
- Implements security best practices
- Runs as non-root user
- Includes health checks
- Optimized for production serving

Key Security Features:
- Non-root user execution
- Minimal base images
- Security headers configuration
- Proper file permissions
- Health checks for monitoring

The Dockerfile follows best practices for:
- Multi-stage builds to minimize final image size
- Layer caching optimization
- Security hardening
- Environment-specific configurations
- Health monitoring
- Proper labeling and metadata

To build and run the different stages:

Development:
```bash
docker build --target development -t saas-benchmarks-web:dev .
docker run -p 5173:5173 -v .:/app saas-benchmarks-web:dev
```

Production:
```bash
docker build --target production -t saas-benchmarks-web:prod .
docker run -p 80:80 saas-benchmarks-web:prod