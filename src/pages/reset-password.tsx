import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';

import { hasAdminSession } from '../lib/adminAuth';

type ResetPasswordPageProps = {
  csrfToken: string | null;
  token: string;
};

const MIN_PASSWORD_LENGTH = 12;

export default function ResetPasswordPage({ csrfToken, token }: ResetPasswordPageProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError('This reset link is invalid or incomplete.');
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for the new password.`);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }

    const response = await fetch('/api/password-reset/confirm', {
      method: 'POST',
      headers,
      body: JSON.stringify({ token, password, confirmPassword }),
    });

    const data = await response.json().catch(() => ({ message: 'Unable to reset password.' }));

    if (!response.ok) {
      setError(data.message ?? 'Unable to reset password.');
      setIsSubmitting(false);
      return;
    }

    await router.push(typeof data.redirect === 'string' ? data.redirect : '/admin');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm rounded bg-white p-8 shadow-md">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Choose a New Password</h1>
        <p className="mb-6 text-sm text-gray-600">Reset links expire after 30 minutes and can only be used once.</p>

        {token ? (
          <form onSubmit={handleSubmit}>
            <label className="mb-4 block">
              <span className="mb-2 block text-sm font-medium text-gray-700">New password</span>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full rounded border border-gray-300 p-2 pr-12"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
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

            <label className="mb-4 block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Confirm new password</span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full rounded border border-gray-300 p-2"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
              />
            </label>

            {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

            <button
              type="submit"
              className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating password...' : 'Update password'}
            </button>
          </form>
        ) : (
          <div>
            <p className="mb-4 text-sm text-red-600">This reset link is invalid or missing its token.</p>
            <Link href="/forgot-password" className="font-medium text-blue-600 hover:underline">
              Request a fresh reset link
            </Link>
          </div>
        )}

        <p className="mt-4 text-center text-sm text-gray-600">
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<ResetPasswordPageProps> = async ({ req, query }) => {
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
      token: typeof query.token === 'string' ? query.token : '',
    },
  };
};