'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const error = searchParams.get('error');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await signIn('google', {
        callbackUrl,
        redirect: true,
      });
    } catch (error) {
      console.error('Sign in error:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Smart Parking Management
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Municipal Corporation Parking Monitoring System
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="text-sm">
              {error === 'OAuthSignin' && 'Error occurred during sign in. Please try again.'}
              {error === 'OAuthCallback' && 'Error occurred during authentication. Please try again.'}
              {error === 'OAuthCreateAccount' && 'Could not create account. Please contact support.'}
              {error === 'EmailCreateAccount' && 'Could not create account. Please contact support.'}
              {error === 'Callback' && 'Authentication callback error. Please try again.'}
              {error === 'OAuthAccountNotLinked' && 'Account already exists with different provider.'}
              {error === 'SessionRequired' && 'Please sign in to access this page.'}
              {error === 'Default' && 'An error occurred. Please try again.'}
            </p>
          </div>
        )}

        {/* Sign In Section */}
        <div className="mt-8 space-y-6">
          <div>
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              <span className="text-sm font-medium text-gray-700">
                {isLoading ? 'Signing in...' : 'Sign in with Google'}
              </span>
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-gray-700">
              Authorized Personnel Only
            </p>
            <p className="text-xs text-gray-500">
              This system is for Municipal Corporation officials only.
              Unauthorized access is prohibited.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
