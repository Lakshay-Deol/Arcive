"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const navLinks = [
  { href: "/", label: "OVERVIEW" },
  { href: "/create", label: "SEND PAYMENT" },
  { href: "/history", label: "RECEIPT LEDGER" },
  { href: "/gallery", label: "NFT PROOFS" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <header className="w-full bg-[#c8d5b9] border-b-4 border-[#0f1712] px-4 md:px-8 py-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* LOGO */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="bg-[#0f1712] text-[#c8d5b9] font-black text-2xl w-10 h-10 flex items-center justify-center border-2 border-[#0f1712] shadow-[3px_3px_0px_#0f1712]">
              A
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-black text-2xl tracking-tighter text-[#0f1712]">
                ARCIVE
              </span>
              <span className="h-4 w-1 bg-[#0f1712] inline-block ml-0.5 animate-pulse" />
            </div>
          </Link>

          {/* NAV LINKS */}
          <nav className="hidden lg:flex items-center gap-2">
            {navLinks.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 text-xs font-black tracking-wider transition-all uppercase border-2 ${
                    active
                      ? "bg-[#0f1712] text-[#c8d5b9] border-[#0f1712] shadow-[2px_2px_0px_#0f1712]"
                      : "text-[#0f1712] border-transparent hover:border-[#0f1712] hover:bg-white/40"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* RIGHT ACTIONS: RainbowKit Button + Quick CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="/create"
            className="hidden sm:inline-flex items-center gap-1.5 bg-[#faf8f0] border-3 border-[#0f1712] shadow-[3px_3px_0px_#0f1712] px-4 py-2 text-xs font-black uppercase text-[#0f1712] hover:bg-white transition-all active:translate-x-0.5 active:translate-y-0.5"
          >
            <span>NEW RECEIPT</span>
            <span className="font-bold">↗</span>
          </Link>

          <div className="neo-connect">
            <ConnectButton
              showBalance={false}
              chainStatus="icon"
              accountStatus="avatar"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
