import { render, screen, waitFor } from '@testing-library/react'; // ^14.0.0
import userEvent from '@testing-library/user-event'; // ^14.0.0
import { Provider } from 'react-redux'; // ^8.1.0
import { configureStore } from '@reduxjs/toolkit'; // ^1.9.5
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'; // ^29.0.0

import Toast from './Toast';
import { useToast } from '../../../hooks/useToast';
import uiReducer, { UIState } from '../../../store/slices/uiSlice';

// Helper function to render components with Redux store
const renderWithRedux = (
  component: JSX.Element,
  initialState: Partial<UIState> = {}
) => {
  const store = configureStore({
    reducer: {
      ui: uiReducer
    },
    preloadedState: {
      ui: {
        toasts: [],
        isLoading: false,
        isFilterPanelOpen: false,
        isMobileView: false,
        activeModal: null,
        filterPanelPosition: 'left',
        collapsedSections: [],
        activeBreakpoint: 'desktop',
        ...initialState
      }
    }
  });

  return {
    ...render(<Provider store={store}>{component}</Provider>),
    store
  };
};

describe('Toast Component', () => {
  // Mock IntersectionObserver
  beforeEach(() => {
    global.IntersectionObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn()
    }));
  });

  // Clean up after each test
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('Rendering and Styling', () => {
    it('renders success toast with correct styling and accessibility attributes', () => {
      const { store } = renderWithRedux(<Toast />);
      const { showSuccessToast } = useToast();
      
      showSuccessToast('Operation successful');
      
      const toast = screen.getByRole('alert');
      expect(toast).toBeInTheDocument();
      expect(toast).toHaveAttribute('aria-live', 'polite');
      expect(toast).toHaveClass('success');
      expect(screen.getByText('Operation successful')).toBeInTheDocument();
      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('renders error toast with assertive aria-live', () => {
      const { store } = renderWithRedux(<Toast />);
      const { showErrorToast } = useToast();
      
      showErrorToast('Operation failed');
      
      const toast = screen.getByRole('alert');
      expect(toast).toHaveAttribute('aria-live', 'assertive');
      expect(toast).toHaveClass('error');
    });
  });

  describe('Animation and Timing', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('handles entrance and exit animations', async () => {
      const { store } = renderWithRedux(<Toast />);
      const { showSuccessToast } = useToast();
      
      showSuccessToast('Animated toast');
      
      const toast = screen.getByRole('alert');
      expect(toast).toHaveStyle({ animation: expect.stringContaining('slideIn') });
      
      // Trigger dismiss
      const dismissButton = screen.getByLabelText('Dismiss notification');
      await userEvent.click(dismissButton);
      
      expect(toast).toHaveStyle({ animation: expect.stringContaining('slideOut') });
    });

    it('respects reduced motion preferences', () => {
      const mockMatchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn()
      }));
      
      window.matchMedia = mockMatchMedia;
      
      const { store } = renderWithRedux(<Toast />);
      const { showSuccessToast } = useToast();
      
      showSuccessToast('No animation toast');
      
      const toast = screen.getByRole('alert');
      expect(toast).toHaveStyle({ animation: 'none' });
    });
  });

  describe('Multiple Toast Management', () => {
    it('stacks multiple toasts with correct spacing and z-index', async () => {
      const { store } = renderWithRedux(<Toast />);
      const { showSuccessToast, showErrorToast } = useToast();
      
      showSuccessToast('First toast');
      showErrorToast('Second toast');
      
      const toasts = screen.getAllByRole('alert');
      expect(toasts).toHaveLength(2);
      expect(toasts[0]).toHaveStyle({ 
        zIndex: expect.stringMatching(/\d+/),
        marginBottom: '8px'
      });
    });

    it('removes toasts independently', async () => {
      const { store } = renderWithRedux(<Toast />);
      const { showSuccessToast } = useToast();
      
      showSuccessToast('Toast 1');
      showSuccessToast('Toast 2');
      
      const dismissButtons = screen.getAllByLabelText('Dismiss notification');
      await userEvent.click(dismissButtons[0]);
      
      await waitFor(() => {
        expect(screen.getAllByRole('alert')).toHaveLength(1);
        expect(screen.getByText('Toast 2')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Features', () => {
    it('supports keyboard navigation and dismissal', async () => {
      const { store } = renderWithRedux(<Toast />);
      const { showSuccessToast } = useToast();
      
      showSuccessToast('Keyboard accessible toast');
      
      const toast = screen.getByRole('alert');
      const dismissButton = screen.getByLabelText('Dismiss notification');
      
      // Tab to dismiss button
      await userEvent.tab();
      expect(dismissButton).toHaveFocus();
      
      // Dismiss with keyboard
      await userEvent.keyboard('{Enter}');
      await waitFor(() => {
        expect(toast).not.toBeInTheDocument();
      });
    });

    it('announces toast messages to screen readers', async () => {
      const { store } = renderWithRedux(<Toast />);
      const { showErrorToast } = useToast();
      
      showErrorToast('Critical error message');
      
      const liveRegion = screen.getByRole('alert');
      expect(liveRegion).toHaveAttribute('aria-live', 'assertive');
      expect(liveRegion).toHaveTextContent('Critical error message');
    });
  });

  describe('Redux Integration', () => {
    it('updates store state when showing and hiding toasts', async () => {
      const { store } = renderWithRedux(<Toast />);
      const { showSuccessToast } = useToast();
      
      showSuccessToast('Redux toast');
      
      expect(store.getState().ui.toasts).toHaveLength(1);
      expect(store.getState().ui.toasts[0]).toMatchObject({
        message: 'Redux toast',
        type: 'success'
      });
      
      const dismissButton = screen.getByLabelText('Dismiss notification');
      await userEvent.click(dismissButton);
      
      await waitFor(() => {
        expect(store.getState().ui.toasts).toHaveLength(0);
      });
    });

    it('handles concurrent toast operations correctly', async () => {
      const { store } = renderWithRedux(<Toast />);
      const { showSuccessToast, showErrorToast } = useToast();
      
      // Show multiple toasts rapidly
      showSuccessToast('First');
      showErrorToast('Second');
      showSuccessToast('Third');
      
      expect(store.getState().ui.toasts).toHaveLength(3);
      
      // Verify order and types
      const toasts = screen.getAllByRole('alert');
      expect(toasts).toHaveLength(3);
      expect(toasts[0]).toHaveTextContent('First');
      expect(toasts[1]).toHaveTextContent('Second');
      expect(toasts[2]).toHaveTextContent('Third');
    });
  });
});