import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/diagnosis", "/privacy", "/terms"],
      disallow: ["/api/", "/auth/", "/checkout/", "/parent"],
    },
    sitemap: "https://15loop.com/sitemap.xml",
    host: "https://15loop.com",
  };
}
