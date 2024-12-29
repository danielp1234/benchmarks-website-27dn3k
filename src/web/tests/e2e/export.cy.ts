/**
 * @fileoverview End-to-end tests for benchmark data export functionality
 * Tests CSV and Excel export features, accessibility, and error handling
 * @version 1.0.0
 */

// External imports
import { BenchmarkData } from '../../src/interfaces/benchmark.interface'; // @version: ^1.0.0

// Test data constants
const TEST_BENCHMARK_DATA: BenchmarkData = {
  id: 'test-metric-1',
  metricId: 'metric-uuid-1',
  sourceId: 'source-uuid-1',
  name: 'Revenue Growth',
  p5Value: 20,
  p25Value: 50,
  p50Value: 80,
  p75Value: 120,
  p90Value: 150,
  arrRange: '$10M-$50M',
  effectiveDate: new Date('2023-10-01'),
  source: 'Test Source'
};

// Configuration constants
const DOWNLOAD_TIMEOUT = 10000;
const EXPORT_SELECTORS = {
  exportButton: '[data-cy=export-button]',
  exportModal: '[data-cy=export-modal]',
  csvOption: '[data-cy=csv-option]',
  excelOption: '[data-cy=excel-option]',
  downloadButton: '[data-cy=download-button]',
  progressBar: '[data-cy=export-progress]',
  errorMessage: '[data-cy=export-error]',
  closeButton: '[data-cy=modal-close]'
};

describe('Benchmark Data Export', () => {
  beforeEach(() => {
    // Visit benchmarks page and set up test environment
    cy.visit('/benchmarks');
    
    // Intercept API requests
    cy.intercept('GET', '/api/v1/benchmarks*', {
      statusCode: 200,
      body: {
        data: [TEST_BENCHMARK_DATA],
        pagination: {
          page: 1,
          pageSize: 10,
          totalItems: 1
        }
      }
    }).as('getBenchmarks');

    // Wait for initial data load
    cy.wait('@getBenchmarks');
    
    // Clear downloads folder
    cy.exec('rm -rf cypress/downloads/*', { failOnNonZeroExit: false });
  });

  it('should display export button when data is loaded', () => {
    cy.get(EXPORT_SELECTORS.exportButton)
      .should('be.visible')
      .and('be.enabled')
      .and('have.attr', 'aria-label', 'Export benchmark data')
      .focus()
      .should('have.class', 'focus-visible');
  });

  it('should open export modal with format options', () => {
    // Open export modal
    cy.get(EXPORT_SELECTORS.exportButton).click();

    // Verify modal content and accessibility
    cy.get(EXPORT_SELECTORS.exportModal)
      .should('be.visible')
      .and('have.attr', 'role', 'dialog')
      .and('have.attr', 'aria-labelledby', 'export-modal-title');

    // Check format options
    cy.get(EXPORT_SELECTORS.csvOption)
      .should('be.visible')
      .and('be.enabled');
    
    cy.get(EXPORT_SELECTORS.excelOption)
      .should('be.visible')
      .and('be.enabled');

    // Test keyboard navigation
    cy.get(EXPORT_SELECTORS.closeButton)
      .focus()
      .type('{enter}')
      .should(() => {
        expect(cy.get(EXPORT_SELECTORS.exportModal)).not.to.exist;
      });
  });

  it('should download CSV file with correct format', () => {
    // Intercept download request
    cy.intercept('POST', '/api/v1/export/csv', {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="benchmark_data.csv"'
      },
      body: 'Metric,ARR Range,P5,P25,P50,P75,P90\nRevenue Growth,$10M-$50M,20,50,80,120,150'
    }).as('exportCSV');

    // Initiate download
    cy.get(EXPORT_SELECTORS.exportButton).click();
    cy.get(EXPORT_SELECTORS.csvOption).click();
    cy.get(EXPORT_SELECTORS.downloadButton).click();

    // Verify progress indication
    cy.get(EXPORT_SELECTORS.progressBar)
      .should('be.visible')
      .and('have.attr', 'aria-valuenow', '0');

    // Wait for download
    cy.wait('@exportCSV');
    
    // Verify downloaded file
    cy.readFile('cypress/downloads/benchmark_data.csv')
      .should('contain', 'Revenue Growth')
      .and('contain', '$10M-$50M')
      .and('contain', '20,50,80,120,150');
  });

  it('should download Excel file with correct format', () => {
    // Intercept download request
    cy.intercept('POST', '/api/v1/export/excel', {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="benchmark_data.xlsx"'
      },
      body: Cypress.Buffer.from('mock excel file content')
    }).as('exportExcel');

    // Initiate download
    cy.get(EXPORT_SELECTORS.exportButton).click();
    cy.get(EXPORT_SELECTORS.excelOption).click();
    cy.get(EXPORT_SELECTORS.downloadButton).click();

    // Verify progress indication
    cy.get(EXPORT_SELECTORS.progressBar)
      .should('be.visible')
      .and('have.attr', 'aria-valuenow', '0');

    // Wait for download
    cy.wait('@exportExcel');
    
    // Verify file download
    cy.readFile('cypress/downloads/benchmark_data.xlsx')
      .should('exist');
  });

  it('should handle export errors gracefully', () => {
    // Intercept export request with error
    cy.intercept('POST', '/api/v1/export/*', {
      statusCode: 500,
      body: {
        error: 'Export failed',
        message: 'Unable to generate export file'
      }
    }).as('exportError');

    // Attempt export
    cy.get(EXPORT_SELECTORS.exportButton).click();
    cy.get(EXPORT_SELECTORS.csvOption).click();
    cy.get(EXPORT_SELECTORS.downloadButton).click();

    // Verify error handling
    cy.get(EXPORT_SELECTORS.errorMessage)
      .should('be.visible')
      .and('contain', 'Unable to generate export file')
      .and('have.attr', 'role', 'alert');

    // Verify retry functionality
    cy.get(EXPORT_SELECTORS.downloadButton)
      .should('be.enabled')
      .and('contain', 'Retry');

    // Test error dismissal
    cy.get(EXPORT_SELECTORS.closeButton).click();
    cy.get(EXPORT_SELECTORS.errorMessage).should('not.exist');
  });

  it('should maintain accessibility during export process', () => {
    // Open export modal
    cy.get(EXPORT_SELECTORS.exportButton).click();

    // Check ARIA attributes
    cy.get(EXPORT_SELECTORS.exportModal)
      .should('have.attr', 'aria-modal', 'true')
      .and('have.attr', 'aria-describedby', 'export-modal-description');

    // Verify focus trap
    cy.focused().should('have.attr', 'data-cy', 'csv-option');
    cy.realPress('Tab');
    cy.focused().should('have.attr', 'data-cy', 'excel-option');
    cy.realPress('Tab');
    cy.focused().should('have.attr', 'data-cy', 'download-button');
    cy.realPress('Tab');
    cy.focused().should('have.attr', 'data-cy', 'modal-close');

    // Test escape key
    cy.realPress('Escape');
    cy.get(EXPORT_SELECTORS.exportModal).should('not.exist');
  });
});