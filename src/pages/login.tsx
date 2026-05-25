import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';

import { hasAdminSession } from '../lib/adminAuth';

type LoginPageProps = {
  csrfToken: string | null;
};

export default function Login({ csrfToken }: LoginPageProps) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTarget = typeof router.query.redirect === 'string' ? router.query.redirect : '/admin';

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }

    const response = await fetch('/api/login', {
      method: 'POST',
      headers,
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      await router.push(redirectTarget);
      return;
    }

    const data = await response.json().catch(() => ({ message: 'Login failed' }));
    setError(data.message ?? 'Login failed');
    setIsSubmitting(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <form onSubmit={handleLogin} className="w-full max-w-sm rounded bg-white p-8 shadow-md">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Admin Login</h1>
        <p className="mb-6 text-sm text-gray-600">Use the configured admin credentials to access the internal dashboard.</p>

        <label className="mb-4 block">
          <span className="mb-2 block text-sm font-medium text-gray-700">Username</span>
          <input
            type="text"
            className="w-full rounded border border-gray-300 p-2"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label className="mb-3 block">
          <span className="mb-2 block text-sm font-medium text-gray-700">Password</span>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className="w-full rounded border border-gray-300 p-2 pr-12"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 px-3 text-sm text-gray-500"
              onMouseDown={() => setShowPassword(true)}
              onMouseUp={() => setShowPassword(false)}
              onMouseLeave={() => setShowPassword(false)}
              onTouchStart={() => setShowPassword(true)}
              onTouchEnd={() => setShowPassword(false)}
              onTouchCancel={() => setShowPassword(false)}
              onKeyDown={(event) => {
                if (event.key === ' ' || event.key === 'Enter') {
                  event.preventDefault();
                  setShowPassword(true);
                }
              }}
              onKeyUp={(event) => {
                if (event.key === ' ' || event.key === 'Enter') {
                  setShowPassword(false);
                }
              }}
              aria-label="Peek password"
            >
              Peek
            </button>
          </div>
        </label>

        <div className="mb-4 text-right">
          <Link href="/forgot-password" className="text-sm font-medium text-blue-600 transition hover:text-blue-700 hover:underline">
            Forgot password?
          </Link>
        </div>

        {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Signing in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<LoginPageProps> = async ({ req }) => {
  if (hasAdminSession(req.headers.cookie)) {
    return {
      redirect: {
        destination: '/admin',
        permanent: false,
      },
    };
  }

  return {
    props: {
      csrfToken: process.env.CSRF_TOKEN ?? null,
    },
  };
};
