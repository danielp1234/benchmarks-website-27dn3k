/**
 * @file Data source model implementation for the SaaS Benchmarks Platform
 * @description Provides comprehensive CRUD operations for data sources with validation,
 * error handling, and performance optimization
 * @version 1.0.0
 */

import { Knex, knex } from 'knex'; // v2.5.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import {
  DataSource,
  DataSourceCreate,
  DataSourceUpdate,
  DataSourceQuery
} from '../interfaces/sources.interface';
import { databaseConfig } from '../config/database.config';

/**
 * Custom error class for data source validation errors
 */
class DataSourceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataSourceValidationError';
  }
}

/**
 * Model class for managing data sources in PostgreSQL
 */
export class SourcesModel {
  private knex: Knex;
  private readonly tableName: string = 'data_sources';
  private readonly DEFAULT_PAGE_SIZE: number = 10;
  private readonly NAME_MAX_LENGTH: number = 100;
  private readonly DESCRIPTION_MAX_LENGTH: number = 500;

  constructor() {
    this.knex = knex({
      client: 'pg',
      connection: {
        host: databaseConfig.host,
        port: databaseConfig.port,
        user: databaseConfig.username,
        password: databaseConfig.password,
        database: databaseConfig.database,
        ssl: databaseConfig.ssl
      },
      pool: {
        min: 2,
        max: databaseConfig.poolSize,
        idleTimeoutMillis: databaseConfig.idleTimeoutMillis
      }
    });
  }

  /**
   * Creates a new data source
   * @param source Data source creation payload
   * @returns Created data source
   * @throws {DataSourceValidationError} If validation fails
   */
  public async create(source: DataSourceCreate): Promise<DataSource> {
    await this.validateSourceData(source);
    await this.checkDuplicateName(source.name);

    const now = new Date();
    const id = uuidv4();

    const newSource: DataSource = {
      id,
      ...source,
      createdAt: now,
      updatedAt: now
    };

    try {
      await this.knex.transaction(async (trx) => {
        await trx(this.tableName).insert({
          id: newSource.id,
          name: newSource.name,
          description: newSource.description,
          active: newSource.active,
          created_at: newSource.createdAt,
          updated_at: newSource.updatedAt
        });
      });

      return newSource;
    } catch (error) {
      throw new Error(`Failed to create data source: ${error.message}`);
    }
  }

  /**
   * Retrieves a data source by ID
   * @param id Data source ID
   * @returns Data source or null if not found
   */
  public async findById(id: string): Promise<DataSource | null> {
    try {
      const result = await this.knex(this.tableName)
        .select('*')
        .where({ id })
        .first();

      if (!result) return null;

      return this.mapDatabaseRecord(result);
    } catch (error) {
      throw new Error(`Failed to retrieve data source: ${error.message}`);
    }
  }

  /**
   * Retrieves all data sources with filtering and pagination
   * @param query Query parameters for filtering and pagination
   * @returns Paginated data sources with metadata
   */
  public async findAll(query: DataSourceQuery): Promise<{
    data: DataSource[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    try {
      const page = Math.max(1, query.page || 1);
      const pageSize = Math.min(50, query.limit || this.DEFAULT_PAGE_SIZE);
      const offset = (page - 1) * pageSize;

      let baseQuery = this.knex(this.tableName).select('*');
      baseQuery = this.applyFilters(baseQuery, query);

      const [total, data] = await Promise.all([
        this.knex(this.tableName)
          .count('* as count')
          .first()
          .then((result) => parseInt(result.count as string, 10)),
        baseQuery
          .orderBy('created_at', 'desc')
          .offset(offset)
          .limit(pageSize)
      ]);

      return {
        data: data.map(this.mapDatabaseRecord),
        total,
        page,
        pageSize
      };
    } catch (error) {
      throw new Error(`Failed to retrieve data sources: ${error.message}`);
    }
  }

  /**
   * Updates an existing data source
   * @param id Data source ID
   * @param source Update payload
   * @returns Updated data source
   * @throws {Error} If data source not found or validation fails
   */
  public async update(id: string, source: DataSourceUpdate): Promise<DataSource> {
    await this.validateSourceData(source);
    
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Data source not found');
    }

    if (source.name !== existing.name) {
      await this.checkDuplicateName(source.name, id);
    }

    try {
      const updatedAt = new Date();
      await this.knex.transaction(async (trx) => {
        const updated = await trx(this.tableName)
          .where({ id })
          .update({
            name: source.name,
            description: source.description,
            active: source.active,
            updated_at: updatedAt
          });

        if (updated === 0) {
          throw new Error('Data source not found or concurrent update detected');
        }
      });

      return {
        ...existing,
        ...source,
        updatedAt
      };
    } catch (error) {
      throw new Error(`Failed to update data source: ${error.message}`);
    }
  }

