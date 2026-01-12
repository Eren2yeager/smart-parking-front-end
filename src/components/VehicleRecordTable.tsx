'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

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

interface VehicleRecordTableProps {
  records: VehicleRecord[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

type SortField = 'plateNumber' | 'parkingLot' | 'entry' | 'exit' | 'duration' | 'status';
type SortDirection = 'asc' | 'desc' | null;

export default function VehicleRecordTable({
  records,
  currentPage,
  totalPages,
  onPageChange,
}: VehicleRecordTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedRecords = () => {
    if (!sortField || !sortDirection) {
      return records;
    }

    return [...records].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'plateNumber':
          aValue = a.plateNumber;
          bValue = b.plateNumber;
          break;
        case 'parkingLot':
          aValue = a.parkingLotId.name;
          bValue = b.parkingLotId.name;
          break;
        case 'entry':
          aValue = new Date(a.entry.timestamp).getTime();
          bValue = new Date(b.entry.timestamp).getTime();
          break;
        case 'exit':
          aValue = a.exit ? new Date(a.exit.timestamp).getTime() : 0;
          bValue = b.exit ? new Date(b.exit.timestamp).getTime() : 0;
          break;
        case 'duration':
          aValue = a.duration || 0;
          bValue = b.duration || 0;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    }
    if (sortDirection === 'asc') {
      return <ChevronUp className="w-4 h-4 text-blue-600" />;
    }
    return <ChevronDown className="w-4 h-4 text-blue-600" />;
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '-';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const sortedRecords = getSortedRecords();

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('plateNumber')}
              >
                <div className="flex items-center space-x-1">
                  <span>Plate Number</span>
                  <SortIcon field="plateNumber" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('parkingLot')}
              >
                <div className="flex items-center space-x-1">
                  <span>Parking Lot</span>
                  <SortIcon field="parkingLot" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('entry')}
              >
                <div className="flex items-center space-x-1">
                  <span>Entry Time</span>
                  <SortIcon field="entry" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('exit')}
              >
                <div className="flex items-center space-x-1">
                  <span>Exit Time</span>
                  <SortIcon field="exit" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('duration')}
              >
                <div className="flex items-center space-x-1">
                  <span>Duration</span>
                  <SortIcon field="duration" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center space-x-1">
                  <span>Status</span>
                  <SortIcon field="status" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No vehicle records found
                </td>
              </tr>
            ) : (
              sortedRecords.map((record) => (
                <tr key={record._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {record.plateNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {record.parkingLotId.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {format(new Date(record.entry.timestamp), 'MMM dd, yyyy')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(record.entry.timestamp), 'hh:mm a')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {record.exit ? (
                      <>
                        <div className="text-sm text-gray-900">
                          {format(new Date(record.exit.timestamp), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(record.exit.timestamp), 'hh:mm a')}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-gray-500">-</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDuration(record.duration)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        record.status === 'inside'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Page <span className="font-medium">{currentPage}</span> of{' '}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === pageNum
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
