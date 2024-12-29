/**
 * @fileoverview Frontend route constants for the SaaS Benchmarks Platform
 * @version 1.0.0
 * 
 * This file defines all route paths used for navigation and URL management
 * in the SaaS Benchmarks Platform. Routes are separated into public and
 * administrative sections for clear access control and navigation structure.
 */

/**
 * Public routes accessible without authentication
 * Used for benchmark data visualization and filtering interfaces
 */
export const PUBLIC_ROUTES = {
  /** Home page route - Landing page for all users */
  HOME: '/',
  
  /** Benchmarks page route - Main data visualization and filtering interface */
  BENCHMARKS: '/benchmarks',
} as const;

/**
 * Administrative routes requiring authentication
 * Used for platform management and data administration
 */
export const ADMIN_ROUTES = {
  /** Admin dashboard route - Overview and quick actions */
  DASHBOARD: '/admin',
  
  /** Metrics management route - CRUD operations for benchmark metrics */
  METRICS: '/admin/metrics',
  
  /** Data sources management route - Configuration of benchmark data sources */
  SOURCES: '/admin/sources',
  
  /** Data import route - Bulk data import interface */
  IMPORT: '/admin/import',
  
  /** Audit logs route - System activity monitoring */
  AUDIT: '/admin/audit',
} as const;

/**
 * Type definitions for route constants to ensure type safety when using routes
 */
export type PublicRoutes = typeof PUBLIC_ROUTES[keyof typeof PUBLIC_ROUTES];
export type AdminRoutes = typeof ADMIN_ROUTES[keyof typeof ADMIN_ROUTES];
export type AppRoutes = PublicRoutes | AdminRoutes;

/**
 * Helper function to validate if a given path is an admin route
 * @param path - The route path to check
 * @returns boolean indicating if the path is an admin route
 */
export const isAdminRoute = (path: string): boolean => {
  return path.startsWith('/admin');
};

/**
 * Helper function to validate if a given path is a public route
 * @param path - The route path to check
 * @returns boolean indicating if the path is a public route
 */
export const isPublicRoute = (path: string): boolean => {
  return Object.values(PUBLIC_ROUTES).includes(path as PublicRoutes);
};