// @ts-check
import { UUID } from 'crypto';
import { isUUID } from 'validator'; // version: 13.x
import { isDate } from 'validator'; // version: 13.x
import { BenchmarkData, BenchmarkFilter } from '../interfaces/benchmark.interface';

/**
 * Constants for benchmark data validation and processing
 */
const VALID_ARR_RANGES = ['0-1M', '1M-10M', '10M-50M', '50M-100M', '100M+'] as const;
const MIN_PERCENTILE_VALUE = 0;
const MAX_PERCENTILE_VALUE = 1000;
const CACHE_TTL = 300; // 5 minutes in seconds

/**
 * Custom error class for benchmark validation errors
 */
class BenchmarkValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BenchmarkValidationError';
    }
}

/**
 * Performance monitoring decorator
 */
function performanceMonitor(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
        const start = performance.now();
        const result = originalMethod.apply(this, args);
        const end = performance.now();
        console.debug(`${propertyKey} execution time: ${end - start}ms`);
        return result;
    };
    return descriptor;
}

/**
 * Validates benchmark data for data integrity and business rules
 * @param data - Benchmark data object to validate
 * @throws {BenchmarkValidationError} When validation fails
 * @returns {boolean} True if validation passes
 */
export function validateBenchmarkData(data: BenchmarkData): boolean {
    try {
        // Validate UUIDs
        if (!isUUID(data.metricId.toString()) || !isUUID(data.sourceId.toString())) {
            throw new BenchmarkValidationError('Invalid UUID format for metricId or sourceId');
        }

        // Validate ARR range
        if (!VALID_ARR_RANGES.includes(data.arrRange as any)) {
            throw new BenchmarkValidationError(`Invalid ARR range. Must be one of: ${VALID_ARR_RANGES.join(', ')}`);
        }

        // Validate percentile values
        const percentiles = [
            { name: 'p5', value: data.p5Value },
            { name: 'p25', value: data.p25Value },
            { name: 'p50', value: data.p50Value },
            { name: 'p75', value: data.p75Value },
            { name: 'p90', value: data.p90Value }
        ];

        // Check value ranges
        percentiles.forEach(({ name, value }) => {
            if (value < MIN_PERCENTILE_VALUE || value > MAX_PERCENTILE_VALUE) {
                throw new BenchmarkValidationError(
                    `${name} value ${value} is outside valid range [${MIN_PERCENTILE_VALUE}, ${MAX_PERCENTILE_VALUE}]`
                );
            }
        });

        // Validate percentile order
        for (let i = 0; i < percentiles.length - 1; i++) {
            if (percentiles[i].value >= percentiles[i + 1].value) {
                throw new BenchmarkValidationError(
                    `Invalid percentile order: ${percentiles[i].name} must be less than ${percentiles[i + 1].name}`
                );
            }
        }

        // Validate effective date
        if (!(data.effectiveDate instanceof Date) || isNaN(data.effectiveDate.getTime())) {
            throw new BenchmarkValidationError('Invalid effective date');
        }

        return true;
    } catch (error) {
        if (error instanceof BenchmarkValidationError) {
            throw error;
        }
        throw new BenchmarkValidationError(`Validation error: ${error.message}`);
    }
}

/**
 * Applies filters to benchmark data with optimized performance
 * @param data - Array of benchmark data to filter
 * @param filter - Filter criteria to apply
 * @returns Filtered benchmark data array
 */
export function applyBenchmarkFilter(data: BenchmarkData[], filter: BenchmarkFilter): BenchmarkData[] {
    // Create Sets for O(1) lookup performance
    const metricIdSet = filter.metricIds ? new Set(filter.metricIds) : null;
    const sourceIdSet = filter.sourceIds ? new Set(filter.sourceIds) : null;
    const arrRangeSet = filter.arrRanges ? new Set(filter.arrRanges) : null;

    return data.filter(item => {
        // Apply metric filter
        if (metricIdSet && !metricIdSet.has(item.metricId)) {
            return false;
        }

        // Apply source filter
        if (sourceIdSet && !sourceIdSet.has(item.sourceId)) {
            return false;
        }

        // Apply ARR range filter
        if (arrRangeSet && !arrRangeSet.has(item.arrRange)) {
            return false;
        }

        // Apply date range filter
        if (filter.startDate && item.effectiveDate < filter.startDate) {
            return false;
        }
        if (filter.endDate && item.effectiveDate > filter.endDate) {
            return false;
        }

        return true;
    });
}

/**
 * Calculates percentile distribution for a set of values
 * @param values - Array of numeric values to calculate percentiles for
 * @returns Object containing p5, p25, p50, p75, and p90 values
 */
export function calculatePercentileDistribution(values: number[]): {
    p5Value: number;
    p25Value: number;
    p50Value: number;
    p75Value: number;
    p90Value: number;
} {
    if (!Array.isArray(values) || values.length === 0) {
        throw new Error('Input must be a non-empty array of numbers');
    }

    // Sort values for percentile calculation
    const sortedValues = [...values].sort((a, b) => a - b);
    
    /**
     * Helper function to calculate percentile value
     * @param percentile - Percentile to calculate (0-100)
     */
    const calculatePercentile = (percentile: number): number => {
        const index = (percentile / 100) * (sortedValues.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        
        if (lower === upper) {
            return sortedValues[lower];
        }
        
        const fraction = index - lower;
        return sortedValues[lower] + fraction * (sortedValues[upper] - sortedValues[lower]);
    };

    return {
        p5Value: calculatePercentile(5),
        p25Value: calculatePercentile(25),
        p50Value: calculatePercentile(50),
        p75Value: calculatePercentile(75),
        p90Value: calculatePercentile(90)
    };
}

/**
 * Type guard to check if a value is a valid benchmark data object
 * @param value - Value to check
 * @returns Boolean indicating if value is a valid BenchmarkData object
 */
export function isBenchmarkData(value: any): value is BenchmarkData {
    try {
        validateBenchmarkData(value);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validates filter parameters for consistency and correctness
 * @param filter - Filter object to validate
 * @throws {Error} When filter parameters are invalid
 */
export function validateFilter(filter: BenchmarkFilter): void {
    // Validate UUIDs if present
    if (filter.metricIds) {
        filter.metricIds.forEach(id => {
            if (!isUUID(id.toString())) {
                throw new Error(`Invalid metric ID: ${id}`);
            }
        });
    }

    if (filter.sourceIds) {
        filter.sourceIds.forEach(id => {
            if (!isUUID(id.toString())) {
                throw new Error(`Invalid source ID: ${id}`);
            }
        });
    }

    // Validate ARR ranges if present
    if (filter.arrRanges) {
        filter.arrRanges.forEach(range => {
            if (!VALID_ARR_RANGES.includes(range as any)) {
                throw new Error(`Invalid ARR range: ${range}`);
            }
        });
    }

    // Validate date range if present
    if (filter.startDate && filter.endDate && filter.startDate > filter.endDate) {
        throw new Error('Start date must be before end date');
    }
}