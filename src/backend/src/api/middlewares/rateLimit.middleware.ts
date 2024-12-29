/**
 * @file Rate Limiting Middleware
 * @description Implements distributed rate limiting for API endpoints using Redis
 * @version 1.0.0
 */

import { injectable } from 'inversify';
import rateLimit from 'express-rate-limit'; // v7.x
import RedisStore from 'rate-limit-redis'; // v4.x
import { Request, Response, NextFunction } from 'express'; // v4.x
import Redis from 'ioredis'; // v5.x
import { ServerConfig } from '../../interfaces/config.interface';
import { serverConfig } from '../../config/server.config';

// Constants for rate limiting configuration
const WINDOW_MS = 3600000; // 1 hour in milliseconds
const PUBLIC_MAX_REQUESTS = 1000; // Public endpoint limit
const AUTH_MAX_REQUESTS = 5000; // Authenticated endpoint limit
const REDIS_KEY_PREFIX = 'rl:'; // Redis key prefix for rate limiting
const BYPASS_HEADER_NAME = 'X-RateLimit-Bypass';

/**
 * Interface for rate limiter options
 */
interface RateLimiterOptions {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  skipFailedRequests?: boolean;
}

@injectable()
export class RateLimitMiddleware {
  private redis: Redis;
  private store: RedisStore;

  constructor() {
    // Initialize Redis connection with cluster support
    this.redis = new Redis({
      host: serverConfig.redis.host,
      port: serverConfig.redis.port,
      password: serverConfig.redis.password,
      keyPrefix: REDIS_KEY_PREFIX,
      enableCluster: serverConfig.redis.clusterMode,
      nodes: serverConfig.redis.nodes,
      retryStrategy: (times: number) => {
        return Math.min(times * 50, 2000);
      }
    });

    // Initialize Redis store for rate limiting
    this.store = new RedisStore({
      client: this.redis,
      prefix: REDIS_KEY_PREFIX,
      sendCommand: (...args: string[]) => this.redis.call(...args)
    });
  }

  /**
   * Creates a rate limiter with specified options
   * @param options Rate limiter configuration options
   * @returns Configured rate limiter middleware
   */
  private createRateLimiter(options: RateLimiterOptions) {
    return rateLimit({
      windowMs: options.windowMs,
      max: options.max,
      standardHeaders: true,
      legacyHeaders: false,
      store: this.store,
      keyGenerator: options.keyGenerator || ((req: Request) => {
        // Use X-Forwarded-For if behind proxy, fallback to remote address
        return (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '').split(',')[0].trim();
      }),
      skipFailedRequests: options.skipFailedRequests || false,
      handler: (req: Request, res: Response) => {
        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(options.windowMs / 1000)
        });
      }
    });
  }

  /**
   * Rate limiting middleware function
   * Applies different limits for public and authenticated routes
   */
  public rateLimitMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check for bypass token (for internal services)
      const bypassToken = req.headers[BYPASS_HEADER_NAME];
      if (bypassToken === process.env.RATE_LIMIT_BYPASS_TOKEN) {
        return next();
      }

      // Determine if route is authenticated
      const isAuthenticated = req.isAuthenticated?.() || false;

      // Create appropriate rate limiter based on authentication status
      const limiter = this.createRateLimiter({
        windowMs: WINDOW_MS,
        max: isAuthenticated ? AUTH_MAX_REQUESTS : PUBLIC_MAX_REQUESTS,
        skipFailedRequests: true,
        keyGenerator: (req: Request) => {
          // For authenticated routes, use user ID as part of the key
          const baseKey = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '').split(',')[0].trim();
          return isAuthenticated ? `${baseKey}:${req.user?.id || ''}` : baseKey;
        }
      });

      // Apply rate limiting
      return limiter(req, res, next);
    } catch (error) {
      // Log error and fall back to default rate limiting
      console.error('Rate limiting error:', error);
      const fallbackLimiter = this.createRateLimiter({
        windowMs: WINDOW_MS,
        max: PUBLIC_MAX_REQUESTS
      });
      return fallbackLimiter(req, res, next);
    }
  };

  /**
   * Cleanup method to close Redis connection
   */
  public cleanup() {
    if (this.redis) {
      this.redis.quit();
    }
  }
}

export default RateLimitMiddleware;