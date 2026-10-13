"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import html2canvas from "html2canvas";

export interface NftVoucherProps {
  tokenId: bigint | string | number;
  payer: string;
  payee: string;
  amount: bigint;
  category: string;
  note: string;
  timestamp: bigint | number;
  owner?: string;
  svgDataUri?: string | null;
  contractAddress?: string;
  onAddToWallet?: (tokenId: bigint) => void;
  compact?: boolean;
}

export function formatUsdc(amount: bigint | undefined): string {
  if (typeof amount === "undefined") return "0.00";
  const num = Number(amount) / 1e6;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

export function formatTimestamp(ts: bigint | number | undefined): string {
  if (!ts) return "Just now";
  const num = Number(ts);
  const date = new Date(num > 1e12 ? num : num * 1000);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NftVoucherCard({
  tokenId,
  payer,
  payee,
  amount,
  category,
  note,
  timestamp,
  owner,
  svgDataUri,
  contractAddress = "0x4664cf917157735081c3ba095733a85ade5beb0f",
  onAddToWallet,
  compact = false,
}: NftVoucherProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showRawSvg, setShowRawSvg] = useState(false);

  const tokenStr = tokenId.toString();
  const explorerUrl =
    process.env.NEXT_PUBLIC_EXPLORER_URL || "https://explorer.arc.io";

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0d0f17",
        scale: 3,
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `Arcive-NFT-Proof-#${tokenStr}.png`;
      a.click();
    } catch (err) {
      console.error("Failed to export NFT card image:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* THE LUXURY NFT CARD CONTAINER */}
      <div
        ref={cardRef}
        className="relative bg-[#0d0f17] text-white border-4 border-[#111111] shadow-[8px_8px_0px_#111111] overflow-hidden transition-all duration-300 hover:shadow-[12px_12px_0px_#111111]"
      >
        {/* Subtle holographic border glow */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-600/15" />

        {/* TOP STATUS BAR */}
        <div className="relative z-10 flex items-center justify-between px-5 py-3 border-b-3 border-[#222736] bg-[#090a10]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse border border-[#111111]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">
              ARC NETWORK • ERC-721
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-[#fef08a] text-[#111111] text-[11px] font-black px-2.5 py-0.5 border border-[#111111] shadow-[2px_2px_0px_#111111]">
              TOKEN #{tokenStr}
            </span>
          </div>
        </div>

        {/* HERO VISUAL: BRAND LOGO WITH GLOW */}
        {showRawSvg && svgDataUri ? (
          <div className="p-4 bg-white border-b-3 border-[#222736] flex items-center justify-center">
            <img
              src={svgDataUri}
              alt={`Raw SVG #${tokenStr}`}
              className="max-h-64 w-auto border-2 border-[#111111]"
            />
          </div>
        ) : (
          <div className="relative py-8 px-6 bg-radial-gradient flex flex-col items-center justify-center overflow-hidden border-b-3 border-[#222736]">
            {/* Ambient Radial Neon Aura */}
            <div className="absolute w-56 h-56 rounded-full bg-blue-500/25 blur-3xl pointer-events-none" />

            {/* Corner Banknote Registration Marks */}
            <div className="absolute top-3 left-3 text-[9px] font-mono font-bold text-cyan-400/60">
              ┌ ARCIVE-5042
            </div>
            <div className="absolute top-3 right-3 text-[9px] font-mono font-bold text-cyan-400/60">
              PROOF ┐
            </div>
            <div className="absolute bottom-3 left-3 text-[9px] font-mono font-bold text-cyan-400/60">
              └ ATOMIC
            </div>
            <div className="absolute bottom-3 right-3 text-[9px] font-mono font-bold text-cyan-400/60">
              VERIFIED ┘
            </div>

            {/* Glowing Hero Logo Artwork */}
            <div className="relative group">
              <div className="w-36 h-36 md:w-44 md:h-44 rounded-2xl p-1 bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 shadow-[0_0_35px_rgba(56,189,248,0.4)] border-2 border-cyan-300/40 transform transition-transform group-hover:scale-105 duration-300">
                <img
                  src="/arc-logo.png"
                  alt="Arcive Digital Proof"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
            </div>

            {/* Certificate Title Badge */}
            <div className="mt-4 flex flex-col items-center gap-1">
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-cyan-300 drop-shadow-[0_0_8px_rgba(103,232,249,0.5)]">
                ARCIVE IMMUTABLE VOUCHER
              </span>
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                CRYPTOGRAPHIC PROOF OF PAYMENT
              </span>
            </div>
          </div>
        )}

        {/* STATS & METADATA BODY */}
        <div className="p-5 space-y-4 relative z-10 bg-[#0d0f17]">
          {/* Amount Settled Callout */}
          <div className="bg-[#151928] border-2 border-[#2b334a] p-4 text-center rounded-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              TOTAL AMOUNT SETTLED
            </span>
            <div className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              <span className="text-cyan-400">${formatUsdc(amount)}</span>
              <span className="text-lg font-black text-slate-300">USDC</span>
            </div>
          </div>

          {/* Category & Reason Badges */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#151928] border border-[#2b334a] p-2.5">
              <span className="text-[9px] font-black uppercase text-slate-400 block">
                CATEGORY
              </span>
              <span className="font-black text-amber-300 uppercase truncate block">
                {category || "Payment"}
              </span>
            </div>
            <div className="bg-[#151928] border border-[#2b334a] p-2.5">
              <span className="text-[9px] font-black uppercase text-slate-400 block">
                TIMESTAMP
              </span>
              <span className="font-bold text-slate-200 text-[11px] truncate block">
                {formatTimestamp(timestamp)}
              </span>
            </div>
          </div>

          {/* Purpose / Note */}
          <div className="bg-[#151928] border border-[#2b334a] p-3">
            <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">
              REFERENCE NOTE
            </span>
            <span className="text-xs font-bold text-slate-100 italic block truncate">
              "{note || "Arcive Payment"}"
            </span>
          </div>

          {/* Counterparty Hashes */}
          <div className="bg-[#10131f] border border-[#2b334a] p-2.5 space-y-1 font-mono text-[10px]">
            <div className="flex justify-between items-center text-slate-400">
              <span className="font-sans font-bold text-[9px] uppercase">PAYER:</span>
              <span className="text-slate-200 font-bold select-all">
                {payer ? `${payer.slice(0, 8)}...${payer.slice(-6)}` : "—"}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span className="font-sans font-bold text-[9px] uppercase">PAYEE:</span>
              <span className="text-cyan-300 font-bold select-all">
                {payee ? `${payee.slice(0, 8)}...${payee.slice(-6)}` : "—"}
              </span>
            </div>
            {owner && (
              <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-[#1f2638]">
                <span className="font-sans font-bold text-[9px] uppercase">NFT HOLDER:</span>
                <span className="text-emerald-400 font-bold select-all">
                  {`${owner.slice(0, 8)}...${owner.slice(-6)}`}
                </span>
              </div>
            )}
          </div>

          {/* Security Guarantee Seal */}
          <div className="flex items-center justify-between pt-2 border-t border-[#1f2638] text-[9px] font-black uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <span>✓</span> IMMUTABLY RECORDED ON ARC
            </span>
            <span>CHAIN ID 5042</span>
          </div>
        </div>
      </div>

      {/* ACTION CONTROLS */}
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="neo-btn bg-[#f8ef88] text-[#111111] px-3.5 py-1.5 text-xs font-black flex items-center gap-1.5 hover:bg-[#fef08a]"
            >
              {isDownloading ? (
                <span className="w-3 h-3 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>📷</span>
              )}
              <span>{isDownloading ? "EXPORTING..." : "SAVE NFT IMAGE"}</span>
            </button>

            {onAddToWallet && (
              <button
                onClick={() => onAddToWallet(BigInt(tokenId))}
                className="neo-btn bg-white text-[#111111] px-3 py-1.5 text-xs font-black flex items-center gap-1 hover:bg-slate-100"
              >
                <span>🦊</span>
                <span>WATCH IN WALLET</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {svgDataUri && (
              <button
                onClick={() => setShowRawSvg(!showRawSvg)}
                className="text-[10px] font-black uppercase text-[#666666] hover:text-[#111111] underline underline-offset-2 px-1"
              >
                {showRawSvg ? "✨ SHOW ARTWORK" : "📜 RAW CONTRACT SVG"}
              </button>
            )}

            <Link
              href={`/receipt/${tokenStr}`}
              className="neo-btn bg-[#111111] text-[#f8ef88] px-3 py-1.5 text-xs font-black"
            >
              VIEW RECEIPT →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
