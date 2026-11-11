// English and Gujarati.
//
// Every piece of text a guest reads goes through t('English text'). In English
// it comes straight back; in Gujarati it is looked up in the dictionaries in
// lib/gu/, keyed by the exact English words. Anything not translated yet simply
// shows in English, so a missing entry is never a blank.
//
//   t('Add to calendar')
//   t('{n} shots left', { n: 12 })      // {n} is filled in after translating
//
// Call t() while drawing the screen, never at the top of a file: text worked
// out once at load would be stuck in whatever language the app started in.
// Changing language redraws the whole app (see app/_layout.tsx).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { gu } from './gu';

export type Lang = 'en' | 'gu';
export const LANGUAGES: { code: Lang; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'gu', name: 'ગુજરાતી' },
];

const KEY = 'ka.lang';
let lang: Lang = 'en';
const listeners = new Set<() => void>();

export function t(text: string, vars?: Record<string, string | number>): string {
  let out = lang === 'gu' ? (gu[text] ?? text) : text;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

export const getLang = (): Lang => lang;

/**
 * Add to a text style that uses wide letter-spacing: `style={[styles.label, closeUp()]}`.
 * Wide spacing suits Latin capitals but pulls Gujarati letters and their marks apart.
 */
export const closeUp = (): { letterSpacing: number } | null => (lang === 'gu' ? { letterSpacing: 0.2 } : null);

export function setLang(next: Lang) {
  if (next === lang) return;
  lang = next;
  void AsyncStorage.setItem(KEY, next).catch(() => {});
  listeners.forEach((l) => l());
}

/** Read the saved choice once, before the first screen is drawn. */
export async function loadLang(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(KEY);
    if (saved === 'gu' || saved === 'en') lang = saved;
  } catch {
    // no saved choice: English
  }
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** The current language, for the few places that must redraw when it changes. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, getLang);
}
