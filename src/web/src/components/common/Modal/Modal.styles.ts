import styled, { css } from 'styled-components'; // styled-components v5.3.0

// Constants for modal configuration
const MODAL_SIZES = {
  small: '400px',
  medium: '600px',
  large: '800px'
} as const;

const ANIMATION_DURATION = '250ms';

const BREAKPOINTS = {
  mobile: '320px',
  tablet: '768px',
  desktop: '1024px'
} as const;

// Helper function to determine modal width based on size prop
const getModalWidth = (size: keyof typeof MODAL_SIZES = 'medium') => {
  return MODAL_SIZES[size] || MODAL_SIZES.medium;
};

// Backdrop overlay with animation and accessibility support
export const ModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-index-modal);
  opacity: ${({ isOpen }) => (isOpen ? 1 : 0)};
  transition: opacity ${ANIMATION_DURATION} ease-in-out;
  backdrop-filter: blur(2px);
  touch-action: none;
  will-change: opacity;

  /* Respect user's motion preferences */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

// Modal container with responsive sizing and accessibility attributes
export const ModalContainer = styled.div<{
  size?: keyof typeof MODAL_SIZES;
  isOpen: boolean;
}>`
  background: var(--color-background);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-lg);
  max-width: ${({ size }) => getModalWidth(size)};
  width: min(90%, var(--modal-max-width));
  max-height: min(90vh, var(--modal-max-height));
  margin: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  display: flex;
  flex-direction: column;
  transform: ${({ isOpen }) => (isOpen ? 'scale(1)' : 'scale(0.95)')};
  transition: transform ${ANIMATION_DURATION} ease-out;
  will-change: transform;
  outline: none; /* Focus will be managed via JavaScript */
  overscroll-behavior: contain;

  /* Mobile-specific styles */
  @media (max-width: ${BREAKPOINTS.tablet}) {
    width: 100%;
    height: 100%;
    border-radius: 0;
    transform: ${({ isOpen }) =>
      isOpen ? 'translateY(0)' : 'translateY(100%)'};
  }

  /* Respect user's motion preferences */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

// Modal header with title and close button layout
export const ModalHeader = styled.header`
  padding: var(--spacing-lg);
  border-bottom: var(--border-width-thin) solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: var(--spacing-2xl);
  flex-shrink: 0;

  /* Account for safe area on mobile devices */
  @media (max-width: ${BREAKPOINTS.tablet}) {
    padding-top: max(var(--spacing-lg), env(safe-area-inset-top));
  }
`;

// Modal content area with optimized scrolling
export const ModalContent = styled.div`
  padding: var(--spacing-lg);
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  -ms-overflow-style: -ms-autohiding-scrollbar;
  scrollbar-width: thin;
  scrollbar-color: var(--color-scroll) transparent;

  /* Optimize scrolling performance */
  will-change: transform;
  transform: translateZ(0);

  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: var(--color-scroll);
    border-radius: 4px;
    border: 2px solid transparent;
    background-clip: padding-box;
  }

  /* Account for safe area on mobile devices */
  @media (max-width: ${BREAKPOINTS.tablet}) {
    padding-bottom: max(var(--spacing-lg), env(safe-area-inset-bottom));
  }
`;