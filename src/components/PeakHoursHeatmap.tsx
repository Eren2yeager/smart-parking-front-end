'use client';

import { useState, useEffect } from 'react';

interface HeatmapData {
  dayOfWeek: number;
  hour: number;
  avgOccupied: number;
  avgOccupancyRate: number;
  maxOccupied: number;
  minOccupied: number;
  dataPoints: number;
}

interface PeakHoursHeatmapProps {
  startDate: Date;
  endDate: Date;
  parkingLotId?: string;
}

export default function PeakHoursHeatmap({
  startDate,
  endDate,
  parkingLotId,
}: PeakHoursHeatmapProps) {
  const [data, setData] = useState<{
    heatmap: HeatmapData[];
    matrix: number[][];
    dayLabels: string[];
    hourLabels: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPeakHours = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query parameters
        const params = new URLSearchParams({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

        if (parkingLotId) {
          params.append('parkingLotId', parkingLotId);
        }

        const response = await fetch(`/api/analytics/peak-hours?${params}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch peak hours data');
        }

        const result = await response.json();
        setData(result.data);
      } catch (err) {
        console.error('Error fetching peak hours:', err);
        setError(err instanceof Error ? err.message : 'Failed to load peak hours data');
      } finally {
        setLoading(false);
      }
    };

    fetchPeakHours();
  }, [startDate, endDate, parkingLotId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Peak Hours Analysis</h3>
        <div className="h-96 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading heatmap...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Peak Hours Analysis</h3>
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500 mb-2">{error}</p>
            <p className="text-sm text-gray-500">Please try adjusting your filters</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.heatmap.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Peak Hours Analysis</h3>
        <div className="h-96 flex items-center justify-center">
          <p className="text-gray-500">No peak hours data available for the selected period</p>
        </div>
      </div>
    );
  }

  // Get color based on occupancy rate
  const getHeatmapColor = (rate: number) => {
    if (rate === 0) return 'bg-gray-100';
    if (rate < 20) return 'bg-green-100';
    if (rate < 40) return 'bg-green-300';
    if (rate < 60) return 'bg-yellow-300';
    if (rate < 80) return 'bg-orange-400';
    if (rate < 90) return 'bg-red-400';
    return 'bg-red-600';
  };

  // Get text color based on occupancy rate
  const getTextColor = (rate: number) => {
    if (rate >= 80) return 'text-white';
    return 'text-gray-900';
  };

  // Find peak hour
  const peakData = data.heatmap.reduce((max, item) =>
    item.avgOccupancyRate > max.avgOccupancyRate ? item : max
  );
  const peakDay = data.dayLabels[peakData.dayOfWeek - 1];
  const peakHour = data.hourLabels[peakData.hour];

  // Calculate average occupancy by day
  const avgByDay = data.dayLabels.map((day, dayIndex) => {
    const dayData = data.matrix[dayIndex].filter((rate) => rate > 0);
    const avg = dayData.length > 0 ? dayData.reduce((sum, rate) => sum + rate, 0) / dayData.length : 0;
    return { day, avg };
  });

  // Calculate average occupancy by hour
  const avgByHour = data.hourLabels.map((hour, hourIndex) => {
    const hourData = data.matrix.map((dayRow) => dayRow[hourIndex]).filter((rate) => rate > 0);
    const avg = hourData.length > 0 ? hourData.reduce((sum, rate) => sum + rate, 0) / hourData.length : 0;
    return { hour, avg };
  });

  const busiestDay = avgByDay.reduce((max, item) => (item.avg > max.avg ? item : max));
  const busiestHour = avgByHour.reduce((max, item) => (item.avg > max.avg ? item : max));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Peak Hours Analysis</h3>
        <p className="text-sm text-gray-600">
          Occupancy heatmap by day of week and hour of day
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 rounded-lg p-4">
          <p className="text-xs text-red-600 font-medium mb-1">Peak Time</p>
          <p className="text-lg font-bold text-red-900">
            {peakDay} at {peakHour}
          </p>
          <p className="text-xs text-red-600 mt-1">{peakData.avgOccupancyRate.toFixed(1)}% occupancy</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-xs text-blue-600 font-medium mb-1">Busiest Day</p>
          <p className="text-lg font-bold text-blue-900">{busiestDay.day}</p>
          <p className="text-xs text-blue-600 mt-1">{busiestDay.avg.toFixed(1)}% avg occupancy</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <p className="text-xs text-purple-600 font-medium mb-1">Busiest Hour</p>
          <p className="text-lg font-bold text-purple-900">{busiestHour.hour}</p>
          <p className="text-xs text-purple-600 mt-1">{busiestHour.avg.toFixed(1)}% avg occupancy</p>
        </div>
      </div>

      {/* Heatmap */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 sticky left-0 z-10">
                  Day / Hour
                </th>
                {data.hourLabels.map((hour, index) => (
                  <th
                    key={index}
                    className="border border-gray-300 bg-gray-50 px-2 py-2 text-xs font-medium text-gray-700 min-w-[60px]"
                  >
                    {hour}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.dayLabels.map((day, dayIndex) => (
                <tr key={dayIndex}>
                  <td className="border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 sticky left-0 z-10 whitespace-nowrap">
                    {day}
                  </td>
                  {data.matrix[dayIndex].map((rate, hourIndex) => (
                    <td
                      key={hourIndex}
                      className={`border border-gray-300 px-2 py-3 text-center text-xs font-medium ${getHeatmapColor(
                        rate
                      )} ${getTextColor(rate)} transition-colors hover:opacity-80 cursor-pointer`}
                      title={`${day} at ${data.hourLabels[hourIndex]}: ${rate.toFixed(1)}% occupancy`}
                    >
                      {rate > 0 ? rate.toFixed(0) : '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs">
        <span className="text-gray-600 font-medium">Occupancy Rate:</span>
        <div className="flex items-center gap-1">
          <div className="w-6 h-4 bg-gray-100 border border-gray-300 rounded"></div>
          <span className="text-gray-600">No Data</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-4 bg-green-100 border border-gray-300 rounded"></div>
          <span className="text-gray-600">0-20%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-4 bg-green-300 border border-gray-300 rounded"></div>
          <span className="text-gray-600">20-40%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-4 bg-yellow-300 border border-gray-300 rounded"></div>
          <span className="text-gray-600">40-60%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-4 bg-orange-400 border border-gray-300 rounded"></div>
          <span className="text-gray-600">60-80%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-4 bg-red-400 border border-gray-300 rounded"></div>
          <span className="text-gray-600">80-90%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-4 bg-red-600 border border-gray-300 rounded"></div>
          <span className="text-gray-600">90-100%</span>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Insights</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            • Peak usage occurs on <strong>{peakDay}</strong> at <strong>{peakHour}</strong> with{' '}
            <strong>{peakData.avgOccupancyRate.toFixed(1)}%</strong> occupancy
          </li>
          <li>
            • <strong>{busiestDay.day}</strong> is the busiest day with an average occupancy of{' '}
            <strong>{busiestDay.avg.toFixed(1)}%</strong>
          </li>
          <li>
            • <strong>{busiestHour.hour}</strong> is the busiest hour with an average occupancy of{' '}
            <strong>{busiestHour.avg.toFixed(1)}%</strong>
          </li>
        </ul>
      </div>
    </div>
  );
}
