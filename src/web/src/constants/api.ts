/**
 * API Constants for SaaS Benchmarks Platform
 * @version 1.0.0
 * @description Defines API-related constants including base URL, version, endpoints, and HTTP methods
 */

/**
 * Current API version string
 * Used as prefix for all API endpoints
 */
export const API_VERSION = '/api/v1' as const;

/**
 * Base URL for API endpoints
 * Uses environment variable in production or localhost for development
 */
export const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * HTTP Methods enum for type-safe API requests
 */
export enum API_METHODS {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH'
}

/**
 * Authentication endpoint paths
 */
export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  VERIFY: '/auth/verify',
  GOOGLE: '/auth/google'
} as const;

/**
 * Metrics endpoint paths
 */
export const METRICS_ENDPOINTS = {
  BASE: '/metrics',
  LIST: '/metrics/list',
  DETAILS: '/metrics/:id',
  CATEGORIES: '/metrics/categories',
  VALIDATE: '/metrics/validate'
} as const;

/**
 * Benchmarks endpoint paths
 */
export const BENCHMARKS_ENDPOINTS = {
  BASE: '/benchmarks',
  FILTER: '/benchmarks/filter',
  SUMMARY: '/benchmarks/summary',
  PERCENTILES: '/benchmarks/percentiles',
  TRENDS: '/benchmarks/trends'
} as const;

/**
 * Data sources endpoint paths
 */
export const SOURCES_ENDPOINTS = {
  BASE: '/sources',
  LIST: '/sources/list',
  DETAILS: '/sources/:id',
  VALIDATE: '/sources/validate',
  STATUS: '/sources/status'
} as const;

/**
 * Export functionality endpoint paths
 */
export const EXPORT_ENDPOINTS = {
  GENERATE: '/export/generate',
  DOWNLOAD: '/export/download/:id',
  STATUS: '/export/status/:id',
  FORMATS: '/export/formats'
} as const;

/**
 * Administrative endpoint paths
 */
export const ADMIN_ENDPOINTS = {
  DASHBOARD: '/admin/dashboard',
  IMPORT: '/admin/import',
  AUDIT: '/admin/audit',
  USERS: '/admin/users',
  SETTINGS: '/admin/settings',
  HEALTH: '/admin/health'
} as const;

/**
 * Complete API endpoint mapping
 * Provides structured access to all API endpoints
 */
export const API_ENDPOINTS = {
  AUTH: AUTH_ENDPOINTS,
  METRICS: METRICS_ENDPOINTS,
  BENCHMARKS: BENCHMARKS_ENDPOINTS,
  SOURCES: SOURCES_ENDPOINTS,
  EXPORT: EXPORT_ENDPOINTS,
  ADMIN: ADMIN_ENDPOINTS
} as const;

/**
 * Type definitions for API endpoints
 */
export type ApiEndpoint = typeof API_ENDPOINTS;
export type AuthEndpoint = typeof AUTH_ENDPOINTS;
export type MetricsEndpoint = typeof METRICS_ENDPOINTS;
export type BenchmarksEndpoint = typeof BENCHMARKS_ENDPOINTS;
export type SourcesEndpoint = typeof SOURCES_ENDPOINTS;
export type ExportEndpoint = typeof EXPORT_ENDPOINTS;
export type AdminEndpoint = typeof ADMIN_ENDPOINTS;

/**
 * Helper function to construct full API URL
 * @param endpoint - API endpoint path
 * @returns Full API URL with version
 */
export const getApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${API_VERSION}${endpoint}`;
};

/**
 * Rate limit configuration
 * Based on technical specifications
 */
export const API_RATE_LIMITS = {
  PUBLIC: 1000, // requests per hour
  AUTHENTICATED: 5000 // requests per hour
} as const;

/**
 * Default headers for API requests
 * Implements security requirements from technical specifications
 */
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-Requested-With': 'XMLHttpRequest'
} as const;

/**
 * HTTP status codes used in API responses
 */
export enum HTTP_STATUS {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  RATE_LIMITED = 429,
  SERVER_ERROR = 500
}