import type { Metadata } from "next";
import type { ReactNode } from "react";

import { WebsiteShell } from "@/components/layout/WebsiteShell";
import { TravelMotion } from "@/components/motion/TravelMotion";
import { siteConfig } from "@/config/site";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.CAB_SITE_ORIGIN || "http://localhost:3000"),
  icons: { icon: "/icon.png" },
  title: siteConfig.title,
  description: siteConfig.description,
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="flex min-h-svh flex-col">
        <a
          href="#main-content"
          className="fixed left-4 top-3 z-[100] -translate-y-20 rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0"
        >
          Skip to main content
        </a>
        <TravelMotion><WebsiteShell>{children}</WebsiteShell></TravelMotion>
      </body>
    </html>
  );
}
