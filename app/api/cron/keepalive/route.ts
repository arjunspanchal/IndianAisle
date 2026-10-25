import { NextResponse } from "next/server";

// Supabase free-tier projects pause after ~1 week without API activity,
// which silently kills auth + DB while the static pages stay up (see
// incidents of 2026-09-03 and 2026-10-25). This endpoint exists only to
// generate that activity on a Vercel cron. It uses the public anon key
// and reads nothing sensitive.
//
// Health semantics: ANY HTTP response from Supabase (even an RLS-filtered
// count or a 4xx) proves the project is awake — the query still reached
// the API. Only a failed fetch (NXDOMAIN / network error) is reported as
// a failure, because that is the paused-project signature.

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // If CRON_SECRET is configured, require Vercel's cron Authorization
  // header. If it is not configured, stay open — the endpoint is a
  // harmless read and must keep working before the env var exists.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json(
      { ok: false, error: "Supabase env vars missing" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(
      `${url}/rest/v1/vendor_categories?select=id&limit=1`,
      {
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
        cache: "no-store",
      },
    );
    return NextResponse.json({
      ok: true,
      supabaseStatus: res.status,
      at: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase unreachable — project likely paused",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 502 },
    );
  }
}
