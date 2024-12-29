import styled, { css, keyframes } from 'styled-components';

// Animation for dropdown menu appearance
const dropdownAnimation = keyframes`
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Helper function to calculate dropdown width
const getDropdownWidth = (width?: string, fullWidth?: boolean): string => {
  if (fullWidth) return '100%';
  return width || '200px';
};

// Helper function for elevation shadows following Material Design
const getElevation = (elevation: number = 2): string => {
  const shadows = {
    1: 'var(--shadow-sm)',
    2: 'var(--shadow-md)',
    3: 'var(--shadow-lg)',
    4: 'var(--shadow-xl)',
    5: 'var(--shadow-2xl)'
  };
  return shadows[elevation] || shadows[2];
};

interface DropdownContainerProps {
  width?: string;
  disabled?: boolean;
  error?: boolean;
  isOpen?: boolean;
  fullWidth?: boolean;
  direction?: 'ltr' | 'rtl';
}

export const DropdownContainer = styled.div<DropdownContainerProps>`
  position: relative;
  width: ${({ width, fullWidth }) => getDropdownWidth(width, fullWidth)};
  direction: ${({ direction }) => direction || 'ltr'};
  opacity: ${({ disabled }) => (disabled ? '0.5' : '1')};
  pointer-events: ${({ disabled }) => (disabled ? 'none' : 'auto')};
`;

interface DropdownTriggerProps {
  isOpen?: boolean;
  error?: boolean;
  disabled?: boolean;
}

export const DropdownTrigger = styled.button<DropdownTriggerProps>`
  width: 100%;
  min-height: 40px;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--neutral-50);
  border: var(--border-width-thin) solid
    ${({ error }) => (error ? 'var(--error-color)' : 'var(--neutral-300)')};
  border-radius: var(--border-radius-md);
  font-family: var(--font-family);
  font-size: var(--font-size-md);
  color: var(--neutral-900);
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  transition: all var(--transition-normal);

  &:hover:not(:disabled) {
    background: var(--neutral-100);
    border-color: var(--neutral-400);
  }

  &:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--primary-light);
  }

  /* ARIA support */
  &[aria-expanded="true"] {
    border-color: var(--primary-color);
  }

  /* High contrast mode support */
  @media (forced-colors: active) {
    border: 2px solid ButtonText;
  }
`;

interface DropdownMenuProps {
  isOpen: boolean;
  maxHeight?: string;
  position?: 'top' | 'bottom';
  width?: string;
  elevation?: number;
}

export const DropdownMenu = styled.ul<DropdownMenuProps>`
  position: absolute;
  ${({ position }) => position === 'top' ? 'bottom: 100%;' : 'top: 100%;'}
  left: 0;
  z-index: var(--z-index-dropdown);
  width: 100%;
  max-height: ${({ maxHeight }) => maxHeight || '300px'};
  margin: 4px 0;
  padding: var(--spacing-xs) 0;
  background: var(--neutral-50);
  border-radius: var(--border-radius-md);
  box-shadow: ${({ elevation }) => getElevation(elevation)};
  overflow-y: auto;
  opacity: ${({ isOpen }) => (isOpen ? 1 : 0)};
  visibility: ${({ isOpen }) => (isOpen ? 'visible' : 'hidden')};
  transform-origin: top;
  animation: ${({ isOpen }) => isOpen ? css`${dropdownAnimation} var(--transition-normal)` : 'none'};

  /* Scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: var(--neutral-400) var(--neutral-200);

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: var(--neutral-200);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: var(--neutral-400);
    border-radius: 3px;
  }

  /* Mobile optimization */
  @media (max-width: var(--breakpoint-mobile)) {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    width: 100%;
    max-height: 50vh;
    margin: 0;
    border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
    animation: ${({ isOpen }) => 
      isOpen ? css`${dropdownAnimation} var(--transition-normal)` : 'none'};
  }
`;

interface DropdownItemProps {
  isHighlighted?: boolean;
  isSelected?: boolean;
  disabled?: boolean;
  focused?: boolean;
}

export const DropdownItem = styled.li<DropdownItemProps>`
  padding: var(--spacing-sm) var(--spacing-md);
  display: flex;
  align-items: center;
  font-family: var(--font-family);
  font-size: var(--font-size-md);
  color: ${({ disabled }) => disabled ? 'var(--neutral-400)' : 'var(--neutral-900)'};
  background: ${({ isHighlighted, isSelected }) => 
    isSelected ? 'var(--primary-light)' :
    isHighlighted ? 'var(--neutral-100)' : 'transparent'};
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  transition: background-color var(--transition-normal);
  user-select: none;

  &:hover:not(:disabled) {
    background: var(--neutral-100);
  }

  &:focus {
    outline: none;
    background: var(--neutral-100);
  }

  /* Selected state */
  ${({ isSelected }) => isSelected && css`
    font-weight: var(--font-weight-medium);
    color: var(--primary-dark);
  `}

  /* Focus visible state for keyboard navigation */
  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }

  /* Disabled state */
  ${({ disabled }) => disabled && css`
    opacity: 0.5;
    cursor: not-allowed;
  `}

  /* RTL support */
  [dir="rtl"] & {
    text-align: right;
  }
`;