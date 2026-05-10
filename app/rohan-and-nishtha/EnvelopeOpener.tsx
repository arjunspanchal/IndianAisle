// Envelope-opening cinematic that plays once on page load.
// Pure CSS animation — no JS, no state. The stage covers the viewport,
// runs through ~2.4s of timeline, then fades out and becomes click-through
// (pointer-events: none) so the cover beneath is fully usable.
export default function EnvelopeOpener() {
  return (
    <div className="envelope-stage" aria-hidden>
      <div className="envelope">
        <div className="envelope-back" />
        <div className="envelope-card" />
        <div className="envelope-flap" />
        <div className="envelope-seal" />
      </div>
    </div>
  );
}
