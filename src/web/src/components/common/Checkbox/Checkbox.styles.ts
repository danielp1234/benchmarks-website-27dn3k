import styled, { css } from 'styled-components';

// Interface definitions for component props
interface StyledCheckboxProps {
  size: 'small' | 'medium' | 'large';
  disabled?: boolean;
  checked?: boolean;
  hasError?: boolean;
  ariaLabel?: string;
}

interface CheckboxLabelProps {
  disabled?: boolean;
  size: 'small' | 'medium' | 'large';
  hasError?: boolean;
  required?: boolean;
}

// Size constants following Material Design touch target guidelines
const CHECKBOX_SIZES = {
  small: {
    size: '16px',
    fontSize: 'var(--font-size-sm)',
    touchTarget: '44px', // Minimum touch target size for accessibility
  },
  medium: {
    size: '20px',
    fontSize: 'var(--font-size-md)',
    touchTarget: '48px',
  },
  large: {
    size: '24px',
    fontSize: 'var(--font-size-lg)',
    touchTarget: '52px',
  },
} as const;

// Helper function to generate size-specific styles
const getSizeStyles = (size: 'small' | 'medium' | 'large') => {
  const sizeConfig = CHECKBOX_SIZES[size];
  
  return css`
    width: ${sizeConfig.size};
    height: ${sizeConfig.size};
    
    /* Ensure adequate touch target size for accessibility */
    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: ${sizeConfig.touchTarget};
      height: ${sizeConfig.touchTarget};
    }
  `;
};

// Container component for checkbox and label
export const CheckboxContainer = styled.div`
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  cursor: pointer;
  position: relative;
  
  &:hover input:not(:disabled) {
    border-color: var(--primary-dark);
  }
`;

// Styled checkbox input following Material Design specs
export const StyledCheckbox = styled.input<StyledCheckboxProps>`
  appearance: none;
  margin: 0;
  border: var(--border-width-medium) solid var(--neutral-400);
  border-radius: var(--border-radius-sm);
  transition: all var(--transition-normal) var(--easing-standard);
  cursor: pointer;
  position: relative;
  background-color: var(--neutral-50);
  
  ${({ size }) => getSizeStyles(size)}
  
  /* Checked state */
  &:checked {
    background-color: var(--primary-color);
    border-color: var(--primary-color);
    
    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(45deg);
      width: 30%;
      height: 60%;
      border: solid var(--neutral-50);
      border-width: 0 2px 2px 0;
    }
  }
  
  /* Disabled state */
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: var(--neutral-200);
  }
  
  /* Focus state - ensuring visible focus indicator for accessibility */
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--neutral-50),
                0 0 0 4px var(--primary-color);
  }
  
  /* Error state */
  ${({ hasError }) => hasError && css`
    border-color: var(--error-color);
    
    &:checked {
      background-color: var(--error-color);
      border-color: var(--error-color);
    }
  `}
`;

// Styled label with accessibility features
export const CheckboxLabel = styled.label<CheckboxLabelProps>`
  font-family: var(--font-family);
  font-size: ${({ size }) => CHECKBOX_SIZES[size].fontSize};
  color: var(--neutral-800);
  transition: color var(--transition-normal) var(--easing-standard);
  user-select: none;
  cursor: pointer;
  
  /* Disabled state */
  ${({ disabled }) => disabled && css`
    opacity: 0.5;
    cursor: not-allowed;
  `}
  
  /* Error state */
  ${({ hasError }) => hasError && css`
    color: var(--error-color);
  `}
  
  /* Required indicator */
  ${({ required }) => required && css`
    &::after {
      content: '*';
      color: var(--error-color);
      margin-left: var(--spacing-xs);
    }
  `}
`;