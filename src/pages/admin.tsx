import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import CloudflareAnalyticsPanel from '@/components/CloudflareAnalyticsPanel';
import SiteEditorPanel from '@/components/SiteEditorPanel';
import WebAnalyticsIcon from '../../webAnalytics.png';
import WebEditorIcon from '../../webEditor.png';

type NavItem = {
  id: string;
  label: string;
  icon: 'traffic' | 'editor';
  description: string;
};

const navItems: NavItem[] = [
  { id: 'web-traffic', label: 'Web Traffic', icon: 'traffic', description: 'Traffic, audience, and Cloudflare reporting.' },
  { id: 'site-editor', label: 'Site Editor', icon: 'editor', description: 'Structured editing for page copy and media.' },
];

type Subscriber = {
  id: number;
  email: string;
  created_at: string;
};

type AnalyticsItem = {
  path: string;
  views: number;
  date: string;
};

type SummaryItem = {
  count: number;
  label?: string;
  referrer?: string;
  browser?: string;
  device?: string;
};

type DashboardResponse = {
  analytics: AnalyticsItem[];
  total: number;
  topReferrers: SummaryItem[];
  topBrowsers: SummaryItem[];
  deviceTypes: SummaryItem[];
};

function formatLabel(item: SummaryItem) {
  return item.referrer ?? item.browser ?? item.device ?? item.label ?? 'Unknown';
}

function NavIcon({ icon, active }: { icon: NavItem['icon']; active: boolean }) {
  if (icon === 'traffic') {
    return (
      <Image
        src={WebAnalyticsIcon}
        alt=""
        aria-hidden="true"
        className={`h-5 w-5 object-contain ${active ? '' : 'opacity-85'}`}
      />
    );
  }

  return (
    <Image
      src={WebEditorIcon}
      alt=""
      aria-hidden="true"
      className={`h-5 w-5 object-contain ${active ? '' : 'opacity-85'}`}
    />
  );
}

