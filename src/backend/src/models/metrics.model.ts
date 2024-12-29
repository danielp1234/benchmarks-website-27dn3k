/**
 * Metrics Model Implementation
 * Version: 1.0.0
 * 
 * Implements the database model and operations for SaaS metrics using TypeORM
 * with enhanced indexing, validation, and performance optimizations.
 */

import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn, 
  Index,
  BeforeInsert,
  BeforeUpdate,
  AfterLoad
} from 'typeorm'; // v0.3.x

import {
  IsUUID,
  IsString,
  IsEnum,
  IsInt,
  IsDate,
  Length,
  Matches,
  Min,
  Max
} from 'class-validator'; // v0.14.x

import { Metric, MetricCategory } from '../interfaces/metrics.interface';
import { DEFAULT_PAGE_SIZE } from '../constants/metrics';
import { databaseConfig } from '../config/database.config';

/**
 * Cache configuration for metric transformations
 */
const CACHE_TTL = 300; // 5 minutes in seconds
const CACHE_PREFIX = 'metric:';

/**
 * TypeORM entity representing a SaaS metric with enhanced validation and indexing
 */
@Entity('metrics')
@Index(['category', 'name']) // Composite index for filtering by category and name
@Index(['updatedAt']) // Index for sorting by last update
export class MetricEntity implements Metric {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @Column({ length: 100 })
  @Index()
  @IsString()
  @Length(3, 100)
  @Matches(/^[a-zA-Z0-9\s\-_]+$/, {
    message: 'Name can only contain alphanumeric characters, spaces, hyphens, and underscores'
  })
  name: string;

  @Column({ type: 'text' })
  @IsString()
  @Length(10, 1000)
  description: string;

  @Column({
    type: 'enum',
    enum: MetricCategory,
    default: MetricCategory.GROWTH
  })
  @IsEnum(MetricCategory)
  category: MetricCategory;

  @Column({ type: 'int' })
  @IsInt()
  @Min(1)
  @Max(14) // Maximum 14 predefined metrics
  displayOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  @IsDate()
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  @IsDate()
  updatedAt: Date;

  // Cache for transformed data
  private _cachedJSON: any = null;
  private _cacheExpiry: number = 0;

  /**
   * Creates a new metric entity with validation
   * @param data Partial metric data for initialization
   */
  constructor(data?: Partial<Metric>) {
    if (data) {
      Object.assign(this, data);
      this.validate();
    }
  }

  /**
   * Lifecycle hook to perform validation before insert
   */
  @BeforeInsert()
  protected beforeInsert(): void {
    this.validate();
    this.setDefaultDisplayOrder();
  }

  /**
   * Lifecycle hook to perform validation before update
   */
  @BeforeUpdate()
  protected beforeUpdate(): void {
    this.validate();
    this.updatedAt = new Date();
  }

  /**
   * Lifecycle hook to initialize cache after loading
   */
  @AfterLoad()
  protected afterLoad(): void {
    this._cachedJSON = null;
    this._cacheExpiry = 0;
  }

  /**
   * Validates the metric entity
   * @throws ValidationError if validation fails
   */
  private validate(): void {
    if (!this.name || this.name.length < 3 || this.name.length > 100) {
      throw new Error('Name must be between 3 and 100 characters');
    }

    if (!this.description || this.description.length < 10) {
      throw new Error('Description must be at least 10 characters');
    }

    if (!Object.values(MetricCategory).includes(this.category)) {
      throw new Error('Invalid metric category');
    }

    if (this.displayOrder < 1 || this.displayOrder > 14) {
      throw new Error('Display order must be between 1 and 14');
    }
  }

  /**
   * Sets default display order if not provided
   */
  private setDefaultDisplayOrder(): void {
    if (!this.displayOrder) {
      // Query max display order and increment
      // Implementation depends on repository access
      this.displayOrder = 14; // Default to last position
    }
  }

  /**
   * Converts entity to JSON with caching
   * @returns Formatted metric object
   */
  toJSON(): Metric {
    const now = Date.now();
    
    // Return cached version if valid
    if (this._cachedJSON && this._cacheExpiry > now) {
      return this._cachedJSON;
    }

    // Create new JSON representation
    const json = {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      displayOrder: this.displayOrder,
      isActive: this.isActive,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };

    // Cache the result
    this._cachedJSON = json;
    this._cacheExpiry = now + (CACHE_TTL * 1000);

    return json;
  }

  /**
   * Creates database indexes for the metric entity
   * @returns Array of index specifications
   */
  static getIndexes() {
    return [
      {
        name: 'IDX_METRIC_CATEGORY_NAME',
        columns: ['category', 'name']
      },
      {
        name: 'IDX_METRIC_UPDATED',
        columns: ['updatedAt']
      },
      {
        name: 'IDX_METRIC_DISPLAY_ORDER',
        columns: ['displayOrder']
      }
    ];
  }
}