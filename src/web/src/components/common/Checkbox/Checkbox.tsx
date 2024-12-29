import React, { useCallback, memo } from 'react';
import { CheckboxContainer, StyledCheckbox, CheckboxLabel } from './Checkbox.styles';

// Default size for the checkbox component
const DEFAULT_SIZE = 'medium' as const;

// Interface for component props with comprehensive type definitions
interface CheckboxProps {
  /** Unique identifier for the checkbox */
  id: string;
  /** Name attribute for form submission */
  name: string;
  /** Current checked state */
  checked: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Label text content */
  label?: string;
  /** Size variant following Material Design specs */
  size?: 'small' | 'medium' | 'large';
  /** Optional CSS class name */
  className?: string;
  /** Change event handler */
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Accessible label for screen readers */
  ariaLabel?: string;
  /** Error state */
  error?: boolean;
  /** Error message for accessibility */
  errorMessage?: string;
  /** ID of element describing the error */
  describedBy?: string;
  /** Required field indicator */
  required?: boolean;
}

/**
 * Checkbox component implementing Material Design specifications with comprehensive
 * accessibility support (WCAG 2.1 Level AA compliant).
 *
 * @version 1.0.0
 * @component
 */
const Checkbox = memo(({
  id,
  name,
  checked,
  disabled = false,
  label,
  size = DEFAULT_SIZE,
  className,
  onChange,
  ariaLabel,
  error = false,
  errorMessage,
  describedBy,
  required = false,
}: CheckboxProps) => {
  /**
   * Enhanced keyboard event handler for accessibility
   * Handles Space and Enter key presses as per WCAG guidelines
   */
  const handleKeyPress = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      const syntheticEvent = {
        target: {
          checked: !checked,
          name,
          id,
        },
      } as React.ChangeEvent<HTMLInputElement>;
      
      onChange(syntheticEvent);
    }
  }, [checked, disabled, id, name, onChange]);

  /**
   * Generate unique IDs for accessibility attributes
   */
  const errorId = errorMessage ? `${id}-error` : undefined;
  const ariaDescribedBy = [describedBy, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <CheckboxContainer
      className={className}
      onClick={(e) => {
        // Prevent double trigger with label click
        if (e.target === e.currentTarget) {
          e.preventDefault();
        }
      }}
    >
      <StyledCheckbox
        type="checkbox"
        id={id}
        name={name}
        checked={checked}
        disabled={disabled}
        size={size}
        onChange={onChange}
        onKeyPress={handleKeyPress}
        aria-label={ariaLabel}
        aria-checked={checked}
        aria-disabled={disabled}
        aria-invalid={error}
        aria-describedby={ariaDescribedBy}
        aria-required={required}
        hasError={error}
        role="checkbox"
        tabIndex={disabled ? -1 : 0}
      />
      
      {label && (
        <CheckboxLabel
          htmlFor={id}
          disabled={disabled}
          size={size}
          hasError={error}
          required={required}
        >
          {label}
        </CheckboxLabel>
      )}
      
      {errorMessage && (
        <div
          id={errorId}
          role="alert"
          aria-live="polite"
          style={{
            color: 'var(--error-color)',
            fontSize: 'var(--font-size-sm)',
            marginTop: 'var(--spacing-xs)',
          }}
        >
          {errorMessage}
        </div>
      )}
    </CheckboxContainer>
  );
});

// Display name for debugging
Checkbox.displayName = 'Checkbox';

export default Checkbox;