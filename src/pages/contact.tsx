import Layout from '@/components/Layout';
import TurnstileField, { useTurnstileConfig } from '@/components/TurnstileField';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createWebPageStructuredData, siteUrl } from '@/lib/siteMetadata';
import { useFormsApi } from '@/lib/useFormsApi';
import { submitFormToEndpoint } from '@/lib/formsSubmit';

const NAME_FIELD_MIN = 2;
const NAME_FIELD_MAX = 128;
const EMAIL_FIELD_MIN = 6;
const EMAIL_FIELD_MAX = 254;
const LONG_FIELD_MIN = 10;
const LONG_FIELD_MAX = 600;

export default function ContactPage() {
  const { formsApi, debugEnabled } = useFormsApi();
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [t0, setT0] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [messageValue, setMessageValue] = useState('');
  const { isEnabled: turnstileRequired, isLoading: turnstileLoading } = useTurnstileConfig();

  const contactStructuredData = useMemo(() => createWebPageStructuredData({
    pageUrl: `${siteUrl}/contact/`,
    title: 'Contact Dr. Bree Charles | B3U',
    description: 'Contact Dr. Bree Charles and B3U for media, podcast, collaboration, community, and general inquiries. For speaking engagements, use the dedicated booking form.',
    keywords: ['Contact Dr. Bree Charles', 'B3U contact', 'Dr. Bree Charles media inquiry', 'B3U collaboration'],
  }), []);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (pending) return;
    if (!formsApi) {
      setSubmitError('Messages are temporarily unavailable. Please try again shortly.');
      return;
    }
    if (turnstileLoading) {
      setSubmitError('Security check is still loading. Please try again in a moment.');
      return;
    }
    if (turnstileRequired && !turnstileToken) {
      setSubmitError('Please complete the security check before sending your message.');
      return;
    }

    setSubmitError(null);
    setPending(true);
    try {
      await submitFormToEndpoint(formRef.current!, `${formsApi}?endpoint=contact`);
      setSent(true);
      try { formRef.current?.reset(); } catch {}
      setMessageValue('');
      setTurnstileToken('');
      setTurnstileResetKey((value) => value + 1);
      setT0(String(Date.now()));
    } catch {
      setSubmitError('Message failed to send. Please try again in a few minutes.');
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    try { setT0(String(Date.now())); } catch {}
  }, []);

  return (
    <Layout
      title="Contact Dr. Bree Charles | B3U"
      description="Contact Dr. Bree Charles and B3U for media, podcast, collaboration, community, and general inquiries. Use the dedicated booking form for speaking engagements."
      structuredData={contactStructuredData}
    >
      <section className="section-padding bg-gradient-to-br from-brandBlue-light to-white">
        <div className="max-w-5xl mx-auto pt-10">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brandOrange">Contact B3U</p>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold text-navy">Get in Touch</h1>
            <p className="mt-5 text-xl text-navy/80 max-w-2xl mx-auto">For media, podcast, collaboration, community, or general inquiries, send the B3U team a message below.</p>
            <div className="mt-7"><Link href="/booking" className="btn-primary">Book Dr. Bree for an Event</Link></div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div className="card bg-white shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 text-navy">Send a Message</h2>
              <form onSubmit={onSubmit} className="space-y-6" ref={formRef}>
                <input type="text" name="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
                <input type="hidden" name="t0" value={t0} />
                {debugEnabled && <input type="hidden" name="debug" value="1" />}
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">Full Name *</label>
                  <input required type="text" name="name" minLength={NAME_FIELD_MIN} maxLength={NAME_FIELD_MAX} placeholder="Enter your full name" className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-brandOrange focus:outline-none bg-gray-50 focus:bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">Email Address *</label>
                  <input required type="email" name="email" minLength={EMAIL_FIELD_MIN} maxLength={EMAIL_FIELD_MAX} placeholder="Enter your email address" className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-brandOrange focus:outline-none bg-gray-50 focus:bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">Subject</label>
                  <select name="subject" className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-brandOrange focus:outline-none bg-gray-50 focus:bg-white" defaultValue="">
                    <option value="">Select a topic</option>
                    <option value="media">Media Inquiry</option>
                    <option value="podcast">Podcast Inquiry</option>
                    <option value="collaboration">Collaboration</option>
                    <option value="community">Community Inquiry</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">Message *</label>
                  <textarea required rows={7} name="message" minLength={LONG_FIELD_MIN} maxLength={LONG_FIELD_MAX} value={messageValue} onChange={(e) => setMessageValue(e.target.value)} placeholder="Tell us about your inquiry..." className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-brandOrange focus:outline-none bg-gray-50 focus:bg-white resize-none" />
                  <p className="mt-1 text-right text-xs text-navy/50">{messageValue.length}/{LONG_FIELD_MAX}</p>
                </div>
                <TurnstileField token={turnstileToken} onTokenChange={setTurnstileToken} resetKey={turnstileResetKey} />
                <button className="btn-primary w-full py-3 text-lg font-semibold disabled:opacity-50" type="submit" disabled={pending}>{pending ? 'Sending…' : 'Send Message'}</button>
                {submitError && <div className="text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm">{submitError}</div>}
                {sent && <div className="text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 text-sm">Thank you. Your message has been received by the B3U team.</div>}
              </form>
            </div>

            <div className="space-y-8">
              <div className="card bg-white border-2 border-brandOrange/20">
                <h3 className="text-xl font-bold mb-4 text-navy">Speaking Engagements</h3>
                <p className="text-navy/80 mb-5">For keynotes, workshops, leadership programs, corporate events, government agencies, military or veteran organizations, professional associations, colleges, universities, or virtual presentations, use the dedicated speaking inquiry form.</p>
                <Link href="/booking" className="btn-primary">Request Dr. Bree</Link>
              </div>

              <div className="card bg-white border-2 border-navy/10">
                <h3 className="text-xl font-bold mb-4 text-navy">B3U</h3>
                <p className="text-navy/80">Host of B3U: Burn, Break, Become Unstoppable. Helping leaders move beyond survival mode, reclaim identity, voice, and purpose, and move from defeated to determined.</p>
                <p className="mt-4 text-brandOrange font-semibold">Breaking Cycles. Building Legacies.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
