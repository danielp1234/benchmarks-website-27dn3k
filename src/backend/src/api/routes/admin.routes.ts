/**
 * Administrative Routes Configuration
 * Version: 1.0.0
 * 
 * Implements secure route handling for administrative endpoints in the SaaS Benchmarks Platform
 * with comprehensive authentication, authorization, validation, and audit logging capabilities.
 */

// Express router and middleware - v4.18.2
import { Router } from 'express';

// Security middleware - v7.0.0
import helmet from 'helmet';

// Response compression - v1.7.4
import compression from 'compression';

// Rate limiting - v6.7.0
import rateLimit from 'express-rate-limit';

// Internal imports
import { AdminController } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateMetricFilterMiddleware } from '../middlewares/validation.middleware';
import { UserRole } from '../../interfaces/auth.interface';

// Constants for rate limiting
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100; // requests per window
const ADMIN_ROLES = [UserRole.ADMIN, UserRole.SYSTEM_ADMIN];

/**
 * Configures and returns the Express router for administrative endpoints
 * with comprehensive security, validation, and monitoring
 */
const configureAdminRoutes = (): Router => {
  const router = Router();
  const adminController = new AdminController();

  // Apply security headers
  router.use(helmet({
    contentSecurityPolicy: true,
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: true,
    dnsPrefetchControl: true,
    frameguard: true,
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: true,
    referrerPolicy: true,
    xssFilter: true
  }));

  // Apply response compression
  router.use(compression());

  // Apply rate limiting
  router.use(rateLimit({
    windowMs: RATE_LIMIT_WINDOW,
    max: RATE_LIMIT_MAX_REQUESTS,
    message: 'Too many requests from this IP, please try again later.'
  }));

  // Apply authentication to all routes
  router.use(authenticate);

  // Metrics Management Routes
  router.post('/metrics',
    authorize([UserRole.ADMIN, UserRole.SYSTEM_ADMIN]),
    validateMetricFilterMiddleware,
    adminController.createMetric
  );

  router.put('/metrics/:id',
    authorize([UserRole.ADMIN, UserRole.SYSTEM_ADMIN]),
    validateMetricFilterMiddleware,
    adminController.updateMetric
  );

  router.delete('/metrics/:id',
    authorize([UserRole.SYSTEM_ADMIN]),
    adminController.deleteMetric
  );

  // Data Source Management Routes
  router.post('/data-sources',
    authorize([UserRole.ADMIN, UserRole.SYSTEM_ADMIN]),
    adminController.manageDataSource
  );

  // Audit Log Routes
  router.get('/audit-logs',
    authorize(ADMIN_ROLES),
    adminController.getAuditLogs
  );

  return router;
};

// Create and configure the admin router
const adminRouter = configureAdminRoutes();

// Export the configured router
export default adminRouter;