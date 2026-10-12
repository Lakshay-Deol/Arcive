"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount } from "wagmi";

export default function HomePage() {
  const { isConnected, address } = useAccount();

  return (
    <div className="space-y-12">
      {/* Top Banner Tags matching screenshot */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="neo-badge bg-[#e75a3c] text-white border-2 border-[#0f1712] shadow-[3px_3px_0px_#0f1712]">
          ONE REPORT. CONNECTED CONTEXT.
        </span>
        <span className="neo-badge neo-badge-black border-2 border-[#0f1712] shadow-[3px_3px_0px_#0f1712]">
          ARC NETWORK MAINNET & TESTNET
        </span>
      </div>

      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Headline Area */}
        <div className="lg:col-span-7 space-y-6">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[0.95] text-[#0f1712] uppercase">
            ONE PAYMENT. <br />
            <span className="inline-block mt-2 bg-transparent border-4 border-[#0f1712] shadow-[8px_8px_0px_#0f1712] px-4 py-1 bg-[#faf8f0]">
              ONE VERIFIED
            </span>
            <br />
            <span className="inline-block mt-2">RECEIPT.</span>
          </h1>

          <p className="text-lg md:text-xl font-bold text-[#1f2923] max-w-xl leading-relaxed pt-2">
            Every USDC payment on Arc deserves a permanent, deterministic on-chain audit trail.
            Arcive executes fund transfers and records counterparty metadata, categories, and references in a single atomic transaction.
          </p>

          <div className="pt-4 flex flex-wrap items-center gap-4">
            <Link
              href="/create"
              className="bg-[#e75a3c] border-4 border-[#0f1712] shadow-[6px_6px_0px_#0f1712] px-6 py-4 text-base md:text-lg font-black uppercase text-[#0f1712] flex items-center gap-2 hover:bg-[#f06c50] transition-all active:translate-x-0.5 active:translate-y-0.5"
            >
              <span>SEND VERIFIED PAYMENT</span>
              <span className="text-xl">↗</span>
            </Link>

            <Link
              href="/history"
              className="bg-[#e75a3c] border-4 border-[#0f1712] shadow-[6px_6px_0px_#0f1712] px-6 py-4 text-sm font-black uppercase text-[#0f1712] hover:bg-[#f06c50] transition-all active:translate-x-0.5 active:translate-y-0.5"
            >
              EXPLORE THE RECORDED TRAIL
            </Link>
          </div>

          <div className="pt-2 flex items-center gap-2 text-xs font-black uppercase text-[#0f1712]">
            <span className="w-3 h-3 rounded-full bg-[#4ade80] border-2 border-[#0f1712]" />
            <span>Deterministic on-chain payment trail • 100% Explainable & verifiable</span>
          </div>
        </div>

        {/* Right Cards Area */}
        <div className="lg:col-span-5 space-y-6">
          {/* Candidate / Verification Report Card */}
          <div className="neo-box p-6 bg-[#faf8f0] border-4 border-[#0f1712] shadow-[8px_8px_0px_#0f1712]">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#0f1712] mb-4">
              <span className="neo-badge neo-badge-black text-[10px]">THE ARCIVE STANDARD</span>
              <span className="neo-badge bg-[#4ade80] text-[#0f1712] text-[10px]">VERIFIED</span>
            </div>
            <h3 className="text-lg font-black text-[#0f1712] uppercase leading-tight">
              SINGLE-TRANSACTION SETTLEMENT WITHOUT TRUSTED OWNER KEYS.
            </h3>
            <p className="text-xs font-bold text-[#556358] mt-2 uppercase tracking-wide">
              REPORT SUMMARY, SYNTHESIZED FOR LENDER & AUDITOR REVIEW
            </p>
          </div>

          {/* Recorded Result Box */}
          <div className="neo-box p-6 bg-[#faf8f0] border-4 border-[#0f1712] shadow-[8px_8px_0px_#0f1712] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#0f1712]">
              <span className="neo-badge bg-[#4ade80] text-[#0f1712] text-[10px]">RECORDED RESULT</span>
              <span className="neo-badge bg-[#eab308] text-[#0f1712] text-[10px]">READ BACK ✓</span>
            </div>

            <h2 className="text-xl font-black text-[#0f1712] uppercase tracking-tight">
              THE PAYMENT HAS A TRAIL.
            </h2>

            <div className="space-y-3 text-xs font-bold divide-y-2 divide-[#0f1712]/15">
              <div className="flex justify-between items-center pt-2">
                <span className="text-[#0f1712]">Invoice #1042 — Engineering Deliverable</span>
                <span className="neo-badge bg-[#eab308] text-[#0f1712] text-[10px]">500.00 USDC</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-[#0f1712]">Salary Disbursal — Q3 Core Ops</span>
                <span className="neo-badge bg-[#eab308] text-[#0f1712] text-[10px]">1,250.00 USDC</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-[#0f1712]">Grant Escrow — Verification Hash</span>
                <span className="neo-badge bg-[#eab308] text-[#0f1712] text-[10px]">PERMANENT</span>
              </div>
            </div>

            <div className="mt-4 p-4 bg-[#faf8f0] border-3 border-[#0f1712] text-xs font-black uppercase text-[#0f1712] space-y-1">
              <div>NON-REPIDIABLE: IMMUTABLE METADATA STAMPED IN EVM BLOCK HEADER.</div>
              <div className="text-[10px] text-[#556358] font-bold">100% EXPLAINABLE, AUDIT-READY LEDGER VERIFIED ON ARC.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div className="neo-box p-6 bg-[#faf8f0] border-4 border-[#0f1712] shadow-[6px_6px_0px_#0f1712]">
          <span className="text-[11px] font-black uppercase text-[#556358] tracking-wider block mb-1">
            01 / SETTLEMENT
          </span>
          <h4 className="text-xl font-black text-[#0f1712] uppercase">
            Deterministic Engine
          </h4>
          <p className="text-xs font-bold text-[#334138] mt-2">
            Atomically pairs ERC-20 transfer with persistent receipt mapping in a single gas-efficient transaction.
          </p>
        </div>

        <div className="neo-box p-6 bg-[#faf8f0] border-4 border-[#0f1712] shadow-[6px_6px_0px_#0f1712]">
          <span className="text-[11px] font-black uppercase text-[#556358] tracking-wider block mb-1">
            02 / ACCOUNTING
          </span>
          <h4 className="text-xl font-black text-[#0f1712] uppercase">
            Injection-Safe CSV
          </h4>
          <p className="text-xs font-bold text-[#334138] mt-2">
            One-click export with BOM UTF-8 encoding and sanitization against formula injection attacks (=, +, -, @).
          </p>
        </div>

        <div className="neo-box p-6 bg-[#faf8f0] border-4 border-[#0f1712] shadow-[6px_6px_0px_#0f1712]">
          <span className="text-[11px] font-black uppercase text-[#556358] tracking-wider block mb-1">
            03 / NETWORK DESIGN
          </span>
          <h4 className="text-xl font-black text-[#0f1712] uppercase">
            Native USDC Gas
          </h4>
          <p className="text-xs font-bold text-[#334138] mt-2">
            Optimized for Arc's native USDC architecture. Pay gas and transfer funds in a single stable asset.
          </p>
        </div>
      </div>
    </div>
  );
}
