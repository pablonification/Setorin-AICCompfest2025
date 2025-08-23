'use client';

export const dynamic = 'force-dynamic';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function LoginContent() {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      // Build Google OAuth URL with frontend callback
      const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      googleAuthUrl.searchParams.set('client_id', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
      googleAuthUrl.searchParams.set('redirect_uri', process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI);
      googleAuthUrl.searchParams.set('response_type', 'code');
      googleAuthUrl.searchParams.set('scope', 'openid email profile');
      googleAuthUrl.searchParams.set('access_type', 'offline');
      // Preserve intended next page (default '/') using OAuth 'state'
      const next = searchParams.get('next') || '/';
      // Only allow internal relative paths
      const safeNext = next.startsWith('/') ? next : '/';
      googleAuthUrl.searchParams.set('state', encodeURIComponent(safeNext));
      
      // Redirect to Google OAuth
      window.location.href = googleAuthUrl.toString();
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter flex flex-col pt-4 pb-12 px-4">
      <div className="flex-1 flex items-center justify-center">
        <img
          src="/login-hero.svg"
          alt="Setorin illustration"
          className="w-[80%] max-w-[360px] h-auto"
        />
      </div>

      <div className="mt-2">
        <img src="/login-logo.svg" alt="Setorin" className="h-[24px] w-auto" />

        <h1 className="mt-2 text-4xl font-bold text-[color:var(--color-primary-700)]">
          Selamat datang,
          <br />
          Agen Perubahan!
        </h1>

        <p className="mt-3 text-[14px] leading-5 text-[color:var(--foreground)]/80">
          Masuk untuk mulai mengubah sampahmu jadi saldo. Semudah itu.
        </p>
      </div>

      <div className="mt-6">
        <button
          aria-label="Masuk dengan Google"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full inline-flex items-center justify-center gap-3 py-4 px-5 rounded-[var(--radius-pill)] text-white bg-[color:var(--color-primary-700)] hover:bg-[color:var(--color-primary-600)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-primary-600)] disabled:opacity-60 disabled:pointer-events-none"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Memproses…</span>
            </>
          ) : (
            <>
              <img src="/login-google.svg" alt="Google" className="w-4 h-4" />
              <span className="text-[14px] leading-5 font-medium">Masuk dengan Google</span>
            </>
          )}
        </button>

        <p className="mt-4 text-center text-[12px] leading-4 text-[color:var(--color-muted)]">
          Dengan masuk, Anda menyetujui{' '}
          <a
            href="/ketentuan-layanan"
            className="text-[color:var(--color-primary-600)] hover:text-[color:var(--color-primary-700)] underline"
          >
            Ketentuan Layanan
          </a>{' '}
          kami.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
