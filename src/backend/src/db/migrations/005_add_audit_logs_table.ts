// knex v2.5.0
import { Knex } from 'knex';

/**
 * Migration to create the audit_logs table for comprehensive tracking of administrative 
 * actions and security events in the system.
 * 
 * This migration implements:
 * - Detailed action and resource tracking
 * - Efficient indexing for time-based and resource-based queries
 * - Data integrity constraints
 * - Complete change history in JSONB format
 * - Request context capture (IP, user agent)
 */
export async function up(knex: Knex): Promise<void> {
    // Create custom enum types first
    await knex.raw(`
        CREATE TYPE audit_action_type AS ENUM (
            'CREATE',
            'READ',
            'UPDATE',
            'DELETE',
            'LOGIN',
            'LOGOUT',
            'EXPORT',
            'IMPORT',
            'CONFIGURE',
            'AUTHORIZE',
            'REVOKE'
        );
    `);

    await knex.raw(`
        CREATE TYPE audit_resource_type AS ENUM (
            'USER',
            'METRIC',
            'BENCHMARK',
            'DATA_SOURCE',
            'SYSTEM_CONFIG',
            'EXPORT',
            'IMPORT',
            'SESSION',
            'PERMISSION'
        );
    `);

    // Create the audit_logs table with comprehensive columns and constraints
    await knex.schema.createTable('audit_logs', (table) => {
        // Primary key
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

        // Actor and action details
        table.uuid('user_id')
            .notNullable()
            .references('id')
            .inTable('users')
            .onDelete('RESTRICT')
            .onUpdate('CASCADE');

        table.specificType('action', 'audit_action_type').notNullable();
        table.specificType('resource_type', 'audit_resource_type').notNullable();
        table.uuid('resource_id').notNullable();

        // Detailed change tracking
        table.jsonb('changes').notNullable().defaultTo('{}');
        
        // Request context
        table.specificType('ip_address', 'VARCHAR(45)').notNullable();
        table.text('user_agent').notNullable();
        
        // Additional context (optional)
        table.text('description');
        table.jsonb('metadata').defaultTo('{}');
        
        // Timestamp with timezone
        table.timestamp('created_at', { useTz: true })
            .notNullable()
            .defaultTo(knex.raw('CURRENT_TIMESTAMP'));

        // Prevent modifications after creation
        table.timestamp('updated_at', { useTz: true }).null();
    });

    // Create efficient indexes for common query patterns
    
    // BRIN index for time-based queries (efficient for append-only logs)
    await knex.raw(`
        CREATE INDEX idx_audit_logs_created_at 
        ON audit_logs USING BRIN (created_at);
    `);

    // Composite index for user activity queries
    await knex.schema.raw(`
        CREATE INDEX idx_audit_logs_user_activity 
        ON audit_logs (user_id, created_at DESC);
    `);

    // Composite index for resource audits
    await knex.schema.raw(`
        CREATE INDEX idx_audit_logs_resource 
        ON audit_logs (resource_type, resource_id);
    `);

    // Add table comment for documentation
    await knex.raw(`
        COMMENT ON TABLE audit_logs IS 
        'Comprehensive audit log tracking all administrative actions and security events';
    `);
}

/**
 * Rollback migration to remove the audit_logs table and related database objects
 */
export async function down(knex: Knex): Promise<void> {
    // Drop indexes first
    await knex.schema.raw('DROP INDEX IF EXISTS idx_audit_logs_created_at');
    await knex.schema.raw('DROP INDEX IF EXISTS idx_audit_logs_user_activity');
    await knex.schema.raw('DROP INDEX IF EXISTS idx_audit_logs_resource');

    // Drop the table
    await knex.schema.dropTableIfExists('audit_logs');

    // Drop custom enum types
    await knex.raw('DROP TYPE IF EXISTS audit_action_type');
    await knex.raw('DROP TYPE IF EXISTS audit_resource_type');
}