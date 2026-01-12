'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Plus, Search, Filter } from 'lucide-react';
import ParkingLotCard from '@/components/ParkingLotCard';

interface ParkingLot {
  _id: string;
  name: string;
  location: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  totalSlots: number;
  status: 'active' | 'inactive';
  contractorId?: {
    _id: string;
    name: string;
    status: string;
  };
  currentOccupancy?: {
    occupied: number;
    empty: number;
    occupancyRate: number;
    lastUpdated: string;
  } | null;
}

export default function ParkingLotsPage() {
  const { data: session } = useSession();
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [contractorFilter, setContractorFilter] = useState<string>('all');
  const [contractors, setContractors] = useState<Array<{ _id: string; name: string }>>([]);

  const isAdmin = session?.user?.role === 'admin';

  const fetchParkingLots = async () => {
    try {
      setError(null);
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (contractorFilter !== 'all') {
        params.append('contractorId', contractorFilter);
      }
      params.append('limit', '100');

      const response = await fetch(`/api/parking-lots?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch parking lots');
      }

      const result = await response.json();
      setParkingLots(result.data || []);
    } catch (err) {
      console.error('Error fetching parking lots:', err);
      setError('Failed to load parking lots');
    } finally {
      setLoading(false);
    }
  };

  const fetchContractors = async () => {
    try {
      const response = await fetch('/api/contractors?status=active&limit=100');
      if (response.ok) {
        const result = await response.json();
        setContractors(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching contractors:', err);
    }
  };

  useEffect(() => {
    fetchParkingLots();
    fetchContractors();
  }, [statusFilter, contractorFilter]);

  // Filter parking lots by search query
  const filteredParkingLots = parkingLots.filter((lot) => {
    const matchesSearch =
      searchQuery === '' ||
      lot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.location.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.contractorId?.name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Parking Lots</h1>
          <p className="text-gray-600">Manage and monitor all parking facilities</p>
        </div>
        {isAdmin && (
          <Link
            href="/parking-lots/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Create New
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, location, or contractor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Contractor Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={contractorFilter}
              onChange={(e) => setContractorFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Contractors</option>
              {contractors.map((contractor) => (
                <option key={contractor._id} value={contractor._id}>
                  {contractor.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Count */}
        {!loading && (
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredParkingLots.length} of {parkingLots.length} parking lot
            {parkingLots.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Parking Lots Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800">{error}</p>
          <button
            onClick={fetchParkingLots}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      ) : filteredParkingLots.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-600 mb-2">
            {searchQuery || statusFilter !== 'all' || contractorFilter !== 'all'
              ? 'No parking lots match your filters'
              : 'No parking lots found'}
          </p>
          <p className="text-sm text-gray-500">
            {isAdmin && !searchQuery && statusFilter === 'all' && contractorFilter === 'all'
              ? 'Create a parking lot to get started'
              : 'Try adjusting your search or filters'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredParkingLots.map((lot) => (
            <ParkingLotCard key={lot._id} lot={lot} />
          ))}
        </div>
      )}
    </div>
  );
}
