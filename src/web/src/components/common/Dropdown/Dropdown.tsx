import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useClickOutside } from '@hooks/useClickOutside';
import { useVirtualization } from '@hooks/useVirtualization';
import {
  DropdownContainer,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from './Dropdown.styles';

interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string | string[];
  onChange: (value: string | string[], option?: DropdownOption) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  multiple?: boolean;
  searchable?: boolean;
  width?: string;
  maxHeight?: string;
  direction?: 'ltr' | 'rtl';
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  error,
  multiple = false,
  searchable = false,
  width,
  maxHeight = '300px',
  direction = 'ltr'
}) => {
  // State management
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [menuPosition, setMenuPosition] = useState<'top' | 'bottom'>('bottom');

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useClickOutside(containerRef, () => {
    if (isOpen) setIsOpen(false);
  });

  // Memoized filtered options
  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(option => 
      option.label.toLowerCase().includes(query) ||
      option.group?.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  // Virtual scrolling setup
  const { virtualItems, totalHeight } = useVirtualization({
    items: filteredOptions,
    itemHeight: 40,
    overscan: 5,
    maxHeight: parseInt(maxHeight)
  });

  // Handle option selection
  const handleSelect = useCallback((option: DropdownOption) => {
    if (option.disabled) return;

    if (multiple) {
      const values = Array.isArray(value) ? value : [];
      const newValue = values.includes(option.value)
        ? values.filter(v => v !== option.value)
        : [...values, option.value];
      onChange(newValue, option);
    } else {
      onChange(option.value, option);
      setIsOpen(false);
    }
  }, [multiple, value, onChange]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        }
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          handleSelect(filteredOptions[highlightedIndex]);
        } else {
          setIsOpen(prev => !prev);
        }
        break;

      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;

      case 'Tab':
        if (isOpen) {
          event.preventDefault();
          setIsOpen(false);
        }
        break;

      default:
        if (searchable && /^[a-zA-Z0-9]$/.test(event.key)) {
          setSearchQuery(prev => prev + event.key);
          if (!isOpen) setIsOpen(true);
        }
    }
  }, [disabled, isOpen, filteredOptions, highlightedIndex, handleSelect, searchable]);

  // Position menu based on available space
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const menuHeight = parseInt(maxHeight);

      setMenuPosition(
        spaceBelow < menuHeight && spaceAbove > spaceBelow ? 'top' : 'bottom'
      );
    }
  }, [isOpen, maxHeight]);

  // Focus management
  useEffect(() => {
    if (isOpen && searchable) {
      searchInputRef.current?.focus();
    }
  }, [isOpen, searchable]);

  // Selected option label(s)
  const selectedLabel = useMemo(() => {
    if (multiple && Array.isArray(value)) {
      if (value.length === 0) return placeholder;
      return `${value.length} selected`;
    }
    const selected = options.find(opt => opt.value === value);
    return selected ? selected.label : placeholder;
  }, [value, options, placeholder, multiple]);

  return (
    <DropdownContainer
      ref={containerRef}
      width={width}
      disabled={disabled}
      error={!!error}
      direction={direction}
    >
      <DropdownTrigger
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-disabled={disabled}
        aria-invalid={!!error}
        aria-label={placeholder}
      >
        {selectedLabel}
        <span aria-hidden="true">▼</span>
      </DropdownTrigger>

      <DropdownMenu
        ref={menuRef}
        role="listbox"
        isOpen={isOpen}
        maxHeight={maxHeight}
        position={menuPosition}
        aria-multiselectable={multiple}
        aria-label={placeholder}
      >
        {searchable && (
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search..."
            aria-label="Search options"
            style={{ padding: 'var(--spacing-sm)', width: '100%' }}
          />
        )}

        <div style={{ height: totalHeight }}>
          {virtualItems.map(({ index, offsetTop }) => {
            const option = filteredOptions[index];
            const isSelected = multiple
              ? Array.isArray(value) && value.includes(option.value)
              : value === option.value;

            return (
              <DropdownItem
                key={option.value}
                role="option"
                style={{ position: 'absolute', top: offsetTop }}
                onClick={() => handleSelect(option)}
                isHighlighted={index === highlightedIndex}
                isSelected={isSelected}
                disabled={option.disabled}
                aria-selected={isSelected}
                aria-disabled={option.disabled}
              >
                {multiple && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    aria-hidden="true"
                    style={{ marginRight: 'var(--spacing-sm)' }}
                  />
                )}
                {option.label}
              </DropdownItem>
            );
          })}
        </div>
      </DropdownMenu>

      {error && (
        <div
          role="alert"
          style={{
            color: 'var(--error-color)',
            fontSize: 'var(--font-size-sm)',
            marginTop: 'var(--spacing-xs)'
          }}
        >
          {error}
        </div>
      )}
    </DropdownContainer>
  );
};

export default Dropdown;