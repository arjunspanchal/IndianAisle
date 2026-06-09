import type { MetadataRoute } from "next";
import { allRitualSlugs, faithsWithEntries } from "@/lib/pandit-kb";

const BASE = "https://www.indianaisle.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const ritualPages: MetadataRoute.Sitemap = allRitualSlugs().map((slug) => ({
    url: `${BASE}/pandit/${slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const faithPages: MetadataRoute.Sitemap = faithsWithEntries().map((faith) => ({
    url: `${BASE}/pandit/faith/${faith}`,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/pandit`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/pandit/glossary`, changeFrequency: "monthly", priority: 0.6 },
    ...faithPages,
    ...ritualPages,
  ];
}
