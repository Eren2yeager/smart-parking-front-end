'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  ParkingSquare,
  Users,
  FileText,
  AlertTriangle,
  Bell,
  BarChart3,
  Menu,
  X,
} from 'lucide-react';
import { useIsMobile, useIsTablet, useIsDesktop } from '@/lib/responsive-utils';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Array<'admin' | 'operator' | 'viewer'>;
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'operator', 'viewer'],
  },
  {
    name: 'Parking Lots',
    href: '/parking-lots',
    icon: ParkingSquare,
    roles: ['admin', 'operator', 'viewer'],
  },
  {
    name: 'Contractors',
    href: '/contractors',
    icon: Users,
    roles: ['admin', 'operator', 'viewer'],
  },
  {
    name: 'Records',
    href: '/records',
    icon: FileText,
    roles: ['admin', 'operator', 'viewer'],
  },
  {
    name: 'Violations',
    href: '/violations',
    icon: AlertTriangle,
    roles: ['admin', 'operator', 'viewer'],
  },
  {
    name: 'Alerts',
    href: '/alerts',
    icon: Bell,
    roles: ['admin', 'operator', 'viewer'],
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    roles: ['admin', 'operator', 'viewer'],
  },
];

export default function ResponsiveSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Auto-collapse on tablet, auto-expand on desktop
  useEffect(() => {
    if (isDesktop) {
      setIsCollapsed(false);
      setIsOpen(false);
    } else if (isTablet) {
      setIsCollapsed(true);
      setIsOpen(false);
    } else if (isMobile) {
      setIsOpen(false);
    }
  }, [isMobile, isTablet, isDesktop]);

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter((item) => {
    if (!session?.user?.role) return false;
    return item.roles.includes(session.user.role);
  });

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setIsOpen(!isOpen);
    } else if (isTablet) {
      setIsCollapsed(!isCollapsed);
    }
  };

  const closeSidebar = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  // Render hamburger menu button for mobile and tablet
  const renderMenuButton = () => {
    if (isDesktop) return null;

    return (
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 bg-gray-900 text-white rounded-lg shadow-lg hover:bg-gray-800 transition-colors"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>
    );
  };

  // Render sidebar content
  const renderSidebarContent = () => {
    const showLabels = !isCollapsed || isMobile;

    return (
      <>
        <div className="p-6">
          <div className={`flex items-center mb-8 ${isCollapsed && !isMobile ? 'justify-center' : 'space-x-2'}`}>
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <ParkingSquare className="w-6 h-6" />
            </div>
            {showLabels && (
              <div>
                <h2 className="text-lg font-bold">Smart Parking</h2>
                <p className="text-xs text-gray-400">MCD System</p>
              </div>
            )}
          </div>

          <nav className="space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeSidebar}
                  className={`flex items-center px-4 py-3 rounded-lg transition ${
                    isCollapsed && !isMobile ? 'justify-center' : 'space-x-3'
                  } ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                  title={isCollapsed && !isMobile ? item.name : undefined}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {showLabels && <span className="font-medium">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Role Badge */}
        {session?.user?.role && showLabels && (
          <div className="absolute bottom-6 left-6 right-6">
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <p className="text-xs text-gray-400 mb-1">Current Role</p>
              <p className="text-sm font-semibold capitalize">
                {session.user.role}
              </p>
            </div>
          </div>
        )}

        {/* Collapse toggle for tablet */}
        {isTablet && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute bottom-6 right-6 p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <Menu className="w-4 h-4" />
            ) : (
              <X className="w-4 h-4" />
            )}
          </button>
        )}
      </>
    );
  };

  // Desktop: Fixed sidebar
  if (isDesktop) {
    return (
      <aside className="w-64 bg-gray-900 text-white min-h-screen fixed left-0 top-0 bottom-0 z-40">
        {renderSidebarContent()}
      </aside>
    );
  }

  // Tablet: Collapsible sidebar
  if (isTablet) {
    return (
      <>
        {renderMenuButton()}
        <aside
          className={`bg-gray-900 text-white min-h-screen fixed left-0 top-0 bottom-0 z-40 transition-all duration-300 ease-in-out ${
            isCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          {renderSidebarContent()}
        </aside>
      </>
    );
  }

  // Mobile: Hamburger menu with overlay
  return (
    <>
      {renderMenuButton()}
      
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity duration-300"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`w-64 bg-gray-900 text-white min-h-screen fixed left-0 top-0 bottom-0 z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderSidebarContent()}
      </aside>
    </>
  );
}
