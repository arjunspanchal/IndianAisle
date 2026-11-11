// What each chat room last looked like, kept on the phone so a room opens
// straight away with the messages already seen and then quietly catches up.

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Message } from './api';

const KEY = 'ka.chat.cache.';
const mem = new Map<string, Message[]>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Photos and voice notes this phone has just sent, by their server path. They
 * are shown and played from the file already on the phone instead of being
 * downloaded again.
 */
export const localMedia = new Map<string, string>();

export const cachedRoom = (channel: string): Message[] | null => mem.get(channel) ?? null;

export function rememberRoom(channel: string, messages: Message[]) {
  mem.set(channel, messages);
  const waiting = timers.get(channel);
  if (waiting) clearTimeout(waiting);
  timers.set(
    channel,
    setTimeout(() => {
      timers.delete(channel);
      void AsyncStorage.setItem(KEY + channel, JSON.stringify(messages.slice(0, 50))).catch(() => {});
    }, 800),
  );
}

/** A message this phone just sent, added to the remembered room. */
export function addToRoom(channel: string, message: Message) {
  const had = mem.get(channel);
  if (had && !had.some((m) => m.id === message.id)) rememberRoom(channel, [message, ...had]);
}

/** Read a room back after the app was closed. */
export async function restoreRoom(channel: string): Promise<Message[] | null> {
  const had = mem.get(channel);
  if (had) return had;
  try {
    const raw = await AsyncStorage.getItem(KEY + channel);
    const list = raw ? (JSON.parse(raw) as Message[]) : null;
    if (Array.isArray(list)) {
      if (!mem.has(channel)) mem.set(channel, list);
      return list;
    }
  } catch {
    // an unreadable cache just means loading from the server as before
  }
  return null;
}

/** Leaving the wedding on this phone removes every remembered message. */
export async function forgetRooms() {
  timers.forEach((t) => clearTimeout(t));
  timers.clear();
  mem.clear();
  localMedia.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter((k) => k.startsWith(KEY));
    if (mine.length > 0) await AsyncStorage.multiRemove(mine);
  } catch {
    // nothing more to do
  }
}
