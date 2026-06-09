import type { MetadataRoute } from "next";

const BASE = "https://www.indianaisle.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/pandit"],
      // Keep the gated, couple-private app surfaces out of the index.
      disallow: ["/weddings", "/properties", "/profile", "/admin", "/vendor", "/api"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
