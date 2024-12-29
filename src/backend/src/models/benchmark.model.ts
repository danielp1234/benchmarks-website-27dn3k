// pg v8.11.0 - PostgreSQL client for Node.js
import { QueryResult } from 'pg';
// uuid v9.0.0 - UUID generation
import { v4 as uuidv4 } from 'uuid';
// Internal imports
import { BenchmarkData, BenchmarkFilter, BenchmarkResponse } from '../interfaces/benchmark.interface';
import { pool } from '../config/database.config';

/**
 * Error messages for benchmark operations
 */
const ERROR_MESSAGES = {
  INVALID_PERCENTILE: 'Percentile values must be between 0 and 100',
  INVALID_ARR_RANGE: 'Invalid ARR range format',
  METRIC_NOT_FOUND: 'Metric ID not found',
  SOURCE_NOT_FOUND: 'Source ID not found',
  BENCHMARK_NOT_FOUND: 'Benchmark not found',
  TRANSACTION_FAILED: 'Transaction failed',
  QUERY_TIMEOUT: 'Query timeout exceeded'
} as const;

/**
 * Validates percentile values for benchmark data
 * @param benchmarkData - Benchmark data to validate
 * @throws Error if percentile values are invalid
 */
const validatePercentiles = (benchmarkData: Partial<BenchmarkData>): void => {
  const percentiles = ['p5Value', 'p25Value', 'p50Value', 'p75Value', 'p90Value'] as const;
  
  for (const percentile of percentiles) {
    if (benchmarkData[percentile] !== undefined) {
      const value = benchmarkData[percentile];
      if (value < 0 || value > 100) {
        throw new Error(`${ERROR_MESSAGES.INVALID_PERCENTILE}: ${percentile}`);
      }
    }
  }
};

/**
 * Validates ARR range format
 * @param arrRange - ARR range string to validate
 * @throws Error if ARR range format is invalid
 */
const validateArrRange = (arrRange: string): void => {
  const validRanges = ['0-1M', '1M-10M', '10M-50M', '50M-100M', '100M+'];
  if (!validRanges.includes(arrRange)) {
    throw new Error(ERROR_MESSAGES.INVALID_ARR_RANGE);
  }
};

/**
 * Creates a new benchmark data entry
 * @param benchmarkData - Benchmark data to create
 * @returns Promise resolving to created benchmark data
 */
