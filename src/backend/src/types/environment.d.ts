/**
 * TypeScript declaration file that extends the NodeJS.ProcessEnv interface
 * to define strongly-typed environment variables used throughout the application.
 * @version 1.0.0
 */

declare namespace NodeJS {
  /**
   * Extended ProcessEnv interface with strongly-typed environment variables
   * for application configuration, security, and infrastructure settings
   */
  interface ProcessEnv {
    // Application Environment
    /** Runtime environment - development, production, staging, or test */
    NODE_ENV: "development" | "production" | "staging" | "test";
    /** Application port number */
    PORT: string;

    // Google OAuth 2.0 Configuration
    /** Google OAuth 2.0 client ID for authentication */
    GOOGLE_CLIENT_ID: string;
    /** Google OAuth 2.0 client secret */
    GOOGLE_CLIENT_SECRET: string;
    /** OAuth 2.0 callback URL for handling authentication response */
    GOOGLE_CALLBACK_URL: string;

    // JWT Configuration
    /** Secret key for JWT token signing and verification */
    JWT_SECRET: string;
    /** JWT token expiration time (e.g., "24h", "7d") */
    JWT_EXPIRY: string;

    // PostgreSQL Database Configuration
    /** Database host address */
    DB_HOST: string;
    /** Database port number */
    DB_PORT: string;
    /** Database username */
    DB_USER: string;
    /** Database password */
    DB_PASSWORD: string;
    /** Database name */
    DB_NAME: string;
    /** Enable/disable SSL for database connection */
    DB_SSL: "true" | "false";
    /** Path to SSL CA certificate file */
    DB_SSL_CA: string;
    /** Path to SSL client certificate file */
    DB_SSL_CERT: string;
    /** Path to SSL client key file */
    DB_SSL_KEY: string;

    // Redis Cache Configuration
    /** Redis server host address */
    REDIS_HOST: string;
    /** Redis server port number */
    REDIS_PORT: string;
    /** Redis server password */
    REDIS_PASSWORD: string;
    /** Cache TTL in seconds */
    REDIS_TTL: string;
    /** Enable/disable Redis cluster mode */
    REDIS_CLUSTER_MODE: "true" | "false";
    /** Comma-separated list of Redis cluster nodes (host:port) */
    REDIS_CLUSTER_NODES: string;
    /** Number of replica nodes per master in cluster */
    REDIS_CLUSTER_REPLICAS: string;
  }
}