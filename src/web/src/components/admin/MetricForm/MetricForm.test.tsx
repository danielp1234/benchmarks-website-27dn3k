import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { axe } from '@axe-core/react';
import MetricForm, { MetricFormProps } from './MetricForm';
import { Metric, MetricCategory } from '../../../interfaces/metrics.interface';
import { validateMetricName, validateMetricDescription, validateMetricCategory } from '../../../utils/validation.utils';

// Mock validation utilities
vi.mock('../../../utils/validation.utils', () => ({
  validateMetricName: vi.fn(),
  validateMetricDescription: vi.fn(),
  validateMetricCategory: vi.fn()
}));

// Mock metric data
const mockMetric: Metric = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Test Metric',
  description: 'Test Description',
  category: MetricCategory.GROWTH,
  displayOrder: 1,
  createdAt: new Date(),
  updatedAt: new Date()
};

// Mock handlers
const mockSubmit = vi.fn().mockImplementation(() => Promise.resolve());
const mockCancel = vi.fn();
const mockError = vi.fn();

// Helper function to render form with default props
const renderMetricForm = (props: Partial<MetricFormProps> = {}) => {
  const defaultProps: MetricFormProps = {
    onSubmit: mockSubmit,
    onCancel: mockCancel,
    onError: mockError,
    ...props
  };
  
  const user = userEvent.setup();
  return {
    user,
    ...render(<MetricForm {...defaultProps} />)
  };
};

describe('MetricForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset validation mocks to return valid by default
    (validateMetricName as jest.Mock).mockReturnValue({ isValid: true });
    (validateMetricDescription as jest.Mock).mockReturnValue({ isValid: true });
    (validateMetricCategory as jest.Mock).mockReturnValue({ isValid: true });
  });

  describe('Rendering', () => {
    it('renders all form fields correctly', () => {
      renderMetricForm();

      // Check for form elements
      expect(screen.getByLabelText(/metric name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByText(/select category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/display order/i)).toBeInTheDocument();

      // Check for buttons
      expect(screen.getByRole('button', { name: /create metric/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('populates form fields when editing existing metric', () => {
      renderMetricForm({ metricId: mockMetric.id });

      // Check if fields are populated
      expect(screen.getByLabelText(/metric name/i)).toHaveValue(mockMetric.name);
      expect(screen.getByLabelText(/description/i)).toHaveValue(mockMetric.description);
      expect(screen.getByText(mockMetric.category)).toBeInTheDocument();
      expect(screen.getByLabelText(/display order/i)).toHaveValue(mockMetric.displayOrder.toString());
    });
  });

  describe('Validation', () => {
    it('validates required fields on submit', async () => {
      const { user } = renderMetricForm();

      // Submit empty form
      await user.click(screen.getByRole('button', { name: /create metric/i }));

      // Check for error messages
      expect(await screen.findByText(/metric name is required/i)).toBeInTheDocument();
      expect(await screen.findByText(/description is required/i)).toBeInTheDocument();
      expect(await screen.findByText(/category is required/i)).toBeInTheDocument();
    });

    it('performs real-time validation on metric name', async () => {
      (validateMetricName as jest.Mock).mockReturnValue({
        isValid: false,
        error: 'Invalid metric name'
      });

      const { user } = renderMetricForm();
      const nameInput = screen.getByLabelText(/metric name/i);

      await user.type(nameInput, 'Invalid@Name');
      
      expect(await screen.findByText(/invalid metric name/i)).toBeInTheDocument();
    });

    it('validates description length', async () => {
      (validateMetricDescription as jest.Mock).mockReturnValue({
        isValid: false,
        error: 'Description too long'
      });

      const { user } = renderMetricForm();
      const descInput = screen.getByLabelText(/description/i);

      await user.type(descInput, 'A'.repeat(201));
      
      expect(await screen.findByText(/description too long/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid data', async () => {
      const { user } = renderMetricForm();

      // Fill form with valid data
      await user.type(screen.getByLabelText(/metric name/i), mockMetric.name);
      await user.type(screen.getByLabelText(/description/i), mockMetric.description);
      await user.click(screen.getByText(/select category/i));
      await user.click(screen.getByText(MetricCategory.GROWTH));
      await user.type(screen.getByLabelText(/display order/i), '1');

      // Submit form
      await user.click(screen.getByRole('button', { name: /create metric/i }));

      // Verify submission
      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith({
          name: mockMetric.name,
          description: mockMetric.description,
          category: MetricCategory.GROWTH,
          displayOrder: 1
        });
      });
    });

    it('handles submission errors gracefully', async () => {
      mockSubmit.mockRejectedValueOnce(new Error('Submission failed'));
      const { user } = renderMetricForm();

      // Fill and submit form
      await user.type(screen.getByLabelText(/metric name/i), mockMetric.name);
      await user.click(screen.getByRole('button', { name: /create metric/i }));

      // Verify error handling
      await waitFor(() => {
        expect(mockError).toHaveBeenCalledWith(expect.any(Error));
      });
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG accessibility standards', async () => {
      const { container } = renderMetricForm();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', async () => {
      const { user } = renderMetricForm();

      // Tab through form elements
      await user.tab();
      expect(screen.getByLabelText(/metric name/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/description/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByText(/select category/i)).toHaveFocus();
    });

    it('announces validation errors to screen readers', async () => {
      const { user } = renderMetricForm();

      // Submit empty form
      await user.click(screen.getByRole('button', { name: /create metric/i }));

      // Check for ARIA alerts
      const alerts = await screen.findAllByRole('alert');
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0]).toHaveTextContent(/required/i);
    });
  });

  describe('Cancel Handling', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const { user } = renderMetricForm();
      
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      
      expect(mockCancel).toHaveBeenCalled();
    });

    it('prompts for confirmation if form is dirty', async () => {
      const { user } = renderMetricForm();

      // Fill form partially
      await user.type(screen.getByLabelText(/metric name/i), 'New Metric');
      
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      
      // Verify confirmation dialog
      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
    });
  });
});