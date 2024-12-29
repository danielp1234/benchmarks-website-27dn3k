import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useMediaQuery, Skeleton, Drawer, IconButton, Tooltip } from '@mui/material';
import { FilterList, ExpandMore, ExpandLess, Clear } from '@mui/icons-material';
import debounce from 'lodash/debounce';

import {
  FilterPanelContainer,
  FilterSection,
  FilterHeader,
  FilterContent,
  FilterCount,
  ClearFiltersButton,
  FilterOption
} from './FilterPanel.styles';

// Constants
const MOBILE_BREAKPOINT = 768;
const FILTER_STORAGE_KEY = 'filter_panel_state';
const DEBOUNCE_DELAY = 300;
const MAX_FILTERS = 10;

// Types
export type MetricCategory = 'growth' | 'sales' | 'finance' | 'product' | 'customer';

export interface FilterPanelProps {
  selectedCategories: MetricCategory[];
  selectedArrRanges: string[];
  selectedSources: string[];
  onCategoryChange: (categories: MetricCategory[]) => void;
  onArrRangeChange: (ranges: string[]) => void;
  onSourceChange: (sources: string[]) => void;
  isOpen: boolean;
  onToggle: () => void;
  isLoading?: boolean;
  error?: string | null;
  onClearFilters: () => void;
}

interface SectionState {
  categories: boolean;
  arrRanges: boolean;
  sources: boolean;
}

export const FilterPanel: React.FC<FilterPanelProps> = React.memo(({
  selectedCategories,
  selectedArrRanges,
  selectedSources,
  onCategoryChange,
  onArrRangeChange,
  onSourceChange,
  isOpen,
  onToggle,
  isLoading = false,
  error = null,
  onClearFilters
}) => {
  // Responsive handling
  const isMobile = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT}px)`);
  
  // Section collapse state management
  const [collapsedSections, setCollapsedSections] = useState<SectionState>(() => {
    const stored = localStorage.getItem(FILTER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {
      categories: false,
      arrRanges: false,
      sources: false
    };
  });

  // Active filter count
  const activeFilterCount = useMemo(() => 
    selectedCategories.length + selectedArrRanges.length + selectedSources.length,
    [selectedCategories, selectedArrRanges, selectedSources]
  );

  // Debounced filter handlers
  const debouncedCategoryChange = useCallback(
    debounce((categories: MetricCategory[]) => {
      onCategoryChange(categories);
    }, DEBOUNCE_DELAY),
    [onCategoryChange]
  );

  const debouncedArrRangeChange = useCallback(
    debounce((ranges: string[]) => {
      onArrRangeChange(ranges);
    }, DEBOUNCE_DELAY),
    [onArrRangeChange]
  );

  const debouncedSourceChange = useCallback(
    debounce((sources: string[]) => {
      onSourceChange(sources);
    }, DEBOUNCE_DELAY),
    [onSourceChange]
  );

  // Section toggle handler
  const toggleSection = useCallback((section: keyof SectionState) => {
    setCollapsedSections(prev => {
      const newState = { ...prev, [section]: !prev[section] };
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(newState));
      return newState;
    });
  }, []);

  // Keyboard navigation
  const handleKeyPress = useCallback((e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  }, []);

  // Clear filters with confirmation
  const handleClearFilters = useCallback(() => {
    if (activeFilterCount > 0) {
      const confirmed = window.confirm('Are you sure you want to clear all filters?');
      if (confirmed) {
        onClearFilters();
      }
    }
  }, [activeFilterCount, onClearFilters]);

  // Persist collapsed state
  useEffect(() => {
    return () => {
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(collapsedSections));
    };
  }, [collapsedSections]);

  const renderFilterSection = (
    title: string,
    section: keyof SectionState,
    content: React.ReactNode
  ) => (
    <FilterSection>
      <FilterHeader
        onClick={() => toggleSection(section)}
        onKeyPress={(e) => handleKeyPress(e, () => toggleSection(section))}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsedSections[section]}
      >
        <span>{title}</span>
        {collapsedSections[section] ? <ExpandMore /> : <ExpandLess />}
      </FilterHeader>
      <FilterContent isCollapsed={collapsedSections[section]}>
        {isLoading ? (
          <Skeleton variant="rectangular" height={100} />
        ) : (
          content
        )}
      </FilterContent>
    </FilterSection>
  );

  const filterPanelContent = (
    <FilterPanelContainer
      isOpen={isOpen}
      isMobile={isMobile}
      role="complementary"
      aria-label="Filter Panel"
    >
      <div className="filter-header">
        <div className="filter-title">
          <FilterList />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <FilterCount>{activeFilterCount}</FilterCount>
          )}
        </div>
        <Tooltip title="Clear all filters">
          <ClearFiltersButton
            onClick={handleClearFilters}
            disabled={activeFilterCount === 0}
            aria-label="Clear all filters"
          >
            <Clear fontSize="small" />
            Clear
          </ClearFiltersButton>
        </Tooltip>
      </div>

      {error && (
        <div role="alert" className="error-message">
          {error}
        </div>
      )}

      {renderFilterSection(
        'Categories',
        'categories',
        <div role="group" aria-label="Metric Categories">
          {/* Category options would be mapped here */}
        </div>
      )}

      {renderFilterSection(
        'ARR Ranges',
        'arrRanges',
        <div role="group" aria-label="ARR Ranges">
          {/* ARR range options would be mapped here */}
        </div>
      )}

      {renderFilterSection(
        'Data Sources',
        'sources',
        <div role="group" aria-label="Data Sources">
          {/* Source options would be mapped here */}
        </div>
      )}
    </FilterPanelContainer>
  );

  return isMobile ? (
    <Drawer
      anchor="left"
      open={isOpen}
      onClose={onToggle}
      ModalProps={{
        keepMounted: true // Better mobile performance
      }}
    >
      {filterPanelContent}
    </Drawer>
  ) : (
    filterPanelContent
  );
});

FilterPanel.displayName = 'FilterPanel';

export default FilterPanel;