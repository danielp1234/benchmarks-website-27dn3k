// Redis v5.x - Redis client with cluster support
import Redis from 'ioredis';
// @nestjs/common v10.x - Dependency injection
import { Injectable } from '@nestjs/common';
// lz4-js v0.4.x - Data compression
import * as lz4 from 'lz4-js';
// opossum v6.x - Circuit breaker
import CircuitBreaker from 'opossum';

import { redisConfig } from '../config/redis.config';
import { createLogger } from '../utils/logger.utils';

interface CacheMetadata {
  compressed: boolean;
  version: number;
  timestamp: number;
}

@Injectable()
export class CacheService {
  private readonly redisClient: Redis;
  private readonly logger: any;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly cacheVersions: Map<string, number>;
  private readonly compressionThreshold: number = 1024; // 1KB

  constructor() {
    this.logger = createLogger();
    this.cacheVersions = new Map<string, number>();

    // Initialize circuit breaker for Redis operations
    this.circuitBreaker = new CircuitBreaker(async (operation: Function) => {
      return await operation();
    }, {
      timeout: 3000, // 3 seconds
      errorThresholdPercentage: 50,
      resetTimeout: 30000, // 30 seconds
    });

    // Configure Redis client with enhanced settings
    const clientConfig: Redis.RedisOptions = {
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      retryStrategy: (times: number) => {
        if (times > redisConfig.maxRetries) {
          return null;
        }
        return Math.min(times * redisConfig.retryDelay, 2000);
      },
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
      connectTimeout: 10000,
      lazyConnect: true,
    };

    // Initialize Redis client based on mode
    this.redisClient = redisConfig.clusterMode
      ? new Redis.Cluster([{ host: redisConfig.host, port: redisConfig.port }], {
          redisOptions: clientConfig,
          clusterRetryStrategy: (times: number) => {
            return Math.min(times * 100, 3000);
          },
        })
      : new Redis(clientConfig);

    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Sets up Redis client event handlers with enhanced monitoring
   */
  private setupEventHandlers(): void {
    this.redisClient.on('connect', () => {
      this.logger.info('Redis client connected', {
        action: 'redis_connect',
        host: redisConfig.host,
        port: redisConfig.port,
      });
    });

    this.redisClient.on('error', (error: Error) => {
      this.logger.error('Redis client error', {
        action: 'redis_error',
        error: error.message,
        stack: error.stack,
      });
    });

    this.redisClient.on('close', () => {
      this.logger.warn('Redis client connection closed', {
        action: 'redis_close',
      });
    });
  }

  /**
   * Stores data in cache with optional compression
   * @param key Cache key
   * @param value Data to cache
   * @param ttl Time-to-live in seconds (optional)
   * @param compress Whether to compress data (optional)
   */
  async set<T>(
    key: string,
    value: T,
    ttl: number = redisConfig.ttl,
    compress: boolean = true
  ): Promise<void> {
    try {
      await this.circuitBreaker.fire(async () => {
        const serializedValue = JSON.stringify(value);
        let finalValue = serializedValue;
        let compressed = false;

        // Apply compression for large values
        if (compress && serializedValue.length > this.compressionThreshold) {
          const compressedData = lz4.encode(Buffer.from(serializedValue));
          finalValue = compressedData.toString('base64');
          compressed = true;
        }

        // Increment cache version
        const version = (this.cacheVersions.get(key) || 0) + 1;
        this.cacheVersions.set(key, version);

        // Store data with metadata
        const metadata: CacheMetadata = {
          compressed,
          version,
          timestamp: Date.now(),
        };

        const cacheEntry = JSON.stringify({
          data: finalValue,
          metadata,
        });

        if (ttl > 0) {
          await this.redisClient.setex(key, ttl, cacheEntry);
        } else {
          await this.redisClient.set(key, cacheEntry);
        }

        this.logger.debug('Cache set successful', {
          action: 'cache_set',
          key,
          compressed,
          ttl,
          size: finalValue.length,
        });
      });
    } catch (error) {
      this.logger.error('Cache set failed', {
        action: 'cache_set_error',
        key,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Retrieves data from cache with version validation
   * @param key Cache key
   * @param checkVersion Whether to validate cache version
   * @returns Cached value or null if not found
   */
  async get<T>(key: string, checkVersion: boolean = true): Promise<T | null> {
    try {
      return await this.circuitBreaker.fire(async () => {
        const cacheEntry = await this.redisClient.get(key);
        if (!cacheEntry) {
          return null;
        }

        const { data, metadata } = JSON.parse(cacheEntry);

        // Version validation
        if (checkVersion && metadata.version !== this.cacheVersions.get(key)) {
          await this.delete(key);
          return null;
        }

        // Decompress if necessary
        let finalValue = data;
        if (metadata.compressed) {
          const decompressed = lz4.decode(Buffer.from(data, 'base64'));
          finalValue = decompressed.toString();
        }

        this.logger.debug('Cache hit', {
          action: 'cache_get',
          key,
          compressed: metadata.compressed,
          age: Date.now() - metadata.timestamp,
        });

        return JSON.parse(finalValue);
      });
    } catch (error) {
      this.logger.error('Cache get failed', {
        action: 'cache_get_error',
        key,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Deletes data from cache
   * @param key Cache key
   * @param invalidateRelated Whether to invalidate related cache entries
   */
  async delete(key: string, invalidateRelated: boolean = false): Promise<void> {
    try {
      await this.circuitBreaker.fire(async () => {
        await this.redisClient.del(key);
        this.cacheVersions.delete(key);

        if (invalidateRelated) {
          const pattern = `${key}:*`;
          const relatedKeys = await this.redisClient.keys(pattern);
          if (relatedKeys.length > 0) {
            await this.redisClient.del(...relatedKeys);
          }
        }

        this.logger.debug('Cache delete successful', {
          action: 'cache_delete',
          key,
          invalidateRelated,
        });
      });
    } catch (error) {
      this.logger.error('Cache delete failed', {
        action: 'cache_delete_error',
        key,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Clears all cached data with safety checks
   * @param force Whether to bypass safety checks
   */
  async clear(force: boolean = false): Promise<void> {
    try {
      if (!force && process.env.NODE_ENV === 'production') {
        throw new Error('Cache clear not allowed in production without force flag');
      }

      await this.circuitBreaker.fire(async () => {
        await this.redisClient.flushall();
        this.cacheVersions.clear();

        this.logger.warn('Cache cleared', {
          action: 'cache_clear',
          force,
        });
      });
    } catch (error) {
      this.logger.error('Cache clear failed', {
        action: 'cache_clear_error',
        error: error.message,
      });
      throw error;
    }
  }
}