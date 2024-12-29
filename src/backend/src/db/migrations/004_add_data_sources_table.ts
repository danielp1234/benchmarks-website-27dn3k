/**
 * @file Database migration for data_sources table creation
 * @version 1.0.0
 * @description Creates the data_sources table with comprehensive support for data integrity,
 * performance optimization, and audit tracking. Implements requirements from technical specification
 * sections 1.3 and 3.2.1.
 */

import { Knex } from 'knex'; // ^2.5.0
import { DataSource } from '../../interfaces/sources.interface';

/**
 * Creates the data_sources table with all required columns, constraints, and indexes
 * for optimal performance and data integrity.
 * 
 * @param knex - Knex instance for database operations
 * @returns Promise resolving when migration is complete
 */
export async function up(knex: Knex): Promise<void> {
  // Create updated_at trigger function if it doesn't exist
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // Create the data_sources table
  await knex.schema.createTable('data_sources', (table: Knex.TableBuilder) => {
    // Primary key using UUID
    table.uuid('id')
      .primary()
      .defaultTo(knex.raw('gen_random_uuid()'))
      .notNullable()
      .comment('Unique identifier for the data source');

    // Required name field with unique constraint
    table.string('name', 255)
      .notNullable()
      .unique()
      .comment('Name of the data source');

    // Optional description field
    table.text('description')
      .nullable()
      .comment('Detailed description of the data source');

    // Active status flag
    table.boolean('active')
      .notNullable()
      .defaultTo(true)
      .comment('Flag indicating if the data source is currently active');

    // Audit timestamps
    table.timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('Timestamp when the record was created');
    
    table.timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('Timestamp when the record was last updated');

    // Add table comment
    table.comment('Stores information about data sources providing SaaS benchmark data');
  });

  // Create indexes for performance optimization
  await knex.schema.raw(`
    -- Create index for name lookups
    CREATE INDEX idx_data_sources_name ON data_sources USING btree (name);

    -- Create index for active status filtering
    CREATE INDEX idx_data_sources_active ON data_sources USING btree (active);

    -- Create composite index for common query pattern
    CREATE INDEX idx_data_sources_active_name ON data_sources USING btree (active, name);
  `);

  // Create trigger for automatic updated_at timestamp
  await knex.raw(`
    CREATE TRIGGER update_data_sources_updated_at
      BEFORE UPDATE ON data_sources
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);

  // Add foreign key constraint check
  await knex.raw(`
    ALTER TABLE data_sources
    ADD CONSTRAINT chk_data_sources_referenced
    CHECK (
      NOT EXISTS (
        SELECT 1
        FROM benchmark_data
        WHERE benchmark_data.source_id = data_sources.id
      ) OR active = true
    );
  `);
}

/**
 * Rolls back the data_sources table creation by removing all related objects
 * in the correct order to maintain referential integrity.
 * 
 * @param knex - Knex instance for database operations
 * @returns Promise resolving when rollback is complete
 */
export async function down(knex: Knex): Promise<void> {
  // Remove trigger
  await knex.raw('DROP TRIGGER IF EXISTS update_data_sources_updated_at ON data_sources');

  // Remove indexes
  await knex.schema.raw(`
    DROP INDEX IF EXISTS idx_data_sources_active_name;
    DROP INDEX IF EXISTS idx_data_sources_active;
    DROP INDEX IF EXISTS idx_data_sources_name;
  `);

  // Drop the table with cascade to handle any dependent objects
  await knex.schema.dropTableIfExists('data_sources');

  // Clean up trigger function if no other tables are using it
  await knex.raw(`
    DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
  `);
}