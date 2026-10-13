import type { Metadata } from "next";
import "./globals.css";
import { Web3Providers } from "../lib/wagmi";
import Sidebar from "./components/Sidebar";

export const metadata: Metadata = {
  title: "Arcive",
  description: "One report. One verified handoff. Permanent, auditable on-chain receipts on Arc Network.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f8ef88] text-[#111111] antialiased">
        <Web3Providers>
          <div className="min-h-screen flex flex-col">
            <Sidebar />
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8">
              {children}
            </main>
          </div>
        </Web3Providers>
      </body>
    </html>
  );
}
