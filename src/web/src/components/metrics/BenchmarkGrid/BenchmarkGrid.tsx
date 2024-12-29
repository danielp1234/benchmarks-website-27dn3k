import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { debounce } from 'lodash'; // v4.17.21
import Table from '../../common/Table/Table';
import { BenchmarkData } from '../../../interfaces/benchmark.interface';
import MetricsService from '../../../services/metrics.service';

/**
 * Props interface for BenchmarkGrid component with enhanced error handling and accessibility
 */
interface BenchmarkGridProps {
  metricIds: string[];
  arrRange: string;
  sources: string[];
  isLoading?: boolean;
  onExport?: () => void;
  onError?: (error: Error) => void;
  ariaLabel?: string;
}

/**
 * Enhanced React functional component that renders the benchmark data grid
 * with error handling, performance optimizations, and accessibility features
 *
 * @component
 * @version 1.0.0
 */
const BenchmarkGrid: React.FC<BenchmarkGridProps> = React.memo(({
  metricIds,
  arrRange,
  sources,
  isLoading: externalLoading,
  onExport,
  onError,
  ariaLabel = 'SaaS Benchmark Data Grid'
}) => {
  // State management
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>('metric');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Memoized table columns configuration
  const columns = useMemo(() => [
    {
      key: 'metric',
      header: 'Metric',
      sortable: true,
      width: '25%',
      ariaLabel: 'Sort by metric name'
    },
    {
      key: 'p90',
      header: 'P90',
      sortable: true,
      width: '15%',
      align: 'right' as const,
      ariaLabel: 'Sort by 90th percentile'
    },
    {
      key: 'p75',
      header: 'P75',
      sortable: true,
      width: '15%',
      align: 'right' as const,
      ariaLabel: 'Sort by 75th percentile'
    },
    {
      key: 'p50',
      header: 'P50',
      sortable: true,
      width: '15%',
      align: 'right' as const,
      ariaLabel: 'Sort by median'
    },
    {
      key: 'p25',
      header: 'P25',
      sortable: true,
      width: '15%',
      align: 'right' as const,
      ariaLabel: 'Sort by 25th percentile'
    },
    {
      key: 'p5',
      header: 'P5',
      sortable: true,
      width: '15%',
      align: 'right' as const,
      ariaLabel: 'Sort by 5th percentile'
    }
  ], []);

  // Debounced data fetching to prevent excessive API calls
  const fetchBenchmarkData = useCallback(
    debounce(async () => {
      if (!metricIds.length || !sources.length) return;

      setIsLoading(true);
      try {
        const data = await MetricsService.getBenchmarkData(metricIds, arrRange, sources);
        setBenchmarkData(data);
      } catch (error) {
        console.error('Error fetching benchmark data:', error);
        onError?.(error as Error);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [metricIds, arrRange, sources, onError]
  );

  // Effect to fetch data when dependencies change
  useEffect(() => {
    fetchBenchmarkData();
    return () => {
      fetchBenchmarkData.cancel();
    };
  }, [fetchBenchmarkData]);

  // Format data for table display with proper number formatting
  const formattedData = useMemo(() => {
    return benchmarkData.map(item => ({
      metric: item.metricId,
      p90: formatPercentile(item.p90Value),
      p75: formatPercentile(item.p75Value),
      p50: formatPercentile(item.p50Value),
      p25: formatPercentile(item.p25Value),
      p5: formatPercentile(item.p5Value)
    }));
  }, [benchmarkData]);

  // Enhanced sort handler with accessibility announcements
  const handleSort = useCallback((column: string) => {
    setSortDirection(prev => 
      sortColumn === column && prev === 'asc' ? 'desc' : 'asc'
    );
    setSortColumn(column);

    // Announce sort change to screen readers
    const direction = sortDirection === 'asc' ? 'descending' : 'ascending';
    const announcement = `Table sorted by ${column} in ${direction} order`;
    const ariaLive = document.createElement('div');
    ariaLive.setAttribute('aria-live', 'polite');
    ariaLive.innerText = announcement;
    document.body.appendChild(ariaLive);
    setTimeout(() => document.body.removeChild(ariaLive), 1000);
  }, [sortColumn, sortDirection]);

  return (
    <Table
      columns={columns}
      data={formattedData}
      isLoading={isLoading || externalLoading}
      sortColumn={sortColumn}
      sortDirection={sortDirection}
      onSort={handleSort}
      ariaLabel={ariaLabel}
      isStriped
      isCompact
    />
  );
});

// Helper function to format percentile values
const formatPercentile = (value: number): string => {
  // Handle percentage metrics
  if (value >= -1 && value <= 1) {
    return `${(value * 100).toFixed(1)}%`;
  }
  // Handle ratio metrics
  if (value < 100) {
    return value.toFixed(2);
  }
  // Handle large numbers
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 0
  });
};

// Display name for debugging
BenchmarkGrid.displayName = 'BenchmarkGrid';

export default BenchmarkGrid;