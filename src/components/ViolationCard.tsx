'use client';

import { useState } from 'react';
import { AlertTriangle, Building2, Users, Clock, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { theme, getStatusColor } from '@/lib/theme';

interface Violation {
  _id: string;
  contractorId: {
    _id: string;
    name: string;
    email: string;
  };
  parkingLotId: {
    _id: string;
    name: string;
    location?: {
      address: string;
    };
  };
  violationType: 'overparking' | 'unauthorized_vehicle' | 'capacity_breach';
  timestamp: string;
  details: {
    allocatedCapacity: number;
    actualOccupancy: number;
    excessVehicles: number;
    duration: number;
  };
  penalty: number;
  status: 'pending' | 'acknowledged' | 'resolved';
  resolvedAt?: string;
  resolvedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  notes?: string;
  createdAt: string;
}

interface ViolationCardProps {
  violation: Violation;
  onUpdate?: () => void;
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'pending':
      return {
        backgroundColor: theme.colors.error[50],
        borderColor: theme.colors.error[300],
        textColor: theme.colors.error[800],
        badgeBackgroundColor: theme.colors.error[100],
        badgeTextColor: theme.colors.error[800],
        badgeBorderColor: theme.colors.error[300],
        icon: <AlertTriangle className="w-5 h-5" />,
      };
    case 'acknowledged':
      return {
        backgroundColor: theme.colors.warning[50],
        borderColor: theme.colors.warning[300],
        textColor: theme.colors.warning[800],
        badgeBackgroundColor: theme.colors.warning[100],
        badgeTextColor: theme.colors.warning[800],
        badgeBorderColor: theme.colors.warning[300],
        icon: <Clock className="w-5 h-5" />,
      };
    case 'resolved':
      return {
        backgroundColor: theme.colors.success[50],
        borderColor: theme.colors.success[300],
        textColor: theme.colors.success[800],
        badgeBackgroundColor: theme.colors.success[100],
        badgeTextColor: theme.colors.success[800],
        badgeBorderColor: theme.colors.success[300],
        icon: <CheckCircle className="w-5 h-5" />,
      };
    default:
      return {
        backgroundColor: theme.colors.neutral[50],
        borderColor: theme.colors.neutral[300],
        textColor: theme.colors.neutral[800],
        badgeBackgroundColor: theme.colors.neutral[100],
        badgeTextColor: theme.colors.neutral[800],
        badgeBorderColor: theme.colors.neutral[300],
        icon: <AlertTriangle className="w-5 h-5" />,
      };
  }
}

function getViolationTypeLabel(type: string): string {
  switch (type) {
    case 'overparking':
      return 'Overparking';
    case 'unauthorized_vehicle':
      return 'Unauthorized Vehicle';
    case 'capacity_breach':
      return 'Capacity Breach';
    default:
      return type;
  }
}

