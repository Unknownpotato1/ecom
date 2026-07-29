import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ["firebase-admin", "firebase-admin/firestore", "cloudinary"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  /**
   * SPA deep-link rewrites.
   *
   * The store is a single-route Next.js SPA — all view transitions
   * (home / product / checkout / etc.) are managed in-memory by Zustand.
   * To make the browser back button work, ui-store.ts pushes real URLs
   * like /product/<id> and /checkout into history via history.pushState.
   *
   * Those URLs are cosmetic for in-app navigation, BUT if the user
   * refreshes the page (or shares a deep link), the browser sends a
   * real HTTP request to /product/<id> — which has no Next.js route,
   * so it returns 404.
   *
   * These rewrites silently forward ALL "page-like" paths back to the
   * root SPA. The NavigationWatcher component then parses the URL on
   * mount and restores the correct view from the path.
   *
   * Excluded from the rewrite:
   *   - /_next/*        (Next.js asset requests)
   *   - /api/*          (API routes — must hit the real handler)
   *   - paths with a dot (file extensions: favicon.ico, robots.txt,
   *                       .png, .css, .js, etc.)
   */
  async rewrites() {
    return [
      {
        // Match any path that is NOT:
        //   - empty or just "/"            (the root itself — don't self-rewrite)
        //   - starting with _next/         (Next.js assets)
        //   - starting with api/           (API routes — must hit real handler)
        //   - containing a dot             (file extensions: favicon.ico,
        //                                    robots.txt, .png, .css, .js, etc.)
        // Forward everything else to "/" so the SPA boots and
        // NavigationWatcher restores the correct view from the URL.
        source: "/((?!_next/|api/|.*\\..*).+)",
        destination: "/",
      },
    ];
  },
};

export default nextConfig;
