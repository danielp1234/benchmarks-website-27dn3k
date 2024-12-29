// jest v29.x - Testing framework and assertions
import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
// supertest v6.3.3 - HTTP assertion testing
import * as request from 'supertest';
// uuid v9.0.0 - UUID generation for test data
import { v4 as uuidv4 } from 'uuid';
// fs-extra v11.x - Enhanced file system operations
import * as fs from 'fs-extra';
// csv-parse v5.x - CSV parsing for validation
import { parse } from 'csv-parse';
// xlsx v0.18.x - Excel file parsing for validation
import * as XLSX from 'xlsx';

// Internal imports
import { ExportService } from '../../src/services/export.service';
import { ExportFormat } from '../../src/interfaces/export.interface';
import { BenchmarkService } from '../../src/services/benchmark.service';
import { createLogger } from '../../src/utils/logger.utils';

// Test configuration
const TEST_TIMEOUT = 30000; // 30 seconds
const TEST_S3_BUCKET = `test-exports-${uuidv4()}`;
const BASE_URL = '/api/v1';

// Test data
const TEST_METRICS = [
  uuidv4(), // Revenue Growth
  uuidv4(), // NDR
  uuidv4()  // Magic Number
];

const TEST_BENCHMARK_DATA = {
  metrics: TEST_METRICS.map(id => ({
    id,
    name: `Test Metric ${id.slice(0, 8)}`,
    category: 'Financial'
  })),
  data: TEST_METRICS.map(metricId => ({
    id: uuidv4(),
    metricId,
    sourceId: uuidv4(),
    arrRange: '$1M-$10M',
    p5Value: 10,
    p25Value: 25,
    p50Value: 50,
    p75Value: 75,
    p90Value: 90,
    effectiveDate: new Date()
  }))
};

describe('Export Integration Tests', () => {
  let app: any;
  let exportService: ExportService;
  let benchmarkService: BenchmarkService;
  let logger: any;

  beforeAll(async () => {
    logger = createLogger();
    
    // Initialize services with test configuration
    exportService = new ExportService(
      benchmarkService,
      {
        get: (key: string) => {
          switch (key) {
            case 'aws.region': return 'us-east-1';
            case 'aws.accessKeyId': return 'test-key';
            case 'aws.secretAccessKey': return 'test-secret';
            case 'aws.s3.bucketName': return TEST_S3_BUCKET;
            default: return '';
          }
        }
      }
    );

    // Create test S3 bucket
    await exportService['s3Client'].createBucket({
      Bucket: TEST_S3_BUCKET
    }).promise();

    logger.info('Test environment initialized', {
      action: 'test_init',
      bucket: TEST_S3_BUCKET
    });
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Clean up test data and resources
    const objects = await exportService['s3Client'].listObjects({
      Bucket: TEST_S3_BUCKET
    }).promise();

    if (objects.Contents && objects.Contents.length > 0) {
      await exportService['s3Client'].deleteObjects({
        Bucket: TEST_S3_BUCKET,
        Delete: {
          Objects: objects.Contents.map(obj => ({ Key: obj.Key as string }))
        }
      }).promise();
    }

    await exportService['s3Client'].deleteBucket({
      Bucket: TEST_S3_BUCKET
    }).promise();

    logger.info('Test environment cleaned up', {
      action: 'test_cleanup',
      bucket: TEST_S3_BUCKET
    });
  }, TEST_TIMEOUT);

  describe('CSV Export Tests', () => {
    it('should successfully export benchmark data to CSV', async () => {
      const exportRequest = {
        options: {
          format: ExportFormat.CSV,
          selectedMetrics: TEST_METRICS,
          includeAllMetrics: false,
          includePercentiles: true
        }
      };

      const response = await request(app)
        .post(`${BASE_URL}/export`)
        .send(exportRequest)
        .expect(200);

      expect(response.body).toHaveProperty('fileUrl');
      expect(response.body).toHaveProperty('fileName');
      expect(response.body).toHaveProperty('expiresAt');

      // Download and validate CSV content
      const fileContent = await downloadFile(response.body.fileUrl);
      const records = await parseCSV(fileContent);

      expect(records.length).toBe(TEST_BENCHMARK_DATA.data.length);
      validateCSVContent(records);
    }, TEST_TIMEOUT);

    it('should handle CSV export with filtered metrics', async () => {
      const exportRequest = {
        options: {
          format: ExportFormat.CSV,
          selectedMetrics: [TEST_METRICS[0]], // Single metric
          includeAllMetrics: false,
          includePercentiles: true
        }
      };

      const response = await request(app)
        .post(`${BASE_URL}/export`)
        .send(exportRequest)
        .expect(200);

      const fileContent = await downloadFile(response.body.fileUrl);
      const records = await parseCSV(fileContent);

      expect(records.length).toBe(1);
      expect(records[0].metricId).toBe(TEST_METRICS[0]);
    });
  });

  describe('Excel Export Tests', () => {
    it('should successfully export benchmark data to Excel', async () => {
      const exportRequest = {
        options: {
          format: ExportFormat.EXCEL,
          selectedMetrics: TEST_METRICS,
          includeAllMetrics: false,
          includePercentiles: true
        }
      };

      const response = await request(app)
        .post(`${BASE_URL}/export`)
        .send(exportRequest)
        .expect(200);

      expect(response.body).toHaveProperty('fileUrl');

      // Download and validate Excel content
      const fileContent = await downloadFile(response.body.fileUrl);
      const workbook = XLSX.read(fileContent, { type: 'buffer' });
      
      expect(workbook.SheetNames).toContain('Benchmark Data');
      validateExcelContent(workbook);
    }, TEST_TIMEOUT);
  });

  describe('Export Validation Tests', () => {
    it('should reject invalid export format', async () => {
      const exportRequest = {
        options: {
          format: 'INVALID',
          selectedMetrics: TEST_METRICS,
          includeAllMetrics: false,
          includePercentiles: true
        }
      };

      await request(app)
        .post(`${BASE_URL}/export`)
        .send(exportRequest)
        .expect(400);
    });

    it('should reject empty metric selection when not including all metrics', async () => {
      const exportRequest = {
        options: {
          format: ExportFormat.CSV,
          selectedMetrics: [],
          includeAllMetrics: false,
          includePercentiles: true
        }
      };

      await request(app)
        .post(`${BASE_URL}/export`)
        .send(exportRequest)
        .expect(400);
    });

    it('should validate presigned URL expiration', async () => {
      const exportRequest = {
        options: {
          format: ExportFormat.CSV,
          selectedMetrics: TEST_METRICS,
          includeAllMetrics: false,
          includePercentiles: true
        }
      };

      const response = await request(app)
        .post(`${BASE_URL}/export`)
        .send(exportRequest)
        .expect(200);

      const expiresAt = new Date(response.body.expiresAt);
      const now = new Date();
      const diffHours = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

      expect(diffHours).toBeCloseTo(24, 0); // URL should expire in ~24 hours
    });
  });
});