export default function ViolationCard({ violation, onUpdate }: ViolationCardProps) {
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolveNotes, setResolveNotes] = useState('');

  const config = getStatusConfig(violation.status);

  const handleAcknowledge = async () => {
    if (isAcknowledging) return;

    try {
      setIsAcknowledging(true);

      const response = await fetch(`/api/violations/${violation._id}/acknowledge`, {
        method: 'PUT',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to acknowledge violation');
      }

      // Notify parent component
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error('Error acknowledging violation:', err);
      alert(err instanceof Error ? err.message : 'Failed to acknowledge violation. Please try again.');
    } finally {
      setIsAcknowledging(false);
    }
  };

  const handleResolve = async () => {
    if (isResolving) return;

    try {
      setIsResolving(true);

      const response = await fetch(`/api/violations/${violation._id}/resolve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: resolveNotes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to resolve violation');
      }

      // Close dialog and notify parent
      setShowResolveDialog(false);
      setResolveNotes('');
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error('Error resolving violation:', err);
      alert(err instanceof Error ? err.message : 'Failed to resolve violation. Please try again.');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <>
      <div
        style={{
          backgroundColor: config.backgroundColor,
          borderLeft: `4px solid ${config.borderColor}`,
          borderRadius: theme.borderRadius.lg,
          boxShadow: theme.shadows.sm,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: theme.spacing[6] }}>
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3">
              <div style={{ color: config.textColor }}>{config.icon}</div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3
                    style={{
                      fontSize: theme.typography.fontSize.lg,
                      fontWeight: theme.typography.fontWeight.bold,
                      color: config.textColor,
                    }}
                  >
                    {getViolationTypeLabel(violation.violationType)}
                  </h3>
                  <span
                    style={{
                      padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                      fontSize: theme.typography.fontSize.xs,
                      fontWeight: theme.typography.fontWeight.medium,
                      borderRadius: theme.borderRadius.full,
                      border: `1px solid ${config.badgeBorderColor}`,
                      backgroundColor: config.badgeBackgroundColor,
                      color: config.badgeTextColor,
                    }}
                  >
                    {violation.status.charAt(0).toUpperCase() + violation.status.slice(1)}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.text.secondary,
                  }}
                >
                  {formatDistanceToNow(new Date(violation.timestamp), { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>

          {/* Violation Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Contractor */}
            <div className="flex items-start gap-2">
              <Users style={{ width: '1rem', height: '1rem', color: theme.colors.text.secondary, marginTop: '0.125rem' }} />
              <div>
                <p style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary }}>Contractor</p>
                <p style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium, color: theme.colors.text.primary }}>{violation.contractorId.name}</p>
                <p style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary }}>{violation.contractorId.email}</p>
              </div>
            </div>

            {/* Parking Lot */}
            <div className="flex items-start gap-2">
              <Building2 style={{ width: '1rem', height: '1rem', color: theme.colors.text.secondary, marginTop: '0.125rem' }} />
              <div>
                <p style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary }}>Parking Lot</p>
                <p style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium, color: theme.colors.text.primary }}>{violation.parkingLotId.name}</p>
                {violation.parkingLotId.location && (
                  <p style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary }}>{violation.parkingLotId.location.address}</p>
                )}
              </div>
            </div>
          </div>

          {/* Capacity Details */}
          <div style={{ backgroundColor: theme.colors.background.default, borderRadius: theme.borderRadius.lg, padding: theme.spacing[4], marginBottom: theme.spacing[4] }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary, marginBottom: theme.spacing[1] }}>Allocated</p>
                <p style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold, color: theme.colors.text.primary }}>{violation.details.allocatedCapacity}</p>
              </div>
              <div>
                <p style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary, marginBottom: theme.spacing[1] }}>Actual</p>
                <p style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold, color: theme.colors.error[600] }}>{violation.details.actualOccupancy}</p>
              </div>
              <div>
                <p style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary, marginBottom: theme.spacing[1] }}>Excess Vehicles</p>
                <p style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold, color: theme.colors.error[600] }}>+{violation.details.excessVehicles}</p>
              </div>
              <div>
                <p style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary, marginBottom: theme.spacing[1] }}>Penalty</p>
                <p style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold, color: theme.colors.text.primary }}>₹{violation.penalty}</p>
              </div>
            </div>
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-2" style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary, marginBottom: theme.spacing[4] }}>
            <Calendar className="w-3 h-3" />
            <span>Occurred on {format(new Date(violation.timestamp), 'PPpp')}</span>
          </div>

          {/* Resolution Details */}
          {violation.status !== 'pending' && violation.resolvedBy && (
            <div style={{ backgroundColor: theme.colors.background.default, borderRadius: theme.borderRadius.lg, padding: theme.spacing[4], marginBottom: theme.spacing[4], border: `1px solid ${theme.colors.border.light}` }}>
              <p style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary, marginBottom: theme.spacing[2] }}>
                {violation.status === 'acknowledged' ? 'Acknowledged' : 'Resolved'} by
              </p>
              <p style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium, color: theme.colors.text.primary }}>{violation.resolvedBy.name}</p>
              {violation.resolvedAt && (
                <p style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary, marginTop: theme.spacing[1] }}>
                  {formatDistanceToNow(new Date(violation.resolvedAt), { addSuffix: true })}
                </p>
              )}
              {violation.notes && (
                <div style={{ marginTop: theme.spacing[3], paddingTop: theme.spacing[3], borderTop: `1px solid ${theme.colors.border.light}` }}>
                  <p style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary, marginBottom: theme.spacing[1] }}>Notes</p>
                  <p style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.text.primary }}>{violation.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {violation.status === 'pending' && (
            <div className="flex gap-3">
              <button
                onClick={handleAcknowledge}
                disabled={isAcknowledging}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: theme.spacing[2],
                  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                  backgroundColor: theme.colors.warning[600],
                  color: theme.colors.text.inverse,
                  borderRadius: theme.borderRadius.lg,
                  border: 'none',
                  cursor: isAcknowledging ? 'not-allowed' : 'pointer',
                  opacity: isAcknowledging ? 0.5 : 1,
                  transition: `background-color ${theme.transitions.duration.fast} ${theme.transitions.timing.ease}`,
                }}
                onMouseEnter={(e) => !isAcknowledging && (e.currentTarget.style.backgroundColor = theme.colors.warning[700])}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.colors.warning[600])}
              >
                <Clock className="w-4 h-4" />
                {isAcknowledging ? 'Acknowledging...' : 'Acknowledge'}
              </button>
              <button
                onClick={() => setShowResolveDialog(true)}
                disabled={isResolving}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: theme.spacing[2],
                  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                  backgroundColor: theme.colors.success[600],
                  color: theme.colors.text.inverse,
                  borderRadius: theme.borderRadius.lg,
                  border: 'none',
                  cursor: isResolving ? 'not-allowed' : 'pointer',
                  opacity: isResolving ? 0.5 : 1,
                  transition: `background-color ${theme.transitions.duration.fast} ${theme.transitions.timing.ease}`,
                }}
                onMouseEnter={(e) => !isResolving && (e.currentTarget.style.backgroundColor = theme.colors.success[700])}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.colors.success[600])}
              >
                <CheckCircle className="w-4 h-4" />
                Resolve
              </button>
            </div>
          )}

          {violation.status === 'acknowledged' && (
            <button
              onClick={() => setShowResolveDialog(true)}
              disabled={isResolving}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: theme.spacing[2],
                padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                backgroundColor: theme.colors.success[600],
                color: theme.colors.text.inverse,
                borderRadius: theme.borderRadius.lg,
                border: 'none',
                cursor: isResolving ? 'not-allowed' : 'pointer',
                opacity: isResolving ? 0.5 : 1,
                transition: `background-color ${theme.transitions.duration.fast} ${theme.transitions.timing.ease}`,
              }}
              onMouseEnter={(e) => !isResolving && (e.currentTarget.style.backgroundColor = theme.colors.success[700])}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.colors.success[600])}
            >
              <CheckCircle className="w-4 h-4" />
              Resolve
            </button>
          )}
        </div>
      </div>

      {/* Resolve Dialog */}
      {showResolveDialog && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: theme.zIndex.modal, padding: theme.spacing[4] }}>
          <div style={{ backgroundColor: theme.colors.background.default, borderRadius: theme.borderRadius.lg, boxShadow: theme.shadows.xl, maxWidth: '28rem', width: '100%', padding: theme.spacing[6] }}>
            <h3 style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold, color: theme.colors.text.primary, marginBottom: theme.spacing[4] }}>Resolve Violation</h3>
            
            <div style={{ marginBottom: theme.spacing[4] }}>
              <label htmlFor="resolveNotes" style={{ display: 'block', fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium, color: theme.colors.text.primary, marginBottom: theme.spacing[2] }}>
                Resolution Notes (Optional)
              </label>
              <textarea
                id="resolveNotes"
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                rows={4}
                style={{
                  width: '100%',
                  padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                  border: `1px solid ${theme.colors.border.main}`,
                  borderRadius: theme.borderRadius.lg,
                  fontFamily: theme.typography.fontFamily.sans,
                  fontSize: theme.typography.fontSize.base,
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = theme.colors.success[500];
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.colors.success[100]}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = theme.colors.border.main;
                  e.currentTarget.style.boxShadow = 'none';
                }}
                placeholder="Add any notes about how this violation was resolved..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResolveDialog(false);
                  setResolveNotes('');
                }}
                disabled={isResolving}
                style={{
                  flex: 1,
                  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                  border: `1px solid ${theme.colors.border.main}`,
                  color: theme.colors.text.primary,
                  backgroundColor: theme.colors.background.default,
                  borderRadius: theme.borderRadius.lg,
                  cursor: isResolving ? 'not-allowed' : 'pointer',
                  opacity: isResolving ? 0.5 : 1,
                  transition: `background-color ${theme.transitions.duration.fast} ${theme.transitions.timing.ease}`,
                }}
                onMouseEnter={(e) => !isResolving && (e.currentTarget.style.backgroundColor = theme.colors.neutral[50])}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.colors.background.default)}
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={isResolving}
                style={{
                  flex: 1,
                  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                  backgroundColor: theme.colors.success[600],
                  color: theme.colors.text.inverse,
                  borderRadius: theme.borderRadius.lg,
                  border: 'none',
                  cursor: isResolving ? 'not-allowed' : 'pointer',
                  opacity: isResolving ? 0.5 : 1,
                  transition: `background-color ${theme.transitions.duration.fast} ${theme.transitions.timing.ease}`,
                }}
                onMouseEnter={(e) => !isResolving && (e.currentTarget.style.backgroundColor = theme.colors.success[700])}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.colors.success[600])}
              >
                {isResolving ? 'Resolving...' : 'Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
