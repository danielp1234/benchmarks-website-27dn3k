/**
 * Root Redux store configuration for SaaS Benchmarks Platform
 * Implements centralized state management with performance optimizations and security measures
 * @version 1.0.0
 */

import { configureStore } from '@reduxjs/toolkit'; // ^2.0.0
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'; // ^8.1.0

// Import feature reducers
import authReducer from './slices/authSlice';
import metricsReducer from './slices/metricsSlice';
import uiReducer from './slices/uiSlice';

/**
 * Configure Redux store with optimized middleware and security measures
 * Implements performance requirements for 1000+ concurrent users
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    metrics: metricsReducer,
    ui: uiReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Enable serializable check in development only
      serializableCheck: {
        // Ignore specific action types and paths that may contain non-serializable data
        ignoredActions: ['auth/setUser', 'metrics/setBenchmarkData'],
        ignoredPaths: ['metrics.cache', 'auth.sessionExpiry']
      },
      // Enable immutability check in development only
      immutableCheck: process.env.NODE_ENV === 'development',
      // Thunk middleware configuration for API calls
      thunk: {
        extraArgument: undefined
      }
    }),
  devTools: process.env.NODE_ENV === 'development',
  // Enhance performance with preloaded state handling
  preloadedState: undefined,
  // Enable Redux DevTools browser extension in development
  enhancers: (defaultEnhancers) => defaultEnhancers
});

// Type-safe dispatch and state definitions
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/**
 * Type-safe hooks with performance optimizations
 * Implements memoization for selector functions
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/**
 * Performance-optimized selector creator with memoization
 * @param selector - Selector function to memoize
 * @returns Memoized selector function
 */
export function createSelector<TSelected>(
  selector: (state: RootState) => TSelected
): (state: RootState) => TSelected {
  let lastState: RootState | undefined;
  let lastResult: TSelected | undefined;

  return (state: RootState): TSelected => {
    if (state === lastState) {
      return lastResult as TSelected;
    }

    const result = selector(state);
    lastState = state;
    lastResult = result;
    return result;
  };
}

/**
 * Store subscription manager for optimized updates
 * Implements batched updates for improved performance
 */
export class StoreSubscriptionManager {
  private static subscriptions = new Set<() => void>();
  private static batchTimeout: NodeJS.Timeout | null = null;

  /**
   * Subscribe to store updates with batched notifications
   * @param callback - Subscription callback
   * @returns Unsubscribe function
   */
  static subscribe(callback: () => void): () => void {
    this.subscriptions.add(callback);
    return () => this.subscriptions.delete(callback);
  }

  /**
   * Notify subscribers with batched updates
   */
  static notifySubscribers(): void {
    if (this.batchTimeout) return;

    this.batchTimeout = setTimeout(() => {
      this.subscriptions.forEach(callback => callback());
      this.batchTimeout = null;
    }, 0);
  }
}

// Subscribe to store changes for batched updates
store.subscribe(() => {
  StoreSubscriptionManager.notifySubscribers();
});

export default store;