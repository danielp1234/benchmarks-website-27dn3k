import { configureStore } from '@reduxjs/toolkit'; // ^2.0.0
import { describe, it, expect, beforeEach, jest } from '@jest/globals'; // ^29.0.0
import uiReducer, { 
  uiActions, 
  UIState,
  Toast,
  selectToasts,
  selectIsLoading,
  selectIsFilterPanelOpen,
  selectIsMobileView,
  selectActiveModal,
  selectFilterPanelPosition,
  selectCollapsedSections,
  selectActiveBreakpoint
} from '../../../src/store/slices/uiSlice';

// Helper function to create a typed test store
const createTestStore = (initialState?: Partial<UIState>) => {
  return configureStore({
    reducer: {
      ui: uiReducer
    },
    preloadedState: {
      ui: {
        isLoading: false,
        toasts: [],
        isFilterPanelOpen: true,
        isMobileView: false,
        activeModal: null,
        filterPanelPosition: 'left',
        collapsedSections: [],
        activeBreakpoint: 'desktop',
        ...initialState
      }
    }
  });
};

describe('uiSlice', () => {
  // Mock DOM methods and timers
  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '';
    // Mock crypto.randomUUID
    global.crypto = {
      randomUUID: () => 'test-uuid'
    } as any;
  });

  describe('Initial State', () => {
    it('should have correct default values', () => {
      const store = createTestStore();
      const state = store.getState().ui;

      expect(state.isLoading).toBe(false);
      expect(state.toasts).toEqual([]);
      expect(state.isFilterPanelOpen).toBe(true);
      expect(state.isMobileView).toBe(false);
      expect(state.activeModal).toBeNull();
      expect(state.filterPanelPosition).toBe('left');
      expect(state.collapsedSections).toEqual([]);
      expect(state.activeBreakpoint).toBe('desktop');
    });
  });

  describe('Toast Management', () => {
    const mockToast: Omit<Toast, 'id'> = {
      message: 'Test message',
      type: 'success',
      duration: 3000,
      autoClose: true,
      position: 'top-right',
      dismissible: true
    };

    it('should add toast with correct properties', () => {
      const store = createTestStore();
      store.dispatch(uiActions.showToast(mockToast));

      const toasts = selectToasts(store.getState());
      expect(toasts).toHaveLength(1);
      expect(toasts[0]).toEqual({
        ...mockToast,
        id: 'test-uuid'
      });
    });

    it('should handle auto-dismissing toasts', () => {
      const store = createTestStore();
      store.dispatch(uiActions.showToast(mockToast));

      // Verify toast is added
      expect(selectToasts(store.getState())).toHaveLength(1);

      // Fast-forward timer
      jest.advanceTimersByTime(mockToast.duration);

      // Verify custom event was dispatched
      const dispatchEventSpy = jest.spyOn(document, 'dispatchEvent');
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.any(CustomEvent)
      );
    });

    it('should handle manual toast dismissal', () => {
      const store = createTestStore();
      store.dispatch(uiActions.showToast(mockToast));
      store.dispatch(uiActions.hideToast('test-uuid'));

      expect(selectToasts(store.getState())).toHaveLength(0);
    });

    it('should create accessibility announcements', () => {
      const store = createTestStore();
      store.dispatch(uiActions.showToast(mockToast));

      const announcement = document.querySelector('[role="status"]');
      expect(announcement).toBeTruthy();
      expect(announcement?.textContent).toBe(mockToast.message);
    });
  });

  describe('Loading State', () => {
    it('should update loading state and aria-busy attribute', () => {
      const store = createTestStore();
      store.dispatch(uiActions.setLoading(true));

      expect(selectIsLoading(store.getState())).toBe(true);
      expect(document.body.getAttribute('aria-busy')).toBe('true');

      store.dispatch(uiActions.setLoading(false));
      expect(document.body.getAttribute('aria-busy')).toBe('false');
    });
  });

  describe('Filter Panel', () => {
    it('should toggle filter panel visibility', () => {
      const store = createTestStore();
      store.dispatch(uiActions.toggleFilterPanel());

      expect(selectIsFilterPanelOpen(store.getState())).toBe(false);
      expect(document.body.getAttribute('data-filter-panel')).toBe('false');
    });

    it('should handle mobile view focus management', () => {
      const mockFilterPanel = document.createElement('div');
      mockFilterPanel.setAttribute('data-testid', 'filter-panel');
      document.body.appendChild(mockFilterPanel);

      const store = createTestStore({ isMobileView: true });
      const focusSpy = jest.spyOn(mockFilterPanel, 'focus');

      store.dispatch(uiActions.toggleFilterPanel());
      expect(focusSpy).toHaveBeenCalled();
    });
  });

  describe('Mobile View', () => {
    it('should update mobile view state and breakpoint', () => {
      const store = createTestStore();
      store.dispatch(uiActions.setMobileView({ 
        isMobile: true, 
        breakpoint: 'mobile' 
      }));

      expect(selectIsMobileView(store.getState())).toBe(true);
      expect(selectActiveBreakpoint(store.getState())).toBe('mobile');
      expect(document.documentElement.getAttribute('data-breakpoint')).toBe('mobile');
    });

    it('should close filter panel when switching to mobile', () => {
      const store = createTestStore({ isFilterPanelOpen: true });
      store.dispatch(uiActions.setMobileView({ 
        isMobile: true, 
        breakpoint: 'mobile' 
      }));

      expect(selectIsFilterPanelOpen(store.getState())).toBe(false);
    });
  });

  describe('Modal Management', () => {
    beforeEach(() => {
      const modal1 = document.createElement('div');
      modal1.id = 'modal-1';
      const modal2 = document.createElement('div');
      modal2.id = 'modal-2';
      document.body.appendChild(modal1);
      document.body.appendChild(modal2);
    });

    it('should manage modal visibility and attributes', () => {
      const store = createTestStore();
      
      // Open first modal
      store.dispatch(uiActions.setActiveModal('modal-1'));
      expect(selectActiveModal(store.getState())).toBe('modal-1');
      expect(document.body.style.overflow).toBe('hidden');
      expect(document.getElementById('modal-1')?.getAttribute('aria-hidden')).toBe('false');

      // Switch to second modal
      store.dispatch(uiActions.setActiveModal('modal-2'));
      expect(document.getElementById('modal-1')?.getAttribute('aria-hidden')).toBe('true');
      expect(document.getElementById('modal-2')?.getAttribute('aria-hidden')).toBe('false');

      // Close modal
      store.dispatch(uiActions.setActiveModal(null));
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Section Management', () => {
    it('should toggle section collapse state', () => {
      const store = createTestStore();
      const sectionId = 'test-section';

      store.dispatch(uiActions.toggleSection(sectionId));
      expect(selectCollapsedSections(store.getState())).toContain(sectionId);

      store.dispatch(uiActions.toggleSection(sectionId));
      expect(selectCollapsedSections(store.getState())).not.toContain(sectionId);
    });
  });

  describe('Filter Panel Position', () => {
    it('should update filter panel position', () => {
      const store = createTestStore();
      store.dispatch(uiActions.setFilterPanelPosition('right'));

      expect(selectFilterPanelPosition(store.getState())).toBe('right');
    });
  });
});