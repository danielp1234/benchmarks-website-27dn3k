import { describe, it, expect, beforeEach } from '@jest/globals';
import reducer, { 
  actions, 
  selectUser,
  selectUserRole,
  selectIsAuthenticated,
  selectIsLoading,
  selectError,
  selectSessionStatus,
  hasRole
} from '../../../src/store/slices/authSlice';
import { AuthUser, UserRole, AuthError } from '../../../src/interfaces/auth.interface';

// Test data setup with 30-minute session timeout
const SESSION_TIMEOUT_MS = 1800000;

// Mock users for different roles
const mockPublicUser: AuthUser = {
  id: 'public-id',
  email: 'public@example.com',
  role: UserRole.PUBLIC,
  name: 'Public User',
  lastLogin: new Date(),
  permissions: []
};

const mockAdminUser: AuthUser = {
  id: 'admin-id',
  email: 'admin@example.com',
  role: UserRole.ADMIN,
  name: 'Admin User',
  lastLogin: new Date(),
  permissions: ['manage_data', 'view_audit_logs']
};

const mockSystemAdminUser: AuthUser = {
  id: 'sysadmin-id',
  email: 'sysadmin@example.com',
  role: UserRole.SYSTEM_ADMIN,
  name: 'System Admin',
  lastLogin: new Date(),
  permissions: ['manage_data', 'view_audit_logs', 'manage_system']
};

const mockAuthError: AuthError = {
  code: 'AUTH_ERROR',
  message: 'Authentication failed',
  details: {},
  timestamp: new Date()
};

// Initial state for each test
const initialState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  sessionExpiry: null
};

