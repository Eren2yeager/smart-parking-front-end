'use client';

import { useEffect, useState } from 'react';
import { Database, Server, Activity, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { theme } from '@/lib/theme';

interface HealthStatus {
  database: 'online' | 'offline' | 'degraded';
  pythonBackend: 'online' | 'offline' | 'degraded';
  activeConnections: number;
}

export default function SystemHealthIndicator() {
  const [health, setHealth] = useState<HealthStatus>({
    database: 'online',
    pythonBackend: 'online',
    activeConnections: 0,
  });
  const [loading, setLoading] = useState(true);

  const checkHealth = async () => {
    try {
      // Check database health via API
      const dbResponse = await fetch('/api/health', { 
        method: 'GET',
        cache: 'no-store',
      });
      
      const dbStatus = dbResponse.ok ? 'online' : 'offline';

      // Check Python backend health (this would need to be implemented)
      let pythonStatus: 'online' | 'offline' | 'degraded' = 'online';
      try {
        const pythonResponse = await fetch('/api/health', {
          method: 'GET',
          cache: 'no-store',
        });
        const data = await pythonResponse.json();
        pythonStatus = data.pythonBackend || 'online';
      } catch {
        pythonStatus = 'offline';
      }

      // Get active connections count (mock for now)
      const activeConnections = Math.floor(Math.random() * 10) + 1;

      setHealth({
        database: dbStatus,
        pythonBackend: pythonStatus,
        activeConnections,
      });
    } catch (error) {
      console.error('Error checking system health:', error);
      setHealth({
        database: 'offline',
        pythonBackend: 'offline',
        activeConnections: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();

    // Poll for health updates every 30 seconds
    const interval = setInterval(checkHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: 'online' | 'offline' | 'degraded') => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-5 h-5" style={{ color: theme.colors.success[600] }} />;
      case 'degraded':
        return <AlertCircle className="w-5 h-5" style={{ color: theme.colors.warning[600] }} />;
      case 'offline':
        return <XCircle className="w-5 h-5" style={{ color: theme.colors.error[600] }} />;
    }
  };

  const getStatusColor = (status: 'online' | 'offline' | 'degraded') => {
    switch (status) {
      case 'online':
        return theme.colors.success[600];
      case 'degraded':
        return theme.colors.warning[600];
      case 'offline':
        return theme.colors.error[600];
    }
  };

  const getStatusBgColor = (status: 'online' | 'offline' | 'degraded') => {
    switch (status) {
      case 'online':
        return theme.colors.success[50];
      case 'degraded':
        return theme.colors.warning[50];
      case 'offline':
        return theme.colors.error[50];
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">System Health</h3>
        <div className="space-y-3 animate-pulse">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">System Health</h3>
        <button
          onClick={checkHealth}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {/* Database Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: theme.spacing[3],
            borderRadius: theme.borderRadius.lg,
            backgroundColor: getStatusBgColor(health.database),
            border: `1px solid ${getStatusColor(health.database)}20`,
          }}
        >
          <div className="flex items-center space-x-3">
            <Database className="w-5 h-5" style={{ color: theme.colors.neutral[600] }} />
            <div>
              <p
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.text.primary,
                }}
              >
                Database
              </p>
              <p
                style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.text.secondary,
                }}
              >
                MongoDB Connection
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(health.database)}
            <span
              style={{
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                color: getStatusColor(health.database),
                textTransform: 'capitalize',
              }}
            >
              {health.database}
            </span>
          </div>
        </div>

        {/* Python Backend Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: theme.spacing[3],
            borderRadius: theme.borderRadius.lg,
            backgroundColor: getStatusBgColor(health.pythonBackend),
            border: `1px solid ${getStatusColor(health.pythonBackend)}20`,
          }}
        >
          <div className="flex items-center space-x-3">
            <Server className="w-5 h-5" style={{ color: theme.colors.neutral[600] }} />
            <div>
              <p
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.text.primary,
                }}
              >
                Python Backend
              </p>
              <p
                style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.text.secondary,
                }}
              >
                AI/ML Processing Service
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(health.pythonBackend)}
            <span
              style={{
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                color: getStatusColor(health.pythonBackend),
                textTransform: 'capitalize',
              }}
            >
              {health.pythonBackend}
            </span>
          </div>
        </div>

        {/* Active Connections */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: theme.spacing[3],
            borderRadius: theme.borderRadius.lg,
            backgroundColor: theme.colors.neutral[50],
            border: `1px solid ${theme.colors.neutral[200]}`,
          }}
        >
          <div className="flex items-center space-x-3">
            <Activity className="w-5 h-5" style={{ color: theme.colors.neutral[600] }} />
            <div>
              <p
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.text.primary,
                }}
              >
                Active Connections
              </p>
              <p
                style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.text.secondary,
                }}
              >
                WebSocket & WebRTC
              </p>
            </div>
          </div>
          <span
            style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.primary[600],
            }}
          >
            {health.activeConnections}
          </span>
        </div>
      </div>
    </div>
  );
}
