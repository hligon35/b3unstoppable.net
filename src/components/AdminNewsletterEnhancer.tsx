import { useEffect } from 'react';
import { useRouter } from 'next/router';

const BUILDER_CARD_ID = 'newsletter-template-builder-shortcut';

function replaceButtonLabels(root: ParentNode = document) {
  const buttons = Array.from(root.querySelectorAll('button'));

  buttons.forEach((button) => {
    const label = button.textContent?.trim();

    if (label === 'Process due newsletters now') {
      button.textContent = 'Send now';
    }

    if (label === 'Processing due queue...') {
      button.textContent = 'Sending now...';
    }

    if (label === 'Schedule newsletter') {
      button.textContent = 'Schedule newsletter now?';
    }

    if (label === 'Queueing newsletter...') {
      button.textContent = 'Scheduling newsletter...';
    }
  });
}

function ensureBuilderShortcut() {
  const newsletterAdmin = document.getElementById('newsletter-admin');

  if (!newsletterAdmin || document.getElementById(BUILDER_CARD_ID)) {
    return;
  }

  const shortcut = document.createElement('section');
  shortcut.id = BUILDER_CARD_ID;
  shortcut.className = 'scroll-mt-24 rounded-3xl border border-brandBlue/20 bg-white p-6 shadow-sm';
  shortcut.innerHTML = `
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.22em] text-brandOrange">New</p>
        <h2 class="mt-2 text-xl font-semibold text-gray-900">Weekly Newsletter Template Builder</h2>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
          Use the new two-tab builder to manage a blank letter-style template separately from the weekly newsletter text.
        </p>
      </div>
      <a href="/newsletter-builder" class="inline-flex items-center justify-center rounded-xl bg-brandBlue px-5 py-3 text-sm font-semibold text-white transition hover:bg-brandBlue-dark">
        Open Builder
      </a>
    </div>
    <div class="mt-5 grid gap-3 md:grid-cols-2">
      <div class="rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3">
        <div class="text-sm font-semibold text-gray-900">Blank Template</div>
        <p class="mt-1 text-sm text-gray-600">Upload or preview the reusable blank weekly letter design.</p>
      </div>
      <div class="rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3">
        <div class="text-sm font-semibold text-gray-900">Weekly Newsletter</div>
        <p class="mt-1 text-sm text-gray-600">Write this week's sections, preview them, select subscribers, and schedule the email.</p>
      </div>
    </div>
  `;

  newsletterAdmin.prepend(shortcut);
}

function installConfirmTextOverrides() {
  const originalConfirm = window.confirm;

  window.confirm = (message?: string) => {
    if (typeof message === 'string' && message.startsWith('Process due newsletters now?')) {
      return originalConfirm.call(window, 'Send newsletter now?');
    }

    if (typeof message === 'string' && message.startsWith('Schedule this newsletter for')) {
      return originalConfirm.call(window, 'Schedule newsletter now?');
    }

    return originalConfirm.call(window, message);
  };

  return () => {
    window.confirm = originalConfirm;
  };
}

export default function AdminNewsletterEnhancer() {
  const router = useRouter();

  useEffect(() => {
    if (router.pathname !== '/admin') {
      return undefined;
    }

    const restoreConfirm = installConfirmTextOverrides();

    const syncAdminNewsletterUi = () => {
      replaceButtonLabels();
      ensureBuilderShortcut();
    };

    syncAdminNewsletterUi();

    const observer = new MutationObserver(() => {
      syncAdminNewsletterUi();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      restoreConfirm();
    };
  }, [router.pathname]);

  return null;
}
