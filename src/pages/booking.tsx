import Layout from '@/components/Layout';
import TurnstileField, { useTurnstileConfig } from '@/components/TurnstileField';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createWebPageStructuredData, siteUrl } from '@/lib/siteMetadata';
import { useFormsApi } from '@/lib/useFormsApi';
import { submitFormToEndpoint } from '@/lib/formsSubmit';

export default function BookingPage() {
  const { formsApi, debugEnabled } = useFormsApi();
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [t0, setT0] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const formRef = useRef<HTMLFormElement | null>(null);
  const { isEnabled: turnstileRequired, isLoading: turnstileLoading } = useTurnstileConfig();

  const structuredData = useMemo(() => createWebPageStructuredData({
    pageUrl: `${siteUrl}/booking/`,
    title: 'Book Dr. Bree Charles | Speaking Inquiry',
    description: 'Request Dr. Bree Charles for a keynote, leadership workshop, professional-development program, corporate event, government agency, military organization, association, university, or virtual presentation.',
    keywords: ['book Dr. Bree Charles', 'speaker booking', 'leadership keynote inquiry', 'corporate speaker', 'military speaker', 'government speaker'],
  }), []);

  useEffect(() => {
    try { setT0(String(Date.now())); } catch {}
  }, []);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (pending) return;
    if (!formsApi) {
      setError('Booking inquiries are temporarily unavailable. Please try again shortly.');
      return;
    }
    if (turnstileLoading) {
      setError('Security check is still loading. Please try again in a moment.');
      return;
    }
    if (turnstileRequired && !turnstileToken) {
      setError('Please complete the security check before submitting your inquiry.');
      return;
    }

    setError(null);
    setPending(true);
    try {
      await submitFormToEndpoint(formRef.current!, `${formsApi}?endpoint=contact`);
      setSent(true);
      try { formRef.current?.reset(); } catch {}
      setTurnstileToken('');
      setTurnstileResetKey((value) => value + 1);
      setT0(String(Date.now()));
    } catch {
      setError('Your inquiry could not be sent. Please try again in a few minutes.');
    } finally {
      setPending(false);
    }
  };

  const inputClass = 'w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-3 text-navy outline-none transition focus:border-brandOrange focus:bg-white';
  const labelClass = 'mb-2 block text-sm font-semibold text-navy';

  return (
    <Layout
      title="Book Dr. Bree Charles | Speaking Inquiry"
      description="Request Dr. Bree Charles for your keynote, workshop, leadership program, organizational event, corporate program, government agency, military organization, association, university, or virtual event."
      structuredData={structuredData}
    >
      <section className="section-padding bg-gradient-to-br from-brandBlue-light to-white">
        <div className="mx-auto max-w-5xl pt-10">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brandOrange">Speaking Inquiry</p>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold text-navy">Book Dr. Bree</h1>
            <p className="mt-5 text-lg text-navy/75">Tell us about your event, audience, and goals. The B3U team will review your inquiry and follow up with next steps.</p>
          </div>

          <div className="card mx-auto max-w-4xl bg-white shadow-2xl">
            <form ref={formRef} onSubmit={onSubmit} className="grid gap-6 md:grid-cols-2">
              <input type="hidden" name="subject" value="Dr. Bree Speaking Inquiry" />
              <input type="text" name="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
              <input type="hidden" name="t0" value={t0} />
              {debugEnabled && <input type="hidden" name="debug" value="1" />}

              <div><label className={labelClass}>Organization Name *</label><input className={inputClass} name="organizationName" required /></div>
              <div><label className={labelClass}>Contact Name *</label><input className={inputClass} name="name" required /></div>
              <div><label className={labelClass}>Contact Title</label><input className={inputClass} name="contactTitle" /></div>
              <div><label className={labelClass}>Email Address *</label><input className={inputClass} name="email" type="email" required /></div>
              <div><label className={labelClass}>Telephone Number *</label><input className={inputClass} name="telephone" type="tel" required /></div>
              <div><label className={labelClass}>Event Name *</label><input className={inputClass} name="eventName" required /></div>
              <div><label className={labelClass}>Event Date *</label><input className={inputClass} name="eventDate" type="date" required /></div>
              <div><label className={labelClass}>Event Location *</label><input className={inputClass} name="eventLocation" required placeholder="City, State or Virtual" /></div>
              <div><label className={labelClass}>In-Person or Virtual *</label><select className={inputClass} name="deliveryFormat" required defaultValue=""><option value="" disabled>Select one</option><option>In-Person</option><option>Virtual</option><option>Hybrid</option></select></div>
              <div><label className={labelClass}>Estimated Audience Size</label><input className={inputClass} name="audienceSize" type="number" min="1" /></div>
              <div><label className={labelClass}>Requested Presentation Type *</label><select className={inputClass} name="presentationType" required defaultValue=""><option value="" disabled>Select one</option><option>Keynote Presentation</option><option>Leadership Workshop</option><option>Professional-Development Training</option><option>Panel or Moderated Conversation</option><option>Military or Veteran Transition Program</option><option>Virtual Presentation</option><option>Other</option></select></div>
              <div><label className={labelClass}>Proposed Speaker Budget Range</label><select className={inputClass} name="speakerBudget" defaultValue=""><option value="">Select range</option><option>Under $2,500</option><option>$2,500-$5,000</option><option>$5,000-$10,000</option><option>$10,000-$15,000</option><option>$15,000+</option><option>To Be Discussed</option></select></div>

              <div className="md:col-span-2"><label className={labelClass}>Event Goals or Desired Audience Outcomes *</label><textarea className={inputClass} name="eventGoals" rows={5} required /></div>
              <div className="md:col-span-2"><label className={labelClass}>Additional Information</label><textarea className={inputClass} name="message" rows={5} /></div>

              <div className="md:col-span-2"><TurnstileField token={turnstileToken} onTokenChange={setTurnstileToken} resetKey={turnstileResetKey} /></div>
              <div className="md:col-span-2"><button type="submit" disabled={pending} className="btn-primary w-full py-3 text-lg disabled:opacity-50">{pending ? 'Submitting…' : 'Submit Speaking Inquiry'}</button></div>

              {error && <div className="md:col-span-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              {sent && <div className="md:col-span-2 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">Thank you for considering Dr. Bree Charles for your event. Your inquiry has been received, and a member of the B3U team will respond within two business days.</div>}
            </form>
          </div>
        </div>
      </section>
    </Layout>
  );
}
