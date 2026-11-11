// Messages on their way out. A message appears in the room the moment it is
// sent and goes to the server behind the scenes, so nobody waits on hill
// signal to keep typing. If it cannot be delivered it stays in the room marked
// "Didn't send", with Try again and Discard.
//
// This lives outside the chat screen so a message keeps sending (and a failed
// one is still there) if the guest leaves the room and comes back.

import { api, errorMessage, KaError, type Message } from './api';
import { addToRoom, localMedia } from './chatCache';
import { sendImage, sendVoice } from './chatMedia';
import { uuid } from './files';

export type Local = { key: string; state: 'sending' | 'failed'; uri?: string; error?: string };
/** A message as the room draws it: from the server, or still on its way (`local`). */
export type Shown = Message & { local?: Local };

export type Outgoing = {
  key: string;
  channel: string;
  kind: 'text' | 'image' | 'voice';
  body: string;
  uri?: string;
  width?: number;
  height?: number;
  seconds?: number;
  replyToId: string | null;
  shown: Shown;
};

const EMPTY: Outgoing[] = [];
const boxes = new Map<string, Outgoing[]>();
const boxListeners = new Set<() => void>();
const deliveredListeners = new Set<(channel: string, real: Message) => void>();

// Once delivered, a message keeps the list key it had while sending, so its row is not rebuilt.
const aliases = new Map<string, string>();
export const rowKey = (m: { id: string }) => aliases.get(m.id) ?? m.id;

// Texts go out one after another so they arrive in the order typed. Photos and
// voice notes have their own line, so a slow upload never holds up a text.
let textLine: Promise<void> = Promise.resolve();
let mediaLine: Promise<void> = Promise.resolve();

export const outboxFor = (channel: string): Outgoing[] => boxes.get(channel) ?? EMPTY;

export function subscribeOutbox(fn: () => void): () => void {
  boxListeners.add(fn);
  return () => {
    boxListeners.delete(fn);
  };
}

/** Called with the server's copy of a message the moment it has been delivered. */
export function onDelivered(fn: (channel: string, real: Message) => void): () => void {
  deliveredListeners.add(fn);
  return () => {
    deliveredListeners.delete(fn);
  };
}

function change(channel: string, fn: (box: Outgoing[]) => Outgoing[]) {
  boxes.set(channel, fn(outboxFor(channel)));
  boxListeners.forEach((l) => l());
}

function within<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new KaError('ka_network')), ms);
    work.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

async function deliver(o: Outgoing) {
  if (!outboxFor(o.channel).some((x) => x.key === o.key)) return; // discarded while it waited its turn
  try {
    const { local: _local, ...base } = o.shown;
    let real: Message;
    if (o.kind === 'text') {
      const r = await within(api.sendMessage(o.channel, o.body, o.replyToId), 20000);
      real = { ...base, id: r.id, created_at: r.created_at };
    } else if (o.kind === 'image') {
      const r = await within(
        sendImage(o.channel, { uri: o.uri!, width: o.width ?? 4, height: o.height ?? 3 }, o.body, o.replyToId, o.key),
        180000,
      );
      localMedia.set(r.path, o.uri!);
      real = { ...base, id: r.id, media_path: r.path, media_meta: { width: r.width, height: r.height } };
    } else {
      const r = await within(sendVoice(o.channel, o.uri!, o.seconds ?? 1, o.replyToId, o.key), 180000);
      localMedia.set(r.path, o.uri!);
      real = { ...base, id: r.id, media_path: r.path };
    }
    aliases.set(real.id, o.shown.id);
    addToRoom(o.channel, real);
    deliveredListeners.forEach((l) => l(o.channel, real));
    change(o.channel, (box) => box.filter((x) => x.key !== o.key));
  } catch (e) {
    const failed: Local = { key: o.key, state: 'failed', uri: o.uri, error: errorMessage(e) };
    change(o.channel, (box) => box.map((x) => (x.key === o.key ? { ...x, shown: { ...x.shown, local: failed } } : x)));
  }
}

function start(o: Outgoing) {
  if (o.kind === 'text') textLine = textLine.then(() => deliver(o));
  else mediaLine = mediaLine.then(() => deliver(o));
}

/** Build a message to send. It is drawn in the room from this alone until the server has it. */
export function compose(
  channel: string,
  me: { name: string; host: boolean },
  what:
    | { kind: 'text'; body: string }
    | { kind: 'image'; body: string; uri: string; width: number; height: number }
    | { kind: 'voice'; uri: string; seconds: number },
  replyTo: { id: string; by: string; preview: string } | null,
): Outgoing {
  const key = uuid();
  const uri = what.kind === 'text' ? undefined : what.uri;
  const body = what.kind === 'voice' ? '' : what.body;
  const shown: Shown = {
    id: `local:${key}`,
    body,
    created_at: new Date().toISOString(),
    kind: what.kind,
    media_path: null,
    media_meta:
      what.kind === 'image'
        ? { width: what.width, height: what.height }
        : what.kind === 'voice'
          ? { seconds: Math.max(1, Math.round(what.seconds)) }
          : {},
    by: me.name,
    host: me.host,
    mine: true,
    reply: replyTo ? { by: replyTo.by, body: replyTo.preview } : null,
    reactions: [],
    local: { key, state: 'sending', uri },
  };
  return {
    key,
    channel,
    kind: what.kind,
    body,
    uri,
    width: what.kind === 'image' ? what.width : undefined,
    height: what.kind === 'image' ? what.height : undefined,
    seconds: what.kind === 'voice' ? what.seconds : undefined,
    replyToId: replyTo?.id ?? null,
    shown,
  };
}

export function queue(o: Outgoing) {
  change(o.channel, (box) => [o, ...box]);
  start(o);
}

export function retry(channel: string, key: string) {
  const o = outboxFor(channel).find((x) => x.key === key);
  if (!o || o.shown.local?.state !== 'failed') return;
  const again: Outgoing = { ...o, shown: { ...o.shown, local: { key, state: 'sending', uri: o.uri } } };
  change(channel, (box) => box.map((x) => (x.key === key ? again : x)));
  start(again);
}

export function discard(channel: string, key: string) {
  change(channel, (box) => box.filter((x) => x.key !== key));
}

/** Leaving the wedding on this phone drops anything still unsent. */
export function forgetOutbox() {
  boxes.clear();
  aliases.clear();
  boxListeners.forEach((l) => l());
}
