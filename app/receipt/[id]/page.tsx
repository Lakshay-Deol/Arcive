"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useReadContract, usePublicClient, useAccount } from "wagmi";
import { parseAbiItem } from "viem";
import html2canvas from "html2canvas";
import Link from "next/link";
import {
  ARC_RECEIPTS_ADDRESS,
  ARC_RECEIPTS_ABI,
} from "../../../lib/arcReceiptsContract";

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
  return d.toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });
}

export default function ReceiptPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params?.id;
  const receiptId = id ? BigInt(id) : BigInt(0);

  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient();
  const receiptRef = useRef<HTMLDivElement>(null);

  const [txHash, setTxHash] = useState<string | null>(searchParams.get("tx"));
  const [isFetchingHash, setIsFetchingHash] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data, isLoading, error } = useReadContract({
    address: ARC_RECEIPTS_ADDRESS,
    abi: ARC_RECEIPTS_ABI,
    functionName: "getReceipt",
    args: [receiptId],
    query: {
      enabled: !!id,
    },
  } as any);

  useEffect(() => {
    if (txHash || !receiptId || !publicClient) return;

    async function fetchTxHashFromLogs() {
      if (!publicClient) return;
      setIsFetchingHash(true);
      try {
        try {
          const logs = await publicClient.getLogs({
            address: ARC_RECEIPTS_ADDRESS,
            event: parseAbiItem(
              "event Paid(uint256 indexed id, address indexed payer, address indexed payee, uint256 amount, string category, string note)"
            ),
            args: { id: receiptId },
            fromBlock: "earliest",
          });

          if (logs.length > 0) {
            setTxHash(logs[0].transactionHash);
            return;
          }
        } catch {
          // fallback to ReceiptCreated event
        }

        const logs = await publicClient.getLogs({
          address: ARC_RECEIPTS_ADDRESS,
          event: parseAbiItem(
            "event ReceiptCreated(uint256 indexed id, address indexed from, address indexed to, address token, uint256 amount, string corridor, uint256 timestamp)"
          ),
          args: { id: receiptId },
          fromBlock: "earliest",
        });

        if (logs.length > 0) {
          setTxHash(logs[0].transactionHash);
        }
      } catch (err) {
        console.error("Failed to fetch tx hash from logs", err);
      } finally {
        setIsFetchingHash(false);
      }
    }

    fetchTxHashFromLogs();
  }, [receiptId, txHash, publicClient]);

  const handleDownloadImage = async () => {
    if (!receiptRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: "#f8ef88",
        scale: 2,
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `Arcive-Receipt-#${id}.png`;
      link.click();
    } catch (err) {
      console.error("Download failed", err);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!id) {
    return (
      <div className="neo-box p-8 bg-white border-4 border-[#111111] text-center max-w-lg mx-auto">
        <span className="neo-badge neo-badge-pink mb-2">ERROR</span>
        <h2 className="text-xl font-black text-[#111111]">INVALID RECEIPT ID</h2>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="neo-box p-12 bg-white border-4 border-[#111111] text-center max-w-lg mx-auto shadow-[8px_8px_0px_#111111]">
        <div className="w-8 h-8 border-4 border-[#111111] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-black text-[#111111] uppercase">VERIFYING RECEIPT ON-CHAIN...</h3>
        <p className="text-xs font-bold text-[#666666] mt-1">QUERYING ARC NETWORK NODE</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="neo-box p-8 bg-[#fbb6ce] border-4 border-[#111111] text-center max-w-lg mx-auto shadow-[8px_8px_0px_#111111]">
        <span className="neo-badge neo-badge-black mb-2">NOT FOUND</span>
        <h2 className="text-2xl font-black text-[#111111] uppercase">RECEIPT NOT FOUND</h2>
        <p className="text-xs font-bold text-[#111111] mt-2">No on-chain record matches ID #{id.toString()}.</p>
        <Link href="/create" className="neo-btn inline-block mt-4 px-4 py-2 text-xs">
          GO TO SEND PAYMENT →
        </Link>
      </div>
    );
  }

  const rawData = data as any;
  const meta = rawData.meta || rawData[5];

  const categoryString =
    typeof rawData.category === "string"
      ? rawData.category
      : meta && typeof meta.category !== "undefined"
      ? categoryLabels[Number(meta.category)] || "Payment"
      : meta && typeof meta[0] !== "undefined"
      ? categoryLabels[Number(meta[0])] || "Payment"
      : "Payment";

  const noteString =
    typeof rawData.note === "string"
      ? rawData.note
      : meta?.reason ?? meta?.[1] ?? "Arcive verified payment";

  const receipt = {
    id: rawData.id ?? rawData[0] ?? receiptId,
    from: rawData.payer ?? rawData.from ?? rawData[0] ?? rawData[1] ?? "",
    to: rawData.payee ?? rawData.to ?? rawData[1] ?? rawData[2] ?? "",
    amount: rawData.amount ?? rawData[2] ?? rawData[4] ?? BigInt(0),
    token: rawData.token ?? rawData[3] ?? "0x3600000000000000000000000000000000000000",
    category: categoryString,
    reason: noteString,
    sourceCurrency: meta?.sourceCurrency ?? meta?.[2] ?? "USDC",
    destinationCurrency: meta?.destinationCurrency ?? meta?.[3] ?? "USDC",
    corridor: meta?.corridor ?? meta?.[4] ?? "ARC",
    timestamp: rawData.timestamp ?? (meta ? rawData[6] : rawData[5]) ?? BigInt(0),
  };

  const isParticipant =
    connectedAddress &&
    (receipt.from.toLowerCase() === connectedAddress.toLowerCase() ||
      receipt.to.toLowerCase() === connectedAddress.toLowerCase());

  if (!isParticipant) {
    return (
      <div className="neo-box max-w-lg mx-auto p-8 bg-white border-4 border-[#111111] shadow-[8px_8px_0px_#111111] text-center space-y-4">
        <div className="w-16 h-16 bg-[#f8ef88] border-3 border-[#111111] shadow-[4px_4px_0px_#111111] flex items-center justify-center mx-auto text-3xl font-black">
          🔒
        </div>
        <span className="neo-badge neo-badge-black">PRIVATE AUDIT TRAIL</span>
        <h2 className="text-2xl font-black text-[#111111] uppercase">ACCESS RESTRICTED</h2>
        <p className="text-sm font-bold text-[#333333]">
          This receipt is private. Only the <strong>Sender</strong> or <strong>Recipient</strong> can view the details.
        </p>
        {!connectedAddress ? (
          <div className="p-3 bg-[#fef08a] border-2 border-[#111111] text-xs font-black uppercase">
            Please connect your wallet above to verify participant status.
          </div>
        ) : (
          <div className="p-3 bg-[#fbb6ce] border-2 border-[#111111] text-xs font-black uppercase text-[#111111]">
            Access Denied: Connected wallet is not a party to this transaction.
          </div>
        )}
      </div>
    );
  }

  const explorerUrl =
    process.env.NEXT_PUBLIC_EXPLORER_URL || "https://explorer.arc.io";
  const explorerLink = txHash
    ? `${explorerUrl}/tx/${txHash}`
    : `${explorerUrl}/address/${ARC_RECEIPTS_ADDRESS}`;

  return (
    <section className="max-w-3xl mx-auto space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b-4 border-[#111111] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="neo-badge neo-badge-green">OFFICIAL RECORD</span>
            <span className="neo-badge neo-badge-black">ARC NETWORK</span>
          </div>
          <h1 className="text-4xl font-black text-[#111111] uppercase tracking-tight">
            PAYMENT RECEIPT
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadImage}
            disabled={isDownloading}
            className="neo-btn px-4 py-2.5 text-xs flex items-center gap-2"
          >
            {isDownloading ? (
              <span className="w-3.5 h-3.5 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>📷</span>
            )}
            <span>{isDownloading ? "SAVING..." : "DOWNLOAD IMAGE"}</span>
          </button>
        </div>
      </div>

      {/* Main Neo-Brutalist Receipt Card */}
      <div
        ref={receiptRef}
        className="neo-box bg-white border-4 border-[#111111] shadow-[10px_10px_0px_#111111] p-8 space-y-6"
      >
        {/* Receipt Header Badge Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-6 border-b-4 border-[#111111]">
          <div>
            <span className="text-[10px] font-black uppercase text-[#666666] tracking-widest block">
              RECEIPT IDENTIFIER
            </span>
            <div className="text-4xl font-black text-[#111111] tracking-tight">
              #{receipt.id.toString()}
            </div>
          </div>
          <div className="flex flex-col sm:items-end gap-1">
            <span className="neo-badge neo-badge-pink text-xs">
              {categoryLabels[receipt.category] || "Payment"}
            </span>
            <span className="text-xs font-black text-[#444444] mt-1">
              {formatTimestamp(receipt.timestamp)}
            </span>
          </div>
        </div>

        {/* Big Amount Box */}
        <div className="neo-box bg-[#fef08a] border-4 border-[#111111] shadow-[6px_6px_0px_#111111] p-6 text-center">
          <span className="block text-[11px] font-black uppercase tracking-wider text-[#111111] mb-1">
            TOTAL AMOUNT SETTLED
          </span>
          <div className="text-5xl md:text-6xl font-black text-[#111111] tracking-tight">
            ${formatUsdc(receipt.amount)}{" "}
            <span className="text-xl md:text-2xl font-black text-[#111111]">USDC</span>
          </div>
        </div>

        {/* Counterparty Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="neo-box bg-[#f8fafc] border-3 border-[#111111] p-4">
            <span className="block text-[10px] font-black uppercase text-[#666666] mb-1">
              FROM (PAYER)
            </span>
            <div className="font-mono text-xs font-bold text-[#111111] break-all select-all">
              {receipt.from}
            </div>
          </div>

          <div className="neo-box bg-[#f8fafc] border-3 border-[#111111] p-4">
            <span className="block text-[10px] font-black uppercase text-[#666666] mb-1">
              TO (RECIPIENT)
            </span>
            <div className="font-mono text-xs font-bold text-[#111111] break-all select-all">
              {receipt.to}
            </div>
          </div>
        </div>

        {/* Meta / Route / Note */}
        <div className="neo-box bg-white border-3 border-[#111111] p-4 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b-2 border-[#111111]">
            <span className="text-[10px] font-black uppercase text-[#666666]">
              SETTLEMENT ROUTE
            </span>
            <span className="font-mono text-xs font-black text-[#111111]">
              {receipt.corridor || "Arc Native USDC"}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-black uppercase text-[#666666] mb-1">
              NOTE / PURPOSE
            </span>
            <div className="text-sm font-bold text-[#111111] bg-[#f8ef88] border-2 border-[#111111] p-3">
              "{receipt.reason || "No note provided"}"
            </div>
          </div>
        </div>

        {/* NFT Proof Badge & Footer */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t-4 border-[#111111]">
          <div className="flex items-center gap-2">
            <span className="neo-badge neo-badge-green text-xs">
              ✓ 100% VERIFIED ON-CHAIN
            </span>
            <span className="neo-badge bg-[#a5d8ff] text-xs">
              NFT TOKEN #{receipt.id.toString()}
            </span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#666666]">
            ARCIVE IMMUTABLE PROTOCOL
          </span>
        </div>
      </div>

      {/* Explorer and Copy Links */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <a
          href={explorerLink}
          target="_blank"
          rel="noreferrer"
          className="neo-btn px-4 py-2.5 text-xs flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <span>VIEW ON ARCSCAN EXPLORER</span>
          <span className="text-sm">↗</span>
        </a>

        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert("Receipt link copied to clipboard!");
          }}
          className="bg-white border-3 border-[#111111] shadow-[3px_3px_0px_#111111] px-4 py-2.5 text-xs font-black uppercase hover:bg-yellow-200 transition-all w-full sm:w-auto"
        >
          COPY SHAREABLE LINK 📋
        </button>
      </div>
    </section>
  );
}
