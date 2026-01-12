'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { theme } from '@/lib/theme';

/**
 * Button Component
 * 
 * Reusable button component with loading states, variants, and sizes.
 * Supports async operations with loading spinner.
 */

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Button variant
   */
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline' | 'ghost';
  
  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Loading state - shows spinner and disables button
   */
  loading?: boolean;
  
  /**
   * Full width button
   */
  fullWidth?: boolean;
  
  /**
   * Icon to display before text
   */
  icon?: React.ReactNode;
  
  /**
   * Icon to display after text
   */
  iconRight?: React.ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled = false,
  icon,
  iconRight,
  className = '',
  style,
  ...props
}: ButtonProps) {
  const getVariantStyles = () => {
    const variants = {
      primary: {
        backgroundColor: theme.colors.primary[500],
        color: theme.colors.text.inverse,
        border: 'none',
        hoverBackgroundColor: theme.colors.primary[600],
        activeBackgroundColor: theme.colors.primary[700],
      },
      secondary: {
        backgroundColor: theme.colors.secondary[500],
        color: theme.colors.text.inverse,
        border: 'none',
        hoverBackgroundColor: theme.colors.secondary[600],
        activeBackgroundColor: theme.colors.secondary[700],
      },
      success: {
        backgroundColor: theme.colors.success[600], // Updated for better contrast
        color: theme.colors.text.inverse,
        border: 'none',
        hoverBackgroundColor: theme.colors.success[700],
        activeBackgroundColor: theme.colors.success[800],
      },
      warning: {
        backgroundColor: theme.colors.warning[600], // Updated for better contrast
        color: theme.colors.text.inverse,
        border: 'none',
        hoverBackgroundColor: theme.colors.warning[700],
        activeBackgroundColor: theme.colors.warning[800],
      },
      error: {
        backgroundColor: theme.colors.error[600], // Updated for better contrast
        color: theme.colors.text.inverse,
        border: 'none',
        hoverBackgroundColor: theme.colors.error[700],
        activeBackgroundColor: theme.colors.error[800],
      },
      outline: {
        backgroundColor: 'transparent',
        color: theme.colors.primary[500],
        border: `1px solid ${theme.colors.primary[500]}`,
        hoverBackgroundColor: theme.colors.primary[50],
        activeBackgroundColor: theme.colors.primary[100],
      },
      ghost: {
        backgroundColor: 'transparent',
        color: theme.colors.text.primary,
        border: 'none',
        hoverBackgroundColor: theme.colors.neutral[100],
        activeBackgroundColor: theme.colors.neutral[200],
      },
    };
    
    return variants[variant];
  };

  const getSizeStyles = () => {
    const sizes = {
      sm: {
        padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
        fontSize: theme.typography.fontSize.sm,
        minHeight: '2rem',
      },
      md: {
        padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
        fontSize: theme.typography.fontSize.base,
        minHeight: '2.5rem',
      },
      lg: {
        padding: `${theme.spacing[4]} ${theme.spacing[6]}`,
        fontSize: theme.typography.fontSize.lg,
        minHeight: '3rem',
      },
    };
    
    return sizes[size];
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();
  const isDisabled = disabled || loading;

  const buttonStyle: React.CSSProperties = {
    ...variantStyles,
    ...sizeStyles,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[2],
    fontWeight: theme.typography.fontWeight.medium,
    borderRadius: theme.borderRadius.md,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.6 : 1,
    transition: `all ${theme.transitions.duration.fast} ${theme.transitions.timing.ease}`,
    width: fullWidth ? '100%' : 'auto',
    fontFamily: theme.typography.fontFamily.sans,
    ...style,
  };

  const [isHovered, setIsHovered] = React.useState(false);
  const [isActive, setIsActive] = React.useState(false);

  const currentStyle = {
    ...buttonStyle,
    backgroundColor: isActive && !isDisabled
      ? variantStyles.activeBackgroundColor
      : isHovered && !isDisabled
      ? variantStyles.hoverBackgroundColor
      : variantStyles.backgroundColor,
  };

  return (
    <button
      {...props}
      disabled={isDisabled}
      style={currentStyle}
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsActive(false);
      }}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
    >
      {loading && (
        <Loader2
          style={{
            width: size === 'sm' ? '1rem' : size === 'lg' ? '1.25rem' : '1.125rem',
            height: size === 'sm' ? '1rem' : size === 'lg' ? '1.25rem' : '1.125rem',
            animation: 'spin 1s linear infinite',
          }}
        />
      )}
      {!loading && icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {children}
      {!loading && iconRight && <span style={{ display: 'flex', alignItems: 'center' }}>{iconRight}</span>}
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </button>
  );
}

/**
 * IconButton Component
 * Button with only an icon, no text
 */
export interface IconButtonProps extends Omit<ButtonProps, 'icon' | 'iconRight'> {
  icon: React.ReactNode;
  'aria-label': string;
}

export function IconButton({
  icon,
  size = 'md',
  loading = false,
  ...props
}: IconButtonProps) {
  const sizeMap = {
    sm: '2rem',
    md: '2.5rem',
    lg: '3rem',
  };

  return (
    <Button
      {...props}
      size={size}
      loading={loading}
      style={{
        width: sizeMap[size],
        height: sizeMap[size],
        padding: 0,
        ...props.style,
      }}
    >
      {!loading && icon}
    </Button>
  );
}
