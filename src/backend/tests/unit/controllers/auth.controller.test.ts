// @jest/globals v29.x
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
// @nestjs/testing v10.x
import { Test, TestingModule } from '@nestjs/testing';
// @nestjs/common v10.x
import { UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';

// Internal imports
import { AuthController } from '../../../src/api/controllers/auth.controller';
import { AuthService } from '../../../src/services/auth.service';
import { AuthUser, UserRole } from '../../../src/interfaces/auth.interface';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  // Mock user data
  const mockAdminUser: AuthUser = {
    id: 'admin-id',
    email: 'admin@saas-company.com',
    role: UserRole.ADMIN,
    name: 'Admin User'
  };

  const mockExpiredSession: AuthUser = {
    id: 'expired-id',
    email: 'expired@saas-company.com',
    role: UserRole.ADMIN,
    name: 'Expired User'
  };

  beforeEach(async () => {
    // Create mock AuthService
    const mockAuthService = {
      authenticateWithGoogle: jest.fn(),
      verifySession: jest.fn(),
      validateSessionTimeout: jest.fn(),
      logout: jest.fn()
    };

    // Create testing module
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService
        }
      ]
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    const validGoogleToken = 'valid.google.token';
    const invalidToken = 'invalid.token';

    it('should authenticate user with Google OAuth and return user data with token', async () => {
      // Arrange
      const expectedResponse = {
        user: mockAdminUser,
        accessToken: 'jwt.token.here'
      };
      authService.authenticateWithGoogle.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.login({ token: validGoogleToken });

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(authService.authenticateWithGoogle).toHaveBeenCalledWith(validGoogleToken);
    });

    it('should throw UnauthorizedException for invalid Google token', async () => {
      // Arrange
      authService.authenticateWithGoogle.mockRejectedValue(
        new UnauthorizedException('Invalid OAuth token')
      );

      // Act & Assert
      await expect(controller.login({ token: invalidToken }))
        .rejects
        .toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when token is missing', async () => {
      // Act & Assert
      await expect(controller.login({ token: '' }))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for unauthorized domain', async () => {
      // Arrange
      authService.authenticateWithGoogle.mockRejectedValue(
        new ForbiddenException('Unauthorized email domain')
      );

      // Act & Assert
      await expect(controller.login({ token: validGoogleToken }))
        .rejects
        .toThrow(ForbiddenException);
    });
  });

  describe('verifyToken', () => {
    const validJwtToken = 'valid.jwt.token';
    const expiredToken = 'expired.jwt.token';

    it('should verify valid JWT token and return user data', async () => {
      // Arrange
      authService.verifySession.mockResolvedValue(mockAdminUser);

      // Act
      const result = await controller.verifyToken({ token: validJwtToken });

      // Assert
      expect(result).toEqual(mockAdminUser);
      expect(authService.verifySession).toHaveBeenCalledWith(validJwtToken);
    });

    it('should throw UnauthorizedException for expired session', async () => {
      // Arrange
      authService.verifySession.mockRejectedValue(
        new UnauthorizedException('Session expired')
      );

      // Act & Assert
      await expect(controller.verifyToken({ token: expiredToken }))
        .rejects
        .toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when token is missing', async () => {
      // Act & Assert
      await expect(controller.verifyToken({ token: '' }))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException for invalid token format', async () => {
      // Arrange
      authService.verifySession.mockRejectedValue(
        new UnauthorizedException('Invalid token format')
      );

      // Act & Assert
      await expect(controller.verifyToken({ token: 'invalid.format' }))
        .rejects
        .toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    const validUserId = 'valid-user-id';

    it('should successfully logout user and clear session', async () => {
      // Arrange
      authService.logout.mockResolvedValue(undefined);

      // Act
      await controller.logout({ userId: validUserId });

      // Assert
      expect(authService.logout).toHaveBeenCalledWith(validUserId);
    });

    it('should throw BadRequestException when userId is missing', async () => {
      // Act & Assert
      await expect(controller.logout({ userId: '' }))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should handle logout errors gracefully', async () => {
      // Arrange
      authService.logout.mockRejectedValue(new Error('Logout failed'));

      // Act & Assert
      await expect(controller.logout({ userId: validUserId }))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('security compliance', () => {
    it('should enforce session timeout after 30 minutes', async () => {
      // Arrange
      const thirtyMinutesAgo = new Date(Date.now() - 31 * 60 * 1000);
      mockExpiredSession.lastActive = thirtyMinutesAgo;
      authService.verifySession.mockRejectedValue(
        new UnauthorizedException('Session expired')
      );

      // Act & Assert
      await expect(controller.verifyToken({ token: 'expired.session.token' }))
        .rejects
        .toThrow(UnauthorizedException);
    });

    it('should validate token format before processing', async () => {
      // Arrange
      const malformedToken = 'not.a.valid.jwt.format';
      authService.verifySession.mockRejectedValue(
        new UnauthorizedException('Invalid token format')
      );

      // Act & Assert
      await expect(controller.verifyToken({ token: malformedToken }))
        .rejects
        .toThrow(UnauthorizedException);
    });

    it('should handle rate limiting errors', async () => {
      // Arrange
      authService.authenticateWithGoogle.mockRejectedValue(
        new UnauthorizedException('Too many requests')
      );

      // Act & Assert
      await expect(controller.login({ token: 'valid.token' }))
        .rejects
        .toThrow(UnauthorizedException);
    });
  });
});