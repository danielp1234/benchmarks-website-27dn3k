/**
 * @file Central Configuration Module
 * @description Aggregates, validates, and exports all application configuration settings
 * for the SaaS Benchmarks Platform with enhanced security and performance features
 * @version 1.0.0
 */

import { config } from 'dotenv'; // v16.x
import { authConfig } from './auth.config';
import { cacheConfig } from './cache.config';
import { databaseConfig } from './database.config';
import { metricsConfig } from './metrics.config';
import { serverConfig } from './server.config';

// Initialize environment variables
config();

// Environment type validation
const NODE_ENV = process.env.NODE_ENV || 'development';
const VALID_ENVIRONMENTS = ['development', 'staging', 'production'];

if (!VALID_ENVIRONMENTS.includes(NODE_ENV)) {
  throw new Error(`Invalid NODE_ENV: ${NODE_ENV}. Must be one of: ${VALID_ENVIRONMENTS.join(', ')}`);
}

/**
 * Validates all configuration components for security and performance requirements
 * Implements comprehensive validation based on technical specifications
 * @throws Error with detailed validation message if configuration is invalid
 */
function validateConfigurations(): void {
  const errors: string[] = [];

  try {
    // Production-specific validations
    if (NODE_ENV === 'production') {
      // Validate SSL enforcement
      if (!databaseConfig.ssl) {
        errors.push('SSL must be enabled for database in production');
      }

      // Validate secure session settings
      if (!authConfig.session.cookie.secure) {
        errors.push('Secure cookie flag must be enabled in production');
      }

      // Validate Redis TLS
      if (!cacheConfig.tls?.enabled) {
        errors.push('Redis TLS must be enabled in production');
      }
    }

    // Cross-component validation
    // Validate cache TTL against session duration
    if (cacheConfig.ttl > authConfig.session.ttl) {
      errors.push('Cache TTL cannot exceed session duration');
    }

    // Validate rate limiting configuration
    if (serverConfig.rateLimit.windowMs < 1000) {
      errors.push('Rate limit window must be at least 1000ms');
    }

    // Validate database pool size against server configuration
    const maxConnections = serverConfig.rateLimit.max * 0.1; // 10% of max requests
    if (databaseConfig.poolSize > maxConnections) {
      errors.push('Database pool size exceeds recommended maximum based on rate limit');
    }

    // Validate metrics configuration against cache settings
    if (metricsConfig.caching.ttl > cacheConfig.ttl) {
      errors.push('Metrics cache TTL cannot exceed global cache TTL');
    }

  } catch (error) {
    errors.push(`Configuration validation error: ${(error as Error).message}`);
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

// Validate configurations before creating the unified config object
validateConfigurations();

/**
 * Unified configuration object combining all component configurations
 * Implements configuration requirements from technical specification
 */
export const config = {
  // Environment information
  env: NODE_ENV,
  isProduction: NODE_ENV === 'production',
  isDevelopment: NODE_ENV === 'development',
  isStaging: NODE_ENV === 'staging',

  // Component configurations
  auth: authConfig,
  cache: cacheConfig,
  database: databaseConfig,
  metrics: metricsConfig,
  server: serverConfig,

  // System-wide settings
  system: {
    version: process.env.npm_package_version || '1.0.0',
    name: 'SaaS Benchmarks Platform',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com',
    maxRequestSize: '10mb',
    timezone: 'UTC',
    encoding: 'utf-8',
    apiVersion: 'v1',
  },

  // Performance settings
  performance: {
    targetResponseTime: 2000, // 2 seconds as per requirements
    maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '1000', 10),
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10),
    gracefulShutdownTimeout: parseInt(process.env.SHUTDOWN_TIMEOUT || '10000', 10),
  },
} as const; // Make configuration immutable

// Export validation utility for use in other modules
export { validateConfigurations };

// Export individual configurations for granular access
export {
  authConfig,
  cacheConfig,
  databaseConfig,
  metricsConfig,
  serverConfig,
};