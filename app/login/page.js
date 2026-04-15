'use client';

export const dynamic = 'force-dynamic';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

const LOCAL_DEV_USERNAME = 'admin';
const LOCAL_DEV_PASSWORD = 'setorin123';
const LOCAL_DEV_USER = {
  id: 'local-dev-user',
  email: 'user@local.setorin',
  name: 'Local User',
  photo_url: null,
  points: 0,
  role: 'user',
  tier: 'Perintis',
};

function LoginContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();

  const getNextPath = () => {
    const next = searchParams.get('next') || '/';
    return next.startsWith('/') ? next : '/';
  };

  const resolveBrowserApiBases = () => {
    return [
      process.env.NEXT_PUBLIC_BROWSER_API_URL,
      process.env.NEXT_PUBLIC_CONTAINER_API_URL,
      'http://localhost:8000',
      'http://127.0.0.1:8000',
    ].filter(Boolean);
  };

  const performLocalLogin = async (endpoint, payload) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.detail || data?.error || 'Login gagal');
    }

    return data;
  };

  const createLocalDevToken = () => {
    const now = Math.floor(Date.now() / 1000);
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      sub: LOCAL_DEV_USER.id,
      email: LOCAL_DEV_USER.email,
      role: LOCAL_DEV_USER.role,
      iss: 'setorin-local-dev',
      exp: now + (7 * 24 * 60 * 60),
    }));

    return `${header}.${payload}.local-dev`;
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Build Google OAuth URL with frontend callback
      const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      googleAuthUrl.searchParams.set('client_id', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
      googleAuthUrl.searchParams.set('redirect_uri', process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI);
      googleAuthUrl.searchParams.set('response_type', 'code');
      googleAuthUrl.searchParams.set('scope', 'openid email profile');
      googleAuthUrl.searchParams.set('access_type', 'offline');
      googleAuthUrl.searchParams.set('state', encodeURIComponent(getNextPath()));
      
      // Redirect to Google OAuth
      window.location.href = googleAuthUrl.toString();
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
    }
  };

  const handleLocalLogin = async (event) => {
    event.preventDefault();

    if (!username.trim() || !password) {
      setError('Username dan password wajib diisi.');
      return;
    }

    setFormLoading(true);
    setError('');

    try {
      const payload = {
        username: username.trim(),
        password,
      };

      let data;

      try {
        data = await performLocalLogin('/api/auth/login', payload);
      } catch (proxyError) {
        let loggedIn = false;
        const directErrors = [];

        for (const base of resolveBrowserApiBases()) {
          try {
            data = await performLocalLogin(`${base}/auth/login`, payload);
            loggedIn = true;
            break;
          } catch (directError) {
            directErrors.push(`${base}: ${directError.message || 'Login gagal'}`);
          }
        }

        if (!loggedIn) {
          if (payload.username === LOCAL_DEV_USERNAME && payload.password === LOCAL_DEV_PASSWORD) {
            data = {
              user: LOCAL_DEV_USER,
              access_token: createLocalDevToken(),
            };
          } else {
            const proxyMessage = proxyError?.message || 'Login gagal';
            const fallbackMessage = directErrors.length ? ` | ${directErrors.join(' | ')}` : '';
            throw new Error(`${proxyMessage}${fallbackMessage}`);
          }
        }
      }

      login(data.user, data.access_token);

      let nextPath = getNextPath();
      if (data.user?.role === 'admin' && nextPath === '/') {
        nextPath = '/admin';
      }

      router.push(nextPath);
    } catch (loginError) {
      console.error('Local login error:', loginError);
      setError(loginError.message || 'Login gagal');
    } finally {
      setFormLoading(false);
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

      <div className="mt-6 mb-12 space-y-4">
        <form
          onSubmit={handleLocalLogin}
          className="rounded-[28px] border border-[color:var(--color-primary-700)]/15 bg-white p-4 shadow-sm space-y-3"
        >
          <div>
            <label htmlFor="username" className="block text-[13px] font-medium text-[color:var(--foreground)]/80">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-[color:var(--color-primary-700)]/15 px-4 py-3 outline-none focus:border-[color:var(--color-primary-600)] focus:ring-2 focus:ring-[color:var(--color-primary-600)]/20"
              placeholder="Masukkan username"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-[13px] font-medium text-[color:var(--foreground)]/80">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-[color:var(--color-primary-700)]/15 px-4 py-3 outline-none focus:border-[color:var(--color-primary-600)] focus:ring-2 focus:ring-[color:var(--color-primary-600)]/20"
              placeholder="Masukkan password"
            />
          </div>

          {error ? (
            <p className="text-[13px] text-red-600">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={formLoading}
            className="w-full inline-flex items-center justify-center gap-3 py-4 px-5 rounded-[var(--radius-pill)] text-white bg-[color:var(--color-primary-700)] hover:bg-[color:var(--color-primary-600)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-primary-600)] disabled:opacity-60 disabled:pointer-events-none"
          >
            <span className="text-[14px] leading-5 font-medium">
              {formLoading ? 'Memproses…' : 'Masuk dengan Username'}
            </span>
          </button>
        </form>

        <div className="flex items-center gap-3 text-[12px] uppercase tracking-[0.24em] text-[color:var(--color-muted)]">
          <div className="h-px flex-1 bg-[color:var(--color-primary-700)]/10" />
          <span>atau</span>
          <div className="h-px flex-1 bg-[color:var(--color-primary-700)]/10" />
        </div>

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
