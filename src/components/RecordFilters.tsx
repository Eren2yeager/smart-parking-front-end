'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Filter, X } from 'lucide-react';
import { debounce } from '@/lib/debounce';

interface ParkingLot {
  _id: string;
  name: string;
}

interface RecordFiltersProps {
  onFilterChange: (filters: FilterValues) => void;
}

export interface FilterValues {
  parkingLotId: string;
  status: string;
  startDate: string;
  endDate: string;
}

export default function RecordFilters({ onFilterChange }: RecordFiltersProps) {
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({
    parkingLotId: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  // Create debounced filter change handler
  const debouncedFilterChange = useRef(
    debounce((newFilters: FilterValues) => {
      onFilterChange(newFilters);
    }, 300)
  ).current;

  useEffect(() => {
    // Fetch parking lots for filter dropdown
    const fetchParkingLots = async () => {
      try {
        const response = await fetch('/api/parking-lots');
        if (response.ok) {
          const data = await response.json();
          setParkingLots(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching parking lots:', error);
      }
    };

    fetchParkingLots();
  }, []);

  const handleFilterChange = (field: keyof FilterValues, value: string) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    debouncedFilterChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters: FilterValues = {
      parkingLotId: '',
      status: '',
      startDate: '',
      endDate: '',
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const hasActiveFilters = Object.values(filters).some((value) => value !== '');

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
        >
          <Filter className="w-5 h-5" />
          <span className="font-medium">Filters</span>
          {hasActiveFilters && (
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
        </button>
        
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <X className="w-4 h-4" />
            <span>Clear all</span>
          </button>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
          {/* Parking Lot Filter */}
          <div>
            <label
              htmlFor="parkingLot"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Parking Lot
            </label>
            <select
              id="parkingLot"
              value={filters.parkingLotId}
              onChange={(e) => handleFilterChange('parkingLotId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Parking Lots</option>
              {parkingLots.map((lot) => (
                <option key={lot._id} value={lot._id}>
                  {lot.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Status
            </label>
            <select
              id="status"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="inside">Inside</option>
              <option value="exited">Exited</option>
            </select>
          </div>

          {/* Start Date Filter */}
          <div>
            <label
              htmlFor="startDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* End Date Filter */}
          <div>
            <label
              htmlFor="endDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
