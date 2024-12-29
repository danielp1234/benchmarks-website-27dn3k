import React, { useId, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  InputContainer,
  StyledInput,
  Label,
  ErrorText,
} from './Input.styles';

/**
 * Interface for Input component props following Material Design principles
 * and WCAG 2.1 Level AA compliance requirements
 */
interface InputProps {
  /** Unique identifier for form registration */
  name: string;
  /** Accessible label text */
  label: string;
  /** HTML input type */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  /** Placeholder text with proper contrast */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Full width layout control */
  fullWidth?: boolean;
  /** Error message */
  error?: string;
  /** Required field indicator */
  required?: boolean;
  /** Default value */
  defaultValue?: string;
  /** Additional CSS class names */
  className?: string;
}

/**
 * A reusable Material Design input component with comprehensive accessibility support,
 * form validation integration, and responsive design capabilities.
 * 
 * @version 1.0.0
 * @example
 * ```tsx
 * <Input
 *   name="email"
 *   label="Email Address"
 *   type="email"
 *   required
 *   fullWidth
 * />
 * ```
 */
const Input: React.FC<InputProps> = ({
  name,
  label,
  type = 'text',
  placeholder,
  disabled = false,
  fullWidth = false,
  error,
  required = false,
  defaultValue,
  className,
}) => {
  // Generate unique IDs for accessibility
  const uniqueId = useId();
  const inputId = `input-${uniqueId}`;
  const errorId = `error-${uniqueId}`;

  // Track focus state for styling
  const [focused, setFocused] = useState(false);

  // Get form context if available
  const formContext = useFormContext();
  const isFormControlled = !!formContext;

  // Register input with form context if available
  const { register, formState: { errors } = {} } = formContext || {};
  const fieldError = isFormControlled ? errors?.[name]?.message as string : error;

  // Handle form registration
  const registerProps = isFormControlled
    ? register(name, { required: required && 'This field is required' })
    : {};

  // Handle focus events
  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    registerProps.onFocus?.(event);
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    registerProps.onBlur?.(event);
  };

  return (
    <InputContainer 
      fullWidth={fullWidth}
      className={className}
    >
      <Label
        htmlFor={inputId}
        error={fieldError}
        required={required}
      >
        {label}
      </Label>

      <StyledInput
        id={inputId}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        error={fieldError}
        focused={focused}
        fullWidth={fullWidth}
        defaultValue={defaultValue}
        aria-invalid={!!fieldError}
        aria-required={required}
        aria-describedby={fieldError ? errorId : undefined}
        {...registerProps}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />

      {fieldError && (
        <ErrorText
          id={errorId}
          role="alert"
          aria-live="polite"
        >
          {fieldError}
        </ErrorText>
      )}
    </InputContainer>
  );
};

export default Input;