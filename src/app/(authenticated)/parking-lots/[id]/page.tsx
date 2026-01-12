'use client';

import { useEffect, useState, lazy, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Users,
  Calendar,
  Camera,
  Activity,
  AlertCircle,
  Video,
  AlertTriangle,
  Image as ImageIcon,
  Edit,
} from 'lucide-react';
import { SkeletonRectangle } from '@/components/SkeletonLoader';
import { formatDuration } from '@/lib/format-duration';

// Code-split heavy components
const SlotGrid = lazy(() => import('@/components/SlotGrid'));
const DateRangePicker = lazy(() => import('@/components/DateRangePicker'));

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
  contractorId: {
    _id: string;
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    status: string;
    contractDetails: {
      startDate: string;
      endDate: string;
      allocatedCapacity: number;
      penaltyPerViolation: number;
    };
  };
  gateCamera: {
    id: string;
    status: 'active' | 'inactive';
    lastSeen: string;
  };
  lotCamera: {
    id: string;
    status: 'active' | 'inactive';
    lastSeen: string;
  };
  slots: Array<{
    slotId: number;
    bbox: { x1: number; y1: number; x2: number; y2: number };
    status: 'occupied' | 'empty';
    lastUpdated: string;
  }>;
  currentOccupancy?: {
    occupied: number;
    empty: number;
    occupancyRate: number;
    lastUpdated: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface VehicleRecord {
  _id: string;
  plateNumber: string;
  entry: {
    timestamp: string;
    gateId: string;
    confidence: number;
    image?: string;
  };
  exit?: {
    timestamp: string;
    gateId: string;
    confidence: number;
    image?: string;
  };
  status: 'inside' | 'exited';
  currentDuration?: number;
  duration?: number;
}

interface CapacityData {
  timestamp: string;
  avgOccupied: number;
  maxOccupied: number;
  minOccupied: number;
  avgOccupancyRate: number;
  totalSlots: number;
}

export default function ParkingLotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const id = params.id as string;
  const isAdmin = session?.user?.role === 'admin';

  const [parkingLot, setParkingLot] = useState<ParkingLot | null>(null);
  const [currentVehicles, setCurrentVehicles] = useState<VehicleRecord[]>([]);
  const [recentActivity, setRecentActivity] = useState<VehicleRecord[]>([]);
  const [capacityHistory, setCapacityHistory] = useState<CapacityData[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Time range selector for capacity chart
  const [capacityTimeRange, setCapacityTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  
  // Date range filter for entry/exit log
  const [activityStartDate, setActivityStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  });
  const [activityEndDate, setActivityEndDate] = useState(new Date());
  const [showActivityDatePicker, setShowActivityDatePicker] = useState(false);

  const fetchParkingLotDetails = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/parking-lots/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Parking lot not found');
        }
        throw new Error('Failed to fetch parking lot details');
      }

      const result = await response.json();
      setParkingLot(result.data);
    } catch (err: any) {
      console.error('Error fetching parking lot:', err);
      setError(err.message || 'Failed to load parking lot details');
    }
  };

  const fetchCurrentVehicles = async () => {
    try {
      const response = await fetch(`/api/records/current?parkingLotId=${id}`);
      if (response.ok) {
        const result = await response.json();
        setCurrentVehicles(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching current vehicles:', err);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await fetch(
        `/api/records?parkingLotId=${id}&startDate=${activityStartDate.toISOString()}&endDate=${activityEndDate.toISOString()}&limit=50`
      );
      if (response.ok) {
        const result = await response.json();
        setRecentActivity(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching recent activity:', err);
    }
  };

  const fetchCapacityHistory = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      // Set date range based on selected time range
      switch (capacityTimeRange) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
      }

      const response = await fetch(
        `/api/capacity/history?parkingLotId=${id}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&interval=hourly`
      );

      if (response.ok) {
        const result = await response.json();
        setCapacityHistory(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching capacity history:', err);
    }
  };

  const fetchActiveAlerts = async () => {
    try {
      const response = await fetch(`/api/alerts?parkingLotId=${id}&status=active&limit=10`);
      if (response.ok) {
        const result = await response.json();
        setActiveAlerts(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchParkingLotDetails(),
        fetchCurrentVehicles(),
        fetchRecentActivity(),
        fetchCapacityHistory(),
        fetchActiveAlerts(),
      ]);
      setLoading(false);
    };

    loadData();

    // Poll for updates every 10 seconds (more responsive)
    const interval = setInterval(() => {
      fetchParkingLotDetails();
      fetchCurrentVehicles();
      fetchRecentActivity();
      fetchActiveAlerts();
    }, 10000); // Changed from 30000 to 10000 (10 seconds)

    return () => clearInterval(interval);
  }, [id, activityStartDate, activityEndDate]);

  // Refetch capacity history when time range changes
  useEffect(() => {
    if (parkingLot) {
      fetchCapacityHistory();
    }
  }, [capacityTimeRange]);

  const getCameraStatusColor = (status: string, lastSeen: string) => {
    if (status === 'inactive') return 'bg-gray-400';

    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / 60000;

    if (diffMinutes > 5) return 'bg-red-500';
    return 'bg-green-500';
  };

  const isCameraOffline = (status: string, lastSeen: string) => {
    if (status === 'inactive') return true;
    
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / 60000;
    
    return diffMinutes > 5;
  };

  const formatLastSeen = (lastSeen: string) => {
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / 60000);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const handleActivityDateRangeChange = (start: Date, end: Date) => {
    setActivityStartDate(start);
    setActivityEndDate(end);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow p-6 h-64"></div>
              <div className="bg-white rounded-lg shadow p-6 h-96"></div>
            </div>
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6 h-48"></div>
              <div className="bg-white rounded-lg shadow p-6 h-64"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !parkingLot) {
    return (
      <div className="space-y-6">
        <Link
          href="/parking-lots"
          className="inline-flex items-center text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Parking Lots
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-12 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-800 text-lg mb-2">{error || 'Parking lot not found'}</p>
          <button
            onClick={() => router.push('/parking-lots')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Go to Parking Lots
          </button>
        </div>
      </div>
    );
  }

  const occupancyRate = parkingLot.currentOccupancy?.occupancyRate || 0;
  const occupied = parkingLot.currentOccupancy?.occupied || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/parking-lots"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Parking Lots
        </Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{parkingLot.name}</h1>
            <div className="flex items-center text-gray-600">
              <MapPin className="w-4 h-4 mr-2" />
              <span>{parkingLot.location.address}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/parking-lots/${id}/live`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Video className="w-4 h-4" />
              View Live Feed
            </Link>
            {isAdmin && (
              <Link
                href={`/parking-lots/${id}/edit`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
              >
                <Edit className="w-4 h-4" />
                Edit
              </Link>
            )}
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                parkingLot.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {parkingLot.status}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Alerts */}
          {activeAlerts.length > 0 && (
            <div className="space-y-3">
              {activeAlerts.map((alert) => (
                <div
                  key={alert._id}
                  className={`rounded-lg shadow p-4 border-l-4 ${
                    alert.severity === 'critical'
                      ? 'bg-red-50 border-red-500'
                      : alert.severity === 'warning'
                      ? 'bg-yellow-50 border-yellow-500'
                      : 'bg-blue-50 border-blue-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {alert.severity === 'critical' ? (
                        <AlertCircle className="w-6 h-6 text-red-600" />
                      ) : alert.severity === 'warning' ? (
                        <AlertTriangle className="w-6 h-6 text-yellow-600" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3
                            className={`font-bold text-lg ${
                              alert.severity === 'critical'
                                ? 'text-red-900'
                                : alert.severity === 'warning'
                                ? 'text-yellow-900'
                                : 'text-blue-900'
                            }`}
                          >
                            {alert.title}
                          </h3>
                          <p
                            className={`text-sm mt-1 ${
                              alert.severity === 'critical'
                                ? 'text-red-800'
                                : alert.severity === 'warning'
                                ? 'text-yellow-800'
                                : 'text-blue-800'
                            }`}
                          >
                            {alert.message}
                          </p>
                          {alert.type === 'overparking' && alert.metadata && (
                            <div className="mt-2 text-sm font-semibold text-red-900">
                              <p>
                                Contractor: {alert.contractorId?.name || 'Unknown'}
                              </p>
                              <p>
                                Extra Vehicles: {alert.metadata.extraVehicles}
                              </p>
                              <p>
                                Current: {alert.metadata.occupied}/{alert.metadata.totalSlots}
                              </p>
                            </div>
                          )}
                        </div>
                        <span
                          className={`flex-shrink-0 px-2 py-1 text-xs font-bold rounded uppercase ${
                            alert.severity === 'critical'
                              ? 'bg-red-200 text-red-900'
                              : alert.severity === 'warning'
                              ? 'bg-yellow-200 text-yellow-900'
                              : 'bg-blue-200 text-blue-900'
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Slot Grid */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Parking Slots</h2>
              <p className="text-sm text-gray-600 mt-1">
                {occupied} / {parkingLot.totalSlots} occupied ({(occupancyRate * 100).toFixed(1)}%)
              </p>
            </div>
            <div className="p-6">
              <Suspense fallback={<SkeletonRectangle width="100%" height="300px" />}>
                <SlotGrid slots={parkingLot.slots} totalSlots={parkingLot.totalSlots} />
              </Suspense>
            </div>
          </div>

          {/* Capacity Chart */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Capacity Trend</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCapacityTimeRange('24h')}
                    className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                      capacityTimeRange === '24h'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    24h
                  </button>
                  <button
                    onClick={() => setCapacityTimeRange('7d')}
                    className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                      capacityTimeRange === '7d'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    7d
                  </button>
                  <button
                    onClick={() => setCapacityTimeRange('30d')}
                    className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                      capacityTimeRange === '30d'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    30d
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              {capacityHistory.length > 0 ? (
                <div className="space-y-2">
                  {capacityHistory.slice(0, 10).map((data, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        {new Date(data.timestamp).toLocaleString()}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="text-gray-900 font-medium">
                          Avg: {data.avgOccupied.toFixed(0)} / {data.totalSlots}
                        </span>
                        <span className="text-gray-600">
                          ({(data.avgOccupancyRate * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No capacity data available</p>
              )}
            </div>
          </div>

          {/* Entry/Exit Activity Log */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Entry/Exit Log</h2>
                <button
                  onClick={() => setShowActivityDatePicker(!showActivityDatePicker)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {showActivityDatePicker ? 'Hide Filter' : 'Filter by Date'}
                </button>
              </div>
              {showActivityDatePicker && (
                <div className="mt-4">
                  <Suspense fallback={<SkeletonRectangle width="100%" height="80px" />}>
                    <DateRangePicker
                      startDate={activityStartDate}
                      endDate={activityEndDate}
                      onDateRangeChange={handleActivityDateRangeChange}
                    />
                  </Suspense>
                </div>
              )}
            </div>
            <div className="p-6">
              {recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((record) => (
                    <div
                      key={record._id}
                      className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg"
                    >
                      {/* Vehicle Image if available */}
                      {(record.entry.image || record.exit?.image) && (
                        <div className="flex-shrink-0">
                          <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                            {record.status === 'inside' && record.entry.image ? (
                              <img
                                src={record.entry.image}
                                loading="lazy"
                                alt={`Vehicle ${record.plateNumber}`}
                                className="w-full h-full object-cover"
                              />
                            ) : record.exit?.image ? (
                              <img
                                src={record.exit.image}
                                loading="lazy"
                                alt={`Vehicle ${record.plateNumber}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{record.plateNumber}</p>
                        <p className="text-sm text-gray-600">
                          {record.status === 'inside' ? 'Entered' : 'Exited'} at{' '}
                          {new Date(
                            record.status === 'inside'
                              ? record.entry.timestamp
                              : record.exit?.timestamp || record.entry.timestamp
                          ).toLocaleString()}
                        </p>
                        {record.status === 'exited' && record.duration && (
                          <p className="text-xs text-gray-500 mt-1">
                            Duration: {formatDuration(record.duration)}
                          </p>
                        )}
                      </div>
                      
                      <div
                        className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
                          record.status === 'inside'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {record.status}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No recent activity</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Contractor Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Contractor</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium text-gray-900">{parkingLot.contractorId.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Contact Person</p>
                <p className="font-medium text-gray-900">
                  {parkingLot.contractorId.contactPerson}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium text-gray-900">{parkingLot.contractorId.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Allocated Capacity</p>
                <p className="font-medium text-gray-900">
                  {parkingLot.contractorId.contractDetails.allocatedCapacity} vehicles
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Contract Period</p>
                <p className="font-medium text-gray-900">
                  {new Date(
                    parkingLot.contractorId.contractDetails.startDate
                  ).toLocaleDateString()}{' '}
                  -{' '}
                  {new Date(
                    parkingLot.contractorId.contractDetails.endDate
                  ).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Camera Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Camera Health</h3>
            <div className="space-y-4">
              {/* Gate Camera */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Camera className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">Gate Camera</p>
                      <p className="text-xs text-gray-500">{parkingLot.gateCamera.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCameraOffline(parkingLot.gateCamera.status, parkingLot.gateCamera.lastSeen) && (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                    <div
                      className={`w-3 h-3 rounded-full ${getCameraStatusColor(
                        parkingLot.gateCamera.status,
                        parkingLot.gateCamera.lastSeen
                      )}`}
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-600">
                  <p>Status: <span className={`font-medium ${
                    isCameraOffline(parkingLot.gateCamera.status, parkingLot.gateCamera.lastSeen)
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}>
                    {isCameraOffline(parkingLot.gateCamera.status, parkingLot.gateCamera.lastSeen)
                      ? 'Offline'
                      : 'Online'}
                  </span></p>
                  <p>Last seen: {formatLastSeen(parkingLot.gateCamera.lastSeen)}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(parkingLot.gateCamera.lastSeen).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Lot Camera */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Camera className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">Lot Camera</p>
                      <p className="text-xs text-gray-500">{parkingLot.lotCamera.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCameraOffline(parkingLot.lotCamera.status, parkingLot.lotCamera.lastSeen) && (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                    <div
                      className={`w-3 h-3 rounded-full ${getCameraStatusColor(
                        parkingLot.lotCamera.status,
                        parkingLot.lotCamera.lastSeen
                      )}`}
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-600">
                  <p>Status: <span className={`font-medium ${
                    isCameraOffline(parkingLot.lotCamera.status, parkingLot.lotCamera.lastSeen)
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}>
                    {isCameraOffline(parkingLot.lotCamera.status, parkingLot.lotCamera.lastSeen)
                      ? 'Offline'
                      : 'Online'}
                  </span></p>
                  <p>Last seen: {formatLastSeen(parkingLot.lotCamera.lastSeen)}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(parkingLot.lotCamera.lastSeen).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicles Currently Inside */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Vehicles Inside ({currentVehicles.length})
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {currentVehicles.length > 0 ? (
                currentVehicles.map((vehicle) => (
                  <div key={vehicle._id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900">{vehicle.plateNumber}</p>
                    <p className="text-sm text-gray-600">
                      Duration: {formatDuration(vehicle.currentDuration || 0)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Entered: {new Date(vehicle.entry.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No vehicles inside</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
