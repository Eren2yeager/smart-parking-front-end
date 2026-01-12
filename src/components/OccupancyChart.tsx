'use client';

import { useEffect, useState } from 'react';
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
import { useIsMobile, useIsTablet } from '@/lib/responsive-utils';

interface TrendData {
  timestamp: string;
  avgOccupied: number;
  avgOccupancyRate: number;
  maxOccupied: number;
  minOccupied: number;
  totalSlots: number;
  dataPoints: number;
}

interface OccupancyChartProps {
  parkingLotId?: string;
  hours?: number;
}

export default function OccupancyChart({ parkingLotId, hours = 24 }: OccupancyChartProps) {
  const [data, setData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  // Responsive chart height
  const chartHeight = isMobile ? 200 : isTablet ? 250 : 300;

  useEffect(() => {
    const fetchOccupancyTrends = async () => {
      try {
        setLoading(true);
        setError(null);

        // Calculate date range for last N hours
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - hours * 60 * 60 * 1000);

        // Build query parameters
        const params = new URLSearchParams({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          interval: 'hour',
        });

        if (parkingLotId) {
          params.append('parkingLotId', parkingLotId);
        }

        const response = await fetch(`/api/analytics/occupancy-trends?${params}`);

        if (!response.ok) {
          throw new Error('Failed to fetch occupancy trends');
        }

        const result = await response.json();
        setData(result.data.trends);
      } catch (err) {
        console.error('Error fetching occupancy trends:', err);
        setError('Failed to load occupancy trends');
      } finally {
        setLoading(false);
      }
    };

    fetchOccupancyTrends();
  }, [parkingLotId, hours]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Occupancy Trends (Last {hours}h)</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading chart...</div>
        </div>
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Occupancy Trends (Last {hours}h)</h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500">
            {error || 'No occupancy data available for the selected period'}
          </p>
        </div>
      </div>
    );
  }

  // Format data for chart
  const chartData = data.map((item) => ({
    time: format(new Date(item.timestamp), 'HH:mm'),
    occupied: item.avgOccupied,
    capacity: item.totalSlots,
    rate: item.avgOccupancyRate,
  }));

  return (
    <div className="bg-white rounded-lg shadow p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
        <h3 className="text-base md:text-lg font-bold text-gray-900">
          Occupancy Trends (Last {hours}h)
        </h3>
        <div className="flex items-center space-x-3 md:space-x-4 text-xs md:text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span className="text-gray-600">Occupied</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-300 rounded-full mr-2"></div>
            <span className="text-gray-600">Capacity</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="time"
            stroke="#6b7280"
            style={{ fontSize: isMobile ? '10px' : '12px' }}
            tick={{ fill: '#6b7280' }}
            interval={isMobile ? 'preserveStartEnd' : 'preserveEnd'}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: isMobile ? '10px' : '12px' }}
            tick={{ fill: '#6b7280' }}
            label={
              !isMobile
                ? { value: 'Vehicles', angle: -90, position: 'insideLeft', fill: '#6b7280' }
                : undefined
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: isMobile ? '12px' : '14px',
            }}
            formatter={(value: number | undefined, name: string | undefined) => {
              if (value === undefined) return ['N/A', name || 'Unknown'];
              if (name === 'rate') {
                return [`${value.toFixed(1)}%`, 'Occupancy Rate'];
              }
              return [Math.round(value), name === 'occupied' ? 'Occupied' : 'Capacity'];
            }}
          />
          {!isMobile && (
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              formatter={(value) => {
                if (value === 'occupied') return 'Occupied';
                if (value === 'capacity') return 'Capacity';
                return value;
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="occupied"
            stroke="#3b82f6"
            strokeWidth={isMobile ? 1.5 : 2}
            dot={isMobile ? false : { fill: '#3b82f6', r: 3 }}
            activeDot={{ r: isMobile ? 4 : 5 }}
          />
          <Line
            type="monotone"
            dataKey="capacity"
            stroke="#d1d5db"
            strokeWidth={isMobile ? 1.5 : 2}
            strokeDasharray="5 5"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
