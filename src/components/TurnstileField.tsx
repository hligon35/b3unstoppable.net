import { useEffect, useState } from 'react';
import Turnstile from 'react-turnstile';

const TURNSTILE_SITE_KEY = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY as string) || '';
const TURNSTILE_CONFIG_ENDPOINT = '/api/forms';

let cachedTurnstileSiteKey = TURNSTILE_SITE_KEY.trim();
let runtimeSiteKeyPromise: Promise<string> | null = null;

export function isTurnstileEnabled(): boolean {
  return cachedTurnstileSiteKey.length > 0;
}

async function loadRuntimeTurnstileSiteKey(): Promise<string> {
  if (cachedTurnstileSiteKey) {
    return cachedTurnstileSiteKey;
  }

  if (typeof window === 'undefined') {
    return '';
  }

  if (!runtimeSiteKeyPromise) {
    runtimeSiteKeyPromise = fetch(TURNSTILE_CONFIG_ENDPOINT, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      credentials: 'omit',
    })
      .then(async (response) => {
        if (!response.ok) {
          return '';
        }

        const payload = (await response.json().catch(() => null)) as { turnstileSiteKey?: string } | null;
        cachedTurnstileSiteKey = String(payload?.turnstileSiteKey || '').trim();
        return cachedTurnstileSiteKey;
      })
      .catch(() => '')
      .finally(() => {
        runtimeSiteKeyPromise = null;
      });
  }

  return runtimeSiteKeyPromise;
}

export function useTurnstileConfig() {
  const [siteKey, setSiteKey] = useState(cachedTurnstileSiteKey);
  const [isLoading, setIsLoading] = useState(!cachedTurnstileSiteKey);

  useEffect(() => {
    if (siteKey) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    void loadRuntimeTurnstileSiteKey().then((nextSiteKey) => {
      if (cancelled) {
        return;
      }

      setSiteKey(nextSiteKey);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [siteKey]);

  return {
    siteKey,
    isEnabled: siteKey.trim().length > 0,
    isLoading,
  };
}

type TurnstileFieldProps = {
  token: string;
  onTokenChange: (token: string) => void;
  resetKey?: number;
  className?: string;
  theme?: 'auto' | 'light' | 'dark';
};

export default function TurnstileField({
  token,
  onTokenChange,
  resetKey = 0,
  className,
  theme = 'auto',
}: TurnstileFieldProps) {
  const { siteKey, isEnabled, isLoading } = useTurnstileConfig();

  if (!isEnabled) {
    if (isLoading) {
      return <div className={className}><p className="mt-2 text-xs text-navy/60">Loading security check…</p></div>;
    }
    return null;
  }

  return (
    <div className={className}>
      <Turnstile
        key={resetKey}
        sitekey={siteKey}
        theme={theme}
        refreshExpired="auto"
        onVerify={(nextToken) => onTokenChange(nextToken || '')}
        onExpire={() => onTokenChange('')}
        onError={() => onTokenChange('')}
      />
      <input type="hidden" name="turnstileToken" value={token} readOnly />
      <p className="mt-2 text-xs text-navy/60">Security check provided by Cloudflare Turnstile.</p>
    </div>
  );
}