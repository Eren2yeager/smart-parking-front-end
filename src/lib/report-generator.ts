/**
 * Report Generation Module
 * 
 * Generates reports in multiple formats (CSV, Excel, PDF) for violations,
 * occupancy, and contractor performance data. Uses ExcelJS for Excel generation
 * and jsPDF for PDF generation with formatted tables and charts.
 * 
 * @module report-generator
 * 
 * @example
 * ```typescript
 * // Generate CSV report
 * const csv = await generateCSVReport('violations', violationData);
 * 
 * // Generate Excel report
 * const excel = await generateExcelReport('occupancy', occupancyData);
 * 
 * // Generate PDF report
 * const pdf = await generatePDFReport('contractor_performance', performanceData);
 * ```
 */

import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import {
  ViolationReportData,
  OccupancyReportData,
  ContractorPerformanceReportData,
  violationsToCSV,
  occupancyToCSV,
  contractorPerformanceToCSV,
} from './report-formatters';

/**
 * Generate CSV report
 * 
 * Creates a CSV file with formatted data for the specified report type.
 * Uses the report-formatters module to convert data to CSV format.
 * 
 * @param type - Type of report to generate
 * @param data - Report data array
 * @returns Promise resolving to CSV content and filename
 * 
 * @example
 * ```typescript
 * const { content, filename } = await generateCSVReport('violations', data);
 * // Download or save the CSV file
 * ```
 */
export async function generateCSVReport(
  type: 'violations' | 'occupancy' | 'contractor_performance',
  data: ViolationReportData[] | OccupancyReportData[] | ContractorPerformanceReportData[]
): Promise<{ content: string; filename: string }> {
  let csvContent: string;
  const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');

  switch (type) {
    case 'violations':
      csvContent = violationsToCSV(data as ViolationReportData[]);
      return {
        content: csvContent,
        filename: `violations-report-${timestamp}.csv`,
      };

    case 'occupancy':
      csvContent = occupancyToCSV(data as OccupancyReportData[]);
      return {
        content: csvContent,
        filename: `occupancy-report-${timestamp}.csv`,
      };

    case 'contractor_performance':
      csvContent = contractorPerformanceToCSV(data as ContractorPerformanceReportData[]);
      return {
        content: csvContent,
        filename: `contractor-performance-report-${timestamp}.csv`,
      };

    default:
      throw new Error(`Unsupported report type: ${type}`);
  }
}

/**
 * Generate Excel report with formatting
 * 
 * Creates an Excel workbook with formatted sheets, styled headers, borders,
 * and summary statistics. Uses ExcelJS for professional-looking spreadsheets.
 * 
 * @param type - Type of report to generate
 * @param data - Report data array
 * @returns Promise resolving to Excel buffer and filename
 * 
 * @example
 * ```typescript
 * const { buffer, filename } = await generateExcelReport('occupancy', data);
 * // Send buffer as download response
 * ```
 */
