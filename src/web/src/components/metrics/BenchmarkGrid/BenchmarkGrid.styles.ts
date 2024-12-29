import styled, { css } from 'styled-components';
import { TableContainer } from '../../common/Table/Table.styles';

// Interface for percentile cell styling props
interface PercentileCellProps {
  value?: number;
  isHeader?: boolean;
  isSortable?: boolean;
  sortDirection?: 'asc' | 'desc' | undefined;
}

// Helper function to determine color based on percentile value
const getPercentileColor = (value: number): string => {
  if (value >= 90) return 'var(--success-dark)';
  if (value >= 75) return 'var(--success-color)';
  if (value >= 50) return 'var(--info-color)';
  if (value >= 25) return 'var(--warning-color)';
  return 'var(--error-color)';
};

// Enhanced table container with benchmark-specific styling
export const GridContainer = styled(TableContainer)`
  margin-bottom: var(--spacing-xl);
  contain: content;
  
  /* Print optimization */
  @media print {
    box-shadow: none;
    break-inside: avoid;
  }
`;

// Grid header with enhanced sorting controls
export const GridHeader = styled.div<{ isSortable?: boolean }>`
  display: flex;
  align-items: center;
  padding: var(--spacing-md);
  background-color: var(--neutral-50);
  border-bottom: var(--border-width-thin) solid var(--neutral-200);
  font-weight: var(--font-weight-semibold);
  color: var(--neutral-700);
  
  ${({ isSortable }) => isSortable && css`
    cursor: pointer;
    user-select: none;
    transition: var(--transition-normal);
    
    &:hover {
      background-color: var(--neutral-100);
    }
    
    &:focus-visible {
      outline: var(--border-width-medium) solid var(--primary-color);
      outline-offset: -2px;
    }
  `}

  @media (max-width: var(--breakpoint-mobile)) {
    padding: var(--spacing-sm);
  }
`;

// Metric name cell with consistent width
export const MetricNameCell = styled.div`
  flex: 0 0 200px;
  padding-right: var(--spacing-md);
  font-weight: var(--font-weight-medium);
  
  @media (max-width: var(--breakpoint-mobile)) {
    flex: 0 0 150px;
    padding-right: var(--spacing-sm);
  }
`;

// Percentile cell with value-based coloring
export const PercentileCell = styled.div<PercentileCellProps>`
  flex: 1;
  min-width: 100px;
  text-align: right;
  padding: var(--spacing-md);
  font-family: var(--font-family);
  font-variant-numeric: tabular-nums;
  letter-spacing: var(--letter-spacing-tight);
  transition: var(--transition-normal);
  
  ${({ value }) => value && css`
    color: ${getPercentileColor(value)};
    font-weight: var(--font-weight-medium);
  `}
  
  ${({ isHeader }) => isHeader && css`
    color: var(--neutral-700);
    font-weight: var(--font-weight-semibold);
  `}
  
  ${({ isSortable, sortDirection }) => isSortable && css`
    cursor: pointer;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      right: var(--spacing-sm);
      top: 50%;
      width: 0.5rem;
      height: 0.5rem;
      border-style: solid;
      border-width: 0.15rem 0.15rem 0 0;
      opacity: ${sortDirection ? 1 : 0.5};
      transition: var(--transition-normal);
      
      ${sortDirection === 'asc' && css`
        transform: translateY(-25%) rotate(-45deg);
      `}
      
      ${sortDirection === 'desc' && css`
        transform: translateY(-75%) rotate(135deg);
      `}
    }
    
    &:hover {
      background-color: var(--neutral-100);
    }
  `}
  
  @media (max-width: var(--breakpoint-mobile)) {
    min-width: 80px;
    padding: var(--spacing-sm);
    font-size: var(--font-size-sm);
  }
  
  @media print {
    color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
`;

// Row container for benchmark data
export const GridRow = styled.div`
  display: flex;
  align-items: center;
  border-bottom: var(--border-width-thin) solid var(--neutral-200);
  transition: var(--transition-normal);
  
  &:hover {
    background-color: var(--neutral-50);
  }
  
  &:last-child {
    border-bottom: none;
  }
  
  @media print {
    break-inside: avoid;
  }
`;

// Loading state overlay
export const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-index-modal);
`;