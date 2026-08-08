import type { GetServerSideProps } from 'next';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import CloudflareAnalyticsPanel from '@/components/CloudflareAnalyticsPanel';
import SiteEditorPanel from '@/components/SiteEditorPanel';
import { getAdminRole, hasAdminSession, type AdminRole } from '@/lib/adminAuth';

type NavItem = {
  id: string;
  label: string;
  icon: 'traffic' | 'editor' | 'newsletter' | 'help';
  description: string;
};

const navItems: NavItem[] = [
  { id: 'web-traffic', label: 'Web Traffic', icon: 'traffic', description: 'Traffic, audience, and Cloudflare reporting.' },
  { id: 'newsletter', label: 'Newsletter', icon: 'newsletter', description: 'Schedule and queue subscriber newsletters.' },
  { id: 'site-editor', label: 'Site Editor', icon: 'editor', description: 'Structured editing for page copy and media.' },
  { id: 'help', label: 'Help', icon: 'help', description: 'Simple instructions for every dashboard control.' },
];

type HelpSection = {
  title: string;
  description: string;
  items: Array<{
    control: string;
    instruction: string;
  }>;
};

const helpSections: HelpSection[] = [
  {
    title: 'Dashboard navigation',
    description: 'These buttons help you move around the admin area.',
    items: [
      { control: 'Hamburger menu', instruction: 'On a phone, tap this to open the menu.' },
      { control: 'Collapse / Expand', instruction: 'Use this to make the side menu smaller or bigger.' },
      { control: 'Web Traffic', instruction: 'Opens your visitor numbers and traffic reports.' },
      { control: 'Newsletter', instruction: 'Opens the newsletter builder and scheduled send list.' },
      { control: 'Site Editor', instruction: 'Opens the place where you change site words, colors, cards, and images.' },
      { control: 'Help', instruction: 'Come here when you want a simple explanation.' },
      { control: 'Log out', instruction: 'Signs you out and takes you back to the login page.' },
    ],
  },
  {
    title: 'Web Traffic tab',
    description: 'This area shows what visitors are doing on the site.',
    items: [
      { control: 'Subscribers', instruction: 'Shows who joined your email list and when they signed up.' },
      { control: 'Browser Usage', instruction: 'Shows which web browsers people use most.' },
      { control: 'Device Types', instruction: 'Shows if people visit more on phones, tablets, or computers.' },
      { control: 'Page Analytics', instruction: 'Shows which pages people look at and when.' },
      { control: 'Top Referrers', instruction: 'Shows which outside websites send people to you.' },
      { control: 'Cloudflare Analytics Panel', instruction: 'Opens the bigger traffic report with more details.' },
    ],
  },
  {
    title: 'Newsletter tab',
    description: 'This is where you write emails and choose when to send them.',
    items: [
      { control: 'Subject', instruction: 'This is the title people see in their inbox.' },
      { control: 'Newsletter content', instruction: 'Write or paste the email here.' },
      { control: 'Send date and time', instruction: 'Pick the day and time you want the email to go out.' },
      { control: 'Select all subscribers', instruction: 'Checks every person on the list at once.' },
      { control: 'Clear selection', instruction: 'Unchecks everyone so you can start over.' },
      { control: 'Subscriber checkboxes', instruction: 'Check or uncheck one person at a time.' },
      { control: 'Schedule newsletter', instruction: 'Saves the email to send later.' },
      { control: 'Save queued newsletter', instruction: 'If you are editing a scheduled email, this saves your changes.' },
      { control: 'Cancel edit', instruction: 'Stops editing and clears the current changes.' },
      { control: 'Process due newsletters now', instruction: 'Sends any emails that are already due right now.' },
      { control: 'Edit', instruction: 'Loads a scheduled email back into the editor.' },
      { control: 'Delete', instruction: 'Removes a scheduled email after you confirm.' },
      { control: 'Status and notice banners', instruction: 'These messages tell you if something worked or failed.' },
    ],
  },
  {
    title: 'Site Editor tab',
    description: 'This is where you change what people see on the website.',
    items: [
      { control: 'About Section', instruction: 'Change the homepage banner words and the about text.' },
      { control: 'Newsletter', instruction: 'Change the signup section words on the site.' },
      { control: 'Events', instruction: 'Events Page changes the main events section. Event Cards changes the individual cards.' },
      { control: 'Shop', instruction: 'Shop Page changes the shop words. Products changes the items and their order.' },
      { control: 'Colors', instruction: 'Changes the main site colors.' },
      { control: 'Images', instruction: 'Lets you swap out pictures used on the site.' },
      { control: 'Save', instruction: 'Saves your draft without making it live yet.' },
      { control: 'Reset', instruction: 'Throws away unsaved changes and goes back to the last saved version.' },
      { control: 'Publish', instruction: 'Makes your saved changes go live on the site.' },
    ],
  },
];

