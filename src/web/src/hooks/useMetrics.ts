/**
 * @fileoverview Custom React hook for managing SaaS metrics state and operations.
 * Provides a clean interface for components to interact with metrics data through Redux and metrics service.
 * @version 1.0.0
 */

import { useCallback, useMemo, useEffect } from 'react'; // @version: ^18.0.0
import { useDispatch, useSelector } from 'react-redux'; // @version: ^8.0.0
import { 
  Metric,
  MetricFilter,
  MetricResponse
} from '../interfaces/metrics.interface';
import {
  fetchMetrics,
  filterMetrics,
  setFilter,
  resetFilter,
  selectMetrics,
  selectLoading,
  selectError,
  selectFilter,
  selectPagination
} from '../store/slices/metricsSlice';

/**
 * Interface defining the return type of the useMetrics hook
 */
interface UseMetricsReturn {
  /** Array of metric data */
  metrics: Metric[];
  /** Loading state indicator */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Current filter state */
  filter: MetricFilter;
  /** Pagination metadata */
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
  };
  /** Function to fetch metrics data */
  fetchMetricsData: (params: { page: number; pageSize: number }) => Promise<void>;
  /** Function to filter metrics */
  filterMetricsData: (filter: MetricFilter) => Promise<void>;
  /** Function to update filter */
  updateFilter: (filter: Partial<MetricFilter>) => void;
  /** Function to clear filter */
  clearFilter: () => void;
}

/**
 * Custom hook for managing metrics state and operations
 * @returns {UseMetricsReturn} Object containing metrics state and operations
 */
export const useMetrics = (): UseMetricsReturn => {
  const dispatch = useDispatch();

  // Select state from Redux store
  const metrics = useSelector(selectMetrics);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);
  const filter = useSelector(selectFilter);
  const pagination = useSelector(selectPagination);

  // Memoize metrics data for performance
  const memoizedMetrics = useMemo(() => metrics, [metrics]);

  /**
   * Fetch metrics data with pagination
   */
  const fetchMetricsData = useCallback(async ({ 
    page, 
    pageSize 
  }: { 
    page: number; 
    pageSize: number 
  }) => {
    try {
      await dispatch(fetchMetrics({ 
        page, 
        pageSize 
      })).unwrap();
    } catch (error) {
      console.error('Error fetching metrics:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Filter metrics based on provided criteria
   */
  const filterMetricsData = useCallback(async (filterParams: MetricFilter) => {
    try {
      await dispatch(filterMetrics(filterParams)).unwrap();
    } catch (error) {
      console.error('Error filtering metrics:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Update current filter state
   */
  const updateFilter = useCallback((newFilter: Partial<MetricFilter>) => {
    dispatch(setFilter(newFilter));
  }, [dispatch]);

  /**
   * Clear current filter and reset to defaults
   */
  const clearFilter = useCallback(() => {
    dispatch(resetFilter());
  }, [dispatch]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup any subscriptions or side effects if needed
    };
  }, []);

  return {
    metrics: memoizedMetrics,
    loading,
    error,
    filter,
    pagination,
    fetchMetricsData,
    filterMetricsData,
    updateFilter,
    clearFilter
  };
};

export default useMetrics;