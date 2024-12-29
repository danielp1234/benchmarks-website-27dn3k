import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { axe, toHaveNoViolations } from 'jest-axe';

// Component imports
import Dashboard from './Dashboard';
import metricsReducer from '../../../store/slices/metricsSlice';
import authReducer from '../../../store/slices/authSlice';

// Test constants
const TEST_IDS = {
  DASHBOARD: 'admin-dashboard',
  QUICK_ACTIONS: 'quick-actions',
  RECENT_ACTIVITY: 'recent-activity',
  SYSTEM_STATUS: 'system-status'
};

// Mock data
const mockSystemStatus = [
  { service: 'Database', status: 'healthy', health: 100, lastUpdated: new Date() },
  { service: 'API Services', status: 'healthy', health: 100, lastUpdated: new Date() },
  { service: 'Cache', status: 'healthy', health: 100, lastUpdated: new Date() }
];

const mockRecentActivity = [
  {
    id: '1',
    action: 'Updated Growth Rate metrics',
    timestamp: new Date(),
    user: 'Admin User',
    type: 'metric'
  }
];

// Mock navigation
const mockNavigate = vi.fn();

// Mock hooks
const mockUseMetrics = vi.fn(() => ({
  metrics: [],
  loading: false,
  error: null
}));

// Helper function to render with providers
const renderWithProviders = (ui: React.ReactElement, options = {}) => {
  const store = configureStore({
    reducer: {
      metrics: metricsReducer,
      auth: authReducer
    },
    preloadedState: {
      auth: {
        user: { role: 'ADMIN' },
        isAuthenticated: true
      }
    }
  });

  return render(
    <Provider store={store}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </Provider>,
    options
  );
};

// Setup mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  vi.mock('react-router-dom', async () => ({
    ...(await vi.importActual('react-router-dom')),
    useNavigate: () => mockNavigate
  }));
  vi.mock('../../../hooks/useMetrics', () => ({
    default: mockUseMetrics
  }));
});

describe('Dashboard Component', () => {
  describe('Layout and Rendering', () => {
    it('should render all dashboard sections correctly', () => {
      renderWithProviders(<Dashboard />);

      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText('System Status')).toBeInTheDocument();
    });

    it('should display loading states while fetching data', () => {
      mockUseMetrics.mockReturnValue({
        metrics: [],
        loading: true,
        error: null
      });

      renderWithProviders(<Dashboard />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should handle error states gracefully', () => {
      mockUseMetrics.mockReturnValue({
        metrics: [],
        loading: false,
        error: 'Failed to load metrics'
      });

      renderWithProviders(<Dashboard />);
      expect(screen.getByText('Failed to load metrics')).toBeInTheDocument();
    });

    it('should meet accessibility standards', async () => {
      const { container } = renderWithProviders(<Dashboard />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Quick Actions', () => {
    it('should navigate to correct routes on action clicks', async () => {
      renderWithProviders(<Dashboard />);

      fireEvent.click(screen.getByText('Add New Metric'));
      expect(mockNavigate).toHaveBeenCalledWith('/admin/metrics/new');

      fireEvent.click(screen.getByText('Import Data'));
      expect(mockNavigate).toHaveBeenCalledWith('/admin/import');
    });

    it('should disable actions when loading', () => {
      mockUseMetrics.mockReturnValue({
        metrics: [],
        loading: true,
        error: null
      });

      renderWithProviders(<Dashboard />);
      expect(screen.getByText('Add New Metric')).toBeDisabled();
      expect(screen.getByText('Import Data')).toBeDisabled();
    });
  });

  describe('System Status', () => {
    it('should display correct status indicators', () => {
      renderWithProviders(<Dashboard />);

      mockSystemStatus.forEach(status => {
        const statusElement = screen.getByText(status.service);
        expect(statusElement).toBeInTheDocument();
        expect(screen.getByText(`${status.health}% Uptime`)).toBeInTheDocument();
      });
    });

    it('should update status in real-time', async () => {
      vi.useFakeTimers();
      renderWithProviders(<Dashboard />);

      // Fast-forward 30 seconds
      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        mockSystemStatus.forEach(status => {
          expect(screen.getByText(status.service)).toBeInTheDocument();
        });
      });

      vi.useRealTimers();
    });
  });

  describe('Recent Activity', () => {
    it('should display latest activities', () => {
      renderWithProviders(<Dashboard />);

      mockRecentActivity.forEach(activity => {
        expect(screen.getByText(activity.action)).toBeInTheDocument();
        expect(screen.getByText(activity.user, { exact: false })).toBeInTheDocument();
      });
    });

    it('should handle empty activity list', () => {
      renderWithProviders(<Dashboard />);
      const activitySection = screen.getByRole('region', { name: /recent activity/i });
      expect(activitySection).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should adjust layout for mobile viewport', () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<Dashboard />);
      const container = screen.getByTestId(TEST_IDS.DASHBOARD);
      expect(container).toHaveStyle({ gridTemplateColumns: '1fr' });
    });

    it('should adjust layout for tablet viewport', () => {
      global.innerWidth = 768;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<Dashboard />);
      const container = screen.getByTestId(TEST_IDS.DASHBOARD);
      expect(container).toHaveStyle({ gridTemplateColumns: 'repeat(6, 1fr)' });
    });
  });

  describe('Integration Tests', () => {
    it('should integrate with metrics service correctly', async () => {
      const mockMetrics = [{ id: '1', name: 'Test Metric' }];
      mockUseMetrics.mockReturnValue({
        metrics: mockMetrics,
        loading: false,
        error: null
      });

      renderWithProviders(<Dashboard />);
      await waitFor(() => {
        expect(mockUseMetrics).toHaveBeenCalled();
      });
    });

    it('should handle service errors appropriately', async () => {
      mockUseMetrics.mockReturnValue({
        metrics: [],
        loading: false,
        error: 'Service unavailable'
      });

      renderWithProviders(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText('Service unavailable')).toBeInTheDocument();
      });
    });
  });
});