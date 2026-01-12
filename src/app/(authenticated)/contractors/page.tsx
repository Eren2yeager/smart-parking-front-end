'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Plus, Search, Filter, Building2, Users, AlertTriangle } from 'lucide-react';

interface Contractor {
  _id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  contractDetails: {
    startDate: string;
    endDate: string;
    allocatedCapacity: number;
    penaltyPerViolation: number;
  };
  status: 'active' | 'suspended' | 'terminated';
  createdAt: string;
  updatedAt: string;
  assignedParkingLots?: Array<{
    _id: string;
    name: string;
    totalSlots: number;
    currentOccupancy?: {
      occupied: number;
      empty: number;
      occupancyRate: number;
    } | null;
  }>;
  currentTotalOccupancy?: number;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'suspended':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'terminated':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

function getOccupancyColor(occupancy: number, allocated: number): string {
  const percentage = (occupancy / allocated) * 100;
  if (percentage > 100) {
    return 'text-red-600 font-bold';
  } else if (percentage >= 90) {
    return 'text-yellow-600 font-semibold';
  } else {
    return 'text-green-600';
  }
}

export default function ContractorsPage() {
  const { data: session } = useSession();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'terminated'>(
    'all'
  );

  const isAdmin = session?.user?.role === 'admin';

  const fetchContractors = async () => {
    try {
      setError(null);
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/contractors?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch contractors');
      }

      const result = await response.json();
      
      // Fetch additional details for each contractor
      const contractorsWithDetails = await Promise.all(
        (result.data || []).map(async (contractor: Contractor) => {
          try {
            const detailResponse = await fetch(`/api/contractors/${contractor._id}`);
            if (detailResponse.ok) {
              const detailResult = await detailResponse.json();
              return detailResult.data;
            }
          } catch (err) {
            console.error(`Error fetching details for contractor ${contractor._id}:`, err);
          }
          return contractor;
        })
      );

      setContractors(contractorsWithDetails);
    } catch (err) {
      console.error('Error fetching contractors:', err);
      setError('Failed to load contractors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractors();
  }, [statusFilter]);

  // Filter contractors by search query
  const filteredContractors = contractors.filter((contractor) => {
    const matchesSearch =
      searchQuery === '' ||
      contractor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contractor.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contractor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contractor.phone.includes(searchQuery);

    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Contractors</h1>
          <p className="text-gray-600">Manage parking lot contractors and their allocations</p>
        </div>
        {isAdmin && (
          <Link
            href="/contractors/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Create New
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, contact person, email, or phone..."
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
              onChange={(e) =>
                setStatusFilter(e.target.value as 'all' | 'active' | 'suspended' | 'terminated')
              }
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        {!loading && (
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredContractors.length} of {contractors.length} contractor
            {contractors.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Contractors List */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
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
            onClick={fetchContractors}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      ) : filteredContractors.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-600 mb-2">
            {searchQuery || statusFilter !== 'all'
              ? 'No contractors match your filters'
              : 'No contractors found'}
          </p>
          <p className="text-sm text-gray-500">
            {isAdmin && !searchQuery && statusFilter === 'all'
              ? 'Create a contractor to get started'
              : 'Try adjusting your search or filters'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredContractors.map((contractor) => {
            const totalOccupancy = contractor.currentTotalOccupancy || 0;
            const allocatedCapacity = contractor.contractDetails.allocatedCapacity;
            const isOverCapacity = totalOccupancy > allocatedCapacity;

            return (
              <Link key={contractor._id} href={`/contractors/${contractor._id}`}>
                <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-200 cursor-pointer">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">{contractor.name}</h3>
                          <span
                            className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                              contractor.status
                            )}`}
                          >
                            {contractor.status.charAt(0).toUpperCase() + contractor.status.slice(1)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>
                            <span className="font-medium">Contact:</span> {contractor.contactPerson}
                          </p>
                          <p>
                            <span className="font-medium">Email:</span> {contractor.email}
                          </p>
                          <p>
                            <span className="font-medium">Phone:</span> {contractor.phone}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Contract Details */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Allocated Capacity</p>
                        <p className="text-lg font-bold text-gray-900">
                          {allocatedCapacity} slots
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Current Occupancy</p>
                        <p
                          className={`text-lg font-bold ${getOccupancyColor(
                            totalOccupancy,
                            allocatedCapacity
                          )}`}
                        >
                          {totalOccupancy} / {allocatedCapacity}
                          {isOverCapacity && (
                            <AlertTriangle className="inline-block w-4 h-4 ml-1" />
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Assigned Lots</p>
                        <p className="text-lg font-bold text-gray-900">
                          {contractor.assignedParkingLots?.length || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Penalty Rate</p>
                        <p className="text-lg font-bold text-gray-900">
                          ₹{contractor.contractDetails.penaltyPerViolation}
                        </p>
                      </div>
                    </div>

                    {/* Assigned Parking Lots */}
                    {contractor.assignedParkingLots && contractor.assignedParkingLots.length > 0 && (
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Building2 className="w-4 h-4 text-gray-500" />
                          <p className="text-sm font-medium text-gray-700">Assigned Parking Lots</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {contractor.assignedParkingLots.map((lot) => (
                            <div
                              key={lot._id}
                              className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <p className="font-medium text-gray-900 text-sm mb-1">{lot.name}</p>
                              <div className="flex items-center justify-between text-xs text-gray-600">
                                <span>
                                  <Users className="inline-block w-3 h-3 mr-1" />
                                  {lot.currentOccupancy?.occupied || 0} / {lot.totalSlots}
                                </span>
                                <span>
                                  {lot.currentOccupancy
                                    ? `${lot.currentOccupancy.occupancyRate.toFixed(1)}%`
                                    : '0%'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Contract Period */}
                    <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                      Contract Period:{' '}
                      {new Date(contractor.contractDetails.startDate).toLocaleDateString()} -{' '}
                      {new Date(contractor.contractDetails.endDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
