import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Tree-shake icon and date libraries to keep bundles small.
  // Per audit F-18 - these libraries benefit from per-export imports.
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },

  // Image optimization for pet photos
  images: {
    // Serve modern formats to capable browsers.
    // AVIF first (smallest), then WebP fallback. Per audit F-18.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "api.furrie.in",
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

  // Security headers for production
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.daily.co https://*.supabase.co",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.supabase.co https://api.furrie.in https://utfs.io https://*.ufs.sh https://*.daily.co",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.furrie.in wss://api.furrie.in https://*.daily.co wss://*.daily.co https://utfs.io https://*.ufs.sh https://*.uploadthing.com https://*.ingest.sentry.io",
              "frame-src 'self' https://*.daily.co",
              "media-src 'self' blob: https://*.daily.co https://*.supabase.co",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
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

export default withSentryConfig(withNextIntl(nextConfig), {
  // Upload source maps for better stack traces
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Widen client file upload to include all source files
  widenClientFileUpload: true,

  // Route Sentry events through a tunnel to avoid ad blockers
  tunnelRoute: "/monitoring",

  // Suppress logs unless in CI
  silent: !process.env.CI,

  // Automatically tree-shake Sentry logger statements
  disableLogger: true,

  // Hide source maps from client bundles
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
