import type { Metadata } from "next";
import "./globals.css";
import { AppStateProvider } from "@/context/useAppState";
import { UnifiedBalanceProvider } from "@/lib/circle-unified-balance-kit";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

export const metadata: Metadata = {
  title: "Arc Terminal | Modern Perpetual DEX",
  description: "Trade perpetual futures with up to 20x leverage on Arc Testnet.",
  manifest: "/manifest.json",
  themeColor: "#000000",
  viewport: "minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, viewport-fit=cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_CIRCLE_KIT_KEY || "8284e102d788202cba2c812efa5e2198:cc4ca0a633b7228fba17659ab27795a0";

  return (
    <html lang="en" className="h-full dark bg-[#030304]">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="min-h-full flex flex-col antialiased bg-[#030304] text-[#f4f4f7] selection:bg-[#8b5cf6]/30 relative">
        <UnifiedBalanceProvider apiKey={apiKey}>
          <AppStateProvider>
            {children}
            <PWAInstallPrompt />
          </AppStateProvider>
        </UnifiedBalanceProvider>
      </body>
    </html>
  );
}
