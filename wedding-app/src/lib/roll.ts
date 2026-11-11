// The disposable camera's film roll.
//
// A shot is saved on the phone first and uploaded in the background, because
// signal at a hill resort comes and goes. Each shot carries an id made on the
// phone, so a retried upload can never use up two frames.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { api, hasToken, KaError, PHOTO_BUCKET, supabase } from './api';
import { FileGone, readBytes, uuid } from './files';
import { istDayKey } from './time';

const QUEUE_KEY = 'ka.roll.queue';
const COUNT_KEY = 'ka.roll.count.';
const MAX_ATTEMPTS = 6;

type Pending = {
  clientId: string;
  uri: string;
  thumbUri: string;
  takenAt: string;
  width: number;
  height: number;
  attempts: number;
};

let items: Pending[] = [];
let loaded = false;
let running = false;
const subscribers = new Set<(waiting: number) => void>();

function notify() {
  subscribers.forEach((s) => s(items.length));
}

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    items = JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) ?? '[]');
  } catch {
    items = [];
  }
  notify();
}

async function persist() {
  // Web shots live in memory only (their URIs don't survive a reload).
  if (Platform.OS === 'web') return;
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items)).catch(() => {});
}

export function subscribeWaiting(fn: (waiting: number) => void): () => void {
  subscribers.add(fn);
  void load().then(() => fn(items.length));
  return () => {
    subscribers.delete(fn);
  };
}

/** How many frames this phone has exposed today (IST), including ones not uploaded yet. */
export async function shotsTakenToday(): Promise<number> {
  const n = Number(await AsyncStorage.getItem(COUNT_KEY + istDayKey()).catch(() => '0'));
  return Number.isFinite(n) ? n : 0;
}

async function keep(uri: string, name: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  try {
    const dir = new Directory(Paths.document, 'roll');
    if (!dir.exists) dir.create({ intermediates: true });
    const dest = new File(dir, name);
    await new File(uri).move(dest);
    return dest.uri;
  } catch {
    return uri; // still in the cache folder; upload it from there
  }
}

/** Put a freshly taken shot on the roll and start uploading. Returns frames taken today. */
export async function addShot(shot: { uri: string; thumbUri: string; width: number; height: number }): Promise<number> {
  await load();
  const clientId = uuid();
  const takenAt = new Date().toISOString();
  items.push({
    clientId,
    uri: await keep(shot.uri, `${clientId}.jpg`),
    thumbUri: await keep(shot.thumbUri, `${clientId}-t.jpg`),
    takenAt,
    width: shot.width,
    height: shot.height,
    attempts: 0,
  });
  const taken = (await shotsTakenToday()) + 1;
  await AsyncStorage.setItem(COUNT_KEY + istDayKey(takenAt), String(taken)).catch(() => {});
  await persist();
  notify();
  void flush();
  return taken;
}


/** True when the failure looks like "no signal" rather than the server saying no. */
function isOffline(e: unknown): boolean {
  if (e instanceof KaError) return e.code === 'ka_network';
  if (e instanceof FileGone) return false;
  const status = (e as { status?: number; statusCode?: string | number } | null)?.status ??
    (e as { statusCode?: string | number } | null)?.statusCode;
  return status === undefined || status === null;
}

async function put(path: string, uri: string) {
  const body = await readBytes(uri);
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, body, { contentType: 'image/jpeg', cacheControl: '31536000' });
  // "already exists" means an earlier attempt got this far: carry on.
  if (error && !/exist|duplicate/i.test(error.message)) throw error;
}

function discard(it: Pending) {
  items = items.filter((x) => x.clientId !== it.clientId);
  if (Platform.OS === 'web') return;
  for (const uri of [it.uri, it.thumbUri]) {
    try {
      const f = new File(uri);
      if (f.exists) f.delete();
    } catch {
      // nothing to clean up
    }
  }
}

/** Upload whatever is waiting. Safe to call often; stops quietly when offline. */
export async function flush(): Promise<void> {
  await load();
  if (running || !hasToken()) return;
  running = true;
  try {
    while (items.length > 0) {
      const it = items[0];
      try {
        const r = await api.reserveShot(it.clientId, it.takenAt, it.width, it.height);
        if (!r.uploaded) {
          await put(`t/${r.path}`, it.thumbUri);
          await put(r.path, it.uri);
          await api.confirmShot(r.photo_id);
        }
        discard(it);
      } catch (e) {
        const gone = e instanceof FileGone;
        const final = e instanceof KaError && (e.code === 'ka_roll_finished' || e.code === 'ka_unauthorized');
        // Being offline never costs a shot; only repeated refusals from the server do.
        if (!isOffline(e)) it.attempts += 1;
        if (gone || final || it.attempts >= MAX_ATTEMPTS) {
          discard(it);
          continue;
        }
        break; // try again later
      }
    }
  } finally {
    running = false;
    await persist();
    notify();
  }
}
