'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';

interface OccupancyTrend {
  date: string;
  avgOccupancy: number;
  avgOccupancyRate: number;
  totalSlots: number;
}

interface PerformanceChartProps {
  occupancyTrends: OccupancyTrend[];
  allocatedCapacity: number;
}

export default function PerformanceChart({
  occupancyTrends,
  allocatedCapacity,
}: PerformanceChartProps) {
  if (!occupancyTrends || occupancyTrends.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-12 text-center">
        <p className="text-gray-500">No occupancy trend data available for the selected period</p>
      </div>
    );
  }

  // Format data for chart
  const chartData = occupancyTrends.map((item) => ({
    date: format(new Date(item.date), 'MMM dd'),
    occupancy: item.avgOccupancy,
    allocated: allocatedCapacity,
    rate: item.avgOccupancyRate * 100, // Convert to percentage
  }));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Occupancy Trends</h3>
        <p className="text-sm text-gray-600">
          Daily average occupancy compared to allocated capacity
        </p>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#6b7280' }}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#6b7280' }}
            label={{
              value: 'Vehicles',
              angle: -90,
              position: 'insideLeft',
              fill: '#6b7280',
            }}
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
              if (name === 'rate') {
                return [`${value.toFixed(1)}%`, 'Occupancy Rate'];
              }
              if (name === 'occupancy') {
                return [Math.round(value), 'Avg Occupancy'];
              }
              if (name === 'allocated') {
                return [Math.round(value), 'Allocated Capacity'];
              }
              return [Math.round(value), name];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
            formatter={(value) => {
              if (value === 'occupancy') return 'Avg Occupancy';
              if (value === 'allocated') return 'Allocated Capacity';
              if (value === 'rate') return 'Occupancy Rate';
              return value;
            }}
          />
          
          {/* Reference line for allocated capacity */}
          <ReferenceLine
            y={allocatedCapacity}
            stroke="#ef4444"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{
              value: 'Capacity Limit',
              position: 'right',
              fill: '#ef4444',
              fontSize: 12,
            }}
          />
          
          {/* Occupancy line */}
          <Line
            type="monotone"
            dataKey="occupancy"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
            name="occupancy"
          />
          
          {/* Allocated capacity line */}
          <Line
            type="monotone"
            dataKey="allocated"
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="allocated"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend explanation */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-blue-500"></div>
          <span className="text-gray-600">Average Occupancy</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-red-500 border-dashed"></div>
          <span className="text-gray-600">Allocated Capacity</span>
        </div>
      </div>

      {/* Compliance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center p-3 bg-gray-50 rounded">
          <p className="text-xs text-gray-500 mb-1">Average Occupancy</p>
          <p className="text-lg font-bold text-gray-900">
            {(
              chartData.reduce((sum, item) => sum + item.occupancy, 0) / chartData.length
            ).toFixed(1)}
          </p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded">
          <p className="text-xs text-gray-500 mb-1">Peak Occupancy</p>
          <p className="text-lg font-bold text-gray-900">
            {Math.max(...chartData.map((item) => item.occupancy)).toFixed(1)}
          </p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded">
          <p className="text-xs text-gray-500 mb-1">Days Over Capacity</p>
          <p className="text-lg font-bold text-red-600">
            {chartData.filter((item) => item.occupancy > allocatedCapacity).length}
          </p>
        </div>
      </div>
    </div>
  );
}
