// Everything in the app is shown in India time, whatever the phone is set to.
// Done by hand (shift to IST, read UTC fields) so it behaves the same on every engine.

const IST_MS = 330 * 60 * 1000;
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function shifted(d: Date | string): Date {
  return new Date(new Date(d).getTime() + IST_MS);
}

/** "2027-01-17" for the IST calendar day of this instant. */
export function istDayKey(d: Date | string = new Date()): string {
  return shifted(d).toISOString().slice(0, 10);
}

/** "4:30 pm" */
export function formatTime(d: Date | string): string {
  const s = shifted(d);
  const h = s.getUTCHours();
  const m = s.getUTCMinutes();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

/** "Sunday, 17 January" from a day key. */
export function formatDayLong(dayKey: string): string {
  const d = new Date(dayKey + 'T00:00:00Z');
  return `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "Sun 17 Jan" from a day key. */
export function formatDayShort(dayKey: string): string {
  const d = new Date(dayKey + 'T00:00:00Z');
  return `${DAYS[d.getUTCDay()].slice(0, 3)} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`;
}

/** Whole IST calendar days from `from` until `to` (0 if the same day). */
export function daysBetween(from: Date | string, to: Date | string): number {
  const a = new Date(istDayKey(from) + 'T00:00:00Z').getTime();
  const b = new Date(istDayKey(to) + 'T00:00:00Z').getTime();
  return Math.round((b - a) / 86400000);
}

/** "just now", "12 min ago", "3:40 pm", "Yesterday, 3:40 pm", "17 Jan, 3:40 pm" */
export function formatWhen(d: Date | string, now: Date = new Date()): string {
  const then = new Date(d);
  const mins = Math.floor((now.getTime() - then.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const gap = daysBetween(then, now);
  if (gap === 0) return formatTime(then);
  if (gap === 1) return `Yesterday, ${formatTime(then)}`;
  const s = shifted(then);
  return `${s.getUTCDate()} ${MONTHS[s.getUTCMonth()].slice(0, 3)}, ${formatTime(then)}`;
}

/** When a roll develops, said plainly: "9:00 am tomorrow" / "9:00 am today" / "9:00 am on Mon 18 Jan". */
export function formatReveal(revealAt: string, now: Date = new Date()): string {
  const gap = daysBetween(now, revealAt);
  const t = formatTime(revealAt);
  if (gap <= 0) return `${t} today`;
  if (gap === 1) return `${t} tomorrow`;
  return `${t} on ${formatDayShort(istDayKey(revealAt))}`;
}
