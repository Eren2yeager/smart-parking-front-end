'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Filter, Calendar, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import ViolationCard from '@/components/ViolationCard';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Violation {
  _id: string;
  contractorId: {
    _id: string;
    name: string;
    email: string;
  };
  parkingLotId: {
    _id: string;
    name: string;
    location?: {
      address: string;
    };
  };
  violationType: 'overparking' | 'unauthorized_vehicle' | 'capacity_breach';
  timestamp: string;
  details: {
    allocatedCapacity: number;
    actualOccupancy: number;
    excessVehicles: number;
    duration: number;
  };
  penalty: number;
  status: 'pending' | 'acknowledged' | 'resolved';
  resolvedAt?: string;
  resolvedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  notes?: string;
  createdAt: string;
}

interface Contractor {
  _id: string;
  name: string;
}

interface TrendData {
  date: string;
  violations: number;
}

export default function ViolationsPage() {
  const { data: session } = useSession();
  const [violations, setViolations] = useState<Violation[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'acknowledged' | 'resolved'>('all');
  const [contractorFilter, setContractorFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Trend data
  const [trendData, setTrendData] = useState<TrendData[]>([]);

  const fetchContractors = async () => {
    try {
      const response = await fetch('/api/contractors');
      if (!response.ok) {
        throw new Error('Failed to fetch contractors');
      }
      const result = await response.json();
      setContractors(result.data || []);
    } catch (err) {
      console.error('Error fetching contractors:', err);
    }
  };

  const fetchViolations = async () => {
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

      // Date range
      let startDate: Date;
      let endDate: Date = new Date();

      if (dateRange === 'custom' && customStartDate && customEndDate) {
        startDate = startOfDay(new Date(customStartDate));
        endDate = endOfDay(new Date(customEndDate));
      } else {
        const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
        startDate = subDays(endDate, days);
      }

      params.append('startDate', startDate.toISOString());
      params.append('endDate', endDate.toISOString());
      params.append('limit', '100');

      const response = await fetch(`/api/violations?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch violations');
      }

      const result = await response.json();
      setViolations(result.data || []);

      // Calculate trend data
      calculateTrendData(result.data || [], startDate, endDate);
    } catch (err) {
      console.error('Error fetching violations:', err);
      setError('Failed to load violations');
    } finally {
      setLoading(false);
    }
  };

  const calculateTrendData = (violationsData: Violation[], startDate: Date, endDate: Date) => {
    // Group violations by date
    const violationsByDate: { [key: string]: number } = {};
    
    violationsData.forEach((violation) => {
      const date = format(new Date(violation.timestamp), 'yyyy-MM-dd');
      violationsByDate[date] = (violationsByDate[date] || 0) + 1;
    });

    // Create trend data for all dates in range
    const trend: TrendData[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      trend.push({
        date: format(currentDate, 'MMM dd'),
        violations: violationsByDate[dateStr] || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    setTrendData(trend);
  };

  useEffect(() => {
    fetchContractors();
  }, []);

  useEffect(() => {
    fetchViolations();
  }, [statusFilter, contractorFilter, dateRange, customStartDate, customEndDate]);

  const handleViolationUpdate = () => {
    fetchViolations();
  };

  // Calculate statistics
  const stats = {
    total: violations.length,
    pending: violations.filter((v) => v.status === 'pending').length,
    acknowledged: violations.filter((v) => v.status === 'acknowledged').length,
    resolved: violations.filter((v) => v.status === 'resolved').length,
    totalPenalty: violations.reduce((sum, v) => sum + v.penalty, 0),
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Violations</h1>
        <p className="text-gray-600">Monitor and manage contractor violations</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-red-600">{stats.pending}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Acknowledged</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.acknowledged}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Penalty</p>
              <p className="text-2xl font-bold text-gray-900">₹{stats.totalPenalty}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Violation Trend Chart */}
      {trendData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Violation Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="violations"
                stroke="#ef4444"
                strokeWidth={2}
                name="Violations"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-bold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Contractor Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contractor</label>
            <select
              value={contractorFilter}
              onChange={(e) => setContractorFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Contractors</option>
              {contractors.map((contractor) => (
                <option key={contractor._id} value={contractor._id}>
                  {contractor.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Range */}
          {dateRange === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}
        </div>

        {/* Results Count */}
        {!loading && (
          <div className="mt-4 text-sm text-gray-600">
            Showing {violations.length} violation{violations.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Violations List */}
      {loading ? (
        <div className="space-y-4">
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
            onClick={fetchViolations}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      ) : violations.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">No violations found</p>
          <p className="text-sm text-gray-500">
            {statusFilter !== 'all' || contractorFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'No violations have been recorded in this time period'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {violations.map((violation) => (
            <ViolationCard
              key={violation._id}
              violation={violation}
              onUpdate={handleViolationUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
