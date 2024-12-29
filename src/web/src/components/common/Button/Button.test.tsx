import React from 'react';
import { render, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from 'styled-components';
import Button from './Button';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock theme for styled-components
const mockTheme = {
  colors: {
    primary: '#1976d2',
    secondary: '#dc004e',
    white: '#ffffff',
  },
  transitions: {
    normal: '0.2s ease-in-out',
  },
};

// Helper to render with theme
const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider theme={mockTheme}>
      {ui}
    </ThemeProvider>
  );
};

// Setup function for user-event
const setup = () => {
  const user = userEvent.setup();
  return { user };
};

describe('Button Component', () => {
  describe('Rendering', () => {
    it('renders correctly with default props', () => {
      renderWithTheme(<Button>Click me</Button>);
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('type', 'button');
      expect(button).toHaveAttribute('tabindex', '0');
    });

    it('renders all variant styles correctly', () => {
      const variants = ['primary', 'secondary', 'outlined', 'text'] as const;
      variants.forEach(variant => {
        renderWithTheme(<Button variant={variant}>Button</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('data-variant', variant);
      });
    });

    it('renders all size variations correctly', () => {
      const sizes = ['small', 'medium', 'large'] as const;
      sizes.forEach(size => {
        renderWithTheme(<Button size={size}>Button</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('data-size', size);
      });
    });

    it('renders in full width mode when specified', () => {
      renderWithTheme(<Button fullWidth>Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ width: '100%' });
    });

    it('renders with icons correctly', () => {
      const TestIcon = () => <svg data-testid="test-icon" />;
      renderWithTheme(
        <Button startIcon={<TestIcon />} endIcon={<TestIcon />}>
          Button
        </Button>
      );
      const button = screen.getByRole('button');
      const icons = within(button).getAllByTestId('test-icon');
      expect(icons).toHaveLength(2);
    });
  });

  describe('States', () => {
    it('handles disabled state correctly', () => {
      renderWithTheme(<Button disabled>Disabled Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('handles loading state correctly', () => {
      renderWithTheme(<Button loading>Loading Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('maintains focus styles when focused', async () => {
      const { user } = setup();
      renderWithTheme(<Button>Focus Button</Button>);
      const button = screen.getByRole('button');
      await user.tab();
      expect(button).toHaveFocus();
      expect(button).toHaveStyleRule('outline', '2px solid var(--color-focus)', {
        modifier: ':focus-visible'
      });
    });
  });

  describe('Interactions', () => {
    it('calls onClick handler when clicked', async () => {
      const { user } = setup();
      const handleClick = jest.fn();
      renderWithTheme(<Button onClick={handleClick}>Click Button</Button>);
      const button = screen.getByRole('button');
      await user.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('handles keyboard interactions correctly', async () => {
      const { user } = setup();
      const handleClick = jest.fn();
      renderWithTheme(<Button onClick={handleClick}>Keyboard Button</Button>);
      const button = screen.getByRole('button');
      await user.tab();
      expect(button).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('prevents click when disabled', async () => {
      const { user } = setup();
      const handleClick = jest.fn();
      renderWithTheme(
        <Button onClick={handleClick} disabled>
          Disabled Button
        </Button>
      );
      const button = screen.getByRole('button');
      await user.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG accessibility requirements', async () => {
      const { container } = renderWithTheme(<Button>Accessible Button</Button>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has correct ARIA attributes', () => {
      renderWithTheme(
        <Button
          ariaLabel="Custom Label"
          ariaDescribedBy="desc"
          ariaExpanded={true}
          ariaControls="menu"
        >
          ARIA Button
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom Label');
      expect(button).toHaveAttribute('aria-describedby', 'desc');
      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(button).toHaveAttribute('aria-controls', 'menu');
    });

    it('supports reduced motion preferences', () => {
      renderWithTheme(<Button>Motion Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveStyleRule('transition', 'none', {
        media: '(prefers-reduced-motion: reduce)'
      });
    });
  });

  describe('RTL Support', () => {
    beforeEach(() => {
      document.dir = 'rtl';
    });

    afterEach(() => {
      document.dir = 'ltr';
    });

    it('renders correctly in RTL mode', () => {
      const TestIcon = () => <svg data-testid="test-icon" />;
      renderWithTheme(
        <Button startIcon={<TestIcon />}>
          RTL Button
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('dir', 'rtl');
      const buttonContent = within(button).getByText('RTL Button').parentElement;
      expect(buttonContent).toHaveAttribute('dir', 'rtl');
    });
  });
});