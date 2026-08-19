import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppStateProvider } from "@/context/useAppState";
import { UnifiedBalanceProvider } from "@/lib/circle-unified-balance-kit";

export const metadata: Metadata = {
  title: "Arc Terminal | Modern Perpetual DEX",
  description: "Trade perpetual futures with up to 20x leverage on Arc Testnet.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_CIRCLE_KIT_KEY || "8284e102d788202cba2c812efa5e2198:cc4ca0a633b7228fba17659ab27795a0";

  return (
    <html lang="en" className="h-full bg-white dark:bg-[#030304]">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col antialiased bg-white dark:bg-[#030304] text-slate-900 dark:text-[#f4f4f7] selection:bg-[#8b5cf6]/30">
        <UnifiedBalanceProvider apiKey={apiKey}>
          <AppStateProvider>{children}</AppStateProvider>
        </UnifiedBalanceProvider>
      </body>
    </html>
  );
}
