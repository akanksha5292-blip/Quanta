import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/layout/AppProviders";
import { isClerkFullyConfigured } from "@/lib/config";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteHeaderPlain } from "@/components/layout/SiteHeaderPlain";
import { OneSignalUserLinker } from "@/components/layout/OneSignalUserLinker";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QUANTA",
  description: "Daily trivia challenge",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "QUANTA" },
  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
    apple: [{ url: "/apple-icon", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#F5C842",
};

/** Avoid static prerender with Clerk during `next build` (fixes Vercel when keys load at runtime). */
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const inner = (
    <AppProviders>
      {isClerkFullyConfigured() ? <SiteHeader /> : <SiteHeaderPlain />}
      {children}
    </AppProviders>
  );

  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {isClerkFullyConfigured() ? (
          <ClerkProvider>
            <OneSignalUserLinker />
            {inner}
          </ClerkProvider>
        ) : (
          inner
        )}
      </body>
    </html>
  );
}
