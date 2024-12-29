import React, { useState, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import styled from '@emotion/styled';
import * as yup from 'yup';
import Button from '../../common/Button/Button';
import Dropdown from '../../common/Dropdown/Dropdown';
import type { DataSource } from '../../../interfaces/sources.interface';

// Validation schema for import form
const importSchema = yup.object().shape({
  dataSourceId: yup.string().required('Please select a data source'),
  file: yup.mixed()
    .required('Please upload a file')
    .test('fileType', 'Only CSV files are allowed', (value) => {
      if (!value) return false;
      return value[0]?.type === 'text/csv';
    })
    .test('fileSize', 'File size must be under 10MB', (value) => {
      if (!value) return false;
      return value[0]?.size <= 10 * 1024 * 1024; // 10MB
    }),
});

// Types for form data and props
interface ImportFormData {
  dataSourceId: string;
  file: FileList;
}

interface ImportFormProps {
  onSubmit: (data: ImportFormData) => Promise<void>;
  dataSources: DataSource[];
  isLoading: boolean;
  onValidationProgress: (progress: ValidationProgress) => void;
  direction?: 'ltr' | 'rtl';
}

export interface ValidationProgress {
  stage: 'fileCheck' | 'schemaValidation' | 'dataValidation';
  progress: number;
  errors: ValidationError[];
}

interface ValidationError {
  row: number;
  column: string;
  message: string;
}

// Styled components
const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  border-radius: 8px;
  background-color: var(--neutral-50);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-normal);
  position: relative;
  max-width: 800px;
  margin: 0 auto;
`;

const FileInput = styled.div<{ isDragActive?: boolean; hasError?: boolean }>`
  border: 2px dashed ${props => 
    props.hasError ? 'var(--error-color)' : 
    props.isDragActive ? 'var(--primary-color)' : 'var(--neutral-300)'
  };
  border-radius: var(--border-radius-md);
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-normal);
  background-color: ${props => 
    props.isDragActive ? 'var(--primary-light)' : 'var(--neutral-100)'
  };
  position: relative;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
`;

const ValidationStatus = styled.div<{ hasError?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px;
  border-radius: var(--border-radius-md);
  background-color: ${props => 
    props.hasError ? 'var(--error-light)' : 'var(--success-light)'
  };
  color: var(--neutral-900);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-normal);
`;

export const ImportForm: React.FC<ImportFormProps> = ({
  onSubmit,
  dataSources,
  isLoading,
  onValidationProgress,
  direction = 'ltr'
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<ImportFormData>({
    mode: 'onChange',
    resolver: yup.object().shape(importSchema),
  });

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/csv') {
      setValue('file', e.dataTransfer.files);
      setSelectedFileName(file.name);
      validateFile(file);
    }
  }, [setValue]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      validateFile(file);
    }
  }, []);

  const validateFile = async (file: File) => {
    // Initial file check
    onValidationProgress({
      stage: 'fileCheck',
      progress: 0,
      errors: [],
    });

    // Schema validation
    onValidationProgress({
      stage: 'schemaValidation',
      progress: 50,
      errors: [],
    });

    // Data validation
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      const lines = content.split('\n');
      const headers = lines[0].split(',');
      
      const errors: ValidationError[] = [];
      let progress = 0;
      
      for (let i = 1; i < lines.length; i++) {
        progress = Math.floor((i / lines.length) * 100);
        
        // Validate each row
        const row = lines[i].split(',');
        if (row.length !== headers.length) {
          errors.push({
            row: i,
            column: 'all',
            message: 'Invalid number of columns',
          });
        }
        
        // Update progress
        onValidationProgress({
          stage: 'dataValidation',
          progress,
          errors,
        });
      }
    };
    
    reader.readAsText(file);
  };

  const onFormSubmit = handleSubmit(async (data) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Import failed:', error);
    }
  });

  return (
    <FormContainer onSubmit={onFormSubmit} dir={direction}>
      <Dropdown
        options={dataSources.map(source => ({
          value: source.id,
          label: source.name,
        }))}
        value={watch('dataSourceId') || ''}
        onChange={(value) => setValue('dataSourceId', value as string)}
        placeholder="Select Data Source"
        error={errors.dataSourceId?.message}
        searchable
        direction={direction}
      />

      <FileInput
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        isDragActive={isDragActive}
        hasError={!!errors.file}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept=".csv"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          {...register('file')}
        />
        {selectedFileName ? (
          <div>
            <p>Selected file: {selectedFileName}</p>
            <p>Click or drag to change file</p>
          </div>
        ) : (
          <div>
            <p>Drop CSV file here or click to upload</p>
            <p>Maximum file size: 10MB</p>
          </div>
        )}
        {errors.file && (
          <ValidationStatus hasError>
            {errors.file.message}
          </ValidationStatus>
        )}
      </FileInput>

      <Button
        type="submit"
        variant="primary"
        disabled={isLoading}
        loading={isLoading}
        fullWidth
      >
        {isLoading ? 'Importing...' : 'Import Data'}
      </Button>
    </FormContainer>
  );
};

export default ImportForm;