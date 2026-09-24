import { useState } from 'react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';

import { getSubscriberById } from '@/lib/db';
import { verifyNewsletterUnsubscribeToken } from '@/lib/newsletterUnsubscribe';

type UnsubscribePageProps = {
  token: string;
  isValid: boolean;
  isSubscribed: boolean;
};

export default function UnsubscribePage({ token, isValid, isSubscribed }: UnsubscribePageProps) {
  const [state, setState] = useState<'ready' | 'loading' | 'success' | 'error'>(
    !isValid ? 'error' : isSubscribed ? 'ready' : 'success',
  );

  async function confirmUnsubscribe() {
    setState('loading');

    try {
      const response = await fetch('/api/newsletters/unsubscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Please try again.');
      }

      setState('success');
    } catch {
      setState('error');
    }
  }

  const complete = state === 'success';

  return (
    <>
      <Head>
        <title>Unsubscribe | B3U — The Take Back Weekly</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="description" content="Manage your B3U newsletter subscription." />
      </Head>
      <main className="min-h-screen bg-[#f7f6f2] px-5 py-12 text-[#17182b]">
        <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-xl flex-col items-center justify-center">
          <a href="https://b3unstoppable.net" aria-label="B3U home" className="mb-8">
            <img
              src="/images/logos/B3U3D.png"
              alt="B3U — Burn. Break. Become Unstoppable."
              width="112"
              height="112"
              className="h-24 w-24 object-contain"
            />
          </a>
          <section className="w-full rounded-3xl border border-[#17182b]/10 bg-white px-7 py-10 text-center shadow-xl sm:px-12">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#b78e29]">The Take Back Weekly</p>
            {complete ? (
              <>
                <h1 className="mt-4 text-3xl font-bold">You’re unsubscribed</h1>
                <p className="mt-4 leading-relaxed text-[#17182b]/70">
                  You won’t receive future issues of The Take Back Weekly at this email address.
                </p>
                <p className="mt-3 text-sm text-[#17182b]/60">We’re grateful you were part of the B3U community.</p>
              </>
            ) : (
              <>
                <h1 className="mt-4 text-3xl font-bold">Manage your subscription</h1>
                <p className="mt-4 leading-relaxed text-[#17182b]/70">
                  Confirm that you’d like to stop receiving The Take Back Weekly and other B3U newsletter emails.
                </p>
                {state === 'error' && (
                  <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
                    {!isValid ? 'This unsubscribe link is invalid. Please use the link from your latest newsletter.' : 'We could not complete your request. Please try again.'}
                  </p>
                )}
                <button
                  type="button"
                  onClick={confirmUnsubscribe}
                  disabled={!isValid || state === 'loading'}
                  className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-[#17182b] px-7 py-3 font-semibold text-white transition hover:bg-[#292b48] disabled:cursor-wait disabled:opacity-60"
                >
                  {state === 'loading' ? 'Unsubscribing…' : 'Unsubscribe me'}
                </button>
              </>
            )}
            <div className="mx-auto mt-8 h-px w-20 bg-[#d0ad4b]" />
            <p className="mt-5 text-xs font-semibold tracking-wide text-[#17182b]/55">BURN. BREAK. BECOME UNSTOPPABLE.</p>
          </section>
          <a href="https://b3unstoppable.net" className="mt-7 text-sm font-semibold text-[#17182b]/70 underline underline-offset-4">
            Return to b3unstoppable.net
          </a>
        </div>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<UnsubscribePageProps> = async (context) => {
  const rawToken = Array.isArray(context.query.token) ? context.query.token[0] : context.query.token;
  const token = typeof rawToken === 'string' ? rawToken : '';
  const subscriberId = verifyNewsletterUnsubscribeToken(token);

  if (!subscriberId) {
    return { props: { token: '', isValid: false, isSubscribed: false } };
  }

  const subscriber = await getSubscriberById(subscriberId);
  return { props: { token, isValid: true, isSubscribed: Boolean(subscriber) } };
};
