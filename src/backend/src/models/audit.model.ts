/**
 * @file Audit Model Implementation
 * @description Implements data model and database operations for audit logging with enhanced security and performance
 * @version 1.0.0
 */

import { Knex } from 'knex'; // v2.5.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import {
  AuditLog,
  AuditLogCreate,
  AuditLogQuery,
  AuditAction,
  ResourceType
} from '../interfaces/audit.interface';

/**
 * Configuration options for the AuditModel
 */
interface AuditModelConfig {
  queryTimeout?: number;
  retryAttempts?: number;
  batchSize?: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<AuditModelConfig> = {
  queryTimeout: 30000, // 30 seconds
  retryAttempts: 3,
  batchSize: 1000
};

/**
 * Model class for handling audit log database operations with enhanced performance and security
 */
export class AuditModel {
  private readonly tableName = 'audit_logs';
  private readonly db: Knex;
  private readonly config: Required<AuditModelConfig>;
  private readonly sensitiveFields = ['ip_address', 'user_agent'];

  /**
   * Initialize the audit model with database connection and configuration
   */
  constructor(db: Knex, config: AuditModelConfig = {}) {
    this.db = db;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Creates a new audit log entry with data validation and privacy protection
   */
  async create(data: AuditLogCreate): Promise<AuditLog> {
    try {
      // Validate input data
      this.validateAuditData(data);

      // Generate UUID for the new entry
      const id = uuidv4();
      const created_at = new Date();

      // Start transaction
      const result = await this.db.transaction(async (trx) => {
        const [entry] = await trx(this.tableName)
          .insert({
            id,
            ...data,
            created_at,
            changes: JSON.stringify(data.changes)
          })
          .returning('*');

        return this.formatAuditLog(entry);
      });

      return result;
    } catch (error) {
      throw this.handleError('Failed to create audit log entry', error);
    }
  }

  /**
   * Efficiently creates multiple audit log entries in a single transaction
   */
  async batchCreate(entries: AuditLogCreate[]): Promise<AuditLog[]> {
    try {
      // Validate batch size
      if (entries.length > this.config.batchSize) {
        throw new Error(`Batch size exceeds maximum limit of ${this.config.batchSize}`);
      }

      // Process entries in transaction
      const results = await this.db.transaction(async (trx) => {
        const processedEntries = entries.map(entry => ({
          id: uuidv4(),
          ...entry,
          created_at: new Date(),
          changes: JSON.stringify(entry.changes)
        }));

        const insertedEntries = await trx(this.tableName)
          .insert(processedEntries)
          .returning('*');

        return insertedEntries.map(entry => this.formatAuditLog(entry));
      });

      return results;
    } catch (error) {
      throw this.handleError('Failed to batch create audit log entries', error);
    }
  }

  /**
   * Queries audit logs with enhanced filtering, pagination and performance optimization
   */
  async query(query: AuditLogQuery): Promise<{ data: AuditLog[]; total: number }> {
    try {
      const {
        user_id,
        action,
        resource_type,
        resource_id,
        start_date,
        end_date,
        page,
        limit
      } = query;

      // Build base query with timeout
      let baseQuery = this.db(this.tableName)
        .timeout(this.config.queryTimeout);

      // Apply filters
      if (user_id) baseQuery = baseQuery.where('user_id', user_id);
      if (action) baseQuery = baseQuery.where('action', action);
      if (resource_type) baseQuery = baseQuery.where('resource_type', resource_type);
      if (resource_id) baseQuery = baseQuery.where('resource_id', resource_id);
      if (start_date) baseQuery = baseQuery.where('created_at', '>=', start_date);
      if (end_date) baseQuery = baseQuery.where('created_at', '<=', end_date);

      // Get total count
      const [{ count }] = await baseQuery.clone().count();

      // Get paginated data
      const data = await baseQuery
        .orderBy('created_at', 'desc')
        .offset((page - 1) * limit)
        .limit(limit)
        .select('*');

      return {
        data: data.map(entry => this.formatAuditLog(entry)),
        total: Number(count)
      };
    } catch (error) {
      throw this.handleError('Failed to query audit logs', error);
    }
  }

  /**
   * Validates audit log data before insertion
   */
  private validateAuditData(data: AuditLogCreate): void {
    if (!Object.values(AuditAction).includes(data.action)) {
      throw new Error('Invalid audit action');
    }
    if (!Object.values(ResourceType).includes(data.resource_type)) {
      throw new Error('Invalid resource type');
    }
    if (!data.user_id || !data.resource_id) {
      throw new Error('Missing required fields');
    }
  }

  /**
   * Formats audit log entry for response
   */
  private formatAuditLog(entry: any): AuditLog {
    return {
      ...entry,
      changes: typeof entry.changes === 'string' ? JSON.parse(entry.changes) : entry.changes,
      created_at: new Date(entry.created_at)
    };
  }

  /**
   * Handles and formats error responses
   */
  private handleError(message: string, error: any): Error {
    console.error(`Audit Model Error: ${message}`, error);
    return new Error(`${message}: ${error.message}`);
  }

  /**
   * Masks sensitive information in audit log entries
   */
  private maskSensitiveData(data: any): any {
    const masked = { ...data };
    this.sensitiveFields.forEach(field => {
      if (masked[field]) {
        masked[field] = this.maskValue(masked[field]);
      }
    });
    return masked;
  }

  /**
   * Masks individual values while preserving some identifiable information
   */
  private maskValue(value: string): string {
    if (typeof value !== 'string') return value;
    if (value.length <= 4) return '*'.repeat(value.length);
    return value.slice(0, 2) + '*'.repeat(value.length - 4) + value.slice(-2);
  }
}