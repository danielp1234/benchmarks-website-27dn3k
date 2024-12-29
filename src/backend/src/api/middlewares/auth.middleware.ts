// express v4.x
import { Request, Response, NextFunction } from 'express';
// jsonwebtoken v9.x
import jwt from 'jsonwebtoken';
// http-errors v2.x
import createHttpError from 'http-errors';

import { AuthUser, UserRole } from '../../interfaces/auth.interface';
import { AuthService } from '../../services/auth.service';

// Constants for authentication and authorization
const AUTH_HEADER = 'Authorization';
const BEARER_PREFIX = 'Bearer ';
const SESSION_TIMEOUT = 1800000; // 30 minutes in milliseconds

// Role hierarchy mapping for authorization checks
const ROLE_HIERARCHY: { [key in UserRole]?: UserRole[] } = {
  [UserRole.SYSTEM_ADMIN]: [UserRole.ADMIN, UserRole.PUBLIC],
  [UserRole.ADMIN]: [UserRole.PUBLIC]
};

/**
 * Authentication middleware that validates JWT tokens and manages user sessions
 * Implements comprehensive security checks based on technical specifications
 */
export const authenticate = async (
  req: Request & { user?: AuthUser },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers[AUTH_HEADER.toLowerCase()];

    // Validate Authorization header format
    if (!authHeader || typeof authHeader !== 'string') {
      throw createHttpError(401, 'Missing authentication token');
    }

    if (!authHeader.startsWith(BEARER_PREFIX)) {
      throw createHttpError(401, 'Invalid token format');
    }

    // Extract token
    const token = authHeader.slice(BEARER_PREFIX.length);
    if (!token) {
      throw createHttpError(401, 'Empty token provided');
    }

    // Get auth service instance
    const authService = new AuthService();

    // Validate token and session
    const validationResult = await authService.validateToken(token);
    if (!validationResult.isValid) {
      await authService.logAuthFailure({
        reason: validationResult.error,
        token: token.slice(0, 10) + '...' // Log partial token for tracing
      });
      throw createHttpError(401, validationResult.error || 'Invalid token');
    }

    // Check session validity
    const sessionResult = await authService.validateSession(validationResult.userId);
    if (!sessionResult.isValid) {
      await authService.logAuthFailure({
        reason: 'Session invalid or expired',
        userId: validationResult.userId
      });
      throw createHttpError(401, 'Session expired');
    }

    // Check session timeout
    const sessionAge = Date.now() - sessionResult.lastActivity;
    if (sessionAge > SESSION_TIMEOUT) {
      await authService.logAuthFailure({
        reason: 'Session timeout',
        userId: validationResult.userId
      });
      throw createHttpError(401, 'Session timeout');
    }

    // Attach validated user to request
    req.user = {
      id: validationResult.userId,
      email: validationResult.email,
      role: validationResult.role,
      name: sessionResult.name
    };

    next();
  } catch (error) {
    if (error.status === 401) {
      res.status(401).json({
        error: 'Authentication failed',
        message: error.message,
        code: 'AUTH_FAILED'
      });
    } else {
      next(error);
    }
  }
};

/**
 * Authorization middleware factory that implements role-based access control
 * Supports role hierarchy and caches authorization results
 * @param allowedRoles Array of roles allowed to access the resource
 */
export const authorize = (allowedRoles: UserRole[]) => {
  return async (
    req: Request & { user?: AuthUser },
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        throw createHttpError(401, 'User not authenticated');
      }

      // Check if user role is allowed (including hierarchy)
      const isAuthorized = allowedRoles.some(role => 
        role === user.role || // Direct role match
        ROLE_HIERARCHY[user.role]?.includes(role) // Role hierarchy match
      );

      if (!isAuthorized) {
        const authService = new AuthService();
        await authService.logAuthFailure({
          reason: 'Insufficient permissions',
          userId: user.id,
          requiredRoles: allowedRoles,
          userRole: user.role
        });

        throw createHttpError(403, 'Insufficient permissions');
      }

      next();
    } catch (error) {
      if (error.status === 403) {
        res.status(403).json({
          error: 'Authorization failed',
          message: error.message,
          code: 'AUTH_FORBIDDEN'
        });
      } else {
        next(error);
      }
    }
  };
};
```

This implementation provides a robust authentication and authorization middleware with the following key features:

1. Comprehensive JWT token validation with Bearer scheme
2. Session management with 30-minute timeout
3. Role-based access control with role hierarchy support
4. Detailed security logging for audit purposes
5. Proper error handling with specific error messages
6. Type safety with TypeScript
7. Caching support for performance optimization
8. Follows security best practices from technical specifications

The middleware can be used in routes like this:

```typescript
// Public route
router.get('/benchmarks', authenticate, authorize([UserRole.PUBLIC]), benchmarkController.getAll);

// Admin route
router.post('/metrics', authenticate, authorize([UserRole.ADMIN]), metricsController.create);

// System admin route
router.put('/system/config', authenticate, authorize([UserRole.SYSTEM_ADMIN]), systemController.updateConfig);