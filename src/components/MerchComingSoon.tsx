import Image from 'next/image';
import B3ULogo from '@/images/logos/B3U3D.png';

type MerchComingSoonProps = {
  compact?: boolean;
};

export default function MerchComingSoon({ compact = false }: MerchComingSoonProps) {
  return (
    <div className={`relative overflow-hidden rounded-[2rem] border border-brandOrange/20 bg-gradient-to-br from-brandOrange/10 via-white to-brandBlue-light/25 shadow-xl ${compact ? 'min-h-[320px] p-8' : 'min-h-[520px] p-10 md:p-14'}`}>
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brandOrange/15 blur-3xl" />
      <div className="absolute -bottom-16 -left-12 h-56 w-56 rounded-full bg-brandBlue/20 blur-3xl" />
      <div className={`relative z-10 flex h-full flex-col items-center justify-center text-center ${compact ? 'gap-5' : 'gap-7'}`}>
        <span className="inline-flex rounded-full bg-brandOrange px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white">
          Merch Coming Soon
        </span>
        <div className={`relative ${compact ? 'h-28 w-28' : 'h-40 w-40 md:h-48 md:w-48'}`}>
          <Image
            src={B3ULogo}
            alt="B3U logo"
            fill
            className="object-contain drop-shadow-[0_18px_30px_rgba(10,26,42,0.18)]"
            sizes={compact ? '112px' : '(max-width: 768px) 160px, 192px'}
          />
        </div>
        <div className="max-w-2xl">
          <h3 className={`${compact ? 'text-3xl' : 'text-4xl md:text-5xl'} font-bold text-navy`}>Fresh B3U merch is on the way.</h3>
          <p className={`mt-3 text-navy/70 ${compact ? 'text-base' : 'text-lg'}`}>
            We&apos;re preparing the next drop now. Check back soon for new apparel and signature pieces that support the mission.
          </p>
        </div>
      </div>
    </div>
  );
}