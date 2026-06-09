import React from "react";

/**
 * A tiny, dependency-free markdown renderer for chat answers.
 *
 * Supports the subset assistants actually use: headings (#/##/###), unordered
 * lists (-, *, •), ordered lists (1.), blank-line paragraphs, and inline
 * **bold**, *italic*, and `code`. It builds React nodes directly — no
 * dangerouslySetInnerHTML — so there's no XSS surface.
 */

let keySeq = 0;
function nextKey(): string {
  keySeq += 1;
  return `md-${keySeq}`;
}

/** Parse inline **bold**, *italic*, `code` within a single line of text. */
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Match bold, italic, or code; non-overlapping, left to right.
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] !== undefined) {
      nodes.push(<strong key={nextKey()}>{m[2]}</strong>);
    } else if (m[3] !== undefined) {
      nodes.push(<em key={nextKey()}>{m[3]}</em>);
    } else if (m[4] !== undefined) {
      nodes.push(
        <code
          key={nextKey()}
          className="rounded bg-stone-200/70 px-1 py-0.5 text-[0.85em] dark:bg-stone-700/70"
        >
          {m[4]}
        </code>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export default function MarkdownLite({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];

  let i = 0;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(
      <p key={nextKey()} className="whitespace-pre-wrap leading-relaxed">
        {renderInline(paragraph.join(" "))}
      </p>,
    );
    paragraph = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line → paragraph break.
    if (trimmed === "") {
      flushParagraph();
      i += 1;
      continue;
    }

    // Headings.
    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      const size =
        level === 1 ? "text-base font-semibold" : "text-sm font-semibold";
      blocks.push(
        <div key={nextKey()} className={`mt-1 ${size}`}>
          {renderInline(heading[2])}
        </div>,
      );
      i += 1;
      continue;
    }

    // Unordered list — collect consecutive bullet lines.
    if (/^[-*•]\s+/.test(trimmed)) {
      flushParagraph();
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ""));
        i += 1;
      }
      blocks.push(
        <ul key={nextKey()} className="list-disc space-y-1 pl-5">
          {items.map((it) => (
            <li key={nextKey()} className="leading-relaxed">
              {renderInline(it)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Ordered list — collect consecutive "1." lines.
    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push(
        <ol key={nextKey()} className="list-decimal space-y-1 pl-5">
          {items.map((it) => (
            <li key={nextKey()} className="leading-relaxed">
              {renderInline(it)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // Otherwise accumulate into the current paragraph.
    paragraph.push(trimmed);
    i += 1;
  }
  flushParagraph();

  return <div className="space-y-2">{blocks}</div>;
}
