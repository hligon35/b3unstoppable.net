import Image from 'next/image';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import BlogAdminIcon from '../../../B3U_Blog_Admin_Icon.png';

import type { AdminRole } from '@/lib/adminAuth';

type AdminRouteId = 'web-traffic' | 'newsletter' | 'site-editor' | 'blog' | 'help';

type AdminNavItem = {
  id: AdminRouteId;
  label: string;
  icon: 'traffic' | 'editor' | 'newsletter' | 'help' | 'blog';
  description: string;
  href: string;
};

type AdminFrameProps = {
  adminRole: AdminRole;
  activeId: AdminRouteId;
  children: React.ReactNode;
  title: string;
  subtitle: string;
};

const NAV_ITEMS: AdminNavItem[] = [
  { id: 'web-traffic', label: 'Web Traffic', icon: 'traffic', description: 'Traffic, audience, and Cloudflare reporting.', href: '/admin' },
  { id: 'newsletter', label: 'Newsletter', icon: 'newsletter', description: 'Schedule and queue subscriber newsletters.', href: '/admin?tab=newsletter' },
  { id: 'blog', label: 'Blog', icon: 'blog', description: 'Write and publish journal articles.', href: '/admin/blog' },
  { id: 'site-editor', label: 'Site Editor', icon: 'editor', description: 'Structured editing for page copy and media.', href: '/admin?tab=site-editor' },
  { id: 'help', label: 'Help', icon: 'help', description: 'Simple instructions for every dashboard control.', href: '/admin?tab=help' },
];

