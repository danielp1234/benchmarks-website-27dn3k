import { config } from 'dotenv'; // v16.x
import { JwtModuleOptions } from '@nestjs/jwt'; // v10.x
import { AuthConfig } from '../interfaces/config.interface';
import { UserRole } from '../interfaces/auth.interface';

// Load environment variables
config();

/**
 * Validates the completeness and correctness of authentication configuration
 * Throws detailed error messages if validation fails
 */
function validateAuthConfig(): void {
  const requiredEnvVars = [
    'GOOGLE_OAUTH_CLIENT_ID',
    'GOOGLE_OAUTH_CLIENT_SECRET',
    'GOOGLE_OAUTH_CALLBACK_URL',
    'ALLOWED_ADMIN_DOMAINS',
    'JWT_SECRET',
    'JWT_AUDIENCE',
    'JWT_ISSUER',
    'SESSION_SECRET',
    'COOKIE_DOMAIN',
    'ADMIN_IP_WHITELIST'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate JWT secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  // Validate session secret strength
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters long');
  }
}

// Validate configuration on module load
validateAuthConfig();

/**
 * Comprehensive authentication configuration object
 * Implements security requirements from technical specification
 */
export const authConfig: AuthConfig = {
  googleOAuth: {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    callbackURL: process.env.GOOGLE_OAUTH_CALLBACK_URL!,
    scope: ['email', 'profile'],
    allowedDomains: process.env.ALLOWED_ADMIN_DOMAINS!.split(',')
  },

  jwt: {
    secret: process.env.JWT_SECRET!,
    signOptions: {
      expiresIn: '30m', // 30 minute token lifetime
      notBefore: '0', // Token valid immediately
      audience: process.env.JWT_AUDIENCE!,
      issuer: process.env.JWT_ISSUER!,
      algorithm: 'HS512' // Use strong hashing algorithm
    },
    verifyOptions: {
      clockTolerance: 0, // Strict timestamp validation
      ignoreExpiration: false, // Always check expiration
      audience: process.env.JWT_AUDIENCE!,
      issuer: process.env.JWT_ISSUER!
    }
  },

  session: {
    secret: process.env.SESSION_SECRET!,
    ttl: 1800, // 30 minute session lifetime
    cookie: {
      secure: true, // Require HTTPS
      httpOnly: true, // Prevent JavaScript access
      maxAge: 1800000, // 30 minutes in milliseconds
      sameSite: 'strict', // Strict CSRF protection
      domain: process.env.COOKIE_DOMAIN!,
      path: '/api'
    },
    rolling: true, // Reset expiration on activity
    resave: false, // Don't save unmodified sessions
    saveUninitialized: false // Don't save empty sessions
  },

  // Role-based access control matrix
  rolePermissions: {
    [UserRole.PUBLIC]: [
      'read:benchmarks'
    ],
    [UserRole.ADMIN]: [
      'read:benchmarks',
      'write:metrics',
      'write:sources',
      'read:audit'
    ],
    [UserRole.SYSTEM_ADMIN]: [
      'read:benchmarks',
      'write:metrics',
      'write:sources',
      'read:audit',
      'write:system'
    ]
  },

  // Additional security configurations
  security: {
    rateLimit: {
      windowMs: 900000, // 15 minutes
      max: 1000 // requests per windowMs
    },
    ipWhitelist: process.env.ADMIN_IP_WHITELIST!.split(','),
    maxLoginAttempts: 5,
    lockoutDuration: 900000, // 15 minutes in milliseconds
    headers: {
      strictTransportSecurity: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
        preload: true
      },
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
      referrerPolicy: 'strict-origin-when-cross-origin',
      permittedCrossDomainPolicies: 'none',
      expectCt: {
        enforce: true,
        maxAge: 86400 // 24 hours
      }
    }
  }
};