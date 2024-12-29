import { AuthUser, UserRole } from '../../src/interfaces/auth.interface';

// Library versions
// cypress v13.x
// google-auth-library v8.x

// Test user constants
const TEST_USERS = {
  ADMIN: {
    id: 'test-admin-id',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    name: 'Test Admin',
    lastLogin: new Date(),
    permissions: ['manage_metrics', 'manage_sources']
  },
  PUBLIC: {
    id: 'test-public-id', 
    email: 'public@example.com',
    role: UserRole.PUBLIC,
    name: 'Test Public',
    lastLogin: new Date(),
    permissions: ['view_metrics']
  },
  SYSTEM_ADMIN: {
    id: 'test-sysadmin-id',
    email: 'sysadmin@example.com',
    role: UserRole.SYSTEM_ADMIN,
    name: 'Test System Admin',
    lastLogin: new Date(),
    permissions: ['manage_all']
  }
} as const;

// API route constants
const API_ROUTES = {
  AUTH: '/api/v1/auth',
  OAUTH: '/api/v1/auth/google',
  LOGOUT: '/api/v1/auth/logout',
  REFRESH: '/api/v1/auth/refresh',
  SESSION: '/api/v1/auth/session'
} as const;

// Helper function to mock Google OAuth flow
const mockGoogleAuth = (mockUser: AuthUser, shouldSucceed: boolean = true) => {
  // Intercept Google OAuth redirect
  cy.intercept('GET', '**/oauth2/v2/auth**', {
    statusCode: 302,
    headers: {
      Location: `${Cypress.config().baseUrl}/auth/callback`
    }
  });

  // Mock OAuth callback response
  cy.intercept('POST', API_ROUTES.OAUTH, (req) => {
    if (shouldSucceed) {
      req.reply({
        statusCode: 200,
        body: {
          user: mockUser,
          token: 'mock-jwt-token',
          expiresIn: 1800,
          refreshToken: 'mock-refresh-token'
        }
      });
    } else {
      req.reply({
        statusCode: 401,
        body: {
          code: 'AUTH_FAILED',
          message: 'Authentication failed',
          details: {},
          timestamp: new Date()
        }
      });
    }
  });
};

// Helper function to mock session timeout
const mockSessionTimeout = (timeoutMinutes: number) => {
  // Fast forward time
  cy.clock().tick(timeoutMinutes * 60 * 1000);
  
  // Mock session check response
  cy.intercept('GET', API_ROUTES.SESSION, {
    statusCode: 401,
    body: {
      code: 'SESSION_EXPIRED',
      message: 'Session has expired',
      details: { timeoutMinutes },
      timestamp: new Date()
    }
  });
};

describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.visit('/');
  });

  it('should successfully login with Google OAuth', () => {
    const mockUser = TEST_USERS.ADMIN;
    mockGoogleAuth(mockUser);

    // Click login button and verify OAuth redirect
    cy.get('[data-cy="login-button"]').click();
    cy.url().should('include', 'oauth2/v2/auth');

    // Simulate OAuth callback
    cy.visit('/auth/callback?code=mock-auth-code');

    // Verify successful login
    cy.window().its('localStorage.token').should('equal', 'mock-jwt-token');
    cy.window().its('localStorage.refreshToken').should('equal', 'mock-refresh-token');
    
    // Verify user data in store
    cy.window().its('store.getState.auth.user').should('deep.equal', mockUser);
    cy.url().should('include', '/dashboard');
  });

  it('should handle failed Google OAuth login', () => {
    mockGoogleAuth(TEST_USERS.PUBLIC, false);

    cy.get('[data-cy="login-button"]').click();
    cy.visit('/auth/callback?error=access_denied');

    // Verify error handling
    cy.get('[data-cy="auth-error"]')
      .should('be.visible')
      .and('contain', 'Authentication failed');
    
    // Verify user remains logged out
    cy.window().its('localStorage.token').should('not.exist');
    cy.url().should('include', '/login');
  });

  it('should handle network errors during login', () => {
    // Mock network failure
    cy.intercept('POST', API_ROUTES.OAUTH, {
      forceNetworkError: true
    });

    cy.get('[data-cy="login-button"]').click();
    
    // Verify error handling
    cy.get('[data-cy="network-error"]')
      .should('be.visible')
      .and('contain', 'Network error');
    
    // Verify retry button
    cy.get('[data-cy="retry-button"]').should('be.visible');
  });
});

describe('Session Management', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('should handle session timeout', () => {
    const mockUser = TEST_USERS.ADMIN;
    mockGoogleAuth(mockUser);

    // Login and verify initial state
    cy.get('[data-cy="login-button"]').click();
    cy.visit('/auth/callback?code=mock-auth-code');
    cy.url().should('include', '/dashboard');

    // Simulate session timeout
    mockSessionTimeout(30);

    // Verify session expiry handling
    cy.get('[data-cy="session-expired"]')
      .should('be.visible')
      .and('contain', 'Session has expired');
    
    cy.window().its('localStorage.token').should('not.exist');
    cy.url().should('include', '/login');
  });

  it('should refresh token before expiry', () => {
    const mockUser = TEST_USERS.ADMIN;
    mockGoogleAuth(mockUser);

    // Mock refresh token endpoint
    cy.intercept('POST', API_ROUTES.REFRESH, {
      statusCode: 200,
      body: {
        token: 'new-jwt-token',
        expiresIn: 1800
      }
    });

    // Login and simulate approaching token expiry
    cy.get('[data-cy="login-button"]').click();
    cy.visit('/auth/callback?code=mock-auth-code');
    cy.clock().tick(25 * 60 * 1000); // 25 minutes

    // Verify token refresh
    cy.window().its('localStorage.token').should('equal', 'new-jwt-token');
    cy.window().its('store.getState.auth.isAuthenticated').should('be.true');
  });
});

describe('Authorization', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('should enforce role-based access', () => {
    // Test access for different roles
    Object.values(TEST_USERS).forEach((user) => {
      mockGoogleAuth(user);
      cy.get('[data-cy="login-button"]').click();
      cy.visit('/auth/callback?code=mock-auth-code');

      // Verify access based on role
      if (user.role === UserRole.ADMIN || user.role === UserRole.SYSTEM_ADMIN) {
        cy.get('[data-cy="admin-panel"]').should('be.visible');
      } else {
        cy.get('[data-cy="admin-panel"]').should('not.exist');
      }

      // Verify metric access
      cy.get('[data-cy="metrics-panel"]').should('be.visible');

      // Logout for next iteration
      cy.get('[data-cy="logout-button"]').click();
    });
  });

  it('should handle permission changes', () => {
    const mockUser = TEST_USERS.ADMIN;
    mockGoogleAuth(mockUser);

    // Login as admin
    cy.get('[data-cy="login-button"]').click();
    cy.visit('/auth/callback?code=mock-auth-code');

    // Mock role change response
    cy.intercept('GET', API_ROUTES.SESSION, {
      statusCode: 200,
      body: {
        ...mockUser,
        role: UserRole.PUBLIC,
        permissions: ['view_metrics']
      }
    });

    // Verify UI updates after role change
    cy.get('[data-cy="admin-panel"]').should('not.exist');
    cy.get('[data-cy="metrics-panel"]').should('be.visible');
  });
});