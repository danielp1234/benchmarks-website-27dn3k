/**
 * Initial Metrics Seed File
 * Version: 1.0.0
 * 
 * Seeds the database with the 14 core SaaS KPI metrics including their categories,
 * descriptions, and display order. Implements idempotent seeding with comprehensive
 * error handling and logging.
 */

import { Knex } from 'knex'; // v2.5.x
import { v4 as uuidv4 } from 'uuid'; // v9.0.x
import { MetricCategory } from '../../interfaces/metrics.interface';
import { METRIC_NAMES, METRIC_DESCRIPTIONS, METRIC_CATEGORIES, METRIC_DISPLAY_ORDER } from '../../constants/metrics';

/**
 * Generates the initial metrics data array with UUIDs and timestamps
 * @returns Array of metric objects ready for database insertion
 */
const generateMetricsData = () => {
  const now = new Date().toISOString();
  
  return Object.entries(METRIC_NAMES).map(([key, name]) => ({
    id: uuidv4(),
    name,
    description: METRIC_DESCRIPTIONS[key],
    category: METRIC_CATEGORIES[key],
    display_order: METRIC_DISPLAY_ORDER[key],
    is_active: true,
    created_at: now,
    updated_at: now
  }));
};

/**
 * Validates metric data before insertion
 * @param metrics Array of metric objects to validate
 * @throws Error if validation fails
 */
const validateMetricsData = (metrics: any[]) => {
  const errors = metrics.reduce((acc: string[], metric, index) => {
    if (!metric.name || !metric.description || !metric.category) {
      acc.push(`Invalid metric data at index ${index}: missing required fields`);
    }
    if (!Object.values(MetricCategory).includes(metric.category)) {
      acc.push(`Invalid category "${metric.category}" for metric "${metric.name}"`);
    }
    return acc;
  }, []);

  if (errors.length > 0) {
    throw new Error(`Metric validation failed:\n${errors.join('\n')}`);
  }
};

/**
 * Seeds the metrics table with initial SaaS KPI definitions
 * Implements idempotent seeding with error handling and logging
 */
export async function seed(knex: Knex): Promise<void> {
  try {
    // Begin transaction for atomic operation
    await knex.transaction(async (trx) => {
      console.log('Starting metrics seed operation...');

      // Clear existing data
      await trx('metrics').del();
      console.log('Cleared existing metrics data');

      // Generate and validate metrics data
      const metricsData = generateMetricsData();
      validateMetricsData(metricsData);
      console.log(`Generated ${metricsData.length} metric records`);

      // Insert metrics data
      await trx('metrics').insert(metricsData);
      console.log('Successfully inserted metrics data');

      // Verify insertion
      const count = await trx('metrics').count('id as count').first();
      console.log(`Verified ${count?.count} metrics in database`);
    });

    console.log('Metrics seed operation completed successfully');
  } catch (error) {
    console.error('Error during metrics seed operation:', error);
    throw error; // Re-throw to indicate seed failure
  }
}

/**
 * Seed Configuration
 * Exports the seed function for Knex CLI and programmatic usage
 */
export default { seed };