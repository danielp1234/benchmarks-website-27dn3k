import React, { useState, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DataSourceForm } from '../../../components/admin/DataSourceForm/DataSourceForm';
import Table from '../../../components/common/Table/Table';
import Button from '../../../components/common/Button/Button';
import Modal from '../../../components/common/Modal/Modal';
import { DataSource, DataSourceCreate, DataSourceUpdate } from '../../../interfaces/sources.interface';

// Table column configuration with accessibility support
const TABLE_COLUMNS = [
  {
    key: 'name',
    header: 'Name',
    sortable: true,
    width: '25%',
    ariaLabel: 'Sort by name'
  },
  {
    key: 'description',
    header: 'Description',
    sortable: false,
    width: '45%'
  },
  {
    key: 'active',
    header: 'Status',
    sortable: true,
    width: '15%',
    ariaLabel: 'Sort by status'
  },
  {
    key: 'actions',
    header: 'Actions',
    sortable: false,
    width: '15%'
  }
];

/**
 * Sources page component for managing data sources in the SaaS Benchmarks Platform.
 * Implements comprehensive CRUD operations with accessibility features and optimistic updates.
 *
 * @component
 * @version 1.0.0
 */
const Sources: React.FC = () => {
  // State management
  const dispatch = useDispatch();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Redux selectors
  const sources = useSelector((state: any) => state.sources.items);
  const isLoading = useSelector((state: any) => state.sources.isLoading);
  const error = useSelector((state: any) => state.sources.error);

  // Fetch data sources on component mount
  useEffect(() => {
    dispatch({ type: 'FETCH_SOURCES_REQUEST' });
  }, [dispatch]);

  // Handle sort changes
  const handleSort = useCallback((column: string) => {
    setSortDirection(prev => 
      sortColumn === column && prev === 'asc' ? 'desc' : 'asc'
    );
    setSortColumn(column);
  }, [sortColumn]);

  // Modal management
  const handleOpenModal = useCallback((source?: DataSource) => {
    setSelectedSource(source || null);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedSource(null);
    setIsModalOpen(false);
  }, []);

  // CRUD operations with optimistic updates
  const handleCreate = useCallback(async (data: DataSourceCreate) => {
    try {
      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      dispatch({
        type: 'CREATE_SOURCE_OPTIMISTIC',
        payload: { ...data, id: tempId }
      });

      // API call
      const result = await dispatch({
        type: 'CREATE_SOURCE_REQUEST',
        payload: data
      });

      // Update success
      dispatch({
        type: 'CREATE_SOURCE_SUCCESS',
        payload: { tempId, data: result }
      });

      handleCloseModal();
    } catch (error) {
      // Revert optimistic update
      dispatch({
        type: 'CREATE_SOURCE_FAILURE',
        payload: error
      });
    }
  }, [dispatch, handleCloseModal]);

  const handleUpdate = useCallback(async (data: DataSourceUpdate) => {
    if (!selectedSource) return;

    try {
      // Optimistic update
      dispatch({
        type: 'UPDATE_SOURCE_OPTIMISTIC',
        payload: { id: selectedSource.id, ...data }
      });

      // API call
      await dispatch({
        type: 'UPDATE_SOURCE_REQUEST',
        payload: { id: selectedSource.id, ...data }
      });

      handleCloseModal();
    } catch (error) {
      // Revert optimistic update
      dispatch({
        type: 'UPDATE_SOURCE_FAILURE',
        payload: error
      });
    }
  }, [dispatch, selectedSource, handleCloseModal]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this data source?')) return;

    try {
      // Optimistic update
      dispatch({
        type: 'DELETE_SOURCE_OPTIMISTIC',
        payload: id
      });

      // API call
      await dispatch({
        type: 'DELETE_SOURCE_REQUEST',
        payload: id
      });
    } catch (error) {
      // Revert optimistic update
      dispatch({
        type: 'DELETE_SOURCE_FAILURE',
        payload: error
      });
    }
  }, [dispatch]);

  // Render table data with actions
  const tableData = sources.map((source: DataSource) => ({
    ...source,
    active: source.active ? 'Active' : 'Inactive',
    actions: (
      <div className="actions-container">
        <Button
          variant="outlined"
          size="small"
          onClick={() => handleOpenModal(source)}
          aria-label={`Edit ${source.name}`}
        >
          Edit
        </Button>
        <Button
          variant="text"
          size="small"
          onClick={() => handleDelete(source.id)}
          aria-label={`Delete ${source.name}`}
        >
          Delete
        </Button>
      </div>
    )
  }));

  return (
    <div className="sources-page" role="main" aria-label="Data Sources Management">
      <div className="page-header">
        <h1>Data Sources</h1>
        <Button
          variant="primary"
          onClick={() => handleOpenModal()}
          aria-label="Create new data source"
        >
          Create New Source
        </Button>
      </div>

      {error && (
        <div role="alert" className="error-message">
          {error}
        </div>
      )}

      <Table
        columns={TABLE_COLUMNS}
        data={tableData}
        isLoading={isLoading}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
        ariaLabel="Data Sources Table"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedSource ? 'Edit Data Source' : 'Create Data Source'}
        size="medium"
      >
        <DataSourceForm
          initialData={selectedSource}
          onSubmit={selectedSource ? handleUpdate : handleCreate}
          onCancel={handleCloseModal}
          isSubmitting={isLoading}
        />
      </Modal>
    </div>
  );
};

export default Sources;