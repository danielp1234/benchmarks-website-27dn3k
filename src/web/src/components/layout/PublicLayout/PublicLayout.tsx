import React from 'react';
import { Container, Header, Main, Footer } from './PublicLayout.styles';
import Loading from '../../common/Loading/Loading';
import { useAuth } from '../../../hooks/useAuth';

/**
 * Props interface for PublicLayout component with strict type checking
 * @interface PublicLayoutProps
 */
interface PublicLayoutProps {
  /** Child components to render in main content area with XSS protection */
  children: React.ReactNode;
}

/**
 * PublicLayout component that provides the main layout structure for public pages
 * Implements Material Design principles, responsive design, and accessibility requirements
 *
 * @component
 * @version 1.0.0
 * 
 * @example
 * ```tsx
 * <PublicLayout>
 *   <MyComponent />
 * </PublicLayout>
 * ```
 */
const PublicLayout: React.FC<PublicLayoutProps> = React.memo(({ children }) => {
  // Get authentication loading state from useAuth hook
  const { isLoading, error } = useAuth();

  /**
   * Render skip navigation link for accessibility
   * Hidden visually but available for screen readers
   */
  const renderSkipNav = () => (
    <a
      href="#main-content"
      className="skip-nav"
      style={{
        position: 'absolute',
        left: '-9999px',
        top: 'auto',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
    >
      Skip to main content
    </a>
  );

  /**
   * Render error message if authentication error occurs
   */
  const renderError = () => {
    if (!error) return null;
    return (
      <div
        role="alert"
        aria-live="polite"
        style={{
          padding: 'var(--spacing-md)',
          color: 'var(--color-error)',
          textAlign: 'center',
        }}
      >
        {error.message}
      </div>
    );
  };

  return (
    <Container
      role="application"
      aria-busy={isLoading}
      data-testid="public-layout"
    >
      {renderSkipNav()}
      
      <Header role="banner">
        {/* Header content will be injected by navigation components */}
      </Header>

      <Main
        id="main-content"
        role="main"
        tabIndex={-1}
        aria-label="Main content"
      >
        {isLoading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '200px',
            }}
          >
            <Loading
              size="lg"
              aria-label="Loading content"
            />
          </div>
        ) : (
          <>
            {renderError()}
            {children}
          </>
        )}
      </Main>

      <Footer
        role="contentinfo"
        aria-label="Footer"
      >
        {/* Footer content will be injected by footer components */}
      </Footer>
    </Container>
  );
});

// Display name for debugging
PublicLayout.displayName = 'PublicLayout';

// Default export with memo optimization
export default PublicLayout;