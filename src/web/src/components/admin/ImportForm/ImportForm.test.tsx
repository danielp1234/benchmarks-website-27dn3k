import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest, describe, it, beforeEach, expect } from '@jest/globals';
import ImportForm from './ImportForm';
import { MetricsService } from '../../../services/metrics.service';

// Mock MetricsService
jest.mock('../../../services/metrics.service');

// Mock data
const mockDataSources = [
  { id: 'source1', name: 'Source A', description: 'Test source A', active: true },
  { id: 'source2', name: 'Source B', description: 'Test source B', active: true }
];

const mockValidFile = new File(
  ['metric,value\nRevenue Growth,10\nCustomer Churn,5'],
  'valid.csv',
  { type: 'text/csv' }
);

const mockInvalidFile = new File(
  ['invalid data'],
  'invalid.csv',
  { type: 'text/csv' }
);

const mockLargeFile = new File(
  [Array(11 * 1024 * 1024).fill('a').join('')],
  'large.csv',
  { type: 'text/csv' }
);

describe('ImportForm', () => {
  // Props setup
  const mockProps = {
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
    dataSources: mockDataSources,
    isLoading: false,
    onValidationProgress: jest.fn()
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('renders correctly with initial state', () => {
    render(<ImportForm {...mockProps} />);

    // Check for main form elements
    expect(screen.getByText(/Select Data Source/i)).toBeInTheDocument();
    expect(screen.getByText(/Drop CSV file here or click to upload/i)).toBeInTheDocument();
    expect(screen.getByText(/Maximum file size: 10MB/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Import Data/i })).toBeInTheDocument();
  });

  it('handles data source selection', async () => {
    render(<ImportForm {...mockProps} />);

    // Open dropdown
    const dropdown = screen.getByText(/Select Data Source/i);
    fireEvent.click(dropdown);

    // Select a source
    const sourceOption = screen.getByText('Source A');
    fireEvent.click(sourceOption);

    // Verify selection
    expect(screen.getByText('Source A')).toBeInTheDocument();
  });

  it('handles valid file upload via drag and drop', async () => {
    render(<ImportForm {...mockProps} />);

    const dropzone = screen.getByText(/Drop CSV file here or click to upload/i).parentElement!;

    // Simulate drag and drop
    fireEvent.dragEnter(dropzone);
    expect(dropzone).toHaveStyle({ borderColor: 'var(--primary-color)' });

    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [mockValidFile]
      }
    });

    // Verify file selection
    await waitFor(() => {
      expect(screen.getByText(/Selected file: valid.csv/i)).toBeInTheDocument();
    });

    // Verify validation progress callback
    expect(mockProps.onValidationProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'fileCheck',
        progress: 0,
        errors: []
      })
    );
  });

  it('handles invalid file upload', async () => {
    render(<ImportForm {...mockProps} />);

    const input = screen.getByTestId('file-input');
    
    await userEvent.upload(input, mockInvalidFile);

    // Verify error message
    await waitFor(() => {
      expect(screen.getByText(/Invalid number of columns/i)).toBeInTheDocument();
    });
  });

  it('prevents large file uploads', async () => {
    render(<ImportForm {...mockProps} />);

    const input = screen.getByTestId('file-input');
    
    await userEvent.upload(input, mockLargeFile);

    // Verify error message
    await waitFor(() => {
      expect(screen.getByText(/File size must be under 10MB/i)).toBeInTheDocument();
    });
  });

  it('handles form submission with valid data', async () => {
    render(<ImportForm {...mockProps} />);

    // Select data source
    const dropdown = screen.getByText(/Select Data Source/i);
    fireEvent.click(dropdown);
    fireEvent.click(screen.getByText('Source A'));

    // Upload file
    const input = screen.getByTestId('file-input');
    await userEvent.upload(input, mockValidFile);

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Import Data/i });
    fireEvent.click(submitButton);

    // Verify submission
    await waitFor(() => {
      expect(mockProps.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          dataSourceId: 'source1',
          file: expect.any(FileList)
        })
      );
    });
  });

  it('disables form submission while loading', () => {
    render(<ImportForm {...mockProps} isLoading={true} />);

    const submitButton = screen.getByRole('button', { name: /Importing\.\.\./i });
    expect(submitButton).toBeDisabled();
  });

  it('handles validation progress updates', async () => {
    render(<ImportForm {...mockProps} />);

    const input = screen.getByTestId('file-input');
    await userEvent.upload(input, mockValidFile);

    // Verify validation progress callbacks
    await waitFor(() => {
      expect(mockProps.onValidationProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'fileCheck',
          progress: 0,
          errors: []
        })
      );

      expect(mockProps.onValidationProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'schemaValidation',
          progress: 50,
          errors: []
        })
      );

      expect(mockProps.onValidationProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'dataValidation',
          progress: expect.any(Number),
          errors: expect.any(Array)
        })
      );
    });
  });

  it('supports RTL layout', () => {
    render(<ImportForm {...mockProps} direction="rtl" />);
    
    const form = screen.getByRole('form');
    expect(form).toHaveAttribute('dir', 'rtl');
  });

  it('displays error message for invalid data source selection', async () => {
    render(<ImportForm {...mockProps} />);

    const submitButton = screen.getByRole('button', { name: /Import Data/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Please select a data source/i)).toBeInTheDocument();
    });
  });
});