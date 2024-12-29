/**
 * @file Data source routes configuration
 * @description Express router configuration for data source management endpoints with
 * comprehensive security, validation, and monitoring capabilities
 * @version 1.0.0
 */

import { Router } from 'express'; // v4.x
import rateLimit from 'express-rate-limit'; // v6.0.0
import { SourcesController } from '../controllers/sources.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';
import { 
  CreateDataSourceDto, 
  UpdateDataSourceDto, 
  QueryDataSourceDto 
} from '../validators/sources.validator';
import { UserRole } from '../../interfaces/auth.interface';
import { HTTP_STATUS } from '../../constants/errors';

// Constants for route configuration
const BASE_PATH = '/api/v1/sources';
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // requests per window

/**
 * Configures and returns an Express router with data source management routes
 * Implements comprehensive security measures and validation
 */
const configureSourcesRoutes = (): Router => {
  const router = Router();
  const sourcesController = new SourcesController();

  // Configure rate limiting for all source routes
  const limiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW,
    max: RATE_LIMIT_MAX,
    message: {
      error: 'Too many requests',
      message: 'Please try again later',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    statusCode: HTTP_STATUS.TOO_MANY_REQUESTS
  });

  router.use(limiter);

  // GET /sources - Retrieve all data sources with filtering
  router.get(
    '/',
    authenticate,
    validateRequest(QueryDataSourceDto),
    async (req, res, next) => {
      try {
        const result = await sourcesController.getAllSources(req.query);
        res.json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  // GET /sources/:id - Retrieve a specific data source
  router.get(
    '/:id',
    authenticate,
    async (req, res, next) => {
      try {
        const source = await sourcesController.getSourceById(req.params.id);
        if (!source) {
          res.status(HTTP_STATUS.NOT_FOUND).json({
            error: 'Data source not found',
            code: 'SOURCE_NOT_FOUND'
          });
          return;
        }
        res.json(source);
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /sources - Create a new data source
  router.post(
    '/',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.SYSTEM_ADMIN]),
    validateRequest(CreateDataSourceDto),
    async (req, res, next) => {
      try {
        const source = await sourcesController.createSource(req.body);
        res.status(HTTP_STATUS.OK).json(source);
      } catch (error) {
        next(error);
      }
    }
  );

  // PUT /sources/:id - Update an existing data source
  router.put(
    '/:id',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.SYSTEM_ADMIN]),
    validateRequest(UpdateDataSourceDto),
    async (req, res, next) => {
      try {
        const source = await sourcesController.updateSource(
          req.params.id,
          req.body
        );
        res.json(source);
      } catch (error) {
        next(error);
      }
    }
  );

  // DELETE /sources/:id - Delete a data source
  router.delete(
    '/:id',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.SYSTEM_ADMIN]),
    async (req, res, next) => {
      try {
        await sourcesController.deleteSource(req.params.id);
        res.status(HTTP_STATUS.OK).json({
          message: 'Data source deleted successfully'
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
};

// Create and export the configured router
export const sourcesRouter = configureSourcesRoutes();