/**
 * @fileoverview Unit tests for date utility functions
 * Covers date formatting, validation, parsing, and ISO string conversion
 * with extensive timezone and edge case handling
 * @version 1.0.0
 */

// External imports
import { describe, it, expect } from 'jest'; // @version: ^29.0.0

// Internal imports
import { 
  formatDate, 
  isValidDateRange, 
  parseFilterDates, 
  toISOString 
} from '../../../src/utils/date.utils';
import { BenchmarkFilter } from '../../../src/interfaces/benchmark.interface';

describe('formatDate', () => {
  it('should format Date object consistently across timezones', () => {
    const date = new Date('2023-10-15');
    expect(formatDate(date)).toBe('2023-10-15');
  });

  it('should handle ISO strings with timezone conversion', () => {
    const dateString = '2023-10-15T14:30:00.000Z';
    expect(formatDate(dateString)).toBe('2023-10-15');
  });

  it('should return empty string for invalid date input', () => {
    expect(formatDate('invalid-date')).toBe('');
    expect(formatDate('2023-13-45')).toBe('');
  });

  it('should support custom format strings', () => {
    const date = new Date('2023-10-15');
    expect(formatDate(date, 'MM/dd/yyyy')).toBe('10/15/2023');
    expect(formatDate(date, 'yyyy.MM.dd')).toBe('2023.10.15');
  });

  it('should handle null/undefined with empty string', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
  });

  it('should maintain consistent output across DST transitions', () => {
    const winterDate = new Date('2023-01-15');
    const summerDate = new Date('2023-07-15');
    expect(formatDate(winterDate)).toBe('2023-01-15');
    expect(formatDate(summerDate)).toBe('2023-07-15');
  });
});

describe('isValidDateRange', () => {
  it('should validate ranges across timezone boundaries', () => {
    const startDate = new Date('2023-10-15');
    const endDate = new Date('2023-10-16');
    expect(isValidDateRange(startDate, endDate)).toBe(true);
  });

  it('should handle same-day ranges correctly', () => {
    const date = new Date('2023-10-15');
    expect(isValidDateRange(date, date)).toBe(true);
  });

  it('should reject invalid date ranges', () => {
    const startDate = new Date('2023-10-16');
    const endDate = new Date('2023-10-15');
    expect(isValidDateRange(startDate, endDate)).toBe(false);
  });

  it('should handle null/undefined dates consistently', () => {
    const validDate = new Date('2023-10-15');
    expect(isValidDateRange(null, validDate)).toBe(false);
    expect(isValidDateRange(validDate, null)).toBe(false);
    expect(isValidDateRange(undefined, validDate)).toBe(false);
    expect(isValidDateRange(validDate, undefined)).toBe(false);
  });

  it('should handle invalid Date objects properly', () => {
    const validDate = new Date('2023-10-15');
    const invalidDate = new Date('invalid');
    expect(isValidDateRange(invalidDate, validDate)).toBe(false);
    expect(isValidDateRange(validDate, invalidDate)).toBe(false);
  });

  it('should maintain consistency across DST transitions', () => {
    const winterDate = new Date('2023-01-15');
    const summerDate = new Date('2023-07-15');
    expect(isValidDateRange(winterDate, summerDate)).toBe(true);
    expect(isValidDateRange(summerDate, winterDate)).toBe(false);
  });
});

describe('parseFilterDates', () => {
  it('should parse ISO strings with timezone handling', () => {
    const filter: BenchmarkFilter = {
      startDate: '2023-10-15',
      endDate: '2023-10-16'
    };
    const parsed = parseFilterDates(filter);
    expect(parsed.startDate instanceof Date).toBe(true);
    expect(parsed.endDate instanceof Date).toBe(true);
    expect(toISOString(parsed.startDate)).toBe('2023-10-15');
    expect(toISOString(parsed.endDate)).toBe('2023-10-16');
  });

  it('should handle partial filter objects', () => {
    const filterStart: BenchmarkFilter = { startDate: '2023-10-15' };
    const filterEnd: BenchmarkFilter = { endDate: '2023-10-16' };
    
    const parsedStart = parseFilterDates(filterStart);
    const parsedEnd = parseFilterDates(filterEnd);
    
    expect(parsedStart.startDate instanceof Date).toBe(true);
    expect(parsedEnd.endDate instanceof Date).toBe(true);
  });

  it('should handle invalid date strings', () => {
    const filter: BenchmarkFilter = {
      startDate: 'invalid-date',
      endDate: '2023-10-16'
    };
    const parsed = parseFilterDates(filter);
    expect(parsed.startDate).toBeUndefined();
    expect(parsed.endDate instanceof Date).toBe(true);
  });

  it('should handle null/undefined filters', () => {
    expect(parseFilterDates(null as unknown as BenchmarkFilter)).toBeNull();
    expect(parseFilterDates(undefined as unknown as BenchmarkFilter)).toBeUndefined();
  });

  it('should validate date ranges and clear invalid ranges', () => {
    const filter: BenchmarkFilter = {
      startDate: '2023-10-16',
      endDate: '2023-10-15'
    };
    const parsed = parseFilterDates(filter);
    expect(parsed.startDate).toBeUndefined();
    expect(parsed.endDate).toBeUndefined();
  });
});

describe('toISOString', () => {
  it('should normalize timezones in output', () => {
    const date = new Date('2023-10-15T14:30:00.000Z');
    expect(toISOString(date)).toBe('2023-10-15');
  });

  it('should handle invalid Date objects', () => {
    const invalidDate = new Date('invalid');
    expect(toISOString(invalidDate)).toBe('');
  });

  it('should handle null/undefined inputs', () => {
    expect(toISOString(null)).toBe('');
    expect(toISOString(undefined)).toBe('');
  });

  it('should maintain consistency across DST transitions', () => {
    const winterDate = new Date('2023-01-15T12:00:00.000Z');
    const summerDate = new Date('2023-07-15T12:00:00.000Z');
    expect(toISOString(winterDate)).toBe('2023-01-15');
    expect(toISOString(summerDate)).toBe('2023-07-15');
  });

  it('should strip time components consistently', () => {
    const morningDate = new Date('2023-10-15T06:00:00.000Z');
    const eveningDate = new Date('2023-10-15T18:00:00.000Z');
    expect(toISOString(morningDate)).toBe('2023-10-15');
    expect(toISOString(eveningDate)).toBe('2023-10-15');
  });
});