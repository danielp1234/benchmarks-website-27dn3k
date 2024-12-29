import styled from 'styled-components';

// Import design tokens from variables.css
import '../../../assets/styles/variables.css';

/**
 * Main container for the home page with responsive padding and Material Design elevation
 */
export const Container = styled.div`
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: var(--spacing-md);
  background-color: var(--neutral-50);
  min-height: 100vh;

  @media (min-width: var(--breakpoint-tablet)) {
    padding: var(--spacing-lg);
  }

  @media (min-width: var(--breakpoint-desktop)) {
    padding: var(--spacing-xl);
  }
`;

/**
 * Hero section with prominent content and responsive spacing
 */
export const HeroSection = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--spacing-2xl) var(--spacing-md);
  background-color: var(--neutral-100);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  transition: var(--transition-normal);

  @media (min-width: var(--breakpoint-tablet)) {
    padding: var(--spacing-3xl) var(--spacing-xl);
  }

  &:hover {
    box-shadow: var(--shadow-lg);
  }
`;

/**
 * Features section with responsive grid layout
 */
export const FeaturesSection = styled.section`
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-lg);
  padding: var(--spacing-2xl) 0;

  @media (min-width: var(--breakpoint-tablet)) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: var(--breakpoint-desktop)) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

/**
 * Feature card with Material Design elevation
 */
export const FeatureCard = styled.div`
  padding: var(--spacing-lg);
  background-color: var(--neutral-50);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);
  transition: var(--transition-normal);

  &:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }
`;

/**
 * Benefits section with alternating layout
 */
export const BenefitsSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2xl);
  padding: var(--spacing-2xl) 0;

  @media (min-width: var(--breakpoint-tablet)) {
    padding: var(--spacing-3xl) 0;
  }
`;

/**
 * Benefit item with responsive layout
 */
export const BenefitItem = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  background-color: var(--neutral-50);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);

  @media (min-width: var(--breakpoint-tablet)) {
    grid-template-columns: 1fr 1fr;
    align-items: center;
  }

  &:nth-child(even) {
    @media (min-width: var(--breakpoint-tablet)) {
      direction: rtl;
    }
  }
`;

/**
 * Call-to-action section with prominent styling
 */
export const CTASection = styled.section`
  text-align: center;
  padding: var(--spacing-3xl) var(--spacing-md);
  margin: var(--spacing-2xl) 0;
  background-color: var(--primary-color);
  color: var(--neutral-50);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-lg);

  @media (min-width: var(--breakpoint-tablet)) {
    padding: var(--spacing-4xl) var(--spacing-2xl);
    margin: var(--spacing-3xl) 0;
  }
`;

/**
 * Grid container for metric cards
 */
export const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-md);
  padding: var(--spacing-xl) 0;

  @media (min-width: var(--breakpoint-tablet)) {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-lg);
  }

  @media (min-width: var(--breakpoint-desktop)) {
    grid-template-columns: repeat(4, 1fr);
    gap: var(--spacing-xl);
  }
`;

/**
 * Metric card with Material Design elevation
 */
export const MetricCard = styled.div`
  padding: var(--spacing-lg);
  background-color: var(--neutral-50);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);
  transition: var(--transition-normal);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);

  &:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }
`;

/**
 * Container for filter section
 */
export const FilterContainer = styled.div`
  position: sticky;
  top: var(--header-height);
  padding: var(--spacing-md);
  background-color: var(--neutral-50);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-md);
  z-index: var(--z-index-sticky);
  margin-bottom: var(--spacing-xl);

  @media (min-width: var(--breakpoint-tablet)) {
    padding: var(--spacing-lg);
  }
`;

/**
 * Responsive grid for filter controls
 */
export const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-md);

  @media (min-width: var(--breakpoint-tablet)) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: var(--breakpoint-desktop)) {
    grid-template-columns: repeat(3, 1fr);
  }
`;