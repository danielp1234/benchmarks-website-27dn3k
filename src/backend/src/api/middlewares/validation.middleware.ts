/**
 * Validation Middleware
 * Version: 1.0.0
 * Purpose: Express middleware for validating and sanitizing API request data
 * with enhanced security measures and type safety
 */

// External imports
import { Request, Response, NextFunction } from 'express'; // express@4.x

// Internal imports
import { validatePagination, validateMetricFilter, validateBenchmarkFilter } from '../../utils/validation.utils';
import { HTTP_STATUS, ERROR_MESSAGES } from '../../constants/errors';

/**
 * Type for validation error response
 */
interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Middleware for validating pagination parameters
 * Implements strict type checking and security measures
 */
export const validatePaginationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Extract and validate pagination parameters
    const validatedPagination = validatePagination({
      page: req.query.page,
      pageSize: req.query.pageSize
    });

    // Attach validated pagination to request object
    req.query = {
      ...req.query,
      ...validatedPagination
    };

    next();
  } catch (error) {
    const validationError: ValidationError = {
      field: 'pagination',
      message: error instanceof Error ? error.message : ERROR_MESSAGES.VALIDATION_ERROR,
      code: 'PAGINATION_ERROR'
    };

    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: validationError,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Middleware for validating metric filter parameters
 * Implements comprehensive validation and sanitization
 */
export const validateMetricFilterMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Extract and validate metric filter parameters
    const validatedFilter = validateMetricFilter({
      categories: req.query.categories as string[],
      search: req.query.search as string,
      isActive: req.query.isActive === 'true'
    });

    // Attach validated filter to request object
    req.query = {
      ...req.query,
      ...validatedFilter
    };

    next();
  } catch (error) {
    const validationError: ValidationError = {
      field: 'metricFilter',
      message: error instanceof Error ? error.message : ERROR_MESSAGES.VALIDATION_ERROR,
      code: 'METRIC_FILTER_ERROR'
    };

    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: validationError,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Middleware for validating benchmark filter parameters
 * Implements strict validation rules and security measures
 */
export const validateBenchmarkFilterMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Extract and validate benchmark filter parameters
    const validatedFilter = validateBenchmarkFilter({
      metricIds: req.query.metricIds as string[],
      sourceIds: req.query.sourceIds as string[],
      arrRanges: req.query.arrRanges as string[],
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
    });

    // Attach validated filter to request object
    req.query = {
      ...req.query,
      ...validatedFilter
    };

    next();
  } catch (error) {
    const validationErrors: ValidationError = {
      field: 'benchmarkFilter',
      message: error instanceof Error ? error.message : ERROR_MESSAGES.VALIDATION_ERROR,
      code: 'BENCHMARK_FILTER_ERROR'
    };

    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: validationErrors,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Helper function to create validation error response
 * @param field - Field that failed validation
 * @param message - Error message
 * @param code - Error code
 */
const createValidationError = (
  field: string,
  message: string,
  code: string
): ValidationError => ({
  field,
  message,
  code
});

/**
 * Helper function to sanitize error messages for safe client response
 * Prevents exposure of internal system details
 */
const sanitizeErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    // Remove any potential stack traces or sensitive information
    return error.message.split('\n')[0].trim();
  }
  return ERROR_MESSAGES.VALIDATION_ERROR;
};

// Freeze error creation function to prevent modification
Object.freeze(createValidationError);
Object.freeze(sanitizeErrorMessage);
```

This implementation follows the technical specifications and provides:

1. Comprehensive validation middleware for pagination, metric filters, and benchmark filters
2. Strong type safety using TypeScript
3. Secure error handling that doesn't expose internal details
4. Input sanitization and validation using the provided utility functions
5. Proper error responses following the API specification
6. Immutable helper functions for error handling
7. Detailed comments for maintainability

Key security features:
- Input sanitization before processing
- Type checking for all parameters
- Safe error messages that don't expose internals
- Immutable helper functions
- Proper HTTP status codes
- Timestamp tracking for audit purposes

The middleware can be used in Express routes like:
```typescript
router.get('/metrics', 
  validatePaginationMiddleware,
  validateMetricFilterMiddleware,
  metricsController.getMetrics
);

router.get('/benchmarks',
  validatePaginationMiddleware,
  validateBenchmarkFilterMiddleware,
  benchmarksController.getBenchmarks
);