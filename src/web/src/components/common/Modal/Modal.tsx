import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusTrap } from 'focus-trap-react'; // focus-trap-react v9.0.0
import { useMediaQuery } from '@mui/material'; // @mui/material v5.0.0
import { ModalOverlay, ModalContainer, ModalHeader, ModalContent } from './Modal.styles';
import Button from '../Button/Button';

// Interface for safe area insets
interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// Enhanced props interface for Modal component
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
  returnFocusRef?: React.RefObject<HTMLElement>;
  onAnimationComplete?: (status: 'opened' | 'closed') => void;
}

/**
 * Enhanced Modal component with comprehensive accessibility features,
 * responsive design, and mobile optimization.
 * 
 * @component
 * @example
 * ```tsx
 * <Modal
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   title="Example Modal"
 *   size="medium"
 * >
 *   Modal content here
 * </Modal>
 * ```
 */
export const Modal = React.memo<ModalProps>(({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  initialFocusRef,
  returnFocusRef,
  onAnimationComplete
}) => {
  // State for animation and safe area insets
  const [isAnimating, setIsAnimating] = useState(false);
  const [safeAreaInsets, setSafeAreaInsets] = useState<SafeAreaInsets>({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  });

  // Refs for modal elements
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Check for reduced motion preference
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // Setup focus trap
  const { activate, deactivate } = useFocusTrap({
    initialFocus: initialFocusRef?.current || undefined,
    returnFocus: returnFocusRef?.current || undefined,
    escapeDeactivates: closeOnEscape,
    allowOutsideClick: true,
    fallbackFocus: '[role="dialog"]'
  });

  // Handle safe area insets for mobile devices
  useEffect(() => {
    const updateSafeAreaInsets = () => {
      setSafeAreaInsets({
        top: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top') || '0'),
        right: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-right') || '0'),
        bottom: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0'),
        left: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-left') || '0')
      });
    };

    updateSafeAreaInsets();
    window.addEventListener('resize', updateSafeAreaInsets);
    return () => window.removeEventListener('resize', updateSafeAreaInsets);
  }, []);

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      activate();
    } else {
      document.body.style.overflow = '';
      deactivate();
    }
    return () => {
      document.body.style.overflow = '';
      deactivate();
    };
  }, [isOpen, activate, deactivate]);

  // Handle animation completion
  useEffect(() => {
    if (!prefersReducedMotion && isAnimating) {
      const timer = setTimeout(() => {
        setIsAnimating(false);
        onAnimationComplete?.(isOpen ? 'opened' : 'closed');
      }, 250); // Match animation duration from styles
      return () => clearTimeout(timer);
    }
  }, [isAnimating, isOpen, prefersReducedMotion, onAnimationComplete]);

  // Handle overlay click
  const handleOverlayClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && event.target === overlayRef.current) {
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  // Handle touch events for mobile
  useEffect(() => {
    if (!modalRef.current) return;

    let startY = 0;
    let currentY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      currentY = startY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      
      if (diff > 0 && modalRef.current) {
        e.preventDefault();
        modalRef.current.style.transform = `translateY(${diff}px)`;
      }
    };

    const handleTouchEnd = () => {
      if (!modalRef.current) return;
      
      const diff = currentY - startY;
      if (diff > 100) {
        onClose();
      }
      modalRef.current.style.transform = '';
    };

    const element = modalRef.current;
    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove);
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onClose]);

  if (!isOpen && !isAnimating) return null;

  return (
    <ModalOverlay
      ref={overlayRef}
      isOpen={isOpen}
      onClick={handleOverlayClick}
      role="presentation"
      aria-hidden="true"
      reducedMotion={prefersReducedMotion}
    >
      <ModalContainer
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        size={size}
        isOpen={isOpen}
        safeAreaInsets={safeAreaInsets}
        tabIndex={-1}
      >
        <ModalHeader>
          <h2 id="modal-title" className="modal-title">
            {title}
          </h2>
          <Button
            variant="text"
            onClick={onClose}
            aria-label="Close modal"
            data-testid="modal-close-button"
          >
            ✕
          </Button>
        </ModalHeader>
        <ModalContent>
          {children}
        </ModalContent>
      </ModalContainer>
    </ModalOverlay>
  );
});

Modal.displayName = 'Modal';

export default Modal;