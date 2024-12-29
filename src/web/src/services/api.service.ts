/**
 * Core API Service for SaaS Benchmarks Platform
 * @version 1.0.0
 * @description Handles all HTTP requests with advanced features including retry logic,
 * circuit breaking, request queuing, response caching, and comprehensive error handling
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'; // v1.x
import {
  API_VERSION,
  API_BASE_URL,
  API_ENDPOINTS,
  API_METHODS,
  DEFAULT_HEADERS,
  HTTP_STATUS,
  API_RATE_LIMITS
} from '../constants/api';

// Types for request/response handling
interface ApiResponse<T = any> {
  data: T;
  status: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface RequestConfig extends AxiosRequestConfig {
  retry?: boolean;
  cache?: boolean;
  timeout?: number;
}

interface ErrorResponse {
  message: string;
  code: string;
  details?: any;
}

// Custom error classes
class ApiError extends Error {
  constructor(
    public message: string,
    public status: number,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class NetworkError extends ApiError {
  constructor(message: string = 'Network error occurred') {
    super(message, HTTP_STATUS.SERVER_ERROR, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

/**
 * Core API service class implementing enterprise-grade features
 */
export class ApiService {
  private readonly axiosInstance: AxiosInstance;
  private readonly requestQueue: Map<string, Promise<any>>;
  private readonly responseCache: Map<string, { data: any; timestamp: number }>;
  private failureCount: number;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_RESET_TIMEOUT = 60000;
  private circuitBreakerTimer?: NodeJS.Timeout;
  private isCircuitOpen = false;

  constructor() {
    // Initialize axios instance with default configuration
    this.axiosInstance = axios.create({
      baseURL: `${API_BASE_URL}${API_VERSION}`,
      timeout: 30000,
      headers: DEFAULT_HEADERS,
      withCredentials: true // Enable cookie handling for CSRF
    });

    this.requestQueue = new Map();
    this.responseCache = new Map();
    this.failureCount = 0;

    this.setupInterceptors();
  }

  /**
   * Configure request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Add request ID and timestamp
        config.headers['X-Request-ID'] = this.generateRequestId();
        config.headers['X-Request-Timestamp'] = new Date().toISOString();

        // Add CSRF token if available
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (csrfToken) {
          config.headers['X-CSRF-Token'] = csrfToken;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => this.transformResponse(response),
      (error) => this.handleRequestError(error)
    );
  }

  /**
   * Make an HTTP request with advanced features
   */
  public async request<T>(
    method: API_METHODS,
    endpoint: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    if (this.isCircuitOpen) {
      throw new ApiError('Service temporarily unavailable', HTTP_STATUS.SERVER_ERROR, 'CIRCUIT_OPEN');
    }

    const cacheKey = this.generateCacheKey(method, endpoint, data);
    
    // Check cache for GET requests
    if (method === API_METHODS.GET && config.cache !== false) {
      const cachedResponse = this.getFromCache(cacheKey);
      if (cachedResponse) return cachedResponse;
    }

    try {
      const response = await this.executeRequest<T>(method, endpoint, data, config);
      this.resetCircuitBreaker();
      return response;
    } catch (error) {
      this.handleCircuitBreaker(error);
      throw error;
    }
  }

  /**
   * Convenience methods for different HTTP methods
   */
  public async get<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(API_METHODS.GET, endpoint, undefined, config);
  }

  public async post<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(API_METHODS.POST, endpoint, data, config);
  }

  public async put<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(API_METHODS.PUT, endpoint, data, config);
  }

  public async delete<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(API_METHODS.DELETE, endpoint, undefined, config);
  }

  /**
   * Execute request with retry logic
   */
  private async executeRequest<T>(
    method: API_METHODS,
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const retryCount = config?.retry === false ? 0 : 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const response = await this.axiosInstance.request({
          method,
          url: endpoint,
          data,
          ...config
        });

        if (method === API_METHODS.GET && config?.cache !== false) {
          this.setCache(this.generateCacheKey(method, endpoint, data), response.data);
        }

        return response.data;
      } catch (error) {
        lastError = error as Error;
        if (!this.isRetryableError(error) || attempt === retryCount) {
          throw error;
        }
        await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
      }
    }

    throw lastError;
  }

  /**
   * Transform API response to standard format
   */
  private transformResponse(response: AxiosResponse): ApiResponse {
    return {
      data: response.data.data,
      status: response.data.status || 'success',
      timestamp: response.data.timestamp || new Date().toISOString(),
      metadata: response.data.metadata
    };
  }

  /**
   * Handle request errors
   */
  private async handleRequestError(error: AxiosError): Promise<never> {
    if (!error.response) {
      throw new NetworkError();
    }

    const errorResponse: ErrorResponse = {
      message: error.response.data?.message || 'An error occurred',
      code: error.response.data?.code || 'UNKNOWN_ERROR',
      details: error.response.data?.details
    };

    throw new ApiError(
      errorResponse.message,
      error.response.status,
      errorResponse.code,
      errorResponse.details
    );
  }

  /**
   * Circuit breaker methods
   */
  private handleCircuitBreaker(error: any): void {
    this.failureCount++;
    if (this.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
      this.isCircuitOpen = true;
      this.circuitBreakerTimer = setTimeout(
        () => this.resetCircuitBreaker(),
        this.CIRCUIT_BREAKER_RESET_TIMEOUT
      );
    }
  }

  private resetCircuitBreaker(): void {
    this.failureCount = 0;
    this.isCircuitOpen = false;
    if (this.circuitBreakerTimer) {
      clearTimeout(this.circuitBreakerTimer);
    }
  }

  /**
   * Cache management methods
   */
  private getFromCache<T>(key: string): ApiResponse<T> | null {
    const cached = this.responseCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    this.responseCache.delete(key);
    return null;
  }

  private setCache(key: string, data: ApiResponse): void {
    this.responseCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Utility methods
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCacheKey(method: string, endpoint: string, data?: any): string {
    return `${method}-${endpoint}-${data ? JSON.stringify(data) : ''}`;
  }

  private isRetryableError(error: any): boolean {
    return (
      !error.response ||
      error.response.status >= 500 ||
      error.response.status === HTTP_STATUS.RATE_LIMITED
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export default new ApiService();