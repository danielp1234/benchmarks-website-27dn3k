// google-auth-library v8.x - Google OAuth token payload type
import { TokenPayload } from 'google-auth-library';

/**
 * Enumeration of available user roles in the SaaS Benchmarks Platform
 * Follows the authorization matrix defined in technical specifications
 */
export enum UserRole {
    PUBLIC = 'PUBLIC',         // Read-only access to benchmark data
    ADMIN = 'ADMIN',          // Full read access and CRUD operations on metrics/sources
    SYSTEM_ADMIN = 'SYSTEM_ADMIN'  // Full access including system configuration
}

/**
 * Interface representing an authenticated user in the system
 * Contains core user information required for authorization and display
 */
export interface AuthUser {
    id: string;           // Unique identifier for the user
    email: string;        // User's email address (from Google OAuth)
    role: UserRole;       // User's role determining access levels
    name: string;         // User's display name
}

/**
 * Interface for JWT token payload structure
 * Used for session management and API authentication
 */
export interface JWTPayload {
    userId: string;       // Unique identifier of the authenticated user
    email: string;        // User's email for audit and identification
    role: UserRole;       // User's role for authorization checks
    exp: number;         // Token expiration timestamp
}

/**
 * Interface for Redis session data structure
 * Used for maintaining user sessions with automatic expiration
 */
export interface SessionData {
    userId: string;       // Reference to the authenticated user
    role: UserRole;       // Cached role for quick authorization checks
    expiresAt: Date;      // Session expiration timestamp
}

/**
 * Interface extending Google OAuth TokenPayload with platform-specific fields
 * Used during the authentication flow for user verification
 */
export interface GoogleAuthPayload extends TokenPayload {
    email_verified: boolean;   // Verification status of the email
    hd?: string;              // Hosted domain (for enterprise accounts)
}

/**
 * Interface for authorization checking results
 * Used internally by authorization middleware
 */
export interface AuthorizationResult {
    isAuthorized: boolean;    // Whether the action is authorized
    reason?: string;          // Optional reason for denial
}

/**
 * Interface for session token response
 * Used when issuing new session tokens
 */
export interface TokenResponse {
    token: string;            // JWT token string
    expiresIn: number;        // Token lifetime in seconds
    tokenType: 'Bearer';      // Token type for Authorization header
}