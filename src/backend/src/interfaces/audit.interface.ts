/**
 * @file Audit Interface Definitions
 * @description TypeScript interfaces and types for audit logging functionality
 * @version 1.0.0
 */

/**
 * Enum defining possible audit actions for tracking user activities
 * Used to categorize different types of operations performed in the system
 */
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT'
}

/**
 * Enum defining resource types that can be audited
 * Used to identify different entities in the system that are subject to auditing
 */
export enum ResourceType {
  METRIC = 'METRIC',
  BENCHMARK = 'BENCHMARK',
  DATA_SOURCE = 'DATA_SOURCE',
  USER = 'USER'
}

/**
 * Interface defining the structure of a complete audit log entry
 * Contains all necessary information to track and review system activities
 */
export interface AuditLog {
  /** Unique identifier for the audit log entry */
  id: string;

  /** ID of the user who performed the action */
  user_id: string;

  /** Type of action performed */
  action: AuditAction;

  /** Type of resource affected */
  resource_type: ResourceType;

  /** Identifier of the affected resource */
  resource_id: string;

  /** Detailed changes made during the operation */
  changes: Record<string, any>;

  /** IP address from which the action was performed */
  ip_address: string;

  /** User agent string of the client that performed the action */
  user_agent: string;

  /** Timestamp when the audit log was created */
  created_at: Date;
}

/**
 * Interface for creating new audit log entries
 * Omits system-generated fields like id and created_at
 */
export interface AuditLogCreate {
  /** ID of the user performing the action */
  user_id: string;

  /** Type of action being performed */
  action: AuditAction;

  /** Type of resource being affected */
  resource_type: ResourceType;

  /** Identifier of the affected resource */
  resource_id: string;

  /** Detailed changes being made */
  changes: Record<string, any>;

  /** IP address of the request */
  ip_address: string;

  /** User agent of the client */
  user_agent: string;
}

/**
 * Interface defining parameters for querying audit logs
 * Includes filtering and pagination options
 */
export interface AuditLogQuery {
  /** Filter by user ID */
  user_id?: string;

  /** Filter by action type */
  action?: AuditAction;

  /** Filter by resource type */
  resource_type?: ResourceType;

  /** Filter by resource ID */
  resource_id?: string;

  /** Start date for date range filter */
  start_date?: Date;

  /** End date for date range filter */
  end_date?: Date;

  /** Page number for pagination */
  page: number;

  /** Number of items per page */
  limit: number;
}