  /**
   * Deletes a data source
   * @param id Data source ID
   * @throws {Error} If data source not found or has dependencies
   */
  public async delete(id: string): Promise<void> {
    try {
      await this.knex.transaction(async (trx) => {
        // Check for dependencies in benchmark_data table
        const dependencies = await trx('benchmark_data')
          .where({ source_id: id })
          .first();

        if (dependencies) {
          throw new Error('Cannot delete data source with existing benchmark data');
        }

        const deleted = await trx(this.tableName)
          .where({ id })
          .delete();

        if (deleted === 0) {
          throw new Error('Data source not found');
        }
      });
    } catch (error) {
      throw new Error(`Failed to delete data source: ${error.message}`);
    }
  }

  /**
   * Validates data source input data
   * @param data Data to validate
   * @throws {DataSourceValidationError} If validation fails
   */
  private async validateSourceData(
    data: DataSourceCreate | DataSourceUpdate
  ): Promise<void> {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Name is required');
    } else if (data.name.length > this.NAME_MAX_LENGTH) {
      errors.push(`Name must not exceed ${this.NAME_MAX_LENGTH} characters`);
    }

    if (!data.description || data.description.trim().length === 0) {
      errors.push('Description is required');
    } else if (data.description.length > this.DESCRIPTION_MAX_LENGTH) {
      errors.push(`Description must not exceed ${this.DESCRIPTION_MAX_LENGTH} characters`);
    }

    if (typeof data.active !== 'boolean') {
      errors.push('Active status must be a boolean value');
    }

    if (errors.length > 0) {
      throw new DataSourceValidationError(errors.join('; '));
    }
  }

  /**
   * Checks for duplicate data source names
   * @param name Name to check
   * @param excludeId ID to exclude from check (for updates)
   * @returns True if duplicate exists
   */
  private async checkDuplicateName(
    name: string,
    excludeId?: string
  ): Promise<void> {
    const query = this.knex(this.tableName)
      .where('name', 'ilike', name.trim());

    if (excludeId) {
      query.whereNot('id', excludeId);
    }

    const existing = await query.first();
    if (existing) {
      throw new DataSourceValidationError('Data source name already exists');
    }
  }

  /**
   * Applies filters to the query
   * @param query Base query
   * @param filters Filter parameters
   * @returns Modified query
   */
  private applyFilters(
    query: Knex.QueryBuilder,
    filters: DataSourceQuery
  ): Knex.QueryBuilder {
    if (typeof filters.active === 'boolean') {
      query.where('active', filters.active);
    }

    if (filters.search) {
      query.where((builder) => {
        builder
          .where('name', 'ilike', `%${filters.search}%`)
          .orWhere('description', 'ilike', `%${filters.search}%`);
      });
    }

    return query;
  }

  /**
   * Maps database record to DataSource interface
   * @param record Database record
   * @returns Mapped DataSource object
   */
  private mapDatabaseRecord(record: any): DataSource {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      active: record.active,
      createdAt: record.created_at,
      updatedAt: record.updated_at
    };
  }
}