function getHelpSectionId(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

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

type NewsletterQueueItem = {
  id: number;
  subject: string;
  bodyText: string;
  recipientEmails: string[];
  recipientCount: number;
  scheduledFor: string;
  status: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
};

function formatLabel(item: SummaryItem) {
  return item.referrer ?? item.browser ?? item.device ?? item.label ?? 'Unknown';
}

function formatDateTimeInput(date = new Date(Date.now() + 60 * 60 * 1000)) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function formatDateTimeDisplay(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function toDateTimeInputFromUtc(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return formatDateTimeInput();
  }

  const localDate = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function toUtcIsoStringFromDateTimeInput(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  const localDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    0,
    0,
  );

  return Number.isNaN(localDate.getTime()) ? null : localDate.toISOString();
}

function NavIcon({ icon, active }: { icon: NavItem['icon']; active: boolean }) {
  const iconClassName = `h-5 w-5 object-contain ${active ? '' : 'opacity-85'}`;

  if (icon === 'traffic') {
    return (
      <span className="inline-flex rounded-lg bg-white p-1 shadow-sm">
        <Image
          src="/icons/webAnalytics.png"
          alt=""
          aria-hidden="true"
          width={20}
          height={20}
          className={iconClassName}
        />
      </span>
    );
  }

  if (icon === 'newsletter') {
    return (
      <span className="inline-flex rounded-lg bg-white p-1 shadow-sm">
        <Image
          src="/icons/newsletter.png"
          alt=""
          aria-hidden="true"
          width={20}
          height={20}
          className={iconClassName}
        />
      </span>
    );
  }

  if (icon === 'help') {
    return (
      <span className="inline-flex rounded-lg bg-white p-1 shadow-sm">
        <Image
          src="/icons/help.png"
          alt=""
          aria-hidden="true"
          width={20}
          height={20}
          className={iconClassName}
        />
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-lg bg-white p-1 shadow-sm">
      <Image
        src="/icons/webEditor.png"
        alt=""
        aria-hidden="true"
        width={20}
        height={20}
        className={iconClassName}
      />
    </span>
  );
}

function LogoutIcon() {
  return (
    <span className="inline-flex rounded-lg bg-white p-1 shadow-sm">
      <Image
        src="/icons/logout.png"
        alt=""
        aria-hidden="true"
        width={20}
        height={20}
        className="h-5 w-5 object-contain"
      />
    </span>
  );
}

function AddIcon() {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brandBlue text-white shadow-sm" aria-hidden="true">
      <span className="text-lg font-semibold leading-none">+</span>
    </span>
  );
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
      )}
    </svg>
  );
}

function StatSection({
  id,
  title,
  className,
  headerAction,
  children,
}: {
  id: string;
  title: string;
  className?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`scroll-mt-24 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 ${className ?? ''}`}>
      <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        {headerAction}
      </div>
      {children}
    </section>
  );
}

type AdminPageProps = {
  adminRole: AdminRole;
};

