import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aurora — Curated Gift Hampers",
  description:
    "Hand-curated gift hampers for every celebration. Chocolate, festive, spa, coffee and more — packed with love from Bengaluru.",
  keywords: [
    "Aurora",
    "gift hampers",
    "gift box",
    "festive gifts",
    "birthday hampers",
    "anniversary gifts",
    "India",
  ],
  authors: [{ name: "Aurora Gifts" }],
  openGraph: {
    title: "Aurora — Curated Gift Hampers",
    description:
      "Hand-curated gift hampers for every celebration — packed with love.",
    siteName: "Aurora",
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
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
