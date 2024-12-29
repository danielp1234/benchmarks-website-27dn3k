// @jest/globals v29.x
import { describe, beforeEach, test, expect, jest } from '@jest/globals';
// @nestjs/common v10.x
import { UnauthorizedException } from '@nestjs/common';

// Internal imports
import { AuthService } from '../../src/services/auth.service';
import { CacheService } from '../../src/services/cache.service';
import { AuthUser, UserRole } from '../../src/interfaces/auth.interface';

describe('AuthService', () => {
  let authService: AuthService;
  let mockCacheService: jest.Mocked<CacheService>;

  // Test data
  const testUsers: Record<string, AuthUser> = {
    admin: {
      id: 'admin-123',
      email: 'admin@company.com',
      role: UserRole.ADMIN,
      name: 'Test Admin'
    },
    systemAdmin: {
      id: 'sysadmin-123',
      email: 'sysadmin@company.com',
      role: UserRole.SYSTEM_ADMIN,
      name: 'Test System Admin'
    },
    public: {
      id: 'public-123',
      email: 'user@external.com',
      role: UserRole.PUBLIC,
      name: 'Test Public User'
    }
  };

  const testTokens = {
    validGoogleToken: 'valid-google-token-123',
    invalidGoogleToken: 'invalid-google-token-456',
    validSessionToken: 'valid-session-token-789',
    expiredSessionToken: 'expired-session-token-012'
  };

  beforeEach(() => {
    // Mock CacheService
    mockCacheService = {
      set: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn()
    } as jest.Mocked<CacheService>;

    // Initialize AuthService with mocked dependencies
    authService = new AuthService(mockCacheService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('authenticateWithGoogle', () => {
    test('should authenticate admin user with valid token and domain', async () => {
      // Mock Google token verification
      const mockTicket = {
        getPayload: () => ({
          email: testUsers.admin.email,
          email_verified: true,
          hd: 'company.com',
          sub: testUsers.admin.id,
          name: testUsers.admin.name
        })
      };

      jest.spyOn(authService['oAuth2Client'], 'verifyIdToken')
        .mockResolvedValue(mockTicket);

      // Mock rate limiter
      jest.spyOn(authService['rateLimiter'], 'consume')
        .mockResolvedValue(undefined);

      const result = await authService.authenticateWithGoogle(testTokens.validGoogleToken);

      expect(result).toEqual({
        user: testUsers.admin,
        accessToken: expect.any(String)
      });

      // Verify session cache was set with correct TTL
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `session:${testUsers.admin.id}`,
        expect.any(Object),
        1800 // 30 minute TTL
      );
    });

    test('should reject authentication with unverified email', async () => {
      const mockTicket = {
        getPayload: () => ({
          email: testUsers.admin.email,
          email_verified: false,
          hd: 'company.com'
        })
      };

      jest.spyOn(authService['oAuth2Client'], 'verifyIdToken')
        .mockResolvedValue(mockTicket);

      await expect(authService.authenticateWithGoogle(testTokens.validGoogleToken))
        .rejects
        .toThrow(UnauthorizedException);
    });

    test('should handle rate limiting', async () => {
      jest.spyOn(authService['rateLimiter'], 'consume')
        .mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(authService.authenticateWithGoogle(testTokens.validGoogleToken))
        .rejects
        .toThrow(UnauthorizedException);
    });
  });

  describe('verifySession', () => {
    test('should verify valid session token', async () => {
      const mockSessionData = {
        userId: testUsers.admin.id,
        role: UserRole.ADMIN,
        expiresAt: new Date(Date.now() + 900000) // 15 minutes from now
      };

      mockCacheService.get.mockResolvedValue(JSON.stringify(mockSessionData));

      const result = await authService.verifySession(testTokens.validSessionToken);

      expect(result).toEqual(testUsers.admin);
    });

    test('should reject expired session', async () => {
      const mockSessionData = {
        userId: testUsers.admin.id,
        role: UserRole.ADMIN,
        expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
      };

      mockCacheService.get.mockResolvedValue(JSON.stringify(mockSessionData));

      await expect(authService.verifySession(testTokens.validSessionToken))
        .rejects
        .toThrow(UnauthorizedException);

      // Verify expired session was deleted
      expect(mockCacheService.delete).toHaveBeenCalledWith(
        `session:${testUsers.admin.id}`
      );
    });

    test('should reject missing session', async () => {
      mockCacheService.get.mockResolvedValue(null);

      await expect(authService.verifySession(testTokens.validSessionToken))
        .rejects
        .toThrow(UnauthorizedException);
    });
  });

  describe('checkPermission', () => {
    test('should grant admin appropriate permissions', async () => {
      const mockSessionData = {
        userId: testUsers.admin.id,
        role: UserRole.ADMIN,
        expiresAt: new Date(Date.now() + 900000)
      };

      mockCacheService.get.mockResolvedValue(JSON.stringify(mockSessionData));

      // Test admin permissions
      expect(await authService.checkPermission(testUsers.admin.id, 'read:benchmarks')).toBe(true);
      expect(await authService.checkPermission(testUsers.admin.id, 'write:metrics')).toBe(true);
      expect(await authService.checkPermission(testUsers.admin.id, 'write:system')).toBe(false);
    });

    test('should grant system admin all permissions', async () => {
      const mockSessionData = {
        userId: testUsers.systemAdmin.id,
        role: UserRole.SYSTEM_ADMIN,
        expiresAt: new Date(Date.now() + 900000)
      };

      mockCacheService.get.mockResolvedValue(JSON.stringify(mockSessionData));

      // Test system admin permissions
      expect(await authService.checkPermission(testUsers.systemAdmin.id, 'read:benchmarks')).toBe(true);
      expect(await authService.checkPermission(testUsers.systemAdmin.id, 'write:metrics')).toBe(true);
      expect(await authService.checkPermission(testUsers.systemAdmin.id, 'write:system')).toBe(true);
    });

    test('should restrict public user permissions', async () => {
      const mockSessionData = {
        userId: testUsers.public.id,
        role: UserRole.PUBLIC,
        expiresAt: new Date(Date.now() + 900000)
      };

      mockCacheService.get.mockResolvedValue(JSON.stringify(mockSessionData));

      // Test public user permissions
      expect(await authService.checkPermission(testUsers.public.id, 'read:benchmarks')).toBe(true);
      expect(await authService.checkPermission(testUsers.public.id, 'write:metrics')).toBe(false);
      expect(await authService.checkPermission(testUsers.public.id, 'write:system')).toBe(false);
    });
  });

  describe('logout', () => {
    test('should successfully logout and clean up session data', async () => {
      await authService.logout(testUsers.admin.id);

      // Verify session and permission cache cleanup
      expect(mockCacheService.delete).toHaveBeenCalledWith(
        `session:${testUsers.admin.id}`
      );
      expect(mockCacheService.delete).toHaveBeenCalledWith(
        expect.stringMatching(`permission:${testUsers.admin.id}:*`)
      );
    });

    test('should handle logout for non-existent session', async () => {
      mockCacheService.delete.mockRejectedValue(new Error('Session not found'));

      // Should not throw error for non-existent session
      await expect(authService.logout('non-existent-user'))
        .resolves
        .not
        .toThrow();
    });
  });
});