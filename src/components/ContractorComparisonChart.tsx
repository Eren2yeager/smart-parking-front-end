'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ContractorPerformance {
  contractorId: string;
  contractorName: string;
  allocatedCapacity: number;
  assignedParkingLots: number;
  violationCount: number;
  avgOccupied: number;
  avgOccupancyRate: number;
  complianceRate: number;
  totalDataPoints: number;
}

interface ContractorComparisonChartProps {
  startDate?: Date;
  endDate?: Date;
}

export default function ContractorComparisonChart({
  startDate,
  endDate,
}: ContractorComparisonChartProps) {
  const [data, setData] = useState<ContractorPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContractorPerformance = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query parameters
        const params = new URLSearchParams();

        if (startDate && endDate) {
          params.append('startDate', startDate.toISOString());
          params.append('endDate', endDate.toISOString());
        }

        const response = await fetch(`/api/analytics/contractor-performance?${params}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch contractor performance');
        }

        const result = await response.json();
        setData(result.data.contractors);
      } catch (err) {
        console.error('Error fetching contractor performance:', err);
        setError(err instanceof Error ? err.message : 'Failed to load contractor performance');
      } finally {
        setLoading(false);
      }
    };

    fetchContractorPerformance();
  }, [startDate, endDate]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Contractor Performance Comparison</h3>
        <div className="h-96 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading chart...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Contractor Performance Comparison</h3>
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500 mb-2">{error}</p>
            <p className="text-sm text-gray-500">Please try again later</p>
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Contractor Performance Comparison</h3>
        <div className="h-96 flex items-center justify-center">
          <p className="text-gray-500">No contractor performance data available</p>
        </div>
      </div>
    );
  }

  // Format data for chart
  const chartData = data.map((contractor) => ({
    name: contractor.contractorName,
    complianceRate: contractor.complianceRate,
    violations: contractor.violationCount,
    avgOccupancy: contractor.avgOccupancyRate,
    allocatedCapacity: contractor.allocatedCapacity,
  }));

  // Color coding based on compliance rate
  const getBarColor = (complianceRate: number) => {
    if (complianceRate >= 95) return '#10b981'; // green
    if (complianceRate >= 85) return '#3b82f6'; // blue
    if (complianceRate >= 70) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  // Calculate overall statistics
  const avgCompliance =
    data.reduce((sum, contractor) => sum + contractor.complianceRate, 0) / data.length;
  const totalViolations = data.reduce((sum, contractor) => sum + contractor.violationCount, 0);
  const bestPerformer = data.reduce((best, contractor) =>
    contractor.complianceRate > best.complianceRate ? contractor : best
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          Contractor Performance Comparison
        </h3>
        <p className="text-sm text-gray-600">
          Compliance rates and violation counts by contractor
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-xs text-blue-600 font-medium mb-1">Average Compliance</p>
          <p className="text-2xl font-bold text-blue-900">{avgCompliance.toFixed(1)}%</p>
          <p className="text-xs text-blue-600 mt-1">Across all contractors</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <p className="text-xs text-red-600 font-medium mb-1">Total Violations</p>
          <p className="text-2xl font-bold text-red-900">{totalViolations}</p>
          <p className="text-xs text-red-600 mt-1">In selected period</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-xs text-green-600 font-medium mb-1">Best Performer</p>
          <p className="text-lg font-bold text-green-900 truncate">{bestPerformer.contractorName}</p>
          <p className="text-xs text-green-600 mt-1">{bestPerformer.complianceRate.toFixed(1)}% compliance</p>
        </div>
      </div>

      {/* Compliance Rate Chart */}
      <div className="mb-8">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Compliance Rate (%)</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#6b7280' }}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#6b7280' }}
              domain={[0, 100]}
              label={{ value: 'Compliance Rate (%)', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px',
              }}
              formatter={(value: number | undefined, name: string | undefined) => {
                if (value === undefined) return ['N/A', name || 'Unknown'];
                if (name === 'complianceRate') {
                  return [`${value.toFixed(1)}%`, 'Compliance Rate'];
                }
                return [value, name];
              }}
            />
            <Bar dataKey="complianceRate" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.complianceRate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Violations Chart */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Violation Count</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#6b7280' }}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#6b7280' }}
              label={{ value: 'Violations', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px',
              }}
              formatter={(value: number | undefined, name: string | undefined) => {
                if (value === undefined) return ['N/A', name || 'Unknown'];
                if (name === 'violations') {
                  return [value, 'Violations'];
                }
                return [value, name];
              }}
            />
            <Bar dataKey="violations" fill="#ef4444" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-sm pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-gray-600">Excellent (≥95%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-gray-600">Good (85-94%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-500 rounded"></div>
          <span className="text-gray-600">Fair (70-84%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-gray-600">Poor (&lt;70%)</span>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contractor
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Compliance
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Violations
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Occupancy
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Allocated
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((contractor) => (
              <tr key={contractor.contractorId} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {contractor.contractorName}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      contractor.complianceRate >= 95
                        ? 'bg-green-100 text-green-800'
                        : contractor.complianceRate >= 85
                        ? 'bg-blue-100 text-blue-800'
                        : contractor.complianceRate >= 70
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {contractor.complianceRate.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {contractor.violationCount}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {contractor.avgOccupancyRate.toFixed(1)}%
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {contractor.allocatedCapacity}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
