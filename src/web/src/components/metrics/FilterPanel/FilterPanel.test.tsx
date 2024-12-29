import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import FilterPanel from './FilterPanel';
import { MetricCategory } from '../../../interfaces/metrics.interface';
import { ARR_RANGES } from '../../../constants/metrics';

// Mock useMetrics hook
jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    filters: {
      categories: [],
      arrRanges: [],
      sources: []
    },
    setFilters: jest.fn(),
    loading: false
  })
}));

// Mock useMediaQuery for responsive testing
jest.mock('@mui/material/useMediaQuery');

describe('FilterPanel', () => {
  // Test data
  const mockCategories = [
    MetricCategory.GROWTH,
    MetricCategory.SALES,
    MetricCategory.FINANCIAL
  ];

  const mockSources = ['SOURCE_A', 'SOURCE_B', 'SOURCE_C'];

  // Test store setup
  const mockStore = configureStore({
    reducer: {
      metrics: (state = {
        filters: {
          categories: [],
          arrRanges: [],
          sources: []
        },
        loading: false,
        error: null
      }) => state
    }
  });

  // Setup before each test
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders correctly with initial state', () => {
    render(
      <Provider store={mockStore}>
        <FilterPanel
          selectedCategories={[]}
          selectedArrRanges={[]}
          selectedSources={[]}
          onCategoryChange={jest.fn()}
          onArrRangeChange={jest.fn()}
          onSourceChange={jest.fn()}
          isOpen={true}
          onToggle={jest.fn()}
          onClearFilters={jest.fn()}
        />
      </Provider>
    );

    // Verify filter sections are present
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('ARR Ranges')).toBeInTheDocument();
    expect(screen.getByText('Data Sources')).toBeInTheDocument();

    // Verify accessibility attributes
    expect(screen.getByRole('complementary')).toHaveAttribute('aria-label', 'Filter Panel');
    expect(screen.getByRole('button', { name: 'Clear all filters' })).toBeDisabled();
  });

  it('handles filter section collapse/expand', async () => {
    render(
      <Provider store={mockStore}>
        <FilterPanel
          selectedCategories={[]}
          selectedArrRanges={[]}
          selectedSources={[]}
          onCategoryChange={jest.fn()}
          onArrRangeChange={jest.fn()}
          onSourceChange={jest.fn()}
          isOpen={true}
          onToggle={jest.fn()}
          onClearFilters={jest.fn()}
        />
      </Provider>
    );

    const categoryHeader = screen.getByText('Categories').closest('div');
    expect(categoryHeader).toHaveAttribute('aria-expanded', 'true');

    await user.click(categoryHeader!);
    expect(categoryHeader).toHaveAttribute('aria-expanded', 'false');
  });

  it('handles filter selection and updates', async () => {
    const onCategoryChange = jest.fn();
    const onArrRangeChange = jest.fn();
    const onSourceChange = jest.fn();

    render(
      <Provider store={mockStore}>
        <FilterPanel
          selectedCategories={[]}
          selectedArrRanges={[]}
          selectedSources={[]}
          onCategoryChange={onCategoryChange}
          onArrRangeChange={onArrRangeChange}
          onSourceChange={onSourceChange}
          isOpen={true}
          onToggle={jest.fn()}
          onClearFilters={jest.fn()}
        />
      </Provider>
    );

    // Select category
    const categoryOption = screen.getByRole('checkbox', { name: 'Growth Metrics' });
    await user.click(categoryOption);
    expect(onCategoryChange).toHaveBeenCalledWith([MetricCategory.GROWTH]);

    // Select ARR range
    const arrOption = screen.getByRole('checkbox', { name: '$0-1M' });
    await user.click(arrOption);
    expect(onArrRangeChange).toHaveBeenCalledWith(['$0-1M']);

    // Select data source
    const sourceOption = screen.getByRole('checkbox', { name: 'SOURCE_A' });
    await user.click(sourceOption);
    expect(onSourceChange).toHaveBeenCalledWith(['SOURCE_A']);
  });

  it('handles clear filters functionality', async () => {
    const onClearFilters = jest.fn();

    render(
      <Provider store={mockStore}>
        <FilterPanel
          selectedCategories={[MetricCategory.GROWTH]}
          selectedArrRanges={['$0-1M']}
          selectedSources={['SOURCE_A']}
          onCategoryChange={jest.fn()}
          onArrRangeChange={jest.fn()}
          onSourceChange={jest.fn()}
          isOpen={true}
          onToggle={jest.fn()}
          onClearFilters={onClearFilters}
        />
      </Provider>
    );

    const clearButton = screen.getByRole('button', { name: 'Clear all filters' });
    expect(clearButton).toBeEnabled();

    // Mock window.confirm
    window.confirm = jest.fn(() => true);
    await user.click(clearButton);
    expect(onClearFilters).toHaveBeenCalled();
  });

  it('handles responsive behavior correctly', async () => {
    // Mock mobile view
    (window.matchMedia as jest.Mock).mockImplementation((query) => ({
      matches: query === '(max-width: 767px)',
      addListener: jest.fn(),
      removeListener: jest.fn()
    }));

    const onToggle = jest.fn();

    render(
      <Provider store={mockStore}>
        <FilterPanel
          selectedCategories={[]}
          selectedArrRanges={[]}
          selectedSources={[]}
          onCategoryChange={jest.fn()}
          onArrRangeChange={jest.fn()}
          onSourceChange={jest.fn()}
          isOpen={true}
          onToggle={onToggle}
          onClearFilters={jest.fn()}
        />
      </Provider>
    );

    // Verify drawer behavior on mobile
    const drawer = screen.getByRole('complementary');
    expect(drawer).toHaveStyle({ transform: 'translateX(0)' });

    // Close drawer
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);
    expect(onToggle).toHaveBeenCalled();
  });

  it('maintains filter state after remount', async () => {
    const { unmount } = render(
      <Provider store={mockStore}>
        <FilterPanel
          selectedCategories={[MetricCategory.GROWTH]}
          selectedArrRanges={['$0-1M']}
          selectedSources={['SOURCE_A']}
          onCategoryChange={jest.fn()}
          onArrRangeChange={jest.fn()}
          onSourceChange={jest.fn()}
          isOpen={true}
          onToggle={jest.fn()}
          onClearFilters={jest.fn()}
        />
      </Provider>
    );

    // Verify initial state is saved
    expect(localStorage.getItem('filter_panel_state')).toBeTruthy();

    // Unmount and remount
    unmount();

    render(
      <Provider store={mockStore}>
        <FilterPanel
          selectedCategories={[MetricCategory.GROWTH]}
          selectedArrRanges={['$0-1M']}
          selectedSources={['SOURCE_A']}
          onCategoryChange={jest.fn()}
          onArrRangeChange={jest.fn()}
          onSourceChange={jest.fn()}
          isOpen={true}
          onToggle={jest.fn()}
          onClearFilters={jest.fn()}
        />
      </Provider>
    );

    // Verify state is restored
    const savedState = JSON.parse(localStorage.getItem('filter_panel_state')!);
    expect(savedState).toEqual({
      categories: false,
      arrRanges: false,
      sources: false
    });
  });

  it('handles keyboard navigation correctly', async () => {
    render(
      <Provider store={mockStore}>
        <FilterPanel
          selectedCategories={[]}
          selectedArrRanges={[]}
          selectedSources={[]}
          onCategoryChange={jest.fn()}
          onArrRangeChange={jest.fn()}
          onSourceChange={jest.fn()}
          isOpen={true}
          onToggle={jest.fn()}
          onClearFilters={jest.fn()}
        />
      </Provider>
    );

    const categoryHeader = screen.getByText('Categories').closest('div');
    
    // Test Enter key
    fireEvent.keyPress(categoryHeader!, { key: 'Enter', code: 13, charCode: 13 });
    expect(categoryHeader).toHaveAttribute('aria-expanded', 'false');

    // Test Space key
    fireEvent.keyPress(categoryHeader!, { key: ' ', code: 32, charCode: 32 });
    expect(categoryHeader).toHaveAttribute('aria-expanded', 'true');
  });
});