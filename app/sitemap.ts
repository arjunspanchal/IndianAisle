import type { MetadataRoute } from "next";
import { allRitualSlugs } from "@/lib/pandit-kb";

const BASE = "https://www.indianaisle.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const ritualPages: MetadataRoute.Sitemap = allRitualSlugs().map((slug) => ({
    url: `${BASE}/pandit/${slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/pandit`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/pandit/glossary`, changeFrequency: "monthly", priority: 0.6 },
    ...ritualPages,
  ];
}
