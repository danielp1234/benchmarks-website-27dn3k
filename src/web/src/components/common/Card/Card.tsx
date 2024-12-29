import React from 'react'; // ^18.0.0
import { CardWrapper, CardHeader, CardContent, CardFooter } from './Card.styles';

/**
 * Interface defining the props for the Card component
 */
interface CardProps {
  /** Visual style variant of the card */
  variant?: 'outlined' | 'elevated';
  /** Shadow elevation level (0-3) for elevated variant */
  elevation?: number;
  /** Whether the card should take full width of its container */
  fullWidth?: boolean;
  /** Optional header content */
  header?: React.ReactNode;
  /** Optional footer content */
  footer?: React.ReactNode;
  /** Main content of the card */
  children: React.ReactNode;
  /** Optional CSS class name for additional styling */
  className?: string;
  /** ARIA role for accessibility */
  role?: string;
  /** ARIA label for accessibility */
  'aria-label'?: string;
}

/**
 * A Material Design card component that provides a flexible container for content
 * with support for headers, content sections, and footers.
 * 
 * @component
 * @example
 * ```tsx
 * <Card
 *   variant="elevated"
 *   elevation={1}
 *   header={<h2>Card Title</h2>}
 *   footer={<Button>Action</Button>}
 * >
 *   <p>Card content goes here</p>
 * </Card>
 * ```
 */
export const Card: React.FC<CardProps> = ({
  variant = 'elevated',
  elevation = 1,
  fullWidth = false,
  header,
  footer,
  children,
  className,
  role = 'article',
  'aria-label': ariaLabel,
  ...rest
}) => {
  // Validate elevation range
  const validElevation = Math.min(Math.max(elevation, 0), 3);

  return (
    <CardWrapper
      variant={variant}
      elevation={validElevation}
      fullWidth={fullWidth}
      className={className}
      role={role}
      aria-label={ariaLabel}
      {...rest}
    >
      {header && (
        <CardHeader role="heading" aria-level={2}>
          {header}
        </CardHeader>
      )}
      
      <CardContent>
        {children}
      </CardContent>

      {footer && (
        <CardFooter role="contentinfo">
          {footer}
        </CardFooter>
      )}
    </CardWrapper>
  );
};

/**
 * Default props for the Card component
 */
Card.defaultProps = {
  variant: 'elevated',
  elevation: 1,
  fullWidth: false,
  role: 'article'
};

export default Card;