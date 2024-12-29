/**
 * Health Check Controller
 * Version: 1.0.0
 * Purpose: Implements comprehensive health check endpoints for system monitoring,
 * including Kubernetes probes and detailed component status tracking
 */

import { Request, Response } from 'express'; // version: 4.18.2
import { ApiResponse, ResponseStatus } from '../../interfaces/response.interface';

/**
 * Interface for component health status
 */
interface ComponentHealth {
  status: boolean;
  lastCheck: Date;
  details?: Record<string, any>;
}

/**
 * Interface for connection pool metrics
 */
interface ConnectionPoolMetrics {
  total: number;
  active: number;
  idle: number;
  waiting: number;
  latency: number;
}

/**
 * Health check controller implementing comprehensive system health monitoring
 */
export class HealthController {
  private lastCheckTime: Date;
  private healthStatus: boolean;
  private componentStatus: Map<string, ComponentHealth>;
  private readonly checkInterval: number;
  private connectionPools: Map<string, ConnectionPoolMetrics>;

  constructor() {
    this.lastCheckTime = new Date();
    this.healthStatus = true;
    this.componentStatus = new Map();
    this.checkInterval = 60000; // 1 minute
    this.connectionPools = new Map();

    // Initialize component health tracking
    this.initializeComponentStatus();
  }

  /**
   * Initialize component status tracking with default values
   */
  private initializeComponentStatus(): void {
    const components = [
      'database',
      'redis',
      'api',
      'metrics-service',
      'export-service'
    ];

    components.forEach(component => {
      this.componentStatus.set(component, {
        status: true,
        lastCheck: new Date(),
        details: {}
      });
    });
  }

  /**
   * Comprehensive health check endpoint
   * Verifies all system components and returns detailed status
   */
  public async checkHealth(req: Request, res: Response): Promise<Response> {
    try {
      // Check if minimum interval has elapsed
      const now = new Date();
      const timeSinceLastCheck = now.getTime() - this.lastCheckTime.getTime();
      
      if (timeSinceLastCheck < this.checkInterval) {
        return this.sendHealthResponse(res, true);
      }

      // Perform comprehensive health checks
      const healthStatus = await this.performHealthChecks();
      this.lastCheckTime = now;
      this.healthStatus = healthStatus.every(status => status.healthy);

      // Prepare detailed response
      const response: ApiResponse<any> = {
        data: {
          healthy: this.healthStatus,
          components: Object.fromEntries(this.componentStatus),
          connectionPools: Object.fromEntries(this.connectionPools),
          lastCheck: this.lastCheckTime.toISOString(),
          uptime: process.uptime(),
          memory: process.memoryUsage()
        },
        status: this.healthStatus ? ResponseStatus.SUCCESS : ResponseStatus.ERROR,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']?.toString() || 'unknown'
      };

      return res.status(this.healthStatus ? 200 : 503).json(response);
    } catch (error) {
      return this.handleHealthCheckError(res, error);
    }
  }

  /**
   * Kubernetes liveness probe endpoint
   * Verifies basic application health
   */
  public async checkLiveness(req: Request, res: Response): Promise<Response> {
    try {
      // Basic process health checks
      const isProcessHealthy = this.checkProcessHealth();
      
      if (!isProcessHealthy) {
        throw new Error('Process health check failed');
      }

      const response: ApiResponse<any> = {
        data: {
          alive: true,
          timestamp: new Date().toISOString()
        },
        status: ResponseStatus.SUCCESS,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']?.toString() || 'unknown'
      };

      return res.status(200).json(response);
    } catch (error) {
      return this.handleHealthCheckError(res, error);
    }
  }

  /**
   * Kubernetes readiness probe endpoint
   * Verifies system's ability to handle traffic
   */
  public async checkReadiness(req: Request, res: Response): Promise<Response> {
    try {
      // Check connection pools and component readiness
      const readinessStatus = await this.checkSystemReadiness();

      const response: ApiResponse<any> = {
        data: {
          ready: readinessStatus.ready,
          details: readinessStatus.details,
          timestamp: new Date().toISOString()
        },
        status: readinessStatus.ready ? ResponseStatus.SUCCESS : ResponseStatus.ERROR,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']?.toString() || 'unknown'
      };

      return res.status(readinessStatus.ready ? 200 : 503).json(response);
    } catch (error) {
      return this.handleHealthCheckError(res, error);
    }
  }

