'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, AlertCircle, Info, X, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { theme, getStatusColor } from '@/lib/theme';

interface Alert {
  _id: string;
  type: 'capacity_warning' | 'capacity_breach' | 'camera_offline' | 'violation_detected';
  severity: 'low' | 'medium' | 'high' | 'critical';
  parkingLotId: {
    _id: string;
    name: string;
  };
  contractorId?: {
    _id: string;
    name: string;
  };
  message: string;
  data: any;
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: string;
}

interface AlertBannerProps {
  onAlertUpdate?: () => void;
}

function getSeverityConfig(severity: string) {
  switch (severity) {
    case 'critical':
      return {
        backgroundColor: theme.colors.error[50],
        borderColor: theme.colors.error[300],
        textColor: theme.colors.error[800],
        iconColor: theme.colors.error[600],
        icon: <AlertTriangle className="w-5 h-5" />,
      };
    case 'high':
      return {
        backgroundColor: theme.colors.warning[50],
        borderColor: theme.colors.warning[300],
        textColor: theme.colors.warning[800],
        iconColor: theme.colors.warning[600],
        icon: <AlertCircle className="w-5 h-5" />,
      };
    case 'medium':
      return {
        backgroundColor: theme.colors.warning[100],
        borderColor: theme.colors.warning[300],
        textColor: theme.colors.warning[800],
        iconColor: theme.colors.warning[600],
        icon: <AlertCircle className="w-5 h-5" />,
      };
    case 'low':
      return {
        backgroundColor: theme.colors.info[50],
        borderColor: theme.colors.info[300],
        textColor: theme.colors.info[800],
        iconColor: theme.colors.info[600],
        icon: <Info className="w-5 h-5" />,
      };
    default:
      return {
        backgroundColor: theme.colors.neutral[50],
        borderColor: theme.colors.neutral[300],
        textColor: theme.colors.neutral[800],
        iconColor: theme.colors.neutral[600],
        icon: <Info className="w-5 h-5" />,
      };
  }
}

