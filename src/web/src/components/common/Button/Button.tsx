import React, { forwardRef, useCallback, useContext } from 'react';
import { ButtonContainer, ButtonContent, ButtonIcon } from './Button.styles';

// Interface for Button component props
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Content to be rendered inside the button */
  children: React.ReactNode;
  /** Visual style variant of the button */
  variant?: 'primary' | 'secondary' | 'outlined' | 'text';
  /** Size variant of the button */
  size?: 'small' | 'medium' | 'large';
  /** Optional icon element */
  icon?: React.ReactElement;
  /** Position of the icon relative to content */
  iconPosition?: 'left' | 'right';
  /** Whether button should take full width of container */
  fullWidth?: boolean;
  /** Disabled state of button */
  disabled?: boolean;
  /** Loading state of button */
  loading?: boolean;
  /** HTML button type */
  type?: 'button' | 'submit' | 'reset';
  /** Click event handler */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Focus event handler */
  onFocus?: (event: React.FocusEvent<HTMLButtonElement>) => void;
  /** Blur event handler */
  onBlur?: (event: React.FocusEvent<HTMLButtonElement>) => void;
  /** Additional CSS classes */
  className?: string;
  /** Accessible label */
  ariaLabel?: string;
  /** ID of element describing the button */
  ariaDescribedBy?: string;
  /** Indicates if button controls expanded state */
  ariaExpanded?: boolean;
  /** ID of element controlled by button */
  ariaControls?: string;
  /** Tab index for keyboard navigation */
  tabIndex?: number;
  /** ARIA role override */
  role?: string;
  /** Test ID for automated testing */
  dataTestId?: string;
}

/**
 * Enhanced Material Design button component with accessibility and RTL support.
 * Implements WCAG 2.1 Level AA compliance with comprehensive keyboard navigation
 * and screen reader optimization.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled = false,
  loading = false,
  type = 'button',
  onClick,
  onFocus,
  onBlur,
  className,
  ariaLabel,
  ariaDescribedBy,
  ariaExpanded,
  ariaControls,
  tabIndex = 0,
  role = 'button',
  dataTestId,
  ...restProps
}, ref) => {
  // Get RTL context - assuming you have a context provider for RTL
  const isRTL = document.dir === 'rtl';

  // Enhanced keyboard event handler for accessibility
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        onClick?.(event as unknown as React.MouseEvent<HTMLButtonElement>);
        break;
      case 'Tab':
        // Handle natural tab flow
        break;
      default:
        break;
    }
  }, [disabled, loading, onClick]);

  // Click handler with loading/disabled state check
  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }, [disabled, loading, onClick]);

  // Render loading spinner if in loading state
  const renderLoadingSpinner = () => {
    if (!loading) return null;
    return (
      <ButtonIcon position={iconPosition} dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Replace with your loading spinner component */}
        <span className="loading-spinner" aria-hidden="true" />
      </ButtonIcon>
    );
  };

  // Render icon if provided
  const renderIcon = () => {
    if (!icon || loading) return null;
    return (
      <ButtonIcon position={iconPosition} dir={isRTL ? 'rtl' : 'ltr'}>
        {React.cloneElement(icon, {
          'aria-hidden': 'true',
          focusable: 'false'
        })}
      </ButtonIcon>
    );
  };

  return (
    <ButtonContainer
      ref={ref}
      type={type}
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled || loading}
      className={className}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      tabIndex={disabled ? -1 : tabIndex}
      role={role}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      data-testid={dataTestId}
      dir={isRTL ? 'rtl' : 'ltr'}
      {...restProps}
    >
      <ButtonContent hasIcon={!!(icon || loading)} dir={isRTL ? 'rtl' : 'ltr'}>
        {iconPosition === 'left' && (loading ? renderLoadingSpinner() : renderIcon())}
        {children}
        {iconPosition === 'right' && (loading ? renderLoadingSpinner() : renderIcon())}
      </ButtonContent>
    </ButtonContainer>
  );
});

// Display name for debugging
Button.displayName = 'Button';

// Export component and types
export type { ButtonProps };
export default Button;