// Helper Functions
async function downloadFile(url: string): Promise<Buffer> {
  const response = await request(url).get('');
  return response.body;
}

async function parseCSV(content: Buffer): Promise<any[]> {
  return new Promise((resolve, reject) => {
    parse(content, {
      columns: true,
      skip_empty_lines: true
    }, (err, records) => {
      if (err) reject(err);
      resolve(records);
    });
  });
}

function validateCSVContent(records: any[]): void {
  records.forEach(record => {
    expect(record).toHaveProperty('metricId');
    expect(record).toHaveProperty('sourceId');
    expect(record).toHaveProperty('arrRange');
    expect(record).toHaveProperty('effectiveDate');
    expect(record).toHaveProperty('p5Value');
    expect(record).toHaveProperty('p25Value');
    expect(record).toHaveProperty('p50Value');
    expect(record).toHaveProperty('p75Value');
    expect(record).toHaveProperty('p90Value');

    // Validate data types and ranges
    expect(Number(record.p5Value)).toBeLessThanOrEqual(Number(record.p25Value));
    expect(Number(record.p25Value)).toBeLessThanOrEqual(Number(record.p50Value));
    expect(Number(record.p50Value)).toBeLessThanOrEqual(Number(record.p75Value));
    expect(Number(record.p75Value)).toBeLessThanOrEqual(Number(record.p90Value));
  });
}

function validateExcelContent(workbook: XLSX.WorkBook): void {
  const worksheet = workbook.Sheets['Benchmark Data'];
  const data = XLSX.utils.sheet_to_json(worksheet);

  expect(data.length).toBe(TEST_BENCHMARK_DATA.data.length);
  
  data.forEach((row: any) => {
    expect(row).toHaveProperty('metricId');
    expect(row).toHaveProperty('sourceId');
    expect(row).toHaveProperty('arrRange');
    expect(row).toHaveProperty('effectiveDate');
    expect(row).toHaveProperty('p5Value');
    expect(row).toHaveProperty('p25Value');
    expect(row).toHaveProperty('p50Value');
    expect(row).toHaveProperty('p75Value');
    expect(row).toHaveProperty('p90Value');
  });
}