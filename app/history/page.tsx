"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import Link from "next/link";
import {
  ARC_RECEIPTS_ADDRESS,
  ARC_RECEIPTS_ABI,
} from "../../lib/arcReceiptsContract";
import {
  ARCIVE_NFT_ADDRESS,
  ARCIVE_NFT_ABI,
} from "../../lib/arciveNftContract";
import { exportReceiptsToCsv } from "../../lib/csvExporter";
import AnalyticsDashboard from "../components/AnalyticsDashboard";

const categoryLabels: Record<number, string> = {
  0: "Salary",
  1: "Invoice",
  2: "Donation",
  3: "Subscription",
  4: "Test Purchase",
  5: "Loan repayment",
  6: "Other",
};

function formatUsdc(amount: bigint): string {
  const DECIMALS = BigInt("1000000");
  const whole = amount / DECIMALS;
  const frac = amount % DECIMALS;
  const fracStr = frac.toString().padStart(6, "0").replace(/0+$/, "");
  return fracStr ? `${whole.toString()}.${fracStr}` : whole.toString();
}

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts) * 1000;
  const d = new Date(ms);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Receipt = {
  id: bigint;
  from: string;
  to: string;
  token: string;
  amount: bigint;
  category: number;
  reason: string;
  sourceCurrency: string;
  destinationCurrency: string;
  corridor: string;
  timestamp: bigint;
};

const ITEMS_PER_PAGE = 8;

