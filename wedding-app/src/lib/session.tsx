import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, setToken, setUnauthorizedHandler, type Guest } from './api';
import { forgetRooms } from './chatCache';
import { forgetOutbox } from './outbox';

const KEY = 'ka.session';

type Session = { token: string; guest: Guest };

type Ctx = {
  ready: boolean;
  guest: Guest | null;
  isHost: boolean;
  /** A vendor team member: sees their team's forum, the programme and updates only. */
  isVendor: boolean;
  join: (code: string, name: string) => Promise<void>;
  leave: () => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  const leave = useCallback(async () => {
    setToken(null);
    setSession(null);
    forgetOutbox();
    await forgetRooms();
    await AsyncStorage.removeItem(KEY).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const s = JSON.parse(raw) as Session;
          if (s?.token && s?.guest?.id) {
            setToken(s.token);
            setSession(s);
          }
        }
      } catch {
        // unreadable storage just means joining again
      }
      setReady(true);
    })();
  }, []);

  // If the server no longer knows this phone's token, send the guest back to the join screen.
  useEffect(() => {
    setUnauthorizedHandler(() => void leave());
    return () => setUnauthorizedHandler(null);
  }, [leave]);

  const join = useCallback(async (code: string, name: string) => {
    const s = await api.join(code, name);
    setToken(s.token);
    setSession(s);
    await AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {});
  }, []);

  const value = useMemo<Ctx>(
    () => ({ ready, guest: session?.guest ?? null, isHost: session?.guest.role === 'host', isVendor: session?.guest.role === 'vendor', join, leave }),
    [ready, session, join, leave],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Ctx {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
