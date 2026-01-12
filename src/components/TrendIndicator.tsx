'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { theme } from '@/lib/theme';

interface TrendIndicatorProps {
  current: number;
  previous: number;
  format?: 'number' | 'percentage';
  inverse?: boolean; // If true, down is good and up is bad (e.g., for violations)
}

export default function TrendIndicator({ 
  current, 
  previous, 
  format = 'number',
  inverse = false 
}: TrendIndicatorProps) {
  // Calculate percentage change
  const calculateChange = () => {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
  };

  const change = calculateChange();
  const absChange = Math.abs(change);
  
  // Determine trend direction
  const isUp = change > 0;
  const isDown = change < 0;
  const isFlat = change === 0;

  // Determine if trend is good or bad
  const isGood = inverse ? isDown : isUp;
  const isBad = inverse ? isUp : isDown;

  // Get color based on trend
  const getColor = () => {
    if (isFlat) return theme.colors.neutral[600];
    if (isGood) return theme.colors.success[600];
    if (isBad) return theme.colors.error[600];
    return theme.colors.neutral[600];
  };

  // Get background color
  const getBackgroundColor = () => {
    if (isFlat) return theme.colors.neutral[100];
    if (isGood) return theme.colors.success[50];
    if (isBad) return theme.colors.error[50];
    return theme.colors.neutral[100];
  };

  // Get icon
  const getIcon = () => {
    if (isUp) return <TrendingUp className="w-4 h-4" />;
    if (isDown) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  // Format the change value
  const formatChange = () => {
    if (format === 'percentage') {
      return `${absChange.toFixed(1)}%`;
    }
    return absChange.toFixed(0);
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: theme.spacing[1],
        padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
        borderRadius: theme.borderRadius.full,
        backgroundColor: getBackgroundColor(),
        color: getColor(),
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.medium,
        transition: `all ${theme.transitions.duration.base} ${theme.transitions.timing.ease}`,
      }}
    >
      {getIcon()}
      <span>{formatChange()}</span>
    </div>
  );
}
