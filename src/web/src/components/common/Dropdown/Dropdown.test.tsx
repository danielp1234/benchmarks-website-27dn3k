import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { axe, toHaveNoViolations } from 'jest-axe';
import Dropdown from './Dropdown';

expect.extend(toHaveNoViolations);

// Test data
const testOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3', disabled: true },
  { value: 'option4', label: 'Option 4' }
];

// Default props for testing
const defaultProps = {
  options: testOptions,
  value: '',
  onChange: jest.fn(),
  placeholder: 'Select an option',
  id: 'test-dropdown',
  'aria-label': 'Test Dropdown'
};

// Helper function to render dropdown with custom props
const renderDropdown = (props = {}) => {
  const user = userEvent.setup();
  return {
    user,
    ...render(<Dropdown {...defaultProps} {...props} />)
  };
};

describe('Dropdown Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with placeholder text when no value is selected', () => {
      renderDropdown();
      expect(screen.getByRole('button')).toHaveTextContent('Select an option');
    });

    it('renders with selected value', () => {
      renderDropdown({ value: 'option1' });
      expect(screen.getByRole('button')).toHaveTextContent('Option 1');
    });

    it('renders in disabled state', () => {
      renderDropdown({ disabled: true });
      const trigger = screen.getByRole('button');
      expect(trigger).toBeDisabled();
      expect(trigger).toHaveAttribute('aria-disabled', 'true');
    });

    it('renders with error state', () => {
      const errorMessage = 'Required field';
      renderDropdown({ error: errorMessage });
      expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
      expect(screen.getByRole('button')).toHaveAttribute('aria-invalid', 'true');
    });

    it('renders with RTL support', () => {
      renderDropdown({ direction: 'rtl' });
      const container = screen.getByRole('button').parentElement;
      expect(container).toHaveStyle({ direction: 'rtl' });
    });
  });

  describe('Interaction', () => {
    it('opens menu on click', async () => {
      const { user } = renderDropdown();
      const trigger = screen.getByRole('button');
      
      await user.click(trigger);
      
      const menu = screen.getByRole('listbox');
      expect(menu).toBeVisible();
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('selects option on click', async () => {
      const onChange = jest.fn();
      const { user } = renderDropdown({ onChange });
      
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByRole('option', { name: 'Option 1' }));
      
      expect(onChange).toHaveBeenCalledWith('option1', expect.any(Object));
      expect(screen.getByRole('listbox')).not.toBeVisible();
    });

    it('handles disabled options', async () => {
      const onChange = jest.fn();
      const { user } = renderDropdown({ onChange });
      
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByRole('option', { name: 'Option 3' }));
      
      expect(onChange).not.toHaveBeenCalled();
    });

    it('supports multiple selection', async () => {
      const onChange = jest.fn();
      const { user } = renderDropdown({ 
        multiple: true, 
        value: ['option1'],
        onChange 
      });
      
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByRole('option', { name: 'Option 2' }));
      
      expect(onChange).toHaveBeenCalledWith(
        ['option1', 'option2'],
        expect.any(Object)
      );
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports arrow key navigation', async () => {
      const { user } = renderDropdown();
      const trigger = screen.getByRole('button');
      
      await user.click(trigger);
      await user.keyboard('[ArrowDown]');
      
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'false');
      expect(options[0]).toHaveStyle({ background: 'var(--neutral-100)' });
    });

    it('supports enter key selection', async () => {
      const onChange = jest.fn();
      const { user } = renderDropdown({ onChange });
      
      await user.click(screen.getByRole('button'));
      await user.keyboard('[ArrowDown][Enter]');
      
      expect(onChange).toHaveBeenCalledWith('option1', expect.any(Object));
    });

    it('closes on escape key', async () => {
      const { user } = renderDropdown();
      
      await user.click(screen.getByRole('button'));
      await user.keyboard('[Escape]');
      
      expect(screen.getByRole('listbox')).not.toBeVisible();
    });
  });

  describe('Search Functionality', () => {
    it('filters options based on search input', async () => {
      const { user } = renderDropdown({ searchable: true });
      
      await user.click(screen.getByRole('button'));
      await user.type(screen.getByRole('textbox', { name: 'Search options' }), 'Option 1');
      
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveTextContent('Option 1');
    });

    it('shows no results message when search has no matches', async () => {
      const { user } = renderDropdown({ searchable: true });
      
      await user.click(screen.getByRole('button'));
      await user.type(screen.getByRole('textbox', { name: 'Search options' }), 'xyz');
      
      expect(screen.queryByRole('option')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG accessibility guidelines', async () => {
      const { container } = renderDropdown();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports screen reader announcements', async () => {
      const { user } = renderDropdown();
      
      await user.click(screen.getByRole('button'));
      
      expect(screen.getByRole('listbox')).toHaveAttribute('aria-label', 'Select an option');
      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    });

    it('maintains focus management', async () => {
      const { user } = renderDropdown();
      const trigger = screen.getByRole('button');
      
      await user.tab();
      expect(trigger).toHaveFocus();
      
      await user.keyboard('[Enter]');
      const menu = screen.getByRole('listbox');
      expect(menu).toBeVisible();
      
      await user.keyboard('[Escape]');
      expect(trigger).toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('uses virtualization for large option lists', async () => {
      const manyOptions = Array.from({ length: 1000 }, (_, i) => ({
        value: `option${i}`,
        label: `Option ${i}`
      }));
      
      const { user } = renderDropdown({ options: manyOptions });
      await user.click(screen.getByRole('button'));
      
      const menu = screen.getByRole('listbox');
      const renderedOptions = within(menu).getAllByRole('option');
      
      // Should only render visible options plus overscan
      expect(renderedOptions.length).toBeLessThan(manyOptions.length);
    });
  });
});