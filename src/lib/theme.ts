/**
 * Design System Theme
 * 
 * Centralized theme configuration for consistent styling across the application.
 * Includes color palette, typography, spacing, shadows, and border radius.
 */

export const theme = {
  /**
   * Color Palette
   * Organized by semantic meaning for consistent usage
   */
  colors: {
    // Primary colors - main brand colors
    primary: {
      50: '#e3f2fd',
      100: '#bbdefb',
      200: '#90caf9',
      300: '#64b5f6',
      400: '#42a5f5',
      500: '#2196f3', // Main primary
      600: '#1e88e5',
      700: '#1976d2',
      800: '#1565c0',
      900: '#0d47a1',
    },
    
    // Secondary colors - accent colors
    secondary: {
      50: '#f3e5f5',
      100: '#e1bee7',
      200: '#ce93d8',
      300: '#ba68c8',
      400: '#ab47bc',
      500: '#9c27b0', // Main secondary
      600: '#8e24aa',
      700: '#7b1fa2',
      800: '#6a1b9a',
      900: '#4a148c',
    },
    
    // Success colors - positive actions and states
    success: {
      50: '#e8f5e9',
      100: '#c8e6c9',
      200: '#a5d6a7',
      300: '#81c784',
      400: '#66bb6a',
      500: '#4caf50', // Main success
      600: '#43a047',
      700: '#388e3c',
      800: '#2e7d32',
      900: '#1b5e20',
    },
    
    // Warning colors - caution states
    warning: {
      50: '#fff3e0',
      100: '#ffe0b2',
      200: '#ffcc80',
      300: '#ffb74d',
      400: '#ffa726',
      500: '#ff9800', // Main warning
      600: '#fb8c00',
      700: '#f57c00',
      800: '#ef6c00',
      900: '#e65100',
    },
    
    // Error colors - negative actions and states
    error: {
      50: '#ffebee',
      100: '#ffcdd2',
      200: '#ef9a9a',
      300: '#e57373',
      400: '#ef5350',
      500: '#f44336', // Main error
      600: '#e53935',
      700: '#d32f2f',
      800: '#c62828',
      900: '#b71c1c',
    },
    
    // Info colors - informational states
    info: {
      50: '#e1f5fe',
      100: '#b3e5fc',
      200: '#81d4fa',
      300: '#4fc3f7',
      400: '#29b6f6',
      500: '#03a9f4', // Main info
      600: '#039be5',
      700: '#0288d1',
      800: '#0277bd',
      900: '#01579b',
    },
    
    // Neutral colors - backgrounds, borders, text
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
    
    // Semantic color mappings for status indicators
    status: {
      good: '#4caf50',      // Green
      warning: '#ff9800',   // Yellow/Orange
      critical: '#f44336',  // Red
      offline: '#757575',   // Gray
      online: '#4caf50',    // Green
    },
    
    // Slot status colors for parking lot visualization
    slot: {
      empty: '#4caf50',     // Green
      occupied: '#f44336',  // Red
      reserved: '#ff9800',  // Orange
      disabled: '#9e9e9e',  // Gray
    },
    
    // Detection overlay colors
    detection: {
      plate: '#2196f3',     // Blue
      slot: '#4caf50',      // Green
      vehicle: '#ff9800',   // Orange
    },
    
    // Background colors
    background: {
      default: '#ffffff',
      paper: '#fafafa',
      dark: '#212121',
    },
    
    // Text colors
    text: {
      primary: '#212121',
      secondary: '#757575',
      disabled: '#bdbdbd',
      hint: '#9e9e9e',
      inverse: '#ffffff',
    },
    
    // Border colors
    border: {
      light: '#e0e0e0',
      main: '#bdbdbd',
      dark: '#757575',
    },
  },
  
  /**
   * Typography Scale
   * Font sizes, weights, and line heights for consistent text styling
   */
  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: 'Menlo, Monaco, "Courier New", monospace',
    },
    
    fontSize: {
      xs: '0.75rem',      // 12px
      sm: '0.875rem',     // 14px
      base: '1rem',       // 16px
      lg: '1.125rem',     // 18px
      xl: '1.25rem',      // 20px
      '2xl': '1.5rem',    // 24px
      '3xl': '1.875rem',  // 30px
      '4xl': '2.25rem',   // 36px
      '5xl': '3rem',      // 48px
      '6xl': '3.75rem',   // 60px
    },
    
    fontWeight: {
      thin: 100,
      extralight: 200,
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
      black: 900,
    },
    
    lineHeight: {
      none: 1,
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },
    
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
    },
  },
  
  /**
   * Spacing Scale
   * Based on 4px base unit for consistent spacing
   */
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
    32: '8rem',     // 128px
  },
  
  /**
   * Shadows
   * Elevation levels for depth and hierarchy
   */
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  },
  
  /**
   * Border Radius
   * Consistent corner rounding
   */
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    base: '0.25rem',  // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    '3xl': '1.5rem',  // 24px
    full: '9999px',   // Fully rounded
  },
  
  /**
   * Transitions
   * Consistent animation timing
   */
  transitions: {
    duration: {
      fast: '150ms',
      base: '200ms',
      slow: '300ms',
      slower: '500ms',
    },
    timing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
      linear: 'linear',
    },
  },
  
  /**
   * Breakpoints
   * Responsive design breakpoints
   */
  breakpoints: {
    mobile: '768px',
    tablet: '1024px',
    desktop: '1280px',
    wide: '1536px',
  },
  
  /**
   * Z-Index Scale
   * Layering hierarchy
   */
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
  
  /**
   * Focus Styles
   * Keyboard focus indicators for accessibility
   */
  focus: {
    // Default focus ring
    ring: {
      width: '2px',
      style: 'solid',
      color: '#2196f3', // Primary blue
      offset: '2px',
    },
    // High contrast focus ring
    ringHighContrast: {
      width: '3px',
      style: 'solid',
      color: '#0d47a1', // Darker blue
      offset: '2px',
    },
    // Focus ring for dark backgrounds
    ringInverse: {
      width: '2px',
      style: 'solid',
      color: '#ffffff',
      offset: '2px',
    },
    // Focus background for inputs
    background: 'rgba(33, 150, 243, 0.1)',
    // Focus outline (fallback)
    outline: '2px solid #2196f3',
    outlineOffset: '2px',
  },
} as const;

/**
 * Helper function to get status color
 */
export function getStatusColor(status: 'good' | 'warning' | 'critical' | 'offline' | 'online'): string {
  return theme.colors.status[status];
}

/**
 * Helper function to get slot status color
 */
export function getSlotStatusColor(status: 'empty' | 'occupied' | 'reserved' | 'disabled'): string {
  return theme.colors.slot[status];
}

/**
 * Helper function to get detection color
 */
export function getDetectionColor(type: 'plate' | 'slot' | 'vehicle'): string {
  return theme.colors.detection[type];
}

export type Theme = typeof theme;
export type ThemeColors = typeof theme.colors;
export type ThemeSpacing = typeof theme.spacing;
export type ThemeShadows = typeof theme.shadows;
export type ThemeBorderRadius = typeof theme.borderRadius;
