import styled, { css } from 'styled-components';

// Interface for table style properties
interface TableStyleProps {
  sortable?: boolean;
  isHeader?: boolean;
  isLoading?: boolean;
  isStriped?: boolean;
  isCompact?: boolean;
  align?: 'left' | 'center' | 'right';
}

// Helper function to generate header styles
const getHeaderStyles = (sortable?: boolean, align: 'left' | 'center' | 'right' = 'left') => css`
  font-weight: var(--font-weight-semibold);
  color: var(--neutral-700);
  text-align: ${align};
  transition: var(--transition-normal);
  user-select: none;

  ${sortable && css`
    cursor: pointer;
    padding-right: var(--spacing-xl);
    position: relative;

    &:hover {
      background-color: var(--neutral-100);
    }

    &::after {
      content: '';
      position: absolute;
      right: var(--spacing-md);
      top: 50%;
      transform: translateY(-50%);
      width: 0.5rem;
      height: 0.5rem;
      border-style: solid;
      border-width: 0.15rem 0.15rem 0 0;
      transition: var(--transition-normal);
      opacity: 0.5;
    }

    &[aria-sort='ascending']::after {
      transform: translateY(-25%) rotate(-45deg);
      opacity: 1;
    }

    &[aria-sort='descending']::after {
      transform: translateY(-75%) rotate(135deg);
      opacity: 1;
    }
  `}

  &:focus-visible {
    outline: var(--border-width-medium) solid var(--primary-color);
    outline-offset: -2px;
  }
`;

// Table container with responsive scroll
export const TableContainer = styled.div`
  width: 100%;
  overflow-x: auto;
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-md);
  background-color: white;
  position: relative;
  -webkit-overflow-scrolling: touch;
  
  /* Ensure proper rendering on mobile */
  @media (max-width: var(--breakpoint-mobile)) {
    margin: 0 calc(-1 * var(--spacing-md));
    width: calc(100% + (2 * var(--spacing-md)));
    border-radius: 0;
  }
`;

// Base table styles
export const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
`;

// Table header with sticky positioning
export const TableHeader = styled.thead`
  background-color: var(--neutral-50);
  position: sticky;
  top: 0;
  z-index: 1;
  border-bottom: var(--border-width-thin) solid var(--neutral-200);
`;

// Table body with conditional loading state
export const TableBody = styled.tbody<TableStyleProps>`
  ${({ isLoading }) => isLoading && css`
    opacity: 0.5;
    pointer-events: none;
  `}
`;

// Table row with hover and striped variants
export const TableRow = styled.tr<TableStyleProps>`
  border-bottom: var(--border-width-thin) solid var(--neutral-200);
  transition: var(--transition-normal);

  ${({ isStriped }) => isStriped && css`
    &:nth-child(even) {
      background-color: var(--neutral-50);
    }
  `}

  &:hover {
    background-color: var(--neutral-50);
  }

  &:last-child {
    border-bottom: none;
  }
`;

// Table cell with configurable alignment and padding
export const TableCell = styled.td<TableStyleProps>`
  padding: ${({ isCompact }) => 
    isCompact ? 'var(--spacing-sm) var(--spacing-md)' : 'var(--spacing-md)'};
  text-align: ${({ align = 'left' }) => align};
  color: var(--neutral-700);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-normal);
  vertical-align: middle;
  
  /* Handle long content */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  ${({ isHeader }) => isHeader && css`
    ${getHeaderStyles(false)}
  `}

  /* Sortable header cells */
  ${({ isHeader, sortable, align }) => isHeader && sortable && css`
    ${getHeaderStyles(true, align)}
  `}

  /* Ensure proper text wrapping on mobile */
  @media (max-width: var(--breakpoint-mobile)) {
    white-space: nowrap;
    min-width: 120px;

    &:first-child {
      padding-left: var(--spacing-md);
    }

    &:last-child {
      padding-right: var(--spacing-md);
    }
  }
`;

// Loading overlay for the table
export const TableLoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
`;