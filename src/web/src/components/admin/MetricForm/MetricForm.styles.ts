import styled from 'styled-components';

// @version styled-components ^5.3.0

export const FormContainer = styled.div`
  /* Layout */
  max-width: 600px;
  width: 100%;
  padding: var(--spacing-lg, 24px);
  margin: 0 auto;

  /* Material Design Surface */
  background-color: var(--surface-color, #ffffff);
  border-radius: 4px;
  box-shadow: 0px 2px 4px -1px rgba(0, 0, 0, 0.2),
              0px 4px 5px 0px rgba(0, 0, 0, 0.14),
              0px 1px 10px 0px rgba(0, 0, 0, 0.12);

  /* Responsive Design */
  @media (max-width: 768px) {
    padding: var(--spacing-md, 16px);
    margin: 16px;
  }

  @media (max-width: 320px) {
    padding: var(--spacing-sm, 12px);
    margin: 12px;
  }

  /* Accessibility - Ensure sufficient color contrast */
  color: var(--text-primary, rgba(0, 0, 0, 0.87));
`;

export const FormGroup = styled.div`
  /* Layout */
  display: flex;
  flex-direction: column;
  margin-bottom: var(--spacing-md, 16px);
  padding-bottom: 8px;

  /* Label Styling */
  label {
    margin-bottom: 8px;
    color: var(--text-secondary, rgba(0, 0, 0, 0.6));
    font-size: var(--font-size-sm, 14px);
    font-weight: var(--font-weight-medium, 500);
  }

  /* Input Focus States */
  &:focus-within {
    label {
      color: var(--primary-color, #1976d2);
    }
  }

  /* Responsive Adjustments */
  @media (max-width: 768px) {
    margin-bottom: var(--spacing-sm, 12px);
  }

  /* Accessibility - Ensure proper focus indication */
  input:focus, 
  select:focus, 
  textarea:focus {
    outline: 2px solid var(--primary-color, #1976d2);
    outline-offset: 2px;
  }
`;

export const ErrorMessage = styled.span.attrs({
  role: 'alert', // Accessibility attribute for screen readers
})`
  /* Typography */
  font-size: var(--font-size-sm, 12px);
  font-weight: var(--font-weight-medium, 500);
  line-height: 1.2;

  /* Layout */
  display: block;
  margin-top: 4px;

  /* Color - Ensuring WCAG 2.1 AA contrast ratio */
  color: var(--error-color, #d32f2f);

  /* Animation */
  opacity: 1;
  transition: opacity 200ms ease-in-out;

  /* Accessibility - Ensure sufficient color contrast */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const ButtonContainer = styled.div`
  /* Layout */
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md, 16px);
  margin-top: var(--spacing-lg, 24px);

  /* Button Touch Targets */
  button {
    min-height: 48px; /* Ensure minimum touch target size */
    min-width: 48px;
  }

  /* Responsive Layout */
  @media (max-width: 768px) {
    flex-direction: column;
    gap: var(--spacing-sm, 12px);

    button {
      width: 100%; /* Full-width buttons on mobile */
    }
  }

  /* Accessibility - Ensure proper spacing between interactive elements */
  > * {
    margin: 0; /* Reset margins to use gap */
  }

  /* High Contrast Mode Support */
  @media (forced-colors: active) {
    border: 1px solid ButtonText;
  }
`;