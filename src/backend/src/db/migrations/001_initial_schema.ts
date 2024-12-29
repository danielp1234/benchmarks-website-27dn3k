import { Knex } from 'knex'; // ^2.5.0

/**
 * Initial database migration that sets up the core schema for the SaaS Benchmarks Platform.
 * Creates tables for metrics, data sources, benchmark data, and audit logs with comprehensive
 * indexing and security features.
 */

/**
 * Creates the initial database schema with core tables including enhanced security features
 * and optimized indexing.
 * @param knex - Knex instance for database operations
 */
export async function up(knex: Knex): Promise<void> {
  // Create metrics table
  await knex.schema.createTable('metrics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable().unique();
    table.text('description');
    table.enum('category', ['GROWTH', 'SALES', 'FINANCE', 'PRODUCT', 'CUSTOMER']).notNullable();
    table.integer('display_order').notNullable();
    table.boolean('active').notNullable().defaultTo(true);
    table.uuid('created_by_user_id').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index(['category', 'display_order']);
    table.index(['active']);
  });

  // Create data_sources table
  await knex.schema.createTable('data_sources', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable().unique();
    table.text('description');
    table.string('version', 50).notNullable();
    table.jsonb('configuration').notNullable();
    table.boolean('active').notNullable().defaultTo(true);
    table.timestamp('last_import_at');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index(['active']);
    table.index(['last_import_at']);
  });

  // Create benchmark_data table
  await knex.schema.createTable('benchmark_data', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('metric_id').notNullable().references('id').inTable('metrics').onDelete('RESTRICT');
    table.uuid('source_id').notNullable().references('id').inTable('data_sources').onDelete('RESTRICT');
    table.string('arr_range', 50).notNullable();
    table.decimal('p5_value', 15, 2);
    table.decimal('p25_value', 15, 2);
    table.decimal('p50_value', 15, 2);
    table.decimal('p75_value', 15, 2);
    table.decimal('p90_value', 15, 2);
    table.enum('validation_status', ['PENDING', 'VALIDATED', 'REJECTED']).notNullable().defaultTo('PENDING');
    table.uuid('import_batch_id').notNullable();
    table.timestamp('effective_date').notNullable();

    // Indexes
    table.index(['metric_id', 'arr_range', 'effective_date']);
    table.index(['source_id', 'effective_date']);
    table.index(['validation_status']);
    table.index(['import_batch_id']);
  });

  // Create audit_logs table
  await knex.schema.createTable('audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.string('session_id', 100).notNullable();
    table.string('action', 100).notNullable();
    table.string('resource_type', 50).notNullable();
    table.uuid('resource_id').notNullable();
    table.jsonb('changes').notNullable();
    table.enum('severity', ['INFO', 'WARNING', 'ERROR']).notNullable();
    table.string('ip_address', 45).notNullable(); // IPv6 compatible
    table.string('user_agent', 255);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index(['resource_type', 'resource_id']);
    table.index(['user_id']);
    table.index(['created_at'], undefined, { indexType: 'BRIN' }); // BRIN index for time-series data
  });

  // Create partial index for pending validation
  await knex.raw(`
    CREATE INDEX idx_benchmark_data_pending_validation 
    ON benchmark_data (validation_status) 
    WHERE validation_status = 'PENDING'
  `);

  // Add updated_at trigger for metrics table
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  await knex.raw(`
    CREATE TRIGGER update_metrics_updated_at
      BEFORE UPDATE ON metrics
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);
}

/**
 * Rolls back the initial schema by dropping all created tables in correct order
 * respecting dependencies.
 * @param knex - Knex instance for database operations
 */
export async function down(knex: Knex): Promise<void> {
  // Drop triggers first
  await knex.raw('DROP TRIGGER IF EXISTS update_metrics_updated_at ON metrics');
  await knex.raw('DROP FUNCTION IF EXISTS update_updated_at_column');

  // Drop tables in reverse order of creation to respect foreign key constraints
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('benchmark_data');
  await knex.schema.dropTableIfExists('data_sources');
  await knex.schema.dropTableIfExists('metrics');
}