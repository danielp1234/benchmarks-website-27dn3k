// google-auth-library v8.x - Type definition for Google OAuth token payload
import { TokenPayload } from 'google-auth-library';

/**
 * Enumeration of available user roles for role-based access control
 * Based on the authorization matrix defined in technical specifications
 */
export enum UserRole {
  PUBLIC = 'PUBLIC',
  ADMIN = 'ADMIN',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN'
}

/**
 * Interface defining authenticated user data structure with role and permissions
 * Implements the authorization requirements from technical specifications
 */
export interface AuthUser {
  /** Unique identifier for the user */
  id: string;
  
  /** User's email address (used for Google OAuth) */
  email: string;
  
  /** User's assigned role from UserRole enum */
  role: UserRole;
  
  /** User's display name */
  name: string;
  
  /** Timestamp of user's last login */
  lastLogin: Date;
  
  /** Array of specific permissions granted to the user */
  permissions: string[];
}

/**
 * Interface for login response containing user data, JWT token, and session information
 * Implements the authentication flow requirements from technical specifications
 */
export interface LoginResponse {
  /** Authenticated user data */
  user: AuthUser;
  
  /** JWT session token */
  token: string;
  
  /** Token expiration time in seconds */
  expiresIn: number;
  
  /** Refresh token for obtaining new access tokens */
  refreshToken: string;
}

/**
 * Interface for detailed authentication error responses with error codes and metadata
 * Provides structured error handling for authentication flows
 */
export interface AuthError {
  /** Error code identifier */
  code: string;
  
  /** Human-readable error message */
  message: string;
  
  /** Additional error context and metadata */
  details: Record<string, unknown>;
  
  /** Timestamp when the error occurred */
  timestamp: Date;
}

/**
 * Interface for managing authentication state in frontend application
 * Used for maintaining auth context and user session state
 */
export interface AuthState {
  /** Flag indicating if user is currently authenticated */
  isAuthenticated: boolean;
  
  /** Current authenticated user data or null if not authenticated */
  user: AuthUser | null;
  
  /** Flag indicating if authentication operation is in progress */
  loading: boolean;
  
  /** Current authentication error state or null if no error */
  error: AuthError | null;
}