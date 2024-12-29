import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import Import from './Import';
import MetricsService from '../../../services/metrics.service';
import { DataSource } from '../../../interfaces/sources.interface';

// Mock dependencies
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn()
  };
});

vi.mock('../../../services/metrics.service', () => ({
  default: {
    validateImportFile: vi.fn(),
    importBenchmarkData: vi.fn()
  }
}));

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn()
  })
}));

// Test data
const mockDataSources: DataSource[] = [
  {
    id: '1',
    name: 'Source A',
    description: 'Test source A',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Source B',
    description: 'Test source B',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Helper function to create mock files
const createMockFile = (content: string, type = 'text/csv', size = 1024): File => {
  const blob = new Blob([content], { type });
  return new File([blob], 'test.csv', { type });
};

describe('Import Page', () => {
  const navigate = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as jest.Mock).mockReturnValue(navigate);
  });

  const renderImport = () => {
    return render(
      <MemoryRouter>
        <Import />
      </MemoryRouter>
    );
  };

  describe('Initial Rendering', () => {
    it('renders import form with all required elements', () => {
      renderImport();

      // Check for main components
      expect(screen.getByText(/Import Benchmark Data/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Import Data/i })).toBeInTheDocument();
      expect(screen.getByText(/Drop CSV file here or click to upload/i)).toBeInTheDocument();
    });

    it('displays data source selection dropdown', () => {
      renderImport();
      expect(screen.getByText(/Select Data Source/i)).toBeInTheDocument();
    });
  });

  describe('File Upload Handling', () => {
    it('handles valid file upload', async () => {
      renderImport();
      const file = createMockFile('header1,header2\nvalue1,value2');
      const fileInput = screen.getByLabelText(/file/i);

      await userEvent.upload(fileInput, file);

      expect(screen.getByText(/test\.csv/i)).toBeInTheDocument();
    });

    it('validates file size', async () => {
      renderImport();
      const largeFile = createMockFile('x'.repeat(11 * 1024 * 1024)); // 11MB file
      const fileInput = screen.getByLabelText(/file/i);

      await userEvent.upload(fileInput, largeFile);

      expect(screen.getByText(/File size must be under 10MB/i)).toBeInTheDocument();
    });

    it('validates file type', async () => {
      renderImport();
      const invalidFile = createMockFile('test', 'text/plain');
      const fileInput = screen.getByLabelText(/file/i);

      await userEvent.upload(fileInput, invalidFile);

      expect(screen.getByText(/Only CSV files are allowed/i)).toBeInTheDocument();
    });
  });

  describe('Import Process', () => {
    it('handles successful import flow', async () => {
      MetricsService.validateImportFile.mockResolvedValue(true);
      MetricsService.importBenchmarkData.mockResolvedValue(undefined);
      
      renderImport();
      
      // Select data source
      const sourceSelect = screen.getByText(/Select Data Source/i);
      await userEvent.click(sourceSelect);
      await userEvent.click(screen.getByText('Source A'));

      // Upload file
      const file = createMockFile('header1,header2\nvalue1,value2');
      const fileInput = screen.getByLabelText(/file/i);
      await userEvent.upload(fileInput, file);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Import Data/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(MetricsService.importBenchmarkData).toHaveBeenCalled();
      });
    });

    it('displays progress during import', async () => {
      MetricsService.validateImportFile.mockResolvedValue(true);
      MetricsService.importBenchmarkData.mockImplementation(
        (_, __, progressCallback) => {
          progressCallback({ stage: 'fileCheck', progress: 50, errors: [] });
          return Promise.resolve();
        }
      );

      renderImport();
      
      // Upload and submit
      const file = createMockFile('test data');
      const fileInput = screen.getByLabelText(/file/i);
      await userEvent.upload(fileInput, file);
      
      const submitButton = screen.getByRole('button', { name: /Import Data/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/50% complete/i)).toBeInTheDocument();
      });
    });

    it('handles validation errors', async () => {
      MetricsService.validateImportFile.mockResolvedValue(false);
      
      renderImport();
      
      const file = createMockFile('invalid data');
      const fileInput = screen.getByLabelText(/file/i);
      await userEvent.upload(fileInput, file);
      
      const submitButton = screen.getByRole('button', { name: /Import Data/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid file format or structure/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message for network failures', async () => {
      MetricsService.validateImportFile.mockRejectedValue(new Error('Network error'));
      
      renderImport();
      
      const file = createMockFile('test data');
      const fileInput = screen.getByLabelText(/file/i);
      await userEvent.upload(fileInput, file);
      
      const submitButton = screen.getByRole('button', { name: /Import Data/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });

    it('handles cancellation of import process', async () => {
      renderImport();
      
      const file = createMockFile('test data');
      const fileInput = screen.getByLabelText(/file/i);
      await userEvent.upload(fileInput, file);
      
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await userEvent.click(cancelButton);

      expect(navigate).toHaveBeenCalledWith('/admin/metrics');
    });
  });

  describe('Accessibility', () => {
    it('maintains focus management during import process', async () => {
      renderImport();
      
      const fileInput = screen.getByLabelText(/file/i);
      expect(document.activeElement).not.toBe(fileInput);
      
      await userEvent.tab();
      expect(document.activeElement).toBe(fileInput);
    });

    it('provides appropriate ARIA labels', () => {
      renderImport();
      
      expect(screen.getByRole('button', { name: /Import Data/i }))
        .toHaveAttribute('aria-disabled', 'false');
      
      expect(screen.getByLabelText(/Drop CSV file here or click to upload/i))
        .toBeInTheDocument();
    });
  });
});