export async function generateExcelReport(
  type: 'violations' | 'occupancy' | 'contractor_performance',
  data: ViolationReportData[] | OccupancyReportData[] | ContractorPerformanceReportData[]
): Promise<{ buffer: Buffer; filename: string }> {
  const workbook = new ExcelJS.Workbook();
  const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');

  workbook.creator = 'Smart Parking Management System';
  workbook.created = new Date();

  switch (type) {
    case 'violations':
      await createViolationsSheet(workbook, data as ViolationReportData[]);
      break;

    case 'occupancy':
      await createOccupancySheet(workbook, data as OccupancyReportData[]);
      break;

    case 'contractor_performance':
      await createContractorPerformanceSheet(workbook, data as ContractorPerformanceReportData[]);
      break;

    default:
      throw new Error(`Unsupported report type: ${type}`);
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return {
    buffer: Buffer.from(buffer),
    filename: `${type.replace(/_/g, '-')}-report-${timestamp}.xlsx`,
  };
}

/**
 * Create violations sheet in Excel workbook
 * 
 * Adds a formatted worksheet with violation data including contractor names,
 * parking lots, timestamps, excess vehicles, penalties, and status. Includes
 * styled headers, borders, and summary statistics.
 * 
 * @param workbook - ExcelJS workbook instance
 * @param data - Violation report data
 * @private
 */
async function createViolationsSheet(
  workbook: ExcelJS.Workbook,
  data: ViolationReportData[]
): Promise<void> {
  const sheet = workbook.addWorksheet('Violations Report');

  // Define columns
  sheet.columns = [
    { header: 'Contractor Name', key: 'contractorName', width: 25 },
    { header: 'Parking Lot', key: 'lotName', width: 25 },
    { header: 'Timestamp', key: 'timestamp', width: 20 },
    { header: 'Violation Type', key: 'violationType', width: 20 },
    { header: 'Allocated Capacity', key: 'allocatedCapacity', width: 18 },
    { header: 'Actual Occupancy', key: 'actualOccupancy', width: 18 },
    { header: 'Excess Vehicles', key: 'excessVehicles', width: 15 },
    { header: 'Duration (min)', key: 'duration', width: 15 },
    { header: 'Penalty (₹)', key: 'penalty', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
  ];

  // Style header row
  sheet.getRow(1).font = { bold: true, size: 12 };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Add data rows
  data.forEach((row) => {
    sheet.addRow(row);
  });

  // Add borders to all cells
  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  // Add summary at the bottom
  const summaryRow = sheet.addRow([]);
  summaryRow.getCell(1).value = 'Total Violations:';
  summaryRow.getCell(1).font = { bold: true };
  summaryRow.getCell(2).value = data.length;

  const totalPenalties = data.reduce((sum, row) => sum + row.penalty, 0);
  const penaltyRow = sheet.addRow([]);
  penaltyRow.getCell(1).value = 'Total Penalties:';
  penaltyRow.getCell(1).font = { bold: true };
  penaltyRow.getCell(2).value = `₹${totalPenalties.toLocaleString()}`;
}

/**
 * Create occupancy sheet in Excel workbook
 * 
 * Adds a formatted worksheet with occupancy data including parking lot names,
 * dates, average/peak occupancy, and occupancy rates. Includes styled headers,
 * borders, and summary statistics.
 * 
 * @param workbook - ExcelJS workbook instance
 * @param data - Occupancy report data
 * @private
 */
async function createOccupancySheet(
  workbook: ExcelJS.Workbook,
  data: OccupancyReportData[]
): Promise<void> {
  const sheet = workbook.addWorksheet('Occupancy Report');

  // Define columns
  sheet.columns = [
    { header: 'Parking Lot', key: 'lotName', width: 25 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Contractor', key: 'contractorName', width: 25 },
    { header: 'Total Slots', key: 'totalSlots', width: 12 },
    { header: 'Avg Occupancy', key: 'avgOccupancy', width: 15 },
    { header: 'Peak Occupancy', key: 'peakOccupancy', width: 15 },
    { header: 'Occupancy Rate (%)', key: 'occupancyRate', width: 18 },
  ];

  // Style header row
  sheet.getRow(1).font = { bold: true, size: 12 };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF70AD47' },
  };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Add data rows
  data.forEach((row) => {
    sheet.addRow(row);
  });

  // Add borders to all cells
  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  // Add summary
  const avgOccupancyRate =
    data.reduce((sum, row) => sum + row.occupancyRate, 0) / data.length || 0;
  const summaryRow = sheet.addRow([]);
  summaryRow.getCell(1).value = 'Average Occupancy Rate:';
  summaryRow.getCell(1).font = { bold: true };
  summaryRow.getCell(2).value = `${avgOccupancyRate.toFixed(1)}%`;
}

/**
 * Create contractor performance sheet in Excel workbook
 * 
 * Adds a formatted worksheet with contractor performance data including
 * compliance rates, violations, occupancy, and penalties. Includes styled
 * headers, borders, and summary statistics.
 * 
 * @param workbook - ExcelJS workbook instance
 * @param data - Contractor performance report data
 * @private
 */
async function createContractorPerformanceSheet(
  workbook: ExcelJS.Workbook,
  data: ContractorPerformanceReportData[]
): Promise<void> {
  const sheet = workbook.addWorksheet('Contractor Performance');

  // Define columns
  sheet.columns = [
    { header: 'Contractor Name', key: 'contractorName', width: 25 },
    { header: 'Active Lots', key: 'activeLotsCount', width: 12 },
    { header: 'Allocated Capacity', key: 'allocatedCapacity', width: 18 },
    { header: 'Compliance Rate (%)', key: 'complianceRate', width: 18 },
    { header: 'Total Violations', key: 'totalViolations', width: 15 },
    { header: 'Avg Occupancy', key: 'avgOccupancy', width: 15 },
    { header: 'Total Penalties (₹)', key: 'totalPenalties', width: 18 },
  ];

  // Style header row
  sheet.getRow(1).font = { bold: true, size: 12 };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFC000' },
  };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Add data rows
  data.forEach((row) => {
    sheet.addRow(row);
  });

  // Add borders to all cells
  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  // Add summary
  const totalViolations = data.reduce((sum, row) => sum + row.totalViolations, 0);
  const totalPenalties = data.reduce((sum, row) => sum + row.totalPenalties, 0);
  const avgCompliance =
    data.reduce((sum, row) => sum + row.complianceRate, 0) / data.length || 0;

  sheet.addRow([]);
  const summaryRow1 = sheet.addRow([]);
  summaryRow1.getCell(1).value = 'Total Violations:';
  summaryRow1.getCell(1).font = { bold: true };
  summaryRow1.getCell(2).value = totalViolations;

  const summaryRow2 = sheet.addRow([]);
  summaryRow2.getCell(1).value = 'Total Penalties:';
  summaryRow2.getCell(1).font = { bold: true };
  summaryRow2.getCell(2).value = `₹${totalPenalties.toLocaleString()}`;

  const summaryRow3 = sheet.addRow([]);
  summaryRow3.getCell(1).value = 'Average Compliance:';
  summaryRow3.getCell(1).font = { bold: true };
  summaryRow3.getCell(2).value = `${avgCompliance.toFixed(1)}%`;
}

/**
 * Generate PDF report
 * 
 * Creates a PDF document with formatted tables for the specified report type.
 * Uses jsPDF and jspdf-autotable for professional-looking PDF reports with
 * headers, footers, and page numbers.
 * 
 * @param type - Type of report to generate
 * @param data - Report data array
 * @returns Promise resolving to PDF buffer and filename
 * 
 * @example
 * ```typescript
 * const { buffer, filename } = await generatePDFReport('violations', data);
 * // Send buffer as download response
 * ```
 */
export async function generatePDFReport(
  type: 'violations' | 'occupancy' | 'contractor_performance',
  data: ViolationReportData[] | OccupancyReportData[] | ContractorPerformanceReportData[]
): Promise<{ buffer: Buffer; filename: string }> {
  const doc = new jsPDF();
  const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');

  // Add title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');

  switch (type) {
    case 'violations':
      doc.text('Violations Report', 14, 20);
      createViolationsPDF(doc, data as ViolationReportData[]);
      break;

    case 'occupancy':
      doc.text('Occupancy Report', 14, 20);
      createOccupancyPDF(doc, data as OccupancyReportData[]);
      break;

    case 'contractor_performance':
      doc.text('Contractor Performance Report', 14, 20);
      createContractorPerformancePDF(doc, data as ContractorPerformanceReportData[]);
      break;

    default:
      throw new Error(`Unsupported report type: ${type}`);
  }

  // Add footer with generation date
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generated on ${format(new Date(), 'MMM dd, yyyy HH:mm')} | Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  const buffer = Buffer.from(doc.output('arraybuffer'));

  return {
    buffer,
    filename: `${type.replace(/_/g, '-')}-report-${timestamp}.pdf`,
  };
}

/**
 * Create violations table in PDF
 * 
 * Adds a formatted table with violation data to the PDF document.
 * Includes summary statistics at the bottom.
 * 
 * @param doc - jsPDF document instance
 * @param data - Violation report data
 * @private
 */
function createViolationsPDF(doc: jsPDF, data: ViolationReportData[]): void {
  const tableData = data.map((row) => [
    row.contractorName,
    row.lotName,
    row.timestamp,
    row.excessVehicles,
    `₹${row.penalty}`,
  ]);

  autoTable(doc, {
    startY: 30,
    head: [['Contractor', 'Parking Lot', 'Timestamp', 'Excess Vehicles', 'Penalty']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [68, 114, 196] },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 40 },
      2: { cellWidth: 40 },
      3: { cellWidth: 30, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
    },
  });

  // Add summary
  const finalY = (doc as any).lastAutoTable.finalY || 30;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Violations: ${data.length}`, 14, finalY + 10);

  const totalPenalties = data.reduce((sum, row) => sum + row.penalty, 0);
  doc.text(`Total Penalties: ₹${totalPenalties.toLocaleString()}`, 14, finalY + 17);
}

/**
 * Create occupancy table in PDF
 * 
 * Adds a formatted table with occupancy data to the PDF document.
 * Includes summary statistics at the bottom.
 * 
 * @param doc - jsPDF document instance
 * @param data - Occupancy report data
 * @private
 */
function createOccupancyPDF(doc: jsPDF, data: OccupancyReportData[]): void {
  const tableData = data.map((row) => [
    row.lotName,
    row.date,
    row.avgOccupancy.toFixed(1),
    row.peakOccupancy,
    `${row.occupancyRate.toFixed(1)}%`,
  ]);

  autoTable(doc, {
    startY: 30,
    head: [['Parking Lot', 'Date', 'Avg Occupancy', 'Peak Occupancy', 'Occupancy Rate']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [112, 173, 71] },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 30 },
      2: { cellWidth: 35, halign: 'center' },
      3: { cellWidth: 35, halign: 'center' },
      4: { cellWidth: 35, halign: 'center' },
    },
  });

  // Add summary
  const finalY = (doc as any).lastAutoTable.finalY || 30;
  const avgOccupancyRate =
    data.reduce((sum, row) => sum + row.occupancyRate, 0) / data.length || 0;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Average Occupancy Rate: ${avgOccupancyRate.toFixed(1)}%`, 14, finalY + 10);
}

