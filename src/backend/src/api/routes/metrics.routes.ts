/**
 * Metrics Routes Configuration
 * Version: 1.0.0
 * 
 * Configures Express router for metrics-related endpoints with comprehensive
 * validation, authentication, and error handling for the SaaS Benchmarks Platform.
 */

import { Router } from 'express'; // v4.x
import { MetricsController } from '../controllers/metrics.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { 
  validateMetricFilterMiddleware,
  validatePaginationMiddleware
} from '../middlewares/validation.middleware';
import { UserRole } from '../../interfaces/auth.interface';
import { HTTP_STATUS, ERROR_MESSAGES } from '../../constants/errors';

// Initialize router and controller
const router = Router();
const metricsController = new MetricsController();

/**
 * GET /api/v1/metrics
 * Retrieves paginated list of metrics with filtering support
 * Public endpoint with caching enabled
 */
router.get('/',
  validatePaginationMiddleware,
  validateMetricFilterMiddleware,
  async (req, res, next) => {
    try {
      // Set cache control headers
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
      
      const metrics = await metricsController.getMetrics(req.query);
      res.status(HTTP_STATUS.OK).json(metrics);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/metrics/:id
 * Retrieves a single metric by ID
 * Public endpoint with caching enabled
 */
router.get('/:id',
  async (req, res, next) => {
    try {
      // Set cache control headers
      res.setHeader('Cache-Control', 'public, max-age=300');
      
      const metric = await metricsController.getMetricById(req.params.id);
      if (!metric) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: ERROR_MESSAGES.NOT_FOUND,
          timestamp: new Date().toISOString()
        });
      }
      res.status(HTTP_STATUS.OK).json(metric);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/metrics
 * Creates a new metric
 * Protected endpoint for admin users only
 */
router.post('/',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SYSTEM_ADMIN]),
  async (req, res, next) => {
    try {
      const metric = await metricsController.createMetric(req.body);
      
      // Set no-cache headers for mutation endpoints
      res.setHeader('Cache-Control', 'no-store');
      
      res.status(HTTP_STATUS.OK).json(metric);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/metrics/:id
 * Updates an existing metric
 * Protected endpoint for admin users only
 */
router.put('/:id',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SYSTEM_ADMIN]),
  async (req, res, next) => {
    try {
      const metric = await metricsController.updateMetric(req.params.id, req.body);
      if (!metric) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: ERROR_MESSAGES.NOT_FOUND,
          timestamp: new Date().toISOString()
        });
      }
      
      // Set no-cache headers for mutation endpoints
      res.setHeader('Cache-Control', 'no-store');
      
      res.status(HTTP_STATUS.OK).json(metric);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/metrics/:id
 * Deletes an existing metric
 * Protected endpoint for admin users only
 */
router.delete('/:id',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SYSTEM_ADMIN]),
  async (req, res, next) => {
    try {
      await metricsController.deleteMetric(req.params.id);
      
      // Set no-cache headers for mutation endpoints
      res.setHeader('Cache-Control', 'no-store');
      
      res.status(HTTP_STATUS.OK).json({
        message: 'Metric deleted successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
);

// Error handling middleware
router.use((error: Error, req: any, res: any, next: any) => {
  console.error(`Metrics route error: ${error.message}`);
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    error: ERROR_MESSAGES.SERVER_ERROR,
    timestamp: new Date().toISOString()
  });
});

export default router;