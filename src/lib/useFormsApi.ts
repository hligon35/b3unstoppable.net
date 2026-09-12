import { useCallback, useEffect, useMemo, useState } from 'react';

// Centralized resolver for the Forms API base URL with runtime override support.
// Priority: URL ?formsApi -> sessionStorage -> NEXT_PUBLIC_FORMS_API
// Also exposes a setter that persists to sessionStorage and notifies listeners.

// Default to the first-party forms endpoint so Resend can run server-side.
// Static-only deployments can still override this with NEXT_PUBLIC_FORMS_API.
const DEFAULT_FORMS_API = '/api/forms';
const ENV_BASE = ((process.env.NEXT_PUBLIC_FORMS_API as string) || DEFAULT_FORMS_API).replace(/\/$/, '');
const STORAGE_KEY = 'b3u.formsApi';
const EVENT_NAME = 'b3u:formsApiChange';

export type FormsApiHook = {
  formsApi: string;
  setFormsApiOverride: (value: string | 'clear' | 'env') => void;
  debugEnabled: boolean;
};

export function useFormsApi(): FormsApiHook {
  const [formsApi, setFormsApi] = useState<string>(ENV_BASE);
  const [debugEnabled, setDebugEnabled] = useState(false);

  // Setter that persists and notifies
  const setFormsApiOverride = useCallback((value: string | 'clear' | 'env') => {
    if (value === 'clear' || value === 'env') {
      try { window.sessionStorage?.removeItem(STORAGE_KEY); } catch {}
      setFormsApi(ENV_BASE);
      try { window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: ENV_BASE })); } catch {}
      return;
    }
    let cand = value?.trim() || '';
    if (!cand) return;
    if (!/^https?:\/\//i.test(cand)) cand = 'https://' + cand;
    try {
      const u = new URL(cand);
      if (u.protocol === 'https:' || u.protocol === 'http:') {
        const next = cand.replace(/\/$/, '');
        try { window.sessionStorage?.setItem(STORAGE_KEY, next); } catch {}
        setFormsApi(next);
        try { window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next })); } catch {}
      }
    } catch {
      // ignore invalid
    }
  }, []);

  // Initial resolve + URL param override
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setDebugEnabled(params.get('debug') === '1' || params.get('debug') === 'true');
      const override = params.get('formsApi') || params.get('formsapi') || params.get('forms_api');
      let next = ENV_BASE;
      try {
        const saved = window.sessionStorage?.getItem(STORAGE_KEY);
        if (saved) next = saved;
      } catch {}
      if (override) {
        if (/^(clear|env)$/i.test(override)) {
          setFormsApiOverride('env');
          return;
        }
        // Validate and set via setter (persists + notifies)
        setFormsApiOverride(override);
        return;
      }
      setFormsApi(next);
    } catch {
      setFormsApi(ENV_BASE);
    }
  }, [setFormsApiOverride]);

  // React to storage changes (other tabs) and custom events (same tab updates)
  useEffect(() => {
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === STORAGE_KEY) {
        const val = (ev.newValue || '').replace(/\/$/, '') || ENV_BASE;
        setFormsApi(val);
      }
    };
    const onCustom = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as string | undefined;
      if (typeof detail === 'string') setFormsApi(detail.replace(/\/$/, ''));
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(EVENT_NAME, onCustom as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(EVENT_NAME, onCustom as EventListener);
    };
  }, []);

  return useMemo(() => ({ formsApi, setFormsApiOverride, debugEnabled }), [formsApi, setFormsApiOverride, debugEnabled]);
}
