import Image from 'next/image';
import Script from 'next/script';
import { useEffect, useState } from 'react';

import PublishIcon from '../../publish.png';
import ResetIcon from '../../reset.png';
import SaveIcon from '../../save.png';

import {
  createEmptyEventCard,
  eventGalleryContent,
  type EventGalleryCardContent,
  type EventCardMediaType,
  type EventCardSecondaryActionType,
} from '@/lib/eventGalleryContent';
import {
  SITE_EDITOR_STORAGE_KEY,
  defaultSiteImageSelections,
  mergeSiteImageSelections,
  resolveSiteImage,
  siteImageFieldMeta,
  siteImageFieldsByPage,
  siteImagePages,
  type SiteImagePage,
  type SiteImageField,
  type SiteImageSelections,
} from '@/lib/siteEditorImages';

type EditorTab = 'about' | 'newsletter' | 'events' | 'shop' | 'colors' | 'images';
type EventsPanelTab = 'page' | 'cards';
type ShopPanelTab = 'page' | 'products';

type PayPalProductDraft = {
  id: string;
  label: string;
  containerId: string;
  hostedButtonId: string;
};

type SiteDraft = SiteImageSelections & {
  pageTitle: string;
  status: 'draft';
  brandBlue: string;
  brandBlueDark: string;
  brandBlueLight: string;
  brandOrange: string;
  brandOrangeDark: string;
  brandOrangeLight: string;
  navy: string;
  aboutHeading: string;
  aboutParagraphOne: string;
  aboutParagraphTwo: string;
  aboutTagline: string;
  aboutCtaLabel: string;
  aboutCtaHref: string;
  newsletterHeading: string;
  newsletterDescription: string;
  eventsHeading: string;
  eventsDescription: string;
  eventsBookUpdateEyebrow: string;
  eventsBookUpdateTitle: string;
  eventsBookUpdateDescription: string;
  eventCards: EventGalleryCardContent[];
  shopEyebrow: string;
  shopTitle: string;
  shopIntroOne: string;
  shopIntroTwo: string;
  shopOrderTitle: string;
  shopOrderDescription: string;
  shopContactTitle: string;
  shopContactDescription: string;
  shopProducts: PayPalProductDraft[];
};

type PayPalWindow = Window & {
  paypal?: {
    HostedButtons: (options: { hostedButtonId: string }) => {
      render: (selector: string) => void;
    };
  };
};

const editorTabs: Array<{ id: EditorTab; label: string }> = [
  { id: 'about', label: 'About Section' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'events', label: 'Events' },
  { id: 'shop', label: 'Shop' },
  { id: 'colors', label: 'Colors' },
  { id: 'images', label: 'Images' },
];

const defaultDraft: SiteDraft = {
  ...defaultSiteImageSelections,
  pageTitle: 'Homepage',
  status: 'draft',
  brandBlue: '#7BAFD4',
  brandBlueDark: '#4B86AB',
  brandBlueLight: '#A9CBE2',
  brandOrange: '#CC5500',
  brandOrangeDark: '#A64400',
  brandOrangeLight: '#E6762A',
  navy: '#0A1A2A',
  aboutHeading: 'About Dr. Bree Charles',
  aboutParagraphOne:
    "Transformational speaker, author, U.S. Army veteran, and creator of the B3U Podcast. Bree has turned her pain into purpose, proving that brokenness doesn't mean defeat it means rebirth.",
  aboutParagraphTwo:
    'Through courage, faith, and relentless resilience, she helps others burn away fear, break destructive patterns, and become who they were created to be.',
  aboutTagline: 'Breaking Cycles. Building Legacies.',
  aboutCtaLabel: 'Learn More About Bree',
  aboutCtaHref: '/about',
  newsletterHeading: 'Join "The Take Back Weekly"',
  newsletterDescription: 'Get new episodes, inspiration, and community opportunities delivered to your inbox.',
  eventsHeading: eventGalleryContent.heading,
  eventsDescription: eventGalleryContent.description,
  eventsBookUpdateEyebrow: eventGalleryContent.bannerEyebrow,
  eventsBookUpdateTitle: eventGalleryContent.bannerTitle,
  eventsBookUpdateDescription: eventGalleryContent.bannerDescription,
  eventCards: eventGalleryContent.cards.map((card) => ({ ...card })),
  shopEyebrow: 'Featured book',
  shopTitle: 'The Big Take Back: What I Left Behind',
  shopIntroOne:
    'More than a memoir, this book is a movement and a method. Dr. Bree Charles shares the raw truth of trauma, loss, fear, and survival, then walks readers toward healing, clarity, and the decision to take their lives back.',
  shopIntroTwo:
    'This is for the reader who is ready to stop living in survival mode, confront what has been carried too long, and rebuild life with clarity, confidence, and conviction.',
  shopOrderTitle: 'Order your copy now',
  shopOrderDescription:
    'The Big Take Back is on sale now. Choose the edition that fits your shelf and keep building the kind of freedom that changes what comes next.',
  shopContactTitle: 'Stay connected',
  shopContactDescription: 'Want updates, speaking details, or help placing a larger order? Reach out directly or join the weekly list.',
  shopProducts: [
    {
      id: 'paperback',
      label: 'Paperback',
      containerId: 'paypal-container-RDELK856FXAPN',
      hostedButtonId: 'RDELK856FXAPN',
    },
    {
      id: 'hardcover',
      label: 'Hardcover',
      containerId: 'paypal-container-XMM68ZBM73KMG',
      hostedButtonId: 'XMM68ZBM73KMG',
    },
  ],
};

function formatSavedAt(savedAt: string | null) {
  if (!savedAt) {
    return 'Not saved yet';
  }

  return new Date(savedAt).toLocaleString();
}

function buildPayPalContainerId(hostedButtonId: string) {
  return hostedButtonId ? `paypal-container-${hostedButtonId}` : '';
}

function buildShopPreviewContainerId(productId: string) {
  return `shop-preview-container-${productId}`;
}

function hexToRgbChannels(hex: string) {
  const normalizedHex = hex.replace('#', '');

  if (normalizedHex.length !== 6) {
    return null;
  }

  const red = Number.parseInt(normalizedHex.slice(0, 2), 16);
  const green = Number.parseInt(normalizedHex.slice(2, 4), 16);
  const blue = Number.parseInt(normalizedHex.slice(4, 6), 16);

  if ([red, green, blue].some(Number.isNaN)) {
    return null;
  }

  return `${red} ${green} ${blue}`;
}

function stackedCardZIndex(position: number, expanded: boolean) {
  if (expanded) {
    return 'z-20';
  }

  const zIndexClasses = ['z-50', 'z-40', 'z-30', 'z-20', 'z-10', 'z-0'];
  return zIndexClasses[position] ?? 'z-0';
}

