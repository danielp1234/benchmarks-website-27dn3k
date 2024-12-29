import styled from 'styled-components';

// Interface for component style props with accessibility support
interface StyleProps {
  isLoading?: boolean;
  isActive?: boolean;
  isDisabled?: boolean;
  hasError?: boolean;
}

// Main container with responsive layout and padding adjustments
export const SourcesContainer = styled.div`
  padding: var(--spacing-md);
  max-width: var(--container-max-width);
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--neutral-50);

  @media (min-width: var(--breakpoint-mobile)) {
    padding: var(--container-padding-mobile);
  }

  @media (min-width: var(--breakpoint-tablet)) {
    padding: var(--container-padding-tablet);
  }

  @media (min-width: var(--breakpoint-desktop)) {
    padding: var(--container-padding-desktop);
  }
`;

// Flexible header layout with responsive spacing and alignment
export const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  flex-wrap: wrap;
  gap: var(--spacing-md);

  @media (max-width: var(--breakpoint-tablet)) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

// Main content area with responsive table container and overflow handling
export const ContentContainer = styled.div`
  background-color: var(--neutral-50);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  overflow-x: auto;
  box-shadow: var(--shadow-md);
  flex: 1 1 auto;
  
  /* Ensure accessible contrast for content */
  color: var(--neutral-900);

  /* Add smooth transition for interactive states */
  transition: box-shadow var(--transition-normal);

  &:hover {
    box-shadow: var(--shadow-lg);
  }

  /* Improve table responsiveness */
  table {
    min-width: 100%;
    border-collapse: separate;
    border-spacing: 0;
  }

  @media (max-width: var(--breakpoint-mobile)) {
    padding: var(--spacing-sm);
    margin: 0 calc(-1 * var(--spacing-sm));
    border-radius: 0;
  }
`;

// Accessible and responsive action buttons with enhanced touch targets
export const ActionButton = styled.button<StyleProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-md);
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-normal);
  transition: all var(--transition-normal);
  min-height: 44px; // Ensure minimum touch target size
  
  /* Default state */
  background-color: var(--primary-color);
  color: white;
  border: none;
  cursor: pointer;

  /* Hover state with smooth transition */
  &:hover:not(:disabled) {
    background-color: var(--primary-dark);
    transform: translateY(-1px);
  }

  /* Focus state for accessibility */
  &:focus-visible {
    outline: var(--border-width-medium) solid var(--primary-light);
    outline-offset: 2px;
  }

  /* Active state */
  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  /* Disabled state */
  &:disabled {
    background-color: var(--neutral-300);
    cursor: not-allowed;
    opacity: 0.7;
  }

  /* Loading state */
  ${props => props.isLoading && `
    position: relative;
    color: transparent;
    pointer-events: none;
    
    &::after {
      content: '';
      position: absolute;
      width: 1em;
      height: 1em;
      border: 2px solid white;
      border-radius: 50%;
      border-right-color: transparent;
      animation: rotate 0.8s linear infinite;
    }
  `}

  /* Error state */
  ${props => props.hasError && `
    background-color: var(--error-color);
    
    &:hover:not(:disabled) {
      background-color: var(--error-dark);
    }
  `}

  /* Active state */
  ${props => props.isActive && `
    background-color: var(--success-color);
    
    &:hover:not(:disabled) {
      background-color: var(--success-dark);
    }
  `}

  /* Responsive adjustments */
  @media (max-width: var(--breakpoint-mobile)) {
    width: 100%;
    margin-bottom: var(--spacing-sm);
  }

  /* Animation keyframes for loading spinner */
  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

// Search input container with consistent styling
export const SearchContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 400px;

  @media (max-width: var(--breakpoint-tablet)) {
    max-width: 100%;
  }
`;

// Table wrapper for responsive handling
export const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin-bottom: var(--spacing-lg);
  
  /* Add fade indicator for horizontal scroll */
  background: linear-gradient(to right, white 30%, rgba(255, 255, 255, 0)),
              linear-gradient(to left, white 30%, rgba(255, 255, 255, 0)) 100% 0;
  background-size: 50px 100%, 50px 100%;
  background-repeat: no-repeat;
  background-attachment: local, local;
`;