/**
 * Authentication Service for SaaS Benchmarks Platform
 * Implements secure authentication flow with Google OAuth and session management
 * @version 1.0.0
 */

import { GoogleAuthProvider } from '@react-oauth/google'; // v0.11.x
import { EventEmitter } from 'events';
import ApiService from './api.service';
import { AuthUser, LoginResponse, UserRole } from '../interfaces/auth.interface';
import { setToken, removeToken, getUserFromToken, isTokenValid } from '../utils/auth.utils';
import { AUTH_ENDPOINTS } from '../constants/api';

// Type definitions for auth state change events
type AuthStateListener = (user: AuthUser | null) => void;

/**
 * Authentication service class implementing secure authentication and session management
 */
export class AuthService {
  private readonly SESSION_TIMEOUT = 1800000; // 30 minutes in milliseconds
  private readonly authStateEmitter: EventEmitter;
  private sessionTimeoutTimer?: NodeJS.Timeout;
  private refreshTokenTimer?: NodeJS.Timeout;
  private currentUser: AuthUser | null = null;

  constructor(private readonly apiService: typeof ApiService) {
    this.authStateEmitter = new EventEmitter();
    this.initializeAuthState();
  }

  /**
   * Initialize authentication state from stored token
   */
  private initializeAuthState(): void {
    try {
      const user = getUserFromToken();
      if (user) {
        this.currentUser = user;
        this.setupSessionTimeout();
        this.setupTokenRefresh();
      }
    } catch (error) {
      console.error('Error initializing auth state:', error);
      this.logout();
    }
  }

  /**
   * Authenticate user with Google OAuth token
   * @param googleToken - Google OAuth token
   * @returns Promise<LoginResponse>
   */
  public async login(googleToken: string): Promise<LoginResponse> {
    try {
      // Validate token format
      if (!googleToken || typeof googleToken !== 'string') {
        throw new Error('Invalid Google token format');
      }

      // Exchange Google token for JWT
      const response = await this.apiService.post<LoginResponse>(
        AUTH_ENDPOINTS.GOOGLE,
        { token: googleToken }
      );

      const { user, token, expiresIn } = response.data;

      // Validate response data
      if (!user || !token || !expiresIn) {
        throw new Error('Invalid authentication response');
      }

      // Store token and setup session
      setToken(token);
      this.currentUser = user;
      this.setupSessionTimeout();
      this.setupTokenRefresh();
      this.emitAuthStateChange(user);

      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      this.logout();
      throw error;
    }
  }

  /**
   * Logout user and cleanup session
   */
  public logout(): void {
    try {
      // Cleanup backend session
      this.apiService.post(AUTH_ENDPOINTS.LOGOUT).catch(console.error);

      // Cleanup timers
      if (this.sessionTimeoutTimer) {
        clearTimeout(this.sessionTimeoutTimer);
      }
      if (this.refreshTokenTimer) {
        clearTimeout(this.refreshTokenTimer);
      }

      // Clear auth state
      this.currentUser = null;
      removeToken();
      this.emitAuthStateChange(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  /**
   * Get current authenticated user
   * @returns AuthUser | null
   */
  public getCurrentUser(): AuthUser | null {
    if (!this.currentUser || !isTokenValid()) {
      this.logout();
      return null;
    }
    return this.currentUser;
  }

  /**
   * Refresh JWT token before expiration
   * @returns Promise<boolean>
   */
  public async refreshToken(): Promise<boolean> {
    try {
      const response = await this.apiService.post<LoginResponse>(AUTH_ENDPOINTS.REFRESH);
      const { token, user, expiresIn } = response.data;

      if (!token || !user || !expiresIn) {
        throw new Error('Invalid refresh token response');
      }

      setToken(token);
      this.currentUser = user;
      this.setupSessionTimeout();
      this.setupTokenRefresh();
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.logout();
      return false;
    }
  }

  /**
   * Subscribe to authentication state changes
   * @param listener - Callback function for auth state changes
   * @returns Cleanup function
   */
  public onAuthStateChange(listener: AuthStateListener): () => void {
    this.authStateEmitter.on('authStateChange', listener);
    return () => {
      this.authStateEmitter.off('authStateChange', listener);
    };
  }

  /**
   * Setup session timeout monitoring
   */
  private setupSessionTimeout(): void {
    if (this.sessionTimeoutTimer) {
      clearTimeout(this.sessionTimeoutTimer);
    }

    this.sessionTimeoutTimer = setTimeout(() => {
      this.logout();
    }, this.SESSION_TIMEOUT);
  }

  /**
   * Setup automatic token refresh
   */
  private setupTokenRefresh(): void {
    if (this.refreshTokenTimer) {
      clearTimeout(this.refreshTokenTimer);
    }

    // Refresh token 5 minutes before expiration
    const refreshInterval = this.SESSION_TIMEOUT - (5 * 60 * 1000);
    this.refreshTokenTimer = setTimeout(() => {
      this.refreshToken();
    }, refreshInterval);
  }

  /**
   * Emit authentication state change event
   */
  private emitAuthStateChange(user: AuthUser | null): void {
    this.authStateEmitter.emit('authStateChange', user);
  }

  /**
   * Check if user has specific role
   * @param role - Required user role
   * @returns boolean
   */
  public hasRole(role: UserRole): boolean {
    return this.currentUser?.role === role;
  }
}

// Export singleton instance
export default new AuthService(ApiService);