import { useEffect } from 'react';
import { useRouter } from 'next/router';

const BUILDER_EMBED_ID = 'newsletter-builder-embed';

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

function ensureBuilderEmbed() {
  const newsletterAdmin = document.getElementById('newsletter-admin');

  if (!newsletterAdmin || document.getElementById(BUILDER_EMBED_ID)) {
    return;
  }

  Array.from(newsletterAdmin.children).forEach((child) => {
    if (child.id !== BUILDER_EMBED_ID) {
      (child as HTMLElement).style.display = 'none';
    }
  });

  const embed = document.createElement('section');
  embed.id = BUILDER_EMBED_ID;
  embed.className = 'scroll-mt-24 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm';
  embed.innerHTML = `
    <iframe
      src="/newsletter-builder"
      title="Weekly Newsletter Builder"
      class="h-[calc(100vh-5rem)] min-h-[1100px] w-full border-0 bg-slate-100"
    ></iframe>
  `;

  newsletterAdmin.prepend(embed);
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
      ensureBuilderEmbed();
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
