import Layout from '@/components/Layout';
import Image from 'next/image';
import B3ULogo from '@/images/logos/B3U3D.png';
import RokuLogo from '@/images/logos/rokuLogo.png';
import FireTvLogo from '@/images/logos/firetv.png';
import MogulChannelLogo from '@/images/logos/MTVG.png';
import SoleExperienceLogo from '@/images/logos/soleexp.png';

export default function PodcastPage() {

  return (
    <Layout
      title="The B3U Podcast | Richmond, VA | Burn, Break, Become Unstoppable"
      description="Listen to the B3U Podcast with Dr. Bree Charles — stories of resilience, healing, and purpose from Richmond, VA and beyond, serving the Richmond area and surrounding Central Virginia communities."
    >
      <section id="podcast" className="section-padding bg-brandBlue-light/20">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-10 mb-10 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">The B3U Podcast</h1>
              <h2 className="text-xl text-brandOrange font-semibold mb-4">Burn, Break, Become Unstoppable</h2>
              <p className="text-navy/70 max-w-xl">Conversations featuring stories of resilience, transformation, and the courage to rebuild. Every episode is a reminder that your pain can become your purpose.</p>
            </div>
            <div className="w-full md:w-[420px]">
              <a
                href="https://www.youtube.com/channel/UCSrtA1gGlgo4cQUzoSlzZ5w"
                target="_blank"
                rel="noopener"
                aria-label="Watch B3U on YouTube"
                className="group relative block aspect-video overflow-hidden rounded-xl shadow-xl ring-1 ring-black/10"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white via-brandBlue-light/15 to-brandBlue-light/45" />
                <div className="pointer-events-none absolute -inset-8 bg-gradient-to-r from-brandOrange/25 via-transparent to-brandBlue-light/25 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="absolute inset-0">
                  <Image
                    src={B3ULogo}
                    alt="B3U logo"
                    fill
                    className="object-contain p-0 md:p-2 scale-150 md:scale-150 transition-transform duration-500 ease-out group-hover:scale-[1.6] group-hover:rotate-[1.5deg]"
                    sizes="(max-width: 768px) 100vw, 420px"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-black/0 to-transparent" />
                <div className="absolute left-3 top-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-navy shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-brandOrange shadow-[0_0_0_3px_rgb(var(--color-brand-orange)_/_0.15)]" />
                    B3U on YouTube
                  </span>
                </div>
                <div className="absolute bottom-3 right-3">
                  <span className="rounded-md bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                    Watch now
                  </span>
                </div>
              </a>
            </div>
          </div>
          <div className="mt-10">
            <div className="text-center mb-8 max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Watch B3U</h2>
              <div className="flex flex-col items-center gap-3 text-navy/70">
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
                  <span>Watch new content online, or through</span>
                  <span className="inline-flex items-center gap-3" aria-label="Available on Roku and Fire TV">
                    <span className="relative h-8 w-[86px]">
                      <Image src={RokuLogo} alt="Roku" fill className="object-contain" sizes="86px" />
                    </span>
                    <span>&amp;</span>
                    <span className="relative h-12 w-[86px]">
                      <Image src={FireTvLogo} alt="Fire TV" fill className="object-contain" sizes="86px" />
                    </span>
                  </span>
                  <span>on these networks.</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <a
                href="https://themogulchannel.com/watch-now"
                target="_blank"
                rel="noopener"
                aria-label="Watch B3U on The Mogul Channel"
                className="inline-flex"
              >
                <div className="relative h-32 w-[280px] overflow-hidden rounded-2xl">
                  <Image
                    src={MogulChannelLogo}
                    alt="The Mogul Channel"
                    fill
                    className="object-contain rounded-2xl"
                    sizes="280px"
                  />
                </div>
              </a>
              <a
                href="https://thesoleexperience.com/watch-now"
                target="_blank"
                rel="noopener"
                aria-label="Watch B3U on The Sole Experience"
                className="inline-flex"
              >
                <div className="relative h-32 w-[280px] overflow-hidden rounded-2xl">
                  <Image
                    src={SoleExperienceLogo}
                    alt="The Sole Experience"
                    fill
                    className="object-contain rounded-2xl"
                    sizes="280px"
                  />
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
