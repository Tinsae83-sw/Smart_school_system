import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Role dashboards and anything containing sensitive data are served behind
// authentication, so public crawlers should skip them (they are protected by
// login/role guards anyway).
const DISALLOW = [
  "/admin",
  "/principal",
  "/teacher",
  "/student",
  "/parent",
  "/vp-academic",
  "/vp-administration",
  "/department-head",
  "/ptsa-representative",
  "/sic-member",
  "/chat",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}