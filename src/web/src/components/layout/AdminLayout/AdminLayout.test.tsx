import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import AdminLayout from './AdminLayout';
import { useAuth } from '../../../hooks/useAuth';
import { UserRole } from '../../../interfaces/auth.interface';
import theme from '../../../theme';
import { createTestStore } from '../../../utils/test-utils';

// Mock dependencies
vi.mock('../../../hooks/useAuth');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});
vi.mock('@mui/material', async () => {
  const actual = await vi.importActual('@mui/material');
  return {
    ...actual,
    useMediaQuery: () => mockUseMediaQuery(),
  };
});

// Mock variables
const mockNavigate = vi.fn();
const mockUseAuth = useAuth as jest.Mock;
const mockUseMediaQuery = vi.fn(() => true);

// Test user data
const testUser = {
  id: '123',
  email: 'admin@test.com',
  role: UserRole.ADMIN,
  name: 'Test Admin',
  lastLogin: new Date(),
  permissions: []
};

// Helper function to render component with providers
interface ViewportConfig {
  width: number;
  height: number;
}

const renderWithProviders = (
  ui: React.ReactNode,
  { initialState = {}, store = createTestStore(initialState) } = {},
  viewport?: ViewportConfig
) => {
  if (viewport) {
    Object.defineProperty(window, 'innerWidth', { value: viewport.width });
    Object.defineProperty(window, 'innerHeight', { value: viewport.height });
    window.dispatchEvent(new Event('resize'));
  }

  const user = userEvent.setup();

  return {
    user,
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter>
          <ThemeProvider theme={theme}>
            {ui}
          </ThemeProvider>
        </MemoryRouter>
      </Provider>
    )
  };
};

describe('AdminLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: testUser,
      checkPermission: (role: UserRole) => role === UserRole.ADMIN,
      error: null
    });
  });

  describe('Authentication and Authorization', () => {
    it('shows loading state while authenticating', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: true,
        user: null,
        checkPermission: () => false
      });

      renderWithProviders(<AdminLayout />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('redirects to login when not authenticated', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        checkPermission: () => false
      });

      renderWithProviders(<AdminLayout />);
      expect(mockNavigate).toHaveBeenCalledWith('/login', expect.any(Object));
    });

    it('redirects to home when user is not admin', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { ...testUser, role: UserRole.PUBLIC },
        checkPermission: () => false
      });

      renderWithProviders(<AdminLayout />);
      expect(mockNavigate).toHaveBeenCalledWith('/', expect.any(Object));
    });
  });

  describe('Layout Structure', () => {
    it('renders admin layout with all required sections', () => {
      const { container } = renderWithProviders(<AdminLayout />);

      // Verify header
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText(testUser.name)).toBeInTheDocument();

      // Verify navigation
      expect(screen.getByRole('navigation')).toBeInTheDocument();

      // Verify main content area
      expect(screen.getByRole('main')).toBeInTheDocument();

      // Verify layout structure using CSS Grid
      expect(container.firstChild).toHaveStyle({
        display: 'grid',
        minHeight: '100vh'
      });
    });

    it('displays user information correctly', () => {
      renderWithProviders(<AdminLayout />);
      const userInfo = screen.getByText(testUser.name).parentElement;
      expect(userInfo).toHaveClass('user-info');
      expect(within(userInfo!).getByText(UserRole.ADMIN)).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile viewport', async () => {
      mockUseMediaQuery.mockReturnValue(false); // Simulate mobile viewport
      const { user } = renderWithProviders(<AdminLayout />, {}, { width: 320, height: 568 });

      // Verify mobile menu button is visible
      const menuButton = screen.getByRole('button', { name: /toggle navigation menu/i });
      expect(menuButton).toBeInTheDocument();

      // Test mobile menu interaction
      await user.click(menuButton);
      expect(screen.getByRole('navigation')).toHaveClass('open');

      // Verify layout adjustments
      expect(screen.getByRole('banner')).toHaveStyle({ left: '0' });
    });

    it('adapts layout for tablet viewport', () => {
      mockUseMediaQuery.mockReturnValue(true); // Simulate tablet viewport
      renderWithProviders(<AdminLayout />, {}, { width: 768, height: 1024 });

      // Verify sidebar behavior
      const sidebar = screen.getByRole('navigation');
      expect(sidebar).toBeVisible();
      expect(sidebar).not.toHaveClass('open');
    });

    it('handles orientation changes', () => {
      const { rerender } = renderWithProviders(<AdminLayout />, {}, { width: 768, height: 1024 });

      // Simulate orientation change
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      Object.defineProperty(window, 'innerHeight', { value: 768 });
      window.dispatchEvent(new Event('resize'));

      rerender(
        <Provider store={createTestStore()}>
          <MemoryRouter>
            <ThemeProvider theme={theme}>
              <AdminLayout />
            </ThemeProvider>
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByRole('navigation')).toBeVisible();
    });
  });

  describe('Accessibility', () => {
    it('implements proper ARIA attributes', () => {
      renderWithProviders(<AdminLayout />);

      // Verify navigation accessibility
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Admin navigation');

      // Verify main content accessibility
      const main = screen.getByRole('main');
      expect(main).toHaveAttribute('aria-label', 'Admin content');

      // Verify menu button accessibility
      const menuButton = screen.getByRole('button', { name: /toggle navigation menu/i });
      expect(menuButton).toHaveAttribute('aria-expanded');
      expect(menuButton).toHaveAttribute('aria-controls', 'admin-sidebar');
    });

    it('maintains focus management', async () => {
      const { user } = renderWithProviders(<AdminLayout />);
      mockUseMediaQuery.mockReturnValue(false); // Simulate mobile viewport

      const menuButton = screen.getByRole('button', { name: /toggle navigation menu/i });
      await user.tab();
      expect(menuButton).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    it('displays error state when authentication fails', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: testUser,
        checkPermission: () => true,
        error: { message: 'Authentication failed' }
      });

      renderWithProviders(<AdminLayout />);
      expect(screen.getByText(/authentication failed/i)).toBeInTheDocument();
    });

    it('handles session timeout gracefully', async () => {
      const { rerender } = renderWithProviders(<AdminLayout />);

      // Simulate session timeout
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        checkPermission: () => false
      });

      rerender(
        <Provider store={createTestStore()}>
          <MemoryRouter>
            <ThemeProvider theme={theme}>
              <AdminLayout />
            </ThemeProvider>
          </MemoryRouter>
        </Provider>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/login', expect.any(Object));
    });
  });
});