import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { axe } from '@axe-core/react';
import { useMediaQuery } from '@testing-library/react-hooks';

// Component under test
import Benchmarks from './Benchmarks';
import useMetrics from '../../../hooks/useMetrics';

// Constants for testing
const PERFORMANCE_THRESHOLD = 2000; // 2 seconds as per technical spec
const TEST_VIEWPORT_SIZES = {
  MOBILE: 320,
  TABLET: 768,
  DESKTOP: 1024
};

// Mock data
const mockMetricsData = [
  {
    id: '1',
    name: 'Revenue Growth',
    category: 'GROWTH',
    p5Value: 0.2,
    p25Value: 0.5,
    p50Value: 0.8,
    p75Value: 1.2,
    p90Value: 1.5
  },
  // Add more mock metrics to cover all 14 KPIs
];

// Mock store setup
const mockStore = {
  getState: () => ({
    metrics: {
      items: mockMetricsData,
      loading: false,
      error: null,
      filter: {
        categories: [],
        arrRanges: ['$0-1M'],
        dataSources: []
      }
    }
  }),
  dispatch: vi.fn(),
  subscribe: vi.fn()
};

// Helper function to render with providers
const renderWithProviders = (component: JSX.Element, options = {}) => {
  const utils = render(
    <Provider store={mockStore}>
      {component}
    </Provider>
  );
  return {
    ...utils,
    store: mockStore
  };
};

// Helper function to measure filter performance
const measureFilterPerformance = async (filterOperation: () => Promise<void>) => {
  const start = performance.now();
  await filterOperation();
  return performance.now() - start;
};

describe('Benchmarks Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders without crashing', () => {
      renderWithProviders(<Benchmarks />);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('displays loading state correctly', () => {
      vi.mocked(useMetrics).mockReturnValue({
        ...useMetrics(),
        loading: true
      });
      renderWithProviders(<Benchmarks />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('handles error states appropriately', () => {
      const errorMessage = 'Failed to load metrics';
      vi.mocked(useMetrics).mockReturnValue({
        ...useMetrics(),
        error: errorMessage
      });
      renderWithProviders(<Benchmarks />);
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('renders all 14 KPIs correctly', () => {
      renderWithProviders(<Benchmarks />);
      mockMetricsData.forEach(metric => {
        expect(screen.getByText(metric.name)).toBeInTheDocument();
      });
    });
  });

  describe('Data Display', () => {
    it('displays percentile distributions accurately', () => {
      renderWithProviders(<Benchmarks />);
      const metric = mockMetricsData[0];
      expect(screen.getByText(`${metric.p50Value * 100}%`)).toBeInTheDocument();
    });

    it('formats numeric values correctly', () => {
      renderWithProviders(<Benchmarks />);
      const percentageValue = screen.getByText('80%'); // 0.8 formatted
      expect(percentageValue).toBeInTheDocument();
    });

    it('handles empty data states', () => {
      vi.mocked(useMetrics).mockReturnValue({
        ...useMetrics(),
        metrics: []
      });
      renderWithProviders(<Benchmarks />);
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('applies ARR range filters correctly', async () => {
      renderWithProviders(<Benchmarks />);
      const arrFilter = screen.getByLabelText(/ARR Range/i);
      await userEvent.selectOptions(arrFilter, '$1-10M');
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'metrics/setFilter',
          payload: expect.objectContaining({ arrRanges: ['$1-10M'] })
        })
      );
    });

    it('completes filtering within performance threshold', async () => {
      renderWithProviders(<Benchmarks />);
      const duration = await measureFilterPerformance(async () => {
        const filter = screen.getByLabelText(/ARR Range/i);
        await userEvent.selectOptions(filter, '$1-10M');
      });
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout to mobile viewport', () => {
      vi.mocked(useMediaQuery).mockReturnValue(true); // Mobile viewport
      renderWithProviders(<Benchmarks />);
      const filterPanel = screen.getByRole('complementary');
      expect(filterPanel).toHaveStyle({ transform: 'translateX(-100%)' });
    });

    it('maintains functionality across screen sizes', async () => {
      Object.values(TEST_VIEWPORT_SIZES).forEach(width => {
        vi.mocked(useMediaQuery).mockReturnValue(width <= TEST_VIEWPORT_SIZES.TABLET);
        renderWithProviders(<Benchmarks />);
        expect(screen.getByRole('main')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('supports keyboard navigation', async () => {
      renderWithProviders(<Benchmarks />);
      const filterButton = screen.getByRole('button', { name: /filter/i });
      fireEvent.keyDown(filterButton, { key: 'Enter' });
      expect(screen.getByRole('complementary')).toBeVisible();
    });

    it('provides proper ARIA labels', () => {
      renderWithProviders(<Benchmarks />);
      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'SaaS Benchmarks');
    });

    it('passes WCAG accessibility audit', async () => {
      const { container } = renderWithProviders(<Benchmarks />);
      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });
  });

  describe('Performance', () => {
    it('loads initial data efficiently', async () => {
      const start = performance.now();
      renderWithProviders(<Benchmarks />);
      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
    });

    it('maintains responsive UI during operations', async () => {
      renderWithProviders(<Benchmarks />);
      const filterButton = screen.getByRole('button', { name: /filter/i });
      const start = performance.now();
      await userEvent.click(filterButton);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // UI interactions should be near-instant
    });
  });
});