/**
 * @fileoverview Unit tests for validation utility functions
 * Tests form inputs, data structures, and business rules validation with security checks
 * @version 1.0.0
 */

import {
  validateMetricName,
  validateMetricDescription,
  validateMetricCategory,
  validateSourceName,
  validateSourceDescription,
  validateArrRange,
  validateBenchmarkData
} from '../../src/utils/validation.utils';

import { MetricCategory } from '../../src/interfaces/metrics.interface';

describe('validateMetricName', () => {
  it('should validate correct metric names', () => {
    const validNames = [
      'Revenue Growth',
      'ARR',
      'Customer Acquisition Cost',
      'Net-Revenue-Retention',
      'Gross_Margin_Percentage'
    ];

    validNames.forEach(name => {
      const result = validateMetricName(name);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  it('should reject names shorter than minimum length', () => {
    const result = validateMetricName('AR');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('at least');
    expect(result.field).toBe('name');
  });

  it('should reject names longer than maximum length', () => {
    const longName = 'A'.repeat(51);
    const result = validateMetricName(longName);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('cannot exceed');
    expect(result.field).toBe('name');
  });

  it('should reject names with XSS attempts', () => {
    const xssNames = [
      '<script>alert("xss")</script>',
      'onclick="malicious()"',
      'javascript:void(0)',
      '<img src="x" onerror="alert(1)">'
    ];

    xssNames.forEach(name => {
      const result = validateMetricName(name);
      expect(result.isValid).toBe(false);
      expect(result.field).toBe('name');
    });
  });

  it('should reject SQL injection attempts', () => {
    const sqlNames = [
      "DROP TABLE metrics;--",
      "' OR '1'='1",
      "); DELETE FROM metrics;--",
      "UNION SELECT * FROM users--"
    ];

    sqlNames.forEach(name => {
      const result = validateMetricName(name);
      expect(result.isValid).toBe(false);
      expect(result.field).toBe('name');
    });
  });

  it('should handle null and undefined inputs', () => {
    expect(validateMetricName(null as any).isValid).toBe(false);
    expect(validateMetricName(undefined as any).isValid).toBe(false);
    expect(validateMetricName('').isValid).toBe(false);
  });
});

describe('validateMetricDescription', () => {
  it('should validate correct descriptions', () => {
    const validDescriptions = [
      'Measures the annual growth rate of recurring revenue',
      'Key metric for customer retention analysis',
      'Financial indicator of business health'
    ];

    validDescriptions.forEach(desc => {
      const result = validateMetricDescription(desc);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  it('should reject descriptions with HTML injection attempts', () => {
    const htmlDescriptions = [
      '<p>Description</p>',
      '<script>alert("xss")</script>',
      '<img src="x" onerror="alert(1)">',
      'Description<style>body{display:none}</style>'
    ];

    htmlDescriptions.forEach(desc => {
      const result = validateMetricDescription(desc);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('HTML tags');
    });
  });

  it('should reject descriptions exceeding maximum length', () => {
    const longDesc = 'A'.repeat(201);
    const result = validateMetricDescription(longDesc);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('cannot exceed');
  });

  it('should handle null and undefined inputs', () => {
    expect(validateMetricDescription(null as any).isValid).toBe(false);
    expect(validateMetricDescription(undefined as any).isValid).toBe(false);
    expect(validateMetricDescription('').isValid).toBe(false);
  });
});

describe('validateMetricCategory', () => {
  it('should validate all enum categories', () => {
    Object.values(MetricCategory).forEach(category => {
      const result = validateMetricCategory(category);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  it('should reject invalid categories', () => {
    const invalidCategories = [
      'INVALID',
      'growth',
      'Sales',
      '123',
      'MARKETING'
    ];

    invalidCategories.forEach(category => {
      const result = validateMetricCategory(category);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid category');
    });
  });
});

describe('validateSourceName', () => {
  it('should validate correct source names', () => {
    const validNames = [
      'Industry Report 2023',
      'Market Analysis',
      'Competitor Data',
      'Internal-Benchmarks',
      'Survey_Results_Q4'
    ];

    validNames.forEach(name => {
      const result = validateSourceName(name);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  it('should reject names with special characters', () => {
    const invalidNames = [
      'Source@2023',
      'Data#Analysis',
      'Report&Stats',
      'Source(2023)',
      'Data+Analysis'
    ];

    invalidNames.forEach(name => {
      const result = validateSourceName(name);
      expect(result.isValid).toBe(false);
      expect(result.field).toBe('name');
    });
  });

  it('should handle length boundaries', () => {
    expect(validateSourceName('AB').isValid).toBe(false);
    expect(validateSourceName('A'.repeat(51)).isValid).toBe(false);
  });
});

describe('validateArrRange', () => {
  it('should validate predefined ARR ranges', () => {
    const validRanges = [
      '0-1M',
      '1M-10M',
      '10M-50M',
      '50M-100M',
      '100M+'
    ];

    validRanges.forEach(range => {
      const result = validateArrRange(range);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  it('should reject invalid range formats', () => {
    const invalidRanges = [
      '0-1',
      '1M10M',
      '10M+50M',
      '50M100M',
      '100'
    ];

    invalidRanges.forEach(range => {
      const result = validateArrRange(range);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe('validateBenchmarkData', () => {
  it('should validate correct benchmark data', () => {
    const validData = {
      p5: 10,
      p25: 25,
      p50: 50,
      p75: 75,
      p90: 90
    };

    const result = validateBenchmarkData(validData);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject non-ascending percentiles', () => {
    const invalidData = {
      p5: 10,
      p25: 30,
      p50: 20, // Out of order
      p75: 75,
      p90: 90
    };

    const result = validateBenchmarkData(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('ascending order');
  });

  it('should reject percentiles outside valid range', () => {
    const invalidData = {
      p5: -10,
      p25: 25,
      p50: 50,
      p75: 75,
      p90: 110
    };

    const result = validateBenchmarkData(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('must be between');
  });

  it('should reject incomplete benchmark data', () => {
    const incompleteData = {
      p5: 10,
      p25: 25,
      // missing p50
      p75: 75,
      p90: 90
    };

    const result = validateBenchmarkData(incompleteData as any);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Missing or invalid');
  });
});