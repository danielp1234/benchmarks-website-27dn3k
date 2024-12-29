import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // v14.0.0
import userEvent from '@testing-library/user-event'; // v14.0.0
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'; // v29.0.0
import { axe, toHaveNoViolations } from 'jest-axe'; // v4.7.0

import BenchmarkGrid from './BenchmarkGrid';
import { BenchmarkData } from '../../../interfaces/benchmark.interface';
import MetricsService from '../../../services/metrics.service';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock MetricsService
jest.mock('../../../services/metrics.service');

// Test constants
const TEST_TIMEOUT = 3000;
const SORT_TIMEOUT = 2000;

// Mock benchmark data
const mockBenchmarkData: BenchmarkData[] = [
  {
    id: '1',
    metricId: 'metric-1',
    sourceId: 'source-1',
    arrRange: '$1-10M',
    p5Value: 0.05,
    p25Value: 0.25,
    p50Value: 0.50,
    p75Value: 0.75,
    p90Value: 0.90,
    effectiveDate: new Date('2023-01-01')
  },
  {
    id: '2',
    metricId: 'metric-2',
    sourceId: 'source-1',
    arrRange: '$10-50M',
    p5Value: 1.05,
    p25Value: 1.25,
    p50Value: 1.50,
    p75Value: 1.75,
    p90Value: 1.90,
    effectiveDate: new Date('2023-01-01')
  }
];

describe('BenchmarkGrid', () => {
  // Setup and teardown
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock performance.now() for consistent timing tests
    jest.spyOn(performance, 'now').mockImplementation(() => 0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders loading state correctly', async () => {
    render(
      <BenchmarkGrid
        metricIds={[]}
        arrRange="$1-10M"
        sources={['source-1']}
        isLoading={true}
      />
    );

    // Verify loading indicator is present
    const loadingElement = screen.getByRole('status');
    expect(loadingElement).toBeInTheDocument();
    expect(loadingElement).toHaveAttribute('aria-label', 'Loading content');

    // Verify table is not rendered during loading
    const table = screen.queryByRole('grid');
    expect(table).not.toBeInTheDocument();
  });

  it('handles data rendering and formatting', async () => {
    // Mock service response
    (MetricsService.getBenchmarkData as jest.Mock).mockResolvedValue(mockBenchmarkData);

    render(
      <BenchmarkGrid
        metricIds={['metric-1', 'metric-2']}
        arrRange="$1-10M"
        sources={['source-1']}
      />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    // Verify column headers
    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(6); // Metric + 5 percentiles
    expect(headers[0]).toHaveTextContent('Metric');
    expect(headers[1]).toHaveTextContent('P90');

    // Verify data formatting
    const cells = screen.getAllByRole('cell');
    expect(cells[1]).toHaveTextContent('90%'); // P90 value formatted as percentage
    expect(cells[2]).toHaveTextContent('75%'); // P75 value formatted as percentage
  });

  it('performs sorting efficiently', async () => {
    const startTime = performance.now();
    
    render(
      <BenchmarkGrid
        metricIds={['metric-1', 'metric-2']}
        arrRange="$1-10M"
        sources={['source-1']}
      />
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    // Trigger sort
    const metricHeader = screen.getByRole('columnheader', { name: /metric/i });
    await userEvent.click(metricHeader);

    // Verify sort completes within performance requirement
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(SORT_TIMEOUT);

    // Verify sort indicators
    expect(metricHeader).toHaveAttribute('aria-sort', 'ascending');
  });

  it('maintains accessibility compliance', async () => {
    const { container } = render(
      <BenchmarkGrid
        metricIds={['metric-1', 'metric-2']}
        arrRange="$1-10M"
        sources={['source-1']}
      />
    );

    // Run accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Verify ARIA labels and roles
    const table = screen.getByRole('grid');
    expect(table).toHaveAttribute('aria-label', 'SaaS Benchmark Data Grid');

    // Test keyboard navigation
    const headers = screen.getAllByRole('columnheader');
    headers[0].focus();
    expect(document.activeElement).toBe(headers[0]);
    
    // Simulate keyboard interaction
    fireEvent.keyDown(headers[0], { key: 'Enter' });
    await waitFor(() => {
      expect(headers[0]).toHaveAttribute('aria-sort');
    });
  });

  it('handles error states gracefully', async () => {
    const mockError = new Error('Failed to fetch benchmark data');
    (MetricsService.getBenchmarkData as jest.Mock).mockRejectedValue(mockError);

    const onError = jest.fn();
    render(
      <BenchmarkGrid
        metricIds={['metric-1']}
        arrRange="$1-10M"
        sources={['source-1']}
        onError={onError}
      />
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(mockError);
    });
  });

  it('updates when props change', async () => {
    const { rerender } = render(
      <BenchmarkGrid
        metricIds={['metric-1']}
        arrRange="$1-10M"
        sources={['source-1']}
      />
    );

    // Change props
    rerender(
      <BenchmarkGrid
        metricIds={['metric-2']}
        arrRange="$10-50M"
        sources={['source-1']}
      />
    );

    // Verify service called with new props
    await waitFor(() => {
      expect(MetricsService.getBenchmarkData).toHaveBeenCalledWith(
        ['metric-2'],
        '$10-50M',
        ['source-1']
      );
    });
  });

  it('handles empty data states', async () => {
    (MetricsService.getBenchmarkData as jest.Mock).mockResolvedValue([]);

    render(
      <BenchmarkGrid
        metricIds={['metric-1']}
        arrRange="$1-10M"
        sources={['source-1']}
      />
    );

    await waitFor(() => {
      const table = screen.getByRole('grid');
      const rows = within(table).queryAllByRole('row');
      expect(rows.length).toBe(1); // Only header row
    });
  });
});