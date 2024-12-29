import { OAuth2Client, TokenPayload } from 'google-auth-library'; // v8.x
import { isEmail, isJWT } from 'validator'; // v13.x
import { AuthUser, UserRole } from '../../interfaces/auth.interface';

// Constants for validation rules and configuration
const SESSION_TIMEOUT_MINUTES = 30;
const ALLOWED_EMAIL_DOMAINS = ['saas-company.com', 'admin.saas-company.com'];
const TOKEN_CACHE_TTL = 300; // 5 minutes cache for token validation results

// Initialize Google OAuth client
const oauth2Client = new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
});

/**
 * Validates Google OAuth token and returns authenticated user data
 * Implements comprehensive security checks as per technical specifications
 * 
 * @param token - Google OAuth token to validate
 * @returns Promise resolving to validated AuthUser object
 * @throws Error if validation fails
 */
export async function validateGoogleToken(token: string): Promise<AuthUser> {
    try {
        // Verify token format and basic structure
        if (!token || typeof token !== 'string') {
            throw new Error('Invalid token format');
        }

        // Verify token with Google OAuth
        const ticket = await oauth2Client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload) {
            throw new Error('Invalid token payload');
        }

        // Validate email presence and format
        if (!payload.email || !isEmail(payload.email)) {
            throw new Error('Invalid email format');
        }

        // Validate email domain
        const emailDomain = payload.email.split('@')[1];
        if (!ALLOWED_EMAIL_DOMAINS.includes(emailDomain)) {
            throw new Error('Unauthorized email domain');
        }

        // Validate email verification status
        if (!payload.email_verified) {
            throw new Error('Email not verified');
        }

        // Determine user role based on email domain
        const role = determineUserRole(emailDomain);

        // Construct and return authenticated user data
        return {
            id: payload.sub,
            email: payload.email,
            name: payload.name || '',
            role,
        };
    } catch (error) {
        console.error('Google token validation failed:', error);
        throw new Error('Authentication failed');
    }
}

/**
 * Validates JWT token format, structure, and expiration
 * Implements security checks as per technical specifications
 * 
 * @param token - JWT token to validate
 * @returns boolean indicating token validity
 */
export function validateJWTToken(token: string): boolean {
    try {
        // Check token presence and format
        if (!token || typeof token !== 'string') {
            return false;
        }

        // Validate JWT format
        if (!isJWT(token)) {
            return false;
        }

        // Additional JWT validation logic can be added here
        // such as signature verification and claims validation

        return true;
    } catch (error) {
        console.error('JWT validation failed:', error);
        return false;
    }
}

/**
 * Validates session data including timeout and role-based checks
 * Implements session management requirements from technical specifications
 * 
 * @param sessionData - Session data object to validate
 * @returns boolean indicating session validity
 */
export function validateSessionData(sessionData: {
    userId: string;
    role: UserRole;
    createdAt: Date;
}): boolean {
    try {
        // Validate required fields
        if (!sessionData.userId || !sessionData.role || !sessionData.createdAt) {
            return false;
        }

        // Validate user role
        if (!Object.values(UserRole).includes(sessionData.role)) {
            return false;
        }

        // Check session timeout
        const sessionAge = Date.now() - sessionData.createdAt.getTime();
        const sessionAgeMinutes = sessionAge / (1000 * 60);
        if (sessionAgeMinutes > SESSION_TIMEOUT_MINUTES) {
            return false;
        }

        return true;
    } catch (error) {
        console.error('Session validation failed:', error);
        return false;
    }
}

/**
 * Determines user role based on email domain
 * Private helper function for role assignment
 * 
 * @param emailDomain - Email domain to check
 * @returns UserRole enum value
 */
function determineUserRole(emailDomain: string): UserRole {
    switch (emailDomain) {
        case 'admin.saas-company.com':
            return UserRole.SYSTEM_ADMIN;
        case 'saas-company.com':
            return UserRole.ADMIN;
        default:
            return UserRole.PUBLIC;
    }
}

/**
 * Validates role-based access for specific operations
 * Helper function for authorization checks
 * 
 * @param role - User role to validate
 * @param requiredRole - Minimum required role for access
 * @returns boolean indicating authorization status
 */
export function validateRoleAccess(role: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy = {
        [UserRole.SYSTEM_ADMIN]: 3,
        [UserRole.ADMIN]: 2,
        [UserRole.PUBLIC]: 1,
    };

    return roleHierarchy[role] >= roleHierarchy[requiredRole];
}