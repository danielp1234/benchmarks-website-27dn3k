import styled from '@emotion/styled';

/**
 * Main container component for the admin dashboard implementing a responsive 12-column grid layout.
 * Provides theme-aware spacing and responsive breakpoints for different screen sizes.
 * @version 1.0.0
 */
export const DashboardContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  width: 100%;
  max-width: var(--max-width-xl);
  margin: 0 auto;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(6, 1fr);
    padding: var(--spacing-md);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    padding: var(--spacing-sm);
    gap: var(--spacing-md);
  }
`;

/**
 * Container component for quick action buttons with flex layout and responsive positioning.
 * Adapts to different screen sizes by adjusting grid column span.
 * @version 1.0.0
 */
export const QuickActions = styled.div`
  grid-column: span 4;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  min-height: 200px;

  @media (max-width: 1024px) {
    grid-column: span 6;
  }

  @media (max-width: 768px) {
    grid-column: 1/-1;
  }
`;

/**
 * Card-styled container for the recent activity section implementing Material Design elevation.
 * Features smooth transition for hover effects and responsive layout adjustments.
 * @version 1.0.0
 */
export const RecentActivity = styled.div`
  grid-column: span 4;
  background-color: var(--background-paper);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  min-height: 400px;
  transition: box-shadow 0.3s ease-in-out;

  &:hover {
    box-shadow: var(--shadow-md);
  }

  @media (max-width: 1024px) {
    grid-column: span 6;
  }

  @media (max-width: 768px) {
    grid-column: 1/-1;
  }
`;

/**
 * Card-styled container for the system status section implementing Material Design elevation.
 * Features smooth transition for hover effects and responsive layout adjustments.
 * @version 1.0.0
 */
export const SystemStatus = styled.div`
  grid-column: span 4;
  background-color: var(--background-paper);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  min-height: 400px;
  transition: box-shadow 0.3s ease-in-out;

  &:hover {
    box-shadow: var(--shadow-md);
  }

  @media (max-width: 1024px) {
    grid-column: span 6;
  }

  @media (max-width: 768px) {
    grid-column: 1/-1;
  }
`;