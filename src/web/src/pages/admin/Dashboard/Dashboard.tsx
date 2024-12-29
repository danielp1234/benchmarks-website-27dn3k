import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Layout and Common Components
import AdminLayout from '../../../components/layout/AdminLayout/AdminLayout';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Loading from '../../../components/common/Loading/Loading';

// Custom Hooks
import useMetrics from '../../../hooks/useMetrics';

// Styled Components
import {
  DashboardContainer,
  QuickActions,
  RecentActivity,
  SystemStatus
} from './Dashboard.styles';

// Constants and Types
const STATUS_REFRESH_INTERVAL = 30000; // 30 seconds
const ACTIVITY_PAGE_SIZE = 10;

interface SystemStatusItem {
  service: string;
  status: 'healthy' | 'warning' | 'error';
  health: number;
  lastUpdated: Date;
}

interface ActivityItem {
  id: string;
  action: string;
  timestamp: Date;
  user: string;
  type: 'metric' | 'data' | 'system';
}

/**
 * Admin Dashboard component providing system overview and administrative functions
 * Implements requirements from Technical Specifications sections 1.3 and 5.1.3
 */
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { metrics, loading: metricsLoading, error: metricsError } = useMetrics();

  // State for system status and activity
  const [systemStatus, setSystemStatus] = useState<SystemStatusItem[]>([
    { service: 'Database', status: 'healthy', health: 100, lastUpdated: new Date() },
    { service: 'API Services', status: 'healthy', health: 100, lastUpdated: new Date() },
    { service: 'Cache', status: 'healthy', health: 100, lastUpdated: new Date() }
  ]);

  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // Handler for Add Metric button
  const handleAddMetric = useCallback(() => {
    navigate('/admin/metrics/new');
  }, [navigate]);

  // Handler for Import Data button
  const handleImportData = useCallback(() => {
    navigate('/admin/import');
  }, [navigate]);

  // Effect for periodic status refresh
  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        // Implement actual status fetching logic here
        // For now, using mock data
        setSystemStatus(prev => prev.map(item => ({
          ...item,
          lastUpdated: new Date()
        })));
      } catch (error) {
        console.error('Error fetching system status:', error);
      }
    };

    const intervalId = setInterval(fetchSystemStatus, STATUS_REFRESH_INTERVAL);
    fetchSystemStatus(); // Initial fetch

    return () => clearInterval(intervalId);
  }, []);

  // Effect for loading recent activity
  useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        setActivityLoading(true);
        // Implement actual activity fetching logic here
        // Mock data for now
        const mockActivity: ActivityItem[] = [
          {
            id: '1',
            action: 'Updated Growth Rate metrics',
            timestamp: new Date(),
            user: 'Admin User',
            type: 'metric'
          }
        ];
        setRecentActivity(mockActivity);
      } catch (error) {
        console.error('Error fetching recent activity:', error);
      } finally {
        setActivityLoading(false);
      }
    };

    fetchRecentActivity();
  }, []);

  return (
    <AdminLayout>
      <DashboardContainer>
        {/* Quick Actions Section */}
        <QuickActions>
          <Card
            header="Quick Actions"
            aria-label="Administrative quick actions"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Button
                variant="primary"
                onClick={handleAddMetric}
                fullWidth
                icon={<span>+</span>}
              >
                Add New Metric
              </Button>
              <Button
                variant="secondary"
                onClick={handleImportData}
                fullWidth
                icon={<span>↑</span>}
              >
                Import Data
              </Button>
            </div>
          </Card>
        </QuickActions>

        {/* Recent Activity Section */}
        <RecentActivity>
          <Card
            header="Recent Activity"
            aria-label="Recent system activity"
          >
            {activityLoading ? (
              <Loading size="md" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {recentActivity.map(activity => (
                  <div key={activity.id} style={{ padding: '0.5rem', borderBottom: '1px solid var(--neutral-200)' }}>
                    <div>{activity.action}</div>
                    <small style={{ color: 'var(--neutral-600)' }}>
                      {activity.user} • {activity.timestamp.toLocaleString()}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </RecentActivity>

        {/* System Status Section */}
        <SystemStatus>
          <Card
            header="System Status"
            aria-label="System health status"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {systemStatus.map(status => (
                <div key={status.service} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem',
                  backgroundColor: status.status === 'healthy' ? 'var(--success-light)' : 'var(--warning-light)'
                }}>
                  <div>
                    <strong>{status.service}</strong>
                    <div style={{ fontSize: '0.875rem', color: 'var(--neutral-600)' }}>
                      {status.health}% Uptime
                    </div>
                  </div>
                  <div style={{ fontSize: '0.875rem' }}>
                    Last updated: {status.lastUpdated.toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </SystemStatus>
      </DashboardContainer>
    </AdminLayout>
  );
};

export default Dashboard;