function NavIcon({ icon, active }: { icon: AdminNavItem['icon']; active: boolean }) {
  const iconClassName = `h-5 w-5 object-contain ${active ? '' : 'opacity-85'}`;

  if (icon === 'traffic') {
    return (
      <span className="inline-flex rounded-lg bg-white p-1 shadow-sm">
        <Image src="/icons/webAnalytics.png" alt="" aria-hidden="true" width={20} height={20} className={iconClassName} />
      </span>
    );
  }

  if (icon === 'newsletter') {
    return (
      <span className="inline-flex rounded-lg bg-white p-1 shadow-sm">
        <Image src="/icons/newsletter.png" alt="" aria-hidden="true" width={20} height={20} className={iconClassName} />
      </span>
    );
  }

  if (icon === 'help') {
    return (
      <span className="inline-flex rounded-lg bg-white p-1 shadow-sm">
        <Image src="/icons/help.png" alt="" aria-hidden="true" width={20} height={20} className={iconClassName} />
      </span>
    );
  }

  if (icon === 'blog') {
    return (
      <span className="inline-flex rounded-lg bg-white p-1 shadow-sm">
        <Image src={BlogAdminIcon} alt="" aria-hidden="true" width={20} height={20} className={iconClassName} />
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-lg bg-white p-1 shadow-sm">
      <Image src="/icons/webEditor.png" alt="" aria-hidden="true" width={20} height={20} className={iconClassName} />
    </span>
  );
}

function LogoutIcon() {
  return (
    <span className="inline-flex rounded-lg bg-white p-1 shadow-sm">
      <Image src="/icons/logout.png" alt="" aria-hidden="true" width={20} height={20} className="h-5 w-5 object-contain" />
    </span>
  );
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {open ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  );
}

function getVisibleNavItems(adminRole: AdminRole) {
  if (adminRole === 'newsletter') {
    return NAV_ITEMS.filter((item) => item.id === 'newsletter' || item.id === 'help');
  }

  return NAV_ITEMS;
}

export default function AdminFrame({ adminRole, activeId, children, title, subtitle }: AdminFrameProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const navItems = useMemo(() => getVisibleNavItems(adminRole), [adminRole]);

  async function handleLogout() {
    await fetch('/api/login', { method: 'DELETE' });
    await router.push('/login');
  }

  async function handleNav(href: string) {
    setMobileMenuOpen(false);
    await router.push(href);
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
          const isActive = activeId === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => void handleNav(item.href)}
              className={`block w-full rounded-2xl px-4 py-3 text-left transition ${isActive ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-200 hover:bg-white/10 hover:text-white'} ${drawerCollapsed ? 'px-2 py-3 text-center' : ''}`}
              aria-label={item.label}
              title={drawerCollapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
            >
              {drawerCollapsed ? (
                <div className="flex items-center justify-center">
                  <NavIcon icon={item.icon} active={isActive} />
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    <NavIcon icon={item.icon} active={isActive} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{item.label}</div>
                    <div className={`mt-1 text-xs ${isActive ? 'text-slate-600' : 'text-slate-400'}`}>{item.description}</div>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      <div className={`border-t border-white/10 ${drawerCollapsed ? 'px-2 py-4' : 'px-5 py-4'}`}>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className={`w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 ${drawerCollapsed ? 'px-2' : ''}`}
        >
          {drawerCollapsed ? (
            <span className="flex items-center justify-center">
              <LogoutIcon />
            </span>
          ) : (
            <span className="flex items-center justify-center gap-3">
              <LogoutIcon />
              <span>Log out</span>
            </span>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-100">
      <aside className={`fixed inset-y-0 left-0 z-30 hidden overflow-hidden bg-slate-950 transition-[width] duration-200 lg:block ${drawerCollapsed ? 'w-24' : 'w-80'}`}>
        {navContent}
      </aside>

      <main className={`min-w-0 p-4 md:p-8 ${drawerCollapsed ? 'lg:ml-24' : 'lg:ml-80'}`}>
        <div className="mx-auto w-full max-w-7xl">
            <div className="mb-6 flex items-start justify-between gap-4 lg:hidden">
              <div className="min-w-0 pr-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">B3U Admin</p>
                <h1 className="mt-1 text-xl font-semibold text-slate-950">{title}</h1>
                <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
              </div>

              <div className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((current) => !current)}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                  aria-label={mobileMenuOpen ? 'Close admin navigation menu' : 'Open admin navigation menu'}
                  aria-expanded={mobileMenuOpen}
                  aria-haspopup="menu"
                >
                  <HamburgerIcon open={mobileMenuOpen} />
                </button>

                {mobileMenuOpen ? (
                  <div className="absolute right-0 top-full z-30 mt-3 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
                    <div className="border-b border-slate-200 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Navigation</p>
                      <p className="mt-1 text-sm text-slate-600">Choose a section or log out.</p>
                    </div>

                    <nav className="p-3" aria-label="Admin mobile navigation">
                      <div className="space-y-2">
                        {navItems.map((item) => {
                          const isActive = activeId === item.id;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => void handleNav(item.href)}
                              className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${isActive ? 'bg-slate-950 text-white shadow-sm' : 'bg-slate-50 text-slate-900 hover:bg-slate-100'}`}
                              aria-current={isActive ? 'page' : undefined}
                            >
                              <div className="mt-0.5 flex-shrink-0">
                                <NavIcon icon={item.icon} active={isActive} />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold">{item.label}</div>
                                <div className={`mt-1 text-xs ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>{item.description}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-3 border-t border-slate-200 pt-3">
                        <button
                          type="button"
                          onClick={() => void handleLogout()}
                          className="flex min-h-11 w-full items-center justify-center gap-3 rounded-2xl bg-brandBlue px-4 py-3 text-sm font-semibold text-white transition hover:bg-brandBlue/90"
                        >
                          <LogoutIcon />
                          <span>Log out</span>
                        </button>
                      </div>
                    </nav>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mb-6 hidden lg:block">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">B3U Admin</p>
              <h1 className="mt-1 text-3xl font-semibold text-slate-950">{title}</h1>
              <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
            </div>

            {children}
          </div>
      </main>
    </div>
  );
}
