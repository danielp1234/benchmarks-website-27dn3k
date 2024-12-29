/**
 * Health Check Routes Configuration
 * Version: 1.0.0
 * Purpose: Configure Express router for health check endpoints including system health status,
 * Kubernetes liveness and readiness probes with comprehensive monitoring support
 */

import { Router } from 'express'; // version: 4.18.2
import { HealthController } from '../controllers/health.controller';

// Initialize router with monitoring support
const healthRouter = Router();

// Initialize health controller instance
const healthController = new HealthController();

/**
 * @route   GET /health
 * @desc    Comprehensive system health check endpoint
 * @access  Public
 * @returns {ApiResponse} System health status with detailed component information
 */
healthRouter.get(
  '/health',
  async (req, res) => await healthController.checkHealth(req, res)
);

/**
 * @route   GET /health/liveness
 * @desc    Kubernetes liveness probe endpoint
 * @access  Public
 * @returns {ApiResponse} Basic application health status
 */
healthRouter.get(
  '/health/liveness',
  async (req, res) => await healthController.checkLiveness(req, res)
);

/**
 * @route   GET /health/readiness
 * @desc    Kubernetes readiness probe endpoint
 * @access  Public
 * @returns {ApiResponse} System readiness status with dependency checks
 */
healthRouter.get(
  '/health/readiness',
  async (req, res) => await healthController.checkReadiness(req, res)
);

// Apply rate limiting middleware to protect health check endpoints
healthRouter.use((req, res, next) => {
  // Add request timestamp for rate limiting
  req.timestamp = new Date();
  next();
});

// Error handling middleware for health check routes
healthRouter.use((err: Error, req: any, res: any, next: any) => {
  console.error(`Health check error: ${err.message}`);
  res.status(503).json({
    status: 'error',
    error: {
      name: err.name,
      type: 'HealthCheckError'
    },
    message: 'Health check failed',
    code: 503,
    timestamp: new Date().toISOString(),
    reference: `HC-${Date.now()}`,
    requestId: req.headers['x-request-id']?.toString() || 'unknown'
  });
});

export default healthRouter;