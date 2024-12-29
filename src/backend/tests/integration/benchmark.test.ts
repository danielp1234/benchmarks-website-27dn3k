// @jest/globals v29.7.0 - Testing framework
import { describe, beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals';
// supertest v6.3.3 - HTTP assertions
import * as request from 'supertest';
// @nestjs/testing v10.x - NestJS testing utilities
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
// uuid v9.0.0 - UUID generation
import { v4 as uuidv4 } from 'uuid';
// date-fns v2.x - Date manipulation
import { addDays, subDays } from 'date-fns';

// Internal imports
import { BenchmarkService } from '../../src/services/benchmark.service';
import { CacheService } from '../../src/services/cache.service';
import { BenchmarkData } from '../../src/interfaces/benchmark.interface';
import { createLogger } from '../../src/utils/logger.utils';

describe('Benchmark API Integration Tests', () => {
  let app: INestApplication;
  let benchmarkService: BenchmarkService;
  let cacheService: CacheService;
  let testData: Map<string, BenchmarkData[]>;
  let adminToken: string;
  const logger = createLogger();

  // Test data setup
  const TEST_METRIC_IDS = Array(14).fill(0).map(() => uuidv4());
  const TEST_SOURCE_IDS = [uuidv4(), uuidv4()];
  const ARR_RANGES = ['0-1M', '1M-10M', '10M-50M', '50M-100M', '100M+'];
  const BASE_URL = '/api/v1/benchmarks';

  beforeAll(async () => {
    // Initialize test module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        BenchmarkService,
        CacheService,
        {
          provide: 'CONFIG',
          useValue: {
            redis: {
              host: 'localhost',
              port: 6379,
              password: '',
              ttl: 300
            }
          }
        }
      ],
    }).compile();

    // Create NestJS application instance
    app = moduleFixture.createNestApplication();
    await app.init();

    // Get service instances
    benchmarkService = moduleFixture.get<BenchmarkService>(BenchmarkService);
    cacheService = moduleFixture.get<CacheService>(CacheService);

    // Clear cache before tests
    await cacheService.clear(true);

    // Initialize test data
    testData = new Map<string, BenchmarkData[]>();
    await initializeTestData();

    // Set admin token for protected endpoints
    adminToken = 'test-admin-token';

    logger.info('Test environment initialized', {
      action: 'test_init',
      metricCount: TEST_METRIC_IDS.length,
      sourceCount: TEST_SOURCE_IDS.length
    });
  }, 30000);

  afterAll(async () => {
    await cacheService.clear(true);
    await app.close();
    logger.info('Test environment cleaned up', { action: 'test_cleanup' });
  });

  beforeEach(async () => {
    await cacheService.clear(true);
  });

  // Helper function to initialize test data
  async function initializeTestData(): Promise<void> {
    for (const metricId of TEST_METRIC_IDS) {
      const benchmarks: BenchmarkData[] = [];
      
      for (const sourceId of TEST_SOURCE_IDS) {
        for (const arrRange of ARR_RANGES) {
          benchmarks.push({
            id: uuidv4(),
            metricId,
            sourceId,
            arrRange,
            p5Value: Math.random() * 20,
            p25Value: Math.random() * 30 + 20,
            p50Value: Math.random() * 30 + 50,
            p75Value: Math.random() * 30 + 80,
            p90Value: Math.random() * 20 + 110,
            effectiveDate: new Date()
          });
        }
      }
      
      testData.set(metricId, benchmarks);
      await Promise.all(benchmarks.map(b => benchmarkService.createBenchmark(b)));
    }
  }

  describe('GET /api/v1/benchmarks', () => {
    it('should return paginated benchmark data within 2 seconds', async () => {
      const startTime = Date.now();
      
      const response = await request(app.getHttpServer())
        .get(BASE_URL)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(2000);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('pageSize');
    });

    it('should filter benchmarks by multiple metric IDs', async () => {
      const testMetricIds = TEST_METRIC_IDS.slice(0, 3);
      
      const response = await request(app.getHttpServer())
        .get(BASE_URL)
        .query({ metricIds: testMetricIds.join(',') })
        .expect(200);

      expect(response.body.data.every((b: BenchmarkData) => 
        testMetricIds.includes(b.metricId)
      )).toBe(true);
    });

    it('should filter benchmarks by ARR ranges with validation', async () => {
      const testRanges = ARR_RANGES.slice(0, 2);
      
      const response = await request(app.getHttpServer())
        .get(BASE_URL)
        .query({ arrRanges: testRanges.join(',') })
        .expect(200);

      expect(response.body.data.every((b: BenchmarkData) => 
        testRanges.includes(b.arrRange)
      )).toBe(true);
    });

    it('should utilize Redis cache for repeated queries', async () => {
      const query = { metricIds: TEST_METRIC_IDS[0] };
      
      // First request
      const firstResponse = await request(app.getHttpServer())
        .get(BASE_URL)
        .query(query)
        .expect(200);

      // Second request should be faster due to caching
      const startTime = Date.now();
      const secondResponse = await request(app.getHttpServer())
        .get(BASE_URL)
        .query(query)
        .expect(200);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(100);
      expect(secondResponse.body).toEqual(firstResponse.body);
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests).fill(0).map(() => 
        request(app.getHttpServer()).get(BASE_URL)
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('data');
      });
    });
  });

  describe('POST /api/v1/benchmarks', () => {
    it('should create new benchmark with valid data', async () => {
      const newBenchmark = {
        metricId: TEST_METRIC_IDS[0],
        sourceId: TEST_SOURCE_IDS[0],
        arrRange: ARR_RANGES[0],
        p5Value: 10,
        p25Value: 25,
        p50Value: 50,
        p75Value: 75,
        p90Value: 90,
        effectiveDate: new Date()
      };

      const response = await request(app.getHttpServer())
        .post(BASE_URL)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newBenchmark)
        .expect(201);

      expect(response.body).toMatchObject(newBenchmark);
      expect(response.body).toHaveProperty('id');
    });

    it('should validate percentile values are between 0 and 100', async () => {
      const invalidBenchmark = {
        metricId: TEST_METRIC_IDS[0],
        sourceId: TEST_SOURCE_IDS[0],
        arrRange: ARR_RANGES[0],
        p5Value: -10,
        p25Value: 25,
        p50Value: 150,
        p75Value: 75,
        p90Value: 90,
        effectiveDate: new Date()
      };

      await request(app.getHttpServer())
        .post(BASE_URL)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidBenchmark)
        .expect(400);
    });
  });

  describe('PUT /api/v1/benchmarks/:id', () => {
    it('should update existing benchmark within 1 second', async () => {
      const benchmark = testData.get(TEST_METRIC_IDS[0])?.[0];
      if (!benchmark) throw new Error('Test data not initialized');

      const updateData = {
        p50Value: 55,
        p75Value: 80,
        effectiveDate: new Date()
      };

      const startTime = Date.now();
      
      const response = await request(app.getHttpServer())
        .put(`${BASE_URL}/${benchmark.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(1000);
      expect(response.body).toMatchObject(updateData);
    });
  });

  describe('DELETE /api/v1/benchmarks/:id', () => {
    it('should delete existing benchmark and update cache', async () => {
      const benchmark = testData.get(TEST_METRIC_IDS[0])?.[0];
      if (!benchmark) throw new Error('Test data not initialized');

      await request(app.getHttpServer())
        .delete(`${BASE_URL}/${benchmark.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify benchmark is deleted
      await request(app.getHttpServer())
        .get(`${BASE_URL}/${benchmark.id}`)
        .expect(404);

      // Verify cache is updated
      const cachedData = await cacheService.get(`benchmark:${benchmark.id}`);
      expect(cachedData).toBeNull();
    });
  });
});