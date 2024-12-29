import React, { useEffect, useCallback, memo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import debounce from 'lodash/debounce';

import Input from '../../common/Input/Input';
import Button from '../../common/Button/Button';
import { DataSourceCreate, DataSourceUpdate } from '../../../interfaces/sources.interface';

// Form validation schema
const validationSchema = yup.object().shape({
  name: yup
    .string()
    .required('Name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must not exceed 50 characters'),
  description: yup
    .string()
    .required('Description is required')
    .max(200, 'Description must not exceed 200 characters'),
  active: yup.boolean()
});

// Constants
const AUTOSAVE_INTERVAL = 3000;
const FORM_ANALYTICS_KEY = 'data-source-form-metrics';

interface DataSourceFormProps {
  initialData?: DataSourceCreate | DataSourceUpdate;
  onSubmit: (data: DataSourceCreate | DataSourceUpdate) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  autoSave?: boolean;
}

/**
 * DataSourceForm Component
 * 
 * A comprehensive form component for creating and editing data sources with
 * enhanced validation, accessibility, and state management features.
 *
 * @version 1.0.0
 */
const DataSourceForm: React.FC<DataSourceFormProps> = memo(({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  autoSave = true
}) => {
  // Form initialization with validation
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty, dirtyFields },
    reset,
    watch
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      active: initialData?.active ?? true
    }
  });

  // Watch form values for autosave
  const formValues = watch();

  // Autosave implementation
  const debouncedAutoSave = useCallback(
    debounce(async (data: DataSourceCreate | DataSourceUpdate) => {
      if (autoSave && isDirty) {
        try {
          await onSubmit(data);
          // Track successful autosave
          window.analytics?.track('datasource_form_autosave_success', {
            formKey: FORM_ANALYTICS_KEY
          });
        } catch (error) {
          console.error('Autosave failed:', error);
          // Track autosave failure
          window.analytics?.track('datasource_form_autosave_error', {
            formKey: FORM_ANALYTICS_KEY,
            error: error.message
          });
        }
      }
    }, AUTOSAVE_INTERVAL),
    [autoSave, isDirty, onSubmit]
  );

  // Handle autosave on form changes
  useEffect(() => {
    if (autoSave && isDirty) {
      debouncedAutoSave(formValues);
    }
    return () => {
      debouncedAutoSave.cancel();
    };
  }, [formValues, autoSave, isDirty, debouncedAutoSave]);

  // Form submission handler
  const handleFormSubmit = async (data: DataSourceCreate | DataSourceUpdate) => {
    try {
      await onSubmit(data);
      reset(data); // Reset form state after successful submission
      
      // Track successful submission
      window.analytics?.track('datasource_form_submit_success', {
        formKey: FORM_ANALYTICS_KEY
      });
    } catch (error) {
      console.error('Form submission failed:', error);
      // Track submission failure
      window.analytics?.track('datasource_form_submit_error', {
        formKey: FORM_ANALYTICS_KEY,
        error: error.message
      });
    }
  };

  // Handle form cancellation
  const handleCancel = () => {
    reset(); // Reset form state
    onCancel();
  };

  return (
    <form 
      onSubmit={handleSubmit(handleFormSubmit)}
      aria-label="Data Source Form"
      noValidate
    >
      <div role="group" aria-labelledby="data-source-details">
        <h2 id="data-source-details" className="visually-hidden">
          Data Source Details
        </h2>

        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              label="Name"
              error={errors.name?.message}
              required
              disabled={isSubmitting}
              fullWidth
              aria-describedby="name-hint"
            />
          )}
        />

        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              label="Description"
              error={errors.description?.message}
              required
              disabled={isSubmitting}
              fullWidth
              aria-describedby="description-hint"
            />
          )}
        />

        <Controller
          name="active"
          control={control}
          render={({ field: { value, onChange, ...field } }) => (
            <div className="checkbox-wrapper">
              <input
                {...field}
                type="checkbox"
                checked={value}
                onChange={e => onChange(e.target.checked)}
                disabled={isSubmitting}
                id="active-status"
              />
              <label htmlFor="active-status">Active Status</label>
            </div>
          )}
        />
      </div>

      <div className="form-actions" role="group" aria-label="Form Actions">
        <Button
          type="submit"
          disabled={!isDirty || isSubmitting}
          loading={isSubmitting}
          variant="primary"
          aria-label={initialData ? 'Update Data Source' : 'Create Data Source'}
        >
          {initialData ? 'Update' : 'Create'}
        </Button>

        <Button
          type="button"
          onClick={handleCancel}
          disabled={isSubmitting}
          variant="outlined"
          aria-label="Cancel"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
});

DataSourceForm.displayName = 'DataSourceForm';

export default DataSourceForm;