export default function AlertBanner({ onAlertUpdate }: AlertBannerProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts/active');

      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }

      const result = await response.json();
      setAlerts(result.data || []);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'PUT',
      });

      if (!response.ok) {
        throw new Error('Failed to acknowledge alert');
      }

      // Remove from active alerts
      setAlerts((prev) => prev.filter((alert) => alert._id !== alertId));

      // Notify parent component
      if (onAlertUpdate) {
        onAlertUpdate();
      }
    } catch (err) {
      console.error('Error acknowledging alert:', err);
      alert('Failed to acknowledge alert. Please try again.');
    }
  };

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts((prev) => new Set(prev).add(alertId));
  };

  // Filter out dismissed alerts
  const visibleAlerts = alerts.filter((alert) => !dismissedAlerts.has(alert._id));
  
  // Separate critical alerts from others
  const criticalAlerts = visibleAlerts.filter((alert) => alert.severity === 'critical');
  const otherAlerts = visibleAlerts.filter((alert) => alert.severity !== 'critical');

  if (loading || visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6" role="region" aria-label="Active alerts">
      {/* Critical alerts - more prominent */}
      {criticalAlerts.map((alert) => {
        const config = getSeverityConfig(alert.severity);

        return (
          <div
            key={alert._id}
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            style={{
              backgroundColor: config.backgroundColor,
              borderLeft: `6px solid ${config.borderColor}`,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing[5],
              boxShadow: theme.shadows.lg,
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          >
            <div className="flex items-start">
              <div style={{ color: config.iconColor, marginTop: '0.125rem' }}>
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="ml-3 flex-1">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4
                      style={{
                        fontSize: theme.typography.fontSize.base,
                        fontWeight: theme.typography.fontWeight.bold,
                        color: config.textColor,
                        marginBottom: theme.spacing[1],
                      }}
                    >
                      🚨 CRITICAL ALERT - {alert.type.replace(/_/g, ' ').toUpperCase()}
                    </h4>
                    <p style={{ 
                      fontSize: theme.typography.fontSize.base, 
                      color: config.textColor,
                      fontWeight: theme.typography.fontWeight.medium,
                    }}>
                      {alert.message}
                    </p>
                    <div
                      style={{
                        marginTop: theme.spacing[2],
                        fontSize: theme.typography.fontSize.sm,
                        color: theme.colors.text.secondary,
                      }}
                    >
                      <span style={{ fontWeight: theme.typography.fontWeight.medium }}>
                        {alert.parkingLotId.name}
                      </span>
                      {alert.contractorId && (
                        <span> • Contractor: {alert.contractorId.name}</span>
                      )}
                      <span>
                        {' '}
                        • {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleAcknowledge(alert._id)}
                      style={{
                        padding: theme.spacing[2],
                        borderRadius: theme.borderRadius.lg,
                        backgroundColor: config.backgroundColor,
                        color: config.iconColor,
                        border: 'none',
                        cursor: 'pointer',
                        transition: `opacity ${theme.transitions.duration.fast} ${theme.transitions.timing.ease}`,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                      title="Acknowledge alert"
                      aria-label="Acknowledge alert"
                    >
                      <Check className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => handleDismiss(alert._id)}
                      style={{
                        padding: theme.spacing[2],
                        borderRadius: theme.borderRadius.lg,
                        backgroundColor: config.backgroundColor,
                        color: config.iconColor,
                        border: 'none',
                        cursor: 'pointer',
                        transition: `opacity ${theme.transitions.duration.fast} ${theme.transitions.timing.ease}`,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                      title="Dismiss alert"
                      aria-label="Dismiss alert"
                    >
                      <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      
      {/* Other alerts - standard display */}
      {otherAlerts.map((alert) => {
        const config = getSeverityConfig(alert.severity);

        return (
          <div
            key={alert._id}
            role="alert"
            aria-live="polite"
            aria-atomic="true"
            style={{
              backgroundColor: config.backgroundColor,
              borderLeft: `4px solid ${config.borderColor}`,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing[4],
              boxShadow: theme.shadows.sm,
            }}
          >
            <div className="flex items-start">
              <div style={{ color: config.iconColor, marginTop: '0.125rem' }}>{config.icon}</div>

              <div className="ml-3 flex-1">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4
                      style={{
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.bold,
                        color: config.textColor,
                        marginBottom: theme.spacing[1],
                      }}
                    >
                      {alert.type.replace(/_/g, ' ').toUpperCase()} - {alert.severity.toUpperCase()}
                    </h4>
                    <p style={{ fontSize: theme.typography.fontSize.sm, color: config.textColor }}>
                      {alert.message}
                    </p>
                    <div
                      style={{
                        marginTop: theme.spacing[2],
                        fontSize: theme.typography.fontSize.xs,
                        color: theme.colors.text.secondary,
                      }}
                    >
                      <span style={{ fontWeight: theme.typography.fontWeight.medium }}>
                        {alert.parkingLotId.name}
                      </span>
                      {alert.contractorId && (
                        <span> • Contractor: {alert.contractorId.name}</span>
                      )}
                      <span>
                        {' '}
                        • {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleAcknowledge(alert._id)}
                      style={{
                        padding: theme.spacing[2],
                        borderRadius: theme.borderRadius.lg,
                        backgroundColor: config.backgroundColor,
                        color: config.iconColor,
                        border: 'none',
                        cursor: 'pointer',
                        transition: `opacity ${theme.transitions.duration.fast} ${theme.transitions.timing.ease}`,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                      title="Acknowledge alert"
                      aria-label="Acknowledge alert"
                    >
                      <Check className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => handleDismiss(alert._id)}
                      style={{
                        padding: theme.spacing[2],
                        borderRadius: theme.borderRadius.lg,
                        backgroundColor: config.backgroundColor,
                        color: config.iconColor,
                        border: 'none',
                        cursor: 'pointer',
                        transition: `opacity ${theme.transitions.duration.fast} ${theme.transitions.timing.ease}`,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                      title="Dismiss alert"
                      aria-label="Dismiss alert"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
