/**
 * @fileoverview Redux Toolkit slice for managing SaaS metrics state
 * Handles metrics data, filtering, loading states, error handling, and caching
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // @version: ^2.0.0
import { Metric, MetricFilter, MetricCategory } from '../../interfaces/metrics.interface';
import MetricsService from '../../services/metrics.service';
import { ARR_RANGES, DEFAULT_PAGE_SIZE, DEFAULT_METRIC_SORT } from '../../constants/metrics';

// State interfaces
interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
}

interface CacheState {
  lastUpdated: number | null;
  isValid: boolean;
}

interface MetricsState {
  items: Metric[];
  loading: boolean;
  error: string | null;
  filter: MetricFilter;
  pagination: PaginationState;
  cache: CacheState;
  selectedMetricIds: string[];
}

// Initial state
const initialState: MetricsState = {
  items: [],
  loading: false,
  error: null,
  filter: {
    categories: [],
    search: '',
    arrRanges: [],
    dataSources: [],
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE
  },
  pagination: {
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalItems: 0
  },
  cache: {
    lastUpdated: null,
    isValid: false
  },
  selectedMetricIds: []
};

// Async thunks
export const fetchMetrics = createAsyncThunk(
  'metrics/fetchMetrics',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { metrics: MetricsState };
      const { filter } = state.metrics;
      const response = await MetricsService.getMetrics(filter);
      return response;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch metrics');
    }
  }
);

export const fetchMetricById = createAsyncThunk(
  'metrics/fetchMetricById',
  async (id: string, { rejectWithValue }) => {
    try {
      const metric = await MetricsService.getMetricById(id);
      return metric;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch metric');
    }
  }
);

export const fetchBenchmarkData = createAsyncThunk(
  'metrics/fetchBenchmarkData',
  async ({ metricIds, arrRange, sources }: {
    metricIds: string[],
    arrRange: string,
    sources: string[]
  }, { rejectWithValue }) => {
    try {
      const data = await MetricsService.getBenchmarkData(metricIds, arrRange, sources);
      return data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch benchmark data');
    }
  }
);

// Slice definition
const metricsSlice = createSlice({
  name: 'metrics',
  initialState,
  reducers: {
    setFilter: (state, action: PayloadAction<Partial<MetricFilter>>) => {
      state.filter = {
        ...state.filter,
        ...action.payload,
        page: 1 // Reset to first page on filter change
      };
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
      state.filter.page = action.payload;
    },
    setPageSize: (state, action: PayloadAction<number>) => {
      state.pagination.pageSize = action.payload;
      state.filter.pageSize = action.payload;
      state.pagination.page = 1;
      state.filter.page = 1;
    },
    selectMetrics: (state, action: PayloadAction<string[]>) => {
      state.selectedMetricIds = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetFilters: (state) => {
      state.filter = initialState.filter;
      state.pagination = initialState.pagination;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchMetrics
      .addCase(fetchMetrics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMetrics.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.pagination = {
          ...state.pagination,
          totalItems: action.payload.pagination.totalItems
        };
        state.cache = {
          lastUpdated: Date.now(),
          isValid: true
        };
      })
      .addCase(fetchMetrics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchMetricById
      .addCase(fetchMetricById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMetricById.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        } else {
          state.items.push(action.payload);
        }
      })
      .addCase(fetchMetricById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

// Selectors
export const selectMetrics = (state: { metrics: MetricsState }) => state.metrics.items;
export const selectLoading = (state: { metrics: MetricsState }) => state.metrics.loading;
export const selectError = (state: { metrics: MetricsState }) => state.metrics.error;
export const selectFilter = (state: { metrics: MetricsState }) => state.metrics.filter;
export const selectPagination = (state: { metrics: MetricsState }) => state.metrics.pagination;
export const selectSelectedMetricIds = (state: { metrics: MetricsState }) => state.metrics.selectedMetricIds;
export const selectCache = (state: { metrics: MetricsState }) => state.metrics.cache;

// Export actions and reducer
export const {
  setFilter,
  setPage,
  setPageSize,
  selectMetrics: selectMetricsAction,
  clearError,
  resetFilters
} = metricsSlice.actions;

export default metricsSlice.reducer;