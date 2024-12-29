/**
 * @fileoverview Utility functions for generating and formatting benchmark data exports
 * Provides CSV and Excel export capabilities with data validation and progress tracking
 * @version 1.0.0
 */

// External imports
import ExcelJS from 'exceljs'; // @version: 4.3.0
import Papa from 'papaparse'; // @version: 5.4.0

// Internal imports
import { BenchmarkData, isBenchmarkData } from '../interfaces/benchmark.interface';

// Constants for export configuration
const MIME_TYPES = {
  CSV: 'text/csv',
  EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
} as const;

const EXCEL_STYLES = {
  HEADER: {
    font: { bold: true, size: 12 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } },
    alignment: { horizontal: 'center', vertical: 'middle' }
  },
  PERCENTAGE_FORMAT: '0.00%'
} as const;

/**
 * Interface for formatted benchmark data ready for export
 */
interface FormattedBenchmarkData {
  'Metric ID': string;
  'ARR Range': string;
  'P5 Value': string;
  'P25 Value': string;
  'P50 Value': string;
  'P75 Value': string;
  'P90 Value': string;
}

/**
 * Formats benchmark data for export with validation and locale support
 * @param data Array of benchmark data to format
 * @returns Array of formatted objects ready for export
 * @throws Error if data validation fails
 */
export function formatBenchmarkData(data: BenchmarkData[]): FormattedBenchmarkData[] {
  if (!Array.isArray(data)) {
    throw new Error('Input must be an array of benchmark data');
  }

  const numberFormatter = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return data.map((item, index) => {
    if (!isBenchmarkData(item)) {
      throw new Error(`Invalid benchmark data at index ${index}`);
    }

    return {
      'Metric ID': item.id.toString(),
      'ARR Range': item.arrRange,
      'P5 Value': numberFormatter.format(item.p5Value),
      'P25 Value': numberFormatter.format(item.p25Value),
      'P50 Value': numberFormatter.format(item.p50Value),
      'P75 Value': numberFormatter.format(item.p75Value),
      'P90 Value': numberFormatter.format(item.p90Value)
    };
  });
}

/**
 * Generates and triggers download of CSV file
 * @param data Array of benchmark data to export
 * @param filename Desired filename for the export
 * @returns Promise that resolves when file download starts
 */
export async function generateCSV(data: BenchmarkData[], filename: string): Promise<void> {
  try {
    const formattedData = formatBenchmarkData(data);
    
    const csv = Papa.unparse(formattedData, {
      header: true,
      delimiter: ',',
      newline: '\n',
      skipEmptyLines: true
    });

    const blob = new Blob([csv], { type: MIME_TYPES.CSV });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('CSV generation failed:', error);
    throw new Error('Failed to generate CSV file');
  }
}

/**
 * Generates and triggers download of Excel file with formatting
 * @param data Array of benchmark data to export
 * @param filename Desired filename for the export
 * @returns Promise that resolves when file download starts
 */
export async function generateExcel(data: BenchmarkData[], filename: string): Promise<void> {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Benchmark Data');
    const formattedData = formatBenchmarkData(data);

    // Configure worksheet
    worksheet.properties.defaultRowHeight = 20;
    worksheet.properties.defaultColWidth = 15;

    // Add headers
    const headers = Object.keys(formattedData[0]);
    worksheet.addRow(headers);
    const headerRow = worksheet.getRow(1);
    headerRow.font = EXCEL_STYLES.HEADER.font;
    headerRow.fill = EXCEL_STYLES.HEADER.fill;
    headerRow.alignment = EXCEL_STYLES.HEADER.alignment;

    // Add data with formatting
    formattedData.forEach(row => {
      worksheet.addRow(Object.values(row));
    });

    // Apply column formatting
    worksheet.getColumn('P5 Value').numFmt = EXCEL_STYLES.PERCENTAGE_FORMAT;
    worksheet.getColumn('P25 Value').numFmt = EXCEL_STYLES.PERCENTAGE_FORMAT;
    worksheet.getColumn('P50 Value').numFmt = EXCEL_STYLES.PERCENTAGE_FORMAT;
    worksheet.getColumn('P75 Value').numFmt = EXCEL_STYLES.PERCENTAGE_FORMAT;
    worksheet.getColumn('P90 Value').numFmt = EXCEL_STYLES.PERCENTAGE_FORMAT;

    // Freeze header row
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Generate file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: MIME_TYPES.EXCEL });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Excel generation failed:', error);
    throw new Error('Failed to generate Excel file');
  }
}