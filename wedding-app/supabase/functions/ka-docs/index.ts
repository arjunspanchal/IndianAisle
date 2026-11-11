// ka-docs: the only door to guests' travel documents (IDs and tickets).
//
// The ka-docs bucket is private with no storage policies, and the ka_doc_*
// database functions can be run only by the service role. This function holds
// that role. For every request it passes the caller's guest token to the
// database, which decides what that person may do; only then does it hand back
// a one-off upload ticket or a link that expires after two minutes.
//
// Errors come back as { error: "ka_…" } with status 200 so the app can read them.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const BUCKET = "ka-docs";
const LINK_SECONDS = 120;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

class KaError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

function reply(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

async function db<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await admin.rpc(fn, args);
  if (error) {
    const m = /ka_[a-z_]+/.exec(error.message ?? "");
    throw new KaError(m ? m[0] : "ka_server");
  }
  return data as T;
}

async function removeFiles(paths: string[]) {
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await admin.storage.from(BUCKET).remove(paths.slice(i, i + 100));
    if (error) throw new KaError("ka_server");
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "ka_bad_request" });

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return reply({ error: "ka_bad_request" });
  }
  const token = b.token;
  if (typeof token !== "string" || !UUID.test(token)) return reply({ error: "ka_unauthorized" });
  const id = typeof b.id === "string" && UUID.test(b.id) ? b.id : null;

  try {
    switch (b.action) {
      case "reserve": {
        const d = await db<{ id: string; path: string }>("ka_doc_reserve", {
          p_token: token,
          p_kind: b.kind,
          p_label: typeof b.label === "string" ? b.label : "",
          p_mime: b.mime,
        });
        const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(d.path);
        if (error || !data) throw new KaError("ka_server");
        return reply({ id: d.id, path: d.path, upload_token: data.token });
      }
      case "confirm": {
        if (!id) throw new KaError("ka_not_found");
        await db("ka_doc_confirm", { p_token: token, p_id: id });
        return reply({ ok: true });
      }
      case "list":
        return reply({ docs: await db("ka_doc_list", { p_token: token }) });
      case "open": {
        if (!id) throw new KaError("ka_not_found");
        const d = await db<{ path: string; mime: string }>("ka_doc_open", { p_token: token, p_id: id });
        const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(d.path, LINK_SECONDS);
        if (error || !data) throw new KaError("ka_server");
        return reply({ url: data.signedUrl, mime: d.mime, expires_in: LINK_SECONDS });
      }
      case "delete": {
        // no id = every document belonging to the caller
        const d = await db<{ paths: string[] }>("ka_doc_delete", { p_token: token, p_id: id });
        await removeFiles(d.paths);
        return reply({ deleted: d.paths.length });
      }
      case "purge": {
        const d = await db<{ paths: string[] }>("ka_doc_purge", { p_token: token });
        await removeFiles(d.paths);
        return reply({ deleted: d.paths.length });
      }
      default:
        return reply({ error: "ka_bad_request" });
    }
  } catch (e) {
    return reply({ error: e instanceof KaError ? e.code : "ka_server" });
  }
});
