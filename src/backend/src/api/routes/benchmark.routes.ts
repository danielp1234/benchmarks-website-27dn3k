// express@4.x - Core Express routing
import { Router } from 'express';
// express-rate-limit@6.0.0 - Rate limiting middleware
import rateLimit from 'express-rate-limit';

// Internal imports
import { BenchmarkController } from '../controllers/benchmark.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { 
  validateBenchmarkFilterMiddleware,
  validatePaginationMiddleware 
} from '../middlewares/validation.middleware';
import { UserRole } from '../../interfaces/auth.interface';
import { HTTP_STATUS } from '../../constants/errors';

// Constants
const BASE_PATH = '/api/v1/benchmarks';
const PUBLIC_RATE_LIMIT = 1000; // 1000 requests per 15 minutes for public endpoints
const ADMIN_RATE_LIMIT = 5000;  // 5000 requests per 15 minutes for admin endpoints

/**
 * Configures and returns the benchmark router with all routes and middleware
 * @param benchmarkController Initialized benchmark controller instance
 * @returns Configured Express router
 */
export const initializeBenchmarkRoutes = (benchmarkController: BenchmarkController): Router => {
  const router = Router();

  // Rate limiters
  const publicLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: PUBLIC_RATE_LIMIT,
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: ADMIN_RATE_LIMIT,
    message: 'Too many admin requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // GET /api/v1/benchmarks
  // Public endpoint for retrieving benchmark data with filtering
  router.get('/',
    publicLimiter,
    validatePaginationMiddleware,
    validateBenchmarkFilterMiddleware,
    async (req, res, next) => {
      try {
        const response = await benchmarkController.getBenchmarks(
          req.query,
          Number(req.query.page),
          Number(req.query.pageSize)
        );
        res.status(HTTP_STATUS.OK).json(response);
      } catch (error) {
        next(error);
      }
    }
  );

  // GET /api/v1/benchmarks/:id
  // Protected endpoint for retrieving specific benchmark data
  router.get('/:id',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.SYSTEM_ADMIN]),
    adminLimiter,
    async (req, res, next) => {
      try {
        const benchmark = await benchmarkController.getBenchmarkById(req.params.id);
        res.status(HTTP_STATUS.OK).json(benchmark);
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/v1/benchmarks
  // Protected endpoint for creating new benchmark data
  router.post('/',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.SYSTEM_ADMIN]),
    adminLimiter,
    async (req, res, next) => {
      try {
        const newBenchmark = await benchmarkController.createBenchmark(req.body);
        res.status(HTTP_STATUS.OK).json(newBenchmark);
      } catch (error) {
        next(error);
      }
    }
  );

  // PUT /api/v1/benchmarks/:id
  // Protected endpoint for updating benchmark data
  router.put('/:id',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.SYSTEM_ADMIN]),
    adminLimiter,
    async (req, res, next) => {
      try {
        const updatedBenchmark = await benchmarkController.updateBenchmark(
          req.params.id,
          req.body
        );
        res.status(HTTP_STATUS.OK).json(updatedBenchmark);
      } catch (error) {
        next(error);
      }
    }
  );

  // DELETE /api/v1/benchmarks/:id
  // Protected endpoint for deleting benchmark data
  router.delete('/:id',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.SYSTEM_ADMIN]),
    adminLimiter,
    async (req, res, next) => {
      try {
        await benchmarkController.deleteBenchmark(req.params.id);
        res.status(HTTP_STATUS.OK).json({ message: 'Benchmark deleted successfully' });
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/v1/benchmarks/export
  // Protected endpoint for exporting benchmark data
  router.post('/export',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.SYSTEM_ADMIN]),
    adminLimiter,
    validateBenchmarkFilterMiddleware,
    async (req, res, next) => {
      try {
        const exportFile = await benchmarkController.exportBenchmarks(
          req.body,
          req.query.format as 'csv' | 'excel'
        );
        res.status(HTTP_STATUS.OK)
          .setHeader('Content-Type', 'application/octet-stream')
          .setHeader('Content-Disposition', 'attachment; filename="benchmark_export.csv"')
          .send(exportFile);
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
};

// Export configured router
export const benchmarkRouter = initializeBenchmarkRoutes(new BenchmarkController());