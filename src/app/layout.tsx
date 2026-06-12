import type { Metadata } from "next";
import "./globals.css";
import { AppStateProvider } from "@/context/useAppState";

export const metadata: Metadata = {
  title: "Arc Terminal | Modern Perpetual DEX",
  description: "Trade perpetual futures with up to 100x leverage on Arc Testnet.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full dark bg-[#030304]">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col antialiased bg-[#030304] text-[#f4f4f7] selection:bg-[#8b5cf6]/30">
        <AppStateProvider>{children}</AppStateProvider>
      </body>
    </html>
  );
}
