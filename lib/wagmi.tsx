"use client";

import "@rainbow-me/rainbowkit/styles.css";
import {
  RainbowKitProvider,
  getDefaultConfig,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider, createStorage, cookieStorage } from "wagmi";
import { ReactNode, useState, useEffect } from "react";
import { arcTestnet, arcMainnet } from "./chains";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

if (typeof window === "undefined") {
  if (typeof (globalThis as any).indexedDB === "undefined") {
    (globalThis as any).indexedDB = {
      open: () => ({
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
      }),
    };
  }
}

export const config = getDefaultConfig({
  appName: "Arcive",
  projectId: "c4f79cc821944d9680842e34466bfb", // Safe fallback WalletConnect public ID
  chains: [arcTestnet, arcMainnet],
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});

export function Web3Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {mounted ? children : (
            <div className="min-h-screen bg-[#f8ef88] flex items-center justify-center font-black text-xl text-[#111111]">
              INITIALIZING ARCIVE...
            </div>
          )}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
