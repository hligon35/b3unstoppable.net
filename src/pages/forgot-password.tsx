import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useState } from 'react';

import { hasAdminSession } from '../lib/adminAuth';

type ForgotPasswordPageProps = {
  csrfToken: string | null;
};

export default function ForgotPasswordPage({ csrfToken }: ForgotPasswordPageProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setInfo('');
    setPreviewUrl('');
    setIsSubmitting(true);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }

    const response = await fetch('/api/password-reset/request', {
      method: 'POST',
      headers,
      body: JSON.stringify({ username }),
    });

    const data = await response.json().catch(() => ({ message: 'Unable to start password reset.' }));

    if (!response.ok) {
      setError(data.message ?? 'Unable to start password reset.');
      setIsSubmitting(false);
      return;
    }

    setInfo(data.message ?? 'If that account can be reset, a link has been sent.');
    setPreviewUrl(typeof data.previewUrl === 'string' ? data.previewUrl : '');
    setIsSubmitting(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm rounded bg-white p-8 shadow-md">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Reset Admin Password</h1>
        <p className="mb-6 text-sm text-gray-600">Enter the admin username and we&apos;ll send a one-time reset link to the configured inbox.</p>

        <form onSubmit={handleSubmit}>
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

          {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
          {info ? <p className="mb-4 text-sm text-green-700">{info}</p> : null}
          {previewUrl ? (
            <p className="mb-4 text-sm text-gray-600">
              Local preview: <a href={previewUrl} className="text-blue-600 hover:underline">open reset link</a>
            </p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending link...' : 'Send reset link'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<ForgotPasswordPageProps> = async ({ req }) => {
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