import { format } from 'date-fns';

interface VehicleRecord {
  _id: string;
  plateNumber: string;
  parkingLotId: {
    _id: string;
    name: string;
    location?: {
      address: string;
    };
  };
  contractorId?: {
    _id: string;
    name: string;
  };
  entry: {
    timestamp: string;
    gateId: string;
    confidence: number;
  };
  exit?: {
    timestamp: string;
    gateId: string;
    confidence: number;
  };
  duration?: number;
  status: 'inside' | 'exited';
  createdAt: string;
  updatedAt: string;
}

/**
 * Escapes CSV field values to handle commas, quotes, and newlines
 */
function escapeCSVField(field: any): string {
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
 * Formats duration in minutes to human-readable format
 */
function formatDuration(minutes?: number): string {
  if (!minutes) return '-';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

/**
 * Converts vehicle records to CSV format and triggers download
 */
export function exportRecordsToCSV(records: VehicleRecord[], filename?: string): void {
  if (!records || records.length === 0) {
    console.warn('No records to export');
    return;
  }

  // Define CSV headers
  const headers = [
    'Plate Number',
    'Parking Lot',
    'Parking Lot Address',
    'Contractor',
    'Entry Date',
    'Entry Time',
    'Entry Gate',
    'Entry Confidence',
    'Exit Date',
    'Exit Time',
    'Exit Gate',
    'Exit Confidence',
    'Duration',
    'Status',
    'Record Created',
    'Record Updated',
  ];

  // Convert records to CSV rows
  const rows = records.map((record) => {
    const entryDate = new Date(record.entry.timestamp);
    const exitDate = record.exit ? new Date(record.exit.timestamp) : null;
    const createdDate = new Date(record.createdAt);
    const updatedDate = new Date(record.updatedAt);

    return [
      escapeCSVField(record.plateNumber),
      escapeCSVField(record.parkingLotId.name),
      escapeCSVField(record.parkingLotId.location?.address || '-'),
      escapeCSVField(record.contractorId?.name || '-'),
      escapeCSVField(format(entryDate, 'yyyy-MM-dd')),
      escapeCSVField(format(entryDate, 'HH:mm:ss')),
      escapeCSVField(record.entry.gateId),
      escapeCSVField(record.entry.confidence.toFixed(2)),
      escapeCSVField(exitDate ? format(exitDate, 'yyyy-MM-dd') : '-'),
      escapeCSVField(exitDate ? format(exitDate, 'HH:mm:ss') : '-'),
      escapeCSVField(record.exit?.gateId || '-'),
      escapeCSVField(record.exit?.confidence.toFixed(2) || '-'),
      escapeCSVField(formatDuration(record.duration)),
      escapeCSVField(record.status),
      escapeCSVField(format(createdDate, 'yyyy-MM-dd HH:mm:ss')),
      escapeCSVField(format(updatedDate, 'yyyy-MM-dd HH:mm:ss')),
    ].join(',');
  });

  // Combine headers and rows
  const csvContent = [headers.join(','), ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    // Create download link
    const url = URL.createObjectURL(blob);
    const defaultFilename = `vehicle-records-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename || defaultFilename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
  }
}

/**
 * Fetches all records matching the current filters and exports to CSV
 */
export async function exportFilteredRecords(filters: {
  parkingLotId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}): Promise<void> {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    
    if (filters.parkingLotId) {
      params.append('parkingLotId', filters.parkingLotId);
    }
    if (filters.status) {
      params.append('status', filters.status);
    }
    if (filters.startDate) {
      params.append('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params.append('endDate', filters.endDate);
    }
    
    // Fetch all records (no pagination limit for export)
    params.append('limit', '10000'); // Large limit to get all records
    
    const response = await fetch(`/api/records?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch records for export');
    }
    
    const data = await response.json();
    const records = data.data || [];
    
    if (records.length === 0) {
      alert('No records to export');
      return;
    }
    
    exportRecordsToCSV(records);
  } catch (error) {
    console.error('Error exporting records:', error);
    alert('Failed to export records. Please try again.');
  }
}
