import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { getConfiguredOrigin } from "@/lib/app-url";

const display = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display"
});

// Numeric and metadata register: percentages, counts, file sizes, dates.
const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono"
});

const title = "My Star Contractor";
const description =
  "Construction management software that keeps project managers and clients working from the same schedule, documents, and progress photos.";

export const metadata: Metadata = {
  metadataBase: new URL(getConfiguredOrigin()),
  title: {
    default: title,
    template: `%s | ${title}`
  },
  description,
  applicationName: title,
  openGraph: {
    type: "website",
    siteName: title,
    title,
    description
  },
  twitter: {
    card: "summary_large_image",
    title,
    description
  },
  robots: {
    index: true,
    follow: true
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1216" }
  ]
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
