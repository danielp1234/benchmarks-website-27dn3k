/**
 * Unit tests for AuthService
 * Tests authentication flow, session management, and token handling
 * @version 1.0.0
 */

import { describe, expect, jest, beforeEach, afterEach, it } from '@jest/globals'; // v29.x
import AuthService from '../../src/services/auth.service';
import ApiService from '../../src/services/api.service';
import { AuthUser, UserRole } from '../../src/interfaces/auth.interface';
import * as TokenUtils from '../../src/utils/auth.utils';

// Mock dependencies
jest.mock('../../src/services/api.service');
jest.mock('../../src/utils/auth.utils');

describe('AuthService', () => {
  let authService: AuthService;
  let mockApiService: jest.Mocked<typeof ApiService>;
  let mockTokenUtils: jest.Mocked<typeof TokenUtils>;

  // Test data
  const mockUser: AuthUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: UserRole.ADMIN,
    name: 'Test User',
    lastLogin: new Date(),
    permissions: ['read', 'write']
  };

  const mockLoginResponse = {
    user: mockUser,
    token: 'mock-jwt-token',
    expiresIn: 1800, // 30 minutes
    refreshToken: 'mock-refresh-token'
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset mock implementations
    mockApiService = jest.mocked(ApiService);
    mockTokenUtils = jest.mocked(TokenUtils);
    
    // Create new instance for each test
    authService = new AuthService(mockApiService);
    
    // Setup default mock responses
    mockTokenUtils.getUserFromToken.mockReturnValue(null);
    mockTokenUtils.isTokenValid.mockReturnValue(true);
    
    // Mock timer functions
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Cleanup
    jest.clearAllTimers();
    jest.useRealTimers();
    mockTokenUtils.removeToken();
  });

  describe('login', () => {
    it('should successfully login with valid Google token', async () => {
      // Arrange
      const googleToken = 'valid-google-token';
      mockApiService.post.mockResolvedValueOnce({ data: mockLoginResponse });
      mockTokenUtils.setToken.mockImplementationOnce(() => {});

      // Act
      const result = await authService.login(googleToken);

      // Assert
      expect(mockApiService.post).toHaveBeenCalledWith('/auth/google', {
        token: googleToken
      });
      expect(mockTokenUtils.setToken).toHaveBeenCalledWith(mockLoginResponse.token);
      expect(result).toEqual(mockLoginResponse);
    });

    it('should handle login failure with invalid token', async () => {
      // Arrange
      const invalidToken = 'invalid-token';
      const errorResponse = {
        message: 'Invalid token',
        code: 'AUTH_ERROR',
        status: 401
      };
      mockApiService.post.mockRejectedValueOnce(errorResponse);

      // Act & Assert
      await expect(authService.login(invalidToken)).rejects.toMatchObject(errorResponse);
      expect(mockTokenUtils.setToken).not.toHaveBeenCalled();
    });

    it('should handle session timeout after 30 minutes', async () => {
      // Arrange
      const googleToken = 'valid-google-token';
      mockApiService.post.mockResolvedValueOnce({ data: mockLoginResponse });

      // Act
      await authService.login(googleToken);
      
      // Advance timer by 31 minutes
      jest.advanceTimersByTime(31 * 60 * 1000);

      // Assert
      expect(mockTokenUtils.removeToken).toHaveBeenCalled();
      expect(authService.getCurrentUser()).toBeNull();
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      // Arrange
      mockApiService.post.mockResolvedValueOnce({ data: { success: true } });
      mockTokenUtils.getUserFromToken.mockReturnValueOnce(mockUser);

      // Act
      authService.logout();

      // Assert
      expect(mockTokenUtils.removeToken).toHaveBeenCalled();
      expect(mockApiService.post).toHaveBeenCalledWith('/auth/logout');
      expect(authService.getCurrentUser()).toBeNull();
    });

    it('should handle logout API failure gracefully', async () => {
      // Arrange
      mockApiService.post.mockRejectedValueOnce(new Error('Network error'));

      // Act
      authService.logout();

      // Assert
      expect(mockTokenUtils.removeToken).toHaveBeenCalled();
      expect(authService.getCurrentUser()).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user with valid token', () => {
      // Arrange
      mockTokenUtils.getUserFromToken.mockReturnValueOnce(mockUser);
      mockTokenUtils.isTokenValid.mockReturnValueOnce(true);

      // Act
      const result = authService.getCurrentUser();

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockTokenUtils.isTokenValid).toHaveBeenCalled();
    });

    it('should return null with expired token', () => {
      // Arrange
      mockTokenUtils.isTokenValid.mockReturnValueOnce(false);

      // Act
      const result = authService.getCurrentUser();

      // Assert
      expect(result).toBeNull();
      expect(mockTokenUtils.removeToken).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh token before expiration', async () => {
      // Arrange
      const newLoginResponse = {
        ...mockLoginResponse,
        token: 'new-jwt-token'
      };
      mockApiService.post.mockResolvedValueOnce({ data: newLoginResponse });

      // Act
      const result = await authService.refreshToken();

      // Assert
      expect(result).toBe(true);
      expect(mockTokenUtils.setToken).toHaveBeenCalledWith(newLoginResponse.token);
    });

    it('should handle refresh token failure', async () => {
      // Arrange
      mockApiService.post.mockRejectedValueOnce(new Error('Refresh failed'));

      // Act
      const result = await authService.refreshToken();

      // Assert
      expect(result).toBe(false);
      expect(mockTokenUtils.removeToken).toHaveBeenCalled();
    });
  });

  describe('hasRole', () => {
    it('should correctly verify user role', () => {
      // Arrange
      mockTokenUtils.getUserFromToken.mockReturnValueOnce(mockUser);
      mockTokenUtils.isTokenValid.mockReturnValueOnce(true);

      // Act & Assert
      expect(authService.hasRole(UserRole.ADMIN)).toBe(true);
      expect(authService.hasRole(UserRole.SYSTEM_ADMIN)).toBe(false);
    });

    it('should return false when no user is authenticated', () => {
      // Arrange
      mockTokenUtils.getUserFromToken.mockReturnValueOnce(null);

      // Act & Assert
      expect(authService.hasRole(UserRole.ADMIN)).toBe(false);
    });
  });
});