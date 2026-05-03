// Vendor-portal auth helpers (Module 1).
//
// Server-side only. Pages and server actions call these to gate access:
// - getCurrentUser()    — current Supabase auth user, or null
// - requireAuth()       — redirects to /vendor/login if not signed in
// - isAdmin()           — checks public.admins for the current user
// - requireAdmin()      — redirects to / if not admin
// - getVendorRole(id)   — 'owner' | 'manager' | 'staff' | null for the current user
// - requireVendorAccess(id) — redirects if no role on the vendor

import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { VendorRole } from "@/lib/supabase/types";

export async function getCurrentUser(): Promise<User | null> {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}

export async function requireAuth(opts?: { next?: string }): Promise<User> {
  const user = await getCurrentUser();
  if (user) return user;
  const next = opts?.next ? `?next=${encodeURIComponent(opts.next)}` : "";
  redirect(`/vendor/login${next}`);
}

export async function isAdmin(): Promise<boolean> {
  const sb = createSupabaseServerClient();
  const { data: userData } = await sb.auth.getUser();
  if (!userData.user) return false;
  const { data, error } = await sb
    .from("admins")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/vendor/login?next=/admin/vendors");
  const ok = await isAdmin();
  if (!ok) redirect("/");
  return user;
}

export async function getVendorRole(vendorId: string): Promise<VendorRole | null> {
  const sb = createSupabaseServerClient();
  const { data: userData } = await sb.auth.getUser();
  if (!userData.user) return null;
  const { data, error } = await sb
    .from("vendor_users")
    .select("role")
    .eq("vendor_id", vendorId)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data.role;
}

export async function requireVendorAccess(vendorId: string): Promise<VendorRole> {
  await requireAuth({ next: `/vendor/dashboard` });
  const role = await getVendorRole(vendorId);
  if (!role) redirect("/vendor/onboarding");
  return role;
}

/**
 * Returns the first vendor (by accepted_at desc → invited_at desc) the user
 * belongs to. Used by /vendor/login + onboarding to decide where to send the
 * user after sign-in.
 */
export async function getPrimaryVendorForCurrentUser(): Promise<{
  vendorId: string;
  role: VendorRole;
} | null> {
  const sb = createSupabaseServerClient();
  const { data: userData } = await sb.auth.getUser();
  if (!userData.user) return null;
  const { data, error } = await sb
    .from("vendor_users")
    .select("vendor_id, role, accepted_at, invited_at")
    .eq("user_id", userData.user.id)
    .order("accepted_at", { ascending: false, nullsFirst: false })
    .order("invited_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return { vendorId: data.vendor_id, role: data.role };
}
