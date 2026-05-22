import Layout from '@/components/Layout';
import Image from 'next/image';
import MelaLogo from '@/images/logos/Melalogo.png';
import THOHLogo from '@/images/logos/THOHlogo.png';
import aboutBree from '@/images/content/aboutBree.jpeg';

export default function AboutPage() {
  return (
    <Layout
      title="About Dr. Bree Charles | Richmond, VA Speaker & Community Builder"
      description="Meet Dr. Bree Charles — transformational speaker, author, and creator of B3U. Based in Richmond, VA and serving surrounding Central Virginia communities."
    >
      {/* Meet Dr. Bree Charles Section */}
      <section className="section-padding bg-white">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-center">
            Meet <span className="text-brandOrange">Dr. Bree Charles</span>
          </h1>
          <p className="text-xl text-center text-navy/80 mb-12 italic">
            Breaking Cycles. Building Legacies.
          </p>
          
          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <div className="order-1 md:order-2">
              <p className="text-lg text-navy/80 leading-relaxed mb-6">
                Dr. Bree Charles is a transformational speaker, author, U.S. Army veteran, and creator of the B3U Podcast – Burn, Break, Become Unstoppable. Her story is one of courage, faith, and relentless resilience.
              </p>
              <p className="text-lg text-navy/80 leading-relaxed mb-6">
                Having overcome childhood trauma, sexual violence, and a twelve-year abusive marriage, Bree has turned her pain into purpose. She stands as living proof that brokenness doesn't mean defeat — it means rebirth.
              </p>
              <p className="text-lg text-navy/80 leading-relaxed">
                Her years in the U.S. Army taught her leadership, strength, and discipline — qualities that now fuel her mission to help others rise above fear, rebuild after pain, and step boldly into their God-given purpose. Through her voice, Bree helps others take back their power from trauma and doubt, transforming their pain into legacy.
              </p>
            </div>
            <div className="relative order-2 md:order-1">
              <Image
                src={aboutBree}
                alt="Dr. Bree Charles"
                className="w-full h-auto rounded-3xl shadow-2xl"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
              <div className="absolute -bottom-6 -right-6 bg-brandOrange text-white p-6 rounded-lg shadow-lg">
                <p className="font-semibold text-sm">U.S. Army Veteran</p>
                <p className="text-xs opacity-90">Transformational Speaker</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Big Take Back Section */}
      <section className="section-padding bg-gradient-to-r from-brandOrange to-red-600 text-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            The Big Take Back
          </h2>
          <h3 className="text-xl md:text-2xl mb-8 font-semibold">
            Breaking Cycles. Building Legacies.
          </h3>
          <div className="max-w-3xl mx-auto">
            <p className="text-lg leading-relaxed mb-6">
              Bree's signature message, "The Big Take Back," is more than a phrase — it's a movement. It's a call to action for anyone ready to reclaim their voice, their strength, and their future.
            </p>
            <p className="text-lg leading-relaxed">
              Whether she's speaking on stage, teaching a{' '}
              <span
                aria-disabled="true"
                className="inline-block align-baseline cursor-not-allowed rounded-md bg-navy/75 px-2 py-0 font-semibold whitespace-nowrap text-white opacity-80"
              >
                masterclass
              </span>
              , or hosting her podcast, Bree's energy, authenticity, and faith ignite transformation. Her message reminds people that no matter what they've endured, they can rise, rebuild, and become unstoppable.
            </p>
          </div>
        </div>
      </section>

      {/* Quote Spotlight */}
      <section className="section-padding bg-navy text-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative">
            <blockquote className="text-2xl md:text-3xl font-bold mb-6 relative z-10">
              <span className="mr-1 align-top text-white">"</span>
              Every time I share my story, I set somebody else free.
              <span className="align-top text-white">"</span>
            </blockquote>
            <cite className="text-lg text-brandOrange font-semibold">— Dr. Bree Charles</cite>
          </div>
        </div>
      </section>

      {/* Her Work in Action */}
      <section className="section-padding bg-[#F4F8FB]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center">
            Her Work in Action
          </h2>
          <h3 className="text-xl text-center text-navy/80 mb-12">
            Faith. Purpose. Community.
          </h3>
          
          <p className="text-lg text-center text-navy/80 mb-12 max-w-3xl mx-auto">
            Beyond speaking and writing, Bree pours her heart into community-based initiatives that drive impact and healing:
          </p>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <a
              href="https://www.melawholefoodsva.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Mela Whole Foods website"
              className="card bg-white p-8 text-center block hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-brandOrange"
            >
              <div className="h-20 w-20 mb-6 relative mx-auto">
                <Image 
                  src={MelaLogo} 
                  alt="Mela Whole Foods Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <h4 className="text-xl font-bold mb-4 text-brandOrange">Mela Whole Foods</h4>
              <p className="text-navy/80">
                Her mobile grocery bus bringing healthy, affordable food to underserved communities.
              </p>
            </a>

            <a
              href="https://www.thehouseofhumanity.org/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit The House of Humanity website"
              className="card bg-white p-8 text-center block hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-brandOrange"
            >
              <div className="h-20 w-20 mb-6 relative mx-auto">
                <Image 
                  src={THOHLogo} 
                  alt="House of Humanity Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <h4 className="text-xl font-bold mb-4 text-brandOrange">House of Humanity</h4>
              <p className="text-navy/80">
                Her nonprofit dedicated to housing and healing for individuals overcoming hardship.
              </p>
            </a>
          </div>

          <p className="text-center text-lg text-navy/80 italic">
            Each project is built on the foundation of her mission — Breaking Cycles. Building Legacies.
          </p>
        </div>
      </section>

      {/* The Movement Continues */}
      <section className="section-padding bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            The Movement Continues
          </h2>
          <p className="text-lg text-navy/80 leading-relaxed mb-10 max-w-3xl mx-auto">
            For Bree, this work is more than motivation — it's divine assignment. Her calling is to help people burn away fear, break destructive patterns, and become who they were created to be.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <a href="/podcast" className="btn-primary">Listen to The B3U Podcast</a>
            <a href="/contact" className="btn-outline">Book Bree to Speak</a>
          </div>
          
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-semibold mb-4">Join "The Take Back Weekly" Newsletter</h3>
            <form className="flex flex-col sm:flex-row gap-3">
              <input 
                type="email" 
                required 
                minLength={6}
                maxLength={254}
                placeholder="Email address" 
                className="flex-1 px-4 py-2 rounded-md bg-white border border-navy/20 focus:outline-none focus:ring-2 focus:ring-brandOrange" 
              />
              <button className="btn-primary" type="submit">Subscribe</button>
            </form>
          </div>
        </div>
      </section>
    </Layout>
  );
}
