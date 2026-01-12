'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Button } from './Button';
import {
  Inbox,
  FileX,
  AlertCircle,
  Search,
  Database,
  FolderOpen,
  Package,
  Users,
  Car,
  Camera,
  AlertTriangle,
} from 'lucide-react';

/**
 * EmptyState Component
 * 
 * Displays a helpful message and optional action when no data is available.
 * Includes relevant icon and customizable action button.
 */

export interface EmptyStateProps {
  /**
   * Icon to display (can be a string preset or custom React node)
   */
  icon?: 'inbox' | 'file' | 'alert' | 'search' | 'database' | 'folder' | 'package' | 'users' | 'car' | 'camera' | 'warning' | React.ReactNode;
  
  /**
   * Title text
   */
  title: string;
  
  /**
   * Description text
   */
  description?: string;
  
  /**
   * Action button text
   */
  actionLabel?: string;
  
  /**
   * Action button click handler
   */
  onAction?: () => void;
  
  /**
   * Action button icon
   */
  actionIcon?: React.ReactNode;
  
  /**
   * Additional CSS class name
   */
  className?: string;
  
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  className = '',
  size = 'md',
}: EmptyStateProps) {
  const getIconComponent = () => {
    if (typeof icon !== 'string') {
      return icon;
    }

    const iconMap: Record<string, React.ComponentType> = {
      inbox: Inbox,
      file: FileX,
      alert: AlertCircle,
      search: Search,
      database: Database,
      folder: FolderOpen,
      package: Package,
      users: Users,
      car: Car,
      camera: Camera,
      warning: AlertTriangle,
    };

    const IconComponent = iconMap[icon] || Inbox;
    return <IconComponent />;
  };

  const getSizeStyles = () => {
    const sizes = {
      sm: {
        iconSize: '3rem',
        titleSize: theme.typography.fontSize.lg,
        descriptionSize: theme.typography.fontSize.sm,
        spacing: theme.spacing[8],
      },
      md: {
        iconSize: '4rem',
        titleSize: theme.typography.fontSize.xl,
        descriptionSize: theme.typography.fontSize.base,
        spacing: theme.spacing[12],
      },
      lg: {
        iconSize: '5rem',
        titleSize: theme.typography.fontSize['2xl'],
        descriptionSize: theme.typography.fontSize.lg,
        spacing: theme.spacing[16],
      },
    };
    
    return sizes[size];
  };

  const sizeStyles = getSizeStyles();

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: sizeStyles.spacing,
        textAlign: 'center',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: sizeStyles.iconSize,
          height: sizeStyles.iconSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.colors.neutral[400],
          marginBottom: theme.spacing[4],
        }}
      >
        {getIconComponent()}
      </div>

      {/* Title */}
      <h3
        style={{
          fontSize: sizeStyles.titleSize,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing[2],
          lineHeight: theme.typography.lineHeight.tight,
        }}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          style={{
            fontSize: sizeStyles.descriptionSize,
            color: theme.colors.text.secondary,
            marginBottom: actionLabel ? theme.spacing[6] : 0,
            maxWidth: '32rem',
            lineHeight: theme.typography.lineHeight.normal,
          }}
        >
          {description}
        </p>
      )}

      {/* Action Button */}
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          variant="primary"
          size={size === 'lg' ? 'lg' : 'md'}
          icon={actionIcon}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/**
 * Pre-built EmptyState variants for common scenarios
 */

export function NoDataEmptyState({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon="inbox"
      title="No data available"
      description="There's nothing to display here yet."
      actionLabel={onAction ? "Refresh" : undefined}
      onAction={onAction}
    />
  );
}

export function NoResultsEmptyState({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon="search"
      title="No results found"
      description="Try adjusting your search or filter criteria."
      actionLabel={onAction ? "Clear filters" : undefined}
      onAction={onAction}
    />
  );
}

export function NoParkingLotsEmptyState({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon="car"
      title="No parking lots"
      description="Get started by adding your first parking lot."
      actionLabel={onAction ? "Add Parking Lot" : undefined}
      onAction={onAction}
    />
  );
}

export function NoVehiclesEmptyState() {
  return (
    <EmptyState
      icon="car"
      title="No vehicles"
      description="No vehicles are currently in this parking lot."
    />
  );
}

export function NoViolationsEmptyState() {
  return (
    <EmptyState
      icon="package"
      title="No violations"
      description="All contractors are in compliance. Great job!"
    />
  );
}

export function NoAlertsEmptyState() {
  return (
    <EmptyState
      icon="alert"
      title="No active alerts"
      description="Everything is running smoothly."
    />
  );
}

export function NoContractorsEmptyState({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon="users"
      title="No contractors"
      description="Add contractors to manage parking lot operations."
      actionLabel={onAction ? "Add Contractor" : undefined}
      onAction={onAction}
    />
  );
}

export function CameraOfflineEmptyState({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon="camera"
      title="Camera offline"
      description="Unable to connect to the camera feed. Please check the camera connection."
      actionLabel={onAction ? "Retry Connection" : undefined}
      onAction={onAction}
    />
  );
}

export function ErrorEmptyState({ message, onAction }: { message?: string; onAction?: () => void }) {
  return (
    <EmptyState
      icon="warning"
      title="Something went wrong"
      description={message || "An error occurred while loading the data. Please try again."}
      actionLabel={onAction ? "Try Again" : undefined}
      onAction={onAction}
    />
  );
}
