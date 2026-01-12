'use client';

import Link from 'next/link';
import { MapPin, Users, Activity } from 'lucide-react';
import { theme, getStatusColor } from '@/lib/theme';

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

interface ParkingLotCardProps {
  lot: ParkingLot;
}

function getOccupancyColor(occupancyRate: number): { bg: string; border: string; text: string } {
  if (occupancyRate >= 90) {
    // Critical - Red
    return {
      bg: theme.colors.error[50],
      border: theme.colors.error[300],
      text: theme.colors.error[800],
    };
  } else if (occupancyRate >= 70) {
    // Warning - Yellow
    return {
      bg: theme.colors.warning[50],
      border: theme.colors.warning[300],
      text: theme.colors.warning[800],
    };
  } else {
    // Good - Green
    return {
      bg: theme.colors.success[50],
      border: theme.colors.success[300],
      text: theme.colors.success[800],
    };
  }
}

function getOccupancyBadgeColor(occupancyRate: number): string {
  if (occupancyRate >= 90) {
    return getStatusColor('critical'); // Red
  } else if (occupancyRate >= 70) {
    return getStatusColor('warning'); // Yellow
  } else {
    return getStatusColor('good'); // Green
  }
}

export default function ParkingLotCard({ lot }: ParkingLotCardProps) {
  const occupancyRate = lot.currentOccupancy?.occupancyRate || 0;
  const occupied = lot.currentOccupancy?.occupied || 0;
  const empty = lot.currentOccupancy?.empty || lot.totalSlots;
  const colors = getOccupancyColor(occupancyRate);

  return (
    <Link href={`/parking-lots/${lot._id}`}>
      <div
        style={{
          backgroundColor: colors.bg,
          borderRadius: theme.borderRadius.lg,
          border: `2px solid ${colors.border}`,
          boxShadow: theme.shadows.base,
          cursor: 'pointer',
          opacity: lot.status === 'inactive' ? 0.6 : 1,
          transition: `box-shadow ${theme.transitions.duration.base} ${theme.transitions.timing.ease}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = theme.shadows.lg;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = theme.shadows.base;
        }}
      >
        <div style={{ padding: theme.spacing[6] }}>
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3
                style={{
                  fontSize: theme.typography.fontSize.lg,
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.text.primary,
                  marginBottom: theme.spacing[1],
                }}
              >
                {lot.name}
              </h3>
              <div
                className="flex items-center"
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.text.secondary,
                }}
              >
                <MapPin className="w-4 h-4 mr-1" />
                <span className="truncate">{lot.location.address}</span>
              </div>
            </div>
            <div
              style={{
                width: '0.75rem',
                height: '0.75rem',
                borderRadius: theme.borderRadius.full,
                backgroundColor:
                  lot.status === 'active' ? getStatusColor('good') : theme.colors.neutral[400],
              }}
              title={lot.status}
            />
          </div>

          {/* Contractor */}
          {lot.contractorId && (
            <div
              style={{
                marginBottom: theme.spacing[4],
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.text.secondary,
              }}
            >
              <span style={{ fontWeight: theme.typography.fontWeight.medium }}>Contractor:</span>{' '}
              {lot.contractorId.name}
            </div>
          )}

          {/* Occupancy Stats */}
          <div className="space-y-3">
            {/* Progress Bar */}
            <div>
              <div
                className="flex items-center justify-between"
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  marginBottom: theme.spacing[2],
                }}
              >
                <span
                  style={{
                    fontWeight: theme.typography.fontWeight.medium,
                    color: theme.colors.text.primary,
                  }}
                >
                  Occupancy
                </span>
                <span
                  style={{
                    fontWeight: theme.typography.fontWeight.bold,
                    color: theme.colors.text.primary,
                  }}
                >
                  {occupied} / {lot.totalSlots}
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  backgroundColor: theme.colors.neutral[200],
                  borderRadius: theme.borderRadius.full,
                  height: '0.75rem',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    backgroundColor: getOccupancyBadgeColor(occupancyRate),
                    width: `${Math.min(occupancyRate, 100)}%`,
                    transition: `width ${theme.transitions.duration.slow} ${theme.transitions.timing.ease}`,
                  }}
                />
              </div>
              <div
                className="flex items-center justify-between"
                style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.text.secondary,
                  marginTop: theme.spacing[1],
                }}
              >
                <span>{occupancyRate.toFixed(1)}% occupied</span>
                <span>{empty} empty</span>
              </div>
            </div>

            {/* Status Indicators */}
            <div
              className="flex items-center justify-between"
              style={{
                paddingTop: theme.spacing[3],
                borderTop: `1px solid ${theme.colors.border.light}`,
              }}
            >
              <div
                className="flex items-center"
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.text.secondary,
                }}
              >
                <Users className="w-4 h-4 mr-1" />
                <span>{occupied} vehicles</span>
              </div>
              {lot.currentOccupancy?.lastUpdated && (
                <div
                  className="flex items-center"
                  style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.text.secondary,
                  }}
                >
                  <Activity className="w-3 h-3 mr-1" />
                  <span>{new Date(lot.currentOccupancy.lastUpdated).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
