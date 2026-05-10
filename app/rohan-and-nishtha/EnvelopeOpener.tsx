"use client";

// Sealed envelope + "Open The Gift" CTA. Stays interactive until clicked,
// then disables itself and fades out so the inherited .opened class on the
// GiftStage wrapper drives the rest of the animation.
type Props = {
  opened: boolean;
  onOpen: () => void;
};

export default function EnvelopeOpener({ opened, onOpen }: Props) {
  return (
    <div className="envelope-stage" aria-hidden={opened}>
      <div className="envelope-stack">
        <div className="envelope">
          <div className="envelope-back" />
          <div className="envelope-card" />
          <div className="envelope-flap" />
          <div className="envelope-seal" />
        </div>
        <button
          type="button"
          onClick={onOpen}
          disabled={opened}
          className="open-gift-btn inline-flex cursor-pointer items-center justify-center rounded-sm border border-ink bg-ink px-7 py-3 font-display text-xs uppercase tracking-[0.22em] text-parchment transition-colors duration-200 hover:border-rose-deep hover:bg-rose-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-parchment disabled:cursor-default sm:text-sm"
        >
          Open The Gift
        </button>
      </div>
    </div>
  );
}
