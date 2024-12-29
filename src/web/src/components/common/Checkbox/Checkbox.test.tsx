import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals';
import Checkbox from './Checkbox';

describe('Checkbox Component', () => {
  // Mock handlers
  const mockOnChange = jest.fn();
  
  // Common props
  const defaultProps = {
    id: 'test-checkbox',
    name: 'test-checkbox',
    checked: false,
    onChange: mockOnChange,
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders in unchecked state by default', () => {
      render(<Checkbox {...defaultProps} />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('renders in checked state when specified', () => {
      render(<Checkbox {...defaultProps} checked={true} />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('renders in all size variants correctly', () => {
      const { rerender } = render(<Checkbox {...defaultProps} size="small" />);
      let checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('size', 'small');

      rerender(<Checkbox {...defaultProps} size="medium" />);
      checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('size', 'medium');

      rerender(<Checkbox {...defaultProps} size="large" />);
      checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('size', 'large');
    });

    it('renders label when provided', () => {
      const label = 'Test Label';
      render(<Checkbox {...defaultProps} label={label} />);
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    });

    it('renders error state correctly', () => {
      const errorMessage = 'Error message';
      render(<Checkbox {...defaultProps} error={true} errorMessage={errorMessage} />);
      const checkbox = screen.getByRole('checkbox');
      const errorText = screen.getByRole('alert');
      
      expect(checkbox).toHaveAttribute('aria-invalid', 'true');
      expect(errorText).toHaveTextContent(errorMessage);
    });

    it('renders required indicator when specified', () => {
      render(<Checkbox {...defaultProps} required={true} label="Required Field" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-required', 'true');
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG keyboard accessibility requirements', async () => {
      render(<Checkbox {...defaultProps} label="Accessible Checkbox" />);
      const checkbox = screen.getByRole('checkbox');

      // Test keyboard focus
      checkbox.focus();
      expect(checkbox).toHaveFocus();

      // Test space key interaction
      await userEvent.keyboard(' ');
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('has correct ARIA attributes', () => {
      render(
        <Checkbox
          {...defaultProps}
          checked={true}
          disabled={true}
          error={true}
          required={true}
          ariaLabel="Custom ARIA Label"
        />
      );
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-checked', 'true');
      expect(checkbox).toHaveAttribute('aria-disabled', 'true');
      expect(checkbox).toHaveAttribute('aria-invalid', 'true');
      expect(checkbox).toHaveAttribute('aria-required', 'true');
      expect(checkbox).toHaveAttribute('aria-label', 'Custom ARIA Label');
    });

    it('associates error message with checkbox using aria-describedby', () => {
      render(
        <Checkbox
          {...defaultProps}
          error={true}
          errorMessage="Error message"
        />
      );
      
      const checkbox = screen.getByRole('checkbox');
      const errorId = `${defaultProps.id}-error`;
      expect(checkbox).toHaveAttribute('aria-describedby', errorId);
    });
  });

  describe('User Interactions', () => {
    it('handles click events correctly', async () => {
      render(<Checkbox {...defaultProps} />);
      const checkbox = screen.getByRole('checkbox');

      await userEvent.click(checkbox);
      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange.mock.calls[0][0].target.checked).toBe(true);
    });

    it('prevents interaction when disabled', async () => {
      render(<Checkbox {...defaultProps} disabled={true} />);
      const checkbox = screen.getByRole('checkbox');

      await userEvent.click(checkbox);
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('handles rapid toggles correctly', async () => {
      render(<Checkbox {...defaultProps} />);
      const checkbox = screen.getByRole('checkbox');

      await userEvent.tripleClick(checkbox);
      expect(mockOnChange).toHaveBeenCalledTimes(3);
    });

    it('maintains focus after state change', async () => {
      render(<Checkbox {...defaultProps} />);
      const checkbox = screen.getByRole('checkbox');

      await userEvent.click(checkbox);
      expect(checkbox).toHaveFocus();
    });
  });

  describe('Material Design Compliance', () => {
    it('applies correct size classes based on Material Design specs', () => {
      const { rerender } = render(<Checkbox {...defaultProps} size="small" />);
      let checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveStyle({ width: '16px', height: '16px' });

      rerender(<Checkbox {...defaultProps} size="medium" />);
      checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveStyle({ width: '20px', height: '20px' });

      rerender(<Checkbox {...defaultProps} size="large" />);
      checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveStyle({ width: '24px', height: '24px' });
    });

    it('applies correct touch target size for accessibility', () => {
      render(<Checkbox {...defaultProps} />);
      const container = screen.getByRole('checkbox').parentElement;
      expect(container).toHaveStyleRule('min-height', '48px'); // Material Design minimum touch target
    });

    it('applies correct focus styles', async () => {
      render(<Checkbox {...defaultProps} />);
      const checkbox = screen.getByRole('checkbox');

      await userEvent.tab();
      expect(checkbox).toHaveStyleRule('box-shadow', expect.stringContaining('var(--primary-color)'));
    });
  });
});