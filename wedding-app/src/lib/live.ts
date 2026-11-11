import type { RealtimeChannel } from '@supabase/supabase-js';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { errorMessage, supabase } from './api';

// The database sends a content-free nudge on the 'ka-live' topic whenever chat,
// updates, the album or the quiz change. Screens listen and simply re-fetch.
export type LiveEvent = 'chat' | 'updates' | 'album' | 'quiz';
const EVENTS: LiveEvent[] = ['chat', 'updates', 'album', 'quiz'];

type Listener = (payload: Record<string, unknown>) => void;
const listeners = new Map<LiveEvent, Set<Listener>>();
let channel: RealtimeChannel | null = null;

function ensureChannel() {
  if (channel) return;
  const ch = supabase.channel('ka-live');
  for (const event of EVENTS) {
    ch.on('broadcast', { event }, (msg) => {
      listeners.get(event)?.forEach((l) => l((msg.payload ?? {}) as Record<string, unknown>));
    });
  }
  ch.subscribe();
  channel = ch;
}

export function useLive(event: LiveEvent, onPoke: Listener) {
  const ref = useRef(onPoke);
  ref.current = onPoke;
  useEffect(() => {
    ensureChannel();
    const l: Listener = (p) => ref.current(p);
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(l);
    return () => {
      listeners.get(event)?.delete(l);
    };
  }, [event]);
}

/**
 * Load something from the server and keep it fresh: on screen focus, when the
 * app comes back to the foreground, and (optionally) every `pollMs` while the
 * screen is open, as a safety net for patchy hill signal. Pass `initial` (what
 * was on screen last time) to show something at once while the fresh copy loads.
 */
export function useLoad<T>(loader: () => Promise<T>, pollMs?: number, initial?: T | null) {
  const [data, setData] = useState<T | null>(initial ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(initial == null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const mine = ++seq.current;
    try {
      const d = await loaderRef.current();
      if (mine !== seq.current) return;
      setData(d);
      setError(null);
    } catch (e) {
      if (mine !== seq.current) return;
      setError(errorMessage(e));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
      const sub = AppState.addEventListener('change', (s) => {
        if (s === 'active') void reload();
      });
      const timer = pollMs ? setInterval(() => void reload(), pollMs) : null;
      return () => {
        sub.remove();
        if (timer) clearInterval(timer);
      };
    }, [reload, pollMs]),
  );

  return { data, setData, error, loading, reload };
}
