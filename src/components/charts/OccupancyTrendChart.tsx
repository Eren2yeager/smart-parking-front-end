'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/shadcnComponents/card';

interface TrendData {
  timestamp: string;
  avgOccupied: number;
  avgOccupancyRate: number;
  maxOccupied: number;
  minOccupied: number;
  totalSlots: number;
  dataPoints: number;
}

interface OccupancyTrendChartProps {
  startDate: Date;
  endDate: Date;
  parkingLotId?: string;
  interval?: 'hour' | 'day';
}

export default function OccupancyTrendChart({
  startDate,
  endDate,
  parkingLotId,
  interval = 'hour',
}: OccupancyTrendChartProps) {
  const [data, setData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOccupancyTrends = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query parameters
        const params = new URLSearchParams({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          interval,
        });

        if (parkingLotId) {
          params.append('parkingLotId', parkingLotId);
        }

        const response = await fetch(`/api/analytics/occupancy-trends?${params}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch occupancy trends');
        }

        const result = await response.json();
        setData(result.data.trends);
      } catch (err) {
        console.error('Error fetching occupancy trends:', err);
        setError(err instanceof Error ? err.message : 'Failed to load occupancy trends');
      } finally {
        setLoading(false);
      }
    };

    fetchOccupancyTrends();
  }, [startDate, endDate, parkingLotId, interval]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-[#e5e7eb] mb-4">Occupancy Trends</h3>
          <div className="h-96 flex items-center justify-center">
            <div className="animate-pulse text-gray-400 dark:text-[#71717a]">Loading chart...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-[#e5e7eb] mb-4">Occupancy Trends</h3>
          <div className="h-96 flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-500 dark:text-red-400 mb-2">{error}</p>
              <p className="text-sm text-gray-500 dark:text-[#71717a]">Please try adjusting your filters</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-[#e5e7eb] mb-4">Occupancy Trends</h3>
          <div className="h-96 flex items-center justify-center">
            <p className="text-gray-500 dark:text-[#71717a]">No occupancy data available for the selected period</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for chart
  const chartData = data.map((item) => ({
    time:
      interval === 'hour'
        ? format(new Date(item.timestamp), 'MMM dd HH:mm')
        : format(new Date(item.timestamp), 'MMM dd'),
    avgOccupied: item.avgOccupied,
    maxOccupied: item.maxOccupied,
    minOccupied: item.minOccupied,
    occupancyRate: item.avgOccupancyRate,
    capacity: item.totalSlots,
  }));

  // Calculate statistics
  const avgOccupancy =
    chartData.reduce((sum, item) => sum + item.avgOccupied, 0) / chartData.length;
  const peakOccupancy = Math.max(...chartData.map((item) => item.maxOccupied));
  const avgOccupancyRate =
    chartData.reduce((sum, item) => sum + item.occupancyRate, 0) / chartData.length;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-[#e5e7eb] mb-2">Occupancy Trends</h3>
          <p className="text-sm text-gray-600 dark:text-[#9ca3af]">
            {interval === 'hour' ? 'Hourly' : 'Daily'} occupancy trends from{' '}
            {format(startDate, 'MMM dd, yyyy')} to {format(endDate, 'MMM dd, yyyy')}
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Average Occupancy</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{avgOccupancy.toFixed(1)}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{avgOccupancyRate.toFixed(1)}% capacity</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4 border border-purple-100 dark:border-purple-800">
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">Peak Occupancy</p>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">{peakOccupancy}</p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Maximum vehicles</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 border border-green-100 dark:border-green-800">
            <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Data Points</p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-300">{chartData.length}</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">Measurements</p>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis
              dataKey="time"
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9ca3af' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9ca3af' }}
              label={{ value: 'Vehicles', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '12px',
                color: '#e5e7eb'
              }}
              formatter={(value: any, name: any) => {
                if (value === undefined) return ['N/A', name || 'Unknown'];
                if (name === 'occupancyRate') {
                  return [`${Number(value).toFixed(1)}%`, 'Occupancy Rate'];
                }
                if (name === 'avgOccupied') {
                  return [Number(value).toFixed(1), 'Avg Occupied'];
                }
                if (name === 'maxOccupied') {
                  return [Math.round(Number(value)), 'Max Occupied'];
                }
                if (name === 'minOccupied') {
                  return [Math.round(Number(value)), 'Min Occupied'];
                }
                if (name === 'capacity') {
                  return [Math.round(Number(value)), 'Total Capacity'];
                }
                return [Math.round(Number(value)), name];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
              formatter={(value) => {
                if (value === 'avgOccupied') return 'Average Occupied';
                if (value === 'maxOccupied') return 'Maximum Occupied';
                if (value === 'minOccupied') return 'Minimum Occupied';
                if (value === 'capacity') return 'Total Capacity';
                return value;
              }}
            />
            <Line
              type="monotone"
              dataKey="avgOccupied"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: '#3b82f6', r: 3 }}
              activeDot={{ r: 5 }}
              name="avgOccupied"
            />
            <Line
              type="monotone"
              dataKey="maxOccupied"
              stroke="#8b5cf6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="maxOccupied"
            />
            <Line
              type="monotone"
              dataKey="minOccupied"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={false}
              name="minOccupied"
            />
            <Line
              type="monotone"
              dataKey="capacity"
              stroke="#d1d5db"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="capacity"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
