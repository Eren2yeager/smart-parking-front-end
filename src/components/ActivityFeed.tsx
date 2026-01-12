'use client';

import { useEffect, useState } from 'react';
import { LogIn, LogOut, AlertTriangle, Clock } from 'lucide-react';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';

interface VehicleRecord {
  _id: string;
  plateNumber: string;
  parkingLotId: {
    _id: string;
    name: string;
  };
  entry: {
    timestamp: string;
  };
  exit?: {
    timestamp: string;
  };
  status: 'inside' | 'exited';
}

interface Violation {
  _id: string;
  contractorId: {
    _id: string;
    name: string;
  };
  parkingLotId: {
    _id: string;
    name: string;
  };
  timestamp: string;
  details: {
    excessVehicles: number;
  };
  status: string;
}

type ActivityItem = {
  id: string;
  type: 'entry' | 'exit' | 'violation';
  timestamp: string;
  description: string;
  icon: React.ReactNode;
  color: string;
};

type TimeGroup = 'Today' | 'Yesterday' | 'This Week' | 'Older';

interface GroupedActivities {
  [key: string]: ActivityItem[];
}

interface ActivityFeedProps {
  limit?: number;
}

export default function ActivityFeed({ limit = 10 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Group activities by time period
  const groupActivitiesByTime = (activities: ActivityItem[]): GroupedActivities => {
    const grouped: GroupedActivities = {
      Today: [],
      Yesterday: [],
      'This Week': [],
      Older: [],
    };

    activities.forEach((activity) => {
      const date = new Date(activity.timestamp);
      
      if (isToday(date)) {
        grouped.Today.push(activity);
      } else if (isYesterday(date)) {
        grouped.Yesterday.push(activity);
      } else if (isThisWeek(date, { weekStartsOn: 1 })) {
        grouped['This Week'].push(activity);
      } else {
        grouped.Older.push(activity);
      }
    });

    return grouped;
  };

  const fetchActivities = async () => {
    try {
      setError(null);

      // Fetch recent records and violations in parallel
      const [recordsResponse, violationsResponse] = await Promise.all([
        fetch(`/api/records?limit=${limit}&page=1`),
        fetch(`/api/violations?limit=${Math.floor(limit / 2)}&page=1`),
      ]);

      if (!recordsResponse.ok || !violationsResponse.ok) {
        throw new Error('Failed to fetch activity data');
      }

      const recordsData = await recordsResponse.json();
      const violationsData = await violationsResponse.json();

      // Transform records into activity items
      const recordActivities: ActivityItem[] = recordsData.data.map((record: VehicleRecord) => {
        const isExit = record.status === 'exited' && record.exit;
        return {
          id: `record-${record._id}`,
          type: isExit ? 'exit' : 'entry',
          timestamp: isExit ? record.exit!.timestamp : record.entry.timestamp,
          description: `${record.plateNumber} ${isExit ? 'exited' : 'entered'} ${
            record.parkingLotId.name
          }`,
          icon: isExit ? (
            <LogOut className="w-4 h-4" />
          ) : (
            <LogIn className="w-4 h-4" />
          ),
          color: isExit ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600',
        };
      });

      // Transform violations into activity items
      const violationActivities: ActivityItem[] = violationsData.data.map(
        (violation: Violation) => ({
          id: `violation-${violation._id}`,
          type: 'violation',
          timestamp: violation.timestamp,
          description: `Violation at ${violation.parkingLotId.name} by ${violation.contractorId.name} (+${violation.details.excessVehicles} vehicles)`,
          icon: <AlertTriangle className="w-4 h-4" />,
          color: 'bg-red-100 text-red-600',
        })
      );

      // Combine and sort by timestamp (most recent first)
      const allActivities = [...recordActivities, ...violationActivities].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Limit to requested number
      setActivities(allActivities.slice(0, limit));
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to load activity feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchActivities, 30000);

    return () => clearInterval(interval);
  }, [limit]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start space-x-3 animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
        <div className="text-center py-8">
          <p className="text-gray-500">No recent activity</p>
        </div>
      </div>
    );
  }

  const groupedActivities = groupActivitiesByTime(activities);
  const timeGroups: TimeGroup[] = ['Today', 'Yesterday', 'This Week', 'Older'];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
        <button
          onClick={fetchActivities}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-4">
        {timeGroups.map((group) => {
          const groupActivities = groupedActivities[group];
          
          if (groupActivities.length === 0) return null;

          return (
            <div key={group}>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {group}
              </h4>
              <div className="space-y-3">
                {groupActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${activity.color}`}>{activity.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{activity.description}</p>
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <Clock className="w-3 h-3 mr-1" />
                        <span>
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
