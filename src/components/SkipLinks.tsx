'use client';

import React from 'react';
import { theme } from '@/lib/theme';

/**
 * SkipLinks Component
 * 
 * Provides skip navigation links for keyboard users and screen reader users.
 * These links are visually hidden until focused, allowing users to bypass
 * repetitive navigation and jump directly to main content.
 * 
 * This is a WCAG 2.1 Level A requirement (2.4.1 Bypass Blocks).
 */

export interface SkipLink {
  /**
   * Link text
   */
  label: string;
  
  /**
   * Target element ID (without #)
   */
  target: string;
}

export interface SkipLinksProps {
  /**
   * Array of skip links to display
   */
  links?: SkipLink[];
}

const defaultLinks: SkipLink[] = [
  { label: 'Skip to main content', target: 'main-content' },
  { label: 'Skip to navigation', target: 'main-navigation' },
];

export function SkipLinks({ links = defaultLinks }: SkipLinksProps) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>, target: string) => {
    event.preventDefault();
    
    const element = document.getElementById(target);
    if (element) {
      element.focus();
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const linkStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-100px',
    left: theme.spacing[4],
    padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
    backgroundColor: theme.colors.primary[600],
    color: theme.colors.text.inverse,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    textDecoration: 'none',
    borderRadius: theme.borderRadius.md,
    boxShadow: theme.shadows.lg,
    zIndex: theme.zIndex.tooltip + 1,
    transition: `top ${theme.transitions.duration.fast} ${theme.transitions.timing.ease}`,
  };

  const linkFocusStyle: React.CSSProperties = {
    ...linkStyle,
    top: theme.spacing[4],
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: theme.zIndex.tooltip + 1,
      }}
      aria-label="Skip navigation links"
    >
      {links.map((link, index) => (
        <a
          key={index}
          href={`#${link.target}`}
          onClick={(e) => handleClick(e, link.target)}
          style={linkStyle}
          onFocus={(e) => {
            Object.assign(e.currentTarget.style, linkFocusStyle);
          }}
          onBlur={(e) => {
            Object.assign(e.currentTarget.style, linkStyle);
          }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

/**
 * MainContent Component
 * 
 * Wrapper for main content area with proper ID for skip links.
 * Makes the content focusable for keyboard navigation.
 */

export interface MainContentProps {
  /**
   * Content to display
   */
  children: React.ReactNode;
  
  /**
   * Custom ID (defaults to 'main-content')
   */
  id?: string;
  
  /**
   * Additional CSS class name
   */
  className?: string;
  
  /**
   * Additional inline styles
   */
  style?: React.CSSProperties;
}

export function MainContent({
  children,
  id = 'main-content',
  className = '',
  style,
}: MainContentProps) {
  return (
    <main
      id={id}
      tabIndex={-1}
      className={className}
      style={{
        outline: 'none',
        ...style,
      }}
    >
      {children}
    </main>
  );
}

/**
 * NavigationLandmark Component
 * 
 * Wrapper for navigation area with proper ID for skip links.
 */

export interface NavigationLandmarkProps {
  /**
   * Navigation content
   */
  children: React.ReactNode;
  
  /**
   * Custom ID (defaults to 'main-navigation')
   */
  id?: string;
  
  /**
   * Accessible label for the navigation
   */
  ariaLabel?: string;
  
  /**
   * Additional CSS class name
   */
  className?: string;
  
  /**
   * Additional inline styles
   */
  style?: React.CSSProperties;
}

export function NavigationLandmark({
  children,
  id = 'main-navigation',
  ariaLabel = 'Main navigation',
  className = '',
  style,
}: NavigationLandmarkProps) {
  return (
    <nav
      id={id}
      aria-label={ariaLabel}
      className={className}
      style={style}
    >
      {children}
    </nav>
  );
}

export default SkipLinks;
