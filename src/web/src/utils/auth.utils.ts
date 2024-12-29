/**
 * Authentication utility functions for secure JWT token management and session handling
 * Implements security requirements from technical specifications section 7.1 and 7.3
 * @version 1.0.0
 */

import { AuthUser } from '../interfaces/auth.interface';
import jwtDecode from 'jwt-decode'; // jwt-decode v3.1.2

// Constants for token management and session configuration
const TOKEN_KEY = 'auth_token';
const SESSION_TIMEOUT = 1800000; // 30 minutes in milliseconds

/**
 * Interface for decoded JWT token payload with strict typing
 */
interface JWTPayload {
  id: string;
  role: string;
  exp: number;
  iat: number;
}

/**
 * Securely retrieves JWT token from local storage with type safety
 * @returns {string | null} JWT token if exists and valid, null otherwise
 */
export const getToken = (): string | null => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;

    // Basic structural validation of the token
    if (!token.split('.').length === 3) {
      removeToken();
      return null;
    }

    return token;
  } catch (error) {
    console.error('Error retrieving auth token:', error);
    return null;
  }
};

/**
 * Securely stores JWT token in local storage with validation
 * @param {string} token - JWT token to store
 */
export const setToken = (token: string): void => {
  try {
    // Validate token format before storage
    if (!token || typeof token !== 'string' || !token.split('.').length === 3) {
      throw new Error('Invalid token format');
    }

    // Verify token can be decoded before storage
    const decoded = jwtDecode<JWTPayload>(token);
    if (!decoded.id || !decoded.role || !decoded.exp) {
      throw new Error('Invalid token payload');
    }

    localStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error storing auth token:', error);
    removeToken();
  }
};

/**
 * Securely removes JWT token from local storage and cleans up session
 */
export const removeToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error removing auth token:', error);
  }
};

/**
 * Comprehensively validates JWT token with expiration and format checks
 * @returns {boolean} True if token is valid, not expired, and properly formatted
 */
export const isTokenValid = (): boolean => {
  try {
    const token = getToken();
    if (!token) return false;

    const decoded = jwtDecode<JWTPayload>(token);
    
    // Validate token structure
    if (!decoded.id || !decoded.role || !decoded.exp || !decoded.iat) {
      return false;
    }

    // Check token expiration
    const currentTime = Date.now();
    const tokenExp = decoded.exp * 1000; // Convert to milliseconds
    const tokenAge = currentTime - (decoded.iat * 1000);

    // Validate against session timeout and absolute expiration
    if (currentTime >= tokenExp || tokenAge >= SESSION_TIMEOUT) {
      removeToken();
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
};

/**
 * Securely extracts and validates user data from JWT token with type safety
 * @returns {AuthUser | null} Strongly typed user data if token valid, null otherwise
 */
export const getUserFromToken = (): AuthUser | null => {
  try {
    const token = getToken();
    if (!token || !isTokenValid()) return null;

    const decoded = jwtDecode<JWTPayload>(token);

    // Validate required user data fields
    if (!decoded.id || !decoded.role) {
      throw new Error('Invalid user data in token');
    }

    // Return strongly typed user object
    return {
      id: decoded.id,
      role: decoded.role as AuthUser['role'],
      email: '', // These fields are not stored in token for security
      name: '', // but are required by AuthUser interface
      lastLogin: new Date(decoded.iat * 1000),
      permissions: [] // Permissions are determined by role on backend
    };
  } catch (error) {
    console.error('Error extracting user data from token:', error);
    return null;
  }
};

/**
 * Type guard to verify if a value is a valid AuthUser object
 * @param {unknown} value - Value to check
 * @returns {boolean} True if value is a valid AuthUser object
 */
export const isAuthUser = (value: unknown): value is AuthUser => {
  return (
    !!value &&
    typeof value === 'object' &&
    'id' in value &&
    'role' in value &&
    'email' in value &&
    'name' in value &&
    'lastLogin' in value &&
    'permissions' in value
  );
};