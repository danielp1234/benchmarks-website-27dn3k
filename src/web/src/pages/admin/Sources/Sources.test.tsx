import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi } from 'vitest';
import Sources from './Sources';
import { DataSourceForm } from '../../../components/admin/DataSourceForm/DataSourceForm';
import type { DataSource } from '../../../interfaces/sources.interface';
import useToast from '../../../hooks/useToast';

// Mock dependencies
vi.mock('../../../hooks/useToast', () => ({
  default: vi.fn(() => ({
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn()
  }))
}));

// Test data
const mockDataSources: DataSource[] = [
  {
    id: '1',
    name: 'Test Source 1',
    description: 'Description 1',
    active: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  },
  {
    id: '2',
    name: 'Test Source 2',
    description: 'Description 2',
    active: false,
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02')
  }
];

// Mock store setup
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      sources: (state = {
        items: [],
        isLoading: false,
        error: null,
        ...initialState
      }) => state
    }
  });
};

// Helper function to render with providers
const renderWithProviders = (
  ui: React.ReactElement,
  { preloadedState = {}, ...renderOptions } = {}
) => {
  const store = createMockStore(preloadedState);
  return {
    store,
    ...render(
      <Provider store={store}>
        {ui}
      </Provider>,
      renderOptions
    )
  };
};

describe('Sources Admin Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('displays loading spinner initially', () => {
      renderWithProviders(<Sources />, {
        preloadedState: { sources: { isLoading: true } }
      });

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('renders data sources table with correct columns', async () => {
      renderWithProviders(<Sources />, {
        preloadedState: { sources: { items: mockDataSources } }
      });

      const table = screen.getByRole('grid', { name: /data sources table/i });
      expect(table).toBeInTheDocument();

      // Verify column headers
      const headers = screen.getAllByRole('columnheader');
      expect(headers).toHaveLength(4);
      expect(headers[0]).toHaveTextContent(/name/i);
      expect(headers[1]).toHaveTextContent(/description/i);
      expect(headers[2]).toHaveTextContent(/status/i);
      expect(headers[3]).toHaveTextContent(/actions/i);
    });

    it('displays data source information correctly', async () => {
      renderWithProviders(<Sources />, {
        preloadedState: { sources: { items: mockDataSources } }
      });

      // Verify first row data
      const firstRow = screen.getByRole('row', { name: new RegExp(mockDataSources[0].name, 'i') });
      expect(within(firstRow).getByText(mockDataSources[0].description)).toBeInTheDocument();
      expect(within(firstRow).getByText(/active/i)).toBeInTheDocument();
    });
  });

  describe('CRUD Operations', () => {
    it('handles create source workflow', async () => {
      const { store } = renderWithProviders(<Sources />);
      const user = userEvent.setup();

      // Click create button
      await user.click(screen.getByRole('button', { name: /create new source/i }));

      // Verify form modal
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();

      // Fill form
      await user.type(screen.getByLabelText(/name/i), 'New Source');
      await user.type(screen.getByLabelText(/description/i), 'New Description');
      await user.click(screen.getByLabelText(/active status/i));

      // Submit form
      await user.click(screen.getByRole('button', { name: /create/i }));

      // Verify dispatch and toast
      expect(store.getState().sources.items).toHaveLength(mockDataSources.length + 1);
      expect(useToast().showSuccessToast).toHaveBeenCalledWith(
        expect.stringContaining('created')
      );
    });

    it('handles update source workflow', async () => {
      const { store } = renderWithProviders(<Sources />, {
        preloadedState: { sources: { items: mockDataSources } }
      });
      const user = userEvent.setup();

      // Click edit button
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      // Verify form populated
      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toHaveValue(mockDataSources[0].name);

      // Update form
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      // Submit changes
      await user.click(screen.getByRole('button', { name: /update/i }));

      // Verify update
      expect(store.getState().sources.items[0].name).toBe('Updated Name');
      expect(useToast().showSuccessToast).toHaveBeenCalledWith(
        expect.stringContaining('updated')
      );
    });

    it('handles delete source workflow', async () => {
      const { store } = renderWithProviders(<Sources />, {
        preloadedState: { sources: { items: mockDataSources } }
      });
      const user = userEvent.setup();

      // Mock confirm dialog
      vi.spyOn(window, 'confirm').mockImplementation(() => true);

      // Click delete button
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Verify deletion
      expect(store.getState().sources.items).toHaveLength(mockDataSources.length - 1);
      expect(useToast().showSuccessToast).toHaveBeenCalledWith(
        expect.stringContaining('deleted')
      );
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API fails', async () => {
      const errorMessage = 'Failed to fetch data sources';
      renderWithProviders(<Sources />, {
        preloadedState: { sources: { error: errorMessage } }
      });

      expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
    });

    it('handles form validation errors', async () => {
      renderWithProviders(<Sources />);
      const user = userEvent.setup();

      // Open create form
      await user.click(screen.getByRole('button', { name: /create new source/i }));

      // Submit empty form
      await user.click(screen.getByRole('button', { name: /create/i }));

      // Verify validation errors
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/description is required/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('maintains focus management', async () => {
      renderWithProviders(<Sources />);
      const user = userEvent.setup();

      // Open modal
      const createButton = screen.getByRole('button', { name: /create new source/i });
      await user.click(createButton);

      // Verify focus trapped in modal
      expect(screen.getByRole('dialog')).toHaveFocus();

      // Close modal
      await user.keyboard('{Escape}');

      // Verify focus returns
      expect(createButton).toHaveFocus();
    });

    it('provides proper ARIA attributes', () => {
      renderWithProviders(<Sources />, {
        preloadedState: { sources: { items: mockDataSources } }
      });

      // Verify table accessibility
      expect(screen.getByRole('grid')).toHaveAttribute('aria-rowcount');
      expect(screen.getByRole('grid')).toHaveAttribute('aria-colcount');

      // Verify sort buttons
      const sortButtons = screen.getAllByRole('columnheader', { name: /sort by/i });
      sortButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-sort');
      });
    });
  });
});