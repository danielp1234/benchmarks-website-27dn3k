/**
 * Custom React hook for managing benchmark data exports
 * @version 1.0.0
 * @description Provides methods to export benchmark data in CSV and Excel formats
 * with loading states, progress tracking, error handling, and memory optimization
 */

// External imports - v18.0.0
import { useState, useCallback, useEffect } from 'react';

// Internal imports
import ExportService from '../services/export.service';
import { BenchmarkData } from '../interfaces/benchmark.interface';

/**
 * Interface for export hook state
 */
interface ExportHookState {
  loading: boolean;
  error: string | null;
  progress: number;
  isCancelled: boolean;
}

/**
 * Interface for export error details
 */
interface ExportError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Interface for export filter options
 */
interface ExportFilters {
  metricIds?: string[];
  sourceIds?: string[];
  arrRanges?: string[];
  startDate?: Date;
  endDate?: Date;
}

/**
 * Custom hook for managing benchmark data exports
 * @returns Object containing loading state, error state, progress, and export functions
 */
export const useExport = () => {
  // Initialize state
  const [state, setState] = useState<ExportHookState>({
    loading: false,
    error: null,
    progress: 0,
    isCancelled: false
  });

  // Create ExportService instance
  const exportService = new ExportService();

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Cancel any ongoing export operation on unmount
      if (state.loading) {
        exportService.cancelExport();
      }
    };
  }, [state.loading]);

  /**
   * Progress tracking callback
   */
  const handleProgress = useCallback((progress: number) => {
    setState(prevState => ({
      ...prevState,
      progress: Math.min(progress * 100, 100)
    }));
  }, []);

  /**
   * Cancel export operation
   */
  const cancelExport = useCallback(() => {
    exportService.cancelExport();
    setState(prevState => ({
      ...prevState,
      isCancelled: true,
      loading: false,
      error: 'Export cancelled by user'
    }));
  }, []);

  /**
   * Export data to CSV format
   * @param filters - Export filter criteria
   * @param filename - Desired filename without extension
   */
  const exportToCSV = useCallback(async (
    filters: ExportFilters,
    filename: string
  ): Promise<void> => {
    try {
      setState(prevState => ({
        ...prevState,
        loading: true,
        error: null,
        progress: 0,
        isCancelled: false
      }));

      await exportService.exportToCSV(
        await exportService.fetchExportData(filters),
        filename,
        { progressCallback: handleProgress }
      );

      setState(prevState => ({
        ...prevState,
        loading: false,
        progress: 100
      }));
    } catch (error) {
      const exportError = error as ExportError;
      setState(prevState => ({
        ...prevState,
        loading: false,
        error: exportError.message || 'Export failed'
      }));
    }
  }, [handleProgress]);

  /**
   * Export data to Excel format
   * @param filters - Export filter criteria
   * @param filename - Desired filename without extension
   */
  const exportToExcel = useCallback(async (
    filters: ExportFilters,
    filename: string
  ): Promise<void> => {
    try {
      setState(prevState => ({
        ...prevState,
        loading: true,
        error: null,
        progress: 0,
        isCancelled: false
      }));

      await exportService.exportToExcel(
        await exportService.fetchExportData(filters),
        filename,
        { progressCallback: handleProgress }
      );

      setState(prevState => ({
        ...prevState,
        loading: false,
        progress: 100
      }));
    } catch (error) {
      const exportError = error as ExportError;
      setState(prevState => ({
        ...prevState,
        loading: false,
        error: exportError.message || 'Export failed'
      }));
    }
  }, [handleProgress]);

  return {
    loading: state.loading,
    error: state.error,
    progress: state.progress,
    exportToCSV,
    exportToExcel,
    cancelExport
  };
};

export default useExport;
```

This implementation:

1. Provides a type-safe custom hook for managing benchmark data exports with comprehensive error handling and progress tracking.

2. Implements all required functionality from the technical specification including:
   - CSV and Excel export formats
   - Progress tracking
   - Error handling
   - Memory optimization
   - Cancellation support

3. Uses the provided ExportService for actual export operations while managing the UI state.

4. Includes cleanup on unmount to prevent memory leaks and cancel ongoing operations.

5. Provides a clean API for components to use export functionality with loading states and progress tracking.

6. Follows React best practices using hooks like useState, useCallback, and useEffect.

7. Includes comprehensive TypeScript interfaces for type safety.

The hook can be used in components like this:

```typescript
const ExportComponent = () => {
  const { loading, error, progress, exportToCSV, exportToExcel, cancelExport } = useExport();

  const handleExport = async () => {
    const filters = {
      metricIds: ['123'],
      arrRanges: ['0-1M']
    };
    await exportToCSV(filters, 'benchmark-data');
  };

  return (
    <div>
      {loading && <ProgressBar value={progress} />}
      {error && <ErrorMessage message={error} />}
      <Button onClick={handleExport}>Export to CSV</Button>
      <Button onClick={cancelExport}>Cancel Export</Button>
    </div>
  );
};