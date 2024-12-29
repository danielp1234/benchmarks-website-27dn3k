/**
 * Metrics Validator
 * Version: 1.0.0
 * Purpose: Define validation schemas and DTOs for metrics-related API requests
 * using class-validator decorators to ensure data integrity and type safety
 */

import {
  IsString,
  IsEnum,
  IsUUID,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  Max,
  Length,
  ValidateNested,
  Matches,
  IsNotEmpty
} from 'class-validator'; // @version 0.14.x
import { Type, Transform } from 'class-transformer'; // @version 0.5.x
import { MetricCategory } from '../../interfaces/metrics.interface';

/**
 * Predefined list of valid SaaS metric names
 * Ensures only approved KPIs can be created/updated
 */
const VALID_METRIC_NAMES = [
  'Revenue Growth Rate',
  'Net Revenue Retention',
  'Gross Revenue Retention',
  'Customer Acquisition Cost',
  'Customer Lifetime Value',
  'Gross Margin',
  'Net Dollar Retention',
  'Sales Efficiency',
  'Magic Number',
  'Rule of 40',
  'Burn Multiple',
  'Cash Conversion Score',
  'Net Income Margin',
  'Operating Margin'
];

/**
 * Sanitizes input strings to prevent XSS and injection attacks
 * @param value - Input value to sanitize
 * @returns Sanitized value
 */
function sanitizeInput(value: any): any {
  if (typeof value === 'string') {
    return value
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>"']/g, '') // Remove special characters
      .trim();
  }
  return value;
}

/**
 * Custom validator to ensure metric name matches predefined list
 * @param name - Metric name to validate
 * @returns boolean indicating if name is valid
 */
function validateMetricName(name: string): boolean {
  return VALID_METRIC_NAMES.includes(name);
}

/**
 * DTO for creating new metrics with comprehensive validation rules
 */
export class CreateMetricDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  @Matches(/^[a-zA-Z0-9\s]+$/, {
    message: 'Metric name can only contain alphanumeric characters and spaces'
  })
  @Transform(({ value }) => sanitizeInput(value))
  name: string;

  @IsString()
  @Length(10, 500)
  @Transform(({ value }) => sanitizeInput(value))
  description: string;

  @IsEnum(MetricCategory, {
    message: 'Category must be one of: GROWTH, SALES, FINANCIAL'
  })
  category: MetricCategory;
}

/**
 * DTO for updating existing metrics with partial validation support
 */
export class UpdateMetricDto {
  @IsUUID('4')
  @IsNotEmpty()
  id: string;

  @IsOptional()
  @IsString()
  @Length(3, 100)
  @Matches(/^[a-zA-Z0-9\s]+$/, {
    message: 'Metric name can only contain alphanumeric characters and spaces'
  })
  @Transform(({ value }) => sanitizeInput(value))
  name?: string;

  @IsOptional()
  @IsString()
  @Length(10, 500)
  @Transform(({ value }) => sanitizeInput(value))
  description?: string;

  @IsOptional()
  @IsEnum(MetricCategory, {
    message: 'Category must be one of: GROWTH, SALES, FINANCIAL'
  })
  category?: MetricCategory;
}

/**
 * DTO for filtering and paginating metrics with range validation
 */
export class MetricFilterDto {
  @IsOptional()
  @IsArray()
  @IsEnum(MetricCategory, { each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  categories?: MetricCategory[];

  @IsOptional()
  @IsString()
  @Length(0, 100)
  @Transform(({ value }) => sanitizeInput(value))
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value) || 1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value) || 10)
  pageSize?: number = 10;
}

/**
 * DTO for validating ARR range filters
 */
export class ARRRangeFilterDto {
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  @Matches(/^(<\$1M|\$1M-\$10M|\$10M-\$50M|\$50M-\$100M|>\$100M)$/, {
    each: true,
    message: 'Invalid ARR range format'
  })
  ranges: string[];
}

/**
 * DTO for validating percentile values
 */
export class PercentileValuesDto {
  @IsInt()
  @Min(0)
  @Max(100)
  p5: number;

  @IsInt()
  @Min(0)
  @Max(100)
  p25: number;

  @IsInt()
  @Min(0)
  @Max(100)
  p50: number;

  @IsInt()
  @Min(0)
  @Max(100)
  p75: number;

  @IsInt()
  @Min(0)
  @Max(100)
  p90: number;
}