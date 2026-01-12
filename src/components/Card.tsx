'use client';

import React from 'react';
import { theme } from '@/lib/theme';

/**
 * Card Component
 * 
 * Reusable card component with hover effects and consistent styling.
 * Supports interactive and non-interactive variants.
 */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether the card is interactive (clickable)
   */
  interactive?: boolean;
  
  /**
   * Card variant
   */
  variant?: 'default' | 'outlined' | 'elevated';
  
  /**
   * Padding size
   */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  
  /**
   * Whether to show hover effect
   */
  hoverable?: boolean;
}

export function Card({
  children,
  interactive = false,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  className = '',
  style,
  onClick,
  ...props
}: CardProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const getVariantStyles = () => {
    const variants = {
      default: {
        backgroundColor: theme.colors.background.paper,
        border: 'none',
        boxShadow: theme.shadows.base,
      },
      outlined: {
        backgroundColor: theme.colors.background.default,
        border: `1px solid ${theme.colors.border.light}`,
        boxShadow: 'none',
      },
      elevated: {
        backgroundColor: theme.colors.background.paper,
        border: 'none',
        boxShadow: theme.shadows.md,
      },
    };
    
    return variants[variant];
  };

  const getPaddingStyles = () => {
    const paddings = {
      none: '0',
      sm: theme.spacing[3],
      md: theme.spacing[4],
      lg: theme.spacing[6],
    };
    
    return paddings[padding];
  };

  const variantStyles = getVariantStyles();
  const isInteractive = interactive || hoverable || !!onClick;

  const cardStyle: React.CSSProperties = {
    ...variantStyles,
    padding: getPaddingStyles(),
    borderRadius: theme.borderRadius.lg,
    cursor: isInteractive ? 'pointer' : 'default',
    transition: `all ${theme.transitions.duration.base} ${theme.transitions.timing.easeInOut}`,
    boxShadow: isHovered && isInteractive
      ? variant === 'elevated'
        ? theme.shadows.lg
        : theme.shadows.md
      : variantStyles.boxShadow,
    transform: isHovered && isInteractive ? 'translateY(-2px)' : 'translateY(0)',
    ...style,
  };

  return (
    <div
      {...props}
      style={cardStyle}
      className={className}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </div>
  );
}

/**
 * Link Component
 * 
 * Styled link with hover effects
 */
export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /**
   * Link variant
   */
  variant?: 'primary' | 'secondary' | 'muted';
  
  /**
   * Whether to show underline
   */
  underline?: 'none' | 'hover' | 'always';
}

export function Link({
  children,
  variant = 'primary',
  underline = 'hover',
  className = '',
  style,
  ...props
}: LinkProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const getVariantStyles = () => {
    const variants = {
      primary: {
        color: theme.colors.primary[500],
        hoverColor: theme.colors.primary[700],
      },
      secondary: {
        color: theme.colors.secondary[500],
        hoverColor: theme.colors.secondary[700],
      },
      muted: {
        color: theme.colors.text.secondary,
        hoverColor: theme.colors.text.primary,
      },
    };
    
    return variants[variant];
  };

  const variantStyles = getVariantStyles();

  const getTextDecoration = () => {
    if (underline === 'always') return 'underline';
    if (underline === 'hover' && isHovered) return 'underline';
    return 'none';
  };

  const linkStyle: React.CSSProperties = {
    color: isHovered ? variantStyles.hoverColor : variantStyles.color,
    textDecoration: getTextDecoration(),
    cursor: 'pointer',
    transition: `all ${theme.transitions.duration.fast} ${theme.transitions.timing.ease}`,
    fontWeight: theme.typography.fontWeight.medium,
    ...style,
  };

  return (
    <a
      {...props}
      style={linkStyle}
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </a>
  );
}

/**
 * InteractiveIcon Component
 * 
 * Icon wrapper with hover effects
 */
export interface InteractiveIconProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Icon element
   */
  icon: React.ReactNode;
  
  /**
   * Size of the icon container
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Color variant
   */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
}

export function InteractiveIcon({
  icon,
  size = 'md',
  variant = 'default',
  className = '',
  style,
  onClick,
  ...props
}: InteractiveIconProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const getSizeStyles = () => {
    const sizes = {
      sm: {
        width: '2rem',
        height: '2rem',
        iconSize: '1rem',
      },
      md: {
        width: '2.5rem',
        height: '2.5rem',
        iconSize: '1.25rem',
      },
      lg: {
        width: '3rem',
        height: '3rem',
        iconSize: '1.5rem',
      },
    };
    
    return sizes[size];
  };

  const getVariantStyles = () => {
    const variants = {
      default: {
        color: theme.colors.text.primary,
        hoverBackgroundColor: theme.colors.neutral[100],
      },
      primary: {
        color: theme.colors.primary[500],
        hoverBackgroundColor: theme.colors.primary[50],
      },
      success: {
        color: theme.colors.success[500],
        hoverBackgroundColor: theme.colors.success[50],
      },
      warning: {
        color: theme.colors.warning[500],
        hoverBackgroundColor: theme.colors.warning[50],
      },
      error: {
        color: theme.colors.error[500],
        hoverBackgroundColor: theme.colors.error[50],
      },
    };
    
    return variants[variant];
  };

  const sizeStyles = getSizeStyles();
  const variantStyles = getVariantStyles();

  const iconStyle: React.CSSProperties = {
    width: sizeStyles.width,
    height: sizeStyles.height,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
    cursor: onClick ? 'pointer' : 'default',
    color: variantStyles.color,
    backgroundColor: isHovered ? variantStyles.hoverBackgroundColor : 'transparent',
    transition: `all ${theme.transitions.duration.fast} ${theme.transitions.timing.ease}`,
    ...style,
  };

  return (
    <div
      {...props}
      style={iconStyle}
      className={className}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {icon}
    </div>
  );
}
