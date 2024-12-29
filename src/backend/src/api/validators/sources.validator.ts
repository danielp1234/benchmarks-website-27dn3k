/**
 * @file Data source validation schemas
 * @description Defines validation rules for data source operations using class-validator
 * @version 1.0.0
 */

import { IsString, IsBoolean, IsOptional, Length, IsInt, Min } from 'class-validator'; // v0.14.x
import { DataSourceCreate, DataSourceUpdate, DataSourceQuery } from '../../interfaces/sources.interface';

// Constants for validation rules
const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

/**
 * Data transfer object for validating data source creation requests
 * @class CreateDataSourceDto
 * @implements {DataSourceCreate}
 */
export class CreateDataSourceDto implements DataSourceCreate {
  @IsString({ message: 'Name must be a string' })
  @Length(MIN_NAME_LENGTH, MAX_NAME_LENGTH, {
    message: `Name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters`
  })
  name: string;

  @IsString({ message: 'Description must be a string' })
  @Length(1, MAX_DESCRIPTION_LENGTH, {
    message: `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`
  })
  description: string;

  @IsBoolean({ message: 'Active must be a boolean value' })
  active: boolean;
}

/**
 * Data transfer object for validating data source update requests
 * @class UpdateDataSourceDto
 * @implements {DataSourceUpdate}
 */
export class UpdateDataSourceDto implements DataSourceUpdate {
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @Length(MIN_NAME_LENGTH, MAX_NAME_LENGTH, {
    message: `Name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters`
  })
  name: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @Length(1, MAX_DESCRIPTION_LENGTH, {
    message: `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`
  })
  description: string;

  @IsOptional()
  @IsBoolean({ message: 'Active must be a boolean value' })
  active: boolean;
}

/**
 * Data transfer object for validating data source query parameters
 * @class QueryDataSourceDto
 * @implements {DataSourceQuery}
 */
export class QueryDataSourceDto implements DataSourceQuery {
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @Length(1, MAX_NAME_LENGTH, {
    message: `Name must not exceed ${MAX_NAME_LENGTH} characters`
  })
  name?: string;

  @IsOptional()
  @IsBoolean({ message: 'Active must be a boolean value' })
  active?: boolean;

  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be greater than or equal to 1' })
  page: number;

  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be greater than or equal to 1' })
  limit: number;
}