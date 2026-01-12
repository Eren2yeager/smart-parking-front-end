'use client';

import React from 'react';
import { theme } from '@/lib/theme';

/**
 * SkeletonLoader Component
 * 
 * Displays skeleton loading UI with shimmer animation while content is loading.
 * Supports different shapes: text, circle, and rectangle.
 */

export interface SkeletonLoaderProps {
  /**
   * Shape of the skeleton
   */
  variant?: 'text' | 'circle' | 'rectangle';
  
  /**
   * Width of the skeleton
   */
  width?: string | number;
  
  /**
   * Height of the skeleton
   */
  height?: string | number;
  
  /**
   * Additional CSS class name
   */
  className?: string;
  
  /**
   * Number of skeleton lines (for text variant)
   */
  lines?: number;
}

export function SkeletonLoader({
  variant = 'text',
  width,
  height,
  className = '',
  lines = 1,
}: SkeletonLoaderProps) {
  const getSkeletonStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      backgroundColor: theme.colors.neutral[200],
      borderRadius: variant === 'circle' ? theme.borderRadius.full : theme.borderRadius.base,
      position: 'relative',
      overflow: 'hidden',
    };

    if (variant === 'text') {
      return {
        ...baseStyle,
        width: width || '100%',
        height: height || '1rem',
        borderRadius: theme.borderRadius.base,
      };
    }

    if (variant === 'circle') {
      const size = width || height || '3rem';
      return {
        ...baseStyle,
        width: size,
        height: size,
        borderRadius: theme.borderRadius.full,
      };
    }

    // rectangle
    return {
      ...baseStyle,
      width: width || '100%',
      height: height || '10rem',
    };
  };

  const shimmerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: `linear-gradient(
      90deg,
      transparent 0%,
      ${theme.colors.neutral[50]} 50%,
      transparent 100%
    )`,
    animation: 'shimmer 1.5s infinite',
  };

  // Render multiple lines for text variant
  if (variant === 'text' && lines > 1) {
    return (
      <div className={className}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            style={{
              ...getSkeletonStyle(),
              marginBottom: index < lines - 1 ? theme.spacing[2] : 0,
              width: index === lines - 1 ? '80%' : '100%', // Last line is shorter
            }}
          >
            <div style={shimmerStyle} />
          </div>
        ))}
        <style jsx>{`
          @keyframes shimmer {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <div style={getSkeletonStyle()} className={className}>
        <div style={shimmerStyle} />
      </div>
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </>
  );
}

/**
 * SkeletonText Component
 * Convenience component for text skeletons
 */
export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return <SkeletonLoader variant="text" lines={lines} className={className} />;
}

/**
 * SkeletonCircle Component
 * Convenience component for circular skeletons (avatars, icons)
 */
export function SkeletonCircle({ size = '3rem', className = '' }: { size?: string | number; className?: string }) {
  return <SkeletonLoader variant="circle" width={size} height={size} className={className} />;
}

/**
 * SkeletonRectangle Component
 * Convenience component for rectangular skeletons (images, cards)
 */
export function SkeletonRectangle({
  width = '100%',
  height = '10rem',
  className = '',
}: {
  width?: string | number;
  height?: string | number;
  className?: string;
}) {
  return <SkeletonLoader variant="rectangle" width={width} height={height} className={className} />;
}

/**
 * SkeletonCard Component
 * Pre-built skeleton for card layouts
 */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        padding: theme.spacing[4],
        backgroundColor: theme.colors.background.paper,
        borderRadius: theme.borderRadius.lg,
        boxShadow: theme.shadows.base,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: theme.spacing[4] }}>
        <SkeletonCircle size="3rem" />
        <div style={{ marginLeft: theme.spacing[3], flex: 1 }}>
          <SkeletonLoader variant="text" width="60%" height="1.25rem" />
          <div style={{ marginTop: theme.spacing[2] }}>
            <SkeletonLoader variant="text" width="40%" height="0.875rem" />
          </div>
        </div>
      </div>
      <SkeletonRectangle height="12rem" />
      <div style={{ marginTop: theme.spacing[4] }}>
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}

/**
 * SkeletonTable Component
 * Pre-built skeleton for table layouts
 */
export function SkeletonTable({ rows = 5, columns = 4, className = '' }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={className}>
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: theme.spacing[4],
          padding: theme.spacing[3],
          backgroundColor: theme.colors.neutral[100],
          borderRadius: theme.borderRadius.base,
          marginBottom: theme.spacing[2],
        }}
      >
        {Array.from({ length: columns }).map((_, index) => (
          <SkeletonLoader key={index} variant="text" height="1rem" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: theme.spacing[4],
            padding: theme.spacing[3],
            borderBottom: `1px solid ${theme.colors.border.light}`,
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonLoader key={colIndex} variant="text" height="0.875rem" />
          ))}
        </div>
      ))}
    </div>
  );
}
