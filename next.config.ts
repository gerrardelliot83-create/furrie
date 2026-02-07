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
        hostname: "utfs.io", // UploadThing
      },
    ],
  },

  // Subdomain-based routing for local development
  // In production, Vercel handles this via vercel.json
  async rewrites() {
    return {
      beforeFiles: [
        // Vet portal: vet.furrie.local -> /vet-portal
        {
          source: "/:path*",
          has: [{ type: "host", value: "vet.furrie.local" }],
          destination: "/vet-portal/:path*",
        },
        // Admin portal: admin.furrie.local -> /admin-portal
        {
          source: "/:path*",
          has: [{ type: "host", value: "admin.furrie.local" }],
          destination: "/admin-portal/:path*",
        },
        // Customer portal: app.furrie.local -> /customer-portal
        {
          source: "/:path*",
          has: [{ type: "host", value: "app.furrie.local" }],
          destination: "/customer-portal/:path*",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default withNextIntl(nextConfig);
