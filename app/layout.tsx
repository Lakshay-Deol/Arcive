import type { Metadata } from "next";
import "./globals.css";
import { Web3Providers } from "../lib/wagmi";
import Sidebar from "./components/Sidebar";

export const metadata: Metadata = {
  title: "Arcive — Deterministic On-Chain Payment Receipts on Arc",
  description: "One report. One verified handoff. Permanent, auditable on-chain receipts on Arc Network.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#c8d5b9] text-[#0f1712] antialiased">
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
