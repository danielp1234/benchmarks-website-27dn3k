# Stage 1: Base stage with common configurations
FROM node:18-alpine AS base

# Security: Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install required system dependencies
RUN apk add --no-cache curl=8.4.0-r0 tini=0.19.0-r1

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install production dependencies with npm ci for consistent installs
RUN npm ci --only=production && \
    # Security: Set proper permissions
    chown -R appuser:appgroup /app && \
    chmod -R 755 /app

# Stage 2: Development stage
FROM base AS development

# Switch to non-root user
USER appuser

# Install development dependencies
RUN npm ci

# Configure nodemon for hot reloading
COPY nodemon.json ./

# Copy source code and config files
COPY --chown=appuser:appgroup . .

# Expose development ports
EXPOSE 3000 9229

# Set development environment
ENV NODE_ENV=development \
    NODE_OPTIONS="--max-old-space-size=2048" \
    PORT=3000

# Start development server with hot reload
CMD ["npm", "run", "dev"]

# Stage 3: Builder stage for TypeScript compilation
FROM base AS builder

# Copy source code and TypeScript config
COPY --chown=appuser:appgroup . .

# Install all dependencies including devDependencies
RUN npm ci

# Run TypeScript compilation with optimizations
RUN npm run build && \
    # Remove source files and devDependencies
    npm prune --production && \
    rm -rf src tests

# Stage 4: Production stage
FROM base AS production

# Copy compiled JavaScript from builder stage
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --chown=appuser:appgroup package.json ./

# Switch to non-root user
USER appuser

# Expose production port
EXPOSE 3000

# Set production environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    NODE_OPTIONS="--max-old-space-size=2048" \
    SECURITY_HEADERS=true

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start production server with clustering
CMD ["npm", "start"]