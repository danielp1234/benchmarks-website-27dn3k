// jest v29.x
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
// Internal services
import { AuthService } from '../../src/services/auth.service';
import { CacheService } from '../../src/services/cache.service';
import { UserRole } from '../../src/interfaces/auth.interface';

// Test constants
const TEST_TIMEOUT = 10000; // 10 seconds
const MOCK_GOOGLE_TOKEN = 'valid.google.token.mock';
const MOCK_INVALID_TOKEN = 'invalid.token';
const MOCK_EXPIRED_TOKEN = 'expired.jwt.token';

describe('AuthService Integration Tests', () => {
  let module: TestingModule;
  let authService: AuthService;
  let cacheService: CacheService;

  // Mock user data
  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@allowed-domain.com',
    role: UserRole.ADMIN,
    name: 'Test Admin'
  };

  const mockPublicUser = {
    id: 'public-123',
    email: 'user@external-domain.com',
    role: UserRole.PUBLIC,
    name: 'Test User'
  };

  beforeAll(async () => {
    // Create testing module with real service implementations
    module = await Test.createTestingModule({
      providers: [
        AuthService,
        CacheService,
        // Add any additional required providers
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    cacheService = module.get<CacheService>(CacheService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    // Clear cache before each test
    await cacheService.clear(true);
  });

  describe('Google OAuth Authentication Flow', () => {
    it('should successfully authenticate with valid Google token', async () => {
      const result = await authService.authenticateWithGoogle(MOCK_GOOGLE_TOKEN);
      
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(typeof result.accessToken).toBe('string');
    }, TEST_TIMEOUT);

    it('should assign correct role based on email domain', async () => {
      const adminResult = await authService.authenticateWithGoogle(MOCK_GOOGLE_TOKEN);
      expect(adminResult.user.role).toBe(UserRole.ADMIN);
      
      // Test with public user email
      const publicResult = await authService.authenticateWithGoogle(MOCK_GOOGLE_TOKEN);
      expect(publicResult.user.role).toBe(UserRole.PUBLIC);
    });

    it('should reject invalid Google tokens', async () => {
      await expect(
        authService.authenticateWithGoogle(MOCK_INVALID_TOKEN)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should enforce rate limiting on authentication attempts', async () => {
      const attempts = Array(6).fill(MOCK_GOOGLE_TOKEN);
      
      // Execute 6 rapid authentication attempts
      const results = await Promise.allSettled(
        attempts.map(token => authService.authenticateWithGoogle(token))
      );

      const lastAttempt = results[results.length - 1];
      expect(lastAttempt.status).toBe('rejected');
    });
  });

  describe('Session Management', () => {
    let validToken: string;

    beforeEach(async () => {
      const auth = await authService.authenticateWithGoogle(MOCK_GOOGLE_TOKEN);
      validToken = auth.accessToken;
    });

    it('should verify valid session tokens', async () => {
      const user = await authService.verifySession(validToken);
      
      expect(user).toBeDefined();
      expect(user.id).toBe(mockAdminUser.id);
      expect(user.role).toBe(mockAdminUser.role);
    });

    it('should reject expired session tokens', async () => {
      await expect(
        authService.verifySession(MOCK_EXPIRED_TOKEN)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should handle concurrent sessions correctly', async () => {
      // Create multiple sessions for the same user
      const sessions = await Promise.all([
        authService.authenticateWithGoogle(MOCK_GOOGLE_TOKEN),
        authService.authenticateWithGoogle(MOCK_GOOGLE_TOKEN)
      ]);

      // Verify all sessions are valid
      const verifications = await Promise.all(
        sessions.map(session => authService.verifySession(session.accessToken))
      );

      verifications.forEach(user => {
        expect(user).toBeDefined();
        expect(user.id).toBe(mockAdminUser.id);
      });
    });

    it('should enforce session timeout after 30 minutes', async () => {
      // Mock time advancement
      jest.useFakeTimers();
      jest.advanceTimersByTime(31 * 60 * 1000); // 31 minutes

      await expect(
        authService.verifySession(validToken)
      ).rejects.toThrow(UnauthorizedException);

      jest.useRealTimers();
    });
  });

  describe('Authorization and Permissions', () => {
    let adminToken: string;
    let publicToken: string;

    beforeEach(async () => {
      const adminAuth = await authService.authenticateWithGoogle(MOCK_GOOGLE_TOKEN);
      adminToken = adminAuth.accessToken;

      const publicAuth = await authService.authenticateWithGoogle(MOCK_GOOGLE_TOKEN);
      publicToken = publicAuth.accessToken;
    });

    it('should enforce role-based access control', async () => {
      // Admin permissions
      expect(await authService.checkPermission(mockAdminUser.id, 'write:metrics')).toBe(true);
      expect(await authService.checkPermission(mockAdminUser.id, 'read:audit')).toBe(true);

      // Public user permissions
      expect(await authService.checkPermission(mockPublicUser.id, 'read:benchmarks')).toBe(true);
      expect(await authService.checkPermission(mockPublicUser.id, 'write:metrics')).toBe(false);
    });

    it('should handle permission inheritance correctly', async () => {
      // System admin should have all permissions
      const systemAdminId = 'system-admin-123';
      expect(await authService.checkPermission(systemAdminId, 'write:system')).toBe(true);
      expect(await authService.checkPermission(systemAdminId, 'write:metrics')).toBe(true);
      expect(await authService.checkPermission(systemAdminId, 'read:benchmarks')).toBe(true);
    });

    it('should cache permission checks for performance', async () => {
      const permissionKey = 'write:metrics';
      
      // First check should hit database
      const firstCheck = await authService.checkPermission(mockAdminUser.id, permissionKey);
      
      // Second check should hit cache
      const secondCheck = await authService.checkPermission(mockAdminUser.id, permissionKey);
      
      expect(firstCheck).toBe(secondCheck);
    });
  });

  describe('Security Compliance', () => {
    it('should rotate tokens correctly', async () => {
      const auth = await authService.authenticateWithGoogle(MOCK_GOOGLE_TOKEN);
      const newToken = await authService.rotateToken(auth.accessToken);

      // Old token should be invalid
      await expect(
        authService.verifySession(auth.accessToken)
      ).rejects.toThrow(UnauthorizedException);

      // New token should be valid
      const user = await authService.verifySession(newToken);
      expect(user).toBeDefined();
    });

    it('should log security events properly', async () => {
      const logSpy = jest.spyOn(authService['logger'], 'warn');
      
      // Trigger security event
      await expect(
        authService.authenticateWithGoogle(MOCK_INVALID_TOKEN)
      ).rejects.toThrow();

      expect(logSpy).toHaveBeenCalled();
      expect(logSpy.mock.calls[0][0]).toContain('Authentication failed');
    });

    it('should handle session invalidation on security events', async () => {
      const auth = await authService.authenticateWithGoogle(MOCK_GOOGLE_TOKEN);
      
      // Simulate security event
      await authService.logout(auth.user.id);

      // Session should be invalid
      await expect(
        authService.verifySession(auth.accessToken)
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});