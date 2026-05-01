import type { Metadata } from "next";
import "./globals.css";
import AppNav from "@/components/AppNav";
import ChatWidget from "@/components/ChatWidget";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "The Indian Aisle",
  description: "Plan and tweak a wedding budget with live totals.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let user: { email: string } | null = null;
  if (isSupabaseConfigured()) {
    const sb = createSupabaseServerClient();
    const { data } = await sb.auth.getUser();
    if (data.user) {
      user = { email: data.user.email ?? "" };
    }
  }

  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <AppNav user={user} />
          <div className="flex-1">{children}</div>
        </div>
        <ChatWidget />
      </body>
    </html>
  );
}
