import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import PublicLayout from './PublicLayout';

// Mock dependencies
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn()
  };
});

// Mock useAuth hook
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    isLoading: false,
    error: null
  })
}));

// Mock ResizeObserver for responsive tests
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock;

// Helper function to render with router context
const renderWithRouter = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {ui}
    </BrowserRouter>
  );
};

// Helper function to setup media queries
const setupMediaQuery = (width: number) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: width <= 768,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe('PublicLayout Visual Hierarchy', () => {
  it('should render header prominently at the top', () => {
    renderWithRouter(<PublicLayout>Test Content</PublicLayout>);
    
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(window.getComputedStyle(header).position).toBe('fixed');
    expect(window.getComputedStyle(header).top).toBe('0');
  });

  it('should display main content area with proper spacing', () => {
    renderWithRouter(<PublicLayout>Test Content</PublicLayout>);
    
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveStyle({
      marginTop: 'var(--header-height, 64px)',
      padding: 'var(--spacing-lg, 32px) var(--spacing-md, 24px)'
    });
  });

  it('should render skip navigation link for accessibility', () => {
    renderWithRouter(<PublicLayout>Test Content</PublicLayout>);
    
    const skipLink = screen.getByText('Skip to main content');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });
});

describe('PublicLayout Responsive Behavior', () => {
  const viewports = {
    mobile: 320,
    tablet: 768,
    desktop: 1024
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should adapt layout for mobile viewport', async () => {
    setupMediaQuery(viewports.mobile);
    renderWithRouter(<PublicLayout>Test Content</PublicLayout>);
    
    const container = screen.getByTestId('public-layout');
    expect(container).toHaveStyle({
      padding: 'var(--spacing-sm, 16px)'
    });
  });

  it('should adapt layout for tablet viewport', async () => {
    setupMediaQuery(viewports.tablet);
    renderWithRouter(<PublicLayout>Test Content</PublicLayout>);
    
    const main = screen.getByRole('main');
    expect(main).toHaveStyle({
      padding: 'var(--spacing-md, 24px) var(--spacing-sm, 16px)'
    });
  });

  it('should maintain proper spacing on desktop viewport', () => {
    setupMediaQuery(viewports.desktop);
    renderWithRouter(<PublicLayout>Test Content</PublicLayout>);
    
    const container = screen.getByTestId('public-layout');
    expect(container).toHaveStyle({
      maxWidth: 'var(--container-max-width, 1440px)'
    });
  });
});

describe('PublicLayout Component Integration', () => {
  it('should render loading state correctly', () => {
    vi.mock('../../../hooks/useAuth', () => ({
      useAuth: () => ({
        isLoading: true,
        error: null
      })
    }));

    renderWithRouter(<PublicLayout>Test Content</PublicLayout>);
    
    const loadingSpinner = screen.getByTestId('loading-spinner');
    expect(loadingSpinner).toBeInTheDocument();
    expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
  });

  it('should render error state when auth error occurs', () => {
    const errorMessage = 'Authentication failed';
    vi.mock('../../../hooks/useAuth', () => ({
      useAuth: () => ({
        isLoading: false,
        error: { message: errorMessage }
      })
    }));

    renderWithRouter(<PublicLayout>Test Content</PublicLayout>);
    
    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent(errorMessage);
  });

  it('should render children when not loading', () => {
    renderWithRouter(
      <PublicLayout>
        <div data-testid="test-content">Test Content</div>
      </PublicLayout>
    );
    
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });
});

describe('PublicLayout Accessibility', () => {
  it('should have proper ARIA attributes', () => {
    renderWithRouter(<PublicLayout>Test Content</PublicLayout>);
    
    const container = screen.getByTestId('public-layout');
    expect(container).toHaveAttribute('role', 'application');
    
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('aria-label', 'Main content');
    expect(main).toHaveAttribute('tabIndex', '-1');
  });

  it('should handle keyboard navigation', async () => {
    renderWithRouter(<PublicLayout>Test Content</PublicLayout>);
    
    const skipLink = screen.getByText('Skip to main content');
    const main = screen.getByRole('main');

    // Simulate keyboard navigation
    skipLink.focus();
    fireEvent.keyDown(skipLink, { key: 'Enter' });
    
    await waitFor(() => {
      expect(document.activeElement).toBe(main);
    });
  });

  it('should maintain focus management during loading states', async () => {
    vi.mock('../../../hooks/useAuth', () => ({
      useAuth: () => ({
        isLoading: true,
        error: null
      })
    }));

    renderWithRouter(<PublicLayout>Test Content</PublicLayout>);
    
    const loadingSpinner = screen.getByTestId('loading-spinner');
    expect(loadingSpinner).toHaveAttribute('aria-label', 'Loading content');
    expect(loadingSpinner).toHaveAttribute('aria-live', 'polite');
  });
});