/**
 * Responsive Design Utilities
 * 
 * Provides breakpoint definitions, media query hooks, and utility functions
 * for implementing responsive design across the application.
 */

import { useState, useEffect } from 'react';

/**
 * Breakpoint definitions
 * Mobile: < 768px
 * Tablet: 768px - 1024px
 * Desktop: > 1024px
 */
export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
} as const;

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

/**
 * Get the current breakpoint based on window width
 */
export function getBreakpoint(width: number): Breakpoint {
  if (width < BREAKPOINTS.mobile) {
    return 'mobile';
  } else if (width < BREAKPOINTS.tablet) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

/**
 * Check if the current width matches a specific breakpoint
 */
export function isBreakpoint(width: number, breakpoint: Breakpoint): boolean {
  return getBreakpoint(width) === breakpoint;
}

/**
 * Check if the current width is mobile
 */
export function isMobile(width: number): boolean {
  return width < BREAKPOINTS.mobile;
}

/**
 * Check if the current width is tablet
 */
export function isTablet(width: number): boolean {
  return width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
}

/**
 * Check if the current width is desktop
 */
export function isDesktop(width: number): boolean {
  return width >= BREAKPOINTS.tablet;
}

/**
 * Custom hook to track window width
 */
export function useWindowWidth(): number {
  const [width, setWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return width;
}

/**
 * Custom hook to track the current breakpoint
 */
export function useBreakpoint(): Breakpoint {
  const width = useWindowWidth();
  return getBreakpoint(width);
}

/**
 * Custom hook to check if a media query matches
 * 
 * @param query - CSS media query string (e.g., "(min-width: 768px)")
 * @returns boolean indicating if the query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    
    // Set initial value
    setMatches(mediaQuery.matches);

    // Create event listener
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener (use deprecated addListener for older browsers)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // @ts-ignore - fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // @ts-ignore - fallback for older browsers
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [query]);

  return matches;
}

/**
 * Custom hook to check if viewport is mobile
 */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.mobile - 1}px)`);
}

/**
 * Custom hook to check if viewport is tablet
 */
export function useIsTablet(): boolean {
  return useMediaQuery(
    `(min-width: ${BREAKPOINTS.mobile}px) and (max-width: ${BREAKPOINTS.tablet - 1}px)`
  );
}

/**
 * Custom hook to check if viewport is desktop
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.tablet}px)`);
}

/**
 * Get responsive value based on current breakpoint
 * 
 * @param values - Object with values for each breakpoint
 * @param currentBreakpoint - Current breakpoint
 * @returns Value for the current breakpoint
 */
export function getResponsiveValue<T>(
  values: { mobile?: T; tablet?: T; desktop: T },
  currentBreakpoint: Breakpoint
): T {
  if (currentBreakpoint === 'mobile' && values.mobile !== undefined) {
    return values.mobile;
  }
  if (currentBreakpoint === 'tablet' && values.tablet !== undefined) {
    return values.tablet;
  }
  return values.desktop;
}

/**
 * Generate responsive CSS classes based on breakpoint
 */
export function getResponsiveClasses(
  baseClass: string,
  breakpoint: Breakpoint
): string {
  return `${baseClass} ${baseClass}--${breakpoint}`;
}

/**
 * Check if touch device
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - for older browsers
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * Get minimum touch target size (44x44px for accessibility)
 */
export const MIN_TOUCH_TARGET_SIZE = 44;

/**
 * Check if element meets minimum touch target size
 */
export function meetsTouchTargetSize(
  width: number,
  height: number
): boolean {
  return width >= MIN_TOUCH_TARGET_SIZE && height >= MIN_TOUCH_TARGET_SIZE;
}
