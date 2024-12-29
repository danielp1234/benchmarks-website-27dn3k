import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from 'styled-components';
import Card from './Card';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock theme for styled-components
const theme = {
  // Theme values from variables.css
  colors: {
    neutral: {
      100: '#F3F4F6',
      200: '#E5E7EB',
      700: '#374151',
      900: '#111827'
    }
  },
  spacing: {
    sm: '0.5rem',
    md: '1rem'
  }
};

// Mock window.matchMedia for responsive tests
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

describe('Card', () => {
  // Basic rendering tests
  describe('rendering', () => {
    it('renders correctly with default props', () => {
      renderWithTheme(<Card>Test content</Card>);
      
      const card = screen.getByRole('article');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('role', 'article');
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      renderWithTheme(<Card className="custom-class">Content</Card>);
      expect(screen.getByRole('article')).toHaveClass('custom-class');
    });

    it('renders header when provided', () => {
      renderWithTheme(
        <Card header={<h2>Test Header</h2>}>Content</Card>
      );
      
      const header = screen.getByRole('heading', { level: 2 });
      expect(header).toBeInTheDocument();
      expect(header).toHaveTextContent('Test Header');
    });

    it('renders footer when provided', () => {
      renderWithTheme(
        <Card footer={<button>Action</button>}>Content</Card>
      );
      
      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
      const button = within(footer).getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  // Variant and elevation tests
  describe('variants and elevation', () => {
    it('applies correct styles for outlined variant', () => {
      renderWithTheme(<Card variant="outlined">Content</Card>);
      const card = screen.getByRole('article');
      expect(card).toHaveStyle({
        border: `var(--border-width-thin) solid var(--neutral-200)`
      });
    });

    it('applies correct elevation styles', () => {
      renderWithTheme(<Card variant="elevated" elevation={2}>Content</Card>);
      const card = screen.getByRole('article');
      expect(card).toHaveStyle({
        boxShadow: 'var(--shadow-lg)'
      });
    });

    it('clamps elevation between 0 and 3', () => {
      renderWithTheme(<Card elevation={5}>Content</Card>);
      const card = screen.getByRole('article');
      expect(card).toHaveStyle({
        boxShadow: 'var(--shadow-xl)'
      });
    });
  });

  // Responsive behavior tests
  describe('responsive behavior', () => {
    it('handles fullWidth prop correctly', () => {
      renderWithTheme(<Card fullWidth>Content</Card>);
      const card = screen.getByRole('article');
      expect(card).toHaveStyle({ maxWidth: '100%' });
    });

    it('adjusts padding based on screen size', () => {
      // Mock mobile viewport
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(max-width: var(--breakpoint-mobile))',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      renderWithTheme(<Card>Content</Card>);
      const card = screen.getByRole('article');
      expect(card).toHaveStyle({ padding: 'var(--spacing-sm)' });
    });
  });

  // Accessibility tests
  describe('accessibility', () => {
    it('meets WCAG accessibility guidelines', async () => {
      const { container } = renderWithTheme(
        <Card
          header={<h2>Accessible Header</h2>}
          footer={<button>Action</button>}
          aria-label="Test card"
        >
          Accessible content
        </Card>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', () => {
      renderWithTheme(
        <Card
          header={<h2>Header</h2>}
          footer={<button>Action</button>}
        >
          Content
        </Card>
      );

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('handles custom ARIA attributes', () => {
      renderWithTheme(
        <Card
          role="region"
          aria-label="Custom region"
        >
          Content
        </Card>
      );
      
      const card = screen.getByRole('region');
      expect(card).toHaveAttribute('aria-label', 'Custom region');
    });
  });

  // Error boundary tests
  describe('error handling', () => {
    const originalError = console.error;
    beforeAll(() => {
      console.error = jest.fn();
    });

    afterAll(() => {
      console.error = originalError;
    });

    it('handles invalid children gracefully', () => {
      // @ts-ignore - Testing invalid props
      expect(() => renderWithTheme(<Card>{undefined}</Card>)).not.toThrow();
    });

    it('handles invalid header content gracefully', () => {
      // @ts-ignore - Testing invalid props
      expect(() => renderWithTheme(<Card header={null}>Content</Card>)).not.toThrow();
    });
  });

  // Interactive behavior tests
  describe('interactive behavior', () => {
    it('applies hover styles for elevated variant', async () => {
      renderWithTheme(
        <Card variant="elevated" elevation={1}>
          Content
        </Card>
      );
      
      const card = screen.getByRole('article');
      await userEvent.hover(card);
      
      expect(card).toHaveStyle({
        boxShadow: 'var(--shadow-lg)'
      });
    });

    it('does not apply hover styles for outlined variant', async () => {
      renderWithTheme(
        <Card variant="outlined">
          Content
        </Card>
      );
      
      const card = screen.getByRole('article');
      const initialStyles = window.getComputedStyle(card);
      
      await userEvent.hover(card);
      
      expect(card).toHaveStyle({
        boxShadow: initialStyles.boxShadow
      });
    });
  });
});