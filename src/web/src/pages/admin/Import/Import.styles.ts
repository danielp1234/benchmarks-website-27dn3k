import styled from '@emotion/styled';  // @emotion/styled@11.11.0

// Main container for the import page with responsive layout
export const ImportContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 2rem;

  @media (max-width: 1024px) {
    padding: 1.5rem;
  }

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

// Content area with Material Design elevation and spacing
export const ImportContent = styled.div`
  background-color: var(--color-background-paper);
  border-radius: 8px;
  padding: 2.5rem;
  box-shadow: var(--elevation-2);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  transition: box-shadow 0.3s ease-in-out;

  &:hover {
    box-shadow: var(--elevation-4);
  }

  @media (max-width: 1024px) {
    padding: 2rem;
  }

  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

// Step indicator with responsive adjustments
export const StepIndicator = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1.5rem;
  }
`;

// Validation results section with distinct styling
export const ValidationSection = styled.div`
  background-color: var(--color-background-default);
  border-radius: 4px;
  padding: 1.5rem;
  margin-top: 1.5rem;
  border: 1px solid var(--color-border);
  transition: background-color 0.2s ease;

  &.error {
    background-color: var(--color-error-light);
    border-color: var(--color-error);
  }

  &.success {
    background-color: var(--color-success-light);
    border-color: var(--color-success);
  }

  &.warning {
    background-color: var(--color-warning-light);
    border-color: var(--color-warning);
  }
`;