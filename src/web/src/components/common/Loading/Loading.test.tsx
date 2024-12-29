import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { axe, toHaveNoViolations } from 'jest-axe';
import 'jest-styled-components';
import Loading from './Loading';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock theme object for styled-components
const theme = {
  colors: {
    primary: '#1976d2',
    secondary: '#dc004e',
  },
};

// Helper function to render components with theme
const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

describe('Loading Component', () => {
  // Basic rendering tests
  it('renders correctly with default props', () => {
    renderWithTheme(<Loading />);
    const spinner = screen.getByTestId('loading-spinner');
    
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('role', 'status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading content');
    expect(spinner).toHaveAttribute('aria-live', 'polite');
  });

  // Size prop tests
  it('applies custom size prop correctly', () => {
    const sizes = {
      sm: '24px',
      md: '40px',
      lg: '56px'
    };

    Object.entries(sizes).forEach(([size, value]) => {
      const { container, rerender } = renderWithTheme(
        <Loading size={size as 'sm' | 'md' | 'lg'} />
      );
      
      const spinnerElement = container.querySelector('div > div');
      expect(spinnerElement).toHaveStyleRule('width', value);
      expect(spinnerElement).toHaveStyleRule('height', value);
      
      rerender(<ThemeProvider theme={theme}><Loading /></ThemeProvider>);
    });
  });

  // Color prop tests
  it('applies custom color prop correctly', () => {
    const testColor = '#2196f3';
    const { container } = renderWithTheme(<Loading color={testColor} />);
    
    const spinnerElement = container.querySelector('div > div');
    expect(spinnerElement).toHaveStyleRule('border', `3px solid ${testColor}`);
  });

  // Accessibility tests
  it('meets accessibility requirements', async () => {
    const { container } = renderWithTheme(<Loading />);
    
    // Check for ARIA attributes
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveAttribute('role', 'status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading content');
    expect(spinner).toHaveAttribute('aria-live', 'polite');

    // Run axe accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // Reduced motion tests
  it('handles reduced motion preference', () => {
    // Mock matchMedia for reduced motion
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }));

    const { container } = renderWithTheme(<Loading />);
    const spinnerElement = container.querySelector('div > div');
    
    expect(spinnerElement).toHaveStyleRule('animation-duration', '2s', {
      media: '(prefers-reduced-motion: reduce)'
    });
  });

  // Class name prop tests
  it('applies custom className prop correctly', () => {
    const testClass = 'custom-loading';
    renderWithTheme(<Loading className={testClass} />);
    
    const container = screen.getByTestId('loading-spinner');
    expect(container).toHaveClass(testClass);
  });

  // Error handling tests
  it('handles invalid size prop gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    // @ts-ignore - Testing invalid prop
    renderWithTheme(<Loading size="invalid" />);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'Invalid size prop provided to Loading component. Using default "md" size.'
    );
    
    consoleSpy.mockRestore();
  });

  // Animation performance tests
  it('includes performance optimization attributes', () => {
    const { container } = renderWithTheme(<Loading />);
    const spinnerElement = container.querySelector('div > div');
    
    expect(spinnerElement).toHaveStyleRule('will-change', 'transform');
    expect(spinnerElement).toHaveStyleRule('backface-visibility', 'hidden');
    expect(spinnerElement).toHaveStyleRule('perspective', '1000');
    expect(spinnerElement).toHaveStyleRule('transform', 'translateZ(0)');
  });

  // Component memoization test
  it('is properly memoized', () => {
    const { rerender } = renderWithTheme(<Loading />);
    const firstRender = screen.getByTestId('loading-spinner');
    
    rerender(
      <ThemeProvider theme={theme}>
        <Loading />
      </ThemeProvider>
    );
    const secondRender = screen.getByTestId('loading-spinner');
    
    expect(firstRender).toBe(secondRender);
  });
});