export default function SiteEditorPanel() {
  const [activeTab, setActiveTab] = useState<EditorTab>('about');
  const [draft, setDraft] = useState<SiteDraft>(defaultDraft);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [activeEventsPanelTab, setActiveEventsPanelTab] = useState<EventsPanelTab>('page');
  const [activeShopPanelTab, setActiveShopPanelTab] = useState<ShopPanelTab>('page');
  const [activeImagePage, setActiveImagePage] = useState<SiteImagePage>('home');
  const [selectedEventCardId, setSelectedEventCardId] = useState(defaultDraft.eventCards[0]?.id ?? '');
  const [draggedEventCardId, setDraggedEventCardId] = useState<string | null>(null);
  const [dragOverEventCardId, setDragOverEventCardId] = useState<string | null>(null);
  const [selectedShopProductId, setSelectedShopProductId] = useState(defaultDraft.shopProducts[0]?.id ?? '');
  const [draggedShopProductId, setDraggedShopProductId] = useState<string | null>(null);
  const [dragOverShopProductId, setDragOverShopProductId] = useState<string | null>(null);
  const [expandedEventCards, setExpandedEventCards] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(defaultDraft.eventCards.map((card) => [card.id, true])),
  );
  const [expandedShopProducts, setExpandedShopProducts] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(defaultDraft.shopProducts.map((product) => [product.id, true])),
  );
  const visibleEventCards = draft.eventCards;
  const selectedEventCard = draft.eventCards.find((card) => card.id === selectedEventCardId) ?? draft.eventCards[0] ?? null;
  const selectedShopProduct = draft.shopProducts.find((product) => product.id === selectedShopProductId) ?? draft.shopProducts[0] ?? null;
  const homeImageSelections = siteImageFieldsByPage.home.map((field) => ({
    field,
    asset: resolveSiteImage(draft[field], defaultSiteImageSelections[field]),
  }));
  const aboutFeatureImage = resolveSiteImage(draft.aboutPageFeatureImage, defaultSiteImageSelections.aboutPageFeatureImage);
  const eventsFlyerImage = resolveSiteImage(draft.eventsFlyerImage, defaultSiteImageSelections.eventsFlyerImage);
  const eventsBookImage = resolveSiteImage(draft.eventsBookImage, defaultSiteImageSelections.eventsBookImage);
  const shopBookImage = resolveSiteImage(draft.shopBookImage, defaultSiteImageSelections.shopBookImage);

  function renderShopPreviewButtons() {
    if (typeof window === 'undefined') {
      return;
    }

    const paypal = (window as PayPalWindow).paypal;
    if (!paypal) {
      return;
    }

    draft.shopProducts.forEach((product) => {
      const containerId = buildShopPreviewContainerId(product.id);
      const container = document.getElementById(containerId);

      if (!container) {
        return;
      }

      container.innerHTML = '';

      if (!product.hostedButtonId) {
        return;
      }

      paypal.HostedButtons({ hostedButtonId: product.hostedButtonId }).render(`#${containerId}`);
    });
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const rawDraft = window.localStorage.getItem(SITE_EDITOR_STORAGE_KEY);
    if (!rawDraft) {
      return;
    }

    try {
      const parsed = JSON.parse(rawDraft) as { draft?: SiteDraft; savedAt?: string };
      if (parsed.draft) {
        const mergedImageSelections = mergeSiteImageSelections(parsed.draft);
        setDraft({
          ...defaultDraft,
          ...parsed.draft,
          ...mergedImageSelections,
          eventCards: parsed.draft.eventCards ?? defaultDraft.eventCards,
          shopProducts: parsed.draft.shopProducts ?? defaultDraft.shopProducts,
        });
      }
      setLastSavedAt(parsed.savedAt ?? null);
    } catch {
      window.localStorage.removeItem(SITE_EDITOR_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    setExpandedEventCards((currentState) => {
      const nextState: Record<string, boolean> = {};

      draft.eventCards.forEach((card) => {
        nextState[card.id] = currentState[card.id] ?? true;
      });

      return nextState;
    });
  }, [draft.eventCards]);

  useEffect(() => {
    setExpandedShopProducts((currentState) => {
      const nextState: Record<string, boolean> = {};

      draft.shopProducts.forEach((product) => {
        nextState[product.id] = currentState[product.id] ?? true;
      });

      return nextState;
    });
  }, [draft.shopProducts]);

  useEffect(() => {
    if (!draft.eventCards.length) {
      setSelectedEventCardId('');
      return;
    }

    if (!draft.eventCards.some((card) => card.id === selectedEventCardId)) {
      setSelectedEventCardId(draft.eventCards[0].id);
    }
  }, [draft.eventCards, selectedEventCardId]);

  useEffect(() => {
    if (!draft.shopProducts.length) {
      setSelectedShopProductId('');
      return;
    }

    if (!draft.shopProducts.some((product) => product.id === selectedShopProductId)) {
      setSelectedShopProductId(draft.shopProducts[0].id);
    }
  }, [draft.shopProducts, selectedShopProductId]);

  useEffect(() => {
    if (activeTab !== 'shop' || activeShopPanelTab !== 'products') {
      return;
    }

    const renderTimeout = window.setTimeout(() => {
      renderShopPreviewButtons();
    }, 0);

    return () => {
      window.clearTimeout(renderTimeout);
    };
  }, [activeTab, activeShopPanelTab, draft.shopProducts]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const root = window.document.documentElement;
    const paletteEntries: Array<[string, string]> = [
      ['--color-brand-blue', draft.brandBlue],
      ['--color-brand-blue-dark', draft.brandBlueDark],
      ['--color-brand-blue-light', draft.brandBlueLight],
      ['--color-brand-orange', draft.brandOrange],
      ['--color-brand-orange-dark', draft.brandOrangeDark],
      ['--color-brand-orange-light', draft.brandOrangeLight],
      ['--color-navy', draft.navy],
    ];

    paletteEntries.forEach(([tokenName, tokenValue]) => {
      const rgbChannels = hexToRgbChannels(tokenValue);

      if (rgbChannels) {
        root.style.setProperty(tokenName, rgbChannels);
      }
    });
  }, [
    draft.brandBlue,
    draft.brandBlueDark,
    draft.brandBlueLight,
    draft.brandOrange,
    draft.brandOrangeDark,
    draft.brandOrangeLight,
    draft.navy,
  ]);

  function updateDraft<Field extends keyof SiteDraft>(field: Field, value: SiteDraft[Field]) {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }));
    setSaveMessage('Unsaved changes');
  }

  function handleImageUpload(field: SiteImageField, file: File | null) {
    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : null;

      if (!dataUrl) {
        return;
      }

      updateDraft(field, {
        kind: 'uploaded',
        dataUrl,
        fileName: file.name,
      });
    };

    reader.readAsDataURL(file);
  }

  function updateShopProduct<Field extends keyof PayPalProductDraft>(index: number, field: Field, value: PayPalProductDraft[Field]) {
    const currentProduct = draft.shopProducts[index];
    setDraft((currentDraft) => ({
      ...currentDraft,
      shopProducts: currentDraft.shopProducts.map((product, productIndex) =>
        productIndex === index
          ? {
              ...product,
              [field]: value,
              ...(field === 'hostedButtonId' ? { containerId: buildPayPalContainerId(String(value)) } : {}),
            }
          : product,
      ),
    }));
    if (currentProduct) {
      setSelectedShopProductId(currentProduct.id);
    }
    setSaveMessage('Unsaved changes');
  }

  function toggleShopProductEditor(productId: string) {
    setSelectedShopProductId(productId);
    setExpandedShopProducts((currentState) => ({
      ...currentState,
      [productId]: !currentState[productId],
    }));
  }

  function updateEventCard<Field extends keyof EventGalleryCardContent>(index: number, field: Field, value: EventGalleryCardContent[Field]) {
    const currentCard = draft.eventCards[index];
    setDraft((currentDraft) => ({
      ...currentDraft,
      eventCards: currentDraft.eventCards.map((card, cardIndex) =>
        cardIndex === index ? { ...card, [field]: value } : card,
      ),
    }));
    if (currentCard) {
      setSelectedEventCardId(currentCard.id);
    }
    setSaveMessage('Unsaved changes');
  }

  function toggleEventCardEditor(cardId: string) {
    setSelectedEventCardId(cardId);
    setExpandedEventCards((currentState) => ({
      ...currentState,
      [cardId]: !currentState[cardId],
    }));
  }

  function addEventCard() {
    setDraft((currentDraft) => ({
      ...currentDraft,
      eventCards: [...currentDraft.eventCards, createEmptyEventCard(currentDraft.eventCards.length + 1)],
    }));
    setSaveMessage('Unsaved changes');
  }

  function removeEventCard(index: number) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      eventCards: currentDraft.eventCards.filter((_, cardIndex) => cardIndex !== index),
    }));
    setSaveMessage('Unsaved changes');
  }

  function moveEventCard(index: number, direction: 'up' | 'down') {
    setDraft((currentDraft) => {
      const nextCards = [...currentDraft.eventCards];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= nextCards.length) {
        return currentDraft;
      }

      const [movedCard] = nextCards.splice(index, 1);
      nextCards.splice(targetIndex, 0, movedCard);

      return {
        ...currentDraft,
        eventCards: nextCards,
      };
    });
    setSaveMessage('Unsaved changes');
  }

  function moveEventCardToIndex(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) {
      return;
    }

    setDraft((currentDraft) => {
      const nextCards = [...currentDraft.eventCards];
      const [movedCard] = nextCards.splice(fromIndex, 1);
      nextCards.splice(toIndex, 0, movedCard);

      return {
        ...currentDraft,
        eventCards: nextCards,
      };
    });
    setSaveMessage('Unsaved changes');
  }

  function handleEventCardDrop(targetCardId: string) {
    if (!draggedEventCardId || draggedEventCardId === targetCardId) {
      setDraggedEventCardId(null);
      setDragOverEventCardId(null);
      return;
    }

    const fromIndex = draft.eventCards.findIndex((card) => card.id === draggedEventCardId);
    const toIndex = draft.eventCards.findIndex((card) => card.id === targetCardId);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggedEventCardId(null);
      setDragOverEventCardId(null);
      return;
    }

    moveEventCardToIndex(fromIndex, toIndex);
    setSelectedEventCardId(draggedEventCardId);
    setDraggedEventCardId(null);
    setDragOverEventCardId(null);
  }

  function addShopProduct() {
    setDraft((currentDraft) => ({
      ...currentDraft,
      shopProducts: [
        ...currentDraft.shopProducts,
        {
          id: `product-${Date.now()}`,
          label: `Product ${currentDraft.shopProducts.length + 1}`,
          containerId: '',
          hostedButtonId: '',
        },
      ],
    }));
    setSaveMessage('Unsaved changes');
  }

  function removeShopProduct(index: number) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      shopProducts: currentDraft.shopProducts.filter((_, productIndex) => productIndex !== index),
    }));
    setSaveMessage('Unsaved changes');
  }

  function moveShopProductToIndex(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) {
      return;
    }

    setDraft((currentDraft) => {
      const nextProducts = [...currentDraft.shopProducts];
      const [movedProduct] = nextProducts.splice(fromIndex, 1);
      nextProducts.splice(toIndex, 0, movedProduct);

      return {
        ...currentDraft,
        shopProducts: nextProducts,
      };
    });
    setSaveMessage('Unsaved changes');
  }

  function handleShopProductDrop(targetProductId: string) {
    if (!draggedShopProductId || draggedShopProductId === targetProductId) {
      setDraggedShopProductId(null);
      setDragOverShopProductId(null);
      return;
    }

    const fromIndex = draft.shopProducts.findIndex((product) => product.id === draggedShopProductId);
    const toIndex = draft.shopProducts.findIndex((product) => product.id === targetProductId);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggedShopProductId(null);
      setDragOverShopProductId(null);
      return;
    }

    moveShopProductToIndex(fromIndex, toIndex);
    setSelectedShopProductId(draggedShopProductId);
    setDraggedShopProductId(null);
    setDragOverShopProductId(null);
  }

  function handleSaveDraft() {
    if (typeof window === 'undefined') {
      return;
    }

    const savedAt = new Date().toISOString();
    window.localStorage.setItem(SITE_EDITOR_STORAGE_KEY, JSON.stringify({ draft, savedAt }));
    setLastSavedAt(savedAt);
    setSaveMessage('Draft saved locally. Publishing API is the next slice.');
  }

  function handleResetDraft() {
    setDraft(defaultDraft);
    setLastSavedAt(null);
    setSaveMessage('Draft reset to current source values.');

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SITE_EDITOR_STORAGE_KEY);
    }
  }

  return (
    <section id="site-editor" className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="border-b border-gray-200 pb-6">
        <nav>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-100 p-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl bg-white p-1 shadow-sm">
              {editorTabs.map((tab) => {
                const isActive = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                      isActive ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-1 flex-wrap items-center justify-center gap-3 text-sm text-slate-600">
              <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
                <span className={`h-2.5 w-2.5 rounded-full ${saveMessage === 'Unsaved changes' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <span className="font-medium text-slate-950">{draft.status}</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-950/70" />
                <span>{formatSavedAt(lastSavedAt)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled
                aria-label="Publish workflow next"
                title="Publish workflow next"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-base text-gray-400"
              >
                <Image src={PublishIcon} alt="" className="h-5 w-5 object-contain opacity-50" />
              </button>
              <button
                type="button"
                onClick={handleResetDraft}
                aria-label="Reset to source copy"
                title="Reset to source copy"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-300 bg-white text-base font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
              >
                <Image src={ResetIcon} alt="" className="h-5 w-5 object-contain" />
              </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  aria-label="Save draft"
                  title="Save draft"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-300 bg-white text-base font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                >
                  <Image src={SaveIcon} alt="" className="h-5 w-5 object-contain" />
                </button>
            </div>
          </div>
        </nav>

        {activeTab === 'events' && selectedEventCard ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Events Panel</h2>
                  <p className="mt-2 text-sm text-gray-600">Switch between the page-level copy and the event card editor from the same panel.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setActiveEventsPanelTab('page')}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                      activeEventsPanelTab === 'page' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    Events Page
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveEventsPanelTab('cards')}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                      activeEventsPanelTab === 'cards' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    Event Cards
                  </button>
                </div>
              </div>

              {activeEventsPanelTab === 'page' ? (
                <div className="mt-5 space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Page Heading
                    <input
                      type="text"
                      value={draft.eventsHeading}
                      onChange={(event) => updateDraft('eventsHeading', event.target.value)}
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                    />
                  </label>

                  <label className="block text-sm font-medium text-gray-700">
                    Events Description
                    <textarea
                      value={draft.eventsDescription}
                      onChange={(event) => updateDraft('eventsDescription', event.target.value)}
                      rows={6}
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                    />
                  </label>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Event Cards</h3>
                      <p className="mt-1 text-sm text-gray-600">Collapsed cards stack in one column. Select a card to link it to the viewer.</p>
                    </div>
                    <button
                      type="button"
                      onClick={addEventCard}
                      className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      Add Card
                    </button>
                  </div>

                  <div className="flex min-w-0 flex-col overflow-visible">
                    {draft.eventCards.map((card, index) => {
                      const isExpanded = expandedEventCards[card.id];
                      const isSelected = selectedEventCard?.id === card.id;

                      return (
                        <div
                          key={card.id}
                          onClick={() => setSelectedEventCardId(card.id)}
                          onFocusCapture={() => setSelectedEventCardId(card.id)}
                          onDragOver={(event) => {
                            event.preventDefault();
                            setDragOverEventCardId(card.id);
                          }}
                          onDrop={() => handleEventCardDrop(card.id)}
                          onDragLeave={() => {
                            if (dragOverEventCardId === card.id) {
                              setDragOverEventCardId(null);
                            }
                          }}
                          className={`relative border border-gray-200 bg-gray-50 px-4 py-3 transition ${
                            index === 0 ? '' : 'mt-3'
                          } ${
                            isSelected ? 'border-slate-950 bg-slate-50 shadow-sm' : ''
                          } ${
                            dragOverEventCardId === card.id ? 'ring-2 ring-slate-950/15' : ''
                          } ${
                            index === 0 ? 'rounded-t-2xl' : ''
                          } ${
                            index === draft.eventCards.length - 1 ? 'rounded-b-2xl' : ''
                          } ${
                            isExpanded ? 'rounded-2xl pb-4 pt-4' : 'min-h-[64px] cursor-pointer'
                          } ${stackedCardZIndex(index, isExpanded)}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEventCardId(card.id);
                                if (!isExpanded) {
                                  toggleEventCardEditor(card.id);
                                }
                              }}
                              className="min-w-0 flex-1 text-left"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-base font-semibold text-gray-900">{card.title || `Card ${index + 1}`}</span>
                                {isSelected ? <span className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">Live</span> : null}
                              </div>
                              {isExpanded ? <p className="mt-1 text-xs text-gray-500">Viewer linked. Collapse this card to condense the stack.</p> : null}
                            </button>

                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <button
                                  type="button"
                                  onClick={() => toggleEventCardEditor(card.id)}
                                  className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700"
                                >
                                  Collapse
                                </button>
                              ) : null}
                              <button
                                type="button"
                                aria-label={`Delete ${card.title || `Card ${index + 1}`}`}
                                onClick={() => removeEventCard(index)}
                                disabled={draft.eventCards.length === 1}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-lg leading-none text-gray-700 transition hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-400"
                              >
                                ×
                              </button>
                              <button
                                type="button"
                                draggable
                                aria-label={`Move ${card.title || `Card ${index + 1}`}`}
                                onDragStart={() => {
                                  setDraggedEventCardId(card.id);
                                  setSelectedEventCardId(card.id);
                                }}
                                onDragEnd={() => {
                                  setDraggedEventCardId(null);
                                  setDragOverEventCardId(null);
                                }}
                                className="flex h-9 w-11 cursor-grab items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-gray-500 transition hover:border-gray-400 hover:text-gray-800 active:cursor-grabbing"
                              >
                                <span className="grid grid-cols-2 gap-[2px]">
                                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                </span>
                              </button>
                            </div>
                          </div>

                          {isExpanded ? (
                            <div className="mt-4 space-y-4">
                              <div className="grid gap-4 md:grid-cols-2">
                                <label className="block text-sm font-medium text-gray-700">
                                  Media Type
                                  <select
                                    value={card.mediaType}
                                    onChange={(event) => updateEventCard(index, 'mediaType', event.target.value as EventCardMediaType)}
                                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                                  >
                                    <option value="flyer">Flyer</option>
                                    <option value="book">Book</option>
                                  </select>
                                </label>
                                <label className="block text-sm font-medium text-gray-700">
                                  Media Badge
                                  <input
                                    type="text"
                                    value={card.mediaBadge}
                                    onChange={(event) => updateEventCard(index, 'mediaBadge', event.target.value)}
                                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                                  />
                                </label>
                              </div>

                              <label className="block text-sm font-medium text-gray-700">
                                Title
                                <input
                                  type="text"
                                  value={card.title}
                                  onChange={(event) => updateEventCard(index, 'title', event.target.value)}
                                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                                />
                              </label>

                              <label className="block text-sm font-medium text-gray-700">
                                Description
                                <textarea
                                  value={card.description}
                                  onChange={(event) => updateEventCard(index, 'description', event.target.value)}
                                  rows={4}
                                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                                />
                              </label>

                              <div className="grid gap-4 md:grid-cols-3">
                                <label className="block text-sm font-medium text-gray-700">
                                  Badge One
                                  <input
                                    type="text"
                                    value={card.badgeOne}
                                    onChange={(event) => updateEventCard(index, 'badgeOne', event.target.value)}
                                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                                  />
                                </label>
                                <label className="block text-sm font-medium text-gray-700">
                                  Badge Two
                                  <input
                                    type="text"
                                    value={card.badgeTwo}
                                    onChange={(event) => updateEventCard(index, 'badgeTwo', event.target.value)}
                                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                                  />
                                </label>
                                <label className="block text-sm font-medium text-gray-700">
                                  Badge Three
                                  <input
                                    type="text"
                                    value={card.badgeThree}
                                    onChange={(event) => updateEventCard(index, 'badgeThree', event.target.value)}
                                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                                  />
                                </label>
                              </div>

                              <div className="grid gap-4 md:grid-cols-2">
                                <label className="block text-sm font-medium text-gray-700">
                                  Detail Title
                                  <input
                                    type="text"
                                    value={card.detailTitle}
                                    onChange={(event) => updateEventCard(index, 'detailTitle', event.target.value)}
                                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                                  />
                                </label>
                                <label className="block text-sm font-medium text-gray-700">
                                  Detail Line One
                                  <input
                                    type="text"
                                    value={card.detailLineOne}
                                    onChange={(event) => updateEventCard(index, 'detailLineOne', event.target.value)}
                                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                                  />
                                </label>
                              </div>

                              <div className="grid gap-4 md:grid-cols-2">
                                <label className="block text-sm font-medium text-gray-700">
                                  Detail Line Two
                                  <input
                                    type="text"
                                    value={card.detailLineTwo}
                                    onChange={(event) => updateEventCard(index, 'detailLineTwo', event.target.value)}
                                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                                  />
                                </label>
                                <label className="block text-sm font-medium text-gray-700">
                                  Detail Line Three
                                  <input
                                    type="text"
                                    value={card.detailLineThree}
                                    onChange={(event) => updateEventCard(index, 'detailLineThree', event.target.value)}
                                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                                  />
                                </label>
                              </div>

                              <div className="grid gap-4 md:grid-cols-2">
                                <label className="block text-sm font-medium text-gray-700">
                                  Primary Button Label
                                  <input
                                    type="text"
                                    value={card.primaryActionLabel}
                                    onChange={(event) => updateEventCard(index, 'primaryActionLabel', event.target.value)}
                                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                                  />
                                </label>
                                <label className="block text-sm font-medium text-gray-700">
                                  Primary Button URL
                                  <input
                                    type="text"
                                    value={card.primaryActionUrl}
                                    onChange={(event) => updateEventCard(index, 'primaryActionUrl', event.target.value)}
                                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                                  />
                                </label>
                              </div>

                              <div className="grid gap-4 md:grid-cols-3">
                                <label className="block text-sm font-medium text-gray-700">
                                  Secondary Action Type
                                  <select
                                    value={card.secondaryActionType}
                                    onChange={(event) => updateEventCard(index, 'secondaryActionType', event.target.value as EventCardSecondaryActionType)}
                                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                                  >
                                    <option value="none">None</option>
                                    <option value="flyer">Flyer Modal</option>
                                    <option value="link">Link</option>
                                  </select>
                                </label>
                                <label className="block text-sm font-medium text-gray-700 md:col-span-1">
                                  Secondary Label
                                  <input
                                    type="text"
                                    value={card.secondaryActionLabel}
                                    onChange={(event) => updateEventCard(index, 'secondaryActionLabel', event.target.value)}
                                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                                  />
                                </label>
                                <label className="block text-sm font-medium text-gray-700 md:col-span-1">
                                  Secondary URL
                                  <input
                                    type="text"
                                    value={card.secondaryActionUrl}
                                    onChange={(event) => updateEventCard(index, 'secondaryActionUrl', event.target.value)}
                                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                                  />
                                </label>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-slate-950 p-5 text-white shadow-sm">
              <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-200">Event Viewer</div>
                </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white p-5 text-slate-900">
                <div className="relative h-48 overflow-hidden rounded-2xl bg-white">
                  <Image
                    src={selectedEventCard.mediaType === 'book' ? eventsBookImage.image : eventsFlyerImage.image}
                    alt={selectedEventCard.mediaType === 'book' ? eventsBookImage.alt : eventsFlyerImage.alt}
                    fill
                    className="object-contain p-4"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-[#fff8f3]/60 via-white/20 to-brandBlue-light/20" />
                  {selectedEventCard.mediaBadge ? (
                    <span className="absolute left-4 top-4 rounded-full bg-brandOrange px-3 py-1 text-xs font-semibold text-white">{selectedEventCard.mediaBadge}</span>
                  ) : null}
                  <div className="absolute inset-x-6 bottom-6 text-sm font-semibold text-navy/60">
                    {selectedEventCard.mediaType === 'book' ? 'Book cover media' : 'Flyer media'}
                  </div>
                </div>

                {[selectedEventCard.badgeOne, selectedEventCard.badgeTwo, selectedEventCard.badgeThree].filter(Boolean).length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[selectedEventCard.badgeOne, selectedEventCard.badgeTwo, selectedEventCard.badgeThree].filter(Boolean).map((badge, badgeIndex) => (
                      <span
                        key={`${selectedEventCard.id}-viewer-badge-${badgeIndex}`}
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          badgeIndex === 0 ? 'bg-brandOrange/10 text-brandOrange' : 'bg-navy/5 text-navy/70'
                        }`}
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                ) : null}

                {selectedEventCard.title ? <h4 className="mt-4 text-xl font-bold text-navy">{selectedEventCard.title}</h4> : null}
                {selectedEventCard.description ? <p className="mt-3 text-sm text-navy/70">{selectedEventCard.description}</p> : null}

                {selectedEventCard.detailTitle || selectedEventCard.detailLineOne || selectedEventCard.detailLineTwo || selectedEventCard.detailLineThree ? (
                  <div className="mt-4 rounded-xl bg-[#F4F8FB] p-4 text-sm text-navy/80">
                    {selectedEventCard.detailTitle ? <p className="font-semibold text-navy">{selectedEventCard.detailTitle}</p> : null}
                    {selectedEventCard.detailLineOne ? <p className={selectedEventCard.detailTitle ? 'mt-1' : ''}>{selectedEventCard.detailLineOne}</p> : null}
                    {selectedEventCard.detailLineTwo ? <p>{selectedEventCard.detailLineTwo}</p> : null}
                    {selectedEventCard.detailLineThree ? <p>{selectedEventCard.detailLineThree}</p> : null}
                  </div>
                ) : null}

                {selectedEventCard.primaryActionLabel || (selectedEventCard.secondaryActionType !== 'none' && selectedEventCard.secondaryActionLabel) ? (
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    {selectedEventCard.primaryActionLabel ? <div className="btn-primary pointer-events-none text-center">{selectedEventCard.primaryActionLabel}</div> : null}
                    {selectedEventCard.secondaryActionType !== 'none' && selectedEventCard.secondaryActionLabel ? (
                      <div className="btn-outline pointer-events-none text-center">{selectedEventCard.secondaryActionLabel}</div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'shop' && selectedShopProduct ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Shop Panel</h2>
                  <p className="mt-2 text-sm text-gray-600">Switch between page copy and product controls from the same editing panel.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setActiveShopPanelTab('page')}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                      activeShopPanelTab === 'page' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    Shop Page
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveShopPanelTab('products')}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                      activeShopPanelTab === 'products' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    Products
                  </button>
                </div>
              </div>

              {activeShopPanelTab === 'page' ? (
                <div className="mt-5 space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Eyebrow
                    <input
                      type="text"
                      value={draft.shopEyebrow}
                      onChange={(event) => updateDraft('shopEyebrow', event.target.value)}
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Title
                    <input
                      type="text"
                      value={draft.shopTitle}
                      onChange={(event) => updateDraft('shopTitle', event.target.value)}
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Intro Paragraph One
                    <textarea
                      value={draft.shopIntroOne}
                      onChange={(event) => updateDraft('shopIntroOne', event.target.value)}
                      rows={4}
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Intro Paragraph Two
                    <textarea
                      value={draft.shopIntroTwo}
                      onChange={(event) => updateDraft('shopIntroTwo', event.target.value)}
                      rows={4}
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Order Section Title
                    <input
                      type="text"
                      value={draft.shopOrderTitle}
                      onChange={(event) => updateDraft('shopOrderTitle', event.target.value)}
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Order Section Description
                    <textarea
                      value={draft.shopOrderDescription}
                      onChange={(event) => updateDraft('shopOrderDescription', event.target.value)}
                      rows={3}
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                    />
                  </label>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Contact Title
                      <input
                        type="text"
                        value={draft.shopContactTitle}
                        onChange={(event) => updateDraft('shopContactTitle', event.target.value)}
                        className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                      />
                    </label>
                    <label className="block text-sm font-medium text-gray-700">
                      Contact Description
                      <textarea
                        value={draft.shopContactDescription}
                        onChange={(event) => updateDraft('shopContactDescription', event.target.value)}
                        rows={3}
                        className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">PayPal Products</h3>
                      <p className="mt-1 text-sm text-gray-600">Select a product to link it to the viewer. Collapse cards to keep the stack compact.</p>
                    </div>
                    <button
                      type="button"
                      onClick={addShopProduct}
                      aria-label="Add product"
                      title="Add product"
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-xl font-medium text-white transition hover:bg-slate-800"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex min-w-0 flex-col overflow-visible">
                    {draft.shopProducts.map((product, index) => {
                      const isExpanded = expandedShopProducts[product.id];
                      const isSelected = selectedShopProduct?.id === product.id;

                      return (
                        <div
                          key={product.id}
                          onClick={() => setSelectedShopProductId(product.id)}
                          onFocusCapture={() => setSelectedShopProductId(product.id)}
                          onDragOver={(event) => {
                            event.preventDefault();
                            setDragOverShopProductId(product.id);
                          }}
                          onDrop={() => handleShopProductDrop(product.id)}
                          onDragLeave={() => {
                            if (dragOverShopProductId === product.id) {
                              setDragOverShopProductId(null);
                            }
                          }}
                          className={`relative border border-gray-200 bg-gray-50 px-4 py-3 transition ${
                            index === 0 ? '' : 'mt-3'
                          } ${
                            isSelected ? 'border-slate-950 bg-slate-50 shadow-sm' : ''
                          } ${
                            dragOverShopProductId === product.id ? 'ring-2 ring-slate-950/15' : ''
                          } ${
                            index === 0 ? 'rounded-t-2xl' : ''
                          } ${
                            index === draft.shopProducts.length - 1 ? 'rounded-b-2xl' : ''
                          } ${
                            isExpanded ? 'rounded-2xl pb-4 pt-4' : 'min-h-[64px] cursor-pointer'
                          } ${stackedCardZIndex(index, isExpanded)}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedShopProductId(product.id);
                                if (!isExpanded) {
                                  toggleShopProductEditor(product.id);
                                }
                              }}
                              className="min-w-0 flex-1 text-left"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-base font-semibold text-gray-900">{product.label || `Product ${index + 1}`}</span>
                                {isSelected ? <span className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">Live</span> : null}
                              </div>
                              {isExpanded ? <p className="mt-1 text-xs text-gray-500">Viewer linked. Collapse this product to condense the stack.</p> : null}
                            </button>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${product.label || `Product ${index + 1}`}`}
                                onClick={() => toggleShopProductEditor(product.id)}
                                className="flex h-11 w-11 items-end pb-4 justify-center rounded-xl border border-gray-300 bg-white text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                              >
                                <span className="inline-flex h-6 w-6 items-center justify-center text-2xl leading-none">{isExpanded ? '⌃' : '⌄'}</span>
                              </button>
                              <button
                                type="button"
                                aria-label={`Delete ${product.label || `Product ${index + 1}`}`}
                                onClick={() => removeShopProduct(index)}
                                disabled={draft.shopProducts.length === 1}
                                className="flex h-11 w-11 items-start pt-1 justify-center rounded-xl border border-gray-300 bg-white text-2xl leading-none text-gray-700 transition hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-400"
                              >
                                ×
                              </button>
                              <button
                                type="button"
                                draggable
                                aria-label={`Move ${product.label || `Product ${index + 1}`}`}
                                onDragStart={() => {
                                  setDraggedShopProductId(product.id);
                                  setSelectedShopProductId(product.id);
                                }}
                                onDragEnd={() => {
                                  setDraggedShopProductId(null);
                                  setDragOverShopProductId(null);
                                }}
                                className="flex h-9 w-11 cursor-grab items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-gray-500 transition hover:border-gray-400 hover:text-gray-800 active:cursor-grabbing"
                              >
                                <span className="grid grid-cols-2 gap-[2px]">
                                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                </span>
                              </button>
                            </div>
                          </div>

                          {isExpanded ? (
                            <div className="mt-4 grid gap-4">
                              <label className="block text-sm font-medium text-gray-700">
                                Product Label
                                <input
                                  type="text"
                                  value={product.label}
                                  onChange={(event) => updateShopProduct(index, 'label', event.target.value)}
                                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                                />
                              </label>
                              <label className="block text-sm font-medium text-gray-700">
                                PayPal Button Code
                                <input
                                  type="text"
                                  value={product.hostedButtonId}
                                  onChange={(event) => updateShopProduct(index, 'hostedButtonId', event.target.value)}
                                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                                />
                              </label>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-slate-950 p-5 text-white shadow-sm">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-200">Shop Viewer</div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white p-5 text-slate-900">
                {activeShopPanelTab === 'page' ? (
                  <>
                    <div className="grid items-start gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
                      <div className="relative mx-auto h-56 w-40 overflow-hidden rounded-2xl border border-black/10 bg-white">
                        <Image src={shopBookImage.image} alt={shopBookImage.alt} fill className="object-cover" sizes="160px" />
                      </div>
                      <div>
                        {draft.shopEyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brandOrange">{draft.shopEyebrow}</p> : null}
                        {draft.shopTitle ? <h3 className="mt-3 text-3xl font-bold text-navy">{draft.shopTitle}</h3> : null}
                        {draft.shopIntroOne ? <p className="mt-4 text-sm leading-relaxed text-navy/80">{draft.shopIntroOne}</p> : null}
                        {draft.shopIntroTwo ? <p className="mt-3 text-sm leading-relaxed text-navy/70">{draft.shopIntroTwo}</p> : null}
                      </div>
                    </div>

                    <div className="mt-6 rounded-2xl border border-navy/10 bg-gray-50 p-5">
                      {draft.shopOrderTitle ? <h4 className="text-lg font-bold text-navy">{draft.shopOrderTitle}</h4> : null}
                      {draft.shopOrderDescription ? <p className="mt-2 text-sm leading-relaxed text-navy/75">{draft.shopOrderDescription}</p> : null}
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <div className="btn-outline pointer-events-none flex-1 text-center">Join The Take Back Weekly</div>
                        <div className="btn-primary pointer-events-none flex-1 text-center">Contact B3U about the book</div>
                      </div>
                    </div>

                    <div className="mt-6 rounded-2xl border border-navy/10 bg-gray-50 p-5">
                      {draft.shopContactTitle ? <h4 className="text-lg font-bold text-navy">{draft.shopContactTitle}</h4> : null}
                      {draft.shopContactDescription ? <p className="mt-2 text-sm leading-relaxed text-navy/75">{draft.shopContactDescription}</p> : null}
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-navy/10 bg-gray-50 p-5">
                    {draft.shopOrderTitle ? <h4 className="text-lg font-bold text-navy">{draft.shopOrderTitle}</h4> : null}
                    {draft.shopOrderDescription ? <p className="mt-2 text-sm leading-relaxed text-navy/75">{draft.shopOrderDescription}</p> : null}

                    <div className="mt-6 grid gap-5 sm:grid-cols-2">
                      {draft.shopProducts.map((product) => {
                        const isSelected = selectedShopProduct?.id === product.id;

                        return (
                          <div
                            key={`${product.id}-viewer-card`}
                            className={`rounded-2xl border p-5 text-center transition ${
                              isSelected ? 'border-slate-950 bg-white shadow-sm' : 'border-black/10 bg-[#fff8f3]'
                            }`}
                          >
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-navy/60">
                              {product.label || 'Untitled product'}
                            </p>
                            <div className="mt-3 min-h-[56px] rounded-xl border border-dashed border-black/10 bg-white px-4 py-3 text-sm text-navy/55">
                              {product.hostedButtonId ? (
                                <div key={`${product.id}-${product.hostedButtonId}`} id={buildShopPreviewContainerId(product.id)} />
                              ) : (
                                'Enter a PayPal button code to enable this product.'
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <Script
        src="https://www.paypal.com/sdk/js?client-id=BAAPBO-Uvexziam7VLQ2yKMSsR2wCpPVT3FB5A_JCB5ENRZakcAlTvZiI-TV2iZz-hLGg62MA9VxbS77jQ&components=hosted-buttons&enable-funding=venmo&currency=USD"
        strategy="afterInteractive"
        onLoad={renderShopPreviewButtons}
      />

      <div className="mt-6 space-y-6">
        {activeTab === 'about' ? (
          <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">About Section</h2>
              <p className="text-sm text-gray-600">These fields map to the homepage about block. The image collage remains layout-owned for now.</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              <label className="block text-sm font-medium text-gray-700">
                Heading
                <input
                  type="text"
                  value={draft.aboutHeading}
                  onChange={(event) => updateDraft('aboutHeading', event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Tagline
                <input
                  type="text"
                  value={draft.aboutTagline}
                  onChange={(event) => updateDraft('aboutTagline', event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                CTA Label
                <input
                  type="text"
                  value={draft.aboutCtaLabel}
                  onChange={(event) => updateDraft('aboutCtaLabel', event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                CTA URL
                <input
                  type="text"
                  value={draft.aboutCtaHref}
                  onChange={(event) => updateDraft('aboutCtaHref', event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                />
              </label>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700">
                Paragraph One
                <textarea
                  value={draft.aboutParagraphOne}
                  onChange={(event) => updateDraft('aboutParagraphOne', event.target.value)}
                  rows={5}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Paragraph Two
                <textarea
                  value={draft.aboutParagraphTwo}
                  onChange={(event) => updateDraft('aboutParagraphTwo', event.target.value)}
                  rows={5}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                />
              </label>
            </div>
          </div>
        ) : null}

        {activeTab === 'newsletter' ? (
          <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Newsletter Section</h2>
              <p className="mt-2 text-sm text-gray-600">This keeps the signup form intact and only exposes the editorial copy around it.</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700">
                Heading
                <input
                  type="text"
                  value={draft.newsletterHeading}
                  onChange={(event) => updateDraft('newsletterHeading', event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Description
                <textarea
                  value={draft.newsletterDescription}
                  onChange={(event) => updateDraft('newsletterDescription', event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-slate-950"
                />
              </label>
            </div>
          </div>
        ) : null}

        {activeTab === 'events' ? null : null}



        {activeTab === 'colors' ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Color Palette</h2>
                <p className="mt-2 text-sm text-gray-600">Update the core brand colors and preview the palette live across the site.</p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <label className="block rounded-2xl bg-white p-3 text-sm font-medium text-gray-700 shadow-sm">
                  <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Brand Blue</span>
                  <input type="color" value={draft.brandBlue} onChange={(event) => updateDraft('brandBlue', event.target.value)} className="mt-3 h-16 w-16 cursor-pointer rounded-xl border border-gray-300 bg-transparent p-1" />
                  <span className="mt-3 block rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600">{draft.brandBlue}</span>
                </label>
                <label className="block rounded-2xl bg-white p-3 text-sm font-medium text-gray-700 shadow-sm">
                  <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Brand Blue Dark</span>
                  <input type="color" value={draft.brandBlueDark} onChange={(event) => updateDraft('brandBlueDark', event.target.value)} className="mt-3 h-16 w-16 cursor-pointer rounded-xl border border-gray-300 bg-transparent p-1" />
                  <span className="mt-3 block rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600">{draft.brandBlueDark}</span>
                </label>
                <label className="block rounded-2xl bg-white p-3 text-sm font-medium text-gray-700 shadow-sm">
                  <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Brand Blue Light</span>
                  <input type="color" value={draft.brandBlueLight} onChange={(event) => updateDraft('brandBlueLight', event.target.value)} className="mt-3 h-16 w-16 cursor-pointer rounded-xl border border-gray-300 bg-transparent p-1" />
                  <span className="mt-3 block rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600">{draft.brandBlueLight}</span>
                </label>
                <label className="block rounded-2xl bg-white p-3 text-sm font-medium text-gray-700 shadow-sm">
                  <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Brand Orange</span>
                  <input type="color" value={draft.brandOrange} onChange={(event) => updateDraft('brandOrange', event.target.value)} className="mt-3 h-16 w-16 cursor-pointer rounded-xl border border-gray-300 bg-transparent p-1" />
                  <span className="mt-3 block rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600">{draft.brandOrange}</span>
                </label>
                <label className="block rounded-2xl bg-white p-3 text-sm font-medium text-gray-700 shadow-sm">
                  <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Brand Orange Dark</span>
                  <input type="color" value={draft.brandOrangeDark} onChange={(event) => updateDraft('brandOrangeDark', event.target.value)} className="mt-3 h-16 w-16 cursor-pointer rounded-xl border border-gray-300 bg-transparent p-1" />
                  <span className="mt-3 block rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600">{draft.brandOrangeDark}</span>
                </label>
                <label className="block rounded-2xl bg-white p-3 text-sm font-medium text-gray-700 shadow-sm">
                  <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Brand Orange Light</span>
                  <input type="color" value={draft.brandOrangeLight} onChange={(event) => updateDraft('brandOrangeLight', event.target.value)} className="mt-3 h-16 w-16 cursor-pointer rounded-xl border border-gray-300 bg-transparent p-1" />
                  <span className="mt-3 block rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600">{draft.brandOrangeLight}</span>
                </label>
                <label className="block rounded-2xl bg-white p-3 text-sm font-medium text-gray-700 shadow-sm sm:col-span-2 xl:col-span-1">
                  <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Navy</span>
                  <input type="color" value={draft.navy} onChange={(event) => updateDraft('navy', event.target.value)} className="mt-3 h-16 w-16 cursor-pointer rounded-xl border border-gray-300 bg-transparent p-1" />
                  <span className="mt-3 block rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600">{draft.navy}</span>
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-slate-950 p-5 text-white shadow-sm">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-200">Palette Viewer</div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white p-5 text-slate-900">
                <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
                  <div className="gradient-hero px-6 py-8 text-white">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">Live Theme</p>
                    <h3 className="mt-3 text-2xl font-bold">Brand palette preview</h3>
                    <p className="mt-3 max-w-xl text-sm text-white/85">This preview uses the same runtime color tokens the site now reads from.</p>
                  </div>
                  <div className="space-y-4 p-6">
                    <div className="flex flex-wrap gap-3">
                      <div className="btn-primary pointer-events-none">Primary Action</div>
                      <div className="btn-outline pointer-events-none">Secondary Action</div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-black/10 bg-brandBlue-light/30 p-4 text-sm text-navy/80">Light blue surface</div>
                      <div className="rounded-xl border border-brandOrange/20 bg-brandOrange/10 p-4 text-sm text-navy/80">Accent orange surface</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    ['Brand Blue', draft.brandBlue],
                    ['Brand Blue Dark', draft.brandBlueDark],
                    ['Brand Blue Light', draft.brandBlueLight],
                    ['Brand Orange', draft.brandOrange],
                    ['Brand Orange Dark', draft.brandOrangeDark],
                    ['Brand Orange Light', draft.brandOrangeLight],
                    ['Navy', draft.navy],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
                      <span className="block font-medium text-gray-700">{label}</span>
                      <span className="mt-1 block font-mono text-gray-500">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'images' ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Image Library</h2>
                  <p className="mt-2 text-sm text-gray-600">Upload replacement images for each page slot, then save to apply them across the site. Reset restores the built-in default asset.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-white p-1 shadow-sm lg:grid-cols-4">
                  {siteImagePages.map((page) => (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => setActiveImagePage(page.id)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                        activeImagePage === page.id ? 'bg-slate-950 text-white' : 'text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      {page.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {siteImageFieldsByPage[activeImagePage].map((field) => {
                  const selectedAsset = resolveSiteImage(draft[field], defaultSiteImageSelections[field]);
                  const usesDefaultAsset = typeof draft[field] === 'string';

                  return (
                    <div key={field} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">{siteImageFieldMeta[field].label}</h3>
                          <p className="mt-1 text-xs text-gray-500">{siteImageFieldMeta[field].description}</p>
                        </div>
                        <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                          <Image src={selectedAsset.image} alt={selectedAsset.alt} fill className="object-cover" sizes="64px" />
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Upload image
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => {
                              handleImageUpload(field, event.target.files?.[0] ?? null);
                              event.currentTarget.value = '';
                            }}
                            className="mt-2 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
                          />
                        </label>

                        <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm">
                          <div className="min-w-0">
                            <div className="font-medium text-gray-700">{usesDefaultAsset ? 'Using default asset' : 'Uploaded file'}</div>
                            <div className="truncate text-xs text-gray-500">{selectedAsset.label}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateDraft(field, defaultSiteImageSelections[field])}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-slate-950 p-5 text-white shadow-sm">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-200">Image Viewer</div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white p-5 text-slate-900">
                {activeImagePage === 'home' ? (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-2xl font-bold text-navy">Homepage About Collage</h3>
                      <p className="mt-2 text-sm text-navy/70">These four images appear in the homepage about section.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {homeImageSelections.map(({ field, asset }) => (
                        <div key={field} className="overflow-hidden rounded-2xl border border-black/10 bg-gray-100">
                          <div className="relative aspect-square">
                            <Image src={asset.image} alt={asset.alt} fill className="object-cover" sizes="(max-width: 1024px) 50vw, 25vw" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {activeImagePage === 'about' ? (
                  <div className="grid gap-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-center">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-black/10 bg-gray-100 shadow-sm">
                      <Image src={aboutFeatureImage.image} alt={aboutFeatureImage.alt} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-navy">About Page Feature Image</h3>
                      <p className="mt-3 text-sm leading-relaxed text-navy/70">This portrait sits beside the About page introduction and its badge callout.</p>
                    </div>
                  </div>
                ) : null}

                {activeImagePage === 'events' ? (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
                      <div className="relative h-64 bg-white">
                        <Image src={eventsFlyerImage.image} alt={eventsFlyerImage.alt} fill className="object-contain p-4" sizes="(max-width: 1024px) 100vw, 50vw" />
                      </div>
                      <div className="border-t border-black/10 px-4 py-3">
                        <p className="text-sm font-semibold text-navy">Flyer Card Media</p>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
                      <div className="relative h-64 bg-white">
                        <Image src={eventsBookImage.image} alt={eventsBookImage.alt} fill className="object-contain p-4" sizes="(max-width: 1024px) 100vw, 50vw" />
                      </div>
                      <div className="border-t border-black/10 px-4 py-3">
                        <p className="text-sm font-semibold text-navy">Book Card Media</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeImagePage === 'shop' ? (
                  <div className="grid items-start gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
                    <div className="relative mx-auto h-56 w-40 overflow-hidden rounded-2xl border border-black/10 bg-white">
                      <Image src={shopBookImage.image} alt={shopBookImage.alt} fill className="object-cover" sizes="160px" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brandOrange">Shop Hero Asset</p>
                      <h3 className="mt-3 text-3xl font-bold text-navy">Book cover placement</h3>
                      <p className="mt-4 text-sm leading-relaxed text-navy/70">This cover is used in the featured book area and supporting product callout on the Shop page.</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}