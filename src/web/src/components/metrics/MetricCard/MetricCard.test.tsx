import React from 'react'; // ^18.0.0
import { render, screen, fireEvent, within } from '@testing-library/react'; // ^14.0.0
import userEvent from '@testing-library/user-event'; // ^14.0.0
import { axe, toHaveNoViolations } from 'jest-axe'; // ^8.0.0
import { expect, describe, it, beforeEach } from '@jest/globals'; // ^29.0.0
import { ThemeProvider } from '@mui/material'; // ^5.0.0

import MetricCard from './MetricCard';
import { Metric, MetricCategory } from '../../../interfaces/metrics.interface';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

/**
 * Helper function to render component with theme provider
 */
const renderWithTheme = (ui: React.ReactElement, options = {}) => {
  return render(
    <ThemeProvider theme={{}}>
      {ui}
    </ThemeProvider>,
    options
  );
};

/**
 * Mock test data
 */
const testMetric: Metric = {
  id: 'test-uuid',
  name: 'Revenue Growth',
  category: MetricCategory.GROWTH,
  description: 'Year-over-year revenue growth rate',
  displayOrder: 1,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-10-01')
};

const testBenchmarkData = {
  p5_value: 0.2,
  p25_value: 0.5,
  p50_value: 0.8,
  p75_value: 1.2,
  p90_value: 1.5,
  source: 'Test Source',
  arr_range: '$10M-$20M',
  effective_date: '2023-10-01'
};

describe('MetricCard Component', () => {
  // Rendering Tests
  describe('Rendering', () => {
    it('renders metric name and category correctly', () => {
      renderWithTheme(
        <MetricCard 
          metric={testMetric}
          benchmarkData={testBenchmarkData}
        />
      );

      expect(screen.getByRole('heading')).toHaveTextContent('Revenue Growth');
      expect(screen.getByText(MetricCategory.GROWTH)).toBeInTheDocument();
    });

    it('displays all percentile values with proper formatting', () => {
      renderWithTheme(
        <MetricCard 
          metric={testMetric}
          benchmarkData={testBenchmarkData}
        />
      );

      const percentiles = ['P5', 'P25', 'P50', 'P75', 'P90'];
      const values = ['20.0%', '50.0%', '80.0%', '120.0%', '150.0%'];

      percentiles.forEach((percentile, index) => {
        const item = screen.getByLabelText(`${percentile} percentile`);
        expect(item).toHaveTextContent(values[index]);
      });
    });

    it('handles missing data gracefully', () => {
      const incompleteData = {
        ...testBenchmarkData,
        p90_value: null
      };

      renderWithTheme(
        <MetricCard 
          metric={testMetric}
          benchmarkData={incompleteData}
        />
      );

      expect(screen.getByLabelText('P90 percentile')).toHaveTextContent('N/A');
    });

    it('displays source and date information', () => {
      renderWithTheme(
        <MetricCard 
          metric={testMetric}
          benchmarkData={testBenchmarkData}
        />
      );

      const sourceText = screen.getByText(/Test Source/i);
      expect(sourceText).toBeInTheDocument();
      expect(screen.getByText(/Oct 2023/i)).toBeInTheDocument();
    });
  });

  // Accessibility Tests
  describe('Accessibility', () => {
    it('meets WCAG 2.1 Level AA requirements', async () => {
      const { container } = renderWithTheme(
        <MetricCard 
          metric={testMetric}
          benchmarkData={testBenchmarkData}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper ARIA labels', () => {
      renderWithTheme(
        <MetricCard 
          metric={testMetric}
          benchmarkData={testBenchmarkData}
        />
      );

      expect(screen.getByRole('article')).toHaveAttribute(
        'aria-label',
        'Revenue Growth benchmark data'
      );
      expect(screen.getByRole('group')).toHaveAttribute(
        'aria-label',
        'Percentile distribution'
      );
    });

    it('maintains correct heading hierarchy', () => {
      renderWithTheme(
        <MetricCard 
          metric={testMetric}
          benchmarkData={testBenchmarkData}
        />
      );

      const heading = screen.getByRole('heading');
      expect(heading).toHaveAttribute('aria-level', '3');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <MetricCard 
          metric={testMetric}
          benchmarkData={testBenchmarkData}
        />
      );

      const card = screen.getByRole('article');
      await user.tab();
      expect(card).toHaveFocus();
    });
  });

  // Responsiveness Tests
  describe('Responsiveness', () => {
    beforeEach(() => {
      // Reset viewport to desktop
      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));
    });

    it('adapts layout for mobile viewport', () => {
      // Set viewport to mobile size
      global.innerWidth = 320;
      global.dispatchEvent(new Event('resize'));

      renderWithTheme(
        <MetricCard 
          metric={testMetric}
          benchmarkData={testBenchmarkData}
        />
      );

      const container = screen.getByRole('article');
      expect(container).toHaveStyle({
        padding: 'var(--spacing-md)'
      });
    });

    it('maintains readability at different sizes', () => {
      const { rerender } = renderWithTheme(
        <MetricCard 
          metric={testMetric}
          benchmarkData={testBenchmarkData}
        />
      );

      // Test desktop view
      expect(screen.getByRole('heading')).toHaveStyle({
        fontSize: 'var(--font-size-xl)'
      });

      // Test mobile view
      global.innerWidth = 320;
      global.dispatchEvent(new Event('resize'));
      rerender(
        <ThemeProvider theme={{}}>
          <MetricCard 
            metric={testMetric}
            benchmarkData={testBenchmarkData}
          />
        </ThemeProvider>
      );

      expect(screen.getByRole('heading')).toHaveStyle({
        fontSize: 'var(--font-size-lg)'
      });
    });
  });

  // Error Handling Tests
  describe('Error Handling', () => {
    it('handles invalid date formats gracefully', () => {
      const invalidData = {
        ...testBenchmarkData,
        effective_date: 'invalid-date'
      };

      renderWithTheme(
        <MetricCard 
          metric={testMetric}
          benchmarkData={invalidData}
        />
      );

      expect(screen.getByText(/N\/A/i)).toBeInTheDocument();
    });

    it('handles invalid percentage values', () => {
      const invalidData = {
        ...testBenchmarkData,
        p50_value: 'invalid'
      };

      renderWithTheme(
        <MetricCard 
          metric={testMetric}
          benchmarkData={invalidData}
        />
      );

      const p50Item = screen.getByLabelText('P50 percentile');
      expect(p50Item).toHaveTextContent('N/A');
    });
  });

  // Style Tests
  describe('Styling', () => {
    it('applies correct Material Design styling classes', () => {
      renderWithTheme(
        <MetricCard 
          metric={testMetric}
          benchmarkData={testBenchmarkData}
        />
      );

      const card = screen.getByRole('article');
      expect(card).toHaveStyle({
        backgroundColor: '#FFFFFF',
        borderRadius: 'var(--border-radius-md)'
      });
    });

    it('handles custom className prop', () => {
      const customClass = 'custom-card';
      renderWithTheme(
        <MetricCard 
          metric={testMetric}
          benchmarkData={testBenchmarkData}
          className={customClass}
        />
      );

      expect(screen.getByRole('article')).toHaveClass(customClass);
    });
  });
});