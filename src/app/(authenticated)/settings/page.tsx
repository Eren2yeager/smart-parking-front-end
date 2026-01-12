'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Settings as SettingsIcon, Users, Loader2, AlertCircle } from 'lucide-react';
import SettingsForm from '@/components/SettingsForm';
import UserManagement from '@/components/UserManagement';

interface Settings {
  _id: string;
  alertThresholds: {
    capacityWarning: number;
    cameraOfflineTimeout: number;
  };
  pythonBackend: {
    httpUrl: string;
    wsUrl: string;
  };
  cameras: {
    gateFrameSkip: number;
    lotFrameSkip: number;
  };
  updatedAt: string;
  updatedBy: string;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'system' | 'users'>('system');

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    // Redirect non-admin users
    if (status === 'authenticated' && !isAdmin) {
      router.push('/dashboard');
    }
  }, [status, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
    }
  }, [isAdmin]);

  const fetchSettings = async () => {
    try {
      setError(null);
      setLoading(true);

      const response = await fetch('/api/settings');

      if (!response.ok) {
        if (response.status === 403) {
          setError('You do not have permission to access settings');
          return;
        }
        throw new Error('Failed to fetch settings');
      }

      const result = await response.json();
      setSettings(result.data);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsUpdate = () => {
    fetchSettings();
  };

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Don't render anything if not admin (will redirect)
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Configure system settings and manage user permissions</p>
      </div>

      {/* Access Denied Error */}
      {error && error.includes('permission') && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Access Denied</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      {!error?.includes('permission') && (
        <>
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('system')}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition ${
                    activeTab === 'system'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <SettingsIcon className="w-5 h-5" />
                  System Settings
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition ${
                    activeTab === 'users'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  User Management
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* System Settings Tab */}
              {activeTab === 'system' && (
                <>
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                  ) : error && !error.includes('permission') ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                      <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                      <p className="text-red-800 font-medium mb-2">Error Loading Settings</p>
                      <p className="text-red-700 text-sm mb-4">{error}</p>
                      <button
                        onClick={fetchSettings}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                      >
                        Retry
                      </button>
                    </div>
                  ) : settings ? (
                    <SettingsForm
                      initialData={settings}
                      onSuccess={handleSettingsUpdate}
                    />
                  ) : null}
                </>
              )}

              {/* User Management Tab */}
              {activeTab === 'users' && (
                <UserManagement currentUserId={session?.user?.id} />
              )}
            </div>
          </div>

          {/* Admin Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Admin Access:</strong> This page is only accessible to users with the admin
              role. Changes to system settings will affect all users and parking lots.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