export default function Admin({ adminRole }: AdminPageProps) {
  const router = useRouter();
  const isNewsletterOnly = adminRole === 'newsletter';
  const availableNavItems = isNewsletterOnly ? navItems.filter((item) => item.id === 'newsletter' || item.id === 'help') : navItems;
  const [selectedHelpSection, setSelectedHelpSection] = useState(helpSections[0]?.title ?? '');
  const [localTimeZone, setLocalTimeZone] = useState('');
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [subscriberEmailInput, setSubscriberEmailInput] = useState('');
  const [subscriberNotice, setSubscriberNotice] = useState('');
  const [subscriberNoticeTone, setSubscriberNoticeTone] = useState<'success' | 'error' | 'info'>('info');
  const [subscriberSubmitting, setSubscriberSubmitting] = useState(false);
  const [subscriberDeletingId, setSubscriberDeletingId] = useState<number | null>(null);
  const [subscriberFormContext, setSubscriberFormContext] = useState<'dashboard' | 'newsletter' | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsItem[]>([]);
  const [totalViews, setTotalViews] = useState(0);
  const [topReferrers, setTopReferrers] = useState<SummaryItem[]>([]);
  const [topBrowsers, setTopBrowsers] = useState<SummaryItem[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<SummaryItem[]>([]);
  const [newsletterQueue, setNewsletterQueue] = useState<NewsletterQueueItem[]>([]);
  const [selectedSubscriberEmails, setSelectedSubscriberEmails] = useState<string[]>([]);
  const [newsletterSubject, setNewsletterSubject] = useState('');
  const [newsletterBodyText, setNewsletterBodyText] = useState('');
  const [newsletterScheduledFor, setNewsletterScheduledFor] = useState(formatDateTimeInput());
  const [editingNewsletterId, setEditingNewsletterId] = useState<number | null>(null);
  const [newsletterNotice, setNewsletterNotice] = useState('');
  const [newsletterNoticeTone, setNewsletterNoticeTone] = useState<'success' | 'error' | 'info'>('info');
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const [newsletterProcessing, setNewsletterProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<NavItem['id']>(isNewsletterOnly ? 'newsletter' : 'web-traffic');

  useEffect(() => {
    setLocalTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local timezone');
  }, []);

  useEffect(() => {
    if (isNewsletterOnly && activeView !== 'newsletter' && activeView !== 'help') {
      setActiveView('newsletter');
    }
  }, [activeView, isNewsletterOnly]);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [subscribersResponse, newsletterResponse] = await Promise.all([
          fetch('/api/subscribers'),
          fetch('/api/newsletters'),
        ]);

        if (subscribersResponse.status === 401 || newsletterResponse.status === 401) {
          router.replace('/login');
          return;
        }

        if (!subscribersResponse.ok || !newsletterResponse.ok) {
          const subscribersBody = subscribersResponse.ok ? null : await subscribersResponse.json().catch(() => null);
          const newsletterBody = newsletterResponse.ok ? null : await newsletterResponse.json().catch(() => null);

          const details = [
            !subscribersResponse.ok ? subscribersBody?.details || subscribersBody?.error || `Subscribers API returned ${subscribersResponse.status}` : null,
            !newsletterResponse.ok ? newsletterBody?.details || newsletterBody?.error || `Newsletter API returned ${newsletterResponse.status}` : null,
          ].filter(Boolean);

          throw new Error(details[0] || 'Failed to load dashboard data');
        }

        const subscribersData = (await subscribersResponse.json()) as Subscriber[];
        const newsletterData = (await newsletterResponse.json()) as NewsletterQueueItem[];

        setSubscribers(subscribersData);
        setNewsletterQueue(newsletterData ?? []);

        if (isNewsletterOnly) {
          setAnalytics([]);
          setTotalViews(0);
          setTopReferrers([]);
          setTopBrowsers([]);
          setDeviceTypes([]);
          return;
        }

        const analyticsResponse = await fetch('/api/analytics');

        if (analyticsResponse.status === 401) {
          router.replace('/login');
          return;
        }

        if (!analyticsResponse.ok) {
          const analyticsBody = await analyticsResponse.json().catch(() => null);
          throw new Error(analyticsBody?.details || analyticsBody?.error || `Analytics API returned ${analyticsResponse.status}`);
        }

        const analyticsData = (await analyticsResponse.json()) as DashboardResponse;
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
  }, [isNewsletterOnly, router]);

  async function handleLogout() {
    await fetch('/api/login', { method: 'DELETE' });
    await router.push('/login');
  }

  function handleNavClick(sectionId: NavItem['id']) {
    setActiveView(sectionId);
    setMobileMenuOpen(false);
  }

  function openSubscriberForm(context: 'dashboard' | 'newsletter') {
    setSubscriberFormContext(context);
    setSubscriberNotice('');
  }

  function closeSubscriberForm() {
    setSubscriberFormContext(null);
    setSubscriberEmailInput('');
    setSubscriberNotice('');
  }

  async function refreshSubscribers() {
    const response = await fetch('/api/subscribers');

    if (response.status === 401) {
      await router.replace('/login');
      return [] as Subscriber[];
    }

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.details || body?.error || `Subscribers API returned ${response.status}`);
    }

    const data = (await response.json()) as Subscriber[];
    setSubscribers(data ?? []);
    return data ?? [];
  }

  async function handleDeleteSubscriber(subscriber: Subscriber) {
    const confirmed = window.confirm(`Delete subscriber "${subscriber.email}"?`);

    if (!confirmed) {
      return;
    }

    setSubscriberNotice('');
    setSubscriberDeletingId(subscriber.id);

    try {
      const response = await fetch(`/api/subscribers?id=${encodeURIComponent(String(subscriber.id))}`, {
        method: 'DELETE',
      });
      const body = await response.json().catch(() => null);

      if (response.status === 401) {
        await router.replace('/login');
        return;
      }

      if (!response.ok) {
        throw new Error(body?.details || body?.error || `Subscribers API returned ${response.status}`);
      }

      setSelectedSubscriberEmails((current) => current.filter((email) => email !== subscriber.email));
      await refreshSubscribers();
      setSubscriberNotice('Subscriber deleted successfully.');
      setSubscriberNoticeTone('success');
    } catch (deleteSubscriberError) {
      setSubscriberNotice(deleteSubscriberError instanceof Error ? deleteSubscriberError.message : 'Failed to delete subscriber.');
      setSubscriberNoticeTone('error');
    } finally {
      setSubscriberDeletingId(null);
    }
  }

  async function refreshNewsletterQueue() {
    const response = await fetch('/api/newsletters');

    if (response.status === 401) {
      await router.replace('/login');
      return;
    }

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.details || body?.error || `Newsletter API returned ${response.status}`);
    }

    const data = (await response.json()) as NewsletterQueueItem[];
    setNewsletterQueue(data ?? []);
  }

  async function handleAddSubscriber(event: React.FormEvent<HTMLFormElement>, options?: { selectAfterAdd?: boolean }) {
    event.preventDefault();

    const email = subscriberEmailInput.trim();

    if (!email) {
      setSubscriberNotice('Enter an email address before adding a subscriber.');
      setSubscriberNoticeTone('error');
      return;
    }

    setSubscriberNotice('');
    setSubscriberSubmitting(true);

    try {
      const response = await fetch('/api/subscribers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      const body = await response.json().catch(() => null);

      if (response.status === 401) {
        await router.replace('/login');
        return;
      }

      if (!response.ok) {
        throw new Error(body?.details || body?.error || `Subscribers API returned ${response.status}`);
      }

      const updatedSubscribers = await refreshSubscribers();
      const matchingSubscriber = updatedSubscribers.find((subscriber) => subscriber.email.toLowerCase() === email.toLowerCase());

      if (options?.selectAfterAdd && matchingSubscriber) {
        setSelectedSubscriberEmails((current) => (
          current.includes(matchingSubscriber.email)
            ? current
            : [...current, matchingSubscriber.email]
        ));
      }

      setSubscriberEmailInput('');
      setSubscriberFormContext(null);
      setSubscriberNotice(options?.selectAfterAdd ? 'Subscriber added and selected for the newsletter.' : 'Subscriber added successfully.');
      setSubscriberNoticeTone('success');
    } catch (addSubscriberError) {
      setSubscriberNotice(addSubscriberError instanceof Error ? addSubscriberError.message : 'Failed to add subscriber.');
      setSubscriberNoticeTone('error');
    } finally {
      setSubscriberSubmitting(false);
    }
  }

  function handleToggleSubscriber(email: string) {
    setSelectedSubscriberEmails((current) => (
      current.includes(email)
        ? current.filter((item) => item !== email)
        : [...current, email]
    ));
  }

  function handleSelectAllSubscribers() {
    setSelectedSubscriberEmails(subscribers.map((subscriber) => subscriber.email));
  }

  function handleClearSubscriberSelection() {
    setSelectedSubscriberEmails([]);
  }

  function resetNewsletterComposer() {
    setEditingNewsletterId(null);
    setNewsletterSubject('');
    setNewsletterBodyText('');
    setSelectedSubscriberEmails([]);
    setNewsletterScheduledFor(formatDateTimeInput());
  }

  function handleEditQueuedNewsletter(item: NewsletterQueueItem) {
    setEditingNewsletterId(item.id);
    setNewsletterSubject(item.subject);
    setNewsletterBodyText(item.bodyText);
    setSelectedSubscriberEmails(item.recipientEmails);
    setNewsletterScheduledFor(toDateTimeInputFromUtc(item.scheduledFor));
    setNewsletterNotice(`Editing queued newsletter #${item.id}.`);
    setNewsletterNoticeTone('info');
  }

  async function handleDeleteQueuedNewsletter(item: NewsletterQueueItem) {
    const confirmed = window.confirm(`Delete newsletter "${item.subject}" from the queue?`);

    if (!confirmed) {
      return;
    }

    setNewsletterNotice('');

    try {
      const response = await fetch(`/api/newsletters?id=${encodeURIComponent(String(item.id))}`, {
        method: 'DELETE',
      });
      const body = await response.json().catch(() => null);

      if (response.status === 401) {
        await router.replace('/login');
        return;
      }

      if (!response.ok) {
        throw new Error(body?.error || `Newsletter API returned ${response.status}`);
      }

      if (editingNewsletterId === item.id) {
        resetNewsletterComposer();
      }

      setNewsletterNotice('Newsletter deleted from the queue.');
      setNewsletterNoticeTone('success');
      await refreshNewsletterQueue();
    } catch (deleteError) {
      setNewsletterNotice(deleteError instanceof Error ? deleteError.message : 'Failed to delete queued newsletter.');
      setNewsletterNoticeTone('error');
    }
  }

  async function handleQueueNewsletter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const scheduledForUtc = toUtcIsoStringFromDateTimeInput(newsletterScheduledFor);

    if (!scheduledForUtc) {
      setNewsletterNotice('Choose a valid date and time for the newsletter.');
      setNewsletterNoticeTone('error');
      return;
    }

    const recipientCount = selectedSubscriberEmails.length;
    const scheduledLabel = newsletterScheduledFor ? formatDateTimeDisplay(newsletterScheduledFor) : 'the selected time';
    const confirmed = window.confirm(
      editingNewsletterId
        ? `Save changes to this queued newsletter for ${recipientCount} subscriber${recipientCount === 1 ? '' : 's'} at ${scheduledLabel}?`
        : `Schedule this newsletter for ${recipientCount} subscriber${recipientCount === 1 ? '' : 's'} at ${scheduledLabel}?`,
    );

    if (!confirmed) {
      return;
    }

    setNewsletterNotice('');
    setNewsletterSubmitting(true);

    try {
      const response = await fetch('/api/newsletters', {
        method: editingNewsletterId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingNewsletterId,
          subject: newsletterSubject,
          bodyText: newsletterBodyText,
          scheduledFor: scheduledForUtc,
          recipientEmails: selectedSubscriberEmails,
        }),
      });

      const body = await response.json().catch(() => null);

      if (response.status === 401) {
        await router.replace('/login');
        return;
      }

      if (!response.ok) {
        throw new Error(body?.error || `Newsletter API returned ${response.status}`);
      }

      resetNewsletterComposer();
      setNewsletterNotice(editingNewsletterId ? 'Queued newsletter updated successfully.' : 'Newsletter queued successfully.');
      setNewsletterNoticeTone('success');
      await refreshNewsletterQueue();
    } catch (queueError) {
      setNewsletterNotice(queueError instanceof Error ? queueError.message : 'Failed to queue newsletter.');
      setNewsletterNoticeTone('error');
    } finally {
      setNewsletterSubmitting(false);
    }
  }

  async function handleProcessDueNewsletters() {
    const dueCount = newsletterQueue.filter((item) => item.status === 'scheduled').length;
    const confirmed = window.confirm(
      `Process due newsletters now? There ${dueCount === 1 ? 'is' : 'are'} currently ${dueCount} scheduled newsletter${dueCount === 1 ? '' : 's'} in the queue.`,
    );

    if (!confirmed) {
      return;
    }

    setNewsletterNotice('');
    setNewsletterProcessing(true);

    try {
      const response = await fetch('/api/newsletters/process', {
        method: 'POST',
      });
      const body = await response.json().catch(() => null);

      if (response.status === 401) {
        await router.replace('/login');
        return;
      }

      if (!response.ok) {
        throw new Error(body?.details || body?.error || `Newsletter processor returned ${response.status}`);
      }

      setNewsletterNotice(`Processed ${body?.processed ?? 0} queued newsletter(s): ${body?.sent ?? 0} sent, ${body?.failed ?? 0} failed.`);
      setNewsletterNoticeTone('info');
      await refreshNewsletterQueue();
    } catch (processError) {
      setNewsletterNotice(processError instanceof Error ? processError.message : 'Failed to process due newsletters.');
      setNewsletterNoticeTone('error');
    } finally {
      setNewsletterProcessing(false);
    }
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
        {availableNavItems.map((item) => {
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
          onClick={handleLogout}
          className={`w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 ${
            drawerCollapsed ? 'px-2' : ''
          }`}
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
      <div className="mx-auto flex min-h-screen max-w-screen-2xl">
        <aside
          className={`sticky top-0 hidden h-screen flex-shrink-0 overflow-hidden bg-slate-950 transition-[width] duration-200 lg:block ${
            drawerCollapsed ? 'w-24' : 'w-80'
          }`}
        >
          {navContent}
        </aside>

        <main className="min-w-0 flex-1 p-4 md:p-8">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-6 flex items-start justify-between gap-4 lg:hidden">
              <div className="min-w-0 pr-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">B3U Admin</p>
                <h1 className="mt-1 text-xl font-semibold text-slate-950">Dashboard</h1>
                <p className="mt-1 text-sm text-slate-600">Analytics and content editing.</p>
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
                        {availableNavItems.map((item) => {
                          const isActive = activeView === item.id;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleNavClick(item.id)}
                              className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                                isActive
                                  ? 'bg-slate-950 text-white shadow-sm'
                                  : 'bg-slate-50 text-slate-900 hover:bg-slate-100'
                              }`}
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
                          onClick={handleLogout}
                          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-brandBlue px-4 py-3 text-sm font-semibold text-white transition hover:bg-brandBlue/90"
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

            {loading ? <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">Loading dashboard...</div> : null}
            {error ? <div className="mb-6 rounded-3xl border border-brandOrange/25 bg-brandOrange/10 p-4 text-sm text-navy">{error}</div> : null}

            {!loading && activeView === 'help' ? (
              <div id="help-admin" className="space-y-6 scroll-mt-24">
                <StatSection id="admin-help-overview" title="Admin Help">
                  <p className="text-sm text-gray-600">
                    Use this page as a quick guide to every dashboard control. Each card below explains what a button, field, tab, or status area does.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {helpSections.map((section) => (
                      <button
                        key={section.title}
                        type="button"
                        onClick={() => setSelectedHelpSection(section.title)}
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                          selectedHelpSection === section.title
                            ? 'border-brandBlue bg-brandBlue text-white'
                            : 'border-brandBlue/20 bg-brandBlue-light/15 text-navy hover:border-brandBlue hover:bg-brandBlue-light/25'
                        }`}
                      >
                        {section.title}
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-gray-500">
                    Use the buttons above to switch the instructions shown below.
                  </p>
                </StatSection>

                {helpSections
                  .filter((section) => section.title === selectedHelpSection)
                  .map((section) => (
                    <StatSection key={section.title} id={getHelpSectionId(section.title)} title={section.title} className="h-full">
                      <p className="mb-4 text-sm text-gray-500">{section.description}</p>
                      <div className="space-y-3">
                        {section.items.map((item) => (
                          <div key={`${section.title}-${item.control}`} className="rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3">
                            <div className="text-sm font-semibold text-gray-900">{item.control}</div>
                            <p className="mt-1 text-sm text-gray-600">{item.instruction}</p>
                          </div>
                        ))}
                      </div>
                    </StatSection>
                  ))}
              </div>
            ) : null}

            {!loading && !isNewsletterOnly && activeView === 'web-traffic' ? (
              <div id="web-traffic" className="space-y-6 scroll-mt-24">
                <div className="grid gap-6 lg:grid-cols-3">
                  <StatSection
                    id="subscribers"
                    title={`Subscribers (${subscribers.length})`}
                    className="h-full"
                    headerAction={(
                      <button
                        type="button"
                        onClick={() => openSubscriberForm('dashboard')}
                        className="rounded-full transition hover:scale-105"
                        aria-label="Add subscriber"
                        title="Add subscriber"
                      >
                        <AddIcon />
                      </button>
                    )}
                  >
                    {subscriberFormContext === 'dashboard' ? (
                      <form className="mb-4 space-y-3" onSubmit={(event) => void handleAddSubscriber(event)}>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-gray-700">Add subscriber</span>
                          <input
                            type="email"
                            value={subscriberEmailInput}
                            onChange={(event) => setSubscriberEmailInput(event.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20"
                            placeholder="name@example.com"
                            autoComplete="email"
                          />
                        </label>
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="submit"
                            className="rounded-xl bg-brandBlue px-4 py-3 text-sm font-semibold text-white transition hover:bg-brandBlue-dark disabled:cursor-not-allowed disabled:opacity-70"
                            disabled={subscriberSubmitting}
                          >
                            {subscriberSubmitting ? 'Adding subscriber...' : 'Add subscriber'}
                          </button>
                          <button
                            type="button"
                            onClick={closeSubscriberForm}
                            className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-brandBlue hover:text-brandBlue"
                            disabled={subscriberSubmitting}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : null}
                    {subscriberNotice ? (
                      <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
                        subscriberNoticeTone === 'success'
                          ? 'border-brandBlue/20 bg-brandBlue-light/20 text-navy'
                          : subscriberNoticeTone === 'error'
                            ? 'border-brandOrange/25 bg-brandOrange/10 text-navy'
                            : 'border-brandBlue/20 bg-brandBlue-light/10 text-navy'
                      }`}>
                        {subscriberNotice}
                      </div>
                    ) : null}
                    <div className="max-h-96 space-y-3 overflow-y-auto">
                      {subscribers.length ? (
                        subscribers.map((subscriber) => (
                          <div key={subscriber.id} className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
                            <div className="min-w-0">
                              <div className="truncate font-medium text-gray-900">{subscriber.email}</div>
                              <div className="text-sm text-gray-500">{new Date(subscriber.created_at).toLocaleString()}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleDeleteSubscriber(subscriber)}
                              className="shrink-0 rounded-full border border-brandOrange/30 px-3 py-1 text-xs font-semibold text-brandOrange transition hover:bg-brandOrange hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={subscriberDeletingId === subscriber.id}
                            >
                              {subscriberDeletingId === subscriber.id ? 'Deleting...' : 'Delete'}
                            </button>
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

            {!loading && activeView === 'newsletter' ? (
              <div id="newsletter-admin" className="space-y-6 scroll-mt-24">
                <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                  <StatSection id="newsletter-compose" title="Compose Newsletter" className="h-full">
                    <p className="mb-4 text-sm text-gray-500">
                      Schedule a newsletter for selected subscribers. The production worker processes due newsletters automatically every minute, and you can also run the due queue manually.
                    </p>
                    <p className="mb-4 text-sm text-gray-500">
                      Times shown here use {localTimeZone || 'your local timezone'}.
                    </p>

                    {editingNewsletterId ? (
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brandBlue/20 bg-brandBlue-light/15 px-4 py-3 text-sm text-navy">
                        <span>Editing queue item #{editingNewsletterId}.</span>
                        <button
                          type="button"
                          onClick={resetNewsletterComposer}
                          className="rounded-full border border-gray-300 px-3 py-1 font-medium text-gray-700 transition hover:border-brandBlue hover:text-brandBlue"
                        >
                          Cancel edit
                        </button>
                      </div>
                    ) : null}

                    {newsletterNotice ? (
                      <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
                        newsletterNoticeTone === 'success'
                          ? 'border-brandBlue/20 bg-brandBlue-light/20 text-navy'
                          : newsletterNoticeTone === 'error'
                            ? 'border-brandOrange/25 bg-brandOrange/10 text-navy'
                            : 'border-brandBlue/20 bg-brandBlue-light/10 text-navy'
                      }`}>
                        {newsletterNotice}
                      </div>
                    ) : null}

                    <form className="space-y-4" onSubmit={handleQueueNewsletter}>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-gray-700">Subject</span>
                        <input
                          type="text"
                          value={newsletterSubject}
                          onChange={(event) => setNewsletterSubject(event.target.value)}
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20"
                          placeholder="The Take Back Weekly: your subject line"
                          maxLength={160}
                          required
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-gray-700">Newsletter content</span>
                        <textarea
                          value={newsletterBodyText}
                          onChange={(event) => setNewsletterBodyText(event.target.value)}
                          className="min-h-[240px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20"
                          placeholder="Type or paste the newsletter here. Blank lines become new paragraphs in the email."
                          maxLength={20000}
                          required
                        />
                      </label>

                      <label className="block max-w-sm">
                        <span className="mb-2 block text-sm font-medium text-gray-700">Send date and time</span>
                        <input
                          type="datetime-local"
                          value={newsletterScheduledFor}
                          onChange={(event) => setNewsletterScheduledFor(event.target.value)}
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20"
                          required
                        />
                      </label>

                      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brandBlue/15 bg-brandBlue-light/10 px-4 py-3 text-sm text-navy">
                        <span>{selectedSubscriberEmails.length} of {subscribers.length} subscribers selected.</span>
                        <button type="button" onClick={handleSelectAllSubscribers} className="rounded-full bg-brandOrange px-3 py-1 font-medium text-white transition hover:bg-brandOrange-dark disabled:cursor-not-allowed disabled:opacity-60" disabled={!subscribers.length}>
                          Select all subscribers
                        </button>
                        <button type="button" onClick={handleClearSubscriberSelection} className="rounded-full border border-gray-300 px-3 py-1 font-medium text-gray-700 transition hover:border-brandBlue hover:text-brandBlue" disabled={!selectedSubscriberEmails.length}>
                          Clear selection
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button type="submit" className="rounded-xl bg-brandBlue px-5 py-3 text-sm font-semibold text-white transition hover:bg-brandBlue-dark disabled:cursor-not-allowed disabled:opacity-70" disabled={newsletterSubmitting || !selectedSubscriberEmails.length}>
                          {newsletterSubmitting ? (editingNewsletterId ? 'Saving queued newsletter...' : 'Queueing newsletter...') : (editingNewsletterId ? 'Save queued newsletter' : 'Schedule newsletter')}
                        </button>
                        <button type="button" onClick={handleProcessDueNewsletters} className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:border-brandBlue hover:text-brandBlue disabled:cursor-not-allowed disabled:opacity-70" disabled={newsletterProcessing}>
                          {newsletterProcessing ? 'Processing due queue...' : 'Process due newsletters now'}
                        </button>
                      </div>
                    </form>
                  </StatSection>

                  <StatSection
                    id="newsletter-subscribers"
                    title={`Subscribers (${subscribers.length})`}
                    className="h-full"
                    headerAction={(
                      <button
                        type="button"
                        onClick={() => openSubscriberForm('newsletter')}
                        className="rounded-full transition hover:scale-105"
                        aria-label="Add subscriber"
                        title="Add subscriber"
                      >
                        <AddIcon />
                      </button>
                    )}
                  >
                    <div className="mb-4 text-sm text-gray-500">
                      Queue capacity is not capped at eight entries in the database. The queue processor handles up to eight due newsletters per run so large backlogs clear safely over successive runs.
                    </div>
                    {subscriberFormContext === 'newsletter' ? (
                      <form className="mb-4 space-y-3" onSubmit={(event) => void handleAddSubscriber(event, { selectAfterAdd: true })}>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-gray-700">Add subscriber</span>
                          <input
                            type="email"
                            value={subscriberEmailInput}
                            onChange={(event) => setSubscriberEmailInput(event.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20"
                            placeholder="name@example.com"
                            autoComplete="email"
                          />
                        </label>
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="submit"
                            className="rounded-xl bg-brandBlue px-4 py-3 text-sm font-semibold text-white transition hover:bg-brandBlue-dark disabled:cursor-not-allowed disabled:opacity-70"
                            disabled={subscriberSubmitting}
                          >
                            {subscriberSubmitting ? 'Adding subscriber...' : 'Add subscriber to list'}
                          </button>
                          <button
                            type="button"
                            onClick={closeSubscriberForm}
                            className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-brandBlue hover:text-brandBlue"
                            disabled={subscriberSubmitting}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : null}
                    {subscriberNotice ? (
                      <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
                        subscriberNoticeTone === 'success'
                          ? 'border-brandBlue/20 bg-brandBlue-light/20 text-navy'
                          : subscriberNoticeTone === 'error'
                            ? 'border-brandOrange/25 bg-brandOrange/10 text-navy'
                            : 'border-brandBlue/20 bg-brandBlue-light/10 text-navy'
                      }`}>
                        {subscriberNotice}
                      </div>
                    ) : null}
                    <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
                      {subscribers.length ? (
                        subscribers.map((subscriber) => {
                          const checked = selectedSubscriberEmails.includes(subscriber.email);

                          return (
                            <div key={subscriber.id} className="flex items-start gap-3 rounded-2xl border border-gray-200 px-4 py-3 transition hover:border-brandBlue/30 hover:bg-brandBlue-light/10">
                              <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => handleToggleSubscriber(subscriber.email)}
                                  className="mt-1 h-4 w-4 rounded border-gray-300 text-brandBlue focus:ring-brandBlue"
                                />
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-medium text-gray-900">{subscriber.email}</span>
                                  <span className="block text-xs text-gray-500">Joined {new Date(subscriber.created_at).toLocaleString()}</span>
                                </span>
                              </label>
                              <button
                                type="button"
                                onClick={() => void handleDeleteSubscriber(subscriber)}
                                className="shrink-0 rounded-full border border-brandOrange/30 px-3 py-1 text-xs font-semibold text-brandOrange transition hover:bg-brandOrange hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={subscriberDeletingId === subscriber.id}
                              >
                                {subscriberDeletingId === subscriber.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-gray-500">No subscribers are available yet.</p>
                      )}
                    </div>
                  </StatSection>
                </div>

                <StatSection id="newsletter-queue" title={`Scheduled Queue (${newsletterQueue.length})`}>
                  <div className="max-h-[520px] space-y-4 overflow-y-auto">
                    {newsletterQueue.length ? (
                      newsletterQueue.map((item) => {
                        const statusClassName = item.status === 'sent'
                          ? 'bg-brandBlue-light/20 text-navy'
                          : item.status === 'failed'
                            ? 'bg-brandOrange/10 text-navy'
                            : item.status === 'processing'
                              ? 'bg-brandBlue/10 text-brandBlue-dark'
                              : 'bg-brandOrange/15 text-brandOrange-dark';

                        return (
                          <div key={item.id} className="rounded-3xl border border-gray-200 p-4 shadow-sm sm:p-5">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-3">
                                  <h3 className="text-lg font-semibold text-gray-900">{item.subject}</h3>
                                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusClassName}`}>
                                    {item.status}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm text-gray-500">
                                  Scheduled for {formatDateTimeDisplay(item.scheduledFor)} · {item.recipientCount} recipient{item.recipientCount === 1 ? '' : 's'}
                                </p>
                                <p className="mt-1 text-xs text-gray-400">Created {formatDateTimeDisplay(item.createdAt)}</p>
                                {item.sentAt ? <p className="mt-1 text-xs text-gray-400">Sent {formatDateTimeDisplay(item.sentAt)}</p> : null}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {item.status === 'scheduled' || item.status === 'failed' ? (
                                  <button
                                    type="button"
                                    onClick={() => handleEditQueuedNewsletter(item)}
                                    className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-brandBlue hover:text-brandBlue"
                                  >
                                    Edit
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteQueuedNewsletter(item)}
                                  className="rounded-full border border-brandOrange/20 bg-brandOrange/10 px-3 py-1 text-xs font-semibold text-navy transition hover:bg-brandOrange/15"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                            <div className="mt-4 rounded-2xl bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-700 whitespace-pre-wrap">{item.bodyText}</div>
                            {item.lastError ? <p className="mt-3 rounded-2xl border border-brandOrange/20 bg-brandOrange/10 px-4 py-3 text-sm text-navy">Last error: {item.lastError}</p> : null}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-gray-500">No newsletters are queued yet.</p>
                    )}
                  </div>
                </StatSection>
              </div>
            ) : null}

            {!loading && !isNewsletterOnly && activeView === 'site-editor' ? <SiteEditorPanel /> : null}
          </div>
        </main>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<AdminPageProps> = async ({ req }) => {
  if (!hasAdminSession(req.headers.cookie)) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  return {
    props: {
      adminRole: getAdminRole(req.headers.cookie) ?? 'full',
    },
  };
};
