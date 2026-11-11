// ka-ics: one programme event as a calendar file, for the app's
// "Add to calendar" button on iPhone (Android opens Google Calendar instead).
//
// GET /functions/v1/ka-ics?e=<event id>  →  text/calendar
//
// Public on purpose: a phone's browser opens it without signing in, and it
// returns nothing the wedding website does not already show. It reads the live
// programme, so a changed time is right the next time someone taps the button.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const VENUE = "Storii by ITC Hotels, Akanni Naina Tikkar, Village Thalpa, P.O. Nainatikkar, District Sirmaur, Himachal Pradesh 173229, India";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// 2027-01-17T14:30:00.000Z → 20270117T143000Z
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([,;])/g, "\\$1");
// Calendar files want long lines folded.
const fold = (line: string) => line.match(/.{1,70}/gu)?.join("\r\n ") ?? line;

const missing = () => new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain" } });

Deno.serve(async (req) => {
  if (req.method !== "GET") return missing();
  const id = new URL(req.url).searchParams.get("e") ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return missing();

  const { data: e, error } = await admin
    .from("ka_events")
    .select("id, starts_at, ends_at, title, note, location, dress")
    .eq("id", id)
    .maybeSingle();
  if (error || !e) return missing();

  const start = new Date(e.starts_at);
  const end = e.ends_at ? new Date(e.ends_at) : new Date(start.getTime() + 90 * 60000);
  const about = [e.note, e.dress ? `Wear: ${e.dress}` : "", "Kashika & Arjun's wedding. Times are India time."].filter(Boolean).join("\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//KA Wedding//Programme//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.id}@kashika-arjun.com`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(`${e.title} · Kashika & Arjun`)}`,
    `LOCATION:${esc(e.location ? `${e.location}, ${VENUE}` : VENUE)}`,
    `DESCRIPTION:${esc(about)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(fold)
    .join("\r\n");

  return new Response(ics + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="ka-wedding.ics"',
      "Cache-Control": "no-store",
    },
  });
});
