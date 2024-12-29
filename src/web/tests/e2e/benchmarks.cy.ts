/**
 * @fileoverview End-to-end test suite for the SaaS Benchmarks Platform benchmarks page.
 * Tests core functionality including data display, filtering, responsive behavior,
 * accessibility compliance, and error handling.
 * @version 1.0.0
 */

import { METRIC_CATEGORIES, ARR_RANGES } from '../../src/constants/metrics';
import { MetricCategory } from '../../src/interfaces/metrics.interface';
import 'cypress-axe'; // @version: ^9.0.0
import '@testing-library/cypress'; // @version: ^10.0.0

// Viewport configurations for responsive testing
const VIEWPORT_PRESETS = {
  MOBILE: { width: 375, height: 667 },
  TABLET: { width: 768, height: 1024 },
  DESKTOP: { width: 1440, height: 900 }
} as const;

// API route constants
const API_ROUTES = {
  BENCHMARKS: '/api/v1/benchmarks',
  METRICS: '/api/v1/metrics',
  SOURCES: '/api/v1/sources'
} as const;

// Test timeout configurations
const TIMEOUTS = {
  API_RESPONSE: 5000,
  ANIMATION: 1000,
  RENDER: 2000
} as const;

describe('Benchmarks Page', () => {
  beforeEach(() => {
    // Set up API intercepts
    cy.intercept('GET', API_ROUTES.BENCHMARKS, { fixture: 'benchmarks.json' }).as('getBenchmarks');
    cy.intercept('GET', API_ROUTES.METRICS, { fixture: 'metrics.json' }).as('getMetrics');
    cy.intercept('GET', API_ROUTES.SOURCES, { fixture: 'sources.json' }).as('getSources');

    // Visit benchmarks page
    cy.visit('/benchmarks');

    // Wait for initial data load
    cy.wait(['@getBenchmarks', '@getMetrics', '@getSources']);

    // Check accessibility
    cy.injectAxe();
    cy.checkA11y();
  });

  it('should display benchmark data grid with correct format', () => {
    // Verify grid container
    cy.get('[data-testid="benchmark-grid"]').should('be.visible');

    // Check metric count
    cy.get('[data-testid="metric-row"]').should('have.length', 14);

    // Verify percentile columns
    const percentileColumns = ['P5', 'P25', 'P50', 'P75', 'P90'];
    percentileColumns.forEach(percentile => {
      cy.get(`[data-testid="column-header-${percentile}"]`).should('be.visible');
    });

    // Check numeric formatting
    cy.get('[data-testid="metric-value"]').each($value => {
      expect($value.text()).to.match(/^-?\d+\.?\d*%?$/);
    });

    // Verify data loading performance
    cy.get('[data-testid="loading-indicator"]').should('not.exist', { timeout: TIMEOUTS.API_RESPONSE });
  });

  it('should handle filter combinations correctly', () => {
    // Test category filters
    Object.values(MetricCategory).forEach(category => {
      cy.get(`[data-testid="category-filter-${category}"]`).click();
      cy.wait('@getBenchmarks').its('request.url').should('include', `category=${category}`);
    });

    // Test ARR range filters
    ARR_RANGES.forEach(range => {
      cy.get('[data-testid="arr-range-select"]').click();
      cy.get(`[data-testid="arr-option-${range}"]`).click();
      cy.wait('@getBenchmarks').its('request.url').should('include', `arrRange=${encodeURIComponent(range)}`);
    });

    // Test source filters
    cy.get('[data-testid="source-filter"]').click();
    cy.get('[data-testid="source-option"]').first().click();
    cy.wait('@getBenchmarks');

    // Verify URL parameters reflect filters
    cy.url().should('include', 'filters=');
  });

  it('should maintain responsive behavior', () => {
    // Test mobile viewport
    cy.viewport(VIEWPORT_PRESETS.MOBILE.width, VIEWPORT_PRESETS.MOBILE.height);
    cy.get('[data-testid="filter-drawer-button"]').should('be.visible').click();
    cy.get('[data-testid="filter-drawer"]').should('be.visible');
    
    // Test tablet viewport
    cy.viewport(VIEWPORT_PRESETS.TABLET.width, VIEWPORT_PRESETS.TABLET.height);
    cy.get('[data-testid="filter-panel"]').should('be.visible');
    
    // Test desktop viewport
    cy.viewport(VIEWPORT_PRESETS.DESKTOP.width, VIEWPORT_PRESETS.DESKTOP.height);
    cy.get('[data-testid="filter-panel"]').should('be.visible');
    cy.get('[data-testid="benchmark-grid"]').should('be.visible');
  });

  it('should handle error scenarios gracefully', () => {
    // Test API failure
    cy.intercept('GET', API_ROUTES.BENCHMARKS, {
      statusCode: 500,
      body: { error: 'Internal Server Error' }
    }).as('failedRequest');

    cy.reload();
    cy.get('[data-testid="error-message"]').should('be.visible');
    cy.get('[data-testid="retry-button"]').should('be.visible').click();
    
    // Test empty state
    cy.intercept('GET', API_ROUTES.BENCHMARKS, { body: { data: [], pagination: { total: 0 } } });
    cy.get('[data-testid="empty-state"]').should('be.visible');
  });

  it('should meet performance requirements', () => {
    // Test filter response time
    cy.intercept('GET', API_ROUTES.BENCHMARKS).as('filterRequest');
    
    cy.get('[data-testid="category-filter-GROWTH"]').click();
    
    // Verify response time is under 2 seconds
    cy.wait('@filterRequest').its('duration').should('be.lessThan', 2000);
  });

  it('should maintain accessibility standards across interactions', () => {
    // Test accessibility after filter changes
    cy.get('[data-testid="category-filter-GROWTH"]').click();
    cy.checkA11y();

    // Test accessibility with mobile menu open
    cy.viewport(VIEWPORT_PRESETS.MOBILE.width, VIEWPORT_PRESETS.MOBILE.height);
    cy.get('[data-testid="filter-drawer-button"]').click();
    cy.checkA11y();
  });

  it('should handle data export functionality', () => {
    cy.get('[data-testid="export-button"]').click();
    cy.get('[data-testid="export-format-select"]').select('csv');
    cy.get('[data-testid="download-button"]').click();
    
    // Verify download request
    cy.wait('@getBenchmarks').its('response.headers').should('include', {
      'content-type': 'text/csv'
    });
  });
});