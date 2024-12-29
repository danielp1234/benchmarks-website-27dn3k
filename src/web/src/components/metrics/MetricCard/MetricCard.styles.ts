import styled from 'styled-components'; // ^5.3.0
import Card from '../../common/Card/Card';

// Interface for theme-aware props
interface ThemeProps {
  theme: {
    breakpoints: Record<string, string>;
    colors: Record<string, string>;
    typography: Record<string, string>;
    spacing: Record<string, string>;
    shadows: Record<string, string>;
    elevation: Record<string, number>;
  }
}

/**
 * Styled container extending the base Card component with Material Design elevation
 * and responsive padding for metric information display
 */
export const CardContainer = styled(Card)`
  position: relative;
  width: 100%;
  transition: var(--transition-normal);
  background-color: #FFFFFF;
  
  /* Mobile-first base styles */
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);

  /* Responsive adjustments */
  @media (min-width: var(--breakpoint-tablet)) {
    padding: var(--spacing-lg);
  }

  @media (min-width: var(--breakpoint-desktop)) {
    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }
  }
`;

/**
 * Styled heading for metric name with responsive typography
 * and proper contrast ratio for accessibility
 */
export const MetricTitle = styled.h3`
  font-family: var(--font-family);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--neutral-900);
  margin: 0 0 var(--spacing-sm) 0;
  line-height: var(--line-height-tight);

  @media (min-width: var(--breakpoint-tablet)) {
    font-size: var(--font-size-xl);
  }
`;

/**
 * Styled container for metric value with emphasis styling
 * and proper spacing for visual hierarchy
 */
export const MetricValue = styled.span`
  display: block;
  font-family: var(--font-family);
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--primary-color);
  margin: var(--spacing-xs) 0;
  line-height: var(--line-height-none);

  @media (min-width: var(--breakpoint-tablet)) {
    font-size: var(--font-size-3xl);
  }
`;

/**
 * Container for percentile distribution with responsive grid layout
 */
export const PercentileContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
  
  @media (min-width: var(--breakpoint-tablet)) {
    grid-template-columns: repeat(5, 1fr);
    gap: var(--spacing-md);
  }
`;

/**
 * Individual percentile item with consistent styling
 */
export const PercentileItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

/**
 * Percentile label with proper contrast and spacing
 */
export const PercentileLabel = styled.span`
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--neutral-600);
  margin-bottom: var(--spacing-xs);
`;

/**
 * Percentile value with emphasis styling
 */
export const PercentileValue = styled.span`
  font-family: var(--font-family);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--neutral-800);

  @media (min-width: var(--breakpoint-tablet)) {
    font-size: var(--font-size-lg);
  }
`;

/**
 * Source attribution text with subtle styling
 */
export const MetricSource = styled.div`
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  color: var(--neutral-500);
  margin-top: var(--spacing-md);
  text-align: right;
`;

/**
 * Container for additional metric metadata
 */
export const MetricMetadata = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: var(--border-width-thin) solid var(--neutral-200);
  
  @media (min-width: var(--breakpoint-tablet)) {
    margin-top: var(--spacing-md);
    padding-top: var(--spacing-md);
  }
`;

/**
 * Metadata label with consistent styling
 */
export const MetadataLabel = styled.span`
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  color: var(--neutral-600);
  font-weight: var(--font-weight-medium);
`;

/**
 * Metadata value with emphasis
 */
export const MetadataValue = styled.span`
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  color: var(--neutral-800);
  font-weight: var(--font-weight-semibold);
`;