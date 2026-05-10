import type { Metadata } from "next";
import Image from "next/image";
import Reveal from "./Reveal";

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
        {/* Block 1 — Hero portrait (carries the names). Staggered entrance. */}
        <section className="text-center">
          <Reveal>
            <div className="text-[11px] uppercase tracking-[0.32em] text-gold-soft">
              celebrating
            </div>
          </Reveal>
          <Reveal delay={250}>
            <figure className="mt-6 overflow-hidden rounded-[2px] ring-1 ring-gold-line/60">
              <Image
                src="/rohan-and-nishtha/portrait.jpg"
                alt="Rohan and Nishtha"
                width={720}
                height={941}
                priority
                sizes="(min-width: 640px) 640px, 100vw"
                className="h-auto w-full"
              />
            </figure>
          </Reveal>
          <Reveal delay={500}>
            <p className="mt-6 font-display text-lg italic text-ink-mute sm:text-xl">
              10 May 2026 · La Kailasa Lawns, Surat
            </p>
          </Reveal>
        </section>

        <Reveal>
          <div className="my-12 divider-ornament" aria-hidden>
            ✦
          </div>
        </Reveal>

        {/* Block 2 — The story */}
        <Reveal>
          <section>
            <p className="font-body text-base italic leading-relaxed text-ink-soft sm:text-lg">
              What a weekend. The red and gold of last night&rsquo;s sangeet at
              Avadh Utopia is still ringing in our ears, and now we get to
              watch you take the seven steps. Between the dancing, the
              laughter, and the way you both lit up that floor —
              it&rsquo;s been hard to look away.
            </p>
          </section>
        </Reveal>

        <Reveal>
          <div className="my-12 divider-ornament" aria-hidden>
            ✦
          </div>
        </Reveal>

        {/* Visual interlude — the walk forward */}
        <Reveal>
          <section>
            <figure className="overflow-hidden rounded-[2px] ring-1 ring-gold-line/60">
              <Image
                src="/rohan-and-nishtha/beach.jpg"
                alt="Rohan and Nishtha walking together on the beach"
                width={900}
                height={1202}
                sizes="(min-width: 640px) 640px, 100vw"
                className="h-auto w-full"
              />
            </figure>
          </section>
        </Reveal>

        <Reveal>
          <div className="my-12 divider-ornament" aria-hidden>
            ✦
          </div>
        </Reveal>

        {/* Block 3 — Thank you */}
        <Reveal>
          <section>
            <p className="font-body text-base italic leading-relaxed text-ink-soft sm:text-lg">
              Shashank — thank you for opening your home and your family to us
              this weekend. Every detail, every meal, every hug has been a
              masterclass in hosting.
            </p>
          </section>
        </Reveal>

        <Reveal>
          <div className="my-12 divider-ornament" aria-hidden>
            ✦
          </div>
        </Reveal>

        {/* Block 4 — The gift */}
        <section className="text-center">
          <Reveal>
            <h2 className="font-display text-3xl leading-tight tracking-tight text-ink sm:text-4xl">
              A small token, with all our love
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <p className="mx-auto mt-5 max-w-[36rem] font-body text-base leading-relaxed text-ink-soft sm:text-lg">
              We&rsquo;ve sent something ahead — pick out the first thing for
              your new home together, or honestly, anything you want.
            </p>
          </Reveal>
          <Reveal delay={350}>
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
          </Reveal>
        </section>

        {/* Closing signature */}
        <Reveal>
          <section className="mt-20 text-center">
            <p className="font-body text-sm italic leading-relaxed text-ink-mute sm:text-base">
              With love and every good wish for the years to come,
            </p>
            <p className="mt-3 font-display text-2xl text-ink sm:text-3xl">
              Arjun &amp; Kashika
            </p>
          </section>
        </Reveal>
      </article>
    </main>
  );
}
