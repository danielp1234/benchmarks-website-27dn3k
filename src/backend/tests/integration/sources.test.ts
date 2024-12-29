/**
 * @file Integration tests for data source management endpoints
 * @description Comprehensive testing of CRUD operations, caching, security, and error handling
 * @version 1.0.0
 */

// supertest v6.x - HTTP assertions
import request from 'supertest';
// jest v29.x - Testing framework
import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import { Express } from 'express';
import { DataSource } from '../../src/interfaces/sources.interface';
import { SourcesService } from '../../src/services/sources.service';
import { createLogger } from '../../src/utils/logger.utils';

// Test constants
const TEST_TIMEOUT = 10000;
const BASE_URL = '/api/v1/sources';
const VALID_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Test data fixtures
const validSource: Partial<DataSource> = {
  name: 'Test Source',
  description: 'Integration test data source',
  active: true
};

const updateSource: Partial<DataSource> = {
  name: 'Updated Test Source',
  description: 'Updated integration test data source',
  active: false
};

describe('Sources API Integration Tests', () => {
  let app: Express;
  let sourcesService: SourcesService;
  let adminToken: string;
  let testSourceId: string;
  const logger = createLogger();

  beforeAll(async () => {
    // Initialize test application and dependencies
    const { initializeTestApp } = require('../test-utils');
    ({ app, sourcesService } = await initializeTestApp());

    // Generate admin authentication token
    const { generateTestToken } = require('../auth-utils');
    adminToken = await generateTestToken('admin');

    logger.info('Test suite initialized', {
      action: 'test_init',
      component: 'sources_api'
    });
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Cleanup test resources
    await sourcesService['cacheService'].clear(true);
    await require('../test-utils').closeTestApp();
    
    logger.info('Test suite cleanup completed', {
      action: 'test_cleanup',
      component: 'sources_api'
    });
  });

  beforeEach(async () => {
    // Reset database state and cache
    await require('../test-utils').resetTestDatabase();
    await sourcesService['cacheService'].clear(true);
  });

  describe('POST /sources', () => {
    it('should create a new data source with valid data', async () => {
      const response = await request(app)
        .post(BASE_URL)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validSource)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.stringMatching(VALID_UUID_REGEX),
        ...validSource,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });

      testSourceId = response.body.id;
    });

    it('should return 400 for invalid data source input', async () => {
      const invalidSource = {
        name: '', // Empty name
        description: 'Invalid test source',
        active: true
      };

      const response = await request(app)
        .post(BASE_URL)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidSource)
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.any(String),
        message: expect.stringContaining('Name is required')
      });
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post(BASE_URL)
        .send(validSource)
        .expect(401);
    });

    it('should prevent duplicate source names', async () => {
      // Create first source
      await request(app)
        .post(BASE_URL)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validSource)
        .expect(201);

      // Attempt to create duplicate
      const response = await request(app)
        .post(BASE_URL)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validSource)
        .expect(400);

      expect(response.body.message).toContain('Data source name already exists');
    });
  });

  describe('GET /sources', () => {
    beforeEach(async () => {
      // Create test source for retrieval tests
      const response = await request(app)
        .post(BASE_URL)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validSource);
      testSourceId = response.body.id;
    });

    it('should retrieve all data sources with pagination', async () => {
      const response = await request(app)
        .get(BASE_URL)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining(validSource)
        ]),
        total: expect.any(Number),
        page: 1,
        pageSize: 10
      });
    });

    it('should retrieve a specific data source by ID', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/${testSourceId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testSourceId,
        ...validSource
      });
    });

    it('should return 404 for non-existent source ID', async () => {
      const nonExistentId = '00000000-0000-4000-a000-000000000000';
      await request(app)
        .get(`${BASE_URL}/${nonExistentId}`)
        .expect(404);
    });

    it('should filter sources by active status', async () => {
      const response = await request(app)
        .get(BASE_URL)
        .query({ active: true })
        .expect(200);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ active: true })
        ])
      );
    });
  });

  describe('PUT /sources/:id', () => {
    beforeEach(async () => {
      // Create test source for update tests
      const response = await request(app)
        .post(BASE_URL)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validSource);
      testSourceId = response.body.id;
    });

    it('should update an existing data source', async () => {
      const response = await request(app)
        .put(`${BASE_URL}/${testSourceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateSource)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testSourceId,
        ...updateSource,
        updatedAt: expect.any(String)
      });
    });

    it('should return 404 when updating non-existent source', async () => {
      const nonExistentId = '00000000-0000-4000-a000-000000000000';
      await request(app)
        .put(`${BASE_URL}/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateSource)
        .expect(404);
    });

    it('should validate update payload', async () => {
      const invalidUpdate = {
        name: 'A'.repeat(101), // Exceeds max length
        description: 'Invalid update test',
        active: true
      };

      const response = await request(app)
        .put(`${BASE_URL}/${testSourceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.message).toContain('Name must not exceed');
    });
  });

  describe('DELETE /sources/:id', () => {
    beforeEach(async () => {
      // Create test source for deletion tests
      const response = await request(app)
        .post(BASE_URL)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validSource);
      testSourceId = response.body.id;
    });

    it('should delete an existing data source', async () => {
      await request(app)
        .delete(`${BASE_URL}/${testSourceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify deletion
      await request(app)
        .get(`${BASE_URL}/${testSourceId}`)
        .expect(404);
    });

    it('should return 404 when deleting non-existent source', async () => {
      const nonExistentId = '00000000-0000-4000-a000-000000000000';
      await request(app)
        .delete(`${BASE_URL}/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should prevent deletion of source with existing benchmark data', async () => {
      // Create benchmark data reference
      await require('../test-utils').createTestBenchmarkData(testSourceId);

      const response = await request(app)
        .delete(`${BASE_URL}/${testSourceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.message).toContain('Cannot delete data source with existing benchmark data');
    });
  });

  describe('Cache Behavior', () => {
    it('should cache GET requests', async () => {
      // First request - cache miss
      const firstResponse = await request(app)
        .get(`${BASE_URL}/${testSourceId}`)
        .expect(200);

      // Second request - should hit cache
      const secondResponse = await request(app)
        .get(`${BASE_URL}/${testSourceId}`)
        .expect(200);

      expect(firstResponse.body).toEqual(secondResponse.body);
      expect(secondResponse.headers['x-cache-hit']).toBe('true');
    });

    it('should invalidate cache on updates', async () => {
      // Initial get request
      await request(app)
        .get(`${BASE_URL}/${testSourceId}`)
        .expect(200);

      // Update source
      await request(app)
        .put(`${BASE_URL}/${testSourceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateSource)
        .expect(200);

      // Subsequent get should be cache miss
      const response = await request(app)
        .get(`${BASE_URL}/${testSourceId}`)
        .expect(200);

      expect(response.headers['x-cache-hit']).toBe('false');
      expect(response.body).toMatchObject(updateSource);
    });
  });
});