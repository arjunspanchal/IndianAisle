import type { Metadata } from "next";
import Reveal from "./Reveal";
import Ornament from "./Ornament";
import GiftButton from "./GiftButton";
import MusicToggle from "./MusicToggle";
import CornerFleurons from "./CornerFleurons";
import PhotoReveal from "./PhotoReveal";
import GiftStage from "./GiftStage";
import VideoFrame from "./VideoFrame";

export const metadata: Metadata = {
  title: "Rohan & Nishtha · A wedding wish from Arjun & Kashika",
  description: "A little gift, with all our love.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Rohan & Nishtha · A wedding wish from Arjun & Kashika",
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
@keyframes reveal-in {
  0% { opacity: 0; transform: translateY(12px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes scroll-prompt {
  0%, 100% { opacity: 0.25; transform: translateY(0); }
  50%      { opacity: 0.85; transform: translateY(4px); }
}
@keyframes flap-open {
  0%   { transform: rotateX(0deg); }
  100% { transform: rotateX(180deg); }
}
@keyframes card-emerge {
  0%   { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(-30%) scale(1.02); opacity: 1; }
}
@keyframes seal-break {
  0%   { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  60%  { transform: translate(-50%, -50%) scale(1.4); opacity: 0.4; }
  100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
}
@keyframes stage-out {
  0%   { opacity: 1; transform: scale(1);    visibility: visible; }
  60%  { opacity: 0.5; transform: scale(1.03); }
  100% { opacity: 0; transform: scale(1.06); visibility: hidden; }
}
/* Reveal elements stay invisible until the user clicks the open button
   (which adds .opened to the GiftStage wrapper). The envelope animations
   work the same way — they only run after the user opens the gift. */
.reveal-in { opacity: 0; }
.scroll-prompt-line { opacity: 0.4; }
@media (prefers-reduced-motion: no-preference) {
  .gift-stage.opened .reveal-in          { animation: reveal-in 1100ms ease-out both; }
  .gift-stage.opened .scroll-prompt-line { animation: scroll-prompt 2.6s ease-in-out infinite; opacity: 1; }
  .gift-stage.opened .envelope-flap      { animation: flap-open 1200ms cubic-bezier(.5,0,.2,1) 200ms both; }
  .gift-stage.opened .envelope-card      { animation: card-emerge 1100ms cubic-bezier(.4,0,.2,1) 1000ms both; }
  .gift-stage.opened .envelope-seal      { animation: seal-break 500ms cubic-bezier(.6,0,.4,1) 0ms both; }
  .gift-stage.opened .envelope-stage     { animation: stage-out 1200ms cubic-bezier(.4,0,.2,1) 1300ms both; }
  .gift-stage.opened .open-gift-btn      { opacity: 0; transform: translateY(8px); pointer-events: none; transition: opacity 350ms ease-out, transform 350ms ease-out; }
}
/* As soon as the user clicks open, let the cover behind catch any clicks
   while the envelope is still fading out. */
.gift-stage.opened .envelope-stage { pointer-events: none; }

@media (prefers-reduced-motion: reduce) {
  .gift-stage.opened .envelope-stage { display: none; }
  .gift-stage.opened .reveal-in      { opacity: 1; }
}
.envelope-stage {
  position: fixed; inset: 0; z-index: 60;
  display: flex; align-items: center; justify-content: center;
  background: rgb(250 247 242);
  perspective: 1200px;
}
.envelope-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3rem;
}
.envelope {
  position: relative;
  width: min(340px, 75vw);
  aspect-ratio: 8 / 5;
  transform-style: preserve-3d;
}
.envelope-back, .envelope-card, .envelope-flap {
  position: absolute;
  border: 1px solid rgb(222 196 158);
  background: rgb(241 235 224);
  box-sizing: border-box;
}
.envelope-back {
  inset: 0;
  box-shadow: 0 18px 40px -22px rgba(24,22,20,0.28);
}
.envelope-card {
  inset: 8% 6% 6% 6%;
  background: rgb(254 251 244);
  z-index: 1;
}
.envelope-flap {
  inset: 0;
  clip-path: polygon(0 0, 100% 0, 50% 60%);
  transform-origin: top;
  z-index: 2;
  backface-visibility: hidden;
}
.envelope-seal {
  position: absolute;
  top: 60%; left: 50%;
  width: 26px; height: 26px;
  border-radius: 9999px;
  background: rgb(168 105 46);
  box-shadow: 0 1px 0 rgba(255,255,255,0.25) inset, 0 4px 8px -2px rgba(24,22,20,0.4);
  z-index: 3;
  transform: translate(-50%, -50%);
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
      className="relative flex min-h-screen flex-col bg-parchment text-ink-soft"
    >
      <style dangerouslySetInnerHTML={{ __html: pageStyles }} />
      {/* Defensive fallback — if React hydration is slow or fails, this
          inline script still wires up the click so the gift can always be
          opened. Adds .opened to the gift-stage and best-effort plays the
          music. React's own onClick fires too; .opened ends up the same. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function(){
  function attach(){
    var btn = document.querySelector('.open-gift-btn');
    var stage = document.querySelector('.gift-stage');
    if (!btn || !stage) { setTimeout(attach, 50); return; }
    btn.addEventListener('click', function(){
      stage.classList.add('opened');
      try {
        var a = document.querySelector('audio');
        if (a) { a.volume = 0.55; a.play().catch(function(){}); }
      } catch(e) {}
    }, { once: true });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();
          `.trim(),
        }}
      />
      <div className="paper-grain" aria-hidden />
      <CornerFleurons />
      <MusicToggle />
      <GiftStage>
      <article className="relative z-[2] mx-auto w-full max-w-[640px] px-6 pb-24">
        {/* Cover — first viewport, the front of the gift card.
            Reveal delays are measured from the moment GiftStage flips to
            .opened (i.e. the click). Stage dissolves 1300–2500ms; cover
            staggers in 1200–2900ms so the cover bleeds through the
            dissolving envelope. */}
        <section className="relative flex min-h-[100svh] flex-col items-center justify-center text-center">
          <Reveal delay={1200}>
            <div className="text-[11px] uppercase tracking-[0.32em] text-gold-soft">
              with our warmest
            </div>
          </Reveal>
          <Reveal delay={1400}>
            <h1 className="mt-6 font-display text-[clamp(2.25rem,9.5vw,4.75rem)] leading-[1.05] tracking-tight text-ink">
              Congratulations
            </h1>
          </Reveal>
          <Reveal delay={1600}>
            <p className="mt-6 font-display text-xl italic text-ink-mute sm:text-2xl">
              to Rohan &amp; Nishtha
            </p>
          </Reveal>
          <Reveal delay={1800}>
            <p className="mt-6 font-body text-[10px] uppercase tracking-[0.32em] text-gold-soft sm:text-xs">
              10 May 2026 · Surat
            </p>
          </Reveal>

          {/* Scroll-to-open prompt at bottom of cover. */}
          <div className="absolute bottom-6 left-1/2 flex max-w-[18rem] -translate-x-1/2 flex-col items-center gap-2 px-6 text-center text-ink-mute sm:bottom-10 sm:max-w-[20rem]">
            <span
              className="reveal-in font-body text-[10px] uppercase tracking-[0.32em]"
              style={{ animationDelay: "2300ms" }}
            >
              scroll below
            </span>
            <span
              className="reveal-in font-body text-[10px] italic leading-relaxed opacity-70 sm:text-xs"
              style={{ animationDelay: "2450ms" }}
            >
              and turn your volume up for a better experience
            </span>
            <span
              aria-hidden
              className="scroll-prompt-line mt-1 block h-6 w-px bg-gold-line"
            />
          </div>
        </section>

        {/* Inside of card — portrait spread */}
        <section className="pt-16 text-center sm:pt-24">
          <Reveal>
            <PhotoReveal
              src="/rohan-and-nishtha/portrait.jpg"
              alt="Rohan and Nishtha"
              width={720}
              height={941}
              caption="Rohan & Nishtha"
            />
          </Reveal>
        </section>

        <Reveal>
          <Ornament className="my-12" />
        </Reveal>

        {/* Note to the bride and groom — paired with their portrait above */}
        <Reveal>
          <section>
            <p className="font-body text-base italic leading-relaxed text-ink-soft sm:text-lg">
              Nishtha, you looked stunning at every event. Quietly,
              beautifully, the whole weekend. Rohan, you held your own
              beside her, calm and present and completely yours. School
              love becoming the forever kind is rare, and getting to watch
              it land for you both is a quiet joy.
            </p>
          </section>
        </Reveal>

        <Reveal>
          <Ornament className="my-12" />
        </Reveal>

        {/* Wedding ceremony — bow to the crowd, just before the seven pheras */}
        <Reveal>
          <section>
            <VideoFrame
              src="/rohan-and-nishtha/wedding.mov"
              caption="before the seven steps"
            />
          </section>
        </Reveal>

        <Reveal>
          <Ornament className="my-12" />
        </Reveal>

        {/* Visual interlude — the walk forward */}
        <Reveal>
          <section>
            <PhotoReveal
              src="/rohan-and-nishtha/beach.jpg"
              alt="Rohan and Nishtha walking together on the beach"
              width={900}
              height={1202}
              caption="10.05.2026"
            />
          </section>
        </Reveal>

        <Reveal>
          <Ornament className="my-12" />
        </Reveal>

        {/* Second note to the couple — paired with their beach photo */}
        <Reveal>
          <section>
            <p className="font-body text-base italic leading-relaxed text-ink-soft sm:text-lg">
              There&rsquo;s something settled about the two of you that we
              kept noticing all weekend. The way Nishtha laughs at something
              Rohan hasn&rsquo;t quite said yet. The way he watches her
              cross the room. It&rsquo;s not performance, it&rsquo;s
              practice. The kind that comes from years of just liking each
              other. May the slow Tuesday evenings and the unremarkable
              Sundays ahead carry that exact quality forward.
            </p>
          </section>
        </Reveal>

        <Reveal>
          <Ornament className="my-12" />
        </Reveal>

        {/* Salutation eyebrow — pivots from the R&N notes to the
            Shashank+Harshika section that follows */}
        <Reveal>
          <div className="text-center text-[11px] uppercase tracking-[0.32em] text-gold-soft">
            dear Shashank &amp; Harshika
          </div>
        </Reveal>

        {/* The three of us — lead-in to the sangeet story + thank-you */}
        <Reveal delay={120}>
          <section className="mt-8">
            <PhotoReveal
              src="/rohan-and-nishtha/with-shashank.jpg"
              alt="Kashika, Arjun, and Shashank"
              width={1400}
              height={1050}
              caption="Kashika, Shashank & Arjun"
            />
          </section>
        </Reveal>

        <Reveal>
          <Ornament className="my-12" />
        </Reveal>

        {/* Sangeet story — paired with the group photo, bridges into the thank-you */}
        <Reveal>
          <section>
            <p className="font-body text-base italic leading-relaxed text-ink-soft sm:text-lg">
              What a weekend. The red and gold of the sangeet at Avadh
              Utopia is still ringing in our ears, and watching Rohan and
              Nishtha take the seven steps the morning after was its own
              kind of quiet. Shashank, you stole the floor on every
              number, with the whole family behind you and Harshika beat
              for beat. Between the dancing and the laughter, it was
              hard to look away.
            </p>
          </section>
        </Reveal>

        <Reveal>
          <Ornament className="my-12" />
        </Reveal>

        {/* Block 3 — Thank you */}
        <Reveal>
          <section>
            <p className="font-body text-base italic leading-relaxed text-ink-soft sm:text-lg">
              Shashank and Harshika, thank you for opening your home and your
              family to us this past weekend. Every detail, every meal, every
              hug, a masterclass in hosting.
            </p>
          </section>
        </Reveal>

        <Reveal>
          <Ornament className="my-12" />
        </Reveal>

        {/* Note to Harshika — missed a photo + goodbye */}
        <Reveal>
          <section>
            <p className="font-body text-base italic leading-relaxed text-ink-soft sm:text-lg">
              Harshika, we missed catching a photo with you, and we slipped
              out before we could say a proper goodbye. Until very soon.
            </p>
          </section>
        </Reveal>

        <Reveal>
          <Ornament className="my-12" />
        </Reveal>

        {/* Block 4 — The gift */}
        <section className="text-center">
          <Reveal>
            <div className="text-[11px] uppercase tracking-[0.32em] text-gold-soft">
              for Rohan &amp; Nishtha
            </div>
          </Reveal>
          <Reveal delay={120}>
            <h2 className="mt-5 font-display text-3xl leading-tight tracking-tight text-ink sm:text-4xl">
              A small token, with all our love
            </h2>
          </Reveal>
          <Reveal delay={280}>
            <p className="mx-auto mt-5 max-w-[36rem] font-body text-base leading-relaxed text-ink-soft sm:text-lg">
              We&rsquo;ve sent something ahead. Pick out the first thing for
              your new home together, or honestly, anything you want.
            </p>
          </Reveal>
          <Reveal delay={450}>
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
      </GiftStage>
    </main>
  );
}
