import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from '@mui/material';
import { FormProvider, useForm } from 'react-hook-form';
import Input from './Input';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock matchMedia for responsive tests
const mockMatchMedia = () => ({
  matches: false,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
});

// Helper function to render Input with theme
const renderInput = async (props = {}, formContext = null) => {
  const user = userEvent.setup();
  
  window.matchMedia = window.matchMedia || mockMatchMedia;
  
  const FormWrapper = ({ children }) => {
    const methods = useForm();
    if (!formContext) return children;
    return <FormProvider {...methods}>{children}</FormProvider>;
  };

  const result = render(
    <ThemeProvider theme={{}}>
      <FormWrapper>
        <Input
          name="testInput"
          label="Test Input"
          {...props}
        />
      </FormWrapper>
    </ThemeProvider>
  );

  return { ...result, user };
};

describe('Input Component', () => {
  // Mock handlers
  const mockOnChange = jest.fn();
  const mockOnFocus = jest.fn();
  const mockOnBlur = jest.fn();

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup after each test
    jest.resetAllMocks();
  });

  describe('Rendering and Styling', () => {
    it('renders with proper Material Design styling', async () => {
      const { container } = await renderInput();
      
      const input = screen.getByRole('textbox');
      const styles = window.getComputedStyle(input);

      expect(styles.height).toBe('48px');
      expect(styles.borderRadius).toBe('var(--border-radius-md)');
      expect(styles.transition).toContain('var(--transition-normal)');
    });

    it('applies fullWidth prop correctly', async () => {
      const { container } = await renderInput({ fullWidth: true });
      
      const inputContainer = container.firstChild;
      expect(inputContainer).toHaveStyle({ width: '100%' });
    });

    it('renders in disabled state correctly', async () => {
      await renderInput({ disabled: true });
      
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      expect(input).toHaveStyle({ opacity: '0.6', cursor: 'not-allowed' });
    });
  });

  describe('User Interactions', () => {
    it('handles text input correctly', async () => {
      const { user } = await renderInput({ onChange: mockOnChange });
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'test value');
      
      expect(input).toHaveValue('test value');
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('manages focus states properly', async () => {
      const { user } = await renderInput({
        onFocus: mockOnFocus,
        onBlur: mockOnBlur
      });
      
      const input = screen.getByRole('textbox');
      
      await user.click(input);
      expect(mockOnFocus).toHaveBeenCalled();
      expect(input).toHaveFocus();
      
      await user.tab();
      expect(mockOnBlur).toHaveBeenCalled();
      expect(input).not.toHaveFocus();
    });

    it('shows error state on invalid input', async () => {
      await renderInput({ error: 'Invalid input' });
      
      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent('Invalid input');
      expect(errorMessage).toHaveStyle({ color: 'var(--error-color)' });
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG 2.1 accessibility guidelines', async () => {
      const { container } = await renderInput();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper ARIA attributes', async () => {
      await renderInput({
        required: true,
        error: 'Error message'
      });
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby');
    });

    it('supports keyboard navigation', async () => {
      const { user } = await renderInput();
      
      await user.tab();
      expect(screen.getByRole('textbox')).toHaveFocus();
      
      await user.keyboard('[Space]');
      expect(screen.getByRole('textbox')).toHaveValue(' ');
    });
  });

  describe('Form Integration', () => {
    it('integrates with React Hook Form', async () => {
      const { user } = await renderInput(
        { required: true },
        { mode: 'onChange' }
      );
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'test@example.com');
      
      expect(input).toHaveValue('test@example.com');
    });

    it('validates required fields', async () => {
      const { user } = await renderInput(
        { required: true },
        { mode: 'onBlur' }
      );
      
      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('adapts to different screen sizes', async () => {
      // Mock mobile viewport
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(max-width: 768px)',
        addListener: jest.fn(),
        removeListener: jest.fn()
      }));

      const { container } = await renderInput({ fullWidth: true });
      const inputContainer = container.firstChild;
      
      expect(inputContainer).toHaveStyle({ width: '100%' });
    });

    it('maintains touch target sizes on mobile', async () => {
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(max-width: 768px)',
        addListener: jest.fn(),
        removeListener: jest.fn()
      }));

      const { container } = await renderInput();
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveStyle({ height: '48px' }); // Meets 44px minimum touch target
    });
  });
});