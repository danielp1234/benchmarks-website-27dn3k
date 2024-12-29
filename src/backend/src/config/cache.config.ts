import { config } from 'dotenv'; // v16.x
import { RedisConfig } from '../interfaces/config.interface';
import dns from 'dns';
import { promisify } from 'util';

// Initialize environment variables
config();

// Constants for cache configuration
const CACHE_PREFIX = 'saas_benchmarks:';
const DEFAULT_CACHE_TTL = 300; // 5 minutes in seconds
const DEFAULT_CACHE_HOST = 'localhost';
const DEFAULT_CACHE_PORT = 6379;
const MAX_MEMORY_POLICY = 'allkeys-lru';
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const CONNECTION_TIMEOUT = 5000; // 5 seconds

/**
 * Validates Redis configuration parameters for security and performance
 * @param config - Redis configuration object to validate
 * @returns boolean indicating if configuration is valid
 * @throws Error with detailed validation message if config is invalid
 */
const validateRedisConfig = (config: RedisConfig): boolean => {
  // Host validation
  if (!config.host || typeof config.host !== 'string') {
    throw new Error('Invalid Redis host configuration');
  }

  // Port validation (must be between 1024 and 65535)
  if (!config.port || config.port < 1024 || config.port > 65535) {
    throw new Error('Invalid Redis port: must be between 1024 and 65535');
  }

  // Password validation (if provided)
  if (config.password && config.password.length < 16) {
    throw new Error('Redis password must be at least 16 characters long');
  }

  // TTL validation (minimum 60 seconds)
  if (config.ttl < 60) {
    throw new Error('Cache TTL must be at least 60 seconds');
  }

  // Cluster mode validation
  if (config.clusterMode && (!config.nodes || config.nodes.length < 2)) {
    throw new Error('Cluster mode requires at least 2 nodes');
  }

  return true;
};

/**
 * Retrieves and validates Redis cache configuration
 * Implements fallback mechanisms and security best practices
 * @returns RedisConfig object with comprehensive cache settings
 */
const getCacheConfig = async (): Promise<RedisConfig> => {
  // DNS resolution for Redis host
  const lookup = promisify(dns.lookup);
  const resolvedHost = await lookup(process.env.REDIS_HOST || DEFAULT_CACHE_HOST)
    .then(result => result.address)
    .catch(() => DEFAULT_CACHE_HOST);

  const config: RedisConfig = {
    host: resolvedHost,
    port: parseInt(process.env.REDIS_PORT || DEFAULT_CACHE_PORT.toString(), 10),
    password: process.env.REDIS_PASSWORD || '',
    ttl: parseInt(process.env.REDIS_TTL || DEFAULT_CACHE_TTL.toString(), 10),
    clusterMode: process.env.REDIS_CLUSTER_MODE === 'true',
    keyPrefix: CACHE_PREFIX,

    // TLS Configuration
    tls: {
      enabled: process.env.REDIS_TLS_ENABLED === 'true',
      rejectUnauthorized: true,
      ca: process.env.REDIS_TLS_CA,
      cert: process.env.REDIS_TLS_CERT,
      key: process.env.REDIS_TLS_KEY,
    },

    // Connection Pool Configuration
    connectionPool: {
      min: parseInt(process.env.REDIS_POOL_MIN || '5', 10),
      max: parseInt(process.env.REDIS_POOL_MAX || '20', 10),
      acquireTimeoutMillis: CONNECTION_TIMEOUT,
      evictionRunIntervalMillis: 15000,
      softIdleTimeoutMillis: 30000,
    },

    // Monitoring Configuration
    monitoring: {
      enabled: true,
      healthCheck: {
        enabled: true,
        interval: HEALTH_CHECK_INTERVAL,
        timeout: 3000,
        maxFails: 3,
      },
      metrics: {
        enabled: true,
        collectInterval: 60000,
      },
    },

    // Compression Configuration for Large Values
    compression: {
      enabled: true,
      threshold: 1024, // Compress values larger than 1KB
      types: ['gzip', 'deflate'],
    },

    // Cluster Configuration (if enabled)
    nodes: process.env.REDIS_CLUSTER_MODE === 'true' ? [
      { host: resolvedHost, port: parseInt(process.env.REDIS_PORT || DEFAULT_CACHE_PORT.toString(), 10) },
      ...process.env.REDIS_CLUSTER_NODES ? 
        JSON.parse(process.env.REDIS_CLUSTER_NODES).map((node: string) => {
          const [host, port] = node.split(':');
          return { host, port: parseInt(port, 10) };
        }) : []
    ] : undefined,

    // Additional Redis Options
    options: {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      maxMemoryPolicy: MAX_MEMORY_POLICY,
      connectTimeout: CONNECTION_TIMEOUT,
      disconnectTimeout: 2000,
      commandTimeout: 5000,
      autoResubscribe: true,
      autoResendUnfulfilledCommands: true,
      lazyConnect: false,
    }
  };

  // Validate the configuration
  validateRedisConfig(config);

  return config;
};

// Export the cache configuration
export const cacheConfig = await getCacheConfig();

// Export validation utility for use in other modules
export { validateRedisConfig };