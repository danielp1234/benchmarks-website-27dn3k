/**
 * Redux Toolkit slice for managing authentication state with session timeout handling
 * Implements authentication flow and authorization requirements from technical specifications
 * @version 1.0.0
 */

import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { AuthUser, AuthError, UserRole } from '../../interfaces/auth.interface';
import { getUserFromToken } from '../../utils/auth.utils';

// Session timeout of 30 minutes in milliseconds (from technical specifications 7.3.3)
const SESSION_TIMEOUT_MS = 1800000;

/**
 * Interface for the authentication state slice
 */
interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: AuthError | null;
  sessionExpiry: number | null;
}

/**
 * Initial state for authentication slice
 */
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  sessionExpiry: null
};

/**
 * Redux Toolkit slice for authentication state management
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Sets the authenticated user and initializes session
     */
    setUser: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
      state.sessionExpiry = Date.now() + SESSION_TIMEOUT_MS;
    },

    /**
     * Clears the authenticated user and session data
     */
    clearUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      state.sessionExpiry = null;
    },

    /**
     * Sets loading state during authentication operations
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    /**
     * Sets authentication error state
     */
    setError: (state, action: PayloadAction<AuthError>) => {
      state.error = action.payload;
      state.loading = false;
      // Clear user data on authentication errors
      if (action.payload.code.startsWith('AUTH_')) {
        state.user = null;
        state.isAuthenticated = false;
        state.sessionExpiry = null;
      }
    },

    /**
     * Validates and updates session status
     */
    checkSession: (state) => {
      if (!state.sessionExpiry || Date.now() >= state.sessionExpiry) {
        // Session expired - clear user data
        state.user = null;
        state.isAuthenticated = false;
        state.sessionExpiry = null;
      } else if (state.sessionExpiry - Date.now() < SESSION_TIMEOUT_MS / 2) {
        // Extend session if more than half expired
        state.sessionExpiry = Date.now() + SESSION_TIMEOUT_MS;
      }
    },

    /**
     * Updates session expiry timestamp
     */
    refreshSession: (state) => {
      if (state.isAuthenticated) {
        state.sessionExpiry = Date.now() + SESSION_TIMEOUT_MS;
      }
    }
  }
});

// Export actions for use in components and thunks
export const {
  setUser,
  clearUser,
  setLoading,
  setError,
  checkSession,
  refreshSession
} = authSlice.actions;

// Memoized selectors for accessing auth state
export const selectAuth = (state: { auth: AuthState }) => state.auth;

export const selectUser = createSelector(
  selectAuth,
  (auth) => auth.user
);

export const selectUserRole = createSelector(
  selectUser,
  (user): UserRole | null => user?.role ?? null
);

export const selectIsAuthenticated = createSelector(
  selectAuth,
  (auth) => auth.isAuthenticated
);

export const selectIsLoading = createSelector(
  selectAuth,
  (auth) => auth.loading
);

export const selectError = createSelector(
  selectAuth,
  (auth) => auth.error
);

export const selectSessionStatus = createSelector(
  selectAuth,
  (auth): 'valid' | 'expiring' | 'expired' => {
    if (!auth.sessionExpiry) return 'expired';
    const timeRemaining = auth.sessionExpiry - Date.now();
    if (timeRemaining <= 0) return 'expired';
    if (timeRemaining < SESSION_TIMEOUT_MS / 4) return 'expiring';
    return 'valid';
  }
);

/**
 * Type guard for checking specific user roles
 */
export const hasRole = (role: UserRole) => 
  createSelector(
    selectUserRole,
    (userRole): boolean => userRole === role
  );

// Export the reducer as default
export default authSlice.reducer;