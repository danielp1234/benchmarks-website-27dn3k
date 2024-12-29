// dotenv v16.x - Environment configuration loading
import { config } from 'dotenv';
// winston v3.x - Logging configuration warnings and errors
import { createLogger, format, transports } from 'winston';
import { RedisConfig } from '../interfaces/config.interface';

// Initialize environment variables
config();

// Configure logger for Redis configuration warnings and errors
const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

/**
 * Validates Redis configuration for production environment
 * Ensures all required security and performance settings are properly configured
 */
const validateProductionConfig = (config: RedisConfig): boolean => {
  if (process.env.NODE_ENV === 'production') {
    // Password is required in production
    if (!config.password) {
      logger.error('Redis password is required in production environment');
      return false;
    }

    // Connection pool settings validation
    if (!config.connectionPool || 
        config.connectionPool.min < 5 || 
        config.connectionPool.max > 100) {
      logger.error('Invalid connection pool configuration for production');
      return false;
    }

    // Retry strategy validation
    if (!config.retryStrategy || 
        !config.retryStrategy.retries || 
        config.retryStrategy.retries < 3) {
      logger.error('Invalid retry strategy configuration for production');
      return false;
    }

    // Sentinel configuration validation if enabled
    if (config.sentinel?.enabled && 
        (!config.sentinel.master || config.sentinel.nodes.length === 0)) {
      logger.error('Invalid sentinel configuration');
      return false;
    }
  }
  return true;
};

/**
 * Retrieves and validates Redis configuration from environment variables
 * Provides secure defaults and advanced configuration options
 */
const getRedisConfig = (): RedisConfig => {
  const config: RedisConfig = {
    // Basic connection settings
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    ttl: parseInt(process.env.REDIS_TTL || '300', 10), // Default 5 minutes
    clusterMode: process.env.REDIS_CLUSTER_MODE === 'true',

    // Connection pool configuration for optimal performance
    connectionPool: {
      min: parseInt(process.env.REDIS_POOL_MIN || '5', 10),
      max: parseInt(process.env.REDIS_POOL_MAX || '20', 10),
      acquireTimeoutMillis: 5000,
      createTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      evictionRunIntervalMillis: 15000,
    },

    // Retry strategy with exponential backoff
    retryStrategy: {
      retries: 3,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 10000,
      randomize: true,
    },

    // Sentinel configuration for high availability
    sentinel: {
      enabled: process.env.REDIS_SENTINEL_ENABLED === 'true',
      master: process.env.REDIS_SENTINEL_MASTER || 'mymaster',
      nodes: process.env.REDIS_SENTINEL_NODES ? 
        JSON.parse(process.env.REDIS_SENTINEL_NODES) : 
        [],
      password: process.env.REDIS_SENTINEL_PASSWORD,
    },

    // Compression options for optimizing network bandwidth
    compression: {
      enabled: true,
      threshold: 1024, // Compress data larger than 1KB
    },

    // Advanced options
    enableReadyCheck: true,
    enableOfflineQueue: true,
    connectTimeout: 10000,
    disconnectTimeout: 2000,
    keepAlive: 30000,
    noDelay: true,
    autoResubscribe: true,
    autoResendUnfulfilledCommands: true,
    maxRetriesPerRequest: 3,
    
    // Monitoring and metrics
    enablePerformanceMetrics: true,
    metricsSampleRate: 10, // Sample every 10 seconds
  };

  // Validate configuration for production environment
  if (!validateProductionConfig(config)) {
    throw new Error('Invalid Redis configuration for production environment');
  }

  // Log configuration summary
  logger.info('Redis configuration initialized', {
    host: config.host,
    port: config.port,
    clusterMode: config.clusterMode,
    sentinel: config.sentinel.enabled,
  });

  return config;
};

// Export the Redis configuration
export const redisConfig = getRedisConfig();