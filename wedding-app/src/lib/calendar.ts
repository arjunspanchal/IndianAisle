// "Add to calendar" for a programme event, without asking for calendar access.
// iPhone opens a calendar file from our server, which iOS shows with its own
// "Add to Calendar" sheet. Everything else opens Google Calendar's new-event
// screen with the details filled in.

import { Linking, Platform } from 'react-native';

import { supabaseUrl, type WeddingEvent } from './api';
import { wedding } from './theme';

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function calendarUrl(event: WeddingEvent): string {
  if (Platform.OS === 'ios') return `${supabaseUrl}/functions/v1/ka-ics?e=${event.id}`;
  const start = new Date(event.starts_at);
  const end = event.ends_at ? new Date(event.ends_at) : new Date(start.getTime() + 90 * 60000);
  const about = [event.note, event.dress ? `Wear: ${event.dress}` : '', "Kashika & Arjun's wedding. Times are India time."].filter(Boolean).join('\n');
  const place = [event.location, wedding.venue, wedding.address].filter(Boolean).join(', ');
  const q = [
    'action=TEMPLATE',
    `text=${encodeURIComponent(`${event.title} · ${wedding.couple}`)}`,
    `dates=${stamp(start)}/${stamp(end)}`,
    `details=${encodeURIComponent(about)}`,
    `location=${encodeURIComponent(place)}`,
  ].join('&');
  return `https://calendar.google.com/calendar/render?${q}`;
}

export async function addToCalendar(event: WeddingEvent) {
  await Linking.openURL(calendarUrl(event));
}
