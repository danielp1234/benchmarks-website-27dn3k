// dotenv v16.x - Load environment variables
import { config } from 'dotenv';
import { DatabaseConfig } from '../interfaces/config.interface';

// Load environment variables
config();

/**
 * Validates database host format using regex pattern
 * @param host Database host string to validate
 * @returns boolean indicating if host format is valid
 */
const validateHostFormat = (host: string): boolean => {
  // IP address pattern
  const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  // Domain name pattern
  const domainPattern = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  
  return ipPattern.test(host) || domainPattern.test(host);
};

/**
 * Validates database configuration including security requirements
 * and connection pooling settings
 * @throws Error with validation details if configuration is invalid
 */
const validateDatabaseConfig = (): void => {
  const errors: string[] = [];

  // Required environment variables
  const requiredVars = [
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'DB_POOL_SIZE',
    'DB_IDLE_TIMEOUT'
  ];

  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  });

  // Port validation
  const port = parseInt(process.env.DB_PORT || '', 10);
  if (isNaN(port) || port < 1024 || port > 65535) {
    errors.push('Database port must be between 1024 and 65535');
  }

  // Host format validation
  if (process.env.DB_HOST && !validateHostFormat(process.env.DB_HOST)) {
    errors.push('Invalid database host format');
  }

  // SSL enforcement in production
  if (process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'true') {
    errors.push('SSL must be enabled in production environment');
  }

  // Password complexity validation
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
  if (process.env.DB_PASSWORD && !passwordRegex.test(process.env.DB_PASSWORD)) {
    errors.push('Database password does not meet complexity requirements');
  }

  // Connection pool size validation
  const poolSize = parseInt(process.env.DB_POOL_SIZE || '', 10);
  if (isNaN(poolSize) || poolSize < 2 || poolSize > 20) {
    errors.push('Connection pool size must be between 2 and 20');
  }

  // Idle timeout validation
  const idleTimeout = parseInt(process.env.DB_IDLE_TIMEOUT || '', 10);
  if (isNaN(idleTimeout) || idleTimeout < 1000 || idleTimeout > 30000) {
    errors.push('Idle timeout must be between 1000 and 30000 milliseconds');
  }

  if (errors.length > 0) {
    throw new Error(`Database configuration validation failed:\n${errors.join('\n')}`);
  }
};

// Validate configuration before creating config object
validateDatabaseConfig();

/**
 * Database configuration object with enhanced security and connection pooling settings
 * @type {DatabaseConfig}
 */
export const databaseConfig: DatabaseConfig = {
  host: process.env.DB_HOST!,
  port: parseInt(process.env.DB_PORT!, 10),
  username: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
  ssl: process.env.NODE_ENV === 'production' ? true : (process.env.DB_SSL === 'true'),
  poolSize: parseInt(process.env.DB_POOL_SIZE!, 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT!, 10)
};

// Freeze configuration object to prevent modifications
Object.freeze(databaseConfig);