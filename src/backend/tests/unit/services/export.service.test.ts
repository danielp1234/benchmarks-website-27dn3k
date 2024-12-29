// jest v29.x - Testing framework and assertions
import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
// aws-sdk v2.1450.0 - AWS S3 client mocking
import { S3 } from 'aws-sdk';
// stream - Node.js streaming utilities
import { Readable } from 'stream';

import { ExportService } from '../../src/services/export.service';
import { BenchmarkService } from '../../src/services/benchmark.service';
import { ExportFormat, ExportOptions } from '../../src/interfaces/export.interface';
import { createLogger } from '../../../src/utils/logger.utils';

// Mock dependencies
jest.mock('aws-sdk');
jest.mock('../../../src/utils/logger.utils');
jest.mock('../../src/services/benchmark.service');

describe('ExportService', () => {
    let exportService: ExportService;
    let mockBenchmarkService: jest.Mocked<BenchmarkService>;
    let mockS3Client: jest.Mocked<S3>;
    let mockConfigService: any;

    const sampleBenchmarkData = [
        {
            id: '123e4567-e89b-12d3-a456-426614174000',
            metricId: '123e4567-e89b-12d3-a456-426614174001',
            sourceId: '123e4567-e89b-12d3-a456-426614174002',
            arrRange: '$1M-$10M',
            p5Value: 10,
            p25Value: 25,
            p50Value: 50,
            p75Value: 75,
            p90Value: 90,
            effectiveDate: new Date('2023-01-01')
        }
    ];

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Configure mock BenchmarkService
        mockBenchmarkService = {
            getBenchmarks: jest.fn().mockResolvedValue({ data: sampleBenchmarkData }),
            validateMetricIds: jest.fn().mockResolvedValue(true)
        } as any;

        // Configure mock S3 client
        mockS3Client = {
            createMultipartUpload: jest.fn().mockReturnValue({
                promise: jest.fn().mockResolvedValue({ UploadId: 'test-upload-id' })
            }),
            uploadPart: jest.fn().mockReturnValue({
                promise: jest.fn().mockResolvedValue({ ETag: 'test-etag' })
            }),
            completeMultipartUpload: jest.fn().mockReturnValue({
                promise: jest.fn().mockResolvedValue({})
            }),
            getSignedUrl: jest.fn().mockReturnValue('https://test-url.com/file.csv')
        } as any;

        // Configure mock ConfigService
        mockConfigService = {
            get: jest.fn().mockImplementation((key: string) => {
                switch (key) {
                    case 'aws.region': return 'us-east-1';
                    case 'aws.accessKeyId': return 'test-key';
                    case 'aws.secretAccessKey': return 'test-secret';
                    case 'aws.s3.bucketName': return 'test-bucket';
                    default: return undefined;
                }
            })
        };

        // Initialize ExportService with mocks
        exportService = new ExportService(mockBenchmarkService, mockConfigService);
        (exportService as any).s3Client = mockS3Client;
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('exportBenchmarkData', () => {
        const defaultExportOptions: ExportOptions = {
            format: ExportFormat.CSV,
            selectedMetrics: ['123e4567-e89b-12d3-a456-426614174001'],
            includeAllMetrics: false,
            includePercentiles: true
        };

        it('should successfully export data in CSV format with streaming', async () => {
            const response = await exportService.exportBenchmarkData({
                options: defaultExportOptions
            });

            expect(response).toHaveProperty('fileUrl');
            expect(response).toHaveProperty('fileName');
            expect(response).toHaveProperty('expiresAt');
            expect(mockBenchmarkService.getBenchmarks).toHaveBeenCalled();
            expect(mockS3Client.createMultipartUpload).toHaveBeenCalled();
        });

        it('should successfully export data in Excel format with proper formatting', async () => {
            const excelOptions = { ...defaultExportOptions, format: ExportFormat.EXCEL };
            const response = await exportService.exportBenchmarkData({
                options: excelOptions
            });

            expect(response.fileName).toMatch(/\.xlsx$/);
            expect(mockS3Client.createMultipartUpload).toHaveBeenCalledWith(
                expect.objectContaining({
                    ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                })
            );
        });

        it('should handle export with selected metrics only and validate IDs', async () => {
            await exportService.exportBenchmarkData({
                options: defaultExportOptions
            });

            expect(mockBenchmarkService.getBenchmarks).toHaveBeenCalledWith(
                defaultExportOptions.selectedMetrics,
                1,
                1000
            );
        });

        it('should handle export with all metrics and proper data structure', async () => {
            const allMetricsOptions = { ...defaultExportOptions, includeAllMetrics: true };
            await exportService.exportBenchmarkData({
                options: allMetricsOptions
            });

            expect(mockBenchmarkService.getBenchmarks).toHaveBeenCalled();
        });

        it('should throw error for invalid export options with details', async () => {
            const invalidOptions = { ...defaultExportOptions, format: 'INVALID' as ExportFormat };
            await expect(exportService.exportBenchmarkData({
                options: invalidOptions
            })).rejects.toThrow('Invalid export format');
        });

        it('should handle S3 upload failures with proper error propagation', async () => {
            mockS3Client.createMultipartUpload = jest.fn().mockReturnValue({
                promise: jest.fn().mockRejectedValue(new Error('S3 Upload Failed'))
            });

            await expect(exportService.exportBenchmarkData({
                options: defaultExportOptions
            })).rejects.toThrow('S3 Upload Failed');
        });

        it('should validate performance within 2-second threshold', async () => {
            const startTime = Date.now();
            await exportService.exportBenchmarkData({
                options: defaultExportOptions
            });
            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(duration).toBeLessThan(2000);
        });

        it('should handle memory efficiently for large datasets', async () => {
            const largeBenchmarkData = Array(1000).fill(sampleBenchmarkData[0]);
            mockBenchmarkService.getBenchmarks.mockResolvedValue({ data: largeBenchmarkData });

            const response = await exportService.exportBenchmarkData({
                options: defaultExportOptions
            });

            expect(response).toHaveProperty('fileUrl');
            // Verify chunk size handling
            expect(mockS3Client.uploadPart).toHaveBeenCalled();
        });
    });

    describe('uploadToS3', () => {
        it('should upload file successfully with correct parameters', async () => {
            const fileStream = Readable.from(Buffer.from('test data'));
            const fileName = 'test.csv';
            const contentType = 'text/csv';

            const url = await (exportService as any).uploadToS3(fileStream, fileName, contentType);

            expect(url).toBe('https://test-url.com/file.csv');
            expect(mockS3Client.createMultipartUpload).toHaveBeenCalledWith({
                Bucket: 'test-bucket',
                Key: fileName,
                ContentType: contentType
            });
        });

        it('should handle upload errors with proper error messages', async () => {
            const fileStream = Readable.from(Buffer.from('test data'));
            mockS3Client.createMultipartUpload = jest.fn().mockReturnValue({
                promise: jest.fn().mockRejectedValue(new Error('Upload failed'))
            });

            await expect((exportService as any).uploadToS3(
                fileStream,
                'test.csv',
                'text/csv'
            )).rejects.toThrow('Upload failed');
        });

        it('should use correct content types for different formats', async () => {
            const csvStream = Readable.from(Buffer.from('test data'));
            await (exportService as any).uploadToS3(csvStream, 'test.csv', 'text/csv');

            expect(mockS3Client.createMultipartUpload).toHaveBeenCalledWith(
                expect.objectContaining({
                    ContentType: 'text/csv'
                })
            );
        });
    });

    describe('generateExport', () => {
        it('should generate CSV file with correct headers and data', async () => {
            const options: ExportOptions = {
                format: ExportFormat.CSV,
                selectedMetrics: ['123e4567-e89b-12d3-a456-426614174001'],
                includeAllMetrics: false,
                includePercentiles: true
            };

            const stream = await (exportService as any).generateCSVStream(
                sampleBenchmarkData,
                options
            );

            const chunks: Buffer[] = [];
            for await (const chunk of stream) {
                chunks.push(Buffer.from(chunk));
            }
            const result = Buffer.concat(chunks).toString();

            expect(result).toContain('metricId');
            expect(result).toContain('p90Value');
        });

        it('should handle empty data sets gracefully', async () => {
            const options: ExportOptions = {
                format: ExportFormat.CSV,
                selectedMetrics: [],
                includeAllMetrics: true,
                includePercentiles: true
            };

            const stream = await (exportService as any).generateCSVStream([], options);
            const chunks: Buffer[] = [];
            for await (const chunk of stream) {
                chunks.push(Buffer.from(chunk));
            }
            const result = Buffer.concat(chunks).toString();

            expect(result).toContain('metricId');
            expect(result.split('\n').length).toBe(2); // Headers only
        });
    });
});