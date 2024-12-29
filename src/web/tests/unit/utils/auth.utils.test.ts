import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { getToken, setToken, removeToken, isTokenValid, getUserFromToken } from '../../../src/utils/auth.utils';
import { AuthUser, UserRole } from '../../../src/interfaces/auth.interface';
import jwtDecode from 'jwt-decode'; // jwt-decode v3.1.2

// Mock jwt-decode module
jest.mock('jwt-decode');

// Constants for test tokens
const MOCK_VALID_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsInJvbGUiOiJhZG1pbiIsImV4cCI6OTk5OTk5OTk5OX0';
const MOCK_EXPIRED_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTY5MDAwMDAwMH0';
const MOCK_INVALID_TOKEN = 'invalid.token.format';

// Mock user data that matches the token payload
const MOCK_USER_DATA: Partial<AuthUser> = {
  id: '123',
  role: UserRole.ADMIN,
  email: '',
  name: '',
  lastLogin: new Date(),
  permissions: []
};

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('Authentication Utilities', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    mockLocalStorage.clear();
    (jwtDecode as jest.Mock).mockClear();
  });

  describe('getToken', () => {
    it('should return null when no token exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      expect(getToken()).toBeNull();
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('auth_token');
    });

    it('should return token when valid token exists', () => {
      mockLocalStorage.getItem.mockReturnValue(MOCK_VALID_TOKEN);
      expect(getToken()).toBe(MOCK_VALID_TOKEN);
    });

    it('should handle localStorage access errors', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage access denied');
      });
      expect(getToken()).toBeNull();
    });

    it('should return null for invalid token format', () => {
      mockLocalStorage.getItem.mockReturnValue(MOCK_INVALID_TOKEN);
      expect(getToken()).toBeNull();
    });
  });

  describe('setToken', () => {
    it('should store valid token in localStorage', () => {
      (jwtDecode as jest.Mock).mockReturnValue({
        id: '123',
        role: 'ADMIN',
        exp: 9999999999
      });
      setToken(MOCK_VALID_TOKEN);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', MOCK_VALID_TOKEN);
    });

    it('should throw error for invalid token format', () => {
      (jwtDecode as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      setToken(MOCK_INVALID_TOKEN);
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('should handle localStorage write errors', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage write denied');
      });
      setToken(MOCK_VALID_TOKEN);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });

    it('should validate token payload before storage', () => {
      (jwtDecode as jest.Mock).mockReturnValue({
        id: null, // Invalid payload
        role: 'ADMIN',
        exp: 9999999999
      });
      setToken(MOCK_VALID_TOKEN);
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('removeToken', () => {
    it('should remove token from localStorage', () => {
      removeToken();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });

    it('should handle localStorage removal errors', () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('localStorage access denied');
      });
      expect(() => removeToken()).not.toThrow();
    });

    it('should succeed when no token exists', () => {
      mockLocalStorage.removeItem.mockReturnValue(undefined);
      expect(() => removeToken()).not.toThrow();
    });
  });

  describe('isTokenValid', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2023-01-01'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return false when no token exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      expect(isTokenValid()).toBe(false);
    });

    it('should return true for valid non-expired token', () => {
      mockLocalStorage.getItem.mockReturnValue(MOCK_VALID_TOKEN);
      (jwtDecode as jest.Mock).mockReturnValue({
        id: '123',
        role: 'ADMIN',
        exp: 9999999999,
        iat: Date.now() / 1000 - 60 // Token issued 1 minute ago
      });
      expect(isTokenValid()).toBe(true);
    });

    it('should return false for expired token', () => {
      mockLocalStorage.getItem.mockReturnValue(MOCK_EXPIRED_TOKEN);
      (jwtDecode as jest.Mock).mockReturnValue({
        id: '123',
        role: 'ADMIN',
        exp: 1690000000,
        iat: 1689999999
      });
      expect(isTokenValid()).toBe(false);
      expect(mockLocalStorage.removeItem).toHaveBeenCalled();
    });

    it('should return false for session timeout', () => {
      mockLocalStorage.getItem.mockReturnValue(MOCK_VALID_TOKEN);
      (jwtDecode as jest.Mock).mockReturnValue({
        id: '123',
        role: 'ADMIN',
        exp: 9999999999,
        iat: Date.now() / 1000 - 1801 // Session timeout is 1800 seconds
      });
      expect(isTokenValid()).toBe(false);
    });

    it('should handle JWT decode errors', () => {
      mockLocalStorage.getItem.mockReturnValue(MOCK_VALID_TOKEN);
      (jwtDecode as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      expect(isTokenValid()).toBe(false);
    });
  });

  describe('getUserFromToken', () => {
    it('should return null when no token exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      expect(getUserFromToken()).toBeNull();
    });

    it('should return valid user data from token', () => {
      mockLocalStorage.getItem.mockReturnValue(MOCK_VALID_TOKEN);
      (jwtDecode as jest.Mock).mockReturnValue({
        id: '123',
        role: 'ADMIN',
        exp: 9999999999,
        iat: Date.now() / 1000 - 60
      });
      const user = getUserFromToken();
      expect(user).toMatchObject({
        id: '123',
        role: UserRole.ADMIN,
        email: '',
        name: '',
        permissions: []
      });
      expect(user?.lastLogin).toBeInstanceOf(Date);
    });

    it('should return null for invalid token data', () => {
      mockLocalStorage.getItem.mockReturnValue(MOCK_VALID_TOKEN);
      (jwtDecode as jest.Mock).mockReturnValue({
        id: null, // Invalid id
        role: 'ADMIN',
        exp: 9999999999,
        iat: Date.now() / 1000
      });
      expect(getUserFromToken()).toBeNull();
    });

    it('should handle JWT decode errors', () => {
      mockLocalStorage.getItem.mockReturnValue(MOCK_VALID_TOKEN);
      (jwtDecode as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      expect(getUserFromToken()).toBeNull();
    });

    it('should validate user role type', () => {
      mockLocalStorage.getItem.mockReturnValue(MOCK_VALID_TOKEN);
      (jwtDecode as jest.Mock).mockReturnValue({
        id: '123',
        role: 'INVALID_ROLE', // Invalid role
        exp: 9999999999,
        iat: Date.now() / 1000
      });
      const user = getUserFromToken();
      expect(user?.role).not.toBe('INVALID_ROLE');
    });
  });
});