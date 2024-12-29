import { Test, TestingModule } from '@nestjs/testing'; // v10.x
import { INestApplication } from '@nestjs/common';
import { Repository } from 'typeorm'; // v0.3.x
import { Redis } from 'ioredis'; // v5.3.0
import request from 'supertest'; // v6.3.3
import { describe, beforeAll, beforeEach, afterAll, it, expect } from '@jest/globals'; // v29.x
import { performance } from 'perf_hooks';

import { MetricsService } from '../../src/services/metrics.service';
import { MetricEntity } from '../../src/models/metrics.model';
import { Metric, MetricCategory } from '../../src/interfaces/metrics.interface';
import { METRIC_NAMES, METRIC_CATEGORIES } from '../../src/constants/metrics';

// Constants for testing
const BASE_URL = '/api/v1/metrics';
const PERFORMANCE_THRESHOLD_MS = 2000; // 2 seconds max response time
const TEST_BATCH_SIZES = [10, 100, 1000]; // Different data volumes for performance testing

describe('Metrics API Integration Tests', () => {
  let app: INestApplication;
  let metricsService: MetricsService;
  let metricsRepository: Repository<MetricEntity>;
  let redisClient: Redis;
  let testMetrics: MetricEntity[] = [];

  // Performance monitoring
  const performanceMetrics: { [key: string]: number[] } = {
    getCached: [],
    getUncached: [],
    create: [],
    update: [],
    delete: []
  };

  beforeAll(async () => {
    // Create testing module with real database and Redis connections
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        // Import required modules with test configurations
      ],
      providers: [
        MetricsService,
        // Add other required providers
      ]
    }).compile();

    app = moduleFixture.createNestApplication();
    metricsService = moduleFixture.get<MetricsService>(MetricsService);
    metricsRepository = moduleFixture.get('MetricEntityRepository');
    redisClient = moduleFixture.get<Redis>('REDIS_CLIENT');

    await app.init();
  });

  beforeEach(async () => {
    // Clean up database and cache before each test
    await metricsRepository.clear();
    await redisClient.flushall();
    testMetrics = [];
  });

  afterAll(async () => {
    // Generate performance report and cleanup
    console.log('\nPerformance Metrics Summary:');
    Object.entries(performanceMetrics).forEach(([operation, times]) => {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`${operation}: Avg ${avg.toFixed(2)}ms`);
    });

    await app.close();
  });

  // Helper function to create test metrics
  const createTestMetrics = async (count: number): Promise<MetricEntity[]> => {
    const metrics: Partial<Metric>[] = Array.from({ length: count }, (_, i) => ({
      name: Object.keys(METRIC_NAMES)[i % Object.keys(METRIC_NAMES).length],
      description: `Test metric ${i}`,
      category: Object.values(MetricCategory)[i % Object.values(MetricCategory).length],
      displayOrder: i + 1,
      isActive: true
    }));

    return await Promise.all(
      metrics.map(metric => metricsRepository.save(new MetricEntity(metric)))
    );
  };

  // Helper function to measure response time
  const measureResponseTime = async (operation: () => Promise<any>): Promise<number> => {
    const start = performance.now();
    await operation();
    return performance.now() - start;
  };

  describe('GET /metrics', () => {
    it('should return paginated metrics within performance threshold', async () => {
      // Create test data
      testMetrics = await createTestMetrics(100);

      const response = await request(app.getHttpServer())
        .get(BASE_URL)
        .query({ page: 1, pageSize: 20 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(20);
      expect(response.body.total).toBe(100);
      expect(response.body.totalPages).toBe(5);
    });

    it('should efficiently filter metrics by category', async () => {
      testMetrics = await createTestMetrics(100);
      const category = MetricCategory.FINANCIAL;

      const responseTime = await measureResponseTime(async () => {
        const response = await request(app.getHttpServer())
          .get(BASE_URL)
          .query({ category });

        expect(response.status).toBe(200);
        expect(response.body.data.every((m: Metric) => m.category === category)).toBe(true);
      });

      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      performanceMetrics.getUncached.push(responseTime);
    });

    it('should demonstrate effective caching', async () => {
      testMetrics = await createTestMetrics(100);

      // First request (uncached)
      const uncachedTime = await measureResponseTime(async () => {
        await request(app.getHttpServer()).get(BASE_URL);
      });

      // Second request (cached)
      const cachedTime = await measureResponseTime(async () => {
        await request(app.getHttpServer()).get(BASE_URL);
      });

      expect(cachedTime).toBeLessThan(uncachedTime);
      performanceMetrics.getCached.push(cachedTime);
      performanceMetrics.getUncached.push(uncachedTime);
    });

    // Test performance with different data volumes
    TEST_BATCH_SIZES.forEach(batchSize => {
      it(`should handle ${batchSize} records efficiently`, async () => {
        testMetrics = await createTestMetrics(batchSize);

        const responseTime = await measureResponseTime(async () => {
          const response = await request(app.getHttpServer())
            .get(BASE_URL)
            .query({ pageSize: 50 });

          expect(response.status).toBe(200);
          expect(response.body.total).toBe(batchSize);
        });

        expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
        performanceMetrics.getUncached.push(responseTime);
      });
    });
  });

  describe('POST /metrics', () => {
    it('should create a new metric within performance threshold', async () => {
      const newMetric: Partial<Metric> = {
        name: 'REVENUE_GROWTH',
        description: 'Test revenue growth metric',
        category: MetricCategory.GROWTH,
        displayOrder: 1,
        isActive: true
      };

      const responseTime = await measureResponseTime(async () => {
        const response = await request(app.getHttpServer())
          .post(BASE_URL)
          .send(newMetric);

        expect(response.status).toBe(201);
        expect(response.body.name).toBe(newMetric.name);
      });

      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      performanceMetrics.create.push(responseTime);
    });
  });

  describe('PUT /metrics/:id', () => {
    it('should update a metric and invalidate cache', async () => {
      const metric = await metricsRepository.save(
        new MetricEntity({
          name: 'REVENUE_GROWTH',
          description: 'Initial description',
          category: MetricCategory.GROWTH,
          displayOrder: 1,
          isActive: true
        })
      );

      const updateData = { description: 'Updated description' };

      const responseTime = await measureResponseTime(async () => {
        const response = await request(app.getHttpServer())
          .put(`${BASE_URL}/${metric.id}`)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.description).toBe(updateData.description);
      });

      // Verify cache invalidation
      const cachedValue = await redisClient.get(`metrics:${metric.id}`);
      expect(cachedValue).toBeNull();

      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      performanceMetrics.update.push(responseTime);
    });
  });

  describe('DELETE /metrics/:id', () => {
    it('should delete a metric and clean up cache', async () => {
      const metric = await metricsRepository.save(
        new MetricEntity({
          name: 'REVENUE_GROWTH',
          description: 'Test metric',
          category: MetricCategory.GROWTH,
          displayOrder: 1,
          isActive: true
        })
      );

      const responseTime = await measureResponseTime(async () => {
        const response = await request(app.getHttpServer())
          .delete(`${BASE_URL}/${metric.id}`);

        expect(response.status).toBe(204);
      });

      // Verify database deletion
      const deletedMetric = await metricsRepository.findOne({ where: { id: metric.id } });
      expect(deletedMetric).toBeNull();

      // Verify cache cleanup
      const cachedValue = await redisClient.get(`metrics:${metric.id}`);
      expect(cachedValue).toBeNull();

      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      performanceMetrics.delete.push(responseTime);
    });
  });
});