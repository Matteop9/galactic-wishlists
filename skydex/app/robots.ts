import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://skydex-two.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Signed-in app surfaces and auth plumbing — nothing for a crawler.
        disallow: ["/api/", "/auth/", "/settings", "/profile", "/spot", "/scrapbook"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
