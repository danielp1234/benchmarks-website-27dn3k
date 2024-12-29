import styled, { keyframes } from 'styled-components';

// Animation keyframes for toast entry
const slideInAnimation = keyframes`
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

// Animation keyframes for toast exit
const slideOutAnimation = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(-100%);
    opacity: 0;
  }
`;

// Container for positioning toasts in the viewport
export const ToastContainer = styled.div`
  position: fixed;
  top: var(--spacing-lg);
  right: var(--spacing-lg);
  z-index: var(--z-index-toast);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  pointer-events: none; // Allow clicking through container
  max-width: 100%;
  
  /* Responsive adjustments for mobile */
  @media (max-width: 768px) {
    right: var(--spacing-md);
    left: var(--spacing-md);
  }
`;

// Type-based styling for different toast variants
interface ToastWrapperProps {
  type: 'success' | 'error' | 'warning' | 'info';
  isExiting?: boolean;
}

// Individual toast message wrapper
export const ToastWrapper = styled.div<ToastWrapperProps>`
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  line-height: 1.5;
  box-shadow: var(--shadow-md);
  min-width: 300px;
  max-width: 100%;
  pointer-events: auto; // Re-enable pointer events
  will-change: transform;
  
  /* Display and alignment */
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  
  /* Accessibility attributes */
  role: alert;
  aria-live: polite;
  
  /* Type-based background colors with proper contrast */
  ${({ type }) => {
    const colors = {
      success: 'var(--success-color)',
      error: 'var(--error-color)',
      warning: 'var(--warning-color)',
      info: 'var(--info-color)'
    };
    
    return `
      background-color: ${colors[type]};
      color: var(--text-on-${type});
    `;
  }}
  
  /* Animation handling */
  animation: ${({ isExiting }) => 
    isExiting 
      ? `${slideOutAnimation} var(--transition-normal) ease-in-out forwards`
      : `${slideInAnimation} var(--transition-normal) ease-in-out`
  };
  
  /* Respect user's motion preferences */
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
  
  /* Icon styling */
  svg {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    color: inherit;
  }
  
  /* Close button styling */
  button {
    background: transparent;
    border: none;
    padding: var(--spacing-xs);
    margin-left: auto;
    cursor: pointer;
    color: inherit;
    opacity: 0.8;
    transition: opacity var(--transition-fast) ease-in-out;
    
    &:hover {
      opacity: 1;
    }
    
    &:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 2px;
      border-radius: var(--border-radius-sm);
    }
  }
  
  /* Responsive adjustments */
  @media (max-width: 768px) {
    min-width: 100%;
    margin: 0;
  }
`;

// Export type definitions for use in other components
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export const ToastTypeColors = {
  success: 'var(--success-color)',
  error: 'var(--error-color)',
  warning: 'var(--warning-color)',
  info: 'var(--info-color)'
} as const;

export const ToastTypeIcons = {
  success: 'CheckCircleIcon',
  error: 'ErrorCircleIcon',
  warning: 'WarningIcon',
  info: 'InfoCircleIcon'
} as const;