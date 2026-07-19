import type { MetadataRoute } from "next";

const baseUrl = "https://15loop.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${baseUrl}/diagnosis`,
      lastModified: new Date("2026-07-19T00:00:00+09:00"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date("2026-07-19T00:00:00+09:00"),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date("2026-07-17T00:00:00+09:00"),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
