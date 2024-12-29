import { format, parseISO, isValid } from 'date-fns'; // date-fns v2.30.0
import { memoize } from 'lodash'; // lodash v4.17.21

/**
 * Standard date format constants used across the application
 */
export enum DATE_FORMATS {
  DISPLAY = 'yyyy-MM-dd',
  EXPORT = 'MM/dd/yyyy',
  ISO = "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  TIMESTAMP = 'yyyy-MM-dd HH:mm:ss'
}

/**
 * Time period constants for date range calculations
 */
export enum TIME_PERIODS {
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
  YTD = 'ytd'
}

/**
 * Default timezone used when none is specified
 */
const DEFAULT_TIMEZONE = 'UTC';

/**
 * Custom error class for date-related errors
 */
class DateUtilError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'DateUtilError';
  }
}

/**
 * Formats a date object or ISO string into a standardized string format with timezone support
 * @param date - Date object or ISO date string to format
 * @param formatString - Target format string (use DATE_FORMATS enum)
 * @param timezone - Optional timezone (defaults to UTC)
 * @returns Formatted date string
 * @throws DateUtilError if date is invalid or formatting fails
 */
export function formatDate(
  date: Date | string,
  formatString: string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValidDate(dateObj)) {
      throw new DateUtilError('Invalid date provided', 'INVALID_DATE');
    }

    // Apply timezone conversion if needed
    const dateInTz = new Date(dateObj.toLocaleString('en-US', { timeZone: timezone }));
    
    return format(dateInTz, formatString);
  } catch (error) {
    if (error instanceof DateUtilError) {
      throw error;
    }
    throw new DateUtilError(
      `Failed to format date: ${error.message}`,
      'FORMAT_ERROR'
    );
  }
}

/**
 * Parses a date string into a Date object with enhanced validation
 * @param dateString - Date string to parse
 * @param timezone - Optional timezone (defaults to UTC)
 * @returns Parsed Date object
 * @throws DateUtilError if parsing fails or date is invalid
 */
export function parseDate(dateString: string, timezone: string = DEFAULT_TIMEZONE): Date {
  try {
    const parsedDate = parseISO(dateString);
    
    if (!isValidDate(parsedDate)) {
      throw new DateUtilError('Invalid date string format', 'PARSE_ERROR');
    }

    // Convert to specified timezone
    return new Date(parsedDate.toLocaleString('en-US', { timeZone: timezone }));
  } catch (error) {
    if (error instanceof DateUtilError) {
      throw error;
    }
    throw new DateUtilError(
      `Failed to parse date: ${error.message}`,
      'PARSE_ERROR'
    );
  }
}

/**
 * Validates if a date string or object is valid with enhanced checks
 * @param date - Date to validate
 * @returns Boolean indicating validity
 */
export function isValidDate(date: Date | string): boolean {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(dateObj)) {
      return false;
    }

    // Additional validation checks
    const year = dateObj.getFullYear();
    const isReasonableYear = year >= 1970 && year <= 2100;
    
    return isReasonableYear && !isNaN(dateObj.getTime());
  } catch {
    return false;
  }
}

/**
 * Gets start and end dates for a given time period with memoization
 * @param period - Time period from TIME_PERIODS enum
 * @param timezone - Optional timezone (defaults to UTC)
 * @returns Object containing start date, end date, and period
 * @throws DateUtilError if period is invalid
 */
export const getDateRange = memoize((
  period: string,
  timezone: string = DEFAULT_TIMEZONE
): { startDate: Date; endDate: Date; period: string } => {
  if (!Object.values(TIME_PERIODS).includes(period as TIME_PERIODS)) {
    throw new DateUtilError('Invalid time period', 'INVALID_PERIOD');
  }

  const now = new Date();
  const endDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  let startDate: Date;

  switch (period) {
    case TIME_PERIODS.MONTH:
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      break;
    case TIME_PERIODS.QUARTER:
      const quarterStart = Math.floor(endDate.getMonth() / 3) * 3;
      startDate = new Date(endDate.getFullYear(), quarterStart, 1);
      break;
    case TIME_PERIODS.YEAR:
      startDate = new Date(endDate.getFullYear(), 0, 1);
      break;
    case TIME_PERIODS.YTD:
      startDate = new Date(endDate.getFullYear(), 0, 1);
      break;
    default:
      throw new DateUtilError('Unsupported time period', 'INVALID_PERIOD');
  }

  return {
    startDate,
    endDate,
    period
  };
}, (period: string, timezone: string = DEFAULT_TIMEZONE) => `${period}-${timezone}`);

/**
 * Formats a date specifically for data exports with configurable format
 * @param date - Date to format for export
 * @param exportFormat - Optional custom export format
 * @param timezone - Optional timezone (defaults to UTC)
 * @returns Formatted date string for export
 * @throws DateUtilError if formatting fails
 */
export function formatExportDate(
  date: Date,
  exportFormat: string = DATE_FORMATS.EXPORT,
  timezone: string = DEFAULT_TIMEZONE
): string {
  try {
    if (!isValidDate(date)) {
      throw new DateUtilError('Invalid date for export', 'INVALID_DATE');
    }

    return formatDate(date, exportFormat, timezone);
  } catch (error) {
    if (error instanceof DateUtilError) {
      throw error;
    }
    throw new DateUtilError(
      `Failed to format export date: ${error.message}`,
      'EXPORT_FORMAT_ERROR'
    );
  }
}