// @ts-check
import { Knex } from 'knex'; // version: ^2.5.0
import { BenchmarkData } from '../../interfaces/benchmark.interface';

/**
 * Creates the benchmark_data table with all necessary constraints, relationships,
 * and optimized indexes for production-grade performance.
 * 
 * @param {Knex} knex - The Knex instance for database operations
 * @returns {Promise<void>} Resolves when migration is complete
 */
export async function up(knex: Knex): Promise<void> {
    // Enable UUID generation if not already enabled
    await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await knex.schema.createTable('benchmark_data', (table) => {
        // Primary key using UUID
        table.uuid('id')
            .primary()
            .defaultTo(knex.raw('uuid_generate_v4()'))
            .notNullable();

        // Foreign key to metrics table
        table.uuid('metric_id')
            .notNullable()
            .references('id')
            .inTable('metrics')
            .onDelete('CASCADE')
            .index();

        // Foreign key to data_sources table
        table.uuid('source_id')
            .notNullable()
            .references('id')
            .inTable('data_sources')
            .onDelete('CASCADE')
            .index();

        // ARR range with validation
        table.string('arr_range', 50)
            .notNullable()
            .checkIn([
                '$0-$1M',
                '$1M-$10M',
                '$10M-$50M',
                '$50M-$100M',
                '$100M+'
            ]);

        // Percentile values with range constraints
        table.decimal('p5_value', 10, 2)
            .notNullable()
            .checkBetween([0, 100]);
        
        table.decimal('p25_value', 10, 2)
            .notNullable()
            .checkBetween([0, 100]);
        
        table.decimal('p50_value', 10, 2)
            .notNullable()
            .checkBetween([0, 100]);
        
        table.decimal('p75_value', 10, 2)
            .notNullable()
            .checkBetween([0, 100]);
        
        table.decimal('p90_value', 10, 2)
            .notNullable()
            .checkBetween([0, 100]);

        // Temporal tracking with timezone awareness
        table.timestamp('effective_date', { useTz: true })
            .notNullable()
            .defaultTo(knex.fn.now());

        // Metadata columns
        table.timestamp('created_at', { useTz: true })
            .notNullable()
            .defaultTo(knex.fn.now());
        
        table.timestamp('updated_at', { useTz: true })
            .notNullable()
            .defaultTo(knex.fn.now());

        // Composite indexes for optimized querying
        table.index(['metric_id', 'arr_range', 'effective_date'], 
            'idx_benchmark_metric_range_date');
        table.index(['source_id', 'effective_date'],
            'idx_benchmark_source_date');
    });

    // Add check constraint for percentile order
    await knex.raw(`
        ALTER TABLE benchmark_data 
        ADD CONSTRAINT chk_percentile_order 
        CHECK (
            p5_value <= p25_value AND 
            p25_value <= p50_value AND 
            p50_value <= p75_value AND 
            p75_value <= p90_value
        )
    `);

    // Create partial index for specific ARR ranges
    await knex.raw(`
        CREATE INDEX idx_benchmark_arr_range 
        ON benchmark_data (arr_range) 
        WHERE arr_range IN ('$10M-$50M', '$50M-$100M', '$100M+')
    `);

    // Add trigger for updated_at
    await knex.raw(`
        CREATE TRIGGER update_benchmark_data_timestamp
        BEFORE UPDATE ON benchmark_data
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);
}

/**
 * Rolls back the benchmark_data table creation by removing all constraints,
 * indexes, and the table itself.
 * 
 * @param {Knex} knex - The Knex instance for database operations
 * @returns {Promise<void>} Resolves when rollback is complete
 */
export async function down(knex: Knex): Promise<void> {
    // Drop triggers first
    await knex.raw(`
        DROP TRIGGER IF EXISTS update_benchmark_data_timestamp 
        ON benchmark_data
    `);

    // Drop the table with all its constraints and indexes
    await knex.schema.dropTableIfExists('benchmark_data');
}