import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ThemeProvider } from 'styled-components';
import { axe, toHaveNoViolations } from '@axe-core/react';
import Table from './Table';
import { Column } from './Table';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock theme object based on variables.css
const theme = {
  // Add relevant theme values used by styled-components
  spacing: {
    md: '1rem',
  },
  breakpoints: {
    mobile: '320px',
    tablet: '768px',
    desktop: '1024px',
  },
};

// Helper function to render components with theme
const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

// Mock data generator
const createMockData = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    id: `id-${index}`,
    name: `Item ${index}`,
    value: Math.round(Math.random() * 100),
    status: ['active', 'inactive', 'pending'][index % 3],
    timestamp: new Date(2023, 0, index + 1).toISOString(),
  }));
};

// Mock columns configuration
const mockColumns: Column[] = [
  {
    key: 'name',
    header: 'Name',
    sortable: true,
    ariaLabel: 'Sort by name',
  },
  {
    key: 'value',
    header: 'Value',
    sortable: true,
    align: 'right',
    ariaLabel: 'Sort by value',
  },
  {
    key: 'status',
    header: 'Status',
    sortable: false,
  },
  {
    key: 'timestamp',
    header: 'Date',
    sortable: true,
    ariaLabel: 'Sort by date',
  },
];

describe('Table Component', () => {
  // Mock handlers
  const onSort = jest.fn();
  
  // Test data
  const mockData = createMockData(5);

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders table with correct structure and ARIA roles', () => {
      renderWithTheme(
        <Table
          columns={mockColumns}
          data={mockData}
          ariaLabel="Test table"
        />
      );

      const table = screen.getByRole('grid', { name: 'Test table' });
      expect(table).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader')).toHaveLength(mockColumns.length);
      expect(screen.getAllByRole('row')).toHaveLength(mockData.length + 1); // +1 for header row
    });

    it('displays loading state correctly', () => {
      renderWithTheme(
        <Table
          columns={mockColumns}
          data={mockData}
          isLoading={true}
        />
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByRole('grid')).toHaveAttribute('aria-busy', 'true');
    });

    it('handles empty data state appropriately', () => {
      renderWithTheme(
        <Table
          columns={mockColumns}
          data={[]}
        />
      );

      expect(screen.getByRole('grid')).toHaveAttribute('aria-rowcount', '0');
    });
  });

  describe('Sorting Functionality', () => {
    it('handles column sort on click', async () => {
      renderWithTheme(
        <Table
          columns={mockColumns}
          data={mockData}
          onSort={onSort}
          sortColumn="name"
          sortDirection="asc"
        />
      );

      const nameHeader = screen.getByRole('columnheader', { name: /sort by name/i });
      fireEvent.click(nameHeader);

      expect(onSort).toHaveBeenCalledWith('name');
      expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
    });

    it('supports keyboard navigation for sorting', () => {
      renderWithTheme(
        <Table
          columns={mockColumns}
          data={mockData}
          onSort={onSort}
        />
      );

      const sortableHeader = screen.getByRole('columnheader', { name: /sort by name/i });
      fireEvent.keyDown(sortableHeader, { key: 'Enter' });
      expect(onSort).toHaveBeenCalled();

      fireEvent.keyDown(sortableHeader, { key: ' ' });
      expect(onSort).toHaveBeenCalled();
    });
  });

  describe('Accessibility Compliance', () => {
    it('passes accessibility audit', async () => {
      const { container } = renderWithTheme(
        <Table
          columns={mockColumns}
          data={mockData}
          ariaLabel="Accessible table"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper ARIA labels and roles', () => {
      renderWithTheme(
        <Table
          columns={mockColumns}
          data={mockData}
          ariaLabel="Test table"
        />
      );

      const table = screen.getByRole('grid');
      expect(table).toHaveAttribute('aria-label', 'Test table');
      expect(table).toHaveAttribute('aria-colcount', mockColumns.length.toString());
      expect(table).toHaveAttribute('aria-rowcount', mockData.length.toString());
    });
  });

  describe('Responsive Behavior', () => {
    it('maintains structure at different viewport sizes', () => {
      const { container } = renderWithTheme(
        <Table
          columns={mockColumns}
          data={mockData}
        />
      );

      // Test mobile viewport
      window.innerWidth = 320;
      fireEvent(window, new Event('resize'));
      expect(container.firstChild).toHaveStyle({ 'overflow-x': 'auto' });

      // Test desktop viewport
      window.innerWidth = 1024;
      fireEvent(window, new Event('resize'));
      expect(container.firstChild).toHaveStyle({ width: '100%' });
    });
  });

  describe('Performance', () => {
    it('efficiently handles large datasets', async () => {
      const largeDataset = createMockData(100);
      const startTime = performance.now();

      renderWithTheme(
        <Table
          columns={mockColumns}
          data={largeDataset}
        />
      );

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(100); // Render time should be under 100ms
    });

    it('memoizes rendered content correctly', () => {
      const { rerender } = renderWithTheme(
        <Table
          columns={mockColumns}
          data={mockData}
        />
      );

      const initialContent = screen.getByRole('grid').innerHTML;

      // Rerender with same props
      rerender(
        <ThemeProvider theme={theme}>
          <Table
            columns={mockColumns}
            data={mockData}
          />
        </ThemeProvider>
      );

      expect(screen.getByRole('grid').innerHTML).toBe(initialContent);
    });
  });
});