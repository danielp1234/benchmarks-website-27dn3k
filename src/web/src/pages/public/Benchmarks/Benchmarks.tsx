import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { debounce } from 'lodash'; // v4.17.21
import { useMediaQuery } from '@mui/material'; // v5.x

// Internal imports
import PublicLayout from '../../../components/layout/PublicLayout/PublicLayout';
import FilterPanel from '../../../components/metrics/FilterPanel/FilterPanel';
import BenchmarkGrid from '../../../components/metrics/BenchmarkGrid/BenchmarkGrid';
import useMetrics from '../../../hooks/useMetrics';
import { MetricCategory } from '../../../interfaces/metrics.interface';
import { ARR_RANGES } from '../../../constants/metrics';

// Constants
const MOBILE_BREAKPOINT = 768;
const FILTER_DEBOUNCE_MS = 300;
const ERROR_RETRY_LIMIT = 3;

/**
 * Main Benchmarks page component that displays SaaS benchmark data with
 * interactive filtering capabilities and responsive design.
 *
 * @component
 * @version 1.0.0
 */
const Benchmarks: React.FC = React.memo(() => {
  // Responsive handling
  const isMobile = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT}px)`);

  // State management
  const [isFilterPanelVisible, setFilterPanelVisible] = useState(!isMobile);
  const [retryCount, setRetryCount] = useState(0);

  // Metrics hook for data management
  const {
    metrics,
    loading,
    error,
    filter,
    updateFilter,
    filterMetricsData,
    clearFilter
  } = useMetrics();

  // Selected filter states
  const [selectedCategories, setSelectedCategories] = useState<MetricCategory[]>([]);
  const [selectedArrRanges, setSelectedArrRanges] = useState<string[]>([ARR_RANGES[0]]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  // Memoized metric IDs based on filters
  const filteredMetricIds = useMemo(() => 
    metrics
      .filter(metric => 
        selectedCategories.length === 0 || selectedCategories.includes(metric.category)
      )
      .map(metric => metric.id),
    [metrics, selectedCategories]
  );

  // Debounced filter handlers
  const debouncedFilterUpdate = useCallback(
    debounce((newFilter: typeof filter) => {
      filterMetricsData(newFilter).catch(console.error);
    }, FILTER_DEBOUNCE_MS),
    []
  );

  // Filter change handlers
  const handleCategoryChange = useCallback((categories: MetricCategory[]) => {
    setSelectedCategories(categories);
    updateFilter({ categories });
    debouncedFilterUpdate({ ...filter, categories });
  }, [filter, updateFilter, debouncedFilterUpdate]);

  const handleArrRangeChange = useCallback((ranges: string[]) => {
    setSelectedArrRanges(ranges);
    updateFilter({ arrRanges: ranges });
    debouncedFilterUpdate({ ...filter, arrRanges: ranges });
  }, [filter, updateFilter, debouncedFilterUpdate]);

  const handleSourceChange = useCallback((sources: string[]) => {
    setSelectedSources(sources);
    updateFilter({ dataSources: sources });
    debouncedFilterUpdate({ ...filter, dataSources: sources });
  }, [filter, updateFilter, debouncedFilterUpdate]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSelectedCategories([]);
    setSelectedArrRanges([ARR_RANGES[0]]);
    setSelectedSources([]);
    clearFilter();
  }, [clearFilter]);

  // Toggle filter panel visibility
  const toggleFilterPanel = useCallback(() => {
    setFilterPanelVisible(prev => !prev);
  }, []);

  // Error retry handler
  const handleRetry = useCallback(() => {
    if (retryCount < ERROR_RETRY_LIMIT) {
      setRetryCount(prev => prev + 1);
      filterMetricsData(filter).catch(console.error);
    }
  }, [retryCount, filter, filterMetricsData]);

  // Reset retry count on successful data fetch
  useEffect(() => {
    if (!loading && !error) {
      setRetryCount(0);
    }
  }, [loading, error]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedFilterUpdate.cancel();
    };
  }, [debouncedFilterUpdate]);

  return (
    <PublicLayout>
      <div
        role="main"
        aria-label="SaaS Benchmarks"
        className="benchmarks-container"
      >
        <FilterPanel
          selectedCategories={selectedCategories}
          selectedArrRanges={selectedArrRanges}
          selectedSources={selectedSources}
          onCategoryChange={handleCategoryChange}
          onArrRangeChange={handleArrRangeChange}
          onSourceChange={handleSourceChange}
          isOpen={isFilterPanelVisible}
          onToggle={toggleFilterPanel}
          isLoading={loading}
          error={error}
          onClearFilters={handleClearFilters}
        />

        <div className="benchmark-content">
          <BenchmarkGrid
            metricIds={filteredMetricIds}
            arrRange={selectedArrRanges[0]}
            sources={selectedSources}
            isLoading={loading}
            onError={handleRetry}
            ariaLabel="SaaS benchmark metrics grid"
          />
        </div>
      </div>

      <style jsx>{`
        .benchmarks-container {
          display: flex;
          gap: var(--spacing-md);
          min-height: calc(100vh - var(--header-height) - var(--footer-height));
          padding: var(--spacing-md);
          background-color: var(--neutral-50);
        }

        .benchmark-content {
          flex: 1;
          min-width: 0;
          background-color: white;
          border-radius: var(--border-radius-lg);
          box-shadow: var(--shadow-md);
          padding: var(--spacing-md);
        }

        @media (max-width: ${MOBILE_BREAKPOINT}px) {
          .benchmarks-container {
            flex-direction: column;
            padding: var(--spacing-sm);
          }

          .benchmark-content {
            padding: var(--spacing-sm);
          }
        }
      `}</style>
    </PublicLayout>
  );
});

// Display name for debugging
Benchmarks.displayName = 'Benchmarks';

export default Benchmarks;