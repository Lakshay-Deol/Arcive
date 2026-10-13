"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount } from "wagmi";

export default function HomePage() {
  const { isConnected, address } = useAccount();
  const [showGuide, setShowGuide] = useState(true);

  return (
    <div className="space-y-12">
      {/* Top Banner Tags */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="neo-badge bg-[#c026d3] text-white border-3 border-[#111111] shadow-[3px_3px_0px_#111111]">
          ONE REPORT. CONNECTED CONTEXT.
        </span>
        <span className="neo-badge neo-badge-black border-3 border-[#111111] shadow-[3px_3px_0px_#111111]">
          ARC NETWORK MAINNET (CHAIN ID 5042)
        </span>
      </div>

      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Headline Area */}
        <div className="lg:col-span-7 space-y-6">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[0.95] text-[#111111] uppercase">
            ONE PAYMENT. <br />
            <span className="inline-block mt-2 bg-transparent border-4 border-[#111111] shadow-[8px_8px_0px_#111111] px-4 py-1 bg-white">
              ONE VERIFIED
            </span>
            <br />
            <span className="inline-block mt-2">RECEIPT.</span>
          </h1>

          <p className="text-lg md:text-xl font-bold text-[#222222] max-w-xl leading-relaxed pt-2">
            Every USDC payment on Arc deserves a permanent, deterministic on-chain audit trail.
            Arcive executes fund transfers and records counterparty metadata, categories, and references in a single atomic transaction.
          </p>

          <div className="pt-4 flex flex-wrap items-center gap-4">
            <Link
              href="/create"
              className="bg-[#f43f5e] border-4 border-[#111111] shadow-[6px_6px_0px_#111111] px-6 py-4 text-base md:text-lg font-black uppercase text-[#111111] flex items-center gap-2 hover:bg-[#fb7185] transition-all active:translate-x-0.5 active:translate-y-0.5"
            >
              <span>SEND VERIFIED PAYMENT</span>
              <span className="text-xl">↗</span>
            </Link>

            <Link
              href="/history"
              className="bg-white border-4 border-[#111111] shadow-[6px_6px_0px_#111111] px-6 py-4 text-sm font-black uppercase hover:bg-slate-100 transition-all active:translate-x-0.5 active:translate-y-0.5"
            >
              EXPLORE THE RECORDED TRAIL
            </Link>
          </div>

          <div className="pt-2 flex items-center gap-2 text-xs font-black uppercase text-[#111111]">
            <span className="w-3 h-3 rounded-full bg-[#10b981] border-2 border-[#111111]" />
            <span>Deterministic on-chain payment trail • 100% Explainable & verifiable</span>
          </div>
        </div>

        {/* Right Cards Area */}
        <div className="lg:col-span-5 space-y-6">
          {/* Candidate / Verification Report Card */}
          <div className="neo-box p-6 bg-[#0d0f17] text-white border-4 border-[#111111] shadow-[8px_8px_0px_#111111] relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-700 mb-4">
              <span className="neo-badge bg-[#fef08a] text-[#111111] text-[10px]">THE ARCIVE STANDARD</span>
              <span className="neo-badge bg-[#10b981] text-white text-[10px]">VERIFIED</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-gradient-to-tr from-cyan-400 to-blue-600 p-0.5 shadow-[0_0_20px_rgba(56,189,248,0.4)] flex-shrink-0">
                <img src="/arc-logo.png" alt="Arcive Official Logo" className="w-full h-full object-cover rounded-md" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase leading-tight">
                  Single-transaction settlement with on-chain NFT proofs.
                </h3>
                <p className="text-[11px] font-bold text-cyan-300 mt-1 uppercase tracking-wide">
                  IMMUTABLE AUDIT TRAIL ON ARC NETWORK
                </p>
              </div>
            </div>
          </div>

          {/* Recorded Result Box */}
          <div className="neo-box p-6 bg-white border-4 border-[#111111] shadow-[8px_8px_0px_#111111] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#111111]">
              <span className="neo-badge bg-[#34d399] text-[#111111] text-[10px]">RECORDED RESULT</span>
              <span className="neo-badge bg-white text-[#111111] text-[10px]">READ BACK ✓</span>
            </div>

            <h2 className="text-xl font-black text-[#111111] uppercase tracking-tight">
              THE PAYMENT HAS A TRAIL.
            </h2>

            <div className="space-y-3 text-xs font-bold divide-y-2 divide-[#111111]/10">
              <div className="flex justify-between items-center pt-2">
                <span className="text-[#111111]">Invoice #1042 — Engineering Deliverable</span>
                <span className="neo-badge bg-[#06b6d4] text-[#111111] text-[10px]">500.00 USDC</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-[#111111]">Salary Disbursal — Q3 Core Ops</span>
                <span className="neo-badge bg-[#06b6d4] text-[#111111] text-[10px]">1,250.00 USDC</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-[#111111]">Grant Escrow — Verification Hash</span>
                <span className="neo-badge bg-[#06b6d4] text-[#111111] text-[10px]">PERMANENT</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-[#e879f9] border-3 border-[#111111] text-xs font-black uppercase text-[#111111] shadow-[3px_3px_0px_#111111]">
              Non-repudiable: Immutable metadata stamped in EVM block header.
            </div>
          </div>
        </div>
      </div>

      {/* Feature Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div className="neo-box p-6 bg-white border-4 border-[#111111] shadow-[6px_6px_0px_#111111]">
          <span className="text-[11px] font-black uppercase text-[#666666] tracking-wider block mb-1">
            01 / SETTLEMENT
          </span>
          <h4 className="text-xl font-black text-[#111111] uppercase">
            Deterministic Engine
          </h4>
          <p className="text-xs font-bold text-[#333333] mt-2">
            Atomically pairs ERC-20 transfer with persistent receipt mapping in a single gas-efficient transaction.
          </p>
        </div>

        <div className="neo-box p-6 bg-white border-4 border-[#111111] shadow-[6px_6px_0px_#111111]">
          <span className="text-[11px] font-black uppercase text-[#666666] tracking-wider block mb-1">
            02 / ACCOUNTING
          </span>
          <h4 className="text-xl font-black text-[#111111] uppercase">
            Injection-Safe CSV
          </h4>
          <p className="text-xs font-bold text-[#333333] mt-2">
            One-click export with BOM UTF-8 encoding and sanitization against formula injection attacks (=, +, -, @).
          </p>
        </div>

        <div className="neo-box p-6 bg-white border-4 border-[#111111] shadow-[6px_6px_0px_#111111]">
          <span className="text-[11px] font-black uppercase text-[#666666] tracking-wider block mb-1">
            03 / NETWORK DESIGN
          </span>
          <h4 className="text-xl font-black text-[#111111] uppercase">
            Native USDC Gas
          </h4>
          <p className="text-xs font-bold text-[#333333] mt-2">
            Optimized for Arc's native USDC architecture. Pay gas and transfer funds in a single stable asset.
          </p>
        </div>
      </div>

      {/* Interactive Walkthrough Modal / Overlay matching Screenshot 2 */}
      {showGuide && (
        <div className="neo-box max-w-xl mx-auto p-6 bg-white border-4 border-[#111111] shadow-[10px_10px_0px_#111111] relative mt-10">
          <div className="flex items-center justify-between pb-4 border-b-3 border-[#111111] mb-4">
            <div className="flex items-center gap-2">
              <span className="neo-badge neo-badge-black">START HERE</span>
              <span className="text-xs font-black uppercase">STEP 1/3</span>
            </div>
            <button
              onClick={() => setShowGuide(false)}
              className="w-7 h-7 bg-[#111111] text-white font-black flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
            >
              ✕
            </button>
          </div>

          <h3 className="text-xl font-black text-[#111111] uppercase mb-2">
            1. Welcome to Arcive
          </h3>
          <p className="text-xs font-bold text-[#444444] mb-4 leading-relaxed">
            Arcive eliminates payment ambiguity. Instead of opaque bank transaction IDs,
            every payment generates an explainable, on-chain proof with verified metadata before receipt issuance.
          </p>

          <div className="bg-[#f0f9ff] border-2 border-[#111111] p-3 text-xs font-black uppercase space-y-2 mb-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <span>☑</span> 100% deterministic evaluation — zero black-box approximations
            </div>
            <div className="flex items-center gap-2 text-emerald-700">
              <span>☑</span> Instant evaluation of recipient, note, and categorizations
            </div>
            <div className="flex items-center gap-2 text-emerald-700">
              <span>☑</span> Accountant-ready CSV ledger export with formula escaping
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setShowGuide(false)}
              className="text-xs font-black uppercase underline hover:text-red-600"
            >
              SKIP
            </button>
            <Link
              href="/create"
              className="neo-btn px-4 py-2 text-xs flex items-center gap-1.5"
            >
              <span>TRY IT OUT</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
