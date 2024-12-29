import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Metrics from './Metrics';
import useMetrics from '../../../hooks/useMetrics';
import useToast from '../../../hooks/useToast';
import { Metric, MetricCategory } from '../../../interfaces/metrics.interface';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock hooks
jest.mock('../../../hooks/useMetrics');
jest.mock('../../../hooks/useToast');

// Mock data
const mockMetrics: Metric[] = [
  {
    id: '1',
    name: 'Revenue Growth',
    description: 'Year over year revenue growth rate',
    category: MetricCategory.GROWTH,
    displayOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Customer Churn',
    description: 'Monthly customer churn rate',
    category: MetricCategory.SALES,
    displayOrder: 2,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Mock store
const createTestStore = () => configureStore({
  reducer: {
    metrics: (state = {}, action) => state
  }
});

// Enhanced render helper with providers
const renderWithProviders = (ui: React.ReactElement, options = {}) => {
  const store = createTestStore();
  return {
    ...render(
      <Provider store={store}>
        {ui}
      </Provider>
    ),
    store
  };
};

describe('Metrics Page', () => {
  // Setup and teardown
  beforeEach(() => {
    (useMetrics as jest.Mock).mockReturnValue({
      metrics: mockMetrics,
      loading: false,
      error: null,
      filter: {
        page: 1,
        pageSize: 10,
        categories: []
      },
      pagination: {
        page: 1,
        pageSize: 10,
        totalItems: mockMetrics.length
      },
      fetchMetricsData: jest.fn(),
      filterMetricsData: jest.fn(),
      updateFilter: jest.fn(),
      clearFilter: jest.fn()
    });

    (useToast as jest.Mock).mockReturnValue({
      showSuccessToast: jest.fn(),
      showErrorToast: jest.fn()
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(<Metrics />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA labels and roles', () => {
      renderWithProviders(<Metrics />);
      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Metrics Management');
      expect(screen.getByRole('grid')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add new metric/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      renderWithProviders(<Metrics />);
      const addButton = screen.getByRole('button', { name: /add new metric/i });
      
      // Tab navigation
      addButton.focus();
      expect(document.activeElement).toBe(addButton);
      
      // Enter key handling
      fireEvent.keyDown(addButton, { key: 'Enter' });
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should render mobile layout on small screens', () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));
      
      renderWithProviders(<Metrics />);
      expect(screen.getByRole('main')).toHaveStyle({
        padding: 'var(--spacing-md)'
      });
    });

    it('should render desktop layout on large screens', () => {
      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));
      
      renderWithProviders(<Metrics />);
      expect(screen.getByRole('main')).toHaveStyle({
        padding: 'var(--spacing-lg)'
      });
    });
  });

  describe('CRUD Operations', () => {
    it('should display metrics in a table', () => {
      renderWithProviders(<Metrics />);
      mockMetrics.forEach(metric => {
        expect(screen.getByText(metric.name)).toBeInTheDocument();
      });
    });

    it('should open create metric modal', async () => {
      renderWithProviders(<Metrics />);
      const addButton = screen.getByRole('button', { name: /add new metric/i });
      
      await userEvent.click(addButton);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/add new metric/i)).toBeInTheDocument();
    });

    it('should handle metric creation', async () => {
      const mockHandleSubmit = jest.fn();
      renderWithProviders(<Metrics />);
      
      // Open modal and fill form
      await userEvent.click(screen.getByRole('button', { name: /add new metric/i }));
      await userEvent.type(screen.getByLabelText(/metric name/i), 'New Metric');
      await userEvent.type(screen.getByLabelText(/description/i), 'Test description');
      await userEvent.selectOptions(screen.getByLabelText(/category/i), MetricCategory.GROWTH);
      
      // Submit form
      await userEvent.click(screen.getByRole('button', { name: /create metric/i }));
      
      expect(mockHandleSubmit).toHaveBeenCalled();
    });

    it('should handle metric deletion', async () => {
      renderWithProviders(<Metrics />);
      const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
      
      // Mock window.confirm
      window.confirm = jest.fn(() => true);
      
      await userEvent.click(deleteButton);
      
      expect(window.confirm).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      const error = 'Failed to fetch metrics';
      (useMetrics as jest.Mock).mockReturnValue({
        ...useMetrics(),
        error,
        loading: false
      });

      renderWithProviders(<Metrics />);
      expect(screen.getByRole('alert')).toHaveTextContent(error);
    });

    it('should handle validation errors in form', async () => {
      renderWithProviders(<Metrics />);
      
      await userEvent.click(screen.getByRole('button', { name: /add new metric/i }));
      await userEvent.click(screen.getByRole('button', { name: /create metric/i }));
      
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should show loading state while fetching data', () => {
      (useMetrics as jest.Mock).mockReturnValue({
        ...useMetrics(),
        loading: true
      });

      renderWithProviders(<Metrics />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should debounce search input', async () => {
      const mockFilterMetrics = jest.fn();
      (useMetrics as jest.Mock).mockReturnValue({
        ...useMetrics(),
        filterMetricsData: mockFilterMetrics
      });

      renderWithProviders(<Metrics />);
      const searchInput = screen.getByRole('searchbox');
      
      await userEvent.type(searchInput, 'test');
      
      // Wait for debounce
      await waitFor(() => {
        expect(mockFilterMetrics).toHaveBeenCalledTimes(1);
      }, { timeout: 500 });
    });
  });
});