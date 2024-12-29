import styled from '@emotion/styled';

/**
 * Main container component with max-width constraint and responsive padding
 * Implements theme support and proper content alignment
 * @version 1.0.0
 */
export const Container = styled.div`
  max-width: var(--container-max-width, 1440px);
  margin: 0 auto;
  padding: 0 var(--spacing-md, 24px);
  position: relative;
  background-color: ${({ theme }) => theme.colors.background};
  transition: background-color 0.3s ease;
  will-change: background-color;
  min-height: 100vh;
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    padding: var(--spacing-sm, 16px);
  }
`;

/**
 * Fixed header component with Material Design elevation and theme integration
 * Implements frosted glass effect and proper stacking context
 * @version 1.0.0
 */
export const Header = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: var(--header-height, 64px);
  background-color: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.elevation2};
  z-index: 1000;
  padding: 0 var(--spacing-md, 24px);
  display: flex;
  align-items: center;
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
  will-change: background-color, box-shadow;
  backdrop-filter: blur(8px);
  border-bottom: 1px solid ${({ theme }) => theme.colors.divider};

  @media (max-width: 768px) {
    height: var(--header-height-mobile, 56px);
    padding: 0 var(--spacing-sm, 16px);
  }
`;

/**
 * Main content area with responsive spacing and minimum height calculation
 * Implements proper content stretching and theme transitions
 * @version 1.0.0
 */
export const Main = styled.main`
  margin-top: var(--header-height, 64px);
  min-height: calc(100vh - var(--header-height, 64px) - var(--footer-height, 48px));
  padding: var(--spacing-lg, 32px) var(--spacing-md, 24px);
  background-color: ${({ theme }) => theme.colors.background};
  transition: background-color 0.3s ease;
  will-change: background-color;
  display: flex;
  flex-direction: column;
  flex: 1;

  @media (max-width: 768px) {
    margin-top: var(--header-height-mobile, 56px);
    padding: var(--spacing-md, 24px) var(--spacing-sm, 16px);
    min-height: calc(100vh - var(--header-height-mobile, 56px) - var(--footer-height-mobile, 40px));
  }
`;

/**
 * Footer component with theme integration and visual separation
 * Implements sticky positioning and proper content alignment
 * @version 1.0.0
 */
export const Footer = styled.footer`
  width: 100%;
  height: var(--footer-height, 48px);
  padding: var(--spacing-sm, 16px) var(--spacing-md, 24px);
  background-color: ${({ theme }) => theme.colors.surface};
  border-top: 1px solid ${({ theme }) => theme.colors.divider};
  transition: background-color 0.3s ease;
  will-change: background-color;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;

  @media (max-width: 768px) {
    height: var(--footer-height-mobile, 40px);
    padding: var(--spacing-xs, 8px) var(--spacing-sm, 16px);
  }
`;