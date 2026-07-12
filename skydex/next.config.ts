import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
