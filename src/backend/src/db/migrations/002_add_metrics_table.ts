import { Knex } from 'knex';
import { MetricCategory } from '../../interfaces/metrics.interface';

/**
 * Migration: Create metrics table
 * Version: 1.0.0
 * Purpose: Creates the core metrics table to store SaaS KPI definitions with proper constraints and indexing
 */

export async function up(knex: Knex): Promise<void> {
  // Enable UUID generation
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // Create enum type for metric categories if it doesn't exist
  await knex.raw(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'metric_category') THEN
        CREATE TYPE metric_category AS ENUM (
          '${MetricCategory.GROWTH}',
          '${MetricCategory.SALES}',
          '${MetricCategory.FINANCIAL}'
        );
      END IF;
    END
    $$;
  `);

  // Create metrics table
  await knex.schema.createTable('metrics', (table) => {
    // Primary key
    table.uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'))
      .notNullable()
      .comment('Unique identifier for the metric');

    // Core fields
    table.string('name', 255)
      .notNullable()
      .unique()
      .comment('Human-readable name of the metric');
    
    table.text('description')
      .nullable()
      .comment('Detailed description of what the metric measures');
    
    table.specificType('category', 'metric_category')
      .notNullable()
      .comment('Business category the metric belongs to');
    
    table.integer('display_order')
      .notNullable()
      .comment('Display order for UI presentation (1-based)');
    
    table.boolean('is_active')
      .notNullable()
      .defaultTo(true)
      .comment('Flag indicating if metric is currently in use');

    // Timestamps
    table.timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('Timestamp of metric creation');
    
    table.timestamp('updated_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('Timestamp of last metric update');

    // Constraints
    table.check('?? > 0', ['display_order'], 'check_display_order_positive');
  });

  // Create indexes
  await knex.schema.raw(`
    CREATE INDEX idx_metrics_category ON metrics USING btree (category);
    CREATE INDEX idx_metrics_display_order ON metrics USING btree (display_order);
    CREATE UNIQUE INDEX idx_metrics_name ON metrics USING btree (name);
  `);

  // Create updated_at trigger
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_metrics_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER trigger_metrics_updated_at
      BEFORE UPDATE ON metrics
      FOR EACH ROW
      EXECUTE FUNCTION update_metrics_updated_at();
  `);

  // Grant permissions (assuming application role exists)
  await knex.raw(`
    GRANT SELECT, INSERT, UPDATE, DELETE ON metrics TO application_role;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO application_role;
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop triggers
  await knex.raw(`
    DROP TRIGGER IF EXISTS trigger_metrics_updated_at ON metrics;
    DROP FUNCTION IF EXISTS update_metrics_updated_at();
  `);

  // Drop table
  await knex.schema.dropTableIfExists('metrics');

  // Drop enum type
  await knex.raw(`
    DROP TYPE IF EXISTS metric_category;
  `);

  // Revoke permissions
  await knex.raw(`
    REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM application_role;
    REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM application_role;
  `);
}