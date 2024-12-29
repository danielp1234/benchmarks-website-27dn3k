import styled, { css } from 'styled-components';

// Breakpoints following Material Design principles
const BREAKPOINTS = {
  MOBILE: '768px',
  TABLET: '1024px',
  DESKTOP: '1440px'
} as const;

// Media query helpers
const media = {
  mobile: `@media (max-width: ${BREAKPOINTS.MOBILE})`,
  tablet: `@media (min-width: ${BREAKPOINTS.MOBILE}) and (max-width: ${BREAKPOINTS.TABLET})`,
  desktop: `@media (min-width: ${BREAKPOINTS.TABLET})`
};

// Helper function to determine filter panel width based on screen size
const getFilterPanelWidth = (breakpoint: number): string => {
  if (breakpoint < 768) return '100%';
  if (breakpoint < 1024) return '320px';
  return '400px';
};

// Common transition styles for smooth animations
const transitionStyles = css`
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`;

// Main container for the benchmarks page
export const BenchmarksContainer = styled.div`
  width: 100%;
  max-width: var(--container-max-width, 1440px);
  margin: 0 auto;
  padding: var(--spacing-md, 24px);
  box-sizing: border-box;
  min-height: 100vh;
  background-color: var(--background-primary);
  
  ${media.mobile} {
    padding: var(--spacing-sm, 16px);
  }
`;

// Wrapper for content area including filter panel and main content
export const ContentWrapper = styled.div`
  display: flex;
  gap: var(--spacing-md, 24px);
  position: relative;
  
  ${media.mobile} {
    flex-direction: column;
    gap: var(--spacing-sm, 16px);
  }
`;

// Filter panel container with responsive behavior
interface FilterPanelProps {
  isOpen: boolean;
}

export const FilterPanelContainer = styled.div<FilterPanelProps>`
  background-color: var(--surface-primary);
  border-radius: var(--border-radius-md, 8px);
  box-shadow: var(--elevation-2);
  height: fit-content;
  position: sticky;
  top: var(--spacing-md, 24px);
  
  ${transitionStyles}
  
  ${media.desktop} {
    width: ${getFilterPanelWidth(1024)};
    transform: translateX(0);
  }
  
  ${media.tablet} {
    width: ${getFilterPanelWidth(768)};
    transform: translateX(0);
  }
  
  ${media.mobile} {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 100%;
    z-index: var(--z-index-drawer);
    transform: translateX(${props => props.isOpen ? '0' : '-100%'});
    padding: var(--spacing-md, 24px);
  }
`;

// Main content area containing benchmark grid
export const MainContent = styled.div`
  flex: 1;
  min-width: 0; // Prevents flex item from overflowing
  background-color: var(--surface-primary);
  border-radius: var(--border-radius-md, 8px);
  box-shadow: var(--elevation-1);
  padding: var(--spacing-lg, 32px);
  
  ${media.mobile} {
    padding: var(--spacing-md, 24px);
  }
  
  // Ensure proper spacing for data grid
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md, 24px);
`;