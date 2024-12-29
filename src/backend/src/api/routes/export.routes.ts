// express v4.x - Web framework
import { Router } from 'express';
// helmet v7.x - Security middleware
import helmet from 'helmet';

// Internal imports
import { ExportController } from '../controllers/export.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { rateLimitMiddleware } from '../middlewares/rateLimit.middleware';
import { validateExportRequest } from '../middlewares/validation.middleware';
import { errorHandler } from '../middlewares/error.middleware';
import { ExportFormat } from '../../interfaces/export.interface';

// Base path for export routes
const EXPORT_BASE_PATH = '/api/v1/export';

/**
 * Configures and returns Express router with secure export endpoints
 * Implements comprehensive security measures and request validation
 * 
 * @param exportController - Controller instance for handling export operations
 * @returns Configured Express router
 */
export default function configureExportRoutes(exportController: ExportController): Router {
    const router = Router();

    // Apply security middleware
    router.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                downloadSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'"],
                objectSrc: ["'none'"]
            }
        },
        crossOriginResourcePolicy: { policy: "same-origin" },
        crossOriginOpenerPolicy: { policy: "same-origin" }
    }));

    // Apply rate limiting middleware
    router.use(rateLimitMiddleware);

    /**
     * POST /api/v1/export
     * Initiates benchmark data export operation
     * Requires authentication and validates export request parameters
     */
    router.post('/',
        authenticate,
        validateExportRequest,
        async (req, res, next) => {
            try {
                const exportRequest = {
                    options: {
                        format: req.body.format as ExportFormat,
                        selectedMetrics: req.body.selectedMetrics,
                        includeAllMetrics: req.body.includeAllMetrics,
                        includePercentiles: req.body.includePercentiles
                    }
                };

                const response = await exportController.exportBenchmarkData(exportRequest);

                res.status(200).json({
                    status: 'success',
                    data: response,
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || crypto.randomUUID()
                });
            } catch (error) {
                next(error);
            }
        }
    );

    /**
     * GET /api/v1/export/:exportId/progress
     * Retrieves progress information for an ongoing export operation
     * Requires authentication and validates export ID
     */
    router.get('/:exportId/progress',
        authenticate,
        async (req, res, next) => {
            try {
                const { exportId } = req.params;
                const progress = await exportController.getExportProgress(exportId);

                if (!progress) {
                    return res.status(404).json({
                        status: 'error',
                        message: 'Export not found',
                        timestamp: new Date().toISOString(),
                        requestId: req.headers['x-request-id'] || crypto.randomUUID()
                    });
                }

                res.status(200).json({
                    status: 'success',
                    data: progress,
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || crypto.randomUUID()
                });
            } catch (error) {
                next(error);
            }
        }
    );

    /**
     * POST /api/v1/export/:exportId/cancel
     * Cancels an ongoing export operation
     * Requires authentication and validates export ID
     */
    router.post('/:exportId/cancel',
        authenticate,
        async (req, res, next) => {
            try {
                const { exportId } = req.params;
                await exportController.cancelExport(exportId);

                res.status(200).json({
                    status: 'success',
                    message: 'Export cancelled successfully',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || crypto.randomUUID()
                });
            } catch (error) {
                next(error);
            }
        }
    );

    // Apply error handling middleware
    router.use(errorHandler);

    return router;
}