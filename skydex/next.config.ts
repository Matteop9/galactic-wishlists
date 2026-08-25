import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Canonical host is sky-dex.com. The legacy Vercel domain and www both serve
  // this same deployment, so redirect by Host header (evaluated before the app
  // and before proxy.ts). 308 preserves method, path and query — old share
  // links like /s/[id] land on the same page. Sessions don't transfer across
  // origins, so legacy-domain users re-sign-in once on arrival.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "skydex-two.vercel.app" }],
        destination: "https://sky-dex.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.sky-dex.com" }],
        destination: "https://sky-dex.com/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // User-uploaded photos are served from public storage URLs; never let
          // a browser content-sniff its way into executing one.
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Spot page needs camera + geolocation (same origin only); nothing
          // else on the platform should be delegated.
          {
            key: "Permissions-Policy",
            value: "camera=(self), geolocation=(self), microphone=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
