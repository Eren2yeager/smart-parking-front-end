'use client';

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
  Settings,
} from 'lucide-react';

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
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['admin'],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

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

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen">
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <ParkingSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Smart Parking</h2>
            <p className="text-xs text-gray-400">MCD System</p>
          </div>
        </div>

        <nav className="space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Role Badge */}
      {session?.user?.role && (
        <div className="absolute bottom-6 left-6 right-6">
          <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <p className="text-xs text-gray-400 mb-1">Current Role</p>
            <p className="text-sm font-semibold capitalize">
              {session.user.role}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
