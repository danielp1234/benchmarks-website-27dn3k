// styled-components v6.0.0
import styled from 'styled-components';

// Helper function for responsive spacing calculations
const getResponsiveSpacing = (baseSpacing: number): string => {
  return `clamp(${baseSpacing * 0.75}px, ${baseSpacing / 16}vw, ${baseSpacing}px)`;
};

export const FormContainer = styled.form`
  /* Layout */
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  padding: ${getResponsiveSpacing(24)};

  /* Visual styling */
  background-color: var(--surface-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--elevation-1);

  /* Transitions */
  transition: all 0.2s ease-in-out;

  /* Accessibility - Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  /* Dark mode adjustments */
  @media (prefers-color-scheme: dark) {
    background-color: var(--surface-color-dark);
    box-shadow: var(--elevation-1-dark);
  }

  /* Print styles */
  @media print {
    box-shadow: none;
    border: 1px solid var(--border-color);
    padding: var(--spacing-md);
  }

  /* Mobile responsiveness */
  @media (max-width: 768px) {
    padding: var(--spacing-md);
    margin: var(--spacing-sm);
  }
`;

export const FormGroup = styled.div`
  /* Layout */
  position: relative;
  margin-bottom: var(--spacing-md);

  /* RTL support */
  [dir='rtl'] & {
    text-align: right;
  }

  /* Error state styling */
  &[data-error='true'] {
    input, select, textarea {
      border-color: var(--error-color);
      &:focus {
        box-shadow: 0 0 0 2px var(--error-color-alpha);
      }
    }
  }

  /* Mobile responsiveness */
  @media (max-width: 768px) {
    margin-bottom: var(--spacing-sm);
  }

  /* High contrast mode */
  @media (forced-colors: active) {
    &[data-error='true'] {
      input, select, textarea {
        border-color: Mark;
      }
    }
  }
`;

export const FormActions = styled.div`
  /* Layout */
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);

  /* RTL support */
  [dir='rtl'] & {
    flex-direction: row-reverse;
  }

  /* Mobile responsiveness */
  @media (max-width: 768px) {
    flex-direction: column;
    gap: var(--spacing-sm);
    
    button {
      width: 100%;
    }
  }

  /* Print styles */
  @media print {
    display: none;
  }
`;

export const ErrorText = styled.span`
  /* Typography */
  color: var(--error-color);
  font-size: var(--font-size-sm);
  font-weight: 500;
  line-height: 1.2;

  /* Layout */
  display: block;
  margin-top: var(--spacing-xs);

  /* RTL support */
  [dir='rtl'] & {
    text-align: right;
  }

  /* Dark mode adjustments */
  @media (prefers-color-scheme: dark) {
    color: var(--error-color-dark);
  }

  /* High contrast mode */
  @media (forced-colors: active) {
    color: Mark;
  }

  /* Accessibility - Screen readers */
  &[aria-hidden='true'] {
    display: none;
  }
`;