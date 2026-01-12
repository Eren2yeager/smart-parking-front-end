'use client';

import { useEffect, useState } from 'react';
import { LayoutDashboard, ParkingSquare, Users, AlertTriangle } from 'lucide-react';
import TrendIndicator from './TrendIndicator';

interface DashboardData {
  totalParkingLots: number;
  totalCapacity: number;
  currentOccupancy: number;
  occupancyRate: number;
  activeViolations: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: {
    current: number;
    previous: number;
    inverse?: boolean;
  };
}

function StatCard({ title, value, subtitle, icon, color, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <div className="flex items-center gap-3">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {trend && (
              <TrendIndicator
                current={trend.current}
                previous={trend.previous}
                format="percentage"
                inverse={trend.inverse}
              />
            )}
          </div>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
      </div>
    </div>
  );
}

export default function DashboardStats() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [previousData, setPreviousData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/analytics/dashboard');
        
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        
        const result = await response.json();
        
        // Store previous data before updating
        if (data) {
          setPreviousData(data);
        }
        
        setData(result.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error || 'Failed to load statistics'}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Parking Lots"
        value={data.totalParkingLots}
        icon={<LayoutDashboard className="w-6 h-6 text-blue-600" />}
        color="bg-blue-100"
        trend={
          previousData
            ? {
                current: data.totalParkingLots,
                previous: previousData.totalParkingLots,
              }
            : undefined
        }
      />
      
      <StatCard
        title="Total Capacity"
        value={data.totalCapacity}
        subtitle="parking slots"
        icon={<ParkingSquare className="w-6 h-6 text-green-600" />}
        color="bg-green-100"
        trend={
          previousData
            ? {
                current: data.totalCapacity,
                previous: previousData.totalCapacity,
              }
            : undefined
        }
      />
      
      <StatCard
        title="Current Occupancy"
        value={data.currentOccupancy}
        subtitle={`${data.occupancyRate.toFixed(1)}% occupied`}
        icon={<Users className="w-6 h-6 text-purple-600" />}
        color="bg-purple-100"
        trend={
          previousData
            ? {
                current: data.currentOccupancy,
                previous: previousData.currentOccupancy,
              }
            : undefined
        }
      />
      
      <StatCard
        title="Active Violations"
        value={data.activeViolations}
        subtitle={data.activeViolations > 0 ? 'requires attention' : 'all clear'}
        icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
        color="bg-red-100"
        trend={
          previousData
            ? {
                current: data.activeViolations,
                previous: previousData.activeViolations,
                inverse: true, // Lower violations is better
              }
            : undefined
        }
      />
    </div>
  );
}
