'use client';

import { useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import DashboardStats from '@/components/DashboardStats';
import ParkingLotCard from '@/components/ParkingLotCard';
import ActivityFeed from '@/components/ActivityFeed';
import AlertBanner from '@/components/AlertBanner';
import { SkeletonRectangle } from '@/components/SkeletonLoader';
import { useRouter } from 'next/navigation';

// Code-split heavy components with Next.js dynamic import
const OccupancyChart = dynamic(() => import('@/components/OccupancyChart'), {
  ssr: false,
  loading: () => <SkeletonRectangle width="100%" height="300px" />
});
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <SkeletonRectangle width="100%" height="400px" />
});
const SystemHealthIndicator = dynamic(() => import('@/components/SystemHealthIndicator'), {
  ssr: false,
  loading: () => <SkeletonRectangle width="100%" height="150px" />
});
const ContractorRanking = dynamic(() => import('@/components/ContractorRanking'), {
  ssr: false,
  loading: () => <SkeletonRectangle width="100%" height="200px" />
});

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

export default function DashboardPage() {
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchParkingLots = async () => {
    try {
      setError(null);
      const response = await fetch('/api/parking-lots?status=active&limit=50');

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

  useEffect(() => {
    fetchParkingLots();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchParkingLots, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleAlertUpdate = () => {
    // Refresh parking lots when alerts are acknowledged
    fetchParkingLots();
  };

  const handleMarkerClick = (lotId: string) => {
    router.push(`/parking-lots/${lotId}`);
  };

  // Prepare data for MapView
  const parkingLotsForMap = parkingLots.map((lot) => ({
    id: lot._id,
    name: lot.name,
    location: {
      lat: lot.location.coordinates.lat,
      lng: lot.location.coordinates.lng,
    },
    occupancy: lot.currentOccupancy?.occupied || 0,
    totalSlots: lot.totalSlots,
  }));

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-sm md:text-base text-gray-600">
          Real-time monitoring of parking lots and system activity
        </p>
      </div>

      {/* Alert Banner - Critical alerts at top */}
      <AlertBanner onAlertUpdate={handleAlertUpdate} />

      {/* Dashboard Stats with Trend Indicators */}
      <DashboardStats />

      {/* Map View - Full width on mobile, prioritized */}
      <div className="lg:hidden">
        <MapView parkingLots={parkingLotsForMap} onMarkerClick={handleMarkerClick} />
      </div>

      {/* Main Content Grid - Responsive layout */}
      {/* Desktop: 2/3 + 1/3 columns, Tablet: 2 columns, Mobile: 1 column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left Column - Charts and Map (Desktop) */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Map View - Desktop only */}
          <div className="hidden lg:block">
            <MapView parkingLots={parkingLotsForMap} onMarkerClick={handleMarkerClick} />
          </div>

          {/* Occupancy Chart */}
          <OccupancyChart hours={24} />

          {/* Contractor Ranking - Mobile priority */}
          <div className="lg:hidden">
            <ContractorRanking />
          </div>
        </div>

        {/* Right Column - Activity Feed and System Health */}
        <div className="lg:col-span-1 space-y-4 md:space-y-6">
          {/* System Health Indicator */}
          <SystemHealthIndicator />

          {/* Activity Feed */}
          <ActivityFeed limit={10} />

          {/* Contractor Ranking - Desktop */}
          <div className="hidden lg:block">
            <ContractorRanking />
          </div>
        </div>
      </div>

      {/* Parking Lots Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-bold text-gray-900">Parking Lots</h2>
          {!loading && parkingLots.length > 0 && (
            <span className="text-xs md:text-sm text-gray-600">
              {parkingLots.length} active lot{parkingLots.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-4 md:p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 md:p-6 text-center">
            <p className="text-sm md:text-base text-red-800">{error}</p>
            <button
              onClick={fetchParkingLots}
              className="mt-4 min-h-[44px] px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        ) : parkingLots.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 md:p-12 text-center">
            <p className="text-sm md:text-base text-gray-600 mb-2">No active parking lots found</p>
            <p className="text-xs md:text-sm text-gray-500">
              Create a parking lot to start monitoring
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {parkingLots.map((lot) => (
              <ParkingLotCard key={lot._id} lot={lot} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
