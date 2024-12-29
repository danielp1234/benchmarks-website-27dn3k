import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // ^2.0.0

// Toast notification interface with comprehensive configuration options
export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number;
  autoClose: boolean;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  dismissible: boolean;
}

// Comprehensive UI state interface
export interface UIState {
  isLoading: boolean;
  toasts: Toast[];
  isFilterPanelOpen: boolean;
  isMobileView: boolean;
  activeModal: string | null;
  filterPanelPosition: 'left' | 'right';
  collapsedSections: string[];
  activeBreakpoint: 'mobile' | 'tablet' | 'desktop';
}

// Initial state with sensible defaults
const initialState: UIState = {
  isLoading: false,
  toasts: [],
  isFilterPanelOpen: true,
  isMobileView: false,
  activeModal: null,
  filterPanelPosition: 'left',
  collapsedSections: [],
  activeBreakpoint: 'desktop',
};

// Create the UI slice with strongly-typed reducers
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Show toast notification with auto-dismissal support
    showToast: (state, action: PayloadAction<Omit<Toast, 'id'>>) => {
      const id = crypto.randomUUID();
      const toast: Toast = {
        id,
        duration: 5000, // Default duration
        autoClose: true,
        position: 'top-right',
        dismissible: true,
        ...action.payload,
      };
      
      state.toasts.push(toast);

      // Announce toast for screen readers
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'status');
      announcement.setAttribute('aria-live', 'polite');
      announcement.textContent = toast.message;
      document.body.appendChild(announcement);
      
      // Auto-dismiss toast if enabled
      if (toast.autoClose) {
        setTimeout(() => {
          document.dispatchEvent(new CustomEvent('hideToast', { detail: { id } }));
        }, toast.duration);
      }
    },

    // Hide toast notification
    hideToast: (state, action: PayloadAction<string>) => {
      const toastIndex = state.toasts.findIndex(toast => toast.id === action.payload);
      if (toastIndex !== -1) {
        state.toasts.splice(toastIndex, 1);
      }
    },

    // Set global loading state with debounce handling
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
      document.body.setAttribute('aria-busy', action.payload.toString());
    },

    // Toggle filter panel with responsive behavior
    toggleFilterPanel: (state) => {
      state.isFilterPanelOpen = !state.isFilterPanelOpen;

      // Handle focus trap in mobile view
      if (state.isMobileView) {
        const filterPanel = document.querySelector('[data-testid="filter-panel"]');
        if (filterPanel && state.isFilterPanelOpen) {
          (filterPanel as HTMLElement).focus();
        }
      }

      // Update ARIA attributes
      document.body.setAttribute('data-filter-panel', state.isFilterPanelOpen.toString());
    },

    // Set mobile view state with breakpoint handling
    setMobileView: (state, action: PayloadAction<{ isMobile: boolean; breakpoint: UIState['activeBreakpoint'] }>) => {
      const { isMobile, breakpoint } = action.payload;
      state.isMobileView = isMobile;
      state.activeBreakpoint = breakpoint;

      // Adjust filter panel for mobile
      if (isMobile && state.isFilterPanelOpen) {
        state.isFilterPanelOpen = false;
      }

      // Update layout attributes
      document.documentElement.setAttribute('data-breakpoint', breakpoint);
    },

    // Manage modal state with accessibility
    setActiveModal: (state, action: PayloadAction<string | null>) => {
      const previousModal = state.activeModal;
      state.activeModal = action.payload;

      // Handle modal stack management
      if (previousModal) {
        document.getElementById(previousModal)?.setAttribute('aria-hidden', 'true');
      }

      if (action.payload) {
        document.getElementById(action.payload)?.setAttribute('aria-hidden', 'false');
        // Lock body scroll
        document.body.style.overflow = 'hidden';
      } else {
        // Restore body scroll
        document.body.style.overflow = '';
      }
    },

    // Toggle section collapse state
    toggleSection: (state, action: PayloadAction<string>) => {
      const sectionIndex = state.collapsedSections.indexOf(action.payload);
      if (sectionIndex === -1) {
        state.collapsedSections.push(action.payload);
      } else {
        state.collapsedSections.splice(sectionIndex, 1);
      }
    },

    // Update filter panel position
    setFilterPanelPosition: (state, action: PayloadAction<UIState['filterPanelPosition']>) => {
      state.filterPanelPosition = action.payload;
    },
  },
});

// Export actions and reducer
export const uiActions = uiSlice.actions;
export default uiSlice.reducer;

// Type-safe selector helpers
export const selectIsLoading = (state: { ui: UIState }) => state.ui.isLoading;
export const selectToasts = (state: { ui: UIState }) => state.ui.toasts;
export const selectIsFilterPanelOpen = (state: { ui: UIState }) => state.ui.isFilterPanelOpen;
export const selectIsMobileView = (state: { ui: UIState }) => state.ui.isMobileView;
export const selectActiveModal = (state: { ui: UIState }) => state.ui.activeModal;
export const selectFilterPanelPosition = (state: { ui: UIState }) => state.ui.filterPanelPosition;
export const selectCollapsedSections = (state: { ui: UIState }) => state.ui.collapsedSections;
export const selectActiveBreakpoint = (state: { ui: UIState }) => state.ui.activeBreakpoint;