function StatSection({
  id,
  title,
  className,
  children,
}: {
  id: string;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`scroll-mt-24 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm ${className ?? ''}`}>
      <h2 className="mb-4 text-xl font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

export default function Admin() {
  const router = useRouter();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsItem[]>([]);
  const [totalViews, setTotalViews] = useState(0);
  const [topReferrers, setTopReferrers] = useState<SummaryItem[]>([]);
  const [topBrowsers, setTopBrowsers] = useState<SummaryItem[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<NavItem['id']>('web-traffic');

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [subscribersResponse, analyticsResponse] = await Promise.all([
          fetch('/api/subscribers'),
          fetch('/api/analytics'),
        ]);

        if (subscribersResponse.status === 401 || analyticsResponse.status === 401) {
          router.replace('/login');
          return;
        }

        if (!subscribersResponse.ok || !analyticsResponse.ok) {
          const subscribersBody = subscribersResponse.ok ? null : await subscribersResponse.json().catch(() => null);
          const analyticsBody = analyticsResponse.ok ? null : await analyticsResponse.json().catch(() => null);

          const details = [
            !subscribersResponse.ok ? subscribersBody?.details || subscribersBody?.error || `Subscribers API returned ${subscribersResponse.status}` : null,
            !analyticsResponse.ok ? analyticsBody?.details || analyticsBody?.error || `Analytics API returned ${analyticsResponse.status}` : null,
          ].filter(Boolean);

          throw new Error(details[0] || 'Failed to load dashboard data');
        }

        const subscribersData = (await subscribersResponse.json()) as Subscriber[];
        const analyticsData = (await analyticsResponse.json()) as DashboardResponse;

        setSubscribers(subscribersData);
        setAnalytics(analyticsData.analytics ?? []);
        setTotalViews(analyticsData.total ?? 0);
        setTopReferrers(analyticsData.topReferrers ?? []);
        setTopBrowsers(analyticsData.topBrowsers ?? []);
        setDeviceTypes(analyticsData.deviceTypes ?? []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, [router]);

  async function handleLogout() {
    await fetch('/api/login', { method: 'DELETE' });
    await router.push('/login');
  }

  function handleNavClick(sectionId: NavItem['id']) {
    setActiveView(sectionId);
    setDrawerOpen(false);
  }

  const navContent = (
    <div className="flex h-full flex-col">
      <div className={`border-b border-white/10 ${drawerCollapsed ? 'px-3 py-4' : 'px-5 py-5'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className={drawerCollapsed ? 'hidden' : 'block'}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-200">B3U Admin</p>
            <h2 className="mt-2 text-lg font-semibold text-white">Dashboard</h2>
            <p className="mt-2 text-sm text-slate-300">Analytics and content editing.</p>
          </div>

          <button
            type="button"
            onClick={() => setDrawerCollapsed((current) => !current)}
            className="rounded-lg border border-white/20 px-3 py-2 text-xs font-medium text-white hover:bg-white/10"
            aria-label={drawerCollapsed ? 'Expand navigation drawer' : 'Collapse navigation drawer'}
          >
            {drawerCollapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>

        {drawerCollapsed ? <p className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.24em] text-orange-200">B3U</p> : null}
      </div>

      <nav className={`flex-1 space-y-2 overflow-y-auto ${drawerCollapsed ? 'px-2 py-4' : 'px-3 py-4'}`}>
        {navItems.map((item) => {
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`block w-full rounded-2xl px-4 py-3 text-left transition ${
                isActive ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-200 hover:bg-white/10 hover:text-white'
              } ${drawerCollapsed ? 'px-2 py-3 text-center' : ''}`}
              aria-label={item.label}
              title={drawerCollapsed ? item.label : undefined}
            >
              {drawerCollapsed ? (
                <div className="flex items-center justify-center">
                  <NavIcon icon={item.icon} active={isActive} />
                </div>
              ) : (
                <>
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className={`mt-1 text-xs ${isActive ? 'text-slate-600' : 'text-slate-400'}`}>{item.description}</div>
                </>
              )}
            </button>
          );
        })}
      </nav>

      <div className={`border-t border-white/10 ${drawerCollapsed ? 'px-2 py-4' : 'px-5 py-4'}`}>
        <button
          type="button"
          onClick={handleLogout}
          className={`w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 ${
            drawerCollapsed ? 'px-2' : ''
          }`}
        >
          {drawerCollapsed ? 'Out' : 'Log out'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto flex min-h-screen max-w-screen-2xl">
        <aside
          className={`sticky top-0 hidden h-screen flex-shrink-0 overflow-hidden bg-slate-950 transition-[width] duration-200 lg:block ${
            drawerCollapsed ? 'w-24' : 'w-80'
          }`}
        >
          {navContent}
        </aside>

        {drawerOpen ? (
          <div className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
        ) : null}

        <aside
          className={`fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] overflow-hidden bg-slate-950 transition-transform duration-200 lg:hidden ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-200">B3U Admin</p>
              <h2 className="mt-1 text-lg font-semibold text-white">Dashboard</h2>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="rounded-lg border border-white/20 px-3 py-1 text-sm text-white hover:bg-white/10"
            >
              Close
            </button>
          </div>
          {navContent}
        </aside>

        <main className="min-w-0 flex-1 p-4 md:p-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex items-start gap-4 lg:hidden">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="mt-1 rounded-xl border border-gray-200 bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 lg:hidden"
              >
                Menu
              </button>
            </div>

            {loading ? <div className="rounded-3xl bg-white p-6 shadow-sm">Loading dashboard...</div> : null}
            {error ? <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

            {!loading && activeView === 'web-traffic' ? (
              <div id="web-traffic" className="space-y-6 scroll-mt-24">
                <div className="grid gap-6 lg:grid-cols-3">
                  <StatSection id="subscribers" title={`Subscribers (${subscribers.length})`} className="h-full">
                    <div className="max-h-96 space-y-3 overflow-y-auto">
                      {subscribers.length ? (
                        subscribers.map((subscriber) => (
                          <div key={subscriber.id} className="border-b border-gray-100 pb-3">
                            <div className="font-medium text-gray-900">{subscriber.email}</div>
                            <div className="text-sm text-gray-500">{new Date(subscriber.created_at).toLocaleString()}</div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No subscribers have been recorded in the local dashboard database yet.</p>
                      )}
                    </div>
                  </StatSection>

                  <StatSection id="browser-usage" title="Browser Usage" className="h-full">
                    <div className="max-h-96 space-y-3 overflow-y-auto">
                      {topBrowsers.length ? (
                        topBrowsers.map((item, index) => (
                          <div key={`${formatLabel(item)}-${index}`} className="border-b border-gray-100 pb-3">
                            <div className="font-medium text-gray-900">{formatLabel(item)}</div>
                            <div className="text-sm text-gray-500">{item.count} users</div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No browser data yet.</p>
                      )}
                    </div>
                  </StatSection>

                  <StatSection id="device-types" title="Device Types" className="h-full">
                    <div className="max-h-96 space-y-3 overflow-y-auto">
                      {deviceTypes.length ? (
                        deviceTypes.map((item, index) => (
                          <div key={`${formatLabel(item)}-${index}`} className="border-b border-gray-100 pb-3">
                            <div className="font-medium text-gray-900">{formatLabel(item)}</div>
                            <div className="text-sm text-gray-500">{item.count} visits</div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No device breakdown yet.</p>
                      )}
                    </div>
                  </StatSection>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <StatSection id="page-analytics" title={`Page Analytics (Total: ${totalViews})`} className="h-full">
                    <div className="max-h-96 space-y-3 overflow-y-auto">
                      {analytics.length ? (
                        analytics.map((item, index) => (
                          <div key={`${item.path}-${item.date}-${index}`} className="border-b border-gray-100 pb-3">
                            <div className="font-medium text-gray-900">{item.path}</div>
                            <div className="text-sm text-gray-500">{item.views} views on {item.date}</div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No page analytics have been captured in the local dashboard database yet.</p>
                      )}
                    </div>
                  </StatSection>

                  <StatSection id="top-referrers" title="Top Referrers" className="h-full">
                    <div className="max-h-96 space-y-3 overflow-y-auto">
                      {topReferrers.length ? (
                        topReferrers.map((item, index) => (
                          <div key={`${formatLabel(item)}-${index}`} className="border-b border-gray-100 pb-3">
                            <div className="font-medium text-gray-900">{formatLabel(item) || 'Direct'}</div>
                            <div className="text-sm text-gray-500">{item.count} visits</div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No referrer data yet.</p>
                      )}
                    </div>
                  </StatSection>
                </div>

                <div id="cloudflare-edge" className="scroll-mt-24">
                  <CloudflareAnalyticsPanel />
                </div>
              </div>
            ) : null}

            {!loading && activeView === 'site-editor' ? <SiteEditorPanel /> : null}
          </div>
        </main>
      </div>
    </div>
  );
}
