/**
 * @file Security Configuration
 * @description Defines comprehensive security configuration settings for the application
 * @version 1.0.0
 */

import { config } from 'dotenv'; // v16.x
import helmet from 'helmet'; // v7.x
import { SecurityConfig } from '../interfaces/config.interface';
import { SECURITY_HEADERS } from '../constants/headers';

// Load environment variables
config();

/**
 * Validates security configuration settings
 * @throws {Error} If validation fails for any security setting
 */
const validateSecurityConfig = (): void => {
  // Validate rate limiting thresholds
  if (!securityConfig.rateLimit.max.public || !securityConfig.rateLimit.max.authenticated) {
    throw new Error('Rate limiting thresholds must be defined for both public and authenticated users');
  }

  // Validate CORS origin
  if (!process.env.CORS_ORIGIN) {
    throw new Error('CORS origin must be defined in environment variables');
  }

  // Validate TLS configuration
  if (securityConfig.tls.version !== 'TLSv1.3' && securityConfig.tls.minVersion !== 'TLSv1.2') {
    throw new Error('TLS version must be 1.3 with minimum version 1.2');
  }

  // Validate security headers
  const requiredHeaders = [
    'Strict-Transport-Security',
    'Content-Security-Policy',
    'X-Frame-Options',
    'X-Content-Type-Options',
    'X-XSS-Protection'
  ];

  const missingHeaders = requiredHeaders.filter(header => !SECURITY_HEADERS[header]);
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required security headers: ${missingHeaders.join(', ')}`);
  }
};

/**
 * Security configuration object implementing SecurityConfig interface
 * Includes comprehensive security settings for headers, rate limiting, CORS, and TLS
 */
export const securityConfig: SecurityConfig = {
  /**
   * Security headers configuration
   * Implements recommended security headers for protection against common web vulnerabilities
   */
  headers: {
    ...SECURITY_HEADERS,
    // Additional headers can be added here if needed
  },

  /**
   * Rate limiting configuration
   * Implements different rate limits for public and authenticated users
   */
  rateLimit: {
    windowMs: 3600000, // 1 hour in milliseconds
    max: {
      public: 1000, // 1000 requests per hour for public users
      authenticated: 5000 // 5000 requests per hour for authenticated users
    },
    skipSuccessfulRequests: false,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
      });
    }
  },

  /**
   * CORS configuration
   * Implements strict CORS policies for cross-origin resource sharing
   */
  cors: {
    origin: process.env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    credentials: true,
    maxAge: 86400, // 24 hours in seconds
    preflightContinue: false,
    optionsSuccessStatus: 204
  },

  /**
   * TLS configuration
   * Implements secure TLS settings with modern cipher suites
   */
  tls: {
    version: 'TLSv1.3',
    ciphers: [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256'
    ],
    preferServerCiphers: true,
    minVersion: 'TLSv1.2',
    honorCipherOrder: true,
    sessionTimeout: 300 // 5 minutes in seconds
  }
};

// Validate security configuration on module load
validateSecurityConfig();

// Export validated security configuration
export default securityConfig;