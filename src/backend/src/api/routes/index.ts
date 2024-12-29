/**
 * Main Router Configuration
 * Version: 1.0.0
 * 
 * Aggregates and exports all API routes with comprehensive security middleware,
 * request tracking, and centralized error handling for the SaaS Benchmarks Platform.
 */

import { Router } from 'express'; // version: 4.18.2
import cors from 'cors'; // version: 2.8.5
import compression from 'compression'; // version: 1.7.4
import helmet from 'helmet'; // version: 7.0.0
import rateLimit from 'express-rate-limit'; // version: 6.7.0

// Internal route imports
import { healthRouter } from './health.routes';
import { authRouter } from './auth.routes';
import { metricsRouter } from './metrics.routes';
import { benchmarkRouter } from './benchmark.routes';
import { exportRouter } from './export.routes';
import { sourcesRouter } from './sources.routes';

// Constants
const API_VERSION = 'v1';
const API_BASE_PATH = `/api/${API_VERSION}`;
const RATE_LIMIT_WINDOW = 3600000; // 1 hour in milliseconds
const RATE_LIMIT_MAX = 1000; // requests per window

/**
 * Configures and returns the main Express router with all API routes
 * and comprehensive middleware chain
 */
const configureApiRoutes = (): Router => {
  const router = Router();

  // Apply security middleware
  router.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://apis.google.com'],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://apis.google.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        objectSrc: ["'none'"],
        mediaSrc: ["'none'"],
        frameSrc: ['https://accounts.google.com']
      }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "same-origin" },
    dnsPrefetchControl: true,
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true
  }));

  // Configure CORS
  router.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400 // 24 hours
  }));

  // Apply rate limiting
  router.use(rateLimit({
    windowMs: RATE_LIMIT_WINDOW,
    max: RATE_LIMIT_MAX,
    message: {
      error: 'Too many requests',
      message: 'Please try again later',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
  }));

  // Enable compression
  router.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));

  // Mount health check routes (bypass security for monitoring)
  router.use('/health', healthRouter);

  // Mount API routes with versioning
  router.use(`${API_BASE_PATH}/auth`, authRouter);
  router.use(`${API_BASE_PATH}/metrics`, metricsRouter);
  router.use(`${API_BASE_PATH}/benchmarks`, benchmarkRouter);
  router.use(`${API_BASE_PATH}/export`, exportRouter);
  router.use(`${API_BASE_PATH}/sources`, sourcesRouter);

  // Global error handling
  router.use((err: Error, req: any, res: any, next: any) => {
    console.error(`API Error: ${err.message}`);
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id']
    });
  });

  return router;
};

// Export configured router
export const router = configureApiRoutes();