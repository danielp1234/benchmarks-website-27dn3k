/**
 * @file Server Configuration
 * @description Defines server configuration settings including port, CORS, rate limiting,
 * security headers and other server-related configurations for the SaaS Benchmarks Platform
 * @version 1.0.0
 */

import { config } from 'dotenv'; // v16.x
import { ServerConfig } from '../interfaces/config.interface';
import { SECURITY_HEADERS } from '../constants/headers';

// Load environment variables
config();

// Default configuration values
const DEFAULT_PORT = 3000;
const DEFAULT_RATE_LIMIT_WINDOW = 3600000; // 1 hour in milliseconds
const DEFAULT_PUBLIC_RATE_LIMIT = 1000;     // 1000 requests per hour for public endpoints
const DEFAULT_AUTH_RATE_LIMIT = 5000;       // 5000 requests per hour for authenticated endpoints

/**
 * Validates and returns the server port from environment variables
 * @returns {number} Validated server port
 * @throws {Error} If port is invalid
 */
const validatePort = (): number => {
    const port = parseInt(process.env.SERVER_PORT || DEFAULT_PORT.toString(), 10);
    if (isNaN(port) || port <= 0 || port > 65535) {
        throw new Error('Invalid server port configuration');
    }
    return port;
};

/**
 * Server configuration object implementing ServerConfig interface
 * Contains all server-related settings including security, CORS, and rate limiting
 */
export const serverConfig: ServerConfig = {
    // Server port configuration
    port: validatePort(),

    // CORS configuration
    cors: {
        origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
            'Accept',
            'Origin'
        ],
        exposedHeaders: ['Content-Disposition'],
        credentials: true,
        maxAge: 86400 // 24 hours in seconds
    },

    // Rate limiting configuration
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || DEFAULT_RATE_LIMIT_WINDOW.toString(), 10),
        max: (req) => {
            // Apply different rate limits based on authentication status
            return req.isAuthenticated() 
                ? parseInt(process.env.AUTH_RATE_LIMIT || DEFAULT_AUTH_RATE_LIMIT.toString(), 10)
                : parseInt(process.env.PUBLIC_RATE_LIMIT || DEFAULT_PUBLIC_RATE_LIMIT.toString(), 10);
        },
        message: 'Too many requests from this IP, please try again later.'
    },

    // Compression configuration for response optimization
    compression: {
        level: 6, // Balanced compression level
        threshold: 1024, // Only compress responses larger than 1KB
        filter: (req, res) => {
            // Don't compress responses for older browsers
            if (req.headers['user-agent']?.includes('MSIE')) {
                return false;
            }
            // Use compression by default
            return true;
        }
    },

    // Helmet security configuration
    helmet: {
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
    }
};

// Apply security headers from constants
Object.assign(serverConfig, { securityHeaders: SECURITY_HEADERS });

/**
 * Validate the complete server configuration
 * Throws error if any required configuration is missing or invalid
 */
const validateConfig = (config: ServerConfig): void => {
    if (!config.port) {
        throw new Error('Server port configuration is required');
    }
    if (!config.cors.origin) {
        throw new Error('CORS origin configuration is required');
    }
    if (!config.rateLimit.windowMs || !config.rateLimit.max) {
        throw new Error('Rate limiting configuration is required');
    }
};

// Validate configuration before export
validateConfig(serverConfig);

// Freeze configuration object to prevent runtime modifications
Object.freeze(serverConfig);