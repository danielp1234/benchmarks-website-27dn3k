/**
 * Main Express Application Configuration
 * Version: 1.0.0
 * 
 * Configures and initializes the Express application for the SaaS Benchmarks Platform
 * with comprehensive security, monitoring, and performance features.
 */

import express, { Application, Request, Response, NextFunction } from 'express'; // v4.18.2
import helmet from 'helmet'; // v7.0.0
import cors from 'cors'; // v2.8.5
import compression from 'compression'; // v1.7.4
import morgan from 'morgan'; // v1.10.0
import rateLimit from 'express-rate-limit'; // v7.1.0

// Internal imports
import { config } from './config';
import router from './api/routes';
import errorHandler from './api/middlewares/error.middleware';
import { createLogger } from './utils/logger.utils';

// Initialize logger
const logger = createLogger();

/**
 * Configures Express middleware with security and performance features
 * @param app Express application instance
 */
const configureMiddleware = (app: Application): void => {
  // Security headers
  app.use(helmet({
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

  // CORS configuration
  app.use(cors({
    origin: config.cors.origin,
    methods: config.cors.methods,
    allowedHeaders: config.cors.allowedHeaders,
    exposedHeaders: config.cors.exposedHeaders,
    credentials: config.cors.credentials,
    maxAge: config.cors.maxAge
  }));

  // Request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Compression
  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));

  // Request logging
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim(), { component: 'http' })
    },
    skip: (req) => req.url === '/health' || req.url === '/metrics'
  }));

  // Rate limiting
  app.use(rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: config.rateLimit.message,
    standardHeaders: true,
    legacyHeaders: false
  }));

  // Request timeout
  app.use((req: Request, res: Response, next: NextFunction) => {
    req.setTimeout(parseInt(process.env.REQUEST_TIMEOUT || '30000', 10));
    next();
  });
};

/**
 * Configures API routes and error handling
 * @param app Express application instance
 */
const configureRoutes = (app: Application): void => {
  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  });

  // API documentation endpoint
  app.get('/api/docs', (req: Request, res: Response) => {
    res.redirect('/api-docs');
  });

  // Mount API routes
  app.use('/api/v1', router);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested resource does not exist',
      path: req.path
    });
  });

  // Error handler
  app.use(errorHandler);
};

/**
 * Configures graceful shutdown handling
 * @param app Express application instance
 * @param server HTTP server instance
 */
const configureGracefulShutdown = (app: Application, server: any): void => {
  const shutdown = async () => {
    logger.info('Received shutdown signal, starting graceful shutdown...');

    // Stop accepting new requests
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });

    // Set shutdown timeout
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, parseInt(process.env.SHUTDOWN_TIMEOUT || '15000', 10));
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

/**
 * Creates and configures the Express application
 * @returns Configured Express application
 */
const createApp = (): Application => {
  const app: Application = express();

  // Configure middleware
  configureMiddleware(app);

  // Configure routes
  configureRoutes(app);

  // Error handling for uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });

  // Error handling for unhandled promise rejections
  process.on('unhandledRejection', (reason: any) => {
    logger.error('Unhandled Rejection:', reason);
    process.exit(1);
  });

  return app;
};

// Create and export the configured Express application
export const app = createApp();