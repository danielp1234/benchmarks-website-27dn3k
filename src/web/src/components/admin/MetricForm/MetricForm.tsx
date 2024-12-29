import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import {
  FormContainer,
  FormGroup,
  ErrorMessage,
  ButtonContainer
} from './MetricForm.styles';
import Input from '../../common/Input/Input';
import Dropdown from '../../common/Dropdown/Dropdown';
import Button from '../../common/Button/Button';
import {
  Metric,
  MetricCategory,
  isMetricCategory
} from '../../../interfaces/metrics.interface';
import MetricsService from '../../../services/metrics.service';

// @version react-hook-form ^7.0.0
// @version yup ^1.0.0

interface MetricFormProps {
  metricId?: string;
  onSubmit: (metric: Metric) => Promise<void>;
  onCancel: () => void;
  onError: (error: Error) => void;
}

interface MetricFormData {
  name: string;
  description: string;
  category: MetricCategory;
  displayOrder: number;
  isActive: boolean;
}

// Validation schema using yup
const validationSchema = yup.object().shape({
  name: yup
    .string()
    .required('Metric name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must not exceed 50 characters'),
  description: yup
    .string()
    .required('Description is required')
    .max(200, 'Description must not exceed 200 characters'),
  category: yup
    .string()
    .required('Category is required')
    .test('valid-category', 'Invalid category selected', value => 
      isMetricCategory(value as string)
    ),
  displayOrder: yup
    .number()
    .required('Display order is required')
    .min(0, 'Display order must be non-negative')
    .integer('Display order must be a whole number'),
  isActive: yup.boolean()
});

export const MetricForm: React.FC<MetricFormProps> = ({
  metricId,
  onSubmit,
  onCancel,
  onError
}) => {
  // Form state management with react-hook-form
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue
  } = useForm<MetricFormData>({
    mode: 'onBlur',
    defaultValues: {
      isActive: true,
      displayOrder: 0
    }
  });

  const [loading, setLoading] = useState(false);

  // Load existing metric data if editing
  useEffect(() => {
    const loadMetricData = async () => {
      if (!metricId) return;
      
      try {
        setLoading(true);
        const metric = await MetricsService.getMetricById(metricId);
        
        // Set form values
        reset({
          name: metric.name,
          description: metric.description,
          category: metric.category,
          displayOrder: metric.displayOrder,
          isActive: true // Assuming active by default
        });
      } catch (error) {
        onError(error as Error);
      } finally {
        setLoading(false);
      }
    };

    loadMetricData();
  }, [metricId, reset, onError]);

  // Form submission handler
  const handleFormSubmit = useCallback(async (data: MetricFormData) => {
    try {
      const metricData: Partial<Metric> = {
        name: data.name,
        description: data.description,
        category: data.category,
        displayOrder: data.displayOrder
      };

      await onSubmit(metricData as Metric);
    } catch (error) {
      onError(error as Error);
    }
  }, [onSubmit, onError]);

  // Category options for dropdown
  const categoryOptions = Object.values(MetricCategory).map(category => ({
    value: category,
    label: category
  }));

  if (loading) {
    return (
      <FormContainer>
        <div role="status" aria-live="polite">Loading metric data...</div>
      </FormContainer>
    );
  }

  return (
    <FormContainer>
      <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
        <FormGroup>
          <Input
            name="name"
            label="Metric Name"
            required
            error={errors.name?.message}
            {...register('name')}
          />
        </FormGroup>

        <FormGroup>
          <Input
            name="description"
            label="Description"
            required
            error={errors.description?.message}
            {...register('description')}
          />
        </FormGroup>

        <FormGroup>
          <Dropdown
            options={categoryOptions}
            value={register('category').value || ''}
            onChange={(value) => setValue('category', value as MetricCategory)}
            placeholder="Select Category"
            error={errors.category?.message}
          />
        </FormGroup>

        <FormGroup>
          <Input
            name="displayOrder"
            label="Display Order"
            type="number"
            required
            error={errors.displayOrder?.message}
            {...register('displayOrder')}
          />
        </FormGroup>

        <ButtonContainer>
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={isSubmitting}
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            {metricId ? 'Update Metric' : 'Create Metric'}
          </Button>
        </ButtonContainer>

        {Object.keys(errors).length > 0 && (
          <ErrorMessage role="alert">
            Please correct the errors above to continue
          </ErrorMessage>
        )}
      </form>
    </FormContainer>
  );
};

export default MetricForm;