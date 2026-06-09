import type { Metadata } from "next";
import "./globals.css";
import AppNav from "@/components/AppNav";
import ChatWidget from "@/components/ChatWidget";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.indianaisle.com"),
  title: "The Indian Aisle",
  description: "Plan and tweak a wedding budget with live totals.",
};

// Runs before paint to set the `dark` class so first paint matches the
// stored/system preference and we avoid a flash of wrong theme.
const themeBootstrap = `
(function(){try{
  var ls = localStorage.getItem('theme');
  var sys = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var dark = ls ? ls === 'dark' : sys;
  if (dark) document.documentElement.classList.add('dark');
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}catch(e){}})();
`;

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-screen bg-parchment text-ink-soft">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  name: "The Indian Aisle",
                  url: "https://www.indianaisle.com",
                  description:
                    "Plan an Indian wedding — budgets, vendors, and the meaning of every ritual.",
                },
                {
                  "@type": "WebSite",
                  name: "The Indian Aisle",
                  url: "https://www.indianaisle.com",
                },
              ],
            }),
          }}
        />
        <div className="flex min-h-screen flex-col lg:flex-row">
          <AppNav user={user} />
          <div className="flex-1">{children}</div>
        </div>
        {user && <ChatWidget />}
      </body>
    </html>
  );
}
