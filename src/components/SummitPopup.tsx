import { useEffect, useState } from 'react';

const POPUP_DISMISS_KEY = 'b3u-summit-popup-dismissed';
const REGISTRATION_URL = 'https://www.eventbrite.com/e/the-big-take-back-summit-registration-1993720115535?aff=ebdssbdestsearch';
const VIDEO_URL = '/videos/b3uevent.mp4';

export default function SummitPopup() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(POPUP_DISMISS_KEY) === 'true') {
        return;
      }
    } catch {}

    setIsVisible(true);
  }, []);

  function handleClose() {
    setIsVisible(false);

    try {
      window.sessionStorage.setItem(POPUP_DISMISS_KEY, 'true');
    } catch {}
  }

  if (!isVisible) {
    return null;
  }

  return (
    <aside className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
      <div className="w-full max-w-[420px] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_25px_70px_rgba(15,23,42,0.28)] ring-1 ring-black/5">
        <div className="relative aspect-video bg-slate-950">
          <video
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          >
            <source src={VIDEO_URL} type="video/mp4" />
            Your browser does not support the summit preview video.
          </video>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close summit popup"
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/70 text-lg font-semibold text-white backdrop-blur transition hover:bg-slate-950/85"
          >
            ×
          </button>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent px-4 py-4 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-200">Virtual Event</p>
            <h2 className="mt-1 text-lg font-bold leading-tight">The Big Take Back Summit</h2>
          </div>
        </div>

        <div className="max-h-[58vh] space-y-4 overflow-y-auto px-4 py-4 text-sm text-slate-700">
          <p className="leading-relaxed">
            Reclaim identity, purpose, and legacy through honest conversations, practical teaching, and interactive breakout sessions focused on faith, mental wellness, relationships, fatherhood, resilience, leadership, and legacy.
          </p>

          <div>
            <h3 className="text-sm font-semibold text-slate-950">Who It&apos;s For</h3>
            <p className="mt-1 leading-relaxed">
              Men ready to grow personally, professionally, and spiritually, including veterans, community leaders, entrepreneurs, professionals, fathers, mentors, students, and men seeking greater clarity and purpose. Women who support the growth of the men in their lives are also welcome in designated discussions.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-950">What You&apos;ll Leave With</h3>
            <ul className="mt-2 space-y-2 text-sm leading-relaxed text-slate-700">
              <li>A renewed sense of identity, purpose, and direction.</li>
              <li>Practical strategies to lead with confidence at home, at work, and in the community.</li>
              <li>Action steps to strengthen faith, relationships, leadership, and personal growth.</li>
              <li>Meaningful connections with men committed to lasting legacy.</li>
              <li>Tools and resources to continue the journey after the summit.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-950">Complimentary Gift</h3>
            <p className="mt-1 leading-relaxed">
              Every registered attendee who joins the summit will receive an exclusive digital resource with reflection exercises, action steps, and practical tools to carry the lessons forward.
            </p>
          </div>

          <p className="rounded-2xl bg-slate-50 px-3 py-3 text-sm leading-relaxed text-slate-700">
            Registration is required. Reserve your seat to receive your confirmation email and summit access details.
          </p>

          <a
            href={REGISTRATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center rounded-xl bg-brandOrange px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-brandOrange-dark"
          >
            Register Today
          </a>
        </div>
      </div>
    </aside>
  );
}