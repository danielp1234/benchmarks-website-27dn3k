/**
 * @fileoverview End-to-end tests for admin functionality of SaaS Benchmarks Platform
 * @version 1.0.0
 */

import { ADMIN_ROUTES } from '../../src/constants/routes';

// Test user configuration
const TEST_ADMIN = {
  email: 'admin@example.com',
  name: 'Test Admin',
  role: 'ADMIN',
  permissions: ['MANAGE_METRICS', 'IMPORT_DATA', 'VIEW_AUDIT_LOGS'],
};

// API endpoint constants
const API_ENDPOINTS = {
  AUTH: '/api/v1/auth',
  METRICS: '/api/v1/metrics',
  ACTIVITY: '/api/v1/admin/activity',
  STATUS: '/api/v1/admin/status',
  IMPORT: '/api/v1/admin/import',
  AUDIT: '/api/v1/admin/audit',
} as const;

describe('Admin Interface', () => {
  beforeEach(() => {
    // Mock Google OAuth authentication
    cy.intercept('POST', API_ENDPOINTS.AUTH, {
      statusCode: 200,
      body: {
        token: 'mock-jwt-token',
        user: TEST_ADMIN,
      },
    }).as('authRequest');

    // Mock initial dashboard data
    cy.intercept('GET', API_ENDPOINTS.ACTIVITY, {
      statusCode: 200,
      body: {
        activities: [
          {
            id: '1',
            action: 'Updated Growth Rate metrics',
            timestamp: new Date().toISOString(),
            user: TEST_ADMIN.email,
          },
          {
            id: '2',
            action: 'Imported Q2 benchmarks',
            timestamp: new Date().toISOString(),
            user: TEST_ADMIN.email,
          },
        ],
      },
    }).as('activityRequest');

    // Mock system status data
    cy.intercept('GET', API_ENDPOINTS.STATUS, {
      statusCode: 200,
      body: {
        services: {
          database: { status: 'healthy', percentage: 100 },
          cache: { status: 'healthy', percentage: 100 },
          api: { status: 'warning', percentage: 95 },
        },
      },
    }).as('statusRequest');

    // Visit admin dashboard
    cy.visit(ADMIN_ROUTES.DASHBOARD);
    cy.wait(['@authRequest', '@activityRequest', '@statusRequest']);
  });

  describe('Dashboard Components', () => {
    it('should display quick actions panel', () => {
      cy.get('[data-testid="quick-actions"]').should('be.visible');
      cy.get('[data-testid="add-metric-btn"]').should('be.visible');
      cy.get('[data-testid="import-data-btn"]').should('be.visible');
      cy.get('[data-testid="alerts-btn"]').should('be.visible');
    });

    it('should display recent activity feed', () => {
      cy.get('[data-testid="activity-feed"]').should('be.visible');
      cy.get('[data-testid="activity-item"]').should('have.length', 2);
      cy.get('[data-testid="activity-item"]').first().should('contain', 'Updated Growth Rate metrics');
    });

    it('should display system status indicators', () => {
      cy.get('[data-testid="system-status"]').should('be.visible');
      cy.get('[data-testid="status-database"]').should('contain', '100%');
      cy.get('[data-testid="status-api"]')
        .should('contain', '95%')
        .should('have.class', 'warning');
    });
  });

  describe('Navigation', () => {
    it('should navigate to add metric page', () => {
      cy.get('[data-testid="add-metric-btn"]').click();
      cy.url().should('include', ADMIN_ROUTES.METRICS);
      cy.get('[data-testid="add-metric-form"]').should('be.visible');
    });

    it('should navigate to import data page', () => {
      cy.get('[data-testid="import-data-btn"]').click();
      cy.url().should('include', ADMIN_ROUTES.IMPORT);
      cy.get('[data-testid="import-interface"]').should('be.visible');
    });
  });

  describe('Data Management', () => {
    it('should handle metric creation', () => {
      cy.intercept('POST', API_ENDPOINTS.METRICS, {
        statusCode: 201,
        body: {
          id: 'new-metric-id',
          name: 'New Metric',
          category: 'Growth',
        },
      }).as('createMetric');

      cy.get('[data-testid="add-metric-btn"]').click();
      cy.get('[data-testid="metric-name-input"]').type('New Metric');
      cy.get('[data-testid="metric-category-select"]').select('Growth');
      cy.get('[data-testid="save-metric-btn"]').click();

      cy.wait('@createMetric');
      cy.get('[data-testid="success-toast"]').should('be.visible');
    });

    it('should handle data import', () => {
      cy.intercept('POST', API_ENDPOINTS.IMPORT, {
        statusCode: 200,
        body: {
          status: 'success',
          recordsProcessed: 100,
        },
      }).as('importData');

      cy.get('[data-testid="import-data-btn"]').click();
      cy.get('[data-testid="file-upload-input"]').attachFile('test-data.csv');
      cy.get('[data-testid="upload-btn"]').click();

      cy.wait('@importData');
      cy.get('[data-testid="import-success"]').should('be.visible');
      cy.get('[data-testid="records-processed"]').should('contain', '100');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      cy.intercept('GET', API_ENDPOINTS.STATUS, {
        statusCode: 500,
        body: {
          error: 'Internal Server Error',
        },
      }).as('failedStatus');

      cy.reload();
      cy.get('[data-testid="error-message"]').should('be.visible');
      cy.get('[data-testid="retry-btn"]').should('be.visible').click();
      cy.get('[data-testid="loading-indicator"]').should('be.visible');
    });

    it('should handle authentication errors', () => {
      cy.intercept('POST', API_ENDPOINTS.AUTH, {
        statusCode: 401,
        body: {
          error: 'Unauthorized',
        },
      }).as('failedAuth');

      cy.reload();
      cy.get('[data-testid="auth-error"]').should('be.visible');
      cy.url().should('include', '/login');
    });
  });

  describe('Responsive Layout', () => {
    it('should adapt to mobile viewport', () => {
      cy.viewport('iphone-x');
      cy.get('[data-testid="mobile-menu-btn"]').should('be.visible');
      cy.get('[data-testid="quick-actions"]').should('not.be.visible');
      cy.get('[data-testid="mobile-menu-btn"]').click();
      cy.get('[data-testid="quick-actions"]').should('be.visible');
    });

    it('should adapt to tablet viewport', () => {
      cy.viewport('ipad-2');
      cy.get('[data-testid="quick-actions"]').should('be.visible');
      cy.get('[data-testid="activity-feed"]').should('be.visible');
    });
  });
});