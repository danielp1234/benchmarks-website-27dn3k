import React from 'react'; // ^18.0.0
import ReactDOM from 'react-dom/client'; // ^18.0.0
import { Provider } from 'react-redux'; // ^8.1.0
import { ThemeProvider, CssBaseline } from '@mui/material'; // ^5.0.0
import * as Sentry from '@sentry/react'; // ^7.0.0
import { BrowserTracing } from '@sentry/tracing'; // ^7.0.0

import App from './App';
import store from './store/store';
import theme from './theme'; // Assuming theme configuration exists

// Initialize Sentry for error tracking
if (process.env.NODE_ENV === 'production' && process.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.VITE_SENTRY_DSN,
    integrations: [new BrowserTracing()],
    tracesSampleRate: 0.1,
    // Performance monitoring for 1000+ concurrent users requirement
    maxBreadcrumbs: 50,
    environment: process.env.NODE_ENV,
    beforeSend(event) {
      if (process.env.NODE_ENV !== 'production') {
        return null;
      }
      return event;
    },
  });
}

// Browser compatibility check
const checkBrowserCompatibility = (): boolean => {
  const minVersions = {
    chrome: 89,
    firefox: 87,
    safari: 14,
    edge: 89
  };

  const userAgent = navigator.userAgent.toLowerCase();
  
  // Simple version check - in production, use a more robust solution
  return !Object.entries(minVersions).some(([browser, minVersion]) => {
    const match = userAgent.match(new RegExp(`${browser}\\/([\\d.]+)`));
    if (match) {
      const version = parseInt(match[1]);
      return version < minVersion;
    }
    return false;
  });
};

// Performance monitoring setup
const initializePerformanceMonitoring = (): void => {
  if ('performance' in window && 'PerformanceObserver' in window) {
    // Monitor Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        Sentry.captureMessage(`Performance metric: ${entry.name}`, {
          level: 'info',
          extra: {
            value: entry.value,
            metric: entry.name,
            timestamp: entry.startTime
          }
        });
      });
    });

    observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
  }
};

// Initialize the application
const initializeApp = (): void => {
  // Check browser compatibility
  if (!checkBrowserCompatibility()) {
    console.warn('Browser version not fully supported. Some features may not work correctly.');
  }

  // Initialize performance monitoring
  if (process.env.NODE_ENV === 'production') {
    initializePerformanceMonitoring();
  }

  // Set security headers
  if (process.env.NODE_ENV === 'production') {
    // These would typically be set on the server, but can be handled by a service worker
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';";
    document.head.appendChild(meta);
  }
};

// Render application with error boundary and required providers
const renderApp = (): void => {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  // Initialize app services
  initializeApp();

  // Create root with concurrent mode
  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <React.StrictMode>
      <Sentry.ErrorBoundary
        fallback={({ error }) => (
          <div role="alert">
            <h2>An error has occurred</h2>
            <pre>{error.message}</pre>
          </div>
        )}
        showDialog
      >
        <Provider store={store}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <React.Suspense
              fallback={
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                  Loading...
                </div>
              }
            >
              <App />
            </React.Suspense>
          </ThemeProvider>
        </Provider>
      </Sentry.ErrorBoundary>
    </React.StrictMode>
  );
};

// Initialize and render the application
renderApp();

// Enable hot module replacement in development
if (import.meta.hot) {
  import.meta.hot.accept();
}