import { defineConfig } from 'cypress'; // ^13.0.0

export default defineConfig({
  // E2E Testing configuration
  e2e: {
    // Test files location pattern
    specPattern: 'src/web/tests/e2e/**/*.cy.ts',
    
    // Support file location
    supportFile: 'src/web/tests/support/e2e.ts',
    
    // Base URL for the application
    baseUrl: 'http://localhost:3000',
    
    // Disable experimental studio features
    experimentalStudio: false,
    
    // Disable Chrome web security to allow cross-origin requests during testing
    chromeWebSecurity: false,
    
    // Enable test isolation for clean state between tests
    testIsolation: true,
    
    // Configure Node-based events
    setupNodeEvents(on, config) {
      // Register preprocessor for TypeScript test files
      on('file:preprocessor', require('@cypress/webpack-preprocessor')({
        webpackOptions: {
          resolve: {
            extensions: ['.ts', '.js']
          },
          module: {
            rules: [
              {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: {
                  loader: 'ts-loader'
                }
              }
            ]
          }
        }
      }));

      // Configure test reporting
      on('after:spec', (spec, results) => {
        if (results && results.video) {
          // Delete video if test passes
          return !results.tests.some(test => test.state === 'failed');
        }
        return false;
      });

      return config;
    }
  },

  // Global configuration
  
  // Viewport settings for consistent testing
  viewportWidth: 1280,
  viewportHeight: 720,

  // Timeout settings to accommodate performance requirements
  defaultCommandTimeout: 10000,    // 10 seconds for standard commands
  requestTimeout: 10000,           // 10 seconds for API requests
  responseTimeout: 30000,          // 30 seconds for responses
  pageLoadTimeout: 30000,          // 30 seconds for page loads

  // Test retry settings
  retries: {
    runMode: 2,                    // Retry failed tests twice in CI
    openMode: 0                    // No retries in interactive mode
  },

  // Environment variables
  env: {
    apiUrl: 'http://localhost:8000/api/v1',
    googleOAuthUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    coverage: false
  },

  // Browser launch options
  browsers: [
    {
      name: 'chrome',
      family: 'chromium',
      channel: 'stable',
      displayName: 'Chrome',
      version: 'latest'
    },
    {
      name: 'firefox',
      family: 'firefox',
      channel: 'stable',
      displayName: 'Firefox',
      version: 'latest'
    },
    {
      name: 'edge',
      family: 'chromium',
      channel: 'stable',
      displayName: 'Edge',
      version: 'latest'
    }
  ],

  // Screenshot and video settings
  screenshotOnRunFailure: true,    // Take screenshots on test failure
  video: false,                    // Disable video recording by default
  
  // Performance monitoring
  numTestsKeptInMemory: 50,        // Limit memory usage
  watchForFileChanges: true,       // Auto-reload on file changes
  
  // Reporter configuration
  reporter: 'mochawesome',
  reporterOptions: {
    reportDir: 'cypress/reports',
    overwrite: false,
    html: true,
    json: true
  }
});