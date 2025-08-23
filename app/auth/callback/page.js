'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

function AuthCallbackContent() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const hasProcessed = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent duplicate processing using ref
      if (hasProcessed.current) {
        return;
      }

      // If user is already authenticated, redirect immediately
      if (user) {
        router.push('/');
        return;
      }

      // Get the authorization code and state (next path) from URL params
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      
      // If no code, don't process (might be initial render)
      if (!code) {
        return;
      }

      try {
        hasProcessed.current = true;

        // Exchange code for token via backend
        const response = await fetch(`/api/auth/google/callback?code=${code}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          let details = '';
          try {
            const err = await response.json();
            details = err?.error || err?.detail || JSON.stringify(err);
          } catch {}
          throw new Error(`Auth failed (${response.status}): ${details || 'Unknown error'}`);
        }

        const data = await response.json();

        // Use AuthContext to login
        login(data.user, data.access_token);

        setStatus('success');

        // Determine next path from state (if present)
        let nextPath = '/';
        try {
          if (state) {
            const decoded = decodeURIComponent(state);
            if (decoded.startsWith('/')) nextPath = decoded;
          }
        } catch {}

        // Check if user is admin and redirect to admin panel
        // Only redirect to admin if no specific next path was provided
        if (data.user?.role === 'admin' && nextPath === '/') {
          nextPath = '/admin';
        }

        // Redirect after short delay to allow auth context to update
        setTimeout(() => {
          router.push(nextPath);
        }, 1000);
        
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err.message);
        setStatus('error');
      }
    };

    handleCallback();

    // Cleanup function to handle component unmounting
    return () => {
      hasProcessed.current = false;
    };
  }, [searchParams, router, login, user]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto"></div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Completing authentication...</h2>
          <p className="mt-2 text-gray-600">Please wait while we complete your sign-in</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Authentication failed</h2>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-semibold text-gray-900">Authentication successful!</h2>
        <p className="mt-2 text-gray-600">Redirecting to Setorin...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto"></div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Loading...</h2>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
