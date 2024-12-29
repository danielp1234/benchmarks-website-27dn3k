// @nestjs/jwt v10.x - Type definitions for JWT configuration
import { JwtModuleOptions } from '@nestjs/jwt';

/**
 * Interface for PostgreSQL database configuration
 * Defines connection and pool settings for primary and replica databases
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
  poolSize: number;
  replication?: {
    master: {
      host: string;
      port: number;
    };
    slaves: Array<{
      host: string;
      port: number;
    }>;
  };
}

/**
 * Interface for Redis cache configuration
 * Supports both standalone and cluster deployments
 */
export interface RedisConfig {
  host: string;
  port: number;
  password: string;
  ttl: number; // Time-to-live in seconds
  clusterMode: boolean;
  nodes?: Array<{
    host: string;
    port: number;
  }>;
  keyPrefix: string;
}

/**
 * Interface for authentication and authorization configuration
 * Includes OAuth, JWT, session management and security settings
 */
export interface AuthConfig {
  googleOAuth: {
    clientId: string;
    clientSecret: string;
    callbackURL: string;
    scope: string[];
  };
  jwt: JwtModuleOptions;
  session: {
    secret: string;
    expiresIn: number; // Session duration in seconds
    cookie: {
      secure: boolean;
      maxAge: number;
      httpOnly: boolean;
    };
  };
  rolePermissions: {
    [key: string]: string[]; // Role-based permission mappings
  };
  rateLimiting: {
    windowMs: number;
    maxRequests: number;
  };
  securityHeaders: {
    contentSecurityPolicy: {
      directives: {
        [key: string]: string[];
      };
    };
    strictTransportSecurity: {
      maxAge: number;
      includeSubDomains: boolean;
    };
  };
}

/**
 * Interface for logging configuration
 * Supports multiple transport options and custom metadata
 */
export interface LoggerConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'simple' | 'combined';
  transports: Array<{
    type: string;
    options: {
      filename?: string;
      maxFiles?: number;
      maxSize?: string;
      [key: string]: any;
    };
  }>;
  exceptionHandlers: Array<{
    type: string;
    options: {
      filename?: string;
      [key: string]: any;
    };
  }>;
  metadata: {
    service: string;
    environment: string;
    [key: string]: any;
  };
}

/**
 * Interface for server configuration
 * Includes HTTP server settings and middleware options
 */
export interface ServerConfig {
  port: number;
  cors: {
    origin: string | string[];
    methods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    credentials: boolean;
    maxAge: number;
  };
  rateLimit: {
    windowMs: number;
    max: number;
    message: string;
  };
  compression: {
    level: number;
    threshold: number;
    filter: (req: any, res: any) => boolean;
  };
  helmet: {
    contentSecurityPolicy: boolean;
    crossOriginEmbedderPolicy: boolean;
    crossOriginOpenerPolicy: boolean;
    crossOriginResourcePolicy: boolean;
    dnsPrefetchControl: boolean;
    frameguard: boolean;
    hidePoweredBy: boolean;
    hsts: boolean;
    ieNoOpen: boolean;
    noSniff: boolean;
    originAgentCluster: boolean;
    permittedCrossDomainPolicies: boolean;
    referrerPolicy: boolean;
    xssFilter: boolean;
  };
}