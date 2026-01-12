import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResponsiveSidebar from '@/components/ResponsiveSidebar';
import * as responsiveUtils from '@/lib/responsive-utils';

// Mock responsive hooks
vi.mock('@/lib/responsive-utils', () => ({
  useIsMobile: vi.fn(),
  useIsTablet: vi.fn(),
  useIsDesktop: vi.fn(),
}));

describe('ResponsiveSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders fixed sidebar on desktop', () => {
    vi.mocked(responsiveUtils.useIsMobile).mockReturnValue(false);
    vi.mocked(responsiveUtils.useIsTablet).mockReturnValue(false);
    vi.mocked(responsiveUtils.useIsDesktop).mockReturnValue(true);

    const { container } = render(<ResponsiveSidebar />);
    
    const sidebar = container.querySelector('aside');
    expect(sidebar).toBeTruthy();
    expect(sidebar?.className).toContain('w-64');
    expect(sidebar?.className).toContain('fixed');
  });

  it('renders collapsible sidebar on tablet', () => {
    vi.mocked(responsiveUtils.useIsMobile).mockReturnValue(false);
    vi.mocked(responsiveUtils.useIsTablet).mockReturnValue(true);
    vi.mocked(responsiveUtils.useIsDesktop).mockReturnValue(false);

    render(<ResponsiveSidebar />);
    
    const menuButton = screen.getByLabelText(/open menu|close menu/i);
    expect(menuButton).toBeTruthy();
  });

  it('renders hamburger menu on mobile', () => {
    vi.mocked(responsiveUtils.useIsMobile).mockReturnValue(true);
    vi.mocked(responsiveUtils.useIsTablet).mockReturnValue(false);
    vi.mocked(responsiveUtils.useIsDesktop).mockReturnValue(false);

    render(<ResponsiveSidebar />);
    
    const menuButton = screen.getByLabelText(/open menu/i);
    expect(menuButton).toBeTruthy();
  });

  it('toggles mobile menu when hamburger clicked', () => {
    vi.mocked(responsiveUtils.useIsMobile).mockReturnValue(true);
    vi.mocked(responsiveUtils.useIsTablet).mockReturnValue(false);
    vi.mocked(responsiveUtils.useIsDesktop).mockReturnValue(false);

    const { container } = render(<ResponsiveSidebar />);
    
    const menuButton = screen.getByLabelText(/open menu/i);
    fireEvent.click(menuButton);
    
    // Check if sidebar is visible (not translated)
    const sidebar = container.querySelector('aside');
    expect(sidebar?.className).toContain('translate-x-0');
  });

  it('displays navigation items for authenticated user', () => {
    vi.mocked(responsiveUtils.useIsMobile).mockReturnValue(false);
    vi.mocked(responsiveUtils.useIsTablet).mockReturnValue(false);
    vi.mocked(responsiveUtils.useIsDesktop).mockReturnValue(true);

    render(<ResponsiveSidebar />);
    
    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByText('Parking Lots')).toBeTruthy();
    expect(screen.getByText('Contractors')).toBeTruthy();
  });

  it('displays user role badge', () => {
    vi.mocked(responsiveUtils.useIsMobile).mockReturnValue(false);
    vi.mocked(responsiveUtils.useIsTablet).mockReturnValue(false);
    vi.mocked(responsiveUtils.useIsDesktop).mockReturnValue(true);

    render(<ResponsiveSidebar />);
    
    expect(screen.getByText('Current Role')).toBeTruthy();
    expect(screen.getByText('admin')).toBeTruthy();
  });
});
