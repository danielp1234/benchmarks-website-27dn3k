/**
 * @fileoverview Utility functions for date manipulation, formatting, and validation.
 * Provides type-safe implementations for handling benchmark dates with timezone support.
 * @version 1.0.0
 */

// External imports
import { format, isValid, parseISO } from 'date-fns'; // @version: ^2.30.0

// Internal imports
import { BenchmarkFilter } from '../interfaces/benchmark.interface';

/**
 * Default date format for display throughout the application
 * Follows the ISO standard format YYYY-MM-DD
 */
const DEFAULT_DATE_FORMAT = 'yyyy-MM-dd';

/**
 * Formats a date object or ISO string to a standardized display format.
 * Provides enhanced error handling and null safety.
 * 
 * @param date - Date object, ISO string, or null/undefined
 * @param formatString - Optional format string (defaults to YYYY-MM-DD)
 * @returns Formatted date string or empty string if input is invalid
 */
export const formatDate = (
  date: Date | string | null | undefined,
  formatString: string = DEFAULT_DATE_FORMAT
): string => {
  try {
    if (!date) {
      return '';
    }

    const dateObject = typeof date === 'string' ? parseISO(date) : date;

    if (!isValid(dateObject)) {
      return '';
    }

    return format(dateObject, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Validates a date range ensuring start date is before or equal to end date.
 * Includes comprehensive type checking and null safety.
 * 
 * @param startDate - Start date of the range
 * @param endDate - End date of the range
 * @returns Boolean indicating if the range is valid
 */
export const isValidDateRange = (
  startDate: Date | null | undefined,
  endDate: Date | null | undefined
): boolean => {
  try {
    if (!startDate || !endDate) {
      return false;
    }

    if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
      return false;
    }

    if (!isValid(startDate) || !isValid(endDate)) {
      return false;
    }

    // Convert to UTC for consistent comparison
    const utcStart = Date.UTC(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate()
    );
    const utcEnd = Date.UTC(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate()
    );

    return utcStart <= utcEnd;
  } catch (error) {
    console.error('Error validating date range:', error);
    return false;
  }
};

/**
 * Parses and validates date strings from benchmark filters.
 * Provides enhanced error handling and maintains type safety.
 * 
 * @param filter - Benchmark filter containing date strings
 * @returns Updated filter with parsed Date objects
 */
export const parseFilterDates = (filter: BenchmarkFilter): BenchmarkFilter => {
  try {
    if (!filter) {
      return filter;
    }

    const parsedFilter: BenchmarkFilter = { ...filter };

    if (filter.startDate) {
      const startDate = typeof filter.startDate === 'string' 
        ? parseISO(filter.startDate)
        : filter.startDate;
      
      if (isValid(startDate)) {
        parsedFilter.startDate = startDate;
      }
    }

    if (filter.endDate) {
      const endDate = typeof filter.endDate === 'string'
        ? parseISO(filter.endDate)
        : filter.endDate;
      
      if (isValid(endDate)) {
        parsedFilter.endDate = endDate;
      }
    }

    // Validate the date range if both dates are present
    if (parsedFilter.startDate && parsedFilter.endDate) {
      if (!isValidDateRange(parsedFilter.startDate, parsedFilter.endDate)) {
        delete parsedFilter.startDate;
        delete parsedFilter.endDate;
      }
    }

    return parsedFilter;
  } catch (error) {
    console.error('Error parsing filter dates:', error);
    return filter;
  }
};

/**
 * Converts a Date object to ISO string format with timezone handling.
 * Removes time component for date-only comparison.
 * 
 * @param date - Date object to convert
 * @returns ISO date string without time component or empty string if invalid
 */
export const toISOString = (date: Date | null | undefined): string => {
  try {
    if (!date || !(date instanceof Date) || !isValid(date)) {
      return '';
    }

    // Convert to UTC and format as YYYY-MM-DD
    const utcDate = new Date(Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    ));

    return utcDate.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error converting date to ISO string:', error);
    return '';
  }
};