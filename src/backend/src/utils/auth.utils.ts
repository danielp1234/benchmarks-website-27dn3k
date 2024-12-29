// jsonwebtoken v9.x - JWT token management
import { sign, verify } from 'jsonwebtoken';
// google-auth-library v8.x - Google OAuth verification
import { OAuth2Client } from 'google-auth-library';
// crypto (native) - Token identifier generation
import { createHash } from 'crypto';

// Internal imports
import { AuthUser, JWTPayload, UserRole } from '../interfaces/auth.interface';
import { jwtConfig } from '../config/auth.config';

// Constants for token management
const TOKEN_BLACKLIST = new Set<string>();
const TOKEN_CACHE = new Map<string, number>();
const MAX_TOKENS_PER_USER = 5;
const TOKEN_GRACE_PERIOD = 300; // 5 minutes in seconds

// Initialize Google OAuth client
const oauthClient = new OAuth2Client({
  clientId: process.env.GOOGLE_OAUTH_CLIENT_ID
});

/**
 * Generates a unique token identifier for rotation tracking
 * @param userId - User's unique identifier
 * @param timestamp - Token generation timestamp
 * @returns Unique token identifier
 */
const generateTokenId = (userId: string, timestamp: number): string => {
  return createHash('sha256')
    .update(`${userId}-${timestamp}-${Math.random()}`)
    .digest('hex');
};

/**
 * Manages token rotation by tracking and limiting active tokens per user
 * @param userId - User's unique identifier
 * @param tokenId - New token identifier
 */
const manageTokenRotation = (userId: string, tokenId: string): void => {
  const userTokens = Array.from(TOKEN_CACHE.entries())
    .filter(([key]) => key.startsWith(userId))
    .sort((a, b) => b[1] - a[1]);

  // Remove oldest tokens if limit exceeded
  if (userTokens.length >= MAX_TOKENS_PER_USER) {
    const tokensToRemove = userTokens.slice(MAX_TOKENS_PER_USER - 1);
    tokensToRemove.forEach(([key]) => {
      TOKEN_CACHE.delete(key);
      TOKEN_BLACKLIST.add(key);
    });
  }

  // Add new token
  TOKEN_CACHE.set(`${userId}-${tokenId}`, Date.now());
};

/**
 * Generates a secure JWT token for authenticated users
 * @param user - Authenticated user information
 * @returns Promise resolving to signed JWT token
 * @throws Error if token generation fails
 */
export const generateJWT = async (user: AuthUser): Promise<string> => {
  try {
    // Validate user object
    if (!user.id || !user.email || !user.role) {
      throw new Error('Invalid user data for token generation');
    }

    // Generate unique token identifier
    const timestamp = Math.floor(Date.now() / 1000);
    const tokenId = generateTokenId(user.id, timestamp);

    // Create token payload with security claims
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      exp: timestamp + 1800, // 30 minutes
      aud: jwtConfig.audience,
      iss: jwtConfig.issuer,
      jti: tokenId
    };

    // Sign token with configured secret
    const token = sign(payload, jwtConfig.secret, {
      algorithm: 'HS512',
      expiresIn: '30m'
    });

    // Manage token rotation
    await manageTokenRotation(user.id, tokenId);

    return token;
  } catch (error) {
    throw new Error(`Token generation failed: ${error.message}`);
  }
};

/**
 * Verifies and decodes a JWT token
 * @param token - JWT token to verify
 * @returns Promise resolving to decoded token payload
 * @throws Error if token verification fails
 */
export const verifyJWT = async (token: string): Promise<JWTPayload> => {
  try {
    // Basic token format validation
    if (!token || !token.includes('.')) {
      throw new Error('Invalid token format');
    }

    // Verify token signature and decode payload
    const decoded = verify(token, jwtConfig.secret, {
      algorithms: ['HS512'],
      audience: jwtConfig.audience,
      issuer: jwtConfig.issuer,
      complete: true
    }) as { payload: JWTPayload };

    // Check token blacklist
    if (TOKEN_BLACKLIST.has(decoded.payload.jti)) {
      throw new Error('Token has been revoked');
    }

    // Verify token rotation status
    const cacheKey = `${decoded.payload.userId}-${decoded.payload.jti}`;
    if (!TOKEN_CACHE.has(cacheKey)) {
      throw new Error('Token not found in active sessions');
    }

    // Check token expiration with grace period
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.payload.exp < currentTime - TOKEN_GRACE_PERIOD) {
      throw new Error('Token has expired');
    }

    return decoded.payload;
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
};

/**
 * Verifies a Google OAuth token and extracts user information
 * @param token - Google OAuth token to verify
 * @returns Promise resolving to authenticated user data
 * @throws Error if token verification fails
 */
export const verifyGoogleToken = async (token: string): Promise<AuthUser> => {
  try {
    // Verify token with Google OAuth
    const ticket = await oauthClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_OAUTH_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Invalid token payload');
    }

    // Validate email verification
    if (!payload.email_verified) {
      throw new Error('Email not verified');
    }

    // Validate domain for admin access
    const isAdminDomain = jwtConfig.allowedDomains.includes(
      payload.hd || payload.email.split('@')[1]
    );

    // Create authenticated user object
    const user: AuthUser = {
      id: payload.sub,
      email: payload.email,
      role: isAdminDomain ? UserRole.ADMIN : UserRole.PUBLIC,
      name: payload.name || ''
    };

    return user;
  } catch (error) {
    throw new Error(`Google token verification failed: ${error.message}`);
  }
};

/**
 * Revokes a JWT token
 * @param token - Token to revoke
 * @returns Promise resolving when token is revoked
 */
export const revokeToken = async (token: string): Promise<void> => {
  try {
    const decoded = await verifyJWT(token);
    TOKEN_BLACKLIST.add(decoded.jti);
    TOKEN_CACHE.delete(`${decoded.userId}-${decoded.jti}`);
  } catch (error) {
    throw new Error(`Token revocation failed: ${error.message}`);
  }
};

// Cleanup expired tokens periodically
setInterval(() => {
  const currentTime = Date.now();
  for (const [key, timestamp] of TOKEN_CACHE.entries()) {
    if (currentTime - timestamp > 1800000) { // 30 minutes in milliseconds
      TOKEN_CACHE.delete(key);
    }
  }
}, 300000); // Clean up every 5 minutes