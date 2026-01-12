'use client';

import { useSession, signOut } from 'next-auth/react';
import { Bell, LogOut, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function Navbar() {
  const { data: session } = useSession();
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    // Fetch active alerts count
    const fetchActiveAlerts = async () => {
      try {
        const response = await fetch('/api/alerts/active');
        if (response.ok) {
          const data = await response.json();
          setActiveAlertsCount(data.length || 0);
        }
      } catch (error) {
        console.error('Failed to fetch active alerts:', error);
      }
    };

    fetchActiveAlerts();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchActiveAlerts, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-900">
            Smart Parking Management
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          {/* Active Alerts Badge */}
          <button
            className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            title="Active Alerts"
            aria-label={`Active alerts: ${activeAlertsCount}`}
          >
            <Bell className="w-5 h-5" aria-hidden="true" />
            {activeAlertsCount > 0 && (
              <span 
                className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full"
                aria-label={`${activeAlertsCount} active alerts`}
              >
                {activeAlertsCount}
              </span>
            )}
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-lg transition"
            >
              {session?.user?.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" aria-hidden="true" />
                </div>
              )}
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">
                  {session?.user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {session?.user?.role || 'viewer'}
                </p>
              </div>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">
                    {session?.user?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {session?.user?.email}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
