import React, { createRef } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/extend-expect';
import Modal from './Modal';

// Mock ResizeObserver for responsive tests
const mockResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
global.ResizeObserver = mockResizeObserver;

// Helper function to setup tests
interface SetupProps {
  isOpen?: boolean;
  size?: 'small' | 'medium' | 'large';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
}

const setup = async (props: SetupProps = {}) => {
  const user = userEvent.setup();
  const onClose = jest.fn();
  const onAnimationComplete = jest.fn();
  const defaultProps = {
    isOpen: true,
    onClose,
    title: 'Test Modal',
    children: <div>Modal content</div>,
    onAnimationComplete,
    ...props
  };

  const { container, rerender } = render(<Modal {...defaultProps} />);
  
  return {
    user,
    container,
    onClose,
    onAnimationComplete,
    rerender: (newProps: Partial<typeof defaultProps>) => 
      rerender(<Modal {...defaultProps} {...newProps} />),
  };
};

// Helper to set viewport size
const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: height, writable: true });
  window.dispatchEvent(new Event('resize'));
};

describe('Modal Component', () => {
  beforeEach(() => {
    // Reset viewport to desktop size
    setViewport(1024, 768);
  });

  describe('Rendering', () => {
    it('renders correctly when isOpen is true', async () => {
      const { container } = await setup();
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
      expect(container.firstChild).toHaveAttribute('role', 'presentation');
    });

    it('does not render when isOpen is false', async () => {
      const { container } = await setup({ isOpen: false });
      expect(container.firstChild).toBeNull();
    });

    it('applies correct size classes', async () => {
      const { rerender } = await setup({ size: 'small' });
      expect(screen.getByRole('dialog')).toHaveStyle({ maxWidth: '400px' });

      rerender({ size: 'large' });
      expect(screen.getByRole('dialog')).toHaveStyle({ maxWidth: '800px' });
    });
  });

  describe('Accessibility', () => {
    it('manages focus trap correctly', async () => {
      const buttonRef = createRef<HTMLButtonElement>();
      const { user } = await setup({
        initialFocusRef: buttonRef,
        children: (
          <>
            <button ref={buttonRef}>First</button>
            <button>Second</button>
            <button>Third</button>
          </>
        ),
      });

      // Check initial focus
      expect(buttonRef.current).toHaveFocus();

      // Test tab navigation
      await user.tab();
      expect(screen.getByText('Second')).toHaveFocus();

      await user.tab();
      expect(screen.getByText('Third')).toHaveFocus();

      // Test focus trap
      await user.tab();
      expect(screen.getByTestId('modal-close-button')).toHaveFocus();
    });

    it('applies correct ARIA attributes', async () => {
      await setup();
      const dialog = screen.getByRole('dialog');
      
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
      expect(screen.getByTestId('modal-close-button')).toHaveAttribute('aria-label', 'Close modal');
    });
  });

  describe('Interaction Handling', () => {
    it('calls onClose when close button is clicked', async () => {
      const { user, onClose } = await setup();
      
      await user.click(screen.getByTestId('modal-close-button'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('handles overlay clicks correctly', async () => {
      const { user, onClose } = await setup({ closeOnOverlayClick: true });
      
      await user.click(screen.getByRole('presentation'));
      expect(onClose).toHaveBeenCalledTimes(1);

      // Should not call onClose when closeOnOverlayClick is false
      const { onClose: onClose2 } = await setup({ closeOnOverlayClick: false });
      await user.click(screen.getByRole('presentation'));
      expect(onClose2).not.toHaveBeenCalled();
    });

    it('handles keyboard events correctly', async () => {
      const { onClose } = await setup({ closeOnEscape: true });
      
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);

      // Should not call onClose when closeOnEscape is false
      const { onClose: onClose2 } = await setup({ closeOnEscape: false });
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose2).not.toHaveBeenCalled();
    });
  });

  describe('Animation and Mobile Behavior', () => {
    it('triggers animation completion callback', async () => {
      const { onAnimationComplete } = await setup();
      
      await waitFor(() => {
        expect(onAnimationComplete).toHaveBeenCalledWith('opened');
      }, { timeout: 300 });
    });

    it('handles touch events on mobile', async () => {
      setViewport(375, 667);
      const { container, onClose } = await setup();
      
      const dialog = screen.getByRole('dialog');
      
      // Simulate swipe down gesture
      fireEvent.touchStart(dialog, { touches: [{ clientY: 0 }] });
      fireEvent.touchMove(dialog, { touches: [{ clientY: 150 }] });
      fireEvent.touchEnd(dialog);
      
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Responsive Behavior', () => {
    it('adapts to mobile viewport', async () => {
      setViewport(375, 667);
      await setup();
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveStyle({
        width: '100%',
        height: '100%',
        borderRadius: '0'
      });
    });

    it('handles safe area insets', async () => {
      // Mock safe area insets
      document.documentElement.style.setProperty('--safe-area-inset-top', '20px');
      document.documentElement.style.setProperty('--safe-area-inset-bottom', '34px');
      
      await setup();
      const header = screen.getByRole('heading', { level: 2 }).parentElement;
      expect(header).toHaveStyle({ paddingTop: 'max(var(--spacing-lg), 20px)' });
    });
  });
});