import React, { useState, useCallback } from 'react';
import styled from '@emotion/styled';
import AdminLayout from '../../../components/layout/AdminLayout/AdminLayout';
import ImportForm from '../../../components/admin/ImportForm/ImportForm';
import { useToast } from '../../../hooks/useToast';
import MetricsService from '../../../services/metrics.service';
import type { DataSource } from '../../../interfaces/sources.interface';

// Styled components for the import page
const ImportContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  padding: var(--spacing-xl);
  max-width: 800px;
  margin: 0 auto;
  background-color: var(--neutral-50);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
`;

const Title = styled.h1`
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  color: var(--neutral-900);
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-sm);
  border-bottom: 2px solid var(--primary-color);
`;

const ProgressContainer = styled.div<{ hasError?: boolean }>`
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  background-color: ${props => 
    props.hasError ? 'var(--error-light)' : 'var(--success-light)'};
`;

// Interface for import form data
interface ImportFormData {
  sourceId: string;
  file: File;
}

// Interface for validation progress
interface ValidationProgress {
  stage: 'fileCheck' | 'schemaValidation' | 'dataValidation';
  progress: number;
  errors: Array<{
    row: number;
    column: string;
    message: string;
  }>;
}

/**
 * Admin Import page component for handling benchmark data imports
 * Implements secure file handling and validation with progress tracking
 */
const Import: React.FC = () => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const { showSuccessToast, showErrorToast } = useToast();

  /**
   * Handle file import with validation and progress tracking
   */
  const handleImport = useCallback(async (data: ImportFormData) => {
    setIsLoading(true);
    setProgress(0);

    try {
      // Initial file validation
      const isValid = await MetricsService.validateImportFile(data.file);
      if (!isValid) {
        throw new Error('Invalid file format or structure');
      }

      // Track validation progress
      const handleValidationProgress = (validationProgress: ValidationProgress) => {
        setProgress(validationProgress.progress);
        
        // Show validation errors if any
        if (validationProgress.errors.length > 0) {
          showErrorToast(
            `Validation errors found: ${validationProgress.errors.length} issues detected`
          );
        }
      };

      // Import data with progress tracking
      await MetricsService.importBenchmarkData(
        data.sourceId,
        data.file,
        handleValidationProgress
      );

      showSuccessToast('Benchmark data imported successfully');
    } catch (error) {
      let errorMessage = 'Failed to import benchmark data';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      showErrorToast(errorMessage);
      console.error('Import error:', error);
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  }, [showSuccessToast, showErrorToast]);

  /**
   * Handle validation progress updates
   */
  const handleValidationProgress = useCallback((progress: ValidationProgress) => {
    setProgress(progress.progress);
    
    // Show stage-specific feedback
    switch (progress.stage) {
      case 'fileCheck':
        if (progress.errors.length > 0) {
          showErrorToast('File validation failed');
        }
        break;
      case 'schemaValidation':
        if (progress.errors.length > 0) {
          showErrorToast('Invalid file structure detected');
        }
        break;
      case 'dataValidation':
        if (progress.errors.length > 0) {
          showErrorToast(`${progress.errors.length} data validation errors found`);
        }
        break;
    }
  }, [showErrorToast]);

  return (
    <AdminLayout>
      <ImportContainer>
        <Title>Import Benchmark Data</Title>
        
        <ImportForm
          onSubmit={handleImport}
          dataSources={dataSources}
          isLoading={isLoading}
          onValidationProgress={handleValidationProgress}
        />

        {(isLoading || progress > 0) && (
          <ProgressContainer hasError={progress === 100}>
            <div>
              {isLoading ? 'Importing data...' : 'Validating file...'}
              {progress > 0 && ` (${progress}% complete)`}
            </div>
          </ProgressContainer>
        )}
      </ImportContainer>
    </AdminLayout>
  );
};

export default Import;