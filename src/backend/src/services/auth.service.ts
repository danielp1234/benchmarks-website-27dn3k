// @nestjs/common v10.x
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
// google-auth-library v8.x
import { OAuth2Client, TokenPayload } from 'google-auth-library';
// @nestjs/jwt v10.x
import { JwtService } from '@nestjs/jwt';
// rate-limiter-flexible v2.x
import { RateLimiterRedis } from 'rate-limiter-flexible';
// redis v4.x
import { RedisService } from '@liaoliaots/nestjs-redis';

import { AuthUser, UserRole, JWTPayload, GoogleAuthPayload, SessionData, AuthorizationResult } from '../interfaces/auth.interface';
import { authConfig } from '../config/auth.config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly oAuth2Client: OAuth2Client;
  private readonly sessionPrefix = 'session:';
  private readonly permissionPrefix = 'permission:';

  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly rateLimiter: RateLimiterRedis
  ) {
    this.oAuth2Client = new OAuth2Client({
      clientId: authConfig.googleOAuth.clientId,
      clientSecret: authConfig.googleOAuth.clientSecret,
      redirectUri: authConfig.googleOAuth.callbackURL
    });
  }

  /**
   * Authenticates user with Google OAuth token and establishes secure session
   * @param token Google OAuth ID token
   * @returns Authenticated user data with session token
   * @throws UnauthorizedException for invalid tokens or unauthorized domains
   */
  async authenticateWithGoogle(token: string): Promise<{ user: AuthUser; accessToken: string }> {
    try {
      // Rate limiting check
      await this.rateLimiter.consume(token, 1);

      // Verify Google token
      const ticket = await this.oAuth2Client.verifyIdToken({
        idToken: token,
        audience: authConfig.googleOAuth.clientId
      });

      const payload = ticket.getPayload() as GoogleAuthPayload;
      
      if (!payload.email_verified) {
        throw new UnauthorizedException('Email not verified');
      }

      // Domain validation for admin access
      const role = this.determineUserRole(payload.email, payload.hd);
      
      const user: AuthUser = {
        id: payload.sub,
        email: payload.email,
        role,
        name: payload.name || ''
      };

      // Generate JWT session token
      const accessToken = await this.createSessionToken(user);

      // Cache session data
      await this.cacheSessionData(user, accessToken);

      this.logger.log(`User authenticated successfully: ${user.email}`);
      return { user, accessToken };
    } catch (error) {
      this.logger.error(`Authentication failed: ${error.message}`, error.stack);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Verifies user session token and validates permissions
   * @param token JWT session token
   * @returns Verified user data
   * @throws UnauthorizedException for invalid or expired tokens
   */
  async verifySession(token: string): Promise<AuthUser> {
    try {
      const payload = await this.jwtService.verifyAsync<JWTPayload>(token, {
        secret: authConfig.jwt.secret,
        ...authConfig.jwt.verifyOptions
      });

      // Check if session exists in cache
      const sessionKey = `${this.sessionPrefix}${payload.userId}`;
      const sessionData = await this.redisService.getClient().get(sessionKey);

      if (!sessionData) {
        throw new UnauthorizedException('Session expired');
      }

      const session: SessionData = JSON.parse(sessionData);
      
      // Validate session expiration
      if (new Date(session.expiresAt) < new Date()) {
        await this.redisService.getClient().del(sessionKey);
        throw new UnauthorizedException('Session expired');
      }

      return {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        name: session.name
      };
    } catch (error) {
      this.logger.error(`Session verification failed: ${error.message}`, error.stack);
      throw new UnauthorizedException('Invalid session');
    }
  }

  /**
   * Checks if user has required permission based on role
   * @param userId User identifier
   * @param permission Required permission
   * @returns Boolean indicating if user has permission
   */
  async checkPermission(userId: string, permission: string): Promise<boolean> {
    try {
      // Check permission cache first
      const cacheKey = `${this.permissionPrefix}${userId}:${permission}`;
      const cachedResult = await this.redisService.getClient().get(cacheKey);
      
      if (cachedResult !== null) {
        return cachedResult === 'true';
      }

      // Get user session data
      const sessionKey = `${this.sessionPrefix}${userId}`;
      const sessionData = await this.redisService.getClient().get(sessionKey);
      
      if (!sessionData) {
        return false;
      }

      const session: SessionData = JSON.parse(sessionData);
      const userRole = session.role;

      // Check role permissions
      const hasPermission = authConfig.rolePermissions[userRole]?.includes(permission) || false;

      // Cache permission result
      await this.redisService.getClient().set(
        cacheKey,
        hasPermission.toString(),
        'EX',
        300 // Cache for 5 minutes
      );

      return hasPermission;
    } catch (error) {
      this.logger.error(`Permission check failed: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Logs out user and cleans up session data
   * @param userId User identifier
   */
  async logout(userId: string): Promise<void> {
    try {
      const sessionKey = `${this.sessionPrefix}${userId}`;
      const permissionPattern = `${this.permissionPrefix}${userId}:*`;

      // Remove session and all permission cache entries
      const pipeline = this.redisService.getClient().pipeline();
      pipeline.del(sessionKey);
      pipeline.keys(permissionPattern).then(keys => {
        if (keys.length > 0) {
          pipeline.del(...keys);
        }
      });

      await pipeline.exec();
      this.logger.log(`User logged out successfully: ${userId}`);
    } catch (error) {
      this.logger.error(`Logout failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Creates a new JWT session token
   * @param user User data
   * @returns JWT token string
   */
  private async createSessionToken(user: AuthUser): Promise<string> {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + authConfig.session.ttl
    };

    return this.jwtService.signAsync(payload, {
      secret: authConfig.jwt.secret,
      ...authConfig.jwt.signOptions
    });
  }

  /**
   * Caches user session data in Redis
   * @param user User data
   * @param token JWT token
   */
  private async cacheSessionData(user: AuthUser, token: string): Promise<void> {
    const sessionData: SessionData = {
      userId: user.id,
      role: user.role,
      name: user.name,
      expiresAt: new Date(Date.now() + authConfig.session.ttl * 1000)
    };

    await this.redisService.getClient().set(
      `${this.sessionPrefix}${user.id}`,
      JSON.stringify(sessionData),
      'EX',
      authConfig.session.ttl
    );
  }

  /**
   * Determines user role based on email and domain
   * @param email User email
   * @param hostedDomain Google workspace domain
   * @returns UserRole
   */
  private determineUserRole(email: string, hostedDomain?: string): UserRole {
    if (hostedDomain && authConfig.googleOAuth.allowedDomains.includes(hostedDomain)) {
      return email.endsWith('admin@' + hostedDomain) ? UserRole.SYSTEM_ADMIN : UserRole.ADMIN;
    }
    return UserRole.PUBLIC;
  }
}