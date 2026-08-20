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
  title: "Eviola — Curated Gift Hampers",
  description:
    "Hand-curated gift hampers for every celebration. Chocolate, festive, spa, coffee and more — packed with love from Bengaluru.",
  keywords: [
    "Eviola",
    "gift hampers",
    "gift box",
    "festive gifts",
    "birthday hampers",
    "anniversary gifts",
    "India",
  ],
  authors: [{ name: "Eviola" }],
  openGraph: {
    title: "Eviola — Curated Gift Hampers",
    description:
      "Hand-curated gift hampers for every celebration — packed with love.",
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
