import type { Config } from '@jest/types'; // v29.x

/*
 * Jest Configuration for Backend Service
 * Configures test environment, coverage reporting, module resolution and other test settings
 * Uses ts-jest preset for TypeScript support
 * Version: 29.x
 */
const config = (): Config.InitialOptions => {
  return {
    // Use ts-jest preset for TypeScript support
    preset: 'ts-jest',

    // Set Node.js as test environment
    testEnvironment: 'node',

    // Define root directories for test discovery
    roots: [
      '<rootDir>/src',
      '<rootDir>/tests'
    ],

    // Pattern for test files
    testMatch: [
      '**/*.test.ts'
    ],

    // Module path aliases mapping
    moduleNameMapper: {
      '@/(.*)': '<rootDir>/src/$1',
      '@config/(.*)': '<rootDir>/src/config/$1',
      '@controllers/(.*)': '<rootDir>/src/api/controllers/$1',
      '@interfaces/(.*)': '<rootDir>/src/interfaces/$1',
      '@middlewares/(.*)': '<rootDir>/src/api/middlewares/$1',
      '@models/(.*)': '<rootDir>/src/models/$1',
      '@routes/(.*)': '<rootDir>/src/api/routes/$1',
      '@services/(.*)': '<rootDir>/src/services/$1',
      '@utils/(.*)': '<rootDir>/src/utils/$1',
      '@validators/(.*)': '<rootDir>/src/api/validators/$1'
    },

    // Code coverage configuration
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coveragePathIgnorePatterns: [
      '/node_modules/',
      '/dist/',
      '/coverage/',
      '.d.ts'
    ],

    // Coverage thresholds enforcement
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    },

    // Test setup files
    setupFiles: [
      '<rootDir>/tests/setup.ts'
    ],

    // Enable verbose output
    verbose: true,

    // Test timeout in milliseconds
    testTimeout: 10000
  };
};

// Export configuration
export default config;