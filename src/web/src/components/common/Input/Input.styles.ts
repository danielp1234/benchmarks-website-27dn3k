import styled, { css } from 'styled-components';

// Helper function to generate input styles based on props
const getInputStyles = ({ 
  error, 
  disabled, 
  fullWidth, 
  focused 
}: { 
  error?: string; 
  disabled?: boolean; 
  fullWidth?: boolean; 
  focused?: boolean;
}) => css`
  width: ${fullWidth ? '100%' : '320px'};
  height: 48px;
  padding: var(--spacing-sm) var(--spacing-md);
  font-family: var(--font-family);
  font-size: var(--font-size-md);
  color: var(--neutral-900);
  background-color: var(--neutral-50);
  border: var(--border-width-thin) solid ${error ? 'var(--error-color)' : 'var(--neutral-300)'};
  border-radius: var(--border-radius-md);
  transition: all var(--transition-normal);
  outline: none;
  opacity: ${disabled ? '0.6' : '1'};
  cursor: ${disabled ? 'not-allowed' : 'text'};

  &:hover:not(:disabled) {
    border-color: ${error ? 'var(--error-dark)' : 'var(--neutral-400)'};
  }

  &:focus {
    border-color: ${error ? 'var(--error-color)' : 'var(--primary-color)'};
    box-shadow: 0 0 0 2px ${error ? 'rgba(239, 68, 68, 0.2)' : 'rgba(37, 99, 235, 0.2)'};
  }

  &::placeholder {
    color: var(--neutral-400);
  }

  ${focused && !error && css`
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
  `}
`;

export const InputContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  margin-bottom: var(--spacing-md);
  width: ${({ fullWidth }: { fullWidth?: boolean }) => fullWidth ? '100%' : 'auto'};
`;

export const Label = styled.label<{ error?: string; required?: boolean }>`
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: ${({ error }) => error ? 'var(--error-color)' : 'var(--neutral-700)'};
  margin-bottom: var(--spacing-xs);
  transition: color var(--transition-normal);

  ${({ required }) => required && css`
    &::after {
      content: '*';
      color: var(--error-color);
      margin-left: var(--spacing-xs);
    }
  `}
`;

export const StyledInput = styled.input`
  ${(props) => getInputStyles(props)}

  &:focus + ${Label} {
    color: var(--primary-color);
  }

  /* Ensure proper contrast for autofill */
  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus {
    -webkit-text-fill-color: var(--neutral-900);
    -webkit-box-shadow: 0 0 0px 1000px var(--neutral-50) inset;
    transition: background-color 5000s ease-in-out 0s;
  }

  /* High contrast mode support */
  @media (forced-colors: active) {
    border: 2px solid ButtonText;
    &:focus {
      outline: 2px solid Highlight;
    }
  }
`;

export const ErrorText = styled.span`
  font-family: var(--font-family);
  font-size: var(--font-size-xs);
  color: var(--error-color);
  margin-top: var(--spacing-xs);
  min-height: 20px;
  transition: all var(--transition-normal);

  /* Ensure error messages are announced by screen readers */
  &[role="alert"] {
    position: relative;
  }
`;

// Helper type for component props
export type InputStyleProps = {
  error?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  focused?: boolean;
  required?: boolean;
};