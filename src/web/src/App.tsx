import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, CssBaseline, Container } from '@mui/material';

// Internal imports with lazy loading for better performance
const Home = React.lazy(() => import('./pages/public/Home/Home'));
const Benchmarks = React.lazy(() => import('./pages/public/Benchmarks/Benchmarks'));
const Dashboard = React.lazy(() => import('./pages/admin/Dashboard/Dashboard'));

// Store and auth imports
import store from './store/store';
import { useAuth } from './hooks/useAuth';
import Loading from './components/common/Loading/Loading';

// Routes configuration
const ROUTES = {
  HOME: '/',
  BENCHMARKS: '/benchmarks',
  ADMIN_DASHBOARD: '/admin',
  ADMIN_METRICS: '/admin/metrics',
  ADMIN_IMPORT: '/admin/import',
  ADMIN_SOURCES: '/admin/sources',
  NOT_FOUND: '*'
} as const;

/**
 * Protected route component that handles authentication and role-based access
 */
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  requiredRoles: string[];
}> = ({ children, requiredRoles }) => {
  const { isAuthenticated, isLoading, checkPermission } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <Loading size="lg" />
      </Container>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const hasRequiredRole = requiredRoles.some(role => checkPermission(role));
  if (!hasRequiredRole) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return <>{children}</>;
};

/**
 * Root application component that sets up routing, global providers, and error boundaries
 */
const App: React.FC = () => {
  // Track route changes for analytics
  const handleRouteChange = () => {
    // Implement analytics tracking here
    console.log('Route changed:', window.location.pathname);
  };

  useEffect(() => {
    window.addEventListener('popstate', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  return (
    <Provider store={store}>
      <ThemeProvider theme={{}}>
        <CssBaseline />
        <BrowserRouter>
          <Suspense
            fallback={
              <Container sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <Loading size="lg" />
              </Container>
            }
          >
            <Routes>
              {/* Public routes */}
              <Route path={ROUTES.HOME} element={<Home />} />
              <Route path={ROUTES.BENCHMARKS} element={<Benchmarks />} />

              {/* Protected admin routes */}
              <Route
                path={ROUTES.ADMIN_DASHBOARD}
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'SYSTEM_ADMIN']}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path={ROUTES.ADMIN_METRICS}
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'SYSTEM_ADMIN']}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path={ROUTES.ADMIN_IMPORT}
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'SYSTEM_ADMIN']}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path={ROUTES.ADMIN_SOURCES}
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'SYSTEM_ADMIN']}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* 404 route */}
              <Route path={ROUTES.NOT_FOUND} element={<Navigate to={ROUTES.HOME} replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
};

export default App;