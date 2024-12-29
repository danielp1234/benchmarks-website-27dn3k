import { useDispatch } from 'react-redux'; // ^8.1.0
import { useCallback } from 'react'; // ^18.2.0
import { ToastType, showToast, hideToast } from '../../store/slices/uiSlice';

// Constants for toast configuration
const DEFAULT_TOAST_DURATION = 5000; // 5 seconds
const TOAST_POSITION_OFFSET = 16; // pixels from viewport edges
const MAX_CONCURRENT_TOASTS = 3;

/**
 * Interface for toast notification options with enhanced configuration
 */
interface ToastOptions {
  message: string;
  type: ToastType;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  dismissible?: boolean;
  autoClose?: boolean;
  ariaLive?: 'polite' | 'assertive';
}

/**
 * Interface for hook return value with typed functions
 */
interface UseToastReturn {
  showSuccessToast: (message: string, duration?: number) => void;
  showErrorToast: (message: string, duration?: number) => void;
  showWarningToast: (message: string, duration?: number) => void;
  showInfoToast: (message: string, duration?: number) => void;
  hideToast: (toastId: string) => void;
}

/**
 * Custom hook for managing toast notifications with Material Design principles
 * 
 * @returns {UseToastReturn} Object containing memoized toast management functions
 * 
 * @example
 * ```tsx
 * const { showSuccessToast, showErrorToast } = useToast();
 * 
 * // Show a success toast
 * showSuccessToast('Operation completed successfully');
 * 
 * // Show an error toast with custom duration
 * showErrorToast('Operation failed', 10000);
 * ```
 */
export const useToast = (): UseToastReturn => {
  const dispatch = useDispatch();

  /**
   * Memoized function to show a toast notification
   */
  const showToastNotification = useCallback((options: ToastOptions) => {
    const {
      message,
      type,
      duration = DEFAULT_TOAST_DURATION,
      position = 'top-right',
      dismissible = true,
      autoClose = true,
      ariaLive = type === 'error' ? 'assertive' : 'polite'
    } = options;

    // Dispatch toast action with enhanced configuration
    dispatch(showToast({
      message,
      type,
      duration,
      position,
      dismissible,
      autoClose
    }));

    // Create ARIA live region for accessibility
    const ariaContainer = document.createElement('div');
    ariaContainer.setAttribute('role', 'status');
    ariaContainer.setAttribute('aria-live', ariaLive);
    ariaContainer.style.position = 'absolute';
    ariaContainer.style.width = '1px';
    ariaContainer.style.height = '1px';
    ariaContainer.style.padding = '0';
    ariaContainer.style.margin = '-1px';
    ariaContainer.style.overflow = 'hidden';
    ariaContainer.style.clip = 'rect(0, 0, 0, 0)';
    ariaContainer.style.whiteSpace = 'nowrap';
    ariaContainer.style.border = '0';
    ariaContainer.textContent = message;

    document.body.appendChild(ariaContainer);
    setTimeout(() => document.body.removeChild(ariaContainer), duration);
  }, [dispatch]);

  /**
   * Memoized success toast function
   */
  const showSuccessToast = useCallback((message: string, duration?: number) => {
    showToastNotification({
      message,
      type: 'success',
      duration,
      ariaLive: 'polite'
    });
  }, [showToastNotification]);

  /**
   * Memoized error toast function
   */
  const showErrorToast = useCallback((message: string, duration?: number) => {
    showToastNotification({
      message,
      type: 'error',
      duration,
      ariaLive: 'assertive',
      autoClose: false
    });
  }, [showToastNotification]);

  /**
   * Memoized warning toast function
   */
  const showWarningToast = useCallback((message: string, duration?: number) => {
    showToastNotification({
      message,
      type: 'warning',
      duration,
      ariaLive: 'polite'
    });
  }, [showToastNotification]);

  /**
   * Memoized info toast function
   */
  const showInfoToast = useCallback((message: string, duration?: number) => {
    showToastNotification({
      message,
      type: 'info',
      duration,
      ariaLive: 'polite'
    });
  }, [showToastNotification]);

  /**
   * Memoized hide toast function
   */
  const hideToastNotification = useCallback((toastId: string) => {
    dispatch(hideToast(toastId));
  }, [dispatch]);

  return {
    showSuccessToast,
    showErrorToast,
    showWarningToast,
    showInfoToast,
    hideToast: hideToastNotification
  };
};

export default useToast;