/**
 * Create contractor performance table in PDF
 * 
 * Adds a formatted table with contractor performance data to the PDF document.
 * Includes summary statistics at the bottom.
 * 
 * @param doc - jsPDF document instance
 * @param data - Contractor performance report data
 * @private
 */
function createContractorPerformancePDF(doc: jsPDF, data: ContractorPerformanceReportData[]): void {
  const tableData = data.map((row) => [
    row.contractorName,
    `${row.complianceRate.toFixed(1)}%`,
    row.totalViolations,
    row.avgOccupancy.toFixed(1),
    `₹${row.totalPenalties.toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: 30,
    head: [['Contractor', 'Compliance Rate', 'Violations', 'Avg Occupancy', 'Total Penalties']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [255, 192, 0] },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 35, halign: 'center' },
      4: { cellWidth: 35, halign: 'right' },
    },
  });

  // Add summary
  const finalY = (doc as any).lastAutoTable.finalY || 30;
  const totalViolations = data.reduce((sum, row) => sum + row.totalViolations, 0);
  const totalPenalties = data.reduce((sum, row) => sum + row.totalPenalties, 0);
  const avgCompliance =
    data.reduce((sum, row) => sum + row.complianceRate, 0) / data.length || 0;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Violations: ${totalViolations}`, 14, finalY + 10);
  doc.text(`Total Penalties: ₹${totalPenalties.toLocaleString()}`, 14, finalY + 17);
  doc.text(`Average Compliance: ${avgCompliance.toFixed(1)}%`, 14, finalY + 24);
}
