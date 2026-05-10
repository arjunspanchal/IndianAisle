import type { Metadata } from "next";
import Image from "next/image";
import Reveal from "./Reveal";
import Ornament from "./Ornament";
import GiftButton from "./GiftButton";
import MusicToggle from "./MusicToggle";
import CornerFleurons from "./CornerFleurons";

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
// Also: one-time envelope reveal on page load (fade + micro-scale), and a
// fixed paper-grain layer for stationery texture.
const pageStyles = `
html, body { background: rgb(250 247 242) !important; color: rgb(58 50 44) !important; }
@keyframes envelope-in {
  0% { opacity: 0; transform: scale(0.995); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes scroll-prompt {
  0%, 100% { opacity: 0.25; transform: translateY(0); }
  50%      { opacity: 0.85; transform: translateY(4px); }
}
@media (prefers-reduced-motion: no-preference) {
  .envelope-in { animation: envelope-in 800ms ease-out both; }
  .scroll-prompt-line { animation: scroll-prompt 2.6s ease-in-out infinite; }
}
.paper-grain {
  position: fixed; inset: 0; pointer-events: none; z-index: 1;
  mix-blend-mode: multiply; opacity: 0.04;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.10 0 0 0 0 0.08 0 0 0 0 0.06 0 0 0 1 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  background-size: 200px 200px;
}
`;

export default function GiftPage() {
  return (
    <main
      style={lightTokens}
      className="envelope-in relative flex min-h-screen flex-col bg-parchment text-ink-soft"
    >
      <style dangerouslySetInnerHTML={{ __html: pageStyles }} />
      <div className="paper-grain" aria-hidden />
      <CornerFleurons />
      <MusicToggle />
      <article className="relative z-[2] mx-auto w-full max-w-[640px] px-6 pb-24">
        {/* Cover — first viewport, the front of the gift card */}
        <section className="relative flex min-h-[100svh] flex-col items-center justify-center text-center">
          <Reveal>
            <div className="text-[11px] uppercase tracking-[0.32em] text-gold-soft">
              with our warmest
            </div>
          </Reveal>
          <Reveal delay={250}>
            <h1 className="mt-6 font-display text-6xl leading-[1.05] tracking-tight text-ink sm:text-7xl">
              Congratulations
            </h1>
          </Reveal>
          <Reveal delay={500}>
            <p className="mt-6 font-display text-xl italic text-ink-mute sm:text-2xl">
              to Rohan &amp; Nishtha
            </p>
          </Reveal>
          <Reveal delay={750}>
            <p className="mt-6 font-body text-[10px] uppercase tracking-[0.32em] text-gold-soft sm:text-xs">
              10 May 2026 · Surat
            </p>
          </Reveal>

          {/* Scroll-to-open prompt at bottom of cover */}
          <Reveal delay={1100}>
            <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 text-ink-mute sm:bottom-12">
              <span className="font-body text-[10px] uppercase tracking-[0.32em]">
                turn the page
              </span>
              <span
                aria-hidden
                className="scroll-prompt-line block h-7 w-px bg-gold-line"
              />
            </div>
          </Reveal>
        </section>

        {/* Inside of card — portrait spread */}
        <section className="pt-16 text-center sm:pt-24">
          <Reveal>
            <figure className="overflow-hidden rounded-[2px] ring-1 ring-gold-line/60 shadow-[0_18px_40px_-22px_rgba(24,22,20,0.18)]">
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
        </section>

        <Reveal>
          <Ornament className="my-12" />
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
          <Ornament className="my-12" />
        </Reveal>

        {/* Visual interlude — the walk forward */}
        <Reveal>
          <section>
            <figure className="overflow-hidden rounded-[2px] ring-1 ring-gold-line/60 shadow-[0_18px_40px_-22px_rgba(24,22,20,0.18)]">
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
          <Ornament className="my-12" />
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
          <Ornament className="my-12" />
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
              <GiftButton />
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
