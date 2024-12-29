/**
 * @file Cryptographic Utility Functions
 * @description Implements secure cryptographic operations for the SaaS Benchmarks Platform
 * @version 1.0.0
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'; // v18.x
import jwt from 'jsonwebtoken'; // v9.x
import { JWTPayload } from '../interfaces/auth.interface';
import securityConfig from '../config/security.config';

// Constants for encryption
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const ENCODING = 'base64';

/**
 * Validates required environment variables for cryptographic operations
 * @throws {Error} If required environment variables are missing
 */
const validateEnvironmentVariables = (): void => {
  if (!process.env.JWT_SECRET || Buffer.from(process.env.JWT_SECRET).length < 32) {
    throw new Error('JWT_SECRET must be at least 256 bits');
  }
  if (!process.env.ENCRYPTION_KEY || Buffer.from(process.env.ENCRYPTION_KEY).length !== KEY_LENGTH) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 bytes');
  }
};

/**
 * Generates a secure JWT token for authenticated users
 * @param {JWTPayload} payload - User information and claims to include in token
 * @returns {string} Signed JWT token
 * @throws {Error} If payload is invalid or JWT signing fails
 */
export const generateJWT = (payload: JWTPayload): string => {
  validateEnvironmentVariables();

  // Validate required payload fields
  if (!payload.userId || !payload.email || !payload.role) {
    throw new Error('Invalid JWT payload: missing required fields');
  }

  const now = Math.floor(Date.now() / 1000);
  const tokenPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + securityConfig.tls.sessionTimeout
  };

  try {
    return jwt.sign(tokenPayload, process.env.JWT_SECRET!, {
      algorithm: 'HS256'
    });
  } catch (error) {
    throw new Error(`JWT generation failed: ${(error as Error).message}`);
  }
};

/**
 * Verifies and decodes a JWT token
 * @param {string} token - JWT token to verify
 * @returns {JWTPayload} Decoded token payload
 * @throws {Error} If token is invalid or verification fails
 */
export const verifyJWT = (token: string): JWTPayload => {
  validateEnvironmentVariables();

  if (!token) {
    throw new Error('Token is required');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
      algorithms: ['HS256']
    }) as JWTPayload;

    // Validate payload structure
    if (!decoded.userId || !decoded.email || !decoded.role) {
      throw new Error('Invalid token payload structure');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

/**
 * Encrypts sensitive data using AES-256-CBC
 * @param {string} data - Data to encrypt
 * @returns {string} Encrypted data in base64 format with IV
 * @throws {Error} If encryption fails or input is invalid
 */
export const encryptData = (data: string): string => {
  validateEnvironmentVariables();

  if (!data) {
    throw new Error('Data is required for encryption');
  }

  try {
    // Generate a random IV for each encryption
    const iv = randomBytes(IV_LENGTH);
    
    // Create cipher with key and IV
    const cipher = createCipheriv(
      ALGORITHM,
      Buffer.from(process.env.ENCRYPTION_KEY!, 'base64'),
      iv
    );

    // Encrypt the data
    let encrypted = cipher.update(data, 'utf8', ENCODING);
    encrypted += cipher.final(ENCODING);

    // Combine IV and encrypted data
    return Buffer.concat([iv, Buffer.from(encrypted, ENCODING)]).toString(ENCODING);
  } catch (error) {
    throw new Error(`Encryption failed: ${(error as Error).message}`);
  }
};

/**
 * Decrypts AES-256 encrypted data
 * @param {string} encryptedData - Encrypted data in base64 format with IV
 * @returns {string} Decrypted original data
 * @throws {Error} If decryption fails or input is invalid
 */
export const decryptData = (encryptedData: string): string => {
  validateEnvironmentVariables();

  if (!encryptedData) {
    throw new Error('Encrypted data is required for decryption');
  }

  try {
    // Convert the combined data back to a buffer
    const buffer = Buffer.from(encryptedData, ENCODING);

    // Extract the IV from the beginning
    const iv = buffer.slice(0, IV_LENGTH);
    const encryptedText = buffer.slice(IV_LENGTH).toString(ENCODING);

    // Create decipher with key and extracted IV
    const decipher = createDecipheriv(
      ALGORITHM,
      Buffer.from(process.env.ENCRYPTION_KEY!, 'base64'),
      iv
    );

    // Decrypt the data
    let decrypted = decipher.update(encryptedText, ENCODING, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${(error as Error).message}`);
  }
};

// Validate environment variables on module load
validateEnvironmentVariables();