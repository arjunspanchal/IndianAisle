// Event reminders: a notification 30 minutes before each event starts.
//
// They are set on the phone itself from the programme it last saw, so they
// arrive with no signal and need nothing from the server. Each time the
// programme loads they are cleared and set again, which is how a changed time
// is picked up. Events that start together share one reminder.
//
// Needs notifications to be allowed (the same permission as live updates).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import type { WeddingEvent } from './api';
import { t } from './i18n';
import { colour } from './outfits';
import { notifications } from './push';

const PREFIX = 'ka-event-';
const OFF_KEY = 'ka.reminders.off';
export const REMINDER_MINUTES = 30;

export async function remindersOn(): Promise<boolean> {
  return (await AsyncStorage.getItem(OFF_KEY).catch(() => null)) !== '1';
}

/** What the reminder says under its title: the time, then what to wear if the hosts have said. */
function detail(e: WeddingEvent): string {
  const wear = e.dress || (e.guest_colours ?? []).map((k) => t(colour(k).name)).join(', ');
  const where = e.setting === 'open' ? t('Open air') : e.setting === 'indoor' ? t('Indoors') : '';
  return [e.time_label, wear ? t('Wear: {what}', { what: wear }) : '', where].filter(Boolean).join(' · ');
}

/**
 * Clear this app's reminders and set them again from the programme.
 * Returns how many are now waiting (0 if notifications are off or reminders are switched off).
 */
export async function syncReminders(events: WeddingEvent[]): Promise<number> {
  if (Platform.OS === 'web') return 0;
  try {
    const N = await notifications();
    const waiting = await N.getAllScheduledNotificationsAsync();
    await Promise.all(waiting.filter((n) => n.identifier.startsWith(PREFIX)).map((n) => N.cancelScheduledNotificationAsync(n.identifier)));
    if (!(await remindersOn())) return 0;
    if (!(await N.getPermissionsAsync()).granted) return 0;

    const soon = Date.now() + 60000;
    const byTime = new Map<number, WeddingEvent[]>();
    for (const e of events) {
      const at = new Date(e.starts_at).getTime() - REMINDER_MINUTES * 60000;
      if (!Number.isFinite(at) || at <= soon) continue;
      byTime.set(at, [...(byTime.get(at) ?? []), e]);
    }
    // iOS keeps at most 64 waiting notifications per app; the nearest ones matter most.
    const next = [...byTime.entries()].sort((a, b) => a[0] - b[0]).slice(0, 50);
    for (const [at, list] of next) {
      const names = list.map((e) => t(e.title)).join(' · ');
      await N.scheduleNotificationAsync({
        identifier: PREFIX + list[0].id,
        content: {
          title: t('{event} in {n} minutes', { event: names, n: REMINDER_MINUTES }),
          body: list.length === 1 ? detail(list[0]) : list.map((e) => e.time_label).filter((x, i, all) => all.indexOf(x) === i).join(' · '),
          sound: 'default',
          data: { screen: 'programme' },
        },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(at), channelId: 'default' },
      });
    }
    return next.length;
  } catch {
    return 0;
  }
}

/** The switch on the You screen. */
export async function setRemindersOn(on: boolean, events: WeddingEvent[]): Promise<number> {
  await (on ? AsyncStorage.removeItem(OFF_KEY) : AsyncStorage.setItem(OFF_KEY, '1')).catch(() => {});
  return syncReminders(events);
}
