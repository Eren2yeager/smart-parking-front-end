import { format } from 'date-fns';

/**
 * Formatted data for violations report
 */
export interface ViolationReportData {
  contractorName: string;
  lotName: string;
  timestamp: string;
  excessVehicles: number;
  penalty: number;
  violationType: string;
  allocatedCapacity: number;
  actualOccupancy: number;
  duration: number;
  status: string;
}

/**
 * Formatted data for occupancy report
 */
export interface OccupancyReportData {
  lotName: string;
  date: string;
  avgOccupancy: number;
  peakOccupancy: number;
  occupancyRate: number;
  totalSlots: number;
  contractorName: string;
}

/**
 * Formatted data for contractor performance report
 */
export interface ContractorPerformanceReportData {
  contractorName: string;
  complianceRate: number;
  totalViolations: number;
  avgOccupancy: number;
  allocatedCapacity: number;
  totalPenalties: number;
  activeLotsCount: number;
}

/**
 * Format violations data for report generation
 */
export function formatViolationsReport(violations: any[]): ViolationReportData[] {
  return violations.map((violation) => ({
    contractorName: violation.contractorId?.name || 'Unknown',
    lotName: violation.parkingLotId?.name || 'Unknown',
    timestamp: format(new Date(violation.timestamp), 'yyyy-MM-dd HH:mm:ss'),
    excessVehicles: violation.details?.excessVehicles || 0,
    penalty: violation.penalty || 0,
    violationType: violation.violationType || 'unknown',
    allocatedCapacity: violation.details?.allocatedCapacity || 0,
    actualOccupancy: violation.details?.actualOccupancy || 0,
    duration: violation.details?.duration || 0,
    status: violation.status || 'pending',
  }));
}

/**
 * Format occupancy data for report generation
 */
export function formatOccupancyReport(occupancyData: any[]): OccupancyReportData[] {
  return occupancyData.map((data) => ({
    lotName: data.lotName || 'Unknown',
    date: format(new Date(data.date), 'yyyy-MM-dd'),
    avgOccupancy: Math.round(data.avgOccupancy * 10) / 10,
    peakOccupancy: data.peakOccupancy || 0,
    occupancyRate: Math.round(data.occupancyRate * 1000) / 10, // Convert to percentage with 1 decimal
    totalSlots: data.totalSlots || 0,
    contractorName: data.contractorName || 'Unknown',
  }));
}

/**
 * Format contractor performance data for report generation
 */
export function formatContractorPerformanceReport(
  performanceData: any[]
): ContractorPerformanceReportData[] {
  return performanceData.map((data) => ({
    contractorName: data.contractorName || 'Unknown',
    complianceRate: Math.round(data.complianceRate * 1000) / 10, // Convert to percentage with 1 decimal
    totalViolations: data.totalViolations || 0,
    avgOccupancy: Math.round(data.avgOccupancy * 10) / 10,
    allocatedCapacity: data.allocatedCapacity || 0,
    totalPenalties: data.totalPenalties || 0,
    activeLotsCount: data.activeLotsCount || 0,
  }));
}

/**
 * Escapes CSV field values to handle commas, quotes, and newlines
 */
export function escapeCSVField(field: any): string {
  if (field === null || field === undefined) {
    return '';
  }

  const stringValue = String(field);

  // If the field contains comma, quote, or newline, wrap it in quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    // Escape existing quotes by doubling them
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Convert violations data to CSV format
 */
export function violationsToCSV(data: ViolationReportData[]): string {
  const headers = [
    'Contractor Name',
    'Parking Lot',
    'Timestamp',
    'Violation Type',
    'Allocated Capacity',
    'Actual Occupancy',
    'Excess Vehicles',
    'Duration (minutes)',
    'Penalty (₹)',
    'Status',
  ];

  const rows = data.map((row) => [
    escapeCSVField(row.contractorName),
    escapeCSVField(row.lotName),
    escapeCSVField(row.timestamp),
    escapeCSVField(row.violationType),
    escapeCSVField(row.allocatedCapacity),
    escapeCSVField(row.actualOccupancy),
    escapeCSVField(row.excessVehicles),
    escapeCSVField(row.duration),
    escapeCSVField(row.penalty),
    escapeCSVField(row.status),
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

/**
 * Convert occupancy data to CSV format
 */
export function occupancyToCSV(data: OccupancyReportData[]): string {
  const headers = [
    'Parking Lot',
    'Date',
    'Contractor',
    'Total Slots',
    'Average Occupancy',
    'Peak Occupancy',
    'Occupancy Rate (%)',
  ];

  const rows = data.map((row) => [
    escapeCSVField(row.lotName),
    escapeCSVField(row.date),
    escapeCSVField(row.contractorName),
    escapeCSVField(row.totalSlots),
    escapeCSVField(row.avgOccupancy),
    escapeCSVField(row.peakOccupancy),
    escapeCSVField(row.occupancyRate),
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

/**
 * Convert contractor performance data to CSV format
 */
export function contractorPerformanceToCSV(data: ContractorPerformanceReportData[]): string {
  const headers = [
    'Contractor Name',
    'Active Lots',
    'Allocated Capacity',
    'Compliance Rate (%)',
    'Total Violations',
    'Average Occupancy',
    'Total Penalties (₹)',
  ];

  const rows = data.map((row) => [
    escapeCSVField(row.contractorName),
    escapeCSVField(row.activeLotsCount),
    escapeCSVField(row.allocatedCapacity),
    escapeCSVField(row.complianceRate),
    escapeCSVField(row.totalViolations),
    escapeCSVField(row.avgOccupancy),
    escapeCSVField(row.totalPenalties),
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}
