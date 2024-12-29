// express@4.x
import { Router } from 'express';
// express-rate-limit@6.x
import rateLimit from 'express-rate-limit';

// Internal imports
import { AuthController } from '../controllers/auth.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';
import { UserRole } from '../../interfaces/auth.interface';
import { HTTP_STATUS, ERROR_MESSAGES } from '../../constants/errors';

/**
 * Rate limiter configuration for authentication endpoints
 * Implements security specifications for request limiting
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: ERROR_MESSAGES.RATE_LIMIT_ERROR,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Authentication routes configuration
 * Implements secure authentication flow with Google OAuth
 */
const authRouter = Router();
const authController = new AuthController();

// Security headers for authentication routes
authRouter.use((req, res, next) => {
  res.set({
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
});

// Apply rate limiting to all auth routes
authRouter.use(authRateLimiter);

/**
 * POST /auth/login
 * Google OAuth authentication endpoint
 * Validates Google token and creates session
 */
authRouter.post('/login', 
  validateRequest({
    body: {
      token: { type: 'string', required: true }
    }
  }),
  async (req, res, next) => {
    try {
      const { user, accessToken } = await authController.login(req.body);
      
      res.cookie('session', accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 1800000, // 30 minutes
        path: '/api'
      });

      res.status(HTTP_STATUS.OK).json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name
        },
        tokenType: 'Bearer',
        expiresIn: 1800
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /auth/verify
 * Token verification endpoint
 * Validates JWT token and session status
 */
authRouter.post('/verify',
  authenticate,
  async (req, res, next) => {
    try {
      const user = await authController.verifyToken(req.headers.authorization!.split(' ')[1]);
      res.status(HTTP_STATUS.OK).json({ user });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /auth/refresh
 * Token refresh endpoint
 * Issues new access token if current session is valid
 */
authRouter.post('/refresh',
  authenticate,
  async (req, res, next) => {
    try {
      const { accessToken } = await authController.refreshToken(req.user.id);
      
      res.cookie('session', accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 1800000,
        path: '/api'
      });

      res.status(HTTP_STATUS.OK).json({
        tokenType: 'Bearer',
        expiresIn: 1800
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /auth/logout
 * Logout endpoint
 * Invalidates current session and clears cookies
 */
authRouter.post('/logout',
  authenticate,
  async (req, res, next) => {
    try {
      await authController.logout(req.user.id);
      
      res.clearCookie('session', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/api'
      });

      res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /auth/session
 * Session validation endpoint
 * Returns current session status and user data
 * Protected route requiring authentication
 */
authRouter.get('/session',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SYSTEM_ADMIN]),
  (req, res) => {
    res.status(HTTP_STATUS.OK).json({
      user: req.user,
      sessionExpiry: new Date(Date.now() + 1800000).toISOString()
    });
  }
);

export { authRouter };