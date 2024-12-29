import { Redis } from 'ioredis'; // v5.3.0
import { promisify } from 'util';
import { gzip, gunzip } from 'zlib'; // v1.0.0
import CircuitBreaker from 'opossum'; // v6.0.0
import { RedisConfig } from '../interfaces/config.interface';
import crypto from 'crypto';

// Constants for cache configuration
const CACHE_KEY_PREFIX = 'saas_benchmarks:';
const CACHE_DATA_TYPES = ['session', 'metrics', 'benchmarks', 'sources'] as const;
const MAX_KEY_LENGTH = 200;
const DEFAULT_TTL = 300; // 5 minutes in seconds
const COMPRESSION_THRESHOLD = 1024; // 1KB

// Type definitions
type CacheDataType = typeof CACHE_DATA_TYPES[number];
type CacheOptions = {
  ttl?: number;
  compress?: boolean;
  namespace?: string;
};

// Utility type guards
const isCacheDataType = (type: string): type is CacheDataType => {
  return CACHE_DATA_TYPES.includes(type as CacheDataType);
};

/**
 * Compress data using gzip
 * @param data - Data to compress
 * @returns Promise<Buffer> Compressed data
 */
const compressData = async (data: string): Promise<Buffer> => {
  const gzipAsync = promisify(gzip);
  try {
    return await gzipAsync(data);
  } catch (error) {
    throw new Error(`Compression failed: ${error.message}`);
  }
};

/**
 * Decompress gzipped data
 * @param data - Compressed data
 * @returns Promise<string> Decompressed data
 */
const decompressData = async (data: Buffer): Promise<string> => {
  const gunzipAsync = promisify(gunzip);
  try {
    const decompressed = await gunzipAsync(data);
    return decompressed.toString('utf-8');
  } catch (error) {
    throw new Error(`Decompression failed: ${error.message}`);
  }
};

/**
 * Generate a collision-resistant cache key
 * @param dataType - Type of data being cached
 * @param identifier - Unique identifier for the cached item
 * @param options - Additional options for key generation
 * @returns string Valid cache key
 */
export const generateCacheKey = (
  dataType: string,
  identifier: string,
  options: CacheOptions = {}
): string => {
  if (!isCacheDataType(dataType)) {
    throw new Error(`Invalid cache data type: ${dataType}`);
  }

  // Sanitize identifier
  const sanitizedId = identifier
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, MAX_KEY_LENGTH - CACHE_KEY_PREFIX.length - dataType.length - 10);

  // Generate namespace-specific prefix
  const namespacePrefix = options.namespace ? `${options.namespace}:` : '';

  // Create hash for long identifiers
  const hash = identifier.length > sanitizedId.length
    ? `:${crypto.createHash('sha256').update(identifier).digest('hex').substring(0, 8)}`
    : '';

  return `${CACHE_KEY_PREFIX}${namespacePrefix}${dataType}:${sanitizedId}${hash}`;
};

/**
 * Serialize value for caching with optional compression
 * @param value - Value to serialize
 * @param options - Serialization options
 * @returns Promise<string> Serialized value
 */
export const serializeValue = async (
  value: any,
  options: CacheOptions = {}
): Promise<string> => {
  if (value === undefined || value === null) {
    throw new Error('Cannot serialize undefined or null values');
  }

  try {
    // Handle Date objects
    const serialized = JSON.stringify(value, (key, value) => {
      if (value instanceof Date) {
        return { __type: 'Date', value: value.toISOString() };
      }
      return value;
    });

    // Apply compression if needed
    if (
      (options.compress || serialized.length > COMPRESSION_THRESHOLD) &&
      serialized.length > 0
    ) {
      const compressed = await compressData(serialized);
      return `__compressed__${compressed.toString('base64')}`;
    }

    return serialized;
  } catch (error) {
    throw new Error(`Serialization failed: ${error.message}`);
  }
};

/**
 * Deserialize cached value with automatic decompression
 * @param value - Serialized value
 * @param options - Deserialization options
 * @returns Promise<any> Deserialized value
 */
export const deserializeValue = async (
  value: string,
  options: CacheOptions = {}
): Promise<any> => {
  if (!value) {
    return null;
  }

  try {
    // Check for compressed data
    if (value.startsWith('__compressed__')) {
      const compressed = Buffer.from(value.slice(14), 'base64');
      value = await decompressData(compressed);
    }

    // Parse with Date object reconstruction
    return JSON.parse(value, (key, value) => {
      if (value && value.__type === 'Date') {
        return new Date(value.value);
      }
      return value;
    });
  } catch (error) {
    throw new Error(`Deserialization failed: ${error.message}`);
  }
};

/**
 * Calculate optimized TTL based on data type and configuration
 * @param dataType - Type of cached data
 * @param options - TTL calculation options
 * @returns number Calculated TTL in seconds
 */
export const calculateTTL = (
  dataType: string,
  options: CacheOptions = {}
): number => {
  if (!isCacheDataType(dataType)) {
    throw new Error(`Invalid cache data type: ${dataType}`);
  }

  // Use provided TTL or fallback to defaults
  const baseTTL = options.ttl || DEFAULT_TTL;

  // Apply data type specific rules
  const ttlMultipliers: Record<CacheDataType, number> = {
    session: 1, // Standard session TTL
    metrics: 2, // Metrics can be cached longer
    benchmarks: 3, // Benchmarks change less frequently
    sources: 4, // Source data is relatively static
  };

  const calculatedTTL = baseTTL * ttlMultipliers[dataType as CacheDataType];

  // Ensure TTL is within reasonable bounds
  return Math.min(Math.max(calculatedTTL, 60), 86400); // Between 1 minute and 24 hours
};

/**
 * Create a circuit breaker for Redis operations
 * @param redis - Redis client instance
 * @returns CircuitBreaker Instance
 */
export const createCacheCircuitBreaker = (redis: Redis): CircuitBreaker => {
  return new CircuitBreaker(async ({ key, value, ttl }) => {
    if (value === undefined) {
      return redis.get(key);
    }
    return redis.set(key, value, 'EX', ttl);
  }, {
    timeout: 3000, // 3 seconds
    errorThresholdPercentage: 50,
    resetTimeout: 30000, // 30 seconds
  });
};

/**
 * Validate Redis configuration
 * @param config - Redis configuration object
 * @throws Error if configuration is invalid
 */
export const validateRedisConfig = (config: RedisConfig): void => {
  if (!config.host || !config.port) {
    throw new Error('Redis host and port are required');
  }

  if (config.ttl && (config.ttl < 0 || config.ttl > 86400)) {
    throw new Error('Redis TTL must be between 0 and 86400 seconds');
  }

  if (config.clusterMode && (!config.nodes || config.nodes.length === 0)) {
    throw new Error('Redis cluster nodes configuration is required when cluster mode is enabled');
  }
};