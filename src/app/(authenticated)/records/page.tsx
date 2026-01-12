'use client';

import { useState, useEffect } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import VehicleRecordTable from '@/components/VehicleRecordTable';
import RecordFilters, { FilterValues } from '@/components/RecordFilters';
import { exportFilteredRecords } from '@/lib/export-csv';

interface VehicleRecord {
  _id: string;
  plateNumber: string;
  parkingLotId: {
    _id: string;
    name: string;
  };
  entry: {
    timestamp: string;
  };
  exit?: {
    timestamp: string;
  };
  duration?: number;
  status: 'inside' | 'exited';
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function RecordsPage() {
  const [records, setRecords] = useState<VehicleRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<FilterValues>({
    parkingLotId: '',
    status: '',
    startDate: '',
    endDate: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchRecords = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', pagination.limit.toString());

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

      const response = await fetch(`/api/records?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch vehicle records');
      }

      const data = await response.json();
      setRecords(data.data || []);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error fetching records:', err);
      setError('Failed to load vehicle records. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(1);
  }, [filters]);

  const handleFilterChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
  };

  const handlePageChange = (page: number) => {
    fetchRecords(page);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      await exportFilteredRecords({
        parkingLotId: filters.parkingLotId || undefined,
        status: filters.status || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
    } catch (err) {
      console.error('Error exporting records:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleRefresh = () => {
    fetchRecords(pagination.page);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vehicle Records</h1>
            <p className="text-gray-600 mt-1">
              View and export vehicle entry and exit records
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || loading || records.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <RecordFilters onFilterChange={handleFilterChange} />

      {/* Stats */}
      {!loading && !error && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium text-gray-900">{records.length}</span> of{' '}
              <span className="font-medium text-gray-900">{pagination.total}</span> records
            </div>
            {(filters.parkingLotId || filters.status || filters.startDate || filters.endDate) && (
              <div className="text-sm text-blue-600">
                Filters applied
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading records...</span>
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <VehicleRecordTable
          records={records}
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
        />
      )}

      {/* Empty State */}
      {!loading && !error && records.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No records found</h3>
          <p className="text-gray-500">
            {(filters.parkingLotId || filters.status || filters.startDate || filters.endDate)
              ? 'Try adjusting your filters to see more results.'
              : 'Vehicle records will appear here once vehicles enter parking lots.'}
          </p>
        </div>
      )}
    </div>
  );
}
