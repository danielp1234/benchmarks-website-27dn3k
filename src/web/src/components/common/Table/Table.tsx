import React, { useCallback, useMemo } from 'react';
import {
  TableContainer,
  Table as StyledTable,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableLoadingOverlay
} from './Table.styles';
import Loading from '../Loading/Loading';

/**
 * Interface for table column configuration with enhanced accessibility properties
 */
interface Column {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  ariaLabel?: string;
  align?: 'left' | 'center' | 'right';
}

/**
 * Props interface for Table component with enhanced accessibility and responsive features
 */
interface TableProps {
  columns: Column[];
  data: Record<string, any>[];
  isLoading?: boolean;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  className?: string;
  ariaLabel?: string;
  isStriped?: boolean;
  isCompact?: boolean;
}

/**
 * A reusable Material Design table component that supports sorting, loading states,
 * and responsive design with comprehensive accessibility features.
 * Implements WCAG 2.1 Level AA compliance with enhanced keyboard navigation.
 *
 * @component
 * @version 1.0.0
 */
const Table: React.FC<TableProps> = React.memo(({
  columns,
  data,
  isLoading = false,
  sortColumn,
  sortDirection,
  onSort,
  className,
  ariaLabel = 'Data table',
  isStriped = false,
  isCompact = false
}) => {
  /**
   * Handles column header click and keyboard events for sorting
   */
  const handleSort = useCallback((column: Column, event: React.MouseEvent | React.KeyboardEvent) => {
    if (!column.sortable || !onSort) return;

    // Handle keyboard events for accessibility
    if ((event as React.KeyboardEvent).key) {
      const key = (event as React.KeyboardEvent).key;
      if (key !== 'Enter' && key !== ' ') return;
      event.preventDefault();
    }

    onSort(column.key);

    // Announce sort change to screen readers
    const direction = sortColumn === column.key && sortDirection === 'asc' ? 'descending' : 'ascending';
    const announcement = `Table sorted by ${column.header} in ${direction} order`;
    const ariaLive = document.createElement('div');
    ariaLive.setAttribute('aria-live', 'polite');
    ariaLive.innerText = announcement;
    document.body.appendChild(ariaLive);
    setTimeout(() => document.body.removeChild(ariaLive), 1000);
  }, [onSort, sortColumn, sortDirection]);

  /**
   * Memoized table header rendering with accessibility attributes
   */
  const renderHeader = useMemo(() => (
    <TableHeader>
      <TableRow>
        {columns.map((column) => (
          <TableCell
            key={column.key}
            as="th"
            isHeader
            sortable={column.sortable}
            align={column.align}
            style={{ width: column.width }}
            onClick={column.sortable ? (e) => handleSort(column, e) : undefined}
            onKeyDown={column.sortable ? (e) => handleSort(column, e) : undefined}
            tabIndex={column.sortable ? 0 : -1}
            role={column.sortable ? 'columnheader button' : 'columnheader'}
            aria-sort={
              sortColumn === column.key
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : undefined
            }
            aria-label={column.ariaLabel || column.header}
          >
            {column.header}
          </TableCell>
        ))}
      </TableRow>
    </TableHeader>
  ), [columns, handleSort, sortColumn, sortDirection]);

  /**
   * Memoized table body rendering with row states
   */
  const renderBody = useMemo(() => (
    <TableBody isLoading={isLoading}>
      {data.map((row, rowIndex) => (
        <TableRow
          key={rowIndex}
          isStriped={isStriped}
          role="row"
          aria-rowindex={rowIndex + 1}
        >
          {columns.map((column) => (
            <TableCell
              key={`${rowIndex}-${column.key}`}
              align={column.align}
              role="cell"
              aria-colindex={columns.indexOf(column) + 1}
              isCompact={isCompact}
            >
              {row[column.key]}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  ), [data, columns, isLoading, isStriped, isCompact]);

  return (
    <TableContainer className={className}>
      <StyledTable
        role="grid"
        aria-label={ariaLabel}
        aria-busy={isLoading}
        aria-rowcount={data.length}
        aria-colcount={columns.length}
      >
        {renderHeader}
        {renderBody}
      </StyledTable>
      
      {isLoading && (
        <TableLoadingOverlay>
          <Loading size="lg" aria-label="Loading table data" />
        </TableLoadingOverlay>
      )}
    </TableContainer>
  );
});

// Display name for debugging
Table.displayName = 'Table';

export default Table;

// Type exports for consuming components
export type { Column, TableProps };