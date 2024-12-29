// @emotion/styled version: ^11.11.0
import styled from '@emotion/styled';

/**
 * Main container for the admin layout using CSS Grid
 * Implements responsive grid system with theme support
 */
export const AdminLayoutContainer = styled.div`
  display: grid;
  grid-template-columns: [sidebar] var(--sidebar-width) [content] 1fr;
  grid-template-rows: [header] var(--header-height) [main] 1fr;
  min-height: 100vh;
  background-color: var(--background-primary);
  transition: var(--transition-normal);
  position: relative;
  overflow: hidden;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    grid-template-rows: [header] var(--header-height) [main] 1fr;
  }
`;

/**
 * Fixed position header with elevation and responsive behavior
 * Implements Material Design elevation principles
 */
export const AdminHeader = styled.header`
  position: fixed;
  top: 0;
  right: 0;
  left: var(--sidebar-width);
  height: var(--header-height);
  padding: var(--spacing-md);
  background-color: var(--background-primary);
  box-shadow: var(--elevation-2);
  z-index: var(--z-index-header);
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: var(--transition-normal);

  @media (max-width: 768px) {
    left: 0;
    width: 100%;
  }
`;

/**
 * Collapsible sidebar with smooth transitions
 * Implements mobile-first approach with smooth animations
 */
export const AdminSidebar = styled.aside`
  position: fixed;
  top: 0;
  left: 0;
  width: var(--sidebar-width);
  height: 100vh;
  padding: var(--spacing-md);
  background-color: var(--background-secondary);
  box-shadow: var(--elevation-2);
  overflow-y: auto;
  overflow-x: hidden;
  will-change: transform;
  transition: transform var(--transition-normal);
  z-index: var(--z-index-sidebar);

  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: var(--background-secondary);
  }

  &::-webkit-scrollbar-thumb {
    background: var(--scroll-thumb);
    border-radius: 3px;
  }

  @media (max-width: 768px) {
    transform: translateX(-100%);
    transition: transform var(--transition-normal);

    &.open {
      transform: translateX(0);
      box-shadow: var(--elevation-4);
    }
  }
`;

/**
 * Main content area with responsive padding and scroll behavior
 * Implements Material Design spacing principles
 */
export const MainContent = styled.main`
  grid-column: content;
  grid-row: main;
  padding: var(--spacing-xl);
  margin-top: var(--header-height);
  background-color: var(--background-primary);
  overflow-y: auto;
  min-height: calc(100vh - var(--header-height));
  position: relative;

  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: var(--background-primary);
  }

  &::-webkit-scrollbar-thumb {
    background: var(--scroll-thumb);
    border-radius: 4px;
  }

  @media (max-width: 768px) {
    padding: var(--spacing-md);
    width: 100%;
  }
`;