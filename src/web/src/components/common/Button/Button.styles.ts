// styled-components v5.3.0
import styled, { css, DefaultTheme } from 'styled-components';

// Interfaces
interface ButtonContainerProps {
  variant?: 'primary' | 'secondary' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  role?: string;
}

interface ButtonContentProps {
  hasIcon: boolean;
  dir?: 'ltr' | 'rtl';
}

interface ButtonIconProps {
  position: 'left' | 'right';
  dir?: 'ltr' | 'rtl';
}

// Base styles with accessibility considerations
const ButtonBaseStyles = css`
  font-family: var(--font-family);
  border-radius: var(--border-radius-md);
  transition: var(--transition-normal);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  outline: none;
  border: none;
  min-height: 44px; // WCAG 2.1 minimum touch target size
  position: relative;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  font-weight: 500;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  white-space: nowrap;
  
  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
    pointer-events: none;
  }

  &:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

// Generate WCAG-compliant variant styles
const getVariantStyles = (props: ButtonContainerProps & { theme: DefaultTheme }) => {
  const { variant = 'primary', theme } = props;

  const variants = {
    primary: css`
      background-color: var(--color-primary);
      color: var(--color-white);
      
      &:hover:not(:disabled) {
        background-color: var(--color-primary-dark);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      
      &:active:not(:disabled) {
        background-color: var(--color-primary-darker);
        box-shadow: none;
      }
    `,
    secondary: css`
      background-color: var(--color-secondary);
      color: var(--color-white);
      
      &:hover:not(:disabled) {
        background-color: var(--color-secondary-dark);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      
      &:active:not(:disabled) {
        background-color: var(--color-secondary-darker);
        box-shadow: none;
      }
    `,
    outlined: css`
      background-color: transparent;
      color: var(--color-primary);
      border: 2px solid var(--color-primary);
      
      &:hover:not(:disabled) {
        background-color: var(--color-primary-light);
      }
      
      &:active:not(:disabled) {
        background-color: var(--color-primary-lighter);
      }
    `,
    text: css`
      background-color: transparent;
      color: var(--color-primary);
      padding-left: 8px;
      padding-right: 8px;
      
      &:hover:not(:disabled) {
        background-color: var(--color-primary-light);
      }
      
      &:active:not(:disabled) {
        background-color: var(--color-primary-lighter);
      }
    `
  };

  return variants[variant];
};

// Generate size-specific styles with accessible touch targets
const getSizeStyles = (props: ButtonContainerProps) => {
  const { size = 'medium' } = props;

  const sizes = {
    small: css`
      height: 44px; // Maintaining minimum touch target
      padding: 0 16px;
      font-size: 0.875rem;
    `,
    medium: css`
      height: 48px;
      padding: 0 24px;
      font-size: 1rem;
    `,
    large: css`
      height: 56px;
      padding: 0 32px;
      font-size: 1.125rem;
    `
  };

  return sizes[size];
};

// Styled Components
export const ButtonContainer = styled.button<ButtonContainerProps>`
  ${ButtonBaseStyles}
  ${props => getVariantStyles(props)}
  ${props => getSizeStyles(props)}
  
  width: ${props => props.fullWidth ? '100%' : 'auto'};
  
  // RTL Support
  direction: ${props => props.dir};
  
  // Ensure high contrast for accessibility
  @media (forced-colors: active) {
    border: 2px solid currentColor;
  }
`;

export const ButtonContent = styled.span<ButtonContentProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.hasIcon ? '8px' : '0'};
  direction: ${props => props.dir};
`;

export const ButtonIcon = styled.span<ButtonIconProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  // RTL-aware positioning
  ${props => props.position === 'left' && props.dir === 'rtl' && css`
    order: 2;
  `}
  
  ${props => props.position === 'right' && props.dir === 'rtl' && css`
    order: -1;
  `}
  
  // Icon sizing based on button size
  svg {
    width: 1.25em;
    height: 1.25em;
  }
`;