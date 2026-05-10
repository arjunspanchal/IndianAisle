import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Public + self-gating routes:
  // - "/" landing
  // - "/login" (couple OTP)
  // - "/vendor/*" (vendor portal — pages handle their own auth gates)
  // - "/admin/*" (admin layout calls requireAdmin())
  // Everything else (the couple-side calculator/properties/etc.) still gets
  // a hard redirect to /login when there's no session.
  const isLogin = path === "/login" || path.startsWith("/login/");
  const isLanding = path === "/";
  const isVendorPortal = path === "/vendor" || path.startsWith("/vendor/");
  const isAdminPortal = path === "/admin" || path.startsWith("/admin/");
  const isGiftPage = path === "/rohan-and-nishtha" || path.startsWith("/rohan-and-nishtha/");
  const isPublic = isLogin || isLanding || isVendorPortal || isAdminPortal || isGiftPage;

  const res = NextResponse.next({ request: req });

  // If Supabase isn't configured (local dev without env), let everything through.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return res;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => {
          for (const { name, value, options } of toSet) {
            res.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Refresh the session cookie if needed. This is the main thing the
  // middleware does for the vendor + admin routes — those pages handle
  // their own gating server-side.
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (path && path !== "/") url.searchParams.set("next", path + (req.nextUrl.search || ""));
    return NextResponse.redirect(url);
  }

  if (user && isLogin) {
    const url = req.nextUrl.clone();
    const next = req.nextUrl.searchParams.get("next");
    url.pathname =
      next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login")
        ? next
        : "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  // Skip Next.js internals, static files, and common image extensions.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|mp4|mov|webm|ogg|m4a|wav|avif)$).*)"],
};
