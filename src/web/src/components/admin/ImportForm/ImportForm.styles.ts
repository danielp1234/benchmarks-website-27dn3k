import styled from 'styled-components';

// Helper function to determine validation status colors
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'valid':
      return 'var(--success-color)';
    case 'error':
      return 'var(--error-color)';
    case 'warning':
      return 'var(--warning-color)';
    default:
      return 'var(--neutral-500)';
  }
};

export const ImportFormContainer = styled.div`
  background-color: var(--neutral-50);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-xl);
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  transition: var(--transition-normal);
  font-family: var(--font-family);

  @media (max-width: var(--breakpoint-tablet)) {
    padding: var(--spacing-lg);
    margin: var(--spacing-md);
  }
`;

export const FormSection = styled.section`
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-lg);
  border-bottom: var(--border-width-thin) solid var(--neutral-200);
  transition: var(--transition-normal);

  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }

  @media (max-width: var(--breakpoint-tablet)) {
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
  }
`;

interface UploadAreaProps {
  isDragging?: boolean;
}

export const UploadArea = styled.div<UploadAreaProps>`
  border: var(--border-width-medium) dashed ${props => 
    props.isDragging ? 'var(--primary-color)' : 'var(--neutral-300)'};
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  text-align: center;
  cursor: pointer;
  transition: var(--transition-normal);
  background-color: ${props => 
    props.isDragging ? 'var(--primary-light)' : 'var(--neutral-50)'};
  opacity: ${props => props.isDragging ? '0.9' : '1'};

  &:hover, &:focus {
    border-color: var(--primary-color);
    background-color: var(--neutral-100);
  }

  &:focus-visible {
    outline: var(--border-width-medium) solid var(--primary-color);
    outline-offset: var(--spacing-xs);
  }

  @media (max-width: var(--breakpoint-tablet)) {
    padding: var(--spacing-lg);
  }
`;

interface ValidationStatusProps {
  status: 'valid' | 'error' | 'warning' | 'pending';
}

export const ValidationStatus = styled.div<ValidationStatusProps>`
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  margin-top: var(--spacing-md);
  border-radius: var(--border-radius-md);
  background-color: ${props => `${getStatusColor(props.status)}15`};
  color: ${props => getStatusColor(props.status)};
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: var(--transition-normal);

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: var(--border-radius-full);
    background-color: currentColor;
  }
`;

export const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-lg);
  border-top: var(--border-width-thin) solid var(--neutral-200);

  @media (max-width: var(--breakpoint-tablet)) {
    flex-direction: column-reverse;
    gap: var(--spacing-sm);
    
    & > * {
      width: 100%;
    }
  }
`;

export const StepIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  font-size: var(--font-size-sm);
  color: var(--neutral-600);

  @media (max-width: var(--breakpoint-tablet)) {
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
  }
`;

export const StepNumber = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--border-radius-full);
  background-color: var(--primary-color);
  color: white;
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
`;