export const createBenchmark = async (benchmarkData: Omit<BenchmarkData, 'id'>): Promise<BenchmarkData> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Validate percentiles and ARR range
    validatePercentiles(benchmarkData);
    validateArrRange(benchmarkData.arrRange);
    
    // Verify metric and source exist
    const metricExists = await client.query(
      'SELECT EXISTS(SELECT 1 FROM metrics WHERE id = $1)',
      [benchmarkData.metricId]
    );
    
    if (!metricExists.rows[0].exists) {
      throw new Error(ERROR_MESSAGES.METRIC_NOT_FOUND);
    }
    
    const sourceExists = await client.query(
      'SELECT EXISTS(SELECT 1 FROM data_sources WHERE id = $1)',
      [benchmarkData.sourceId]
    );
    
    if (!sourceExists.rows[0].exists) {
      throw new Error(ERROR_MESSAGES.SOURCE_NOT_FOUND);
    }
    
    const id = uuidv4();
    const query = `
      INSERT INTO benchmark_data (
        id, metric_id, source_id, arr_range,
        p5_value, p25_value, p50_value, p75_value, p90_value,
        effective_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const values = [
      id,
      benchmarkData.metricId,
      benchmarkData.sourceId,
      benchmarkData.arrRange,
      benchmarkData.p5Value,
      benchmarkData.p25Value,
      benchmarkData.p50Value,
      benchmarkData.p75Value,
      benchmarkData.p90Value,
      benchmarkData.effectiveDate
    ];
    
    const result = await client.query(query, values);
    await client.query('COMMIT');
    
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Retrieves a benchmark by ID
 * @param id - Benchmark ID to retrieve
 * @returns Promise resolving to benchmark data or null if not found
 */
export const getBenchmarkById = async (id: string): Promise<BenchmarkData | null> => {
  const query = `
    SELECT *
    FROM benchmark_data
    WHERE id = $1
  `;
  
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

/**
 * Retrieves benchmarks with filtering and pagination
 * @param filter - Filter criteria for benchmarks
 * @param page - Page number (1-based)
 * @param pageSize - Number of items per page
 * @returns Promise resolving to paginated benchmark response
 */
export const getBenchmarks = async (
  filter: BenchmarkFilter,
  page: number = 1,
  pageSize: number = 10
): Promise<BenchmarkResponse> => {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  if (filter.metricIds?.length) {
    conditions.push(`metric_id = ANY($${paramIndex})`);
    values.push(filter.metricIds);
    paramIndex++;
  }
  
  if (filter.sourceIds?.length) {
    conditions.push(`source_id = ANY($${paramIndex})`);
    values.push(filter.sourceIds);
    paramIndex++;
  }
  
  if (filter.arrRanges?.length) {
    conditions.push(`arr_range = ANY($${paramIndex})`);
    values.push(filter.arrRanges);
    paramIndex++;
  }
  
  if (filter.startDate) {
    conditions.push(`effective_date >= $${paramIndex}`);
    values.push(filter.startDate);
    paramIndex++;
  }
  
  if (filter.endDate) {
    conditions.push(`effective_date <= $${paramIndex}`);
    values.push(filter.endDate);
    paramIndex++;
  }
  
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  
  // Get total count
  const countQuery = `
    SELECT COUNT(*)
    FROM benchmark_data
    ${whereClause}
  `;
  
  const countResult = await pool.query(countQuery, values);
  const total = parseInt(countResult.rows[0].count);
  
  // Get paginated data
  const offset = (page - 1) * pageSize;
  const dataQuery = `
    SELECT *
    FROM benchmark_data
    ${whereClause}
    ORDER BY effective_date DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  
  const dataResult = await pool.query(
    dataQuery,
    [...values, pageSize, offset]
  );
  
  return {
    data: dataResult.rows,
    total,
    page,
    pageSize
  };
};

/**
 * Updates a benchmark entry
 * @param id - Benchmark ID to update
 * @param updates - Partial benchmark data to update
 * @returns Promise resolving to updated benchmark data
 */
export const updateBenchmark = async (
  id: string,
  updates: Partial<BenchmarkData>
): Promise<BenchmarkData> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Validate benchmark exists
    const existing = await client.query(
      'SELECT EXISTS(SELECT 1 FROM benchmark_data WHERE id = $1)',
      [id]
    );
    
    if (!existing.rows[0].exists) {
      throw new Error(ERROR_MESSAGES.BENCHMARK_NOT_FOUND);
    }
    
    // Validate updates
    if (updates.arrRange) {
      validateArrRange(updates.arrRange);
    }
    validatePercentiles(updates);
    
    const updateFields: string[] = [];
    const values: any[] = [id];
    let paramIndex = 2;
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        updateFields.push(`${key.toLowerCase()} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });
    
    const query = `
      UPDATE benchmark_data
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await client.query(query, values);
    await client.query('COMMIT');
    
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Soft deletes a benchmark entry
 * @param id - Benchmark ID to delete
 */
export const deleteBenchmark = async (id: string): Promise<void> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Validate benchmark exists
    const existing = await client.query(
      'SELECT EXISTS(SELECT 1 FROM benchmark_data WHERE id = $1 AND deleted_at IS NULL)',
      [id]
    );
    
    if (!existing.rows[0].exists) {
      throw new Error(ERROR_MESSAGES.BENCHMARK_NOT_FOUND);
    }
    
    // Soft delete the benchmark
    await client.query(
      'UPDATE benchmark_data SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};