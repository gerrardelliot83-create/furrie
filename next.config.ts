import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Image optimization for pet photos
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "utfs.io", // UploadThing legacy
      },
      {
        protocol: "https",
        hostname: "*.ufs.sh", // UploadThing V7+ dynamic subdomains
      },
    ],
  },

  // Subdomain-based routing for local development
  // In production, Vercel handles this via vercel.json
  // IMPORTANT: Exclude /api and /_next from rewrites - they should not be prefixed
  async rewrites() {
    return {
      beforeFiles: [
        // Vet portal: vet.furrie.local -> /vet-portal (exclude /api and /_next)
        {
          source: "/((?!api|_next).*)",
          has: [{ type: "host", value: "vet.furrie.local" }],
          destination: "/vet-portal/$1",
        },
        // Admin portal: admin.furrie.local -> /admin-portal
        {
          source: "/((?!api|_next).*)",
          has: [{ type: "host", value: "admin.furrie.local" }],
          destination: "/admin-portal/$1",
        },
        // Customer portal: app.furrie.local -> /customer-portal
        {
          source: "/((?!api|_next).*)",
          has: [{ type: "host", value: "app.furrie.local" }],
          destination: "/customer-portal/$1",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default withNextIntl(nextConfig);
