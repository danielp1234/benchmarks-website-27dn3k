// @nestjs/common v10.x - Dependency injection and common utilities
import { Injectable, Logger } from '@nestjs/common';
// aws-sdk v2.1450.0 - AWS S3 client for file storage
import { S3 } from 'aws-sdk';
// stream - Node.js streaming interface
import { Readable } from 'stream';
// csv-stringify v6.x - CSV generation
import { stringify } from 'csv-stringify';
// xlsx v0.18.x - Excel file generation
import * as XLSX from 'xlsx';
// crypto - UUID generation
import { randomUUID } from 'crypto';

import { ExportFormat, ExportOptions, ExportRequest, ExportResponse } from '../interfaces/export.interface';
import { BenchmarkService } from './benchmark.service';
import { createLogger } from '../utils/logger.utils';

@Injectable()
export class ExportService {
    private readonly logger = createLogger();
    private readonly s3Client: S3;
    private readonly bucketName: string;
    private readonly chunkSize: number = 5 * 1024 * 1024; // 5MB chunks
    private readonly defaultExpirationTime = 24 * 60 * 60; // 24 hours in seconds

    constructor(
        private readonly benchmarkService: BenchmarkService,
        private readonly configService: any // Replace with ConfigService type when available
    ) {
        // Initialize S3 client with credentials from config
        this.s3Client = new S3({
            region: this.configService.get('aws.region'),
            credentials: {
                accessKeyId: this.configService.get('aws.accessKeyId'),
                secretAccessKey: this.configService.get('aws.secretAccessKey')
            }
        });

        this.bucketName = this.configService.get('aws.s3.bucketName');

        this.logger.info('ExportService initialized', {
            action: 'service_init',
            bucket: this.bucketName
        });
    }

    /**
     * Exports benchmark data based on provided options
     * @param request Export request containing options and data filters
     * @returns Promise with export response containing file URL
     */
    async exportBenchmarkData(request: ExportRequest): Promise<ExportResponse> {
        try {
            this.validateExportOptions(request.options);

            const fileName = this.generateFileName(request.options.format);
            const benchmarkData = await this.benchmarkService.getBenchmarks(
                request.options.selectedMetrics,
                1,
                1000 // Adjust batch size based on performance requirements
            );

            let fileStream: Readable;
            let contentType: string;

            if (request.options.format === ExportFormat.CSV) {
                fileStream = await this.generateCSVStream(benchmarkData.data, request.options);
                contentType = 'text/csv';
            } else {
                fileStream = await this.generateExcelStream(benchmarkData.data, request.options);
                contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            }

            const fileUrl = await this.uploadToS3(fileStream, fileName, contentType);

            this.logger.info('Export completed successfully', {
                action: 'export_complete',
                format: request.options.format,
                fileName
            });

            return {
                fileUrl,
                fileName,
                expiresAt: new Date(Date.now() + this.defaultExpirationTime * 1000)
            };
        } catch (error) {
            this.logger.error('Export failed', {
                action: 'export_error',
                error: error.message,
                request
            });
            throw error;
        }
    }

    /**
     * Uploads file stream to S3 with multipart upload support
     * @param fileStream Readable stream of file data
     * @param fileName Name of the file to be uploaded
     * @param contentType MIME type of the file
     * @returns Promise with signed URL for file access
     */
    private async uploadToS3(
        fileStream: Readable,
        fileName: string,
        contentType: string
    ): Promise<string> {
        try {
            // Initialize multipart upload
            const multipartUpload = await this.s3Client.createMultipartUpload({
                Bucket: this.bucketName,
                Key: fileName,
                ContentType: contentType
            }).promise();

            const uploadId = multipartUpload.UploadId;
            const parts: S3.CompletedPart[] = [];
            let partNumber = 1;
            let buffer = Buffer.alloc(0);

            // Process stream in chunks
            for await (const chunk of fileStream) {
                buffer = Buffer.concat([buffer, chunk]);

                if (buffer.length >= this.chunkSize) {
                    const partData = await this.s3Client.uploadPart({
                        Bucket: this.bucketName,
                        Key: fileName,
                        PartNumber: partNumber,
                        UploadId: uploadId,
                        Body: buffer
                    }).promise();

                    parts.push({
                        PartNumber: partNumber,
                        ETag: partData.ETag
                    });

                    partNumber++;
                    buffer = Buffer.alloc(0);
                }
            }

            // Upload remaining data
            if (buffer.length > 0) {
                const partData = await this.s3Client.uploadPart({
                    Bucket: this.bucketName,
                    Key: fileName,
                    PartNumber: partNumber,
                    UploadId: uploadId,
                    Body: buffer
                }).promise();

                parts.push({
                    PartNumber: partNumber,
                    ETag: partData.ETag
                });
            }

            // Complete multipart upload
            await this.s3Client.completeMultipartUpload({
                Bucket: this.bucketName,
                Key: fileName,
                UploadId: uploadId,
                MultipartUpload: { Parts: parts }
            }).promise();

            // Generate signed URL
            return this.s3Client.getSignedUrl('getObject', {
                Bucket: this.bucketName,
                Key: fileName,
                Expires: this.defaultExpirationTime
            });
        } catch (error) {
            this.logger.error('S3 upload failed', {
                action: 's3_upload_error',
                error: error.message,
                fileName
            });
            throw error;
        }
    }

