"use client";

import "@rainbow-me/rainbowkit/styles.css";
import {
  RainbowKitProvider,
  getDefaultConfig,
} from "@rainbow-me/rainbowkit";
import { WagmiConfig } from "wagmi";
import { ReactNode, useState, useEffect } from "react";
import { arcTestnet, arcMainnet } from "./chains";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

const config = getDefaultConfig({
  appName: "Arcive",
  projectId: "c4f79cc821944d9680842e34466bfb", // Safe fallback WalletConnect public ID
  chains: [arcTestnet, arcMainnet],
  ssr: false, // Prevents SSR IndexedDB/WalletConnect freezing on Next.js server render
});

export function Web3Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#f8ef88] flex items-center justify-center font-black text-xl text-[#111111]">
        INITIALIZING ARCIVE...
      </div>
    );
  }

  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}
