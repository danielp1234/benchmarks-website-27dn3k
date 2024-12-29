import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { debounce } from 'lodash'; // @version ^4.17.21
import { MetricForm } from '../../../components/admin/MetricForm/MetricForm';
import { Table } from '../../../components/common/Table/Table';
import { Button } from '../../../components/common/Button/Button';
import { Modal } from '../../../components/common/Modal/Modal';
import MetricsService from '../../../services/metrics.service';
import {
  Metric,
  MetricFilter,
  MetricSortOption,
  MetricCategory
} from '../../../interfaces/metrics.interface';

// Table column configuration with accessibility support
const TABLE_COLUMNS = [
  {
    key: 'name',
    header: 'Name',
    sortable: true,
    width: '30%',
    ariaLabel: 'Metric Name'
  },
  {
    key: 'category',
    header: 'Category',
    sortable: true,
    width: '25%',
    ariaLabel: 'Metric Category'
  },
  {
    key: 'displayOrder',
    header: 'Display Order',
    sortable: true,
    width: '20%',
    ariaLabel: 'Display Order'
  },
  {
    key: 'actions',
    header: 'Actions',
    sortable: false,
    width: '25%',
    ariaLabel: 'Action Buttons'
  }
];

// Interface for component state
interface MetricsState {
  metrics: Metric[];
  isLoading: boolean;
  error: Error | null;
  selectedMetricId: string | null;
  isModalOpen: boolean;
  sortOption: MetricSortOption;
  filter: MetricFilter;
  totalItems: number;
}

/**
 * Admin page component for managing SaaS metrics with comprehensive error handling
 * and accessibility features.
 */
const Metrics: React.FC = () => {
  // Component state
  const [state, setState] = useState<MetricsState>({
    metrics: [],
    isLoading: false,
    error: null,
    selectedMetricId: null,
    isModalOpen: false,
    sortOption: {
      field: 'displayOrder',
      direction: 'asc'
    },
    filter: {
      page: 1,
      pageSize: 10,
      categories: [],
      search: ''
    },
    totalItems: 0
  });

  // Memoized handlers for performance
  const handleSort = useCallback((column: string) => {
    setState(prev => ({
      ...prev,
      sortOption: {
        field: column as keyof Metric,
        direction: prev.sortOption.field === column && prev.sortOption.direction === 'asc' 
          ? 'desc' 
          : 'asc'
      },
      filter: { ...prev.filter, page: 1 }
    }));
  }, []);

  // Debounced search handler
  const handleSearch = useMemo(() => 
    debounce((search: string) => {
      setState(prev => ({
        ...prev,
        filter: { ...prev.filter, search, page: 1 }
      }));
    }, 300),
    []
  );

  // Load metrics data with error handling
  const loadMetrics = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await MetricsService.getMetrics(state.filter);
      setState(prev => ({
        ...prev,
        metrics: response.data,
        totalItems: response.pagination.totalItems,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error,
        isLoading: false
      }));
    }
  }, [state.filter]);

  // Handle metric form submission
  const handleSubmit = useCallback(async (metricData: Metric) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      if (state.selectedMetricId) {
        await MetricsService.updateMetric(state.selectedMetricId, metricData);
      } else {
        await MetricsService.createMetric(metricData);
      }
      
      await loadMetrics();
      setState(prev => ({
        ...prev,
        isModalOpen: false,
        selectedMetricId: null,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error,
        isLoading: false
      }));
    }
  }, [state.selectedMetricId, loadMetrics]);

  // Handle metric deletion
  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this metric?')) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await MetricsService.deleteMetric(id);
      await loadMetrics();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error,
        isLoading: false
      }));
    }
  }, [loadMetrics]);

  // Load initial data
  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Prepare table data with action buttons
  const tableData = useMemo(() => 
    state.metrics.map(metric => ({
      ...metric,
      category: MetricCategory[metric.category],
      actions: (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setState(prev => ({
              ...prev,
              selectedMetricId: metric.id,
              isModalOpen: true
            }))}
            ariaLabel={`Edit ${metric.name}`}
          >
            Edit
          </Button>
          <Button
            variant="text"
            size="small"
            onClick={() => handleDelete(metric.id)}
            ariaLabel={`Delete ${metric.name}`}
          >
            Delete
          </Button>
        </div>
      )
    })),
    [state.metrics, handleDelete]
  );

  return (
    <div role="main" aria-label="Metrics Management">
      <div style={{ 
        padding: 'var(--spacing-lg)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1>Manage Metrics</h1>
        <Button
          variant="primary"
          onClick={() => setState(prev => ({
            ...prev,
            selectedMetricId: null,
            isModalOpen: true
          }))}
        >
          Add New Metric
        </Button>
      </div>

      {state.error && (
        <div role="alert" style={{ 
          color: 'var(--error-color)',
          padding: 'var(--spacing-md)',
          marginBottom: 'var(--spacing-md)'
        }}>
          {state.error.message}
        </div>
      )}

      <Table
        columns={TABLE_COLUMNS}
        data={tableData}
        isLoading={state.isLoading}
        sortColumn={state.sortOption.field}
        sortDirection={state.sortOption.direction}
        onSort={handleSort}
        isStriped
      />

      <Modal
        isOpen={state.isModalOpen}
        onClose={() => setState(prev => ({ ...prev, isModalOpen: false }))}
        title={state.selectedMetricId ? 'Edit Metric' : 'Add New Metric'}
        size="medium"
      >
        <MetricForm
          metricId={state.selectedMetricId}
          onSubmit={handleSubmit}
          onCancel={() => setState(prev => ({ ...prev, isModalOpen: false }))}
          onError={(error) => setState(prev => ({ ...prev, error }))}
        />
      </Modal>
    </div>
  );
};

export default Metrics;