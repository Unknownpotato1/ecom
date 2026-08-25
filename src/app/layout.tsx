import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Script from "next/script";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Eviola — Artificial Jewelry Online",
  description:
    "Shop hand-curated artificial jewelry — necklaces, rings, earrings, bracelets and more. Crafted with love from Lucknow, India.",
  keywords: [
    "Eviola",
    "artificial jewelry",
    "jewelry online",
    "necklaces",
    "rings",
    "earrings",
    "bracelets",
    "India",
  ],
  authors: [{ name: "Eviola" }],
  openGraph: {
    title: "Eviola — Artificial Jewelry Online",
    description:
      "Shop hand-curated artificial jewelry — necklaces, rings, earrings, bracelets and more. Crafted with love.",
    siteName: "Eviola",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased bg-background text-foreground`}
      >
        {/*
          Pre-fetch the logo URL BEFORE React hydrates.
          The Header component reads logoUrl from /api/settings in a
          useEffect, which causes a flash of the fallback "A" badge on
          every page load (the fetch takes ~100-300ms to resolve). To
          eliminate that flash, this inline script runs synchronously
          in <head> before React renders, fetches the logo URL, and
          caches it in sessionStorage under 'eviola:logo-url'. The
          Header then reads from sessionStorage on its INITIAL render
          (synchronous, no flash), falling back to the useEffect fetch
          only if sessionStorage is empty (first-ever visit).

          Uses 'beforeInteractive' so it runs before any React code.
          The fetch itself is async (can't block HTML), but it resolves
          fast enough that by the time React hydrates and the Header
          mounts, sessionStorage is almost always populated — and on
          any subsequent navigation the value is already there.
        */}
        <Script
          id="logo-prefetch"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // If we already have a cached URL, nothing to do —
                  // the Header will read it synchronously.
                  if (sessionStorage.getItem('eviola:logo-url')) return;
                  // Fire-and-forget fetch. Caches result in sessionStorage.
                  // Catch() silently ignores network errors — the Header
                  // will fall back to its useEffect fetch in that case.
                  fetch('/api/settings', { cache: 'no-store' })
                    .then(function(r) { return r.json(); })
                    .then(function(d) {
                      if (d && d.settings && d.settings.logoUrl) {
                        sessionStorage.setItem('eviola:logo-url', d.settings.logoUrl);
                      }
                    })
                    .catch(function() {});
                } catch (e) {}
              })();
            `,
          }}
        />
        {/* Meta Pixel — loads after hydration, initializes + fires PageView */}
        <Script
          id="meta-pixel-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window,document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '843987037746164');
              fbq('track', 'PageView');
            `,
          }}
        />
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
