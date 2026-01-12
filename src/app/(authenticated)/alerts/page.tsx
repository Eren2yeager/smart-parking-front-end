'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Filter, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Bell,
  Camera,
  Users,
  MapPin,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';

interface Alert {
  _id: string;
  type: 'overparking' | 'capacity_full' | 'camera_offline' | 'system';
  severity: 'critical' | 'warning' | 'info';
  parkingLotId: {
    _id: string;
    name: string;
    location?: {
      address: string;
    };
  };
  contractorId?: {
    _id: string;
    name: string;
    email: string;
  };
  title: string;
  message: string;
  metadata: any;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledgedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  acknowledgedAt?: string;
  createdAt: string;
}

export default function AlertsPage() {
  const { data: session } = useSession();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<'all' | 'overparking' | 'capacity_full' | 'camera_offline' | 'system'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('all');

  const fetchAlerts = async () => {
    try {
      setError(null);
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams();
      
      if (typeFilter !== 'all') {
        params.append('type', typeFilter);
      }
      
      if (severityFilter !== 'all') {
        params.append('severity', severityFilter);
      }
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      params.append('limit', '100');

      const response = await fetch(`/api/alerts?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }

      const result = await response.json();
      setAlerts(result.data || []);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [typeFilter, severityFilter, statusFilter]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      setAcknowledgingId(alertId);

      const response = await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'PUT',
      });

      if (!response.ok) {
        throw new Error('Failed to acknowledge alert');
      }

      // Refresh alerts list
      await fetchAlerts();
    } catch (err) {
      console.error('Error acknowledging alert:', err);
      alert('Failed to acknowledge alert');
    } finally {
      setAcknowledgingId(null);
    }
  };

  // Calculate statistics
  const stats = {
    total: alerts.length,
    active: alerts.filter((a) => a.status === 'active').length,
    acknowledged: alerts.filter((a) => a.status === 'acknowledged').length,
    resolved: alerts.filter((a) => a.status === 'resolved').length,
    critical: alerts.filter((a) => a.severity === 'critical').length,
  };

  // Get severity color classes
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 border-red-500 text-red-900';
      case 'high':
        return 'bg-orange-100 border-orange-500 text-orange-900';
      case 'medium':
        return 'bg-yellow-100 border-yellow-500 text-yellow-900';
      case 'low':
        return 'bg-blue-100 border-blue-500 text-blue-900';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-900';
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-orange-600 text-white';
      case 'medium':
        return 'bg-yellow-600 text-white';
      case 'low':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-red-100 text-red-800';
      case 'acknowledged':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'capacity_warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'capacity_breach':
        return <AlertCircle className="w-5 h-5" />;
      case 'camera_offline':
        return <Camera className="w-5 h-5" />;
      case 'violation_detected':
        return <Users className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'capacity_warning':
        return 'Capacity Warning';
      case 'capacity_breach':
        return 'Capacity Breach';
      case 'camera_offline':
        return 'Camera Offline';
      case 'violation_detected':
        return 'Violation Detected';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Alerts</h1>
        <p className="text-gray-600">Monitor and manage system alerts</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Bell className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-red-600">{stats.active}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-400" />
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
              <p className="text-sm text-gray-600">Critical</p>
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-bold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="capacity_warning">Capacity Warning</option>
              <option value="capacity_breach">Capacity Breach</option>
              <option value="camera_offline">Camera Offline</option>
              <option value="violation_detected">Violation Detected</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        {!loading && (
          <div className="mt-4 text-sm text-gray-600">
            Showing {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Alerts List */}
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
            onClick={fetchAlerts}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">No alerts found</p>
          <p className="text-sm text-gray-500">
            {typeFilter !== 'all' || severityFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'No alerts have been recorded'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert._id}
              className={`rounded-lg border-l-4 shadow p-6 ${getSeverityColor(alert.severity)}`}
            >
              {/* Alert Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${getSeverityBadgeColor(alert.severity)}`}>
                    {getTypeIcon(alert.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold">{getTypeLabel(alert.type)}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getSeverityBadgeColor(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(alert.status)}`}>
                        {alert.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm opacity-75">
                      {format(new Date(alert.createdAt), 'PPpp')}
                    </p>
                  </div>
                </div>

                {/* Acknowledge Button */}
                {alert.status === 'active' && (
                  <button
                    onClick={() => handleAcknowledge(alert._id)}
                    disabled={acknowledgingId === alert._id}
                    className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {acknowledgingId === alert._id ? 'Acknowledging...' : 'Acknowledge'}
                  </button>
                )}
              </div>

              {/* Alert Message */}
              <p className="text-base mb-4 font-medium">{alert.message}</p>

              {/* Alert Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {/* Parking Lot */}
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 opacity-75" />
                  <div>
                    <p className="font-medium">Parking Lot</p>
                    <p className="opacity-75">{alert.parkingLotId.name}</p>
                    {alert.parkingLotId.location?.address && (
                      <p className="text-xs opacity-60">{alert.parkingLotId.location.address}</p>
                    )}
                  </div>
                </div>

                {/* Contractor (if applicable) */}
                {alert.contractorId && (
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 mt-0.5 opacity-75" />
                    <div>
                      <p className="font-medium">Contractor</p>
                      <p className="opacity-75">{alert.contractorId.name}</p>
                      <p className="text-xs opacity-60">{alert.contractorId.email}</p>
                    </div>
                  </div>
                )}

                {/* Acknowledged Info */}
                {alert.status === 'acknowledged' && alert.acknowledgedBy && (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 opacity-75" />
                    <div>
                      <p className="font-medium">Acknowledged By</p>
                      <p className="opacity-75">{alert.acknowledgedBy.name}</p>
                      {alert.acknowledgedAt && (
                        <p className="text-xs opacity-60">
                          {format(new Date(alert.acknowledgedAt), 'PPpp')}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Data (if any) */}
              {alert.data && Object.keys(alert.data).length > 0 && (
                <div className="mt-4 pt-4 border-t border-current border-opacity-20">
                  <p className="text-xs font-medium mb-2 opacity-75">Additional Details:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {Object.entries(alert.data).map(([key, value]) => (
                      <div key={key}>
                        <p className="font-medium opacity-75">{key}:</p>
                        <p className="opacity-60">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
