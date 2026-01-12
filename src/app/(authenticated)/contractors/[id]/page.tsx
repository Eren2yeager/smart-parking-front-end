'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Users,
  AlertTriangle,
  Calendar,
  Mail,
  Phone,
  User,
  Edit,
  TrendingUp,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  MapPin,
} from 'lucide-react';
import PerformanceChart from '@/components/PerformanceChart';

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
    location: {
      address: string;
    };
    totalSlots: number;
    status: string;
    currentOccupancy?: {
      occupied: number;
      empty: number;
      occupancyRate: number;
      lastUpdated: string;
    } | null;
  }>;
  currentTotalOccupancy?: number;
}

interface Performance {
  contractorId: string;
  contractorName: string;
  dateRange: {
    start: string;
    end: string;
  };
  complianceRate: number;
  violations: {
    total: number;
    pending: number;
    acknowledged: number;
    resolved: number;
    recent: Array<{
      _id: string;
      violationType: string;
      timestamp: string;
      details: {
        allocatedCapacity: number;
        actualOccupancy: number;
        excessVehicles: number;
        duration: number;
      };
      penalty: number;
      status: string;
      parkingLotId: {
        _id: string;
        name: string;
        location: {
          address: string;
        };
      };
    }>;
  };
  totalPenalties: number;
  occupancyTrends: Array<{
    date: string;
    avgOccupancy: number;
    avgOccupancyRate: number;
    totalSlots: number;
  }>;
  totalCapacityChecks: number;
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

function getViolationStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'acknowledged':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'resolved':
      return 'bg-green-100 text-green-800 border-green-300';
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

export default function ContractorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [loading, setLoading] = useState(true);
  const [performanceLoading, setPerformanceLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  const isAdmin = session?.user?.role === 'admin';
  const contractorId = params.id as string;

  const fetchContractor = async () => {
    try {
      setError(null);
      setLoading(true);

      const response = await fetch(`/api/contractors/${contractorId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Contractor not found');
        }
        throw new Error('Failed to fetch contractor details');
      }

      const result = await response.json();
      setContractor(result.data);
    } catch (err: any) {
      console.error('Error fetching contractor:', err);
      setError(err.message || 'Failed to load contractor details');
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformance = async () => {
    try {
      setPerformanceLoading(true);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (dateRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
      }

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const response = await fetch(`/api/contractors/${contractorId}/performance?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch performance data');
      }

      const result = await response.json();
      setPerformance(result.data);
    } catch (err) {
      console.error('Error fetching performance:', err);
    } finally {
      setPerformanceLoading(false);
    }
  };

  useEffect(() => {
    fetchContractor();
  }, [contractorId]);

  useEffect(() => {
    if (contractor) {
      fetchPerformance();
    }
  }, [contractor, dateRange]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !contractor) {
    return (
      <div className="space-y-6">
        <Link
          href="/contractors"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Contractors
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-12 text-center">
          <p className="text-red-800 mb-4">{error || 'Contractor not found'}</p>
          <button
            onClick={() => router.push('/contractors')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const totalOccupancy = contractor.currentTotalOccupancy || 0;
  const allocatedCapacity = contractor.contractDetails.allocatedCapacity;
  const isOverCapacity = totalOccupancy > allocatedCapacity;
  const occupancyPercentage = (totalOccupancy / allocatedCapacity) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/contractors"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{contractor.name}</h1>
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(
                  contractor.status
                )}`}
              >
                {contractor.status.charAt(0).toUpperCase() + contractor.status.slice(1)}
              </span>
            </div>
            <p className="text-gray-600">Contractor Details and Performance Metrics</p>
          </div>
        </div>
        {isAdmin && (
          <Link
            href={`/contractors/${contractorId}/edit`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
        )}
      </div>

      {/* Contractor Information Card */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Contractor Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Contact Person</p>
                  <p className="text-base font-medium text-gray-900">{contractor.contactPerson}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-base font-medium text-gray-900">{contractor.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="text-base font-medium text-gray-900">{contractor.phone}</p>
                </div>
              </div>
            </div>

            {/* Contract Details */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Contract Period</p>
                  <p className="text-base font-medium text-gray-900">
                    {new Date(contractor.contractDetails.startDate).toLocaleDateString()} -{' '}
                    {new Date(contractor.contractDetails.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Allocated Capacity</p>
                  <p className="text-base font-medium text-gray-900">
                    {allocatedCapacity} slots
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Penalty Per Violation</p>
                  <p className="text-base font-medium text-gray-900">
                    ₹{contractor.contractDetails.penaltyPerViolation}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Occupancy Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Current Total Occupancy</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-2">Allocated Capacity</p>
            <p className="text-3xl font-bold text-gray-900">{allocatedCapacity}</p>
            <p className="text-xs text-gray-500 mt-1">slots</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-2">Current Occupancy</p>
            <p className={`text-3xl font-bold ${getOccupancyColor(totalOccupancy, allocatedCapacity)}`}>
              {totalOccupancy}
            </p>
            <p className="text-xs text-gray-500 mt-1">vehicles</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-2">Utilization</p>
            <p className={`text-3xl font-bold ${getOccupancyColor(totalOccupancy, allocatedCapacity)}`}>
              {occupancyPercentage.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">of capacity</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-2">Status</p>
            <div className="flex items-center justify-center gap-2">
              {isOverCapacity ? (
                <>
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                  <p className="text-lg font-bold text-red-600">Over Capacity</p>
                </>
              ) : (
                <>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <p className="text-lg font-bold text-green-600">Within Limit</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Parking Lots */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-gray-500" />
            <h2 className="text-xl font-bold text-gray-900">
              Assigned Parking Lots ({contractor.assignedParkingLots?.length || 0})
            </h2>
          </div>
          {contractor.assignedParkingLots && contractor.assignedParkingLots.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contractor.assignedParkingLots.map((lot) => (
                <Link key={lot._id} href={`/parking-lots/${lot._id}`}>
                  <div className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-gray-900">{lot.name}</h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          lot.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {lot.status}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 mb-3">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-gray-600">{lot.location.address}</p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {lot.currentOccupancy?.occupied || 0} / {lot.totalSlots}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-600">
                        {lot.currentOccupancy
                          ? `${lot.currentOccupancy.occupancyRate.toFixed(1)}%`
                          : '0%'}
                      </span>
                    </div>
                    {lot.currentOccupancy?.lastUpdated && (
                      <p className="text-xs text-gray-400 mt-2">
                        Updated: {new Date(lot.currentOccupancy.lastUpdated).toLocaleString()}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No parking lots assigned to this contractor</p>
            </div>
          )}
        </div>
      </div>

      {/* Performance Metrics Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-500" />
              <h2 className="text-xl font-bold text-gray-900">Performance Metrics</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDateRange('7d')}
                className={`px-3 py-1 text-sm rounded ${
                  dateRange === '7d'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setDateRange('30d')}
                className={`px-3 py-1 text-sm rounded ${
                  dateRange === '30d'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setDateRange('90d')}
                className={`px-3 py-1 text-sm rounded ${
                  dateRange === '90d'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                90 Days
              </button>
            </div>
          </div>

          {performanceLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          ) : performance ? (
            <>
              {/* Performance Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-600 mb-2">Compliance Rate</p>
                  <p className="text-3xl font-bold text-blue-700">
                    {performance.complianceRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    {performance.totalCapacityChecks} checks
                  </p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-600 mb-2">Total Violations</p>
                  <p className="text-3xl font-bold text-red-700">{performance.violations.total}</p>
                  <p className="text-xs text-red-500 mt-1">
                    {performance.violations.pending} pending
                  </p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-600 mb-2">Total Penalties</p>
                  <p className="text-3xl font-bold text-yellow-700">
                    ₹{performance.totalPenalties.toLocaleString()}
                  </p>
                  <p className="text-xs text-yellow-500 mt-1">accumulated</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-600 mb-2">Resolved</p>
                  <p className="text-3xl font-bold text-green-700">
                    {performance.violations.resolved}
                  </p>
                  <p className="text-xs text-green-500 mt-1">violations</p>
                </div>
              </div>

              {/* Performance Chart */}
              <PerformanceChart
                occupancyTrends={performance.occupancyTrends}
                allocatedCapacity={allocatedCapacity}
              />
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No performance data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Violation History */}
      {performance && performance.violations.recent.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-gray-500" />
              <h2 className="text-xl font-bold text-gray-900">Recent Violations</h2>
            </div>
            <div className="space-y-3">
              {performance.violations.recent.map((violation) => (
                <div
                  key={violation._id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900">
                          {violation.parkingLotId.name}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded border ${getViolationStatusColor(
                            violation.status
                          )}`}
                        >
                          {violation.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {violation.parkingLotId.location.address}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>
                          <Clock className="inline-block w-4 h-4 mr-1" />
                          {new Date(violation.timestamp).toLocaleString()}
                        </span>
                        <span>
                          <AlertTriangle className="inline-block w-4 h-4 mr-1" />
                          {violation.details.excessVehicles} excess vehicles
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 mb-1">Penalty</p>
                      <p className="text-lg font-bold text-red-600">
                        ₹{violation.penalty.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-200 text-sm">
                    <div>
                      <p className="text-gray-500">Allocated</p>
                      <p className="font-medium text-gray-900">
                        {violation.details.allocatedCapacity}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Actual</p>
                      <p className="font-medium text-gray-900">
                        {violation.details.actualOccupancy}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Duration</p>
                      <p className="font-medium text-gray-900">
                        {violation.details.duration} min
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {performance.violations.total > performance.violations.recent.length && (
              <div className="mt-4 text-center">
                <Link
                  href={`/violations?contractorId=${contractorId}`}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View All Violations ({performance.violations.total})
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
