/**
 * @file Initial data sources seed file
 * @description Seeds default data sources into the platform with comprehensive validation and error handling
 * @version 1.0.0
 */

import { Knex } from 'knex'; // v2.5.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { DataSource } from '../../interfaces/sources.interface';

/**
 * Initial data sources to be seeded into the database
 * Each source includes a comprehensive description and proper typing
 */
const initialSources: Omit<DataSource, 'createdAt' | 'updatedAt'>[] = [
  {
    id: uuidv4(),
    name: 'Industry Survey 2023',
    description: 'Comprehensive annual industry survey data collected from SaaS companies across different revenue ranges and growth stages',
    active: true
  },
  {
    id: uuidv4(),
    name: 'Market Research Data',
    description: 'Curated and validated market research data aggregated from public sources, analyst reports, and industry publications',
    active: true
  },
  {
    id: uuidv4(),
    name: 'Historical Benchmarks',
    description: 'Verified historical benchmark data from previous years, providing trend analysis and performance comparisons',
    active: true
  }
];

/**
 * Seeds initial data sources into the database
 * @param knex - Knex instance for database operations
 * @returns Promise that resolves when seeding is complete
 * @throws Error if seeding fails with detailed error message
 */
export async function seed(knex: Knex): Promise<void> {
  try {
    // Begin transaction for atomic operations
    await knex.transaction(async (trx) => {
      // Clear existing data from data_sources table
      await trx('data_sources').del();

      // Prepare records with timestamps
      const sourcesWithTimestamps = initialSources.map(source => ({
        ...source,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      }));

      // Validate data before insertion
      sourcesWithTimestamps.forEach(source => {
        if (!source.id || !source.name || !source.description) {
          throw new Error(`Invalid data source record: ${JSON.stringify(source)}`);
        }
      });

      // Insert initial data sources
      await trx('data_sources').insert(sourcesWithTimestamps);

      // Log successful seeding
      console.log(`Successfully seeded ${sourcesWithTimestamps.length} data sources`);
    });
  } catch (error) {
    // Provide detailed error message for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during data source seeding';
    console.error('Failed to seed data sources:', errorMessage);
    throw new Error(`Data source seeding failed: ${errorMessage}`);
  }
}

export default { seed };