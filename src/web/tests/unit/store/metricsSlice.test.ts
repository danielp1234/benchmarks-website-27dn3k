/**
 * @fileoverview Unit tests for metrics Redux slice
 * Tests state management for SaaS metrics including data operations,
 * filtering, loading states, and error handling
 * @version 1.0.0
 */

import { configureStore } from '@reduxjs/toolkit'; // @version: ^2.0.0
import { describe, beforeEach, test, expect, jest } from '@jest/globals'; // @version: ^29.0.0
import metricsSlice, {
  reducer,
  setFilter,
  setPage,
  setPageSize,
  selectMetricsAction,
  clearError,
  resetFilters,
  fetchMetrics,
  fetchMetricById,
  selectMetrics,
  selectLoading,
  selectError,
  selectFilter,
  selectPagination,
  selectSelectedMetricIds,
  selectCache
} from '../../../src/store/slices/metricsSlice';
import { MetricCategory } from '../../../src/interfaces/metrics.interface';
import MetricsService from '../../../src/services/metrics.service';
import { DEFAULT_PAGE_SIZE, ARR_RANGES } from '../../../src/constants/metrics';

// Mock MetricsService
jest.mock('../../../src/services/metrics.service');

describe('metricsSlice', () => {
  let store: ReturnType<typeof configureStore>;
  
  // Mock data
  const mockMetrics = [
    {
      id: '1',
      name: 'Revenue Growth',
      description: 'YoY revenue growth rate',
      category: MetricCategory.GROWTH,
      displayOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      name: 'Magic Number',
      description: 'Sales efficiency metric',
      category: MetricCategory.SALES,
      displayOrder: 2,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Configure test store
    store = configureStore({
      reducer: {
        metrics: metricsSlice.reducer
      }
    });
  });

  describe('initial state', () => {
    test('should have correct initial state', () => {
      const state = store.getState().metrics;
      
      expect(state.items).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.filter).toEqual({
        categories: [],
        search: '',
        arrRanges: [],
        dataSources: [],
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE
      });
      expect(state.pagination).toEqual({
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        totalItems: 0
      });
      expect(state.selectedMetricIds).toEqual([]);
      expect(state.cache).toEqual({
        lastUpdated: null,
        isValid: false
      });
    });
  });

  describe('filter actions', () => {
    test('should update category filter', () => {
      store.dispatch(setFilter({ categories: [MetricCategory.GROWTH] }));
      
      const state = store.getState().metrics;
      expect(state.filter.categories).toEqual([MetricCategory.GROWTH]);
      expect(state.filter.page).toBe(1); // Should reset page
    });

    test('should update ARR range filter', () => {
      store.dispatch(setFilter({ arrRanges: [ARR_RANGES[0]] }));
      
      const state = store.getState().metrics;
      expect(state.filter.arrRanges).toEqual([ARR_RANGES[0]]);
      expect(state.filter.page).toBe(1);
    });

    test('should update search filter', () => {
      const searchTerm = 'growth';
      store.dispatch(setFilter({ search: searchTerm }));
      
      const state = store.getState().metrics;
      expect(state.filter.search).toBe(searchTerm);
      expect(state.filter.page).toBe(1);
    });

    test('should reset all filters', () => {
      // Set some filters first
      store.dispatch(setFilter({
        categories: [MetricCategory.GROWTH],
        search: 'test'
      }));
      
      // Reset filters
      store.dispatch(resetFilters());
      
      const state = store.getState().metrics;
      expect(state.filter).toEqual({
        categories: [],
        search: '',
        arrRanges: [],
        dataSources: [],
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE
      });
    });
  });

  describe('pagination actions', () => {
    test('should update page number', () => {
      const newPage = 2;
      store.dispatch(setPage(newPage));
      
      const state = store.getState().metrics;
      expect(state.pagination.page).toBe(newPage);
      expect(state.filter.page).toBe(newPage);
    });

    test('should update page size and reset to first page', () => {
      const newPageSize = 20;
      store.dispatch(setPageSize(newPageSize));
      
      const state = store.getState().metrics;
      expect(state.pagination.pageSize).toBe(newPageSize);
      expect(state.pagination.page).toBe(1);
      expect(state.filter.pageSize).toBe(newPageSize);
      expect(state.filter.page).toBe(1);
    });
  });

  describe('async thunks', () => {
    describe('fetchMetrics', () => {
      test('should handle successful metrics fetch', async () => {
        const mockResponse = {
          data: mockMetrics,
          pagination: {
            totalItems: mockMetrics.length,
            page: 1,
            pageSize: DEFAULT_PAGE_SIZE
          }
        };

        (MetricsService.getMetrics as jest.Mock).mockResolvedValueOnce(mockResponse);

        await store.dispatch(fetchMetrics());
        const state = store.getState().metrics;

        expect(state.items).toEqual(mockMetrics);
        expect(state.loading).toBe(false);
        expect(state.error).toBeNull();
        expect(state.pagination.totalItems).toBe(mockMetrics.length);
        expect(state.cache.isValid).toBe(true);
        expect(state.cache.lastUpdated).toBeTruthy();
      });

      test('should handle failed metrics fetch', async () => {
        const errorMessage = 'Failed to fetch metrics';
        (MetricsService.getMetrics as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

        await store.dispatch(fetchMetrics());
        const state = store.getState().metrics;

        expect(state.items).toEqual([]);
        expect(state.loading).toBe(false);
        expect(state.error).toBe(errorMessage);
      });
    });

    describe('fetchMetricById', () => {
      test('should handle successful single metric fetch', async () => {
        const mockMetric = mockMetrics[0];
        (MetricsService.getMetricById as jest.Mock).mockResolvedValueOnce(mockMetric);

        await store.dispatch(fetchMetricById(mockMetric.id));
        const state = store.getState().metrics;

        expect(state.items).toContainEqual(mockMetric);
        expect(state.loading).toBe(false);
        expect(state.error).toBeNull();
      });

      test('should handle failed single metric fetch', async () => {
        const errorMessage = 'Failed to fetch metric';
        (MetricsService.getMetricById as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

        await store.dispatch(fetchMetricById('1'));
        const state = store.getState().metrics;

        expect(state.loading).toBe(false);
        expect(state.error).toBe(errorMessage);
      });
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      store.dispatch({ type: 'metrics/setTestState', payload: {
        items: mockMetrics,
        loading: false,
        error: null,
        selectedMetricIds: ['1'],
        filter: { categories: [MetricCategory.GROWTH] }
      }});
    });

    test('selectMetrics should return all metrics', () => {
      expect(selectMetrics(store.getState())).toEqual(mockMetrics);
    });

    test('selectLoading should return loading state', () => {
      expect(selectLoading(store.getState())).toBe(false);
    });

    test('selectError should return error state', () => {
      expect(selectError(store.getState())).toBeNull();
    });

    test('selectFilter should return current filter', () => {
      expect(selectFilter(store.getState()).categories).toEqual([MetricCategory.GROWTH]);
    });

    test('selectSelectedMetricIds should return selected metric IDs', () => {
      expect(selectSelectedMetricIds(store.getState())).toEqual(['1']);
    });
  });

  describe('error handling', () => {
    test('should clear error state', () => {
      // Set error state
      store.dispatch({ type: 'metrics/setTestState', payload: { error: 'Test error' }});
      expect(store.getState().metrics.error).toBe('Test error');

      // Clear error
      store.dispatch(clearError());
      expect(store.getState().metrics.error).toBeNull();
    });
  });
});