    /**
     * Generates CSV stream from benchmark data
     * @param data Benchmark data array
     * @param options Export options
     * @returns Readable stream of CSV data
     */
    private async generateCSVStream(
        data: any[],
        options: ExportOptions
    ): Promise<Readable> {
        const stringifier = stringify({
            header: true,
            columns: this.getCSVColumns(options)
        });

        const transformedData = data.map(item => this.transformDataForExport(item, options));
        transformedData.forEach(row => stringifier.write(row));
        stringifier.end();

        return Readable.from(stringifier);
    }

    /**
     * Generates Excel stream from benchmark data
     * @param data Benchmark data array
     * @param options Export options
     * @returns Readable stream of Excel data
     */
    private async generateExcelStream(
        data: any[],
        options: ExportOptions
    ): Promise<Readable> {
        const workbook = XLSX.utils.book_new();
        const transformedData = data.map(item => this.transformDataForExport(item, options));
        const worksheet = XLSX.utils.json_to_sheet(transformedData);

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Benchmark Data');
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        return Readable.from(buffer);
    }

    /**
     * Validates export options
     * @param options Export options to validate
     * @throws Error if validation fails
     */
    private validateExportOptions(options: ExportOptions): void {
        if (!Object.values(ExportFormat).includes(options.format)) {
            throw new Error('Invalid export format');
        }

        if (!options.includeAllMetrics && (!options.selectedMetrics || options.selectedMetrics.length === 0)) {
            throw new Error('No metrics selected for export');
        }
    }

    /**
     * Generates unique file name for export
     * @param format Export format
     * @returns Generated file name
     */
    private generateFileName(format: ExportFormat): string {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const uuid = randomUUID().slice(0, 8);
        const extension = format === ExportFormat.CSV ? 'csv' : 'xlsx';
        return `exports/saas-benchmarks-${timestamp}-${uuid}.${extension}`;
    }

    /**
     * Gets CSV column definitions based on export options
     * @param options Export options
     * @returns Array of column definitions
     */
    private getCSVColumns(options: ExportOptions): string[] {
        const columns = ['metricId', 'sourceId', 'arrRange', 'effectiveDate'];
        
        if (options.includePercentiles) {
            columns.push('p5Value', 'p25Value', 'p50Value', 'p75Value', 'p90Value');
        } else {
            columns.push('p50Value'); // Include median by default
        }

        return columns;
    }

    /**
     * Transforms benchmark data for export
     * @param item Benchmark data item
     * @param options Export options
     * @returns Transformed data object
     */
    private transformDataForExport(item: any, options: ExportOptions): any {
        const transformed: any = {
            metricId: item.metricId,
            sourceId: item.sourceId,
            arrRange: item.arrRange,
            effectiveDate: item.effectiveDate
        };

        if (options.includePercentiles) {
            transformed.p5Value = item.p5Value;
            transformed.p25Value = item.p25Value;
            transformed.p50Value = item.p50Value;
            transformed.p75Value = item.p75Value;
            transformed.p90Value = item.p90Value;
        } else {
            transformed.p50Value = item.p50Value;
        }

        return transformed;
    }
}