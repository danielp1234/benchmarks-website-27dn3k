/// <reference types="vite/client" />

/**
 * Type definition for Vite environment variables used in the SaaS Benchmarks Platform.
 * Provides strict typing for environment configuration with readonly properties.
 * @version 4.4.0
 */
interface ImportMetaEnv {
  /** Base URL for the API endpoints */
  readonly VITE_API_URL: string;
  
  /** API version string (e.g. 'v1') */
  readonly VITE_API_VERSION: string;
  
  /** Allow for additional string environment variables */
  readonly [key: string]: string | undefined;
}

/**
 * Type augmentation for Vite's ImportMeta interface.
 * Ensures proper typing for environment variable access through import.meta.env
 */
interface ImportMeta {
  /** Environment variables with strict typing */
  readonly env: ImportMetaEnv;
}