export default function HistoryPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [mode, setMode] = useState<"all" | "sent" | "received">("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    if (!isConnected || !address || !publicClient || !ARC_RECEIPTS_ADDRESS) {
      setIsLoading(false);
      return;
    }

    async function loadReceipts() {
      setIsLoading(true);
      setFetchError(null);

      try {
        const targetContract = ARCIVE_NFT_ADDRESS || ARC_RECEIPTS_ADDRESS;
        let total = 0;
        let isNft = false;

        try {
          const totalBig = (await publicClient!.readContract({
            address: targetContract,
            abi: ARCIVE_NFT_ABI,
            functionName: "totalReceipts",
          })) as bigint;
          total = Number(totalBig);
          isNft = true;
        } catch {
          if (targetContract && targetContract !== ARCIVE_NFT_ADDRESS) {
            try {
              const nextId = (await publicClient!.readContract({
                address: targetContract,
                abi: ARC_RECEIPTS_ABI,
                functionName: "nextReceiptId",
              })) as bigint;
              total = Math.max(0, Number(nextId) - 1);
            } catch {
              total = 0;
            }
          } else {
            total = 0;
          }
        }

        if (total <= 0) {
          setReceipts([]);
          setIsLoading(false);
          return;
        }

        const calls = [];
        const startIdx = isNft ? 0 : 1;
        const endIdx = isNft ? total : total + 1;
        for (let i = startIdx; i < endIdx; i++) {
          calls.push(
            publicClient!.readContract({
              address: targetContract,
              abi: isNft ? ARCIVE_NFT_ABI : ARC_RECEIPTS_ABI,
              functionName: "getReceipt",
              args: [BigInt(i)],
            }).catch(() => null)
          );
        }

        const rawResults = await Promise.all(calls);
        const parsed: Receipt[] = rawResults
          .map((r: any, idx: number) => {
            if (!r) return null;
            const meta = r.meta || r[5];
            const categoryVal =
              typeof r.category === "string"
                ? Object.values(categoryLabels).indexOf(r.category) !== -1
                  ? Object.values(categoryLabels).indexOf(r.category)
                  : 6
                : meta && typeof meta.category !== "undefined"
                ? Number(meta.category)
                : meta && typeof meta[0] !== "undefined"
                ? Number(meta[0])
                : 6;

            const reasonVal =
              typeof r.note === "string"
                ? r.note
                : meta?.reason ?? meta?.[1] ?? "Arcive Payment";

            return {
              id: r.id ?? r[0] ?? BigInt(startIdx + idx),
              from: r.payer ?? r.from ?? r[0] ?? r[1] ?? "",
              to: r.payee ?? r.to ?? r[1] ?? r[2] ?? "",
              token: r.token ?? r[3] ?? "0x3600000000000000000000000000000000000000",
              amount: r.amount ?? r[2] ?? r[4] ?? BigInt(0),
              category: categoryVal,
              reason: reasonVal,
              sourceCurrency: meta?.sourceCurrency ?? meta?.[2] ?? "USDC",
              destinationCurrency: meta?.destinationCurrency ?? meta?.[3] ?? "USDC",
              corridor: meta?.corridor ?? meta?.[4] ?? "ARC",
              timestamp: BigInt(r.timestamp ?? (meta ? r[6] : r[5]) ?? 0),
            };
          })
          .filter((item): item is Receipt => item !== null);

        parsed.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
        setReceipts(parsed);
      } catch (err: any) {
        console.error("Failed to load receipts", err);
        setFetchError("Unable to fetch receipts from Arc Network node.");
      } finally {
        setIsLoading(false);
      }
    }

    loadReceipts();
  }, [isConnected, address, publicClient]);

  const addrLower = address?.toLowerCase();
  const myReceipts = receipts.filter(
    (r) =>
      !addrLower ||
      r.from.toLowerCase() === addrLower ||
      r.to.toLowerCase() === addrLower
  );

  const filtered = myReceipts.filter((r) => {
    const isSent = addrLower && r.from.toLowerCase() === addrLower;
    const isReceived = addrLower && r.to.toLowerCase() === addrLower;

    if (mode === "sent" && !isSent) return false;
    if (mode === "received" && !isReceived) return false;

    if (fromDate) {
      const fromTs = new Date(fromDate).getTime();
      if (Number(r.timestamp) * 1000 < fromTs) return false;
    }
    if (toDate) {
      const toTs = new Date(toDate).getTime() + 86400000;
      if (Number(r.timestamp) * 1000 > toTs) return false;
    }

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentRows = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <section className="space-y-8 pb-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-4 border-[#111111] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="neo-badge neo-badge-black">ON-CHAIN AUDIT TRAIL</span>
            <span className="neo-badge neo-badge-pink">ARC NETWORK</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[#111111] uppercase tracking-tight">
            RECEIPT LEDGER
          </h1>
          <p className="text-sm font-bold text-[#333333] mt-2 max-w-xl">
            Immutable log of verified settlements. View every transaction where your connected wallet was the payer or payee.
          </p>
        </div>

        {filtered.length > 0 && (
          <button
            onClick={() => exportReceiptsToCsv(filtered, address)}
            className="neo-btn px-5 py-3 text-xs flex items-center gap-2 self-start md:self-auto"
          >
            <span>📥</span>
            <span>EXPORT CSV (EXCEL SAFE)</span>
          </button>
        )}
      </header>

      {!ARC_RECEIPTS_ADDRESS ? (
        <div className="neo-box p-12 bg-[#fef08a] border-4 border-[#111111] shadow-[8px_8px_0px_#111111] text-center space-y-4 max-w-xl mx-auto">
          <div className="flex items-center justify-center gap-2">
            <span className="neo-badge bg-[#f59e0b] text-[#111111]">ARC MAINNET (CHAIN ID 5042)</span>
            <span className="neo-badge neo-badge-black">STANDBY</span>
          </div>
          <h2 className="text-2xl font-black uppercase text-[#111111]">
            Awaiting Real Mainnet Contract Deployment
          </h2>
          <p className="text-sm font-bold text-[#333333]">
            Deploy <code>ArciveNFT.sol</code> using <code>npm run deploy:mainnet</code> in your shell to activate the on-chain receipt ledger.
          </p>
        </div>
      ) : !isConnected ? (
        <div className="neo-box p-12 bg-white border-4 border-[#111111] shadow-[8px_8px_0px_#111111] text-center space-y-3">
          <span className="neo-badge neo-badge-black">WALLET NOT CONNECTED</span>
          <h2 className="text-2xl font-black text-[#111111] uppercase">CONNECT WALLET TO VIEW LEDGER</h2>
          <p className="text-sm font-bold text-[#555555]">
            Connect your wallet at the top right to query your on-chain payment history on Arc.
          </p>
        </div>
      ) : (
        <>
          {!isLoading && !fetchError && myReceipts.length > 0 && (
            <AnalyticsDashboard receipts={myReceipts} currentAddress={address} />
          )}

          {/* FILTERS BAR */}
          <div className="neo-box p-4 bg-white border-4 border-[#111111] shadow-[6px_6px_0px_#111111] flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            {/* Filter Mode Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "sent", "received"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 border-2 border-[#111111] text-xs font-black uppercase transition-all ${
                    mode === m
                      ? "bg-[#111111] text-[#f8ef88] shadow-[3px_3px_0px_#111111]"
                      : "bg-white text-[#111111] hover:bg-[#f8ef88]"
                  }`}
                >
                  {m === "all" ? "ALL TRANSACTIONS" : m === "sent" ? "OUTGOING (SENT)" : "INCOMING (RECEIVED)"}
                </button>
              ))}
            </div>

            {/* Date Filters */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2 bg-[#f8ef88] border-2 border-[#111111] px-3 py-1.5 shadow-[2px_2px_0px_#111111]">
                <span className="text-[10px] font-black uppercase text-[#111111]">FROM:</span>
                <input
                  type="date"
                  className="bg-transparent text-xs font-bold text-[#111111] focus:outline-none"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 bg-[#f8ef88] border-2 border-[#111111] px-3 py-1.5 shadow-[2px_2px_0px_#111111]">
                <span className="text-[10px] font-black uppercase text-[#111111]">TO:</span>
                <input
                  type="date"
                  className="bg-transparent text-xs font-bold text-[#111111] focus:outline-none"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* TABLE VIEW */}
          <div className="neo-box bg-white border-4 border-[#111111] shadow-[8px_8px_0px_#111111] overflow-hidden">
            <div className="px-6 py-4 bg-[#f8ef88] border-b-4 border-[#111111] flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-[#111111] tracking-wider">
                TRANSACTION REGISTER ({filtered.length} RECORDS)
              </h3>
              <span className="neo-badge neo-badge-black text-[10px]">
                {mode.toUpperCase()}
              </span>
            </div>

            {isLoading ? (
              <div className="p-12 text-center space-y-2">
                <div className="w-7 h-7 border-4 border-[#111111] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-black uppercase text-[#111111]">SYNCING WITH ARC NETWORK...</p>
              </div>
            ) : fetchError ? (
              <div className="p-6 bg-[#fbb6ce] text-center font-black text-xs uppercase text-[#111111]">
                {fetchError}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <p className="text-sm font-black text-[#111111] uppercase">NO RECEIPTS FOUND</p>
                <p className="text-xs font-bold text-[#666666]">
                  Try adjusting your date filters or send a payment to record your first on-chain receipt.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#111111]">
                  <thead className="bg-[#f1f5f9] border-b-3 border-[#111111] font-black uppercase tracking-wider text-[#111111]">
                    <tr>
                      <th className="px-5 py-3">ID</th>
                      <th className="px-5 py-3">DIRECTION</th>
                      <th className="px-5 py-3">AMOUNT</th>
                      <th className="px-5 py-3">CATEGORY</th>
                      <th className="px-5 py-3">COUNTERPARTY</th>
                      <th className="px-5 py-3">TIMESTAMP</th>
                      <th className="px-5 py-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-[#111111]/20 font-bold">
                    {currentRows.map((r) => {
                      const isSent = addrLower && r.from.toLowerCase() === addrLower;
                      const counterparty = isSent ? r.to : r.from;

                      return (
                        <tr key={r.id.toString()} className="hover:bg-[#fef9c3] transition-colors">
                          <td className="px-5 py-4 font-black">#{r.id.toString()}</td>
                          <td className="px-5 py-4">
                            <span
                              className={`neo-badge text-[10px] ${
                                isSent ? "neo-badge-pink" : "neo-badge-green"
                              }`}
                            >
                              {isSent ? "OUTGOING" : "INCOMING"}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-black text-sm">
                            ${formatUsdc(r.amount)} <span className="text-[10px]">USDC</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="neo-badge bg-[#e0e7ff] text-[10px]">
                              {categoryLabels[r.category] ?? "Payment"}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-mono text-xs">
                            {counterparty.substring(0, 6)}...{counterparty.substring(38)}
                          </td>
                          <td className="px-5 py-4 text-[#444444]">
                            {formatTimestamp(r.timestamp)}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/receipt/${r.id.toString()}`}
                              className="neo-btn px-3 py-1 text-[10px] inline-block"
                            >
                              VIEW ↗
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 bg-[#f8fafc] border-t-3 border-[#111111]">
                    <span className="text-xs font-black uppercase text-[#111111]">
                      PAGE {currentPage} OF {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="neo-btn px-3 py-1 text-xs disabled:opacity-40"
                      >
                        PREV
                      </button>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="neo-btn px-3 py-1 text-xs disabled:opacity-40"
                      >
                        NEXT
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