describe('authSlice', () => {
  // Test initial state
  describe('Initial State', () => {
    it('should return the initial state', () => {
      const state = reducer(undefined, { type: 'unknown' });
      expect(state).toEqual(initialState);
    });
  });

  // Test authentication actions
  describe('Authentication Actions', () => {
    it('should handle setUser action', () => {
      const nextState = reducer(initialState, actions.setUser(mockAdminUser));
      expect(nextState.user).toEqual(mockAdminUser);
      expect(nextState.isAuthenticated).toBe(true);
      expect(nextState.loading).toBe(false);
      expect(nextState.error).toBeNull();
      expect(nextState.sessionExpiry).toBeDefined();
      expect(nextState.sessionExpiry).toBeGreaterThan(Date.now());
    });

    it('should handle clearUser action', () => {
      const loggedInState = reducer(initialState, actions.setUser(mockAdminUser));
      const nextState = reducer(loggedInState, actions.clearUser());
      expect(nextState).toEqual(initialState);
    });

    it('should handle setLoading action', () => {
      const nextState = reducer(initialState, actions.setLoading(true));
      expect(nextState.loading).toBe(true);
    });

    it('should handle setError action', () => {
      const nextState = reducer(initialState, actions.setError(mockAuthError));
      expect(nextState.error).toEqual(mockAuthError);
      expect(nextState.loading).toBe(false);
      expect(nextState.user).toBeNull();
      expect(nextState.isAuthenticated).toBe(false);
    });
  });

  // Test session management
  describe('Session Management', () => {
    it('should handle session expiry check when valid', () => {
      const loggedInState = reducer(initialState, actions.setUser(mockAdminUser));
      const nextState = reducer(loggedInState, actions.checkSession());
      expect(nextState.isAuthenticated).toBe(true);
      expect(nextState.sessionExpiry).toBeDefined();
    });

    it('should handle session expiry check when expired', () => {
      const expiredState = {
        ...initialState,
        user: mockAdminUser,
        isAuthenticated: true,
        sessionExpiry: Date.now() - 1000 // Expired session
      };
      const nextState = reducer(expiredState, actions.checkSession());
      expect(nextState.isAuthenticated).toBe(false);
      expect(nextState.user).toBeNull();
      expect(nextState.sessionExpiry).toBeNull();
    });

    it('should handle session refresh', () => {
      const loggedInState = reducer(initialState, actions.setUser(mockAdminUser));
      const originalExpiry = loggedInState.sessionExpiry;
      const nextState = reducer(loggedInState, actions.refreshSession());
      expect(nextState.sessionExpiry).toBeGreaterThan(originalExpiry!);
    });

    it('should not refresh session when not authenticated', () => {
      const nextState = reducer(initialState, actions.refreshSession());
      expect(nextState.sessionExpiry).toBeNull();
    });
  });

  // Test role-based access
  describe('Role-Based Access', () => {
    it('should correctly identify public user role', () => {
      const state = { auth: reducer(initialState, actions.setUser(mockPublicUser)) };
      expect(selectUserRole(state)).toBe(UserRole.PUBLIC);
      expect(hasRole(UserRole.PUBLIC)(state)).toBe(true);
      expect(hasRole(UserRole.ADMIN)(state)).toBe(false);
    });

    it('should correctly identify admin user role', () => {
      const state = { auth: reducer(initialState, actions.setUser(mockAdminUser)) };
      expect(selectUserRole(state)).toBe(UserRole.ADMIN);
      expect(hasRole(UserRole.ADMIN)(state)).toBe(true);
      expect(hasRole(UserRole.SYSTEM_ADMIN)(state)).toBe(false);
    });

    it('should correctly identify system admin user role', () => {
      const state = { auth: reducer(initialState, actions.setUser(mockSystemAdminUser)) };
      expect(selectUserRole(state)).toBe(UserRole.SYSTEM_ADMIN);
      expect(hasRole(UserRole.SYSTEM_ADMIN)(state)).toBe(true);
      expect(hasRole(UserRole.ADMIN)(state)).toBe(false);
    });
  });

  // Test selectors
  describe('Selectors', () => {
    let state: { auth: ReturnType<typeof reducer> };

    beforeEach(() => {
      state = { auth: reducer(initialState, actions.setUser(mockAdminUser)) };
    });

    it('should select user', () => {
      expect(selectUser(state)).toEqual(mockAdminUser);
    });

    it('should select authentication status', () => {
      expect(selectIsAuthenticated(state)).toBe(true);
    });

    it('should select loading status', () => {
      expect(selectIsLoading(state)).toBe(false);
    });

    it('should select error state', () => {
      const errorState = { auth: reducer(state.auth, actions.setError(mockAuthError)) };
      expect(selectError(errorState)).toEqual(mockAuthError);
    });

    it('should select session status', () => {
      expect(selectSessionStatus(state)).toBe('valid');
      
      // Test expiring session
      const expiringState = {
        auth: {
          ...state.auth,
          sessionExpiry: Date.now() + (SESSION_TIMEOUT_MS / 5)
        }
      };
      expect(selectSessionStatus(expiringState)).toBe('expiring');

      // Test expired session
      const expiredState = {
        auth: {
          ...state.auth,
          sessionExpiry: Date.now() - 1000
        }
      };
      expect(selectSessionStatus(expiredState)).toBe('expired');
    });
  });

  // Test error handling
  describe('Error Handling', () => {
    it('should clear user data on authentication error', () => {
      const loggedInState = reducer(initialState, actions.setUser(mockAdminUser));
      const nextState = reducer(loggedInState, actions.setError({
        ...mockAuthError,
        code: 'AUTH_INVALID_TOKEN'
      }));
      expect(nextState.user).toBeNull();
      expect(nextState.isAuthenticated).toBe(false);
      expect(nextState.sessionExpiry).toBeNull();
    });

    it('should maintain user data on non-auth errors', () => {
      const loggedInState = reducer(initialState, actions.setUser(mockAdminUser));
      const nextState = reducer(loggedInState, actions.setError({
        ...mockAuthError,
        code: 'API_ERROR'
      }));
      expect(nextState.user).toEqual(mockAdminUser);
      expect(nextState.isAuthenticated).toBe(true);
      expect(nextState.sessionExpiry).toBeDefined();
    });
  });
});