import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import B3ULogo from '@/images/logos/B3U3D.png';
import { communityEvent } from '@/lib/communityEvent';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/podcast', label: 'Podcast' },
  { href: '/community', label: 'Community' },
  { href: '/event-gallery', label: 'Events' },
  { href: '/shop', label: 'Shop' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const { pathname } = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Check if we're on the homepage to determine initial styling
  const isHomePage = pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // For homepage: start transparent with white text, become white bg with dark text on scroll
  // For other pages: always white bg with dark text
  const bgClass = scrolled || !isHomePage ? 'bg-white/95 shadow-lg' : 'bg-transparent';
  const textClass = scrolled || !isHomePage ? 'text-navy' : 'text-white';
  
  return (
    <header className={`fixed top-0 left-0 w-full isolate z-[200] transition backdrop-blur ${bgClass}`}>
      <Link
        href="/event-gallery"
        className="block border-b border-white/10 bg-navy px-4 py-3 text-center text-white transition hover:bg-navy/95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        aria-label="View The Big Take Back on-sale update"
      >
        <span className="block text-sm font-bold">The Big Take Back: What I Left Behind is ON SALE NOW</span>
      </Link>
      <a
        href={communityEvent.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block border-b border-white/10 bg-brandOrange px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-brandOrange-dark"
        aria-label={`Register for ${communityEvent.name} on Eventbrite`}
      >
        <span>{communityEvent.shortName} • {communityEvent.scheduleLabel} • {communityEvent.venueName}, {communityEvent.cityStateZip} • Register on Eventbrite</span>
      </a>
      <nav className={`max-w-7xl mx-auto px-6 py-2 md:px-10 md:py-3 ${textClass}`}>
        <div className="flex items-center justify-between gap-4 md:gap-5 lg:gap-8">
          <Link href="/" className={`flex items-center font-display text-2xl tracking-wide ${textClass}`}>
            <div className="relative h-18 w-18 md:h-20 md:w-20 lg:h-24 lg:w-24">
              <Image 
                src={B3ULogo} 
                alt="B3U Logo"
                fill
                sizes="(max-width: 768px) 72px, (max-width: 1024px) 80px, 96px"
                className="object-contain"
              />
            </div>
          </Link>

          <ul className="hidden md:flex flex-1 flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-semibold lg:gap-x-5 lg:text-base xl:gap-x-8">
            {navItems.map(item => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`relative py-2 transition-colors duration-200 hover:text-brandOrange after:absolute after:left-0 after:bottom-0 after:h-0.5 after:bg-brandOrange after:transition-all after:duration-300 ${
                    pathname === item.href 
                      ? 'text-brandOrange after:w-full' 
                      : `${textClass} after:w-0 hover:after:w-full`
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden md:flex items-center">
            <a
              href={communityEvent.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary px-4 py-2 text-sm lg:px-5 lg:py-2.5"
              aria-label={`Register for ${communityEvent.name} on Eventbrite`}
            >
              Reserve Your Seat
            </a>
          </div>

          <div className="flex items-center gap-3 md:hidden">
            <button 
              className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors ${
                scrolled || !isHomePage 
                  ? 'bg-brandBlue text-white hover:bg-brandBlue-dark' 
                  : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur'
              }`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="bg-white shadow-lg border-t md:hidden">
          <nav className="container mx-auto px-4 py-4">
            <a
              href={communityEvent.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full mb-4"
              onClick={() => setMobileMenuOpen(false)}
              aria-label={`Register for ${communityEvent.name} on Eventbrite`}
            >
              Reserve Your Seat
            </a>
            <ul className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block px-4 py-2 rounded-md transition-colors ${
                      pathname === item.href
                        ? 'bg-brandBlue text-white'
                        : 'text-navy hover:bg-brandBlue hover:text-white'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
