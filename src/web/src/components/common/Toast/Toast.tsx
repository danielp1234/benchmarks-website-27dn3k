import React, { useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { ToastContainer, ToastWrapper } from './Toast.styles';
import { useToast } from '../../../hooks/useToast';
import { selectToasts } from '../../../store/slices/uiSlice';
import type { Toast as ToastType } from '../../../store/slices/uiSlice';

// Constants for animations and layout
const TOAST_ANIMATION_DURATION = 300;
const TOAST_STACK_SPACING = 8;
const TOAST_Z_INDEX = 1000;

// Icons for different toast types
const ToastIcons = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ'
} as const;

interface ToastProps extends ToastType {
  onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = ({
  id,
  message,
  type,
  duration,
  position,
  dismissible,
  onDismiss
}) => {
  const toastRef = useRef<HTMLDivElement>(null);
  const dismissTimeoutRef = useRef<NodeJS.Timeout>();
  const isExitingRef = useRef(false);

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Handle keyboard interactions
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && dismissible) {
      onDismiss();
    }
  }, [dismissible, onDismiss]);

  // Set up auto-dismiss
  useEffect(() => {
    if (duration && !isExitingRef.current) {
      dismissTimeoutRef.current = setTimeout(() => {
        isExitingRef.current = true;
        onDismiss();
      }, duration);
    }

    return () => {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }
    };
  }, [duration, onDismiss]);

  // Set up keyboard listener
  useEffect(() => {
    const toastElement = toastRef.current;
    if (toastElement) {
      toastElement.addEventListener('keydown', handleKeyDown);
      // Focus management
      toastElement.focus();
    }

    return () => {
      if (toastElement) {
        toastElement.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [handleKeyDown]);

  return (
    <ToastWrapper
      ref={toastRef}
      type={type}
      isExiting={isExitingRef.current}
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      tabIndex={0}
      data-testid={`toast-${id}`}
    >
      <span className="toast-icon" aria-hidden="true">
        {ToastIcons[type]}
      </span>
      <span className="toast-message">{message}</span>
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="toast-dismiss"
        >
          ✕
        </button>
      )}
    </ToastWrapper>
  );
};

export const ToastContainer: React.FC = () => {
  const toasts = useSelector(selectToasts);
  const { hideToast } = useToast();

  // Handle toast dismissal with animation
  const handleDismiss = useCallback((toastId: string) => {
    const toast = document.querySelector(`[data-testid="toast-${toastId}"]`);
    if (toast) {
      toast.classList.add('exiting');
      setTimeout(() => {
        hideToast(toastId);
      }, TOAST_ANIMATION_DURATION);
    }
  }, [hideToast]);

  return (
    <ToastContainer
      role="region"
      aria-label="Notifications"
      style={{ 
        '--toast-stack-spacing': `${TOAST_STACK_SPACING}px`,
        '--toast-z-index': TOAST_Z_INDEX 
      } as React.CSSProperties}
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onDismiss={() => handleDismiss(toast.id)}
        />
      ))}
    </ToastContainer>
  );
};

export default Toast;