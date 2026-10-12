"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import Link from "next/link";
import {
  ARC_RECEIPTS_ADDRESS,
  ARC_RECEIPTS_ABI,
} from "../../lib/arcReceiptsContract";

interface NFTReceiptItem {
  tokenId: bigint;
  payer: string;
  payee: string;
  amount: bigint;
  category: string;
  note: string;
  timestamp: bigint;
}

function formatUsdc(amount: bigint): string {
  const val = Number(amount) / 1000000;
  return val.toFixed(2);
}

const categoryLabels: Record<number, string> = {
  0: "Salary",
  1: "Invoice",
  2: "Donation",
  3: "Subscription",
  4: "Test Purchase",
  5: "Loan repayment",
  6: "Other",
};

export default function GalleryPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [nfts, setNfts] = useState<NFTReceiptItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<"all" | "mine">("mine");

  useEffect(() => {
    if (!publicClient) return;

    async function fetchNFTs() {
      setLoading(true);
      try {
        const nextId = (await publicClient!.readContract({
          address: ARC_RECEIPTS_ADDRESS,
          abi: ARC_RECEIPTS_ABI,
          functionName: "nextReceiptId",
        })) as bigint;

        const total = Number(nextId);
        if (total <= 1) {
          setNfts([]);
          setLoading(false);
          return;
        }

        const calls = [];
        for (let i = 1; i < total; i++) {
          calls.push(
            publicClient!.readContract({
              address: ARC_RECEIPTS_ADDRESS,
              abi: ARC_RECEIPTS_ABI,
              functionName: "getReceipt",
              args: [BigInt(i)],
            })
          );
        }

        const results = await Promise.all(calls);
        const parsed: NFTReceiptItem[] = results.map((r: any) => {
          const meta = r.meta || r[5];
          const catNumber = typeof meta.category !== "undefined" ? Number(meta.category) : Number(meta[0]);
          return {
            tokenId: r.id ?? r[0],
            payer: r.from ?? r[1],
            payee: r.to ?? r[2],
            amount: r.amount ?? r[4],
            category: categoryLabels[catNumber] || "Payment",
            note: (meta.reason ?? meta[1]) || "Proof of payment",
            timestamp: r.timestamp ?? r[6],
          };
        });

        parsed.reverse();
        setNfts(parsed);
      } catch (err) {
        console.error("Failed to load NFT proofs", err);
      } finally {
        setLoading(false);
      }
    }

    fetchNFTs();
  }, [publicClient]);

  const userLower = address?.toLowerCase();
  const displayedNfts = nfts.filter((nft) => {
    if (filterMode === "mine" && userLower) {
      return (
        nft.payer.toLowerCase() === userLower ||
        nft.payee.toLowerCase() === userLower
      );
    }
    return true;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER */}
      <header className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 border-b-4 border-[#111111] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="neo-badge neo-badge-black">ON-CHAIN CERTIFICATES</span>
            <span className="neo-badge neo-badge-green">ERC-721 STANDARD</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[#111111] uppercase tracking-tight">
            NFT PROOF GALLERY
          </h1>
          <p className="text-sm font-bold text-[#333333] mt-2 max-w-xl">
            Immutable, cryptographically verifiable proof-of-payment certificates minted for every Arcive payment.
          </p>
        </div>

        <Link
          href="/create"
          className="neo-btn px-6 py-3.5 text-xs flex items-center gap-2"
        >
          <span>＋ MINT NEW PROOF</span>
        </Link>
      </header>

      {/* FILTER BAR */}
      <div className="neo-box p-4 bg-white border-4 border-[#111111] shadow-[6px_6px_0px_#111111] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterMode("mine")}
            className={`px-4 py-2 border-2 border-[#111111] text-xs font-black uppercase transition-all ${
              filterMode === "mine"
                ? "bg-[#111111] text-[#f8ef88] shadow-[3px_3px_0px_#111111]"
                : "bg-white text-[#111111] hover:bg-[#f8ef88]"
            }`}
          >
            MY NFT PROOFS
          </button>
          <button
            onClick={() => setFilterMode("all")}
            className={`px-4 py-2 border-2 border-[#111111] text-xs font-black uppercase transition-all ${
              filterMode === "all"
                ? "bg-[#111111] text-[#f8ef88] shadow-[3px_3px_0px_#111111]"
                : "bg-white text-[#111111] hover:bg-[#f8ef88]"
            }`}
          >
            ALL VERIFIED MINTS ({nfts.length})
          </button>
        </div>

        <span className="neo-badge neo-badge-black text-[10px] hidden sm:inline-block">
          ARC PROTOCOL STANDARD
        </span>
      </div>

      {/* GRID */}
      {loading ? (
        <div className="neo-box p-12 bg-white border-4 border-[#111111] shadow-[8px_8px_0px_#111111] text-center space-y-3">
          <div className="w-8 h-8 border-4 border-[#111111] border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-sm font-black uppercase text-[#111111]">
            QUERYING ON-CHAIN NFT CERTIFICATES...
          </h3>
        </div>
      ) : displayedNfts.length === 0 ? (
        <div className="neo-box p-12 bg-white border-4 border-[#111111] shadow-[8px_8px_0px_#111111] text-center space-y-3">
          <span className="neo-badge neo-badge-pink">NO PROOFS FOUND</span>
          <h3 className="text-xl font-black uppercase text-[#111111]">
            {filterMode === "mine"
              ? "YOU HAVE NOT MINTED ANY NFT RECEIPTS YET"
              : "NO ON-CHAIN PROOFS REGISTERED"}
          </h3>
          <p className="text-xs font-bold text-[#666666] max-w-md mx-auto">
            Every USDC payment made via Arcive automatically registers a deterministic on-chain voucher certificate.
          </p>
          <Link
            href="/create"
            className="neo-btn inline-flex items-center gap-2 px-6 py-3 text-xs mt-2"
          >
            SEND FIRST PAYMENT & MINT →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedNfts.map((nft) => (
            <div
              key={nft.tokenId.toString()}
              className="neo-box bg-white border-4 border-[#111111] shadow-[8px_8px_0px_#111111] p-6 space-y-4 hover:bg-[#fef9c3] transition-all"
            >
              {/* Badge & ID */}
              <div className="flex items-center justify-between pb-3 border-b-3 border-[#111111]">
                <div className="flex items-center gap-2">
                  <span className="neo-badge neo-badge-black text-xs">
                    TOKEN #{nft.tokenId.toString()}
                  </span>
                  <span className="text-[10px] font-black uppercase text-[#666666]">
                    ERC-721
                  </span>
                </div>
                <span className="neo-badge neo-badge-green text-[10px]">
                  VERIFIED
                </span>
              </div>

              {/* Graphic Voucher Box */}
              <div className="neo-box bg-[#f8ef88] border-3 border-[#111111] p-6 text-center space-y-2">
                <div className="w-12 h-12 bg-[#111111] text-[#f8ef88] font-black text-xl flex items-center justify-center border-2 border-[#111111] shadow-[3px_3px_0px_#111111] mx-auto">
                  📜
                </div>
                <div className="text-3xl font-black text-[#111111]">
                  ${formatUsdc(nft.amount)}{" "}
                  <span className="text-sm font-black text-[#111111]">USDC</span>
                </div>
                <span className="neo-badge neo-badge-pink text-[10px] inline-block">
                  {nft.category}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2 text-xs font-bold text-[#111111]">
                <div className="p-2 bg-white border-2 border-[#111111]">
                  <span className="text-[9px] font-black uppercase text-[#666666] block">
                    PURPOSE / NOTE
                  </span>
                  <span className="text-xs truncate block font-black">
                    "{nft.note}"
                  </span>
                </div>

                <div className="p-2 bg-white border-2 border-[#111111] font-mono text-[11px]">
                  <span className="text-[9px] font-black uppercase text-[#666666] block font-sans">
                    PARTICIPANTS
                  </span>
                  <div className="flex justify-between items-center text-[10px] mt-0.5">
                    <span className="text-gray-500">PAYER:</span>
                    <span className="font-bold">{nft.payer.substring(0, 6)}...{nft.payer.substring(38)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] mt-0.5">
                    <span className="text-gray-500">PAYEE:</span>
                    <span className="font-bold">{nft.payee.substring(0, 6)}...{nft.payee.substring(38)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t-2 border-[#111111] flex items-center justify-between">
                <Link
                  href={`/receipt/${nft.tokenId.toString()}`}
                  className="neo-btn px-3 py-1.5 text-xs flex items-center gap-1"
                >
                  <span>VIEW VOUCHER</span>
                  <span>↗</span>
                </Link>

                <a
                  href={`https://testnet.arcscan.app/address/${ARC_RECEIPTS_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-black uppercase text-blue-700 underline hover:text-blue-900"
                >
                  EXPLORER ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
