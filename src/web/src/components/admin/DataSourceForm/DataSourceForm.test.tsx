import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import DataSourceForm from './DataSourceForm';
import { SOURCE_VALIDATION } from '../../../constants/validation';
import type { DataSource, DataSourceCreate, DataSourceUpdate } from '../../../interfaces/sources.interface';

describe('DataSourceForm', () => {
  // Mock handlers
  const onSubmit = vi.fn();
  const onCancel = vi.fn();

  // Test data
  const validDataSource: DataSourceCreate = {
    name: 'Test Source',
    description: 'A valid test data source',
    active: true
  };

  const existingDataSource: DataSource = {
    ...validDataSource,
    id: '123',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders form fields correctly', () => {
      render(
        <DataSourceForm
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );

      // Check for form elements
      expect(screen.getByRole('form', { name: /data source form/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/active status/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('renders with initial data for editing', () => {
      render(
        <DataSourceForm
          initialData={existingDataSource}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );

      expect(screen.getByLabelText(/name/i)).toHaveValue(existingDataSource.name);
      expect(screen.getByLabelText(/description/i)).toHaveValue(existingDataSource.description);
      expect(screen.getByLabelText(/active status/i)).toBeChecked();
      expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
    });

    it('applies proper ARIA attributes for accessibility', () => {
      render(
        <DataSourceForm
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );

      const form = screen.getByRole('form');
      const nameInput = screen.getByLabelText(/name/i);
      const descriptionInput = screen.getByLabelText(/description/i);

      expect(form).toHaveAttribute('aria-label', 'Data Source Form');
      expect(nameInput).toHaveAttribute('aria-required', 'true');
      expect(descriptionInput).toHaveAttribute('aria-required', 'true');
    });
  });

  describe('Validation', () => {
    it('validates required fields', async () => {
      render(
        <DataSourceForm
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );

      // Submit empty form
      fireEvent.click(screen.getByRole('button', { name: /create/i }));

      // Check for required field error messages
      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/description is required/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('validates name length constraints', async () => {
      render(
        <DataSourceForm
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );

      const nameInput = screen.getByLabelText(/name/i);

      // Test minimum length
      await userEvent.type(nameInput, 'ab');
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(screen.getByText(new RegExp(`name must be at least ${SOURCE_VALIDATION.NAME_MIN_LENGTH} characters`, 'i'))).toBeInTheDocument();
      });

      // Test maximum length
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'a'.repeat(SOURCE_VALIDATION.NAME_MAX_LENGTH + 1));
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(screen.getByText(new RegExp(`name must not exceed ${SOURCE_VALIDATION.NAME_MAX_LENGTH} characters`, 'i'))).toBeInTheDocument();
      });
    });

    it('validates description length constraint', async () => {
      render(
        <DataSourceForm
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );

      const descriptionInput = screen.getByLabelText(/description/i);

      // Test maximum length
      await userEvent.type(descriptionInput, 'a'.repeat(SOURCE_VALIDATION.DESCRIPTION_MAX_LENGTH + 1));
      fireEvent.blur(descriptionInput);

      await waitFor(() => {
        expect(screen.getByText(new RegExp(`description must not exceed ${SOURCE_VALIDATION.DESCRIPTION_MAX_LENGTH} characters`, 'i'))).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('handles successful form submission', async () => {
      render(
        <DataSourceForm
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );

      // Fill form with valid data
      await userEvent.type(screen.getByLabelText(/name/i), validDataSource.name);
      await userEvent.type(screen.getByLabelText(/description/i), validDataSource.description);
      await userEvent.click(screen.getByLabelText(/active status/i));

      // Submit form
      await userEvent.click(screen.getByRole('button', { name: /create/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(validDataSource);
      });
    });

    it('handles submission errors gracefully', async () => {
      const error = new Error('Submission failed');
      onSubmit.mockRejectedValueOnce(error);

      render(
        <DataSourceForm
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );

      // Fill and submit form
      await userEvent.type(screen.getByLabelText(/name/i), validDataSource.name);
      await userEvent.type(screen.getByLabelText(/description/i), validDataSource.description);
      await userEvent.click(screen.getByRole('button', { name: /create/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
        expect(screen.getByText(/submission failed/i)).toBeInTheDocument();
      });
    });

    it('disables form during submission', async () => {
      render(
        <DataSourceForm
          onSubmit={onSubmit}
          onCancel={onCancel}
          isSubmitting={true}
        />
      );

      expect(screen.getByLabelText(/name/i)).toBeDisabled();
      expect(screen.getByLabelText(/description/i)).toBeDisabled();
      expect(screen.getByLabelText(/active status/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /create/i })).toBeDisabled();
    });
  });

  describe('Form Cancellation', () => {
    it('handles form cancellation', async () => {
      render(
        <DataSourceForm
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );

      // Fill form partially
      await userEvent.type(screen.getByLabelText(/name/i), 'Test');

      // Cancel form
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Autosave Functionality', () => {
    it('triggers autosave when enabled', async () => {
      vi.useFakeTimers();

      render(
        <DataSourceForm
          onSubmit={onSubmit}
          onCancel={onCancel}
          autoSave={true}
        />
      );

      // Type in form fields
      await userEvent.type(screen.getByLabelText(/name/i), validDataSource.name);
      await userEvent.type(screen.getByLabelText(/description/i), validDataSource.description);

      // Fast-forward timers
      vi.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });

      vi.useRealTimers();
    });
  });
});