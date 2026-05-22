import Layout from '@/components/Layout';

type Episode = {
  id: string;
  title: string;
  category: string;
  duration: string;
  date: string;
  description: string;
  link: string;
  audioUrl?: string;
  imageUrl?: string;
};

type PodcastProps = {
  episodes: Episode[];
};

export default function PodcastPage({ episodes }: PodcastProps) {
  // Fallback hardcoded episodes if needed (used only when no data)
  const fallbackEpisodes: Episode[] = [
    {
      id: '17967667',
      title: 'Fireside Chat w/ Mrs Rochelle Tucker',
      category: 'Healing',
      duration: '1:27:41',
      date: 'October 06, 2025',
      description: 'The most surprising part isn\'t the pain—it\'s the moment the craving disappeared. Rochelle sits with us and tells a story many hide: childhood molestation, a decades-long addiction that felt like relief until it wasn\'t, and the day she chose a path of healing.',
      link: 'https://www.buzzsprout.com/2467135/episodes/17967667-fireside-chat-w-mrs-rochelle-tucker'
    },
    {
      id: '17927241',
      title: 'Reclaim Session w/ Ashley Brown',
      category: 'Empowerment',
      duration: '35:47',
      date: 'September 29, 2025',
      description: 'Ever notice how one heated moment can rewrite the story—casting you as the problem while the real issue slips into the background? We go straight at that trap and unpack the quiet ways we hand over our power.',
      link: 'https://www.buzzsprout.com/2467135/episodes/17927241-reclaim-session-w-ashley-brown'
    },
    {
      id: '17880506',
      title: 'The Altar Experience w/ Prophetess Moina Tucker',
      category: 'Faith',
      duration: '23:01',
      date: 'September 26, 2025',
      description: 'The journey from being misunderstood to discovering your true potential often requires someone who can see the diamond beneath the rough exterior. A profound conversation with Prophetess Moina Tucker, founder of The Altar Experience.',
      link: 'https://www.buzzsprout.com/2467135/episodes/17880506-the-altar-experience-w-prophetess-moina-tucker'
    },
    {
      id: '17880704',
      title: 'The Altar Experience w/ Chenia Hughes',
      category: 'Healing',
      duration: '33:23',
      date: 'September 22, 2025',
      description: 'What happens when a crisis counselor confronts her own trauma? Chenia Hughes brings raw honesty and professional insight to this powerful conversation about healing, helping others, and finding your true worth.',
      link: 'https://www.buzzsprout.com/2467135/episodes/17880704-the-altar-experience-w-chenia-hughes'
    },
    {
      id: '17847699',
      title: 'Altar Experience w/ Dr Teresa Hegwood',
      category: 'Purpose',
      duration: '8:58',
      date: 'September 19, 2025',
      description: 'Have you ever felt the weight of others\' expectations holding you back from your true purpose? Dr. Teresa Hegwood knows this feeling all too well and opens up about her transformative experience.',
      link: 'https://www.buzzsprout.com/2467135/episodes/17847699-altar-experience-w-dr-teresa-hegwood'
    },
    {
      id: '17847584',
      title: 'Altar Experience w/ Pastor Kristie Anderson',
      category: 'Faith',
      duration: '24:48',
      date: 'September 15, 2025',
      description: 'Postpartum depression doesn\'t discriminate—not even against women of faith. Pastor Kristie Anderson bravely shares her journey through the darkness while balancing her roles as a mother and spiritual leader.',
      link: 'https://www.buzzsprout.com/2467135/episodes/17847584-altar-experience-w-pastor-kristie-anderson'
    },
    {
      id: '17834154',
      title: 'The Altar Experience w/ Apostle Dr Veter Nichols',
      category: 'Wisdom',
      duration: '15:13',
      date: 'September 12, 2025',
      description: 'What happens when divine alignment brings unexpected wisdom into your life? An encounter with 78-year-old apostle Dr. Veter Nichols becomes a powerful moment of transformation.',
      link: 'https://www.buzzsprout.com/2467135/episodes/17834154-the-altar-experirence-w-apostle-dr-veter-nichols'
    },
    {
      id: '17810433',
      title: 'The Altar Experience w/ Pastor Tina Lee',
      category: 'Purpose',
      duration: '7:24',
      date: 'September 08, 2025',
      description: 'What happens when you step beyond your comfort zone and embrace the calling you never thought was meant for you? Pastor Tina Lee shares her journey from "background person" to ministry leader.',
      link: 'https://www.buzzsprout.com/2467135/episodes/17810433-the-altar-experience-w-pastor-tina-lee'
    },
    {
      id: '17759763',
      title: 'Reclaiming Your Power',
      category: 'Empowerment',
      duration: '59:44',
      date: 'September 01, 2025',
      description: 'Have you ever felt completely drained at the end of a day, wondering where all your energy went? The answer might be simpler than you think—you\'ve been giving your power away.',
      link: 'https://www.buzzsprout.com/2467135/episodes/17759763-reclaiming-your-power'
    },
    {
      id: '17576334',
      title: 'The Mindset Shift That Saved My Future',
      category: 'Transformation',
      duration: '45:13',
      date: 'July 28, 2025',
      description: 'What happens when a single mistake threatens to derail your entire future? Lance Williams faced this question head-on after being arrested for selling controlled substances in his early twenties.',
      link: 'https://www.buzzsprout.com/2467135/episodes/17576334-the-mindset-shift-that-saved-my-future'
    },
    {
      id: '17503111',
      title: 'Breaking Through Racism and Sexism in the Military',
      category: 'Resilience',
      duration: '1:00:47',
      date: 'July 14, 2025',
      description: 'When Monique Smith became a warrant officer in the military, she never expected the battlefield would be within her own unit. A powerful story about overcoming systemic barriers.',
      link: 'https://www.buzzsprout.com/2467135/episodes/17503111-breaking-through-racism-and-sexism-in-the-military'
    },
    {
      id: '17345088',
      title: 'Finding Laughter in Healing',
      category: 'Healing',
      duration: '47:52',
      date: 'June 16, 2025',
      description: 'The power of laughter as medicine comes alive in this conversation with Vernard Hines, "The Laugh Therapist." A 20-year military veteran who served in Iraq takes us on his remarkable journey from the edge of suicide to healing through humor.',
      link: 'https://www.buzzsprout.com/2467135/episodes/17345088-finding-laughter-in-healing'
    }
  ];

  const list = episodes && episodes.length ? episodes : fallbackEpisodes;

  const makeEmbedUrl = (ep: Episode) => {
    const brand = 'CC5500'; // brand orange without '#'
    if (ep.audioUrl && ep.audioUrl.includes('/episodes/')) {
      // Convert the mp3 URL into an embeddable page URL
      // e.g., https://www.buzzsprout.com/2467135/episodes/17967667-title.mp3
      //   -> https://www.buzzsprout.com/2467135/episodes/17967667-title?client_source=small_player&player=small&iframe=true&color=CC5500
      const base = ep.audioUrl.replace(/\.mp3$/i, '');
      return `${base}?client_source=small_player&player=small&iframe=true&color=${brand}`;
    }
    if (ep.link && ep.link.includes('/episodes/')) {
      return `${ep.link}?client_source=small_player&player=small&iframe=true&color=${brand}`;
    }
    // Fallback to show page small player (artist). This won’t be episode-specific.
    return `https://www.buzzsprout.com/2467135?client_source=small_player&player=small&iframe=true&color=${brand}`;
  };

  return (
    <Layout
      title="The B3U Podcast | Richmond, VA | Burn, Break, Become Unstoppable"
      description="Listen to the B3U Podcast with Dr. Bree Charles — stories of resilience, healing, and purpose from Richmond, VA and beyond, serving the Richmond area and surrounding Central Virginia communities."
    >
      <section className="section-padding">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-12">
          <div>
            <h1 className="text-4xl font-bold mb-4">Listen To The Podcast</h1>
            <p className="max-w-2xl text-navy/80">Browse all episodes and dive into powerful conversations that inspire action and purpose.</p>
          </div>
          
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {list.map(ep => (
            <div key={ep.id} className="card">
              <div className="overflow-hidden rounded-md border border-black/5 shadow-sm bg-white">
                <iframe
                  src={makeEmbedUrl(ep)}
                  title={`Play ${ep.title}`}
                  loading="lazy"
                  width="100%"
                  height="160"
                  scrolling="no"
                  frameBorder={0}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-16 flex flex-col sm:flex-row gap-4">
            <a href="https://open.spotify.com/show/2nni9jT09b2RKA1uKuz3W5" target="_blank" rel="noopener" className="btn-primary">Subscribe on Spotify</a>
            <a href="https://www.buzzsprout.com/2467135" target="_blank" rel="noopener" className="btn-outline">Listen on Buzzsprout</a>
            <a href="https://www.youtube.com/channel/UCSrtA1gGlgo4cQUzoSlzZ5w" target="_blank" rel="noopener" className="btn-outline">Watch on YouTube</a>
        </div>
      </section>
    </Layout>
  );
}

export async function getStaticProps() {
  try {
    const path = await import('node:path');
    const fs = await import('node:fs');
    const file = path.join(process.cwd(), 'public', 'data', 'podcast.json');
    const raw = fs.readFileSync(file, 'utf-8');
    const data = JSON.parse(raw);
    return { props: { episodes: data.episodes || [] } };
  } catch (e) {
    // If file missing (first build), fallback to empty list; hardcoded list will be used at runtime
    return { props: { episodes: [] } };
  }
}
