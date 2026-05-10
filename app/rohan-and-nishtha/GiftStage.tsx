"use client";

import { useCallback, useState } from "react";
import EnvelopeOpener from "./EnvelopeOpener";

// Holds the open/closed state for the whole gift card and gates the CSS
// animations underneath it. Renders the envelope+button on top, then the
// rest of the card content below — all reveals on the inside wait for the
// .opened class on this wrapper before they animate in.
export default function GiftStage({ children }: { children: React.ReactNode }) {
  const [opened, setOpened] = useState(false);

  const open = useCallback(() => {
    setOpened((v) => v || true);
    // The click itself is a user gesture — pointerdown bubbles to window
    // and MusicToggle's listener catches it, so no separate audio plumbing
    // is needed here.
  }, []);

  return (
    <div className={"gift-stage" + (opened ? " opened" : "")}>
      <EnvelopeOpener opened={opened} onOpen={open} />
      {children}
    </div>
  );
}
