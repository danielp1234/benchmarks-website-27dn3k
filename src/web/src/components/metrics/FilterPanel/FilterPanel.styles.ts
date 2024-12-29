import styled from 'styled-components';

// Interface definitions for component props
interface FilterPanelContainerProps {
  isOpen: boolean;
  isMobile: boolean;
}

interface FilterSectionProps {
  isCollapsed: boolean;
}

interface FilterContentProps {
  isCollapsed: boolean;
}

// Main container for the filter panel
export const FilterPanelContainer = styled.div<FilterPanelContainerProps>`
  position: fixed;
  top: var(--header-height);
  left: 0;
  width: var(--sidebar-width);
  height: calc(100vh - var(--header-height));
  background-color: var(--neutral-50);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-md);
  overflow-y: auto;
  transition: transform var(--transition-normal) var(--easing-standard);
  z-index: var(--z-index-dropdown);
  transform: ${props => props.isMobile && !props.isOpen ? 'translateX(-100%)' : 'translateX(0)'};

  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: var(--neutral-100);
  }

  &::-webkit-scrollbar-thumb {
    background: var(--neutral-300);
    border-radius: var(--border-radius-full);
  }

  /* Responsive styles */
  @media (max-width: var(--breakpoint-tablet)) {
    width: 100%;
    max-width: 320px;
    border-right: var(--border-width-thin) solid var(--neutral-200);
  }
`;

// Container for individual filter sections
export const FilterSection = styled.div<FilterSectionProps>`
  margin-bottom: var(--spacing-md);
  border-bottom: var(--border-width-thin) solid var(--neutral-200);
  
  &:last-child {
    margin-bottom: 0;
    border-bottom: none;
  }
`;

// Header for filter sections
export const FilterHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) 0;
  cursor: pointer;
  font-weight: var(--font-weight-medium);
  color: var(--neutral-800);
  user-select: none;

  &:hover {
    color: var(--primary-color);
  }

  /* Icon rotation animation */
  .icon {
    transition: transform var(--transition-normal) var(--easing-standard);
    color: var(--neutral-500);
  }

  &:hover .icon {
    color: var(--primary-color);
  }
`;

// Content container for filter options
export const FilterContent = styled.div<FilterContentProps>`
  max-height: ${props => props.isCollapsed ? '0' : '500px'};
  opacity: ${props => props.isCollapsed ? '0' : '1'};
  overflow: hidden;
  transition: max-height var(--transition-normal) var(--easing-standard),
              opacity var(--transition-normal) var(--easing-standard);
  padding-bottom: ${props => props.isCollapsed ? '0' : 'var(--spacing-md)'};
`;

// Filter count badge
export const FilterCount = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 var(--spacing-xs);
  background-color: var(--primary-color);
  color: white;
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
`;

// Clear filters button
export const ClearFiltersButton = styled.button`
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  color: var(--neutral-600);
  font-size: var(--font-size-sm);
  background: none;
  border: none;
  cursor: pointer;
  transition: color var(--transition-fast);

  &:hover {
    color: var(--error-color);
  }

  &:disabled {
    color: var(--neutral-400);
    cursor: not-allowed;
  }
`;

// Filter option container
export const FilterOption = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) 0;
  color: var(--neutral-700);
  font-size: var(--font-size-sm);

  &:hover {
    color: var(--primary-color);
  }
`;