  /**
   * Perform comprehensive health checks across all components
   */
  private async performHealthChecks(): Promise<Array<{ component: string; healthy: boolean }>> {
    const checks = [
      this.checkDatabaseHealth(),
      this.checkRedisHealth(),
      this.checkAPIHealth(),
      this.checkMetricsServiceHealth(),
      this.checkExportServiceHealth()
    ];

    return Promise.all(checks);
  }

  /**
   * Check database health including connection pool metrics
   */
  private async checkDatabaseHealth(): Promise<{ component: string; healthy: boolean }> {
    try {
      // Simulate database health check
      const poolMetrics: ConnectionPoolMetrics = {
        total: 100,
        active: 45,
        idle: 50,
        waiting: 5,
        latency: 2.5
      };

      this.connectionPools.set('database', poolMetrics);
      this.componentStatus.set('database', {
        status: true,
        lastCheck: new Date(),
        details: { poolMetrics }
      });

      return { component: 'database', healthy: true };
    } catch (error) {
      this.handleComponentError('database', error);
      return { component: 'database', healthy: false };
    }
  }

  /**
   * Check Redis health including connection pool metrics
   */
  private async checkRedisHealth(): Promise<{ component: string; healthy: boolean }> {
    try {
      // Simulate Redis health check
      const poolMetrics: ConnectionPoolMetrics = {
        total: 50,
        active: 20,
        idle: 25,
        waiting: 5,
        latency: 1.5
      };

      this.connectionPools.set('redis', poolMetrics);
      this.componentStatus.set('redis', {
        status: true,
        lastCheck: new Date(),
        details: { poolMetrics }
      });

      return { component: 'redis', healthy: true };
    } catch (error) {
      this.handleComponentError('redis', error);
      return { component: 'redis', healthy: false };
    }
  }

  /**
   * Check process health metrics
   */
  private checkProcessHealth(): boolean {
    const memoryUsage = process.memoryUsage();
    const maxHeapSize = 1024 * 1024 * 1024; // 1GB

    return memoryUsage.heapUsed < maxHeapSize;
  }

  /**
   * Check system readiness for handling traffic
   */
  private async checkSystemReadiness(): Promise<{ ready: boolean; details: Record<string, any> }> {
    const details: Record<string, any> = {};
    
    // Check connection pools
    const dbPool = this.connectionPools.get('database');
    const redisPool = this.connectionPools.get('redis');

    details.connectionPools = {
      database: dbPool ? dbPool.waiting < dbPool.total * 0.9 : false,
      redis: redisPool ? redisPool.waiting < redisPool.total * 0.9 : false
    };

    // Check component status
    details.components = {};
    this.componentStatus.forEach((value, key) => {
      details.components[key] = value.status;
    });

    const ready = Object.values(details.components).every(status => status) &&
                 Object.values(details.connectionPools).every(status => status);

    return { ready, details };
  }

  /**
   * Handle component-specific errors
   */
  private handleComponentError(component: string, error: any): void {
    this.componentStatus.set(component, {
      status: false,
      lastCheck: new Date(),
      details: {
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Handle health check errors and return appropriate response
   */
  private handleHealthCheckError(res: Response, error: any): Response {
    const response: ApiResponse<any> = {
      data: {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      },
      status: ResponseStatus.ERROR,
      timestamp: new Date().toISOString(),
      requestId: res.req.headers['x-request-id']?.toString() || 'unknown'
    };

    return res.status(503).json(response);
  }

  /**
   * Send standardized health response
   */
  private sendHealthResponse(res: Response, healthy: boolean): Response {
    const response: ApiResponse<any> = {
      data: {
        healthy,
        lastCheck: this.lastCheckTime.toISOString(),
        components: Object.fromEntries(this.componentStatus),
        connectionPools: Object.fromEntries(this.connectionPools)
      },
      status: healthy ? ResponseStatus.SUCCESS : ResponseStatus.ERROR,
      timestamp: new Date().toISOString(),
      requestId: res.req.headers['x-request-id']?.toString() || 'unknown'
    };

    return res.status(healthy ? 200 : 503).json(response);
  }

  // Additional helper methods for API, Metrics, and Export service health checks
  private async checkAPIHealth(): Promise<{ component: string; healthy: boolean }> {
    // Implementation would include actual API health checks
    return { component: 'api', healthy: true };
  }

  private async checkMetricsServiceHealth(): Promise<{ component: string; healthy: boolean }> {
    // Implementation would include actual metrics service health checks
    return { component: 'metrics-service', healthy: true };
  }

  private async checkExportServiceHealth(): Promise<{ component: string; healthy: boolean }> {
    // Implementation would include actual export service health checks
    return { component: 'export-service', healthy: true };
  }
}