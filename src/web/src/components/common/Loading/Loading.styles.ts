import styled, { keyframes } from 'styled-components';

// Interface for type-safe props
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

// Helper function to map size prop to pixel values following Material Design specs
const getSizeValue = (size?: 'sm' | 'md' | 'lg'): string => {
  switch (size) {
    case 'sm':
      return '24px';
    case 'lg':
      return '56px';
    case 'md':
    default:
      return '40px';
  }
};

// Optimized keyframe animation for the spinner
const spinKeyframes = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

// Container component with proper accessibility attributes
export const LoadingContainer = styled.div<SpinnerProps>`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: ${props => getSizeValue(props.size)};
  
  /* Accessibility attributes for screen readers */
  role: status;
  aria-label: Loading content;
  aria-live: polite;
`;

// Material Design compliant spinner component
export const Spinner = styled.div<SpinnerProps>`
  /* Dimensions based on Material Design specifications */
  width: ${props => getSizeValue(props.size)};
  height: ${props => getSizeValue(props.size)};
  
  /* Border styles with customizable color */
  border: 3px solid ${props => props.color || '#1976d2'};
  border-top-color: transparent;
  border-radius: 50%;
  
  /* Performance optimized animation */
  animation: ${spinKeyframes} 1.2s linear infinite;
  transform-origin: center center;
  will-change: transform;
  
  /* Accessibility consideration for reduced motion preferences */
  @media (prefers-reduced-motion: reduce) {
    animation-duration: 2s;
  }
  
  /* Hardware acceleration for smoother animation */
  backface-visibility: hidden;
  perspective: 1000;
  transform: translateZ(0);
`;