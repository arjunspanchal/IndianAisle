import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rohan & Nishtha — A wedding wish from Arjun & Kashika",
  description: "A little gift, with all our love.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Rohan & Nishtha — A wedding wish from Arjun & Kashika",
    description: "A little gift, with all our love.",
  },
};

// Force this page to render in the light parchment theme regardless of the
// surrounding app's dark-mode bootstrap or any leftover preference. These
// custom-property values mirror the :root tokens in globals.css.
const lightTokens: React.CSSProperties = {
  ["--c-ink" as string]: "24 22 20",
  ["--c-ink-soft" as string]: "58 50 44",
  ["--c-ink-mute" as string]: "107 99 92",
  ["--c-parchment" as string]: "250 247 242",
  ["--c-parchment-deep" as string]: "241 235 224",
  ["--c-parchment-line" as string]: "230 222 209",
  ["--c-gold" as string]: "168 105 46",
  ["--c-gold-soft" as string]: "196 142 88",
  ["--c-gold-line" as string]: "222 196 158",
  ["--c-rose" as string]: "200 117 110",
  ["--c-rose-deep" as string]: "142 70 78",
};

// Override html/body bg + color so iOS rubber-band overscroll and any
// inherited dark-mode styling can't leak through behind the page.
const forceLightChrome = `html, body { background: rgb(250 247 242) !important; color: rgb(58 50 44) !important; }`;

export default function GiftPage() {
  return (
    <main
      style={lightTokens}
      className="flex min-h-screen items-center justify-center bg-parchment px-6 py-16 text-ink-soft"
    >
      <style dangerouslySetInnerHTML={{ __html: forceLightChrome }} />
      <article className="w-full max-w-[640px]">
        {/* Block 1 — Hero */}
        <section className="text-center">
          <div className="text-[11px] uppercase tracking-[0.32em] text-gold-soft">
            celebrating
          </div>
          <h1 className="mt-5 font-display text-5xl leading-tight tracking-tight text-ink sm:text-6xl">
            Rohan &amp; Nishtha
          </h1>
          <p className="mt-4 font-display text-lg italic text-ink-mute sm:text-xl">
            10 May 2026 · La Kailasa Lawns, Surat
          </p>
        </section>

        <div className="my-12 divider-ornament" aria-hidden>
          ✦
        </div>

        {/* Block 2 — The story */}
        <section>
          <p className="font-body text-base italic leading-relaxed text-ink-soft sm:text-lg">
            What a weekend. The red and gold of last night&rsquo;s sangeet at
            Avadh Utopia is still ringing in our ears, and now we get to watch
            you take the seven steps. Between the dancing, the laughter, and
            the way you both lit up that floor — it&rsquo;s been hard to look
            away.
          </p>
        </section>

        <div className="my-12 divider-ornament" aria-hidden>
          ✦
        </div>

        {/* Block 3 — Thank you */}
        <section>
          <p className="font-body text-base italic leading-relaxed text-ink-soft sm:text-lg">
            Shashank — thank you for opening your home and your family to us
            this weekend. Every detail, every meal, every hug has been a
            masterclass in hosting. Kashika and I will be telling stories
            about these two days for years to come.
          </p>
        </section>

        <div className="my-12 divider-ornament" aria-hidden>
          ✦
        </div>

        {/* Block 4 — The gift */}
        <section className="text-center">
          <h2 className="font-display text-3xl leading-tight tracking-tight text-ink sm:text-4xl">
            A small token, with all our love
          </h2>
          <p className="mx-auto mt-5 max-w-[36rem] font-body text-base leading-relaxed text-ink-soft sm:text-lg">
            We&rsquo;ve sent something ahead — pick out the first thing for
            your new home together, or honestly, anything you want.
          </p>

          <div className="mt-9">
            <a
              href="https://www.amazon.in/g/VFS4VBANJ6AGV5ED?ref=gc_typ"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-sm border border-ink bg-ink px-5 py-2.5 font-display text-xs uppercase tracking-[0.18em] text-parchment transition-colors hover:border-rose-deep hover:bg-rose-deep"
            >
              Open your gift
            </a>
          </div>

          <p className="mt-5 font-body text-sm italic text-ink-mute">
            ₹5,001 · Amazon Pay Gift Card
          </p>
        </section>

        {/* Closing signature */}
        <section className="mt-20 text-center">
          <p className="font-body text-sm italic leading-relaxed text-ink-mute sm:text-base">
            With love and every good wish for the years to come,
          </p>
          <p className="mt-3 font-display text-2xl text-ink sm:text-3xl">
            Arjun &amp; Kashika
          </p>
        </section>
      </article>
    </main>
  );
}
