// jest v29.x - Testing framework
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
// google-auth-library v8.x - Google OAuth verification
import { OAuth2Client } from 'google-auth-library';

// Internal imports
import { generateJWT, verifyJWT, verifyGoogleToken } from '../../src/utils/auth.utils';
import { AuthUser, UserRole } from '../../src/interfaces/auth.interface';

// Mock Google OAuth client
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn()
  }))
}));

describe('Authentication Utilities', () => {
  // Test data setup
  const mockUser: AuthUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: UserRole.ADMIN,
    name: 'Test User'
  };

  const mockGoogleToken = 'mock-google-token';
  let mockOAuthClient: jest.Mocked<OAuth2Client>;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-jwt-secret-key-with-minimum-32-chars';
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'test-google-client-id';
    
    // Setup OAuth client mock
    mockOAuthClient = new OAuth2Client() as jest.Mocked<OAuth2Client>;
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('generateJWT', () => {
    it('should generate a valid JWT token with correct claims', async () => {
      const token = await generateJWT(mockUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include required security claims in token payload', async () => {
      const token = await generateJWT(mockUser);
      const [headerB64, payloadB64] = token.split('.');
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());

      expect(payload).toMatchObject({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        aud: expect.any(String),
        iss: expect.any(String),
        exp: expect.any(Number),
        jti: expect.any(String)
      });
    });

    it('should enforce token expiration time of 30 minutes', async () => {
      const token = await generateJWT(mockUser);
      const [, payloadB64] = token.split('.');
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
      
      const expectedExpiration = Math.floor(Date.now() / 1000) + 1800;
      expect(Math.abs(payload.exp - expectedExpiration)).toBeLessThan(5);
    });

    it('should reject invalid user data', async () => {
      const invalidUser = { ...mockUser, id: '' };
      await expect(generateJWT(invalidUser)).rejects.toThrow('Invalid user data');
    });

    it('should generate unique token identifiers for rotation', async () => {
      const token1 = await generateJWT(mockUser);
      const token2 = await generateJWT(mockUser);
      
      const [, payload1B64] = token1.split('.');
      const [, payload2B64] = token2.split('.');
      const payload1 = JSON.parse(Buffer.from(payload1B64, 'base64').toString());
      const payload2 = JSON.parse(Buffer.from(payload2B64, 'base64').toString());

      expect(payload1.jti).not.toBe(payload2.jti);
    });
  });

  describe('verifyJWT', () => {
    let validToken: string;

    beforeEach(async () => {
      validToken = await generateJWT(mockUser);
    });

    it('should successfully verify a valid token', async () => {
      const decoded = await verifyJWT(validToken);
      
      expect(decoded).toMatchObject({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role
      });
    });

    it('should reject malformed tokens', async () => {
      const malformedToken = 'invalid.token.format';
      await expect(verifyJWT(malformedToken)).rejects.toThrow('Token verification failed');
    });

    it('should reject expired tokens', async () => {
      // Mock Date.now to simulate token expiration
      const realDateNow = Date.now.bind(global.Date);
      const dateNowStub = jest.fn(() => realDateNow() + 2000000);
      global.Date.now = dateNowStub;
      
      await expect(verifyJWT(validToken)).rejects.toThrow('Token has expired');
      
      global.Date.now = realDateNow;
    });

    it('should reject tokens with invalid signatures', async () => {
      const [header, payload, signature] = validToken.split('.');
      const tamperedToken = `${header}.${payload}.invalid_signature`;
      
      await expect(verifyJWT(tamperedToken)).rejects.toThrow('Token verification failed');
    });

    it('should handle token grace period correctly', async () => {
      // Mock Date.now to test grace period
      const realDateNow = Date.now.bind(global.Date);
      const dateNowStub = jest.fn(() => realDateNow() + 1700000); // Just within grace period
      global.Date.now = dateNowStub;
      
      const decoded = await verifyJWT(validToken);
      expect(decoded).toBeDefined();
      
      global.Date.now = realDateNow;
    });
  });

  describe('verifyGoogleToken', () => {
    beforeEach(() => {
      mockOAuthClient.verifyIdToken.mockImplementation(() => Promise.resolve({
        getPayload: () => ({
          sub: mockUser.id,
          email: mockUser.email,
          email_verified: true,
          name: mockUser.name,
          hd: 'example.com'
        })
      }));
    });

    it('should successfully verify valid Google token', async () => {
      const user = await verifyGoogleToken(mockGoogleToken);
      
      expect(user).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        role: UserRole.ADMIN
      });
      
      expect(mockOAuthClient.verifyIdToken).toHaveBeenCalledWith({
        idToken: mockGoogleToken,
        audience: process.env.GOOGLE_OAUTH_CLIENT_ID
      });
    });

    it('should reject unverified email addresses', async () => {
      mockOAuthClient.verifyIdToken.mockImplementation(() => Promise.resolve({
        getPayload: () => ({
          ...mockUser,
          email_verified: false
        })
      }));

      await expect(verifyGoogleToken(mockGoogleToken)).rejects.toThrow('Email not verified');
    });

    it('should assign correct role based on domain', async () => {
      // Test non-admin domain
      mockOAuthClient.verifyIdToken.mockImplementation(() => Promise.resolve({
        getPayload: () => ({
          ...mockUser,
          email_verified: true,
          hd: 'public-domain.com'
        })
      }));

      const publicUser = await verifyGoogleToken(mockGoogleToken);
      expect(publicUser.role).toBe(UserRole.PUBLIC);
    });

    it('should handle missing token payload', async () => {
      mockOAuthClient.verifyIdToken.mockImplementation(() => Promise.resolve({
        getPayload: () => null
      }));

      await expect(verifyGoogleToken(mockGoogleToken)).rejects.toThrow('Invalid token payload');
    });

    it('should handle Google OAuth verification errors', async () => {
      mockOAuthClient.verifyIdToken.mockImplementation(() => 
        Promise.reject(new Error('Invalid token'))
      );

      await expect(verifyGoogleToken(mockGoogleToken)).rejects.toThrow('Google token verification failed');
    });
  });
});