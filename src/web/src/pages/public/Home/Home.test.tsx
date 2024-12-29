import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import Home from './Home';

// Mock dependencies
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn()
}));

jest.mock('@analytics/react', () => ({
  useAnalytics: () => ({
    track: jest.fn(),
    page: jest.fn()
  })
}));

// Mock ResizeObserver for responsive tests
const mockResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

global.ResizeObserver = mockResizeObserver;

// Test wrapper component
const renderWithRouter = (component: React.ReactNode) => {
  return render(
    <MemoryRouter>
      {component}
    </MemoryRouter>
  );
};

describe('Home Component', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    (useNavigate as jest.Mock).mockImplementation(() => mockNavigate);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders initial layout correctly', () => {
    renderWithRouter(<Home />);

    // Verify hero section
    expect(screen.getByRole('heading', { name: /SaaS Performance Benchmarks/i })).toBeInTheDocument();
    expect(screen.getByText(/Access comprehensive benchmark data/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View SaaS benchmarks data/i })).toBeInTheDocument();

    // Verify features section
    expect(screen.getByRole('heading', { name: /Featured Metrics/i })).toBeInTheDocument();
    
    // Verify metric cards
    const metricCards = screen.getAllByRole('article');
    expect(metricCards).toHaveLength(2); // Based on FEATURED_METRICS array
    
    // Verify CTA section
    expect(screen.getByRole('heading', { name: /Ready to Benchmark Your Performance/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Access detailed SaaS benchmarks/i })).toBeInTheDocument();
  });

  test('handles navigation correctly', async () => {
    renderWithRouter(<Home />);

    // Test primary CTA button
    const viewButton = screen.getByRole('button', { name: /View SaaS benchmarks data/i });
    fireEvent.click(viewButton);
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/benchmarks');
    });

    // Test secondary CTA button
    const accessButton = screen.getByRole('button', { name: /Access detailed SaaS benchmarks/i });
    fireEvent.click(accessButton);
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/benchmarks');
    });
  });

  test('displays loading state for metric cards', () => {
    renderWithRouter(<Home />);
    
    expect(screen.getByText('Loading metrics...')).toBeInTheDocument();
  });

  test('handles keyboard navigation correctly', () => {
    renderWithRouter(<Home />);

    const viewButton = screen.getByRole('button', { name: /View SaaS benchmarks data/i });
    
    // Test keyboard navigation
    fireEvent.keyDown(viewButton, { key: 'Enter' });
    expect(mockNavigate).toHaveBeenCalledWith('/benchmarks');

    fireEvent.keyDown(viewButton, { key: ' ' });
    expect(mockNavigate).toHaveBeenCalledWith('/benchmarks');
  });

  test('renders metric cards with correct data', () => {
    renderWithRouter(<Home />);

    const metricCards = screen.getAllByRole('article');
    
    // Test first metric card
    const revenueCard = metricCards[0];
    expect(within(revenueCard).getByText('Revenue Growth')).toBeInTheDocument();
    expect(within(revenueCard).getByText('Growth')).toBeInTheDocument();
    expect(within(revenueCard).getByText('$10M-$30M')).toBeInTheDocument();

    // Test second metric card
    const retentionCard = metricCards[1];
    expect(within(retentionCard).getByText('Net Dollar Retention')).toBeInTheDocument();
    expect(within(retentionCard).getByText('Revenue')).toBeInTheDocument();
  });

  test('meets accessibility requirements', async () => {
    const { container } = renderWithRouter(<Home />);

    // Run axe accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Check heading hierarchy
    const headings = screen.getAllByRole('heading');
    expect(headings[0].tagName).toBe('H1');
    
    // Check ARIA labels
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAttribute('aria-label');
    });

    // Check keyboard focus indicators
    const viewButton = screen.getByRole('button', { name: /View SaaS benchmarks data/i });
    viewButton.focus();
    expect(viewButton).toHaveFocus();
  });

  test('handles responsive layout correctly', () => {
    // Mock different viewport sizes
    const viewports = [
      { width: 320, height: 568 }, // Mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1024, height: 768 }, // Desktop
      { width: 1440, height: 900 } // Large Desktop
    ];

    viewports.forEach(size => {
      window.innerWidth = size.width;
      window.innerHeight = size.height;
      window.dispatchEvent(new Event('resize'));

      const { container } = renderWithRouter(<Home />);
      
      // Verify responsive layout classes
      if (size.width < 768) {
        expect(container.querySelector('.metric-card')).toHaveStyle({
          'grid-template-columns': '1fr'
        });
      } else if (size.width >= 1024) {
        expect(container.querySelector('.metric-card')).toHaveStyle({
          'grid-template-columns': 'repeat(4, 1fr)'
        });
      }
    });
  });

  test('tracks analytics events', () => {
    const mockAnalytics = {
      track: jest.fn(),
      page: jest.fn()
    };

    jest.mock('@analytics/react', () => ({
      useAnalytics: () => mockAnalytics
    }));

    renderWithRouter(<Home />);

    // Verify page view tracking
    expect(mockAnalytics.page).toHaveBeenCalledWith('home_page');

    // Verify CTA click tracking
    const viewButton = screen.getByRole('button', { name: /View SaaS benchmarks data/i });
    fireEvent.click(viewButton);

    expect(mockAnalytics.track).toHaveBeenCalledWith('cta_click', {
      location: 'home_page',
      action: 'view_benchmarks'
    });
  });
});