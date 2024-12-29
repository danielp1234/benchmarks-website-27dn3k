import styled from 'styled-components';
import '../../assets/styles/variables.css';

// Interface for styled card component props
interface StyledCardProps {
  variant?: 'outlined' | 'elevated';
  elevation?: number;
  fullWidth?: boolean;
}

/**
 * Utility function to get appropriate shadow based on elevation level
 * @param elevation - Number between 0-3 indicating elevation level
 * @returns CSS box-shadow value from design system variables
 */
const getElevationShadow = (elevation: number, variant: 'outlined' | 'elevated' = 'elevated'): string => {
  if (variant === 'outlined') return 'none';
  
  switch (elevation) {
    case 0:
      return 'var(--shadow-sm)';
    case 1:
      return 'var(--shadow-md)';
    case 2:
      return 'var(--shadow-lg)';
    case 3:
      return 'var(--shadow-xl)';
    default:
      return 'var(--shadow-md)';
  }
};

/**
 * Main card container with responsive design and accessibility support
 */
export const CardWrapper = styled.div<StyledCardProps>`
  background-color: #FFFFFF;
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  transition: var(--transition-normal);
  width: 100%;
  max-width: ${props => props.fullWidth ? '100%' : '400px'};
  margin-bottom: var(--spacing-md);
  box-sizing: border-box;
  
  /* Variant specific styles */
  ${props => props.variant === 'outlined' ? `
    border: var(--border-width-thin) solid var(--neutral-200);
  ` : `
    box-shadow: ${getElevationShadow(props.elevation || 1, 'elevated')};
  `}

  /* Hover effect for elevated cards */
  ${props => props.variant !== 'outlined' && `
    &:hover {
      box-shadow: ${getElevationShadow((props.elevation || 1) + 1, 'elevated')};
    }
  `}

  /* Responsive adjustments */
  @media (max-width: var(--breakpoint-mobile)) {
    padding: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
  }
`;

/**
 * Card header with proper typography and spacing
 */
export const CardHeader = styled.header`
  padding-bottom: var(--spacing-sm);
  border-bottom: var(--border-width-thin) solid var(--neutral-100);
  margin-bottom: var(--spacing-md);

  /* Typography */
  font-family: var(--font-family);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  color: var(--neutral-900);

  /* Responsive adjustments */
  @media (max-width: var(--breakpoint-mobile)) {
    padding-bottom: var(--spacing-xs);
    margin-bottom: var(--spacing-sm);
  }
`;

/**
 * Card content section with flexible height and overflow handling
 */
export const CardContent = styled.div`
  /* Typography */
  font-family: var(--font-family);
  font-size: var(--font-size-md);
  line-height: var(--line-height-normal);
  color: var(--neutral-700);

  /* Content handling */
  min-height: 0;
  overflow-y: auto;
  
  /* Spacing */
  margin-bottom: var(--spacing-md);

  /* Responsive adjustments */
  @media (max-width: var(--breakpoint-mobile)) {
    margin-bottom: var(--spacing-sm);
  }
`;

/**
 * Card footer with action alignment support
 */
export const CardFooter = styled.footer`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: var(--border-width-thin) solid var(--neutral-100);
  
  /* Typography */
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  color: var(--neutral-600);

  /* Responsive adjustments */
  @media (max-width: var(--breakpoint-mobile)) {
    padding-top: var(--spacing-xs);
    flex-direction: column;
    gap: var(--spacing-xs);
    
    /* Stack buttons vertically on mobile */
    & > * {
      width: